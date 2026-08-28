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
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import ThemeSelector from '../theme/ThemeSelector';

export default function ProfileSettingsScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useSafeNavigation(rawNav);
  const { user, updateUser } = useUser();
  const {
    methods,
    enableBiometric,
    disableBiometric,
    setPasscode,
    setPasscodeEnabled,
    logout,
    userEmail,
    displayName: authDisplayName,
  } = useAuth();
  const isInitialRender = useRef(true);

  // Factory placeholder that must never mask the real email-derived identity
  // (same rule as the dashboard header, so both screens always agree).
  const PLACEHOLDER_NAME = 'Temitope Adewale';
  // Name shown here is derived from the signed-in email prefix exactly like
  // AuthContext.displayName / dashboard (temitope.adewale@x.org -> "Temitope Adewale").
  const effectiveFullName =
    user?.fullName && user.fullName !== PLACEHOLDER_NAME
      ? user.fullName
      : authDisplayName || '';

  // Initialize state directly with user data, auto-filled from the
  // authenticated account when the profile has no saved values yet.
  const [fullName, setFullName] = useState(effectiveFullName);
  const [email, setEmail] = useState(userEmail || user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [biometric, setBiometric] = useState(Boolean(user?.biometricEnabled));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [transferPin, setTransferPin] = useState(user?.transferPin || '');
  const [userBankName, setUserBankName] = useState(user?.userBankName || '');
  const [userAccountNumber, setUserAccountNumber] = useState(user?.userAccountNumber || '');
  const [userAccountName, setUserAccountName] = useState(user?.userAccountName || '');

  // Passcode (app lock) state
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

    const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      // enableBiometric() verifies hardware, runs LocalAuthentication.
      // authenticateAsync(), and only persists the preference on success.
      const res = await enableBiometric();
      if (!res.ok) {
        Alert.alert('Biometric Unavailable', res.error || 'Could not enable biometrics.');
        // AuthContext left `methods.biometric` false; mirror that in the local
        // profile state so Save Changes persists the correct flag.
        setBiometric(false);
        return; // switch snaps back to off
      }
      // Keep local state in sync with the AuthContext flag so a Save persists it.
      setBiometric(true);
      Alert.alert('Biometric Enabled', 'You can now unlock the app with Face ID / Fingerprint.');
    } else {
      await disableBiometric();
      setBiometric(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('[ProfileSettings] logout error:', e?.message || e);
      // Still fall through so users always land back on the auth flow.
    }
    // Reset to the Welcome screen (auth flow entry point).
    navigation.reset({
      index: 0,
      routes: [{ name: 'WelcomeScreen' }],
    });
  };


  const handleSavePasscode = async () => {
    if (!/^\d{4}$/.test(newPasscode)) {
      Alert.alert('Invalid Passcode', 'Passcode must be exactly 4 digits.');
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

  // Sync state ONLY if user context was loading when screen mounted
  useEffect(() => {
    if (user && isInitialRender.current) {
      // Same auth-backed fallbacks as the initial state above: autofill the
      // sign-in email and the email-derived name when nothing is saved yet.
      setFullName(
        user.fullName && user.fullName !== PLACEHOLDER_NAME
          ? user.fullName
          : effectiveFullName,
      );
      setEmail(userEmail || user.email || '');
      setPhone(user.phone || '');
      setBiometric(Boolean(user.biometricEnabled));
      setTransferPin(user.transferPin || '');
      setUserBankName(user.userBankName || '');
      setUserAccountNumber(user.userAccountNumber || '');
      setUserAccountName(user.userAccountName || '');
      isInitialRender.current = false;
    }
  }, [user]);

  // Dynamically keep the name and email input fields in sync with the
  // currently signed-in auth user. The auth context (`userEmail` +
  // `displayName`) is the source of truth for the live session, so these
  // inputs always reflect the real signed-in user instead of the hardcoded
  // UserContext default values.
  useEffect(() => {
    // Name: only auto-populate from the auth-derived display name when the
    // saved profile still carries the factory placeholder (or no name at
    // all). A deliberately saved custom name is never overwritten.
    if (!user?.fullName || user.fullName === PLACEHOLDER_NAME) {
      setFullName(authDisplayName || '');
    }
    // Email: always reflect the signed-in user's email from the auth context.
    if (userEmail) setEmail(userEmail);
  }, [userEmail, authDisplayName, user?.fullName]);

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
    });

    Alert.alert('Saved', 'Your profile and security settings have been updated.');
    
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
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
              <User size={40} color={colors.success} />
            )}
            <View style={styles.cameraBadge}>
              <Camera size={13} color={colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>Tap to upload a profile photo</Text>
        </View>

        {/* Account & personal details */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account & Personal Details</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          maxLength={11}
        />

        {/* Security */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Password & Security</Text>
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Fingerprint size={20} color="#2563EB" />
          <Text style={[styles.settingLabel, { color: colors.text }]}>Biometric Login (Fingerprint / Face ID)</Text>
          <Switch
            value={methods.biometric}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: '#D1FAE5', true: '#10B981' }}
            thumbColor='#FFFFFF'
          />
        </View>

        {/* Passcode / App Lock */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Passcode</Text>
        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Lock size={20} color={colors.primary} />
          <Text style={[styles.settingLabel, { color: colors.text }]}>App Lock (require on reopen)</Text>
          <Switch
            value={methods.passcode && methods.passcodeLockEnabled}
            onValueChange={handleTogglePasscodeLock}
            disabled={!methods.passcode}
            trackColor={{ false: '#D1FAE5', true: '#10B981' }}
            thumbColor='#FFFFFF'
          />
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={newPasscode}
          onChangeText={(t) => setNewPasscode(t.replace(/[^0-9]/g, ''))}
          placeholder={methods.passcode ? 'Change passcode (4 digits)' : 'Set passcode (4 digits)'}
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={confirmPasscode}
          onChangeText={(t) => setConfirmPasscode(t.replace(/[^0-9]/g, ''))}
          placeholder="Confirm passcode"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
        <TouchableOpacity style={styles.linkBtn} onPress={handleSavePasscode}>
          <KeyRound size={16} color={colors.primary} />
          <Text style={[styles.linkBtnText, { color: colors.primary }]}>
            {methods.passcode ? 'Change Passcode' : 'Set Passcode'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.passwordRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, styles.passwordInput, { backgroundColor: 'transparent', color: colors.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showCurrentPassword}
          />
          <TouchableOpacity style={styles.eyeToggleBtn} onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
            {showCurrentPassword ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>
        <View style={[styles.passwordRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, styles.passwordInput, { backgroundColor: 'transparent', color: colors.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password (leave blank to keep)"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showNewPassword}
          />
          <TouchableOpacity style={styles.eyeToggleBtn} onPress={() => setShowNewPassword(!showNewPassword)}>
            {showNewPassword ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => Alert.alert('Reset PIN', 'A PIN reset link has been sent to your email.')}
        >
          <KeyRound size={16} color={colors.primary} />
          <Text style={[styles.linkBtnText, { color: colors.primary }]}>Reset Transaction PIN</Text>
        </TouchableOpacity>

        {/* Appearance — theme selection (single source: 4 unified themes) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance & Theme</Text>

        {/* Single canonical 4-option theme selector (Dark Emerald / Pitch
            Black / Designer Light / Automatic). Replaces all prior duplicated
            palette & scheme pickers. Selecting one restyles the whole app and
            persists via AsyncStorage. */}
        <ThemeSelector />

        {/* Bank account & transfer credentials */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Account & Transfer Credentials</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={userBankName}
          onChangeText={setUserBankName}
          placeholder="Your bank name (e.g. GTBank)"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={userAccountNumber}
          onChangeText={setUserAccountNumber}
          placeholder="Your account number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={userAccountName}
          onChangeText={setUserAccountName}
          placeholder="Account name"
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={transferPin}
          onChangeText={setTransferPin}
          placeholder="Set 4-digit Transfer PIN"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        {/* Save */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveAll}>
          <Lock size={17} color={colors.background} />
          <Text style={[styles.saveBtnText, { color: colors.background }]}>Save Changes</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={17} color={colors.text} />
          <Text style={[styles.signOutBtnText, { color: colors.text }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
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
    borderColor: '#10B981',
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
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { color: '#8EA89D', fontSize: 11, marginTop: 8 },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 6,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 6,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 0,
    color: '#0F172A',
  },
  eyeToggleBtn: { paddingHorizontal: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 12,
    marginBottom: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  signOutBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  signOutBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  linkBtnText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: { fontWeight: 'bold', fontSize: 14 },
});

const styles = makeStyles(themes.darkEmerald, true);

