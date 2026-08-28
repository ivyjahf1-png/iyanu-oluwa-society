import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Upload, Send, MapPin, Shield } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';

const ID_TYPES = ['NIN', 'Driver License', 'International Passport'];

export default function KYCVerificationScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [photoProof, setPhotoProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocumentFile(result.assets[0]);
      }
    } catch (e) { Alert.alert('Upload error', 'Could not pick document.'); }
  };

  const pickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoProof(result.assets[0]);
      }
    } catch (e) { Alert.alert('Upload error', 'Could not pick photo.'); }
  };

  const submitVerification = () => {
    if (!idNumber.trim() || !address.trim() || !documentFile || !photoProof) {
      Alert.alert('Missing Information', 'Please fill all fields and upload both documents.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert('Verification Submitted', 'Your KYC documents have been submitted.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }, 1200);
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="KYC Verification" subtitle="Verify your identity" onBack={() => rawNav?.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.text }]}>ID Type</Text>
        <View style={styles.typeRow}>
          {ID_TYPES.map((type) => {
            const active = idType === type;
            return (
              <TouchableOpacity key={type} style={[styles.typeBtn, { backgroundColor: active ? colors.primary : colors.inputBackground, borderColor: active ? colors.primary : colors.border }]} onPress={() => setIdType(type)}>
                <Text style={[styles.typeBtnText, { color: active ? colors.background : colors.textSecondary }]}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>ID Number</Text>
        <View style={styles.inputRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}><Shield size={18} color={colors.primary} /></View>
          <TextInput style={[styles.inputFlex, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter ID number" placeholderTextColor={colors.textSecondary} value={idNumber} onChangeText={setIdNumber} />
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Residential Address</Text>
        <View style={styles.inputRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}><MapPin size={18} color={colors.primary} /></View>
          <TextInput style={[styles.inputFlex, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter your full residential address" placeholderTextColor={colors.textSecondary} value={address} onChangeText={setAddress} multiline numberOfLines={3} />
        </View>

        <Text style={[styles.label, { color: colors.text }]}>ID Document Upload</Text>
        <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickDocument}>
          <Upload size={20} color={colors.primary} />
          <Text style={[styles.uploadText, { color: colors.text }]}>{documentFile ? documentFile.name : 'Upload ID document (PDF/Image)'}</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>Photo Proof</Text>
        <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickPhoto}>
          <Upload size={20} color={colors.primary} />
          <Text style={[styles.uploadText, { color: colors.text }]}>{photoProof ? 'Photo captured' : 'Capture/Take photo proof'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]} onPress={submitVerification} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color={colors.background} /> : <><Send size={18} color={colors.background} /><Text style={[styles.submitBtnText, { color: colors.background }]}>Submit Verification</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  typeBtn: { flex: 1, borderRadius: 20, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  typeBtnText: { fontSize: 12, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  inputFlex: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', padding: 14, marginBottom: 12 },
  uploadText: { fontSize: 13, fontWeight: '500' },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 10 },
  submitBtnText: { fontSize: 14, fontWeight: 'bold' },
});
