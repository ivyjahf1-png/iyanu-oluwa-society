import React, { useEffect, useState } from 'react';
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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Landmark, CheckCircle2, Key, Megaphone, ChevronRight, ShieldCheck, Eye, EyeOff } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import ScreenHeader from '../components/ScreenHeader';
import { getAllSettings, saveSettings } from '../lib/supabase';
import { useBankDetails } from '../context/BankContext';

const ADMIN_SETTINGS_CACHE_KEY = '@admin_app_settings';
const ADMIN_SECURITY_KEY = '@admin_security';

// Simple deterministic hash so the admin passcode is never stored in plain text.
function hashPasscode(code, salt) {
  let h = 0x811c9dc5;
  const input = salt + ':' + code;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'fnv:' + h.toString(16) + ':' + input.length;
}

export default function AdminSettingsScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { setBankDetails } = useBankDetails();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Payment gateway credentials
  const [flwPublicKey, setFlwPublicKey] = useState('');
  const [flwSecretKey, setFlwSecretKey] = useState('');
  const [flwSecretHash, setFlwSecretHash] = useState('');
  const [passFeesToUser, setPassFeesToUser] = useState(false);

  // Official cooperative bank details
  const [bankNameInput, setBankNameInput] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [accountNameInput, setAccountNameInput] = useState('');
  // Loan eligibility (admin-controlled): fixed limit OR % of savings (default 200%).
  const [loanLimitMode, setLoanLimitMode] = useState('percent'); // 'percent' | 'fixed'
  const [loanLimitPercent, setLoanLimitPercent] = useState('200');
  const [loanLimitFixed, setLoanLimitFixed] = useState('');
  // Security & Access Control (admin master passcode + biometric + startup lock)
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [secBiometric, setSecBiometric] = useState(false);
  const [secRequireStartup, setSecRequireStartup] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    let loadedData = {};

    // 1. Try loading cached settings first (Fast & offline fallback)
    try {
      const cached = await AsyncStorage.getItem(ADMIN_SETTINGS_CACHE_KEY);
      if (cached) {
        loadedData = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('AsyncStorage read error:', e);
    }

    // 2. Try fetching latest settings from Supabase
    try {
      const s = await getAllSettings();
      if (s && Object.keys(s).length > 0) {
        loadedData = { ...loadedData, ...s };
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local storage:', e);
    }

    // 3. Populate component state
    setFlwPublicKey(loadedData.flutterwave_public_key || '');
    setFlwSecretKey(loadedData.flutterwave_secret_key || '');
    setFlwSecretHash(loadedData.flutterwave_secret_hash || '');
    setPassFeesToUser(loadedData.pass_fees_to_user === 'true');
    setBankNameInput(loadedData.coop_bank_name || '');
    setAccountNumberInput(loadedData.coop_account_number || '');
    setAccountNameInput(loadedData.coop_account_name || '');
    setLoanLimitMode(loadedData.loan_limit_mode || 'percent');
    setLoanLimitPercent(loadedData.loan_limit_percent || '200');
    setLoanLimitFixed(loadedData.loan_limit_fixed || '');
    // Security & Access Control (persisted in @admin_security)
    try {
      const rawSec = await AsyncStorage.getItem(ADMIN_SECURITY_KEY);
      if (rawSec) {
        const sec = JSON.parse(rawSec);
        setSecBiometric(Boolean(sec.biometricEnabled));
        setSecRequireStartup(Boolean(sec.requireOnStartup));
      }
    } catch (e) {
      console.warn('Admin security load failed:', e);
    }

    setLoading(false);
  };

  const saveSettingsHandler = async () => {
    if (!bankNameInput.trim() || !accountNumberInput.trim() || !accountNameInput.trim()) {
      Alert.alert(
        'Missing details',
        'Please fill in the cooperative bank name, account number, and account name.'
      );
      return;
    }

    setSaving(true);

    const payload = {
      flutterwave_public_key: flwPublicKey.trim(),
      flutterwave_secret_key: flwSecretKey.trim(),
      flutterwave_secret_hash: flwSecretHash.trim(),
      pass_fees_to_user: passFeesToUser ? 'true' : 'false',
      coop_bank_name: bankNameInput.trim(),
      coop_account_number: accountNumberInput.trim(),
      coop_account_name: accountNameInput.trim(),
      loan_limit_mode: loanLimitMode,
      loan_limit_percent: loanLimitPercent.trim() || '200',
      loan_limit_fixed: loanLimitFixed.trim(),
    };

    let saveSuccess = false;

    // 1. Save locally to AsyncStorage (Guarantees app never fails to save)
    try {
      await AsyncStorage.setItem(ADMIN_SETTINGS_CACHE_KEY, JSON.stringify(payload));
      saveSuccess = true;
    } catch (e) {
      console.warn('Local save failed:', e);
    }

    // 2. Attempt saving remotely to Supabase
    try {
      await saveSettings(payload);
      saveSuccess = true;
    } catch (e) {
      console.warn('Supabase remote save failed, kept local settings:', e);
    }

    setSaving(false);

    if (saveSuccess) {
      // Push the cooperative bank details into the global BankContext so
      // member screens (Fund Wallet, Repay Loan) update immediately.
      await setBankDetails({
        bankName: bankNameInput,
        accountNumber: accountNumberInput,
        accountName: accountNameInput,
      });
      Alert.alert('Saved', 'Payment gateway and cooperative bank details updated successfully.');
      navigation.goBack();
    } else {
      Alert.alert('Save Failed', 'Could not save settings locally or online.');
    }
  };

  /* ===== Security & Access Control handlers ===== */

  // Save / update the master 6-digit admin passcode (hashed before storage).
  const saveAdminPasscode = async () => {
    if (!/^\d{6}$/.test(adminPasscode)) {
      Alert.alert('Invalid Passcode', 'The master passcode must be exactly 6 digits.');
      return;
    }
    try {
      const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const existingRaw = await AsyncStorage.getItem(ADMIN_SECURITY_KEY);
      const sec = existingRaw ? JSON.parse(existingRaw) : {};
      sec.salt = salt;
      sec.passcodeHash = hashPasscode(adminPasscode, salt);
      await AsyncStorage.setItem(ADMIN_SECURITY_KEY, JSON.stringify(sec));
      setAdminPasscode('');
      Alert.alert('Passcode Updated', 'The master admin passcode has been saved.');
    } catch (e) {
      console.warn('Admin passcode save failed:', e);
      Alert.alert('Error', 'Could not save the admin passcode.');
    }
  };

  // Enable/disable fingerprint / FaceID with native verification first.
  const toggleBiometric = async (enabled) => {
    if (!enabled) {
      setSecBiometric(false);
      try {
        const rawSec = await AsyncStorage.getItem(ADMIN_SECURITY_KEY);
        const sec = rawSec ? JSON.parse(rawSec) : {};
        sec.biometricEnabled = false;
        await AsyncStorage.setItem(ADMIN_SECURITY_KEY, JSON.stringify(sec));
      } catch (e) { console.warn('biometric persist failed:', e); }
      return;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert(
          'Biometric Unavailable',
          !hasHardware
            ? 'This device does not support biometric authentication.'
            : 'No fingerprint or face is enrolled on this device.'
        );
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to enable biometric access',
      });
      if (!res.success) return; // keep toggle OFF on failure/cancel
      setSecBiometric(true);
      try {
        const rawSec = await AsyncStorage.getItem(ADMIN_SECURITY_KEY);
        const sec = rawSec ? JSON.parse(rawSec) : {};
        sec.biometricEnabled = true;
        await AsyncStorage.setItem(ADMIN_SECURITY_KEY, JSON.stringify(sec));
      } catch (e) { console.warn('biometric persist failed:', e); }
      Alert.alert('Biometric Enabled', 'Fingerprint / FaceID can now unlock admin access.');
    } catch (e) {
      console.warn('biometric error:', e);
      Alert.alert('Error', 'Biometric authentication could not be completed.');
    }
  };

  // Enforce passcode checks at app startup.
  const toggleRequireStartup = async (enabled) => {
    setSecRequireStartup(enabled);
    try {
      const rawSec = await AsyncStorage.getItem(ADMIN_SECURITY_KEY);
      const sec = rawSec ? JSON.parse(rawSec) : {};
      sec.requireOnStartup = enabled;
      await AsyncStorage.setItem(ADMIN_SECURITY_KEY, JSON.stringify(sec));
    } catch (e) {
      console.warn('startup flag persist failed:', e);
    }
  };

  return (
        <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
      <ScreenHeader
        title="Admin Settings"
        subtitle="Gateway credentials & cooperative bank account"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Flutterwave credentials */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Key size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Flutterwave Gateway</Text>
          </View>

          <Text style={styles.label}>Public Key</Text>
          <TextInput
            style={styles.input}
            value={flwPublicKey}
            onChangeText={setFlwPublicKey}
            placeholder="FLWPUBK-..."
            placeholderTextColor="#526E63"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Secret Key</Text>
          <TextInput
            style={styles.input}
            value={flwSecretKey}
            onChangeText={setFlwSecretKey}
            placeholder="FLWSECK-..."
            placeholderTextColor="#526E63"
            autoCapitalize="none"
            secureTextEntry
          />

          <Text style={styles.label}>Secret Hash</Text>
          <TextInput
            style={styles.input}
            value={flwSecretHash}
            onChangeText={setFlwSecretHash}
            placeholder="Webhook verification hash"
            placeholderTextColor="#526E63"
            autoCapitalize="none"
            secureTextEntry
          />

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Pass transaction fees to user</Text>
              <Text style={styles.switchSub}>Add gateway charges to member funding amounts</Text>
            </View>
            <Switch
              value={passFeesToUser}
              onValueChange={setPassFeesToUser}
              trackColor={{ false: '#172F27', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Cooperative bank details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Landmark size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Cooperative Bank Account</Text>
          </View>
          <Text style={styles.sectionHint}>
            Shown to members on contribution and loan repayment screens.
          </Text>

          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bankNameInput}
            onChangeText={setBankNameInput}
            placeholder="e.g. Zenith Bank, First Bank, Wema Bank"
            placeholderTextColor="#526E63"
          />

          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumberInput}
            onChangeText={setAccountNumberInput}
            placeholder="e.g. 1234567890"
            placeholderTextColor="#526E63"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={accountNameInput}
            onChangeText={setAccountNameInput}
            placeholder="e.g. Iyanu Oluwa Society"
            placeholderTextColor="#526E63"
          />
        </View>

        {/* Loan Eligibility — admin-controlled limit (Nigerian coop rule) */}
        <View style={styles.loanSection}>
          <View style={styles.loanHeader}>
            <Landmark size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Loan Eligibility</Text>
          </View>
          <Text style={styles.sectionHint}>
            Set the maximum loan members can request. Choose a fixed amount or a percentage of savings (default 200%).
          </Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, loanLimitMode === 'percent' && styles.modeBtnActive]}
              onPress={() => setLoanLimitMode('percent')}
            >
              <Text style={[styles.modeBtnText, loanLimitMode === 'percent' && styles.modeBtnTextActive]}>
                % of Savings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, loanLimitMode === 'fixed' && styles.modeBtnActive]}
              onPress={() => setLoanLimitMode('fixed')}
            >
              <Text style={[styles.modeBtnText, loanLimitMode === 'fixed' && styles.modeBtnTextActive]}>
                Fixed Amount
              </Text>
            </TouchableOpacity>
          </View>

          {loanLimitMode === 'percent' ? (
            <>
              <Text style={styles.label}>Percent of Savings</Text>
              <TextInput
                style={styles.input}
                value={loanLimitPercent}
                onChangeText={(t) => setLoanLimitPercent(t.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 200 (% of total savings)"
                placeholderTextColor="#526E63"
                keyboardType="number-pad"
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Fixed Maximum Amount (₦)</Text>
              <TextInput
                style={styles.input}
                value={loanLimitFixed}
                onChangeText={(t) => setLoanLimitFixed(t.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 500000"
                placeholderTextColor="#526E63"
                keyboardType="decimal-pad"
              />
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.bannerLink}
          onPress={() => navigation.navigate('PromotionalBanners')}
        >
          <Megaphone size={18} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLinkTitle}>Promotional Banners</Text>
            <Text style={styles.bannerLinkSub}>Create photo-only or full advert banner popups</Text>
          </View>
          <ChevronRight size={18} color="#9CB8A6" />
        </TouchableOpacity>

        {/* Security & Access Control */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Security &amp; Access Control</Text>
          </View>
          <Text style={styles.sectionHint}>
            Master passcode, biometric unlock, and startup enforcement for admin access.
          </Text>

          <Text style={styles.label}>Master Admin Passcode (6 digits)</Text>
          <View style={styles.passcodeRow}>
            <TextInput
              style={[styles.input, styles.passcodeInput]}
              value={adminPasscode}
              onChangeText={(t) => setAdminPasscode(t.replace(/[^0-9]/g, ''))}
              placeholder="Set / update 6-digit passcode"
              placeholderTextColor="#526E63"
              keyboardType="number-pad"
              secureTextEntry={!showAdminPasscode}
              maxLength={6}
            />
            <TouchableOpacity style={styles.eyeToggleBtn} onPress={() => setShowAdminPasscode(!showAdminPasscode)}>
              {showAdminPasscode ? <EyeOff size={18} color="#8EA89D" /> : <Eye size={18} color="#8EA89D" />}
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Enable Biometric Auth</Text>
              <Text style={styles.switchSub}>Fingerprint / FaceID verification for admin access</Text>
            </View>
            <Switch
              value={secBiometric}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#172F27', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Require Passcode on Startup</Text>
              <Text style={styles.switchSub}>Enforce passcode check at login / app launch</Text>
            </View>
            <Switch
              value={secRequireStartup}
              onValueChange={toggleRequireStartup}
              trackColor={{ false: '#172F27', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveAdminPasscode}>
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Save Passcode</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveSettingsHandler}
          disabled={loading || saving}
        >
          <CheckCircle2 size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#091813' 
  },
  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: 16, 
    paddingBottom: Platform.OS === 'web' ? 100 : 50,
    flexGrow: 1,
  },
  sectionCard: {
    backgroundColor: '#0D1D18',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#172F27',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: '#8EA89D',
    fontSize: 11,
    marginBottom: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  switchTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    color: '#8EA89D',
    fontSize: 11,
    marginTop: 2,
  },
  passcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    marginBottom: 14,
  },
  passcodeInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 0,
    color: '#FFFFFF',
  },
  eyeToggleBtn: { paddingHorizontal: 12 },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loanSection: {
    backgroundColor: '#0D1D18',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#172F27',
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#172F27',
    borderRadius: 10,
    padding: 4,
    marginVertical: 10,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#10B981' },
  modeBtnText: { color: '#8EA89D', fontSize: 12, fontWeight: '600' },
  modeBtnTextActive: { color: '#FFFFFF' },
  bannerLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#132620', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#172F27', marginBottom: 16,
  },
  bannerLinkTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  bannerLinkSub: { color: '#8EA89D', fontSize: 11, marginTop: 2 },
});