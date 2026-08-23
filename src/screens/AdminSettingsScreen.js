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
import { Landmark, CheckCircle2, Key, Megaphone, ChevronRight } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getAllSettings, saveSettings } from '../lib/supabase';
import { useBankDetails } from '../context/BankContext';

const ADMIN_SETTINGS_CACHE_KEY = '@admin_app_settings';

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

  return (
        <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
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
            <Key size={18} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Flutterwave Gateway</Text>
          </View>

          <Text style={styles.label}>Public Key</Text>
          <TextInput
            style={styles.input}
            value={flwPublicKey}
            onChangeText={setFlwPublicKey}
            placeholder="FLWPUBK-..."
            placeholderTextColor="#93A69B"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Secret Key</Text>
          <TextInput
            style={styles.input}
            value={flwSecretKey}
            onChangeText={setFlwSecretKey}
            placeholder="FLWSECK-..."
            placeholderTextColor="#93A69B"
            autoCapitalize="none"
            secureTextEntry
          />

          <Text style={styles.label}>Secret Hash</Text>
          <TextInput
            style={styles.input}
            value={flwSecretHash}
            onChangeText={setFlwSecretHash}
            placeholder="Webhook verification hash"
            placeholderTextColor="#93A69B"
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
              trackColor={{ false: '#1C4A2E', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Cooperative bank details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Landmark size={18} color="#4CAF50" />
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
            placeholderTextColor="#93A69B"
          />

          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumberInput}
            onChangeText={setAccountNumberInput}
            placeholder="e.g. 1234567890"
            placeholderTextColor="#93A69B"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={accountNameInput}
            onChangeText={setAccountNameInput}
            placeholder="e.g. Iyanu Oluwa Society"
            placeholderTextColor="#93A69B"
          />
        </View>

        {/* Loan Eligibility — admin-controlled limit (Nigerian coop rule) */}
        <View style={styles.loanSection}>
          <View style={styles.loanHeader}>
            <Landmark size={18} color="#4CAF50" />
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
                placeholderTextColor="#93A69B"
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
                placeholderTextColor="#93A69B"
                keyboardType="decimal-pad"
              />
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.bannerLink}
          onPress={() => navigation.navigate('PromotionalBanners')}
        >
          <Megaphone size={18} color="#4CAF50" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLinkTitle}>Promotional Banners</Text>
            <Text style={styles.bannerLinkSub}>Create photo-only or full advert banner popups</Text>
          </View>
          <ChevronRight size={18} color="#9CB8A6" />
        </TouchableOpacity>

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
    backgroundColor: '#0B2211' 
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
    backgroundColor: '#0F2A19',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0B2211',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: '#93A69B',
    fontSize: 11,
    marginBottom: 10,
  },
  label: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F2A19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B2211',
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
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    color: '#93A69B',
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
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
    backgroundColor: '#0F2A19',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1C4A2E',
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#1C4A2E',
    borderRadius: 10,
    padding: 4,
    marginVertical: 10,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#4CAF50' },
  modeBtnText: { color: '#93A69B', fontSize: 12, fontWeight: '600' },
  modeBtnTextActive: { color: '#FFFFFF' },
  bannerLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 16,
  },
  bannerLinkTitle: { color: '#0B2211', fontSize: 14, fontWeight: '600' },
  bannerLinkSub: { color: '#93A69B', fontSize: 11, marginTop: 2 },
});