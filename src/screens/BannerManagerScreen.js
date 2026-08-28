import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, Alert, Switch,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import * as DocumentPicker from 'expo-document-picker';
import { Plus, Upload, Trash2, ImageIcon, Megaphone } from 'lucide-react-native';
import SafeImage from '../components/SafeImage';
import ScreenHeader from '../components/ScreenHeader';
import { useBanners } from '../context/BannerContext';

const CATEGORIES = [
  'Marketplace item', 'Land', 'Car', 'Fridge',
  'General Cooperative Benefit', 'Announcement',
];

export default function BannerManagerScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { banners, addBanner, updateBanner, removeBanner } = useBanners();
  const [tab, setTab] = useState('full');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [fullImage, setFullImage] = useState(null);
  const [fullActive, setFullActive] = useState(true);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoActive, setPhotoActive] = useState(true);
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('days');

  const getDurationPayload = () => {
    const n = parseInt(durationValue, 10);
    if (!n || n <= 0) return {};
    return durationUnit === 'hours' ? { durationHours: n } : { durationDays: n };
  };

  const pickImage = async (setter) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets[0]?.uri) setter(result.assets[0].uri);
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the image picker.');
    }
  };

  const publishFull = () => {
    if (!fullImage) { Alert.alert('Photo required', 'Upload a banner photo first.'); return; }
    if (!title.trim()) { Alert.alert('Title required', 'Enter a banner title.'); return; }
    addBanner({ kind: 'full', title: title.trim(), description: description.trim(), category, imageUri: fullImage, active: fullActive, ...getDurationPayload() });
    setTitle(''); setDescription(''); setFullImage(null); setFullActive(true); setDurationValue('');
    Alert.alert('Published', 'Full banner is live.');
  };

  const publishPhoto = () => {
    if (!photoUri) { Alert.alert('Photo required', 'Choose a photo.'); return; }
    addBanner({ kind: 'photo', imageUri: photoUri, active: photoActive, ...getDurationPayload() });
    setPhotoUri(null); setPhotoActive(true); setDurationValue('');
    Alert.alert('Published', 'Photo banner is live.');
  };

  const durationField = (
    <>
      <Text style={styles.durLabel}>Display Duration</Text>
      <View style={styles.durationRow}>
        <TextInput
          style={[styles.input, styles.durationInput]}
          value={durationValue}
          onChangeText={(t) => setDurationValue(t.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 48"
          placeholderTextColor="#526E63"
          keyboardType="number-pad"
        />
        <TouchableOpacity style={[styles.unitBtn, durationUnit === 'hours' && styles.unitBtnActive]} onPress={() => setDurationUnit('hours')}>
          <Text style={[styles.unitBtnText, durationUnit === 'hours' && styles.unitBtnTextActive]}>Hrs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.unitBtn, durationUnit === 'days' && styles.unitBtnActive]} onPress={() => setDurationUnit('days')}>
          <Text style={[styles.unitBtnText, durationUnit === 'days' && styles.unitBtnTextActive]}>Days</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#F4F7F5' barStyle="dark-content" />
      <ScreenHeader title="Promotional Banners" subtitle="Create cooperative banner popups" onBack={() => navigation?.goBack()} />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'full' && styles.tabActive]} onPress={() => setTab('full')}>
          <Megaphone size={16} color={tab === 'full' ? '#FFFFFF' : '#4B6358'} />
          <Text style={[styles.tabText, tab === 'full' && styles.tabTextActive]}>Full Banner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'photo' && styles.tabActive]} onPress={() => setTab('photo')}>
          <ImageIcon size={16} color={tab === 'photo' ? '#FFFFFF' : '#4B6358'} />
          <Text style={[styles.tabText, tab === 'photo' && styles.tabTextActive]}>Photo Only</Text>
        </TouchableOpacity>
      </View>      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={true}>
        {tab === 'full' ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setFullImage)}>
              {fullImage ? <SafeImage source={{ uri: fullImage }} style={styles.preview} />
                : (<View style={styles.uploadInner}><Upload size={26} color={colors.success} /><Text style={styles.uploadText}>Tap to upload banner photo</Text></View>)}
            </TouchableOpacity>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. New Land Listing" placeholderTextColor="#526E63" />
            <Text style={styles.label}>Description / Offer</Text>
            <TextInput style={[styles.input, styles.area]} value={description} onChangeText={setDescription} placeholder="Short details" placeholderTextColor="#526E63" multiline />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {durationField}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={fullActive} onValueChange={setFullActive} trackColor={{ false: '#D1FAE5', true: '#10B981' }} thumbColor='#FFFFFF' />
            </View>
            <TouchableOpacity style={styles.publishBtn} onPress={publishFull}>
              <Plus size={18} color={colors.text} />
              <Text style={styles.publishText}>Publish Full Banner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPhotoUri)}>
              {photoUri ? <SafeImage source={{ uri: photoUri }} style={styles.preview} />
                : (<View style={styles.uploadInner}><Upload size={26} color={colors.success} /><Text style={styles.uploadText}>Tap to upload photo only</Text></View>)}
            </TouchableOpacity>
            {durationField}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={photoActive} onValueChange={setPhotoActive} trackColor={{ false: '#D1FAE5', true: '#10B981' }} thumbColor='#FFFFFF' />
            </View>
            <TouchableOpacity style={styles.publishBtn} onPress={publishPhoto}>
              <Plus size={18} color={colors.text} />
              <Text style={styles.publishText}>Publish Photo Banner</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>Published Banners ({banners.length})</Text>
        {banners.length === 0 ? (
          <Text style={styles.empty}>No banners yet.</Text>
        ) : (
          banners.map((b) => (
            <View key={b.id} style={styles.bannerRow}>
              <View style={styles.rowLeft}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {b.kind === 'photo' ? '(Photo)' : b.title || 'Full'}
                </Text>
                <Text style={styles.rowMeta}>{b.category}{b.expiresAt ? ' • Timed' : ''} • {b.active ? 'LIVE' : 'OFF'}</Text>
              </View>
              <View style={styles.rowActions}>
                <Switch value={b.active} onValueChange={(v) => updateBanner(b.id, { active: v })} trackColor={{ false: '#D1FAE5', true: '#10B981' }} thumbColor='#FFFFFF' />
                <TouchableOpacity onPress={() => removeBanner(b.id)}><Trash2 size={16} color="#EF4444" /></TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  scroll: { flex: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#132620', borderRadius: 12, marginHorizontal: 16, marginVertical: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10 },
  tabActive: { backgroundColor: '#10B981' },
  tabText: { color: '#8EA89D', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#0F172A' },
  card: { backgroundColor: '#132620', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#D1FAE5' },
  uploadBox: { borderWidth: 1.5, borderColor: '#10B981', borderStyle: 'dashed', borderRadius: 14, paddingVertical: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 14, minHeight: 110 },
  uploadInner: { alignItems: 'center', gap: 8 },
  uploadText: { color: '#8EA89D', fontSize: 13 },
  preview: { width: '100%', height: 150, borderRadius: 12 },
  durLabel: { color: '#8EA89D', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  label: { color: '#8EA89D', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A', marginBottom: 6 },
  area: { height: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  chip: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#D1FAE5' },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { color: '#8EA89D', fontSize: 12 },
  chipTextActive: { color: '#0F172A' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' },
  durationInput: { flex: 1, marginBottom: 0 },
  unitBtn: { paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5' },
  unitBtnActive: { backgroundColor: '#10B981' },
  unitBtnText: { color: '#8EA89D', fontSize: 12, fontWeight: '600' },
  unitBtnTextActive: { color: '#0F172A' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { color: '#8EA89D', fontSize: 13, fontWeight: '600' },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, marginTop: 10 },
  publishText: { color: '#0F172A', fontSize: 15, fontWeight: 'bold' },
  sectionLabel: { color: '#8EA89D', fontSize: 14, fontWeight: 'bold', marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  empty: { color: '#4B6358', fontSize: 13, textAlign: 'center', margin: 20 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#132620', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#D1FAE5' },
  rowLeft: { flex: 1 },
  rowTitle: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  rowMeta: { color: '#4B6358', fontSize: 11, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

const styles = makeStyles(themes.darkEmerald, true);
