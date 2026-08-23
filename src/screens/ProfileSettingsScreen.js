import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import SafeImage from '../components/SafeImage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Camera,
  Fingerprint,
  Lock,
  User,
  KeyRound,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import BrightnessControl from '../components/BrightnessControl';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileSettingsScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { user, updateUser } = useUser();
  const {
    methods,
    enableBiometric,
    disableBiometric,
    setPasscode,
    setPasscodeEnabled,
  } = useAuth();
  const isInitialRender = useRef(true);

  // Initialize state directly with user data
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [biometric, setBiometric] = useState(Boolean(user?.biometricEnabled));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [transferPin, setTransferPin] = useState(user?.transferPin || '');
  const [userBankName, setUserBankName] = useState(user?.userBankName || '');
  const [userAccountNumber, setUserAccountNumber] = useState(user?.userAccountNumber || '');
  const [userAccountName, setUserAccountName] = useState(user?.userAccountName || '');

  // Appearance settings
  const [themeMode, setThemeMode] = useState(user?.themeMode || 'light');

  // Passcode (app lock) state
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      const res = await enableBiometric();
      if (!res.ok) {
        Alert.alert('Biometric Unavailable', res.error || 'Could not enable biometrics.');
        return; // switch stays off
      }
      Alert.alert('Biometric Enabled', 'You can now unlock the app with Face ID / Fingerprint.');
    } else {
      await disableBiometric();
    }
  };

  const handleSavePasscode = async () => {
    if (!/^\d{4}$|^\d{6}$/.test(newPasscode)) {
      Alert.alert('Invalid Passcode', 'Passcode must be exactly 4 or 6 digits.');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      Alert.alert('Passcodes do not match', 'Please make sure both passcodes are the same.');
      return;
    }
    const res = await setPasscode(newPasscode);
    if (!res.ok) {
      Alert.alert('Error', res.error || 'Could not save passcode.');
      return;
    }
    setNewPasscode('');
    setConfirmPasscode('');
    Alert.alert('Passcode Set', 'App lock is enabled. You can now unlock with this passcode.');
  };

  const handleTogglePasscodeLock = async (enabled) => {
    await setPasscodeEnabled(enabled);
    Alert.alert(
      enabled ? 'App Lock On' : 'App Lock Off',
      enabled
        ? 'The app will require your passcode or biometrics on reopen.'
        : 'The app will no longer ask for your passcode.'
    );
  };
  const [lightBrightness, setLightBrightness] = useState(
    typeof user?.lightBrightness === 'number' ? user.lightBrightness : 100
  );
  const [darkContrast, setDarkContrast] = useState(
    typeof user?.darkContrast === 'number' ? user.darkContrast : 60
  );

  // Sync state ONLY if user context was loading when screen mounted
  useEffect(() => {
    if (user && isInitialRender.current) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setBiometric(Boolean(user.biometricEnabled));
      setTransferPin(user.transferPin || '');
      setUserBankName(user.userBankName || '');
      setUserAccountNumber(user.userAccountNumber || '');
      setUserAccountName(user.userAccountName || '');
      setThemeMode(user.themeMode || 'light');
      if (typeof user.lightBrightness === 'number') setLightBrightness(user.lightBrightness);
      if (typeof user.darkContrast === 'number') setDarkContrast(user.darkContrast);
      isInitialRender.current = false;
    }
  }, [user]);

  const pickAvatar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        updateUser({ avatarUri: result.assets[0].uri });
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the picker.');
    }
  };

  const saveAll = () => {
    if (newPassword && newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.');
      return;
    }
    if (transferPin && !/^\d{4}$/.test(transferPin)) {
      Alert.alert('Invalid PIN', 'Transfer PIN must be exactly 4 digits.');
      return;
    }

    updateUser({
      fullName: fullName.trim() || user?.fullName || '',
      email: email.trim(),
      phone: phone.trim(),
      biometricEnabled: biometric,
      transferPin: transferPin.trim(),
      userBankName: userBankName.trim(),
      userAccountNumber: userAccountNumber.trim(),
      userAccountName: userAccountName.trim(),
      themeMode,
      lightBrightness,
      darkContrast,
    });

    Alert.alert('Saved', 'Your profile and security settings have been updated.');
    
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Helper function to derive preview background color
  const getPreviewBg = () => {
    if (themeMode === 'dark') {
      const alpha = 0.4 + (darkContrast / 100) * 0.6;
            return `rgba(11,34,17,${alpha})`;
    }
    if (themeMode === 'light') {
      const alpha = Math.max(0.15, lightBrightness / 100);
                  return `rgba(255,255,255,${alpha})`;
    }
    const currentHour = new Date().getHours();
    return currentHour >= 18 || currentHour < 6 ? '#0B2211' : '#FFFFFF';
  };

  // Helper function to derive preview text color
  const getPreviewTextColor = () => {
    if (themeMode === 'dark') return '#FFFFFF';
    if (themeMode === 'automatic') {
      const currentHour = new Date().getHours();
      return currentHour >= 18 || currentHour < 6 ? '#FFFFFF' : '#0B2211';
    }
    return '#0B2211';
  };

  // Helper function to render text string cleanly
  const getPreviewLabel = () => {
    if (themeMode === 'automatic') {
      const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
            return `Auto (${isNight ? 'Dark' : 'Light'} by time)`;
    }
        return `${themeMode.charAt(0).toUpperCase()}${themeMode.slice(1)} Mode`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Profile Settings"
        subtitle="Manage your account & security"
        onBack={() => (navigation?.goBack ? navigation.goBack() : null)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, styles.grow]}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile picture */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
            {user?.avatarUri ? (
              <SafeImage source={{ uri: user.avatarUri }} style={styles.avatarImage} />
            ) : (
              <User size={40} color="#4CAF50" />
            )}
            <View style={styles.cameraBadge}>
              <Camera size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to upload a profile photo</Text>
        </View>

        {/* Account & personal details */}
        <Text style={styles.sectionTitle}>Account & Personal Details</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor="#6B7280"
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
          maxLength={11}
        />

        {/* Security */}
        <Text style={styles.sectionTitle}>Password & Security</Text>
        <View style={styles.settingRow}>
          <Fingerprint size={20} color="#2563EB" />
          <Text style={styles.settingLabel}>Biometric Login (Fingerprint / Face ID)</Text>
          <Switch
            value={methods.biometric}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: '#E5E7EB', true: '#4CAF50' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Passcode / App Lock */}
        <Text style={styles.sectionTitle}>Passcode</Text>
        <View style={styles.settingRow}>
          <Lock size={20} color="#4CAF50" />
          <Text style={styles.settingLabel}>App Lock (require on reopen)</Text>
          <Switch
            value={methods.passcode && methods.passcodeLockEnabled}
            onValueChange={handleTogglePasscodeLock}
            disabled={!methods.passcode}
            trackColor={{ false: '#E5E7EB', true: '#4CAF50' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <TextInput
          style={styles.input}
          value={newPasscode}
          onChangeText={(t) => setNewPasscode(t.replace(/[^0-9]/g, ''))}
          placeholder={methods.passcode ? 'Change passcode (4 or 6 digits)' : 'Set passcode (4 or 6 digits)'}
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />
        <TextInput
          style={styles.input}
          value={confirmPasscode}
          onChangeText={(t) => setConfirmPasscode(t.replace(/[^0-9]/g, ''))}
          placeholder="Confirm passcode"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />
        <TouchableOpacity style={styles.linkBtn} onPress={handleSavePasscode}>
          <KeyRound size={16} color="#4CAF50" />
          <Text style={styles.linkBtnText}>
            {methods.passcode ? 'Change Passcode' : 'Set Passcode'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor="#6B7280"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password (leave blank to keep)"
          placeholderTextColor="#6B7280"
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Alert.alert('Reset PIN', 'A PIN reset link has been sent to your email.')}
        >
          <KeyRound size={16} color="#4CAF50" />
          <Text style={styles.linkBtnText}>Reset Transaction PIN</Text>
        </TouchableOpacity>

        {/* Appearance — theme & brightness controls */}
        <Text style={styles.sectionTitle}>Appearance & Theme</Text>

        {/* Automatic Theme */}
        <TouchableOpacity
          style={[styles.themeCard, themeMode === 'automatic' && styles.themeCardActive]}
          onPress={() => setThemeMode('automatic')}
        >
          <View style={styles.themeCardHeader}>
            <Sparkles size={18} color="#4CAF50" />
            <Text style={styles.themeCardTitle}>Automatic Theme</Text>
            {themeMode === 'automatic' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.themeCardDesc}>
            Switches between Light/Dark automatically based on ambient time and weather.
          </Text>
        </TouchableOpacity>

        {/* Light Theme */}
        <TouchableOpacity
          style={[styles.themeCard, themeMode === 'light' && styles.themeCardActive]}
          onPress={() => setThemeMode('light')}
        >
          <View style={styles.themeCardHeader}>
            <Sun size={18} color="#F59E0B" />
            <Text style={styles.themeCardTitle}>Light Theme</Text>
            {themeMode === 'light' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.themeCardDesc}>Clean, bright interface styling.</Text>
        </TouchableOpacity>
        {themeMode === 'light' && (
          <BrightnessControl
            label="Brightness Reduction"
            hint="Lower the percentage to dim light mode intensity."
            value={100 - lightBrightness}
            onChange={val => setLightBrightness(100 - val)}
          />
        )}

        {/* Dark Theme */}
        <TouchableOpacity
          style={[styles.themeCard, themeMode === 'dark' && styles.themeCardActive]}
          onPress={() => setThemeMode('dark')}
        >
          <View style={styles.themeCardHeader}>
            <Moon size={18} color="#2563EB" />
            <Text style={styles.themeCardTitle}>Dark Theme</Text>
            {themeMode === 'dark' && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.themeCardDesc}>Deep green dark mode styling.</Text>
        </TouchableOpacity>
        {themeMode === 'dark' && (
          <>
            <BrightnessControl
              label="Contrast Increase"
              hint="Higher values deepen the dark background contrast."
              value={darkContrast}
              onChange={setDarkContrast}
            />
            <BrightnessControl
              label="Contrast Decrease"
              hint="Soften the dark contrast level."
              value={100 - darkContrast}
              onChange={val => setDarkContrast(100 - val)}
            />
          </>
        )}

        {/* Live preview of the selected appearance */}
        <View style={[styles.previewBox, { backgroundColor: getPreviewBg() }]}>
          <Text style={[styles.previewText, { color: getPreviewTextColor() }]}>
            Preview — {getPreviewLabel()}
          </Text>
        </View>

        {/* Bank account & transfer credentials */}
        <Text style={styles.sectionTitle}>Bank Account & Transfer Credentials</Text>
        <TextInput
          style={styles.input}
          value={userBankName}
          onChangeText={setUserBankName}
          placeholder="Your bank name (e.g. GTBank)"
          placeholderTextColor="#6B7280"
        />
        <TextInput
          style={styles.input}
          value={userAccountNumber}
          onChangeText={setUserAccountNumber}
          placeholder="Your account number"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextInput
          style={styles.input}
          value={userAccountName}
          onChangeText={setUserAccountName}
          placeholder="Account name"
          placeholderTextColor="#6B7280"
        />
        <TextInput
          style={styles.input}
          value={transferPin}
          onChangeText={setTransferPin}
          placeholder="Set 4-digit Transfer PIN"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveAll}>
          <Lock size={17} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { color: '#6B7280', fontSize: 11, marginTop: 8 },
  sectionTitle: {
    color: '#0B2211',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B2211',
    fontSize: 14,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  settingLabel: {
    flex: 1,
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  themeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  themeCardActive: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#F0FAF4',
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  themeCardTitle: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
  },
  activePill: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  themeCardDesc: {
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 15,
  },
  previewBox: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  linkBtnText: { color: '#4CAF50', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});