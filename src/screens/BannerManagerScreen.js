import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, TextInput, Alert, Switch,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Plus, Upload, Trash2, ImageIcon, Megaphone } from 'lucide-react-native';
import SafeImage from '../components/SafeImage';
import ScreenHeader from '../components/ScreenHeader';
import { useBanners } from '../context/BannerContext';
import { useUser } from '../context/UserContext';

const CATEGORIES = [
  'Marketplace item', 'Land', 'Car', 'Fridge',
  'General Cooperative Benefit', 'Announcement',
];

/** Admin Promotional Banner / Advert Manager. Cooperative content only. */
export default function BannerManagerScreen({ navigation }) {
  const { banners, addBanner, updateBanner, removeBanner } = useBanners();
  const { user } = useUser();
  const [tab, setTab] = useState('full');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [fullImage, setFullImage] = useState(null);
  const [fullActive, setFullActive] = useState(true);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoActive, setPhotoActive] = useState(true);

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
    addBanner({ kind: 'full', title: title.trim(), description: description.trim(), category, imageUri: fullImage, active: fullActive, author: user?.fullName || 'Admin' });
    setTitle(''); setDescription(''); setFullImage(null); setFullActive(true);
    Alert.alert('Published', 'Full banner is now live on the user dashboard.');
  };

  const publishPhoto = () => {
    if (!photoUri) { Alert.alert('Photo required', 'Choose a photo for the banner.'); return; }
    addBanner({ kind: 'photo', imageUri: photoUri, active: photoActive });
    setPhotoUri(null); setPhotoActive(true);
    Alert.alert('Published', 'Photo banner is now live as a popup on the user dashboard.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
      <ScreenHeader title="Promotional Banners" subtitle="Create cooperative banner & advert popups" onBack={() => navigation?.goBack()} />

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'full' && styles.tabActive]} onPress={() => setTab('full')}>
          <Megaphone size={16} color={tab === 'full' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, tab === 'full' && styles.tabTextActive]}>Full Banner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'photo' && styles.tabActive]} onPress={() => setTab('photo')}>
          <ImageIcon size={16} color={tab === 'photo' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, tab === 'photo' && styles.tabTextActive]}>Photo Only</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={true}>
        {tab === 'full' ? (
          <View style={styles.card}>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setFullImage)}>
              {fullImage ? <SafeImage source={{ uri: fullImage }} style={styles.preview} />
                : (<><Upload size={26} color="#4CAF50" /><Text style={styles.uploadText}>Tap to upload banner photo</Text></>)}
            </TouchableOpacity>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. New Marketplace Listing Week" placeholderTextColor="#6B7280" />
            <Text style={styles.label}>Description / Offer</Text>
            <TextInput style={[styles.input, styles.area]} value={description} onChangeText={setDescription} placeholder="Short details of the offer or benefit" placeholderTextColor="#6B7280" multiline />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={fullActive} onValueChange={setFullActive} trackColor={{ false: '#E5E7EB', true: '#4CAF50' }} thumbColor="#FFFFFF" />
            </View>
            <TouchableOpacity style={styles.publishBtn} onPress={publishFull}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.publishText}>Publish Full Banner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setPhotoUri)}>
              {photoUri ? <SafeImage source={{ uri: photoUri }} style={styles.preview} />
                : (<><Upload size={26} color="#4CAF50" /><Text style={styles.uploadText}>Tap to upload photo only</Text></>)}
            </TouchableOpacity>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch value={photoActive} onValueChange={setPhotoActive} trackColor={{ false: '#E5E7EB', true: '#4CAF50' }} thumbColor="#FFFFFF" />
            </View>
            <TouchableOpacity style={styles.publishBtn} onPress={publishPhoto}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.publishText}>Publish Photo Banner</Text>
            </TouchableOpacity>
          </View>
        

        {/* Published banners */}
        <Text style={styles.sectionLabel}>Published Banners ({banners.length})</Text>
        {banners.length === 0 ? (
          <Text style={styles.empty}>No banners yet. Create one above.</Text>
        ) : (
          banners.map((b) => (
            <View key={b.id} style={styles.bannerRow}>
              <View style={styles.rowLeft}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {b.kind === 'photo' ? '(Photo Only)' : b.title || 'Full Banner'}
                </Text>
                <Text style={styles.rowMeta}>{b.category} • {b.active ? 'ACTIVE' : 'INACTIVE'}</Text>
              </View>
              <View style={styles.rowActions}>
                <Switch
                  value={b.active}
                  onValueChange={(v) => updateBanner(b.id, { active: v })}
                  trackColor={{ false: '#E5E7EB', true: '#4CAF50' }}
                  thumbColor="#FFFFFF"
                />
                <TouchableOpacity onPress={() => removeBanner(b.id)} style={styles.deleteBtn}>
                  <Trash2 size={16} color="#C0392B" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B2211' },
  scroll: { flex: 1 },
  tabs: { flexDirection: 'row', backgroundColor: '#0F2A19', borderRadius: 12, marginHorizontal: 16, marginVertical: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10 },
  tabActive: { backgroundColor: '#4CAF50' },
  tabText: { color: '#9CB8A6', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16 },
  uploadBox: { borderWidth: 1.5, borderColor: '#4CAF50', borderStyle: 'dashed', borderRadius: 14, paddingVertical: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4', gap: 8, marginBottom: 14, minHeight: 120 },
  uploadText: { color: '#4B5563', fontSize: 13 },
  preview: { width: '100%', height: 150, borderRadius: 12 },
  label: { color: '#0B2211', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 6 },
  area: { height: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  chip: { backgroundColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#4CAF50' },
  chipText: { color: '#374151', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { color: '#0B2211', fontSize: 13, fontWeight: '600' },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 14, marginTop: 10 },
  publishText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  sectionLabel: { color: '#A7F3D0', fontSize: 14, fontWeight: 'bold', marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  empty: { color: '#9CB8A6', fontSize: 13, textAlign: 'center', margin: 20 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 12 },
  rowLeft: { flex: 1 },
  rowTitle: { color: '#0B2211', fontSize: 13, fontWeight: '600' },
  rowMeta: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteBtn: { padding: 4 },
});