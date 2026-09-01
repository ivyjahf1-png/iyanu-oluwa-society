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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Landmark,
  CheckCircle2,
  Key,
  Megaphone,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Store,
  BadgeCheck,
  Users,
  UserCog,
  Trash2,
  Bot,
  ScrollText,
  HandCoins,
  AlertTriangle,
  Wallet,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { getAllSettings, saveSettings, supabase, isServerConfigured } from '../lib/supabase';
import { fetchPendingPayments } from '../lib/ledger';
import { useBankDetails } from '../context/BankContext';
import { useAppTheme } from '../context/ThemeContext';
import { resetAllAccounts } from '../auth/authService';
import {
  readAdminSecurity,
  // Aliased: the component also declares a local useState setter named
  // `setAdminPasscode`, which would shadow the plain import.
  setAdminPasscode as persistAdminPasscode,
  setAdminBiometricEnabled,
  setAdminRequireStartup,
  getAdminMasterPasscode,
  MASTER_PIN_KEY,
} from '../lib/adminSecurity';

const ADMIN_SETTINGS_CACHE_KEY = '@admin_app_settings';

/** Currency formatter for the admin overview metrics. */
const naira = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminSettingsScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
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

  // ---- Admin Overview metrics — every figure is read from the backend ----
  // (profiles / ledger_entries / loans / pending_payments). No hardcoded or
  // client-invented totals: sums are reductions over rows returned by RLS.
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const loadAdminMetrics = async () => {
    if (!isServerConfigured()) {
      setMetrics(null);
      setMetricsLoading(false);
      return;
    }
    setMetricsLoading(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [membersRes, balancesRes, ledgerRes, loansRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('balance'),
        supabase
          .from('ledger_entries')
          .select('entry_type, direction, amount, created_at')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('loans').select('status, principal, total_repayable, amount_repaid, due_date'),
        fetchPendingPayments(),
      ]);

      const balances = balancesRes.data || [];
      const ledger = ledgerRes.data || [];
      const loans = loansRes.data || [];
      const pending = pendingRes || [];

      const sum = rows => rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const credits = types => sum(ledger.filter(l => types.includes(l.entry_type) && l.direction === 'credit'));

      const totalSavings =
        credits(['contribution', 'deposit']) -
        sum(ledger.filter(l => l.entry_type === 'withdrawal' && l.direction === 'debit'));

      const outstandingLoans = loans
        .filter(l => l.status === 'disbursed')
        .reduce((s, l) => s + Math.max(0, Number(l.total_repayable || 0) - Number(l.amount_repaid || 0)), 0);

      const overdueLoans = loans.filter(
        l => l.status === 'disbursed' && l.due_date && new Date(l.due_date) < new Date(),
      ).length;

      setMetrics({
        totalMembers: membersRes.count ?? 0,
        availableFunds: balances.reduce((s, r) => s + Number(r.balance || 0), 0),
        totalSavings,
        outstandingLoans,
        todayContributions: sum(
          ledger.filter(
            l => l.entry_type === 'contribution' && new Date(l.created_at) >= startOfToday,
          ),
        ),
        pendingPayments: pending.length,
        pendingLoans: loans.filter(l => l.status === 'pending').length,
        pendingWithdrawals: pending.filter(p => p.tx_type === 'withdrawal').length,
        overdueLoans,
      });
    } catch (e) {
      console.warn('[admin-metrics] load failed:', e?.message);
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  };


  useEffect(() => {
    loadSettings();
    loadAdminMetrics();
  }, []);

  // Mount-time security binding: read the contract keys via the safe
  // dual-storage getter (SecureStore native → AsyncStorage fallback/web).
  useEffect(() => {
    const loadSecuritySettings = async () => {
      try {
        const savedPin = await getSecurely('admin_master_passcode');
        const savedBio = await getSecurely('biometrics_enabled');
        const savedStartup = await getSecurely('require_passcode_startup');

        if (savedPin) setAdminPasscode(savedPin);
        if (savedBio !== null) setSecBiometric(JSON.parse(savedBio) === true);
        if (savedStartup !== null) setSecRequireStartup(JSON.parse(savedStartup) === true);
      } catch (e) {
        console.warn('[adminSecurity] load on mount failed:', e);
      }
    };
    loadSecuritySettings();
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
    // Security & Access Control (persisted via adminSecurity/SecureStore)
    try {
      const sec = await readAdminSecurity();
      setSecBiometric(Boolean(sec.biometricEnabled));
      setSecRequireStartup(Boolean(sec.requireOnStartup));
      // Bind the stored master PIN to the input so the UI reflects what is
      // actually persisted in SecureStore ('admin_master_passcode').
      let savedPin = await getAdminMasterPasscode();
      if (!savedPin && Platform.OS !== 'web') {
        try { savedPin = await SecureStore.getItemAsync(MASTER_PIN_KEY); } catch (e) { /* noop */ }
      }
      setAdminPasscode(savedPin || '');
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

  /** Dual-storage safe writer: SecureStore native, AsyncStorage web/fallback. */
  const saveSecurely = async (key, value) => {
    try {
      const stringVal = String(value);
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, stringVal);
      } else {
        await SecureStore.setItemAsync(key, stringVal);
      }
      return true;
    } catch (err) {
      console.warn(`SecureStore failed for ${key}, falling back to AsyncStorage`, err);
      try {
        await AsyncStorage.setItem(key, String(value));
        return true;
      } catch (e2) {
        console.warn(`AsyncStorage fallback also failed for ${key}`, e2);
        return false;
      }
    }
  };

  /** Dual-storage safe reader: prefers SecureStore on native, falls back to AsyncStorage. */
  const getSecurely = async (key) => {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      }
      const val = await SecureStore.getItemAsync(key);
      return val !== null && val !== undefined ? val : await AsyncStorage.getItem(key);
    } catch (err) {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e2) {
        return null;
      }
    }
  };

  /**
   * Explicit async save handler for the "Save Passcode" button.
   * Writes via the safe dual-storage wrapper so saving succeeds on Expo Go,
   * web, and physical device builds without unhandled rejections.
   */
  const handleSavePasscode = async () => {
    if (!adminPasscode || (adminPasscode.length !== 4 && adminPasscode.length !== 6)) {
      Alert.alert('Invalid PIN', 'Passcode must be exactly 4 or 6 digits.');
      return;
    }
    try {
      // Persist the salted-hash record first so legacy verification keeps working.
      const res = await persistAdminPasscode(adminPasscode);
      if (!res.ok) {
        Alert.alert('Error', res.error || 'Failed to save admin passcode securely.');
        return;
      }
      // Contract-key writes through the safe wrapper.
      await saveSecurely('admin_master_passcode', adminPasscode);
      await saveSecurely('biometrics_enabled', JSON.stringify(secBiometric));
      await saveSecurely('require_passcode_startup', JSON.stringify(secRequireStartup));
      setAdminPasscode('');
      Alert.alert('Success', 'Admin passcode and security configuration saved successfully!');
    } catch (error) {
      console.warn('[adminSecurity] save failed:', error);
      Alert.alert('Error', 'Failed to save admin passcode securely.');
    }
  };

  // Save / update the master 6-digit admin passcode (hashed before storage).
  const saveAdminPasscode = async () => {
    if (!/^\d{4}$|^\d{6}$/.test(adminPasscode)) {
      Alert.alert('Invalid Passcode', 'The master passcode must be exactly 4 or 6 digits.');
      return;
    }
    const res = await persistAdminPasscode(adminPasscode);
    if (!res.ok) {
      Alert.alert('Error', res.error || 'Could not save the admin passcode.');
      return;
    }
    // Explicit encrypted write of the master PIN mirror (contract key).
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(MASTER_PIN_KEY, adminPasscode);
      }
    } catch (e) {
      console.warn('SecureStore master PIN write failed (AsyncStorage mirror kept):', e);
    }
    setAdminPasscode('');
    Alert.alert('Passcode Updated', 'The master admin passcode has been saved.');
  };

  // Enable/disable fingerprint / FaceID with native verification first.
  const toggleBiometric = async (enabled) => {
    if (!enabled) {
      setSecBiometric(false);
      await setAdminBiometricEnabled(false);
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
      await setAdminBiometricEnabled(true);
      Alert.alert('Biometric Enabled', 'Fingerprint / FaceID can now unlock admin access.');
    } catch (e) {
      console.warn('biometric error:', e);
      Alert.alert('Error', 'Biometric authentication could not be completed.');
    }
  };

  // Enforce passcode checks at app startup.
  const toggleRequireStartup = async (enabled) => {
    setSecRequireStartup(enabled);
    await setAdminRequireStartup(enabled);
  };

  // Developer reset â€” wipes ALL local accounts/auth data with explicit confirm.
  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data (Dev)',
      'This will permanently wipe all local accounts, passcodes, biometric flags and session data. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllAccounts();
              Alert.alert('Data Cleared', 'All local account data has been wiped.');
              navigation.navigate('WelcomeScreen');
            } catch (e) {
              Alert.alert('Error', 'Could not clear data.');
            }
          },
        },
      ],
    );
  };

  return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={colors.background}
          />
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
        {/* Control Panel â€” full admin menu */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Admin Dashboard</Text>
          </View>

          <TouchableOpacity style={styles.controlRow} onPress={() => {}}>
            <View style={[styles.controlIcon, { backgroundColor: '#0F4C38' }]}>
              <Landmark size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Admin Settings</Text>
              <Text style={styles.controlSub}>Configure cooperative bank account</Text>
            </View>
            <Text style={styles.controlPill}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminDeposits')}>
            <View style={[styles.controlIcon, { backgroundColor: '#123B63' }]}>
              <BadgeCheck size={18} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Verify Deposits</Text>
              <Text style={styles.controlSub}>Review pending manual funding proofs</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminMarketplace')}>
            <View style={[styles.controlIcon, { backgroundColor: '#40301A' }]}>
              <Store size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Marketplace Dashboard</Text>
              <Text style={styles.controlSub}>Upload & manage marketplace inventory</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('Announcements')}>
            <View style={[styles.controlIcon, { backgroundColor: '#33205A' }]}>
              <Megaphone size={18} color="#A78BFA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Channels & Announcements</Text>
              <Text style={styles.controlSub}>Broadcast announcements to members</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('SocietyHub')}>
            <View style={[styles.controlIcon, { backgroundColor: '#0E4A45' }]}>
              <Users size={18} color="#2DD4BF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Society Hub</Text>
              <Text style={styles.controlSub}>Membership status & community activities</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminUserManagement')}>
            <View style={[styles.controlIcon, { backgroundColor: '#3B2450' }]}>
              <UserCog size={18} color="#C084FC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>User Management</Text>
              <Text style={styles.controlSub}>Monitor members, reset passwords & suspend accounts</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={handleClearAllData}>
            <View style={[styles.controlIcon, { backgroundColor: '#4A1D24' }]}>
              <Trash2 size={18} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.controlTitle, { color: '#F87171' }]}>Clear All Data (Dev)</Text>
              <Text style={styles.controlSub}>Developer reset â€” wipes local accounts</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ADMIN OVERVIEW — figures read live from the backend tables */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Landmark size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Admin Overview</Text>
            <TouchableOpacity
              style={{ marginLeft: 'auto' }}
              onPress={loadAdminMetrics}
              disabled={metricsLoading}
            >
              <Text style={styles.refreshText}>{metricsLoading ? '…' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>

          {metricsLoading && !metrics ? (
            <View style={styles.metricsLoading}>
              <ActivityIndicator size="small" color={colors.success} />
              <Text style={styles.sectionHint}>Loading cooperative figures…</Text>
            </View>
          ) : !metrics ? (
            <Text style={styles.sectionHint}>
              Backend not configured on this device — figures unavailable.
            </Text>
          ) : (
            <>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Total Members</Text>
                  <Text style={styles.metricValue}>{metrics.totalMembers}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Cooperative Funds</Text>
                  <Text style={styles.metricValue}>{naira(metrics.availableFunds)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Total Savings</Text>
                  <Text style={styles.metricValue}>{naira(metrics.totalSavings)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Outstanding Loans</Text>
                  <Text style={styles.metricValue}>{naira(metrics.outstandingLoans)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Today's Contributions</Text>
                  <Text style={styles.metricValue}>{naira(metrics.todayContributions)}</Text>
                </View>
              </View>
              <Text style={styles.metricFootnote}>
                Derived live from profiles, ledger_entries and loans (authoritative backend records).
              </Text>
            </>
          )}
        </View>

        {/* NEEDS ATTENTION — actionable counters that open the right screen */}
        {metrics ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Needs Attention</Text>
            </View>

            <TouchableOpacity
              style={styles.attentionRow}
              onPress={() => navigation.navigate('AdminDeposits')}
            >
              <BadgeCheck size={16} color="#38BDF8" />
              <Text style={styles.attentionText}>Pending payments</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{metrics.pendingPayments}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attentionRow}
              onPress={() => navigation.navigate('AdminLoans', { status: 'pending' })}
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{metrics.pendingLoans}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attentionRow}
              onPress={() => navigation.navigate('AdminDeposits')}
            >
              <Wallet size={16} color="#A78BFA" />
              <Text style={styles.attentionText}>Pending withdrawals</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{metrics.pendingWithdrawals}</Text>
              </View>
            </TouchableOpacity>

            {metrics.overdueLoans > 0 ? (
              <TouchableOpacity
                style={styles.attentionRow}
                onPress={() => navigation.navigate('AdminLoans', { status: 'disbursed' })}
                <Text style={styles.attentionText}>Overdue loans</Text>
                <View style={[styles.countBadge, { backgroundColor: '#F87171' }]}>
                  <Text style={styles.countText}>{metrics.overdueLoans}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.attentionRow}
              onPress={() => navigation.navigate('AdminDeposits')}
            >
              <ShieldCheck size={16} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.attentionText}>Reconciliation</Text>
                <Text style={styles.attentionSub}>Verify wallets against the ledger</Text>
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* QUICK ACTIONS — all point at existing screens */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.qaGrid}>
            <TouchableOpacity style={styles.qaCell} onPress={() => navigation.navigate('AdminUserManagement')}>
              <Users size={18} color="#C084FC" />
              <Text style={styles.qaText}>Add Member</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaCell} onPress={() => navigation.navigate('AdminDeposits')}>
              <BadgeCheck size={18} color="#38BDF8" />
              <Text style={styles.qaText}>Verify Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaCell} onPress={() => navigation.navigate('AdminLoans')}>
              <HandCoins size={18} color={colors.success} />
              <Text style={styles.qaText}>Approve Loan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaCell} onPress={() => navigation.navigate('AdminLedger')}>
              <ScrollText size={18} color="#F59E0B" />
              <Text style={styles.qaText}>Ledger</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaCell} onPress={() => navigation.navigate('AccountStatement')}>
              <ScrollText size={18} color="#2DD4BF" />
              <Text style={styles.qaText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaCell} onPress={() => navigation.navigate('AdminDeposits')}>
              <ShieldCheck size={18} color="#38BDF8" />
              <Text style={styles.qaText}>Reconcile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FINANCIAL MANAGEMENT — routes into the existing screens/RPCs */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Wallet size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Financial Management</Text>
          </View>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminDeposits')}>
            <View style={[styles.controlIcon, { backgroundColor: '#123B63' }]}>
              <BadgeCheck size={18} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Payments & Withdrawals</Text>
              <Text style={styles.controlSub}>Verify, approve or reject pending submissions</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminLoans')}>
            <View style={[styles.controlIcon, { backgroundColor: '#0F4C38' }]}>
              <HandCoins size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Loans</Text>
              <Text style={styles.controlSub}>Review, approve, reject, disburse & track repayments</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminLedger')}>
            <View style={[styles.controlIcon, { backgroundColor: '#40301A' }]}>
              <ScrollText size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Transaction Ledger</Text>
              <Text style={styles.controlSub}>Immutable record — every credit & debit</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AccountStatement')}>
            <View style={[styles.controlIcon, { backgroundColor: '#0E4A45' }]}>
              <ScrollText size={18} color="#2DD4BF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Statements & Reports</Text>
              <Text style={styles.controlSub}>Statement periods with PDF / share export</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* LOAN MANAGEMENT — status-filtered routing into AdminLoans */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <HandCoins size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Loan Management</Text>
          </View>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminLoans', { status: 'pending' })}>
            <View style={[styles.controlIcon, { backgroundColor: '#6B4A00' }]}>
              <HandCoins size={18} color="#FBBF24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Pending Approvals</Text>
              <Text style={styles.controlSub}>Review, approve or reject new applications</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminLoans', { status: 'approved' })}>
            <View style={[styles.controlIcon, { backgroundColor: '#0F4C38' }]}>
              <HandCoins size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Approved Loans</Text>
              <Text style={styles.controlSub}>Ready to disburse (credit member wallets)</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlRow} onPress={() => navigation.navigate('AdminLoans', { status: 'rejected' })}>
            <View style={[styles.controlIcon, { backgroundColor: '#4A1520' }]}>
              <HandCoins size={18} color="#F87171" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.controlTitle}>Rejected Loans</Text>
              <Text style={styles.controlSub}>Previously declined applications</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

                {/* AI Config — edge-function auth with direct Gemini fallback */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Bot size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>AI Config</Text>
          </View>
          <Text style={styles.sectionHint}>
            The AI Assistant queries the coop-ai edge function (Supabase anon-key auth) first, then falls back to a direct Gemini call if the function is unreachable.
          </Text>
          <Text style={styles.sectionHint}>
            Fallback model chain (first available): gemini-1.5-flash to gemini-flash-latest to gemini-2.0-flash to gemini-2.5-flash
          </Text>
          <TouchableOpacity
            style={styles.bannerLink}
            onPress={() => navigation.navigate('AIAssistant')}
          >
            <Bot size={16} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerLinkTitle}>Open AI Assistant</Text>
              <Text style={styles.bannerLinkSub}>Talk to the cooperative AI agent</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Appearance — themes are managed in Profile Settings (single
            canonical 4-option ThemeSelector). The duplicated scheme grid was
            removed; setColorScheme remains aliased to the canonical setTheme. */}

        {/* Flutterwave credentials */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Key size={18} color={colors.success} />
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
              trackColor={{ false: '#D1FAE5', true: '#10B981' }}
              thumbColor='#FFFFFF'
            />
          </View>
        </View>

        {/* Cooperative bank details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Landmark size={18} color={colors.success} />
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
            placeholder="e.g. Standard Mutual Savings"
            placeholderTextColor="#526E63"
          />
        </View>

        {/* Loan Eligibility â€” admin-controlled limit (Nigerian coop rule) */}
        <View style={styles.loanSection}>
          <View style={styles.loanHeader}>
            <Landmark size={18} color={colors.success} />
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
              <Text style={styles.label}>Fixed Maximum Amount ({'\u20A6'})</Text>
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
          <Megaphone size={18} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLinkTitle}>Promotional Banners</Text>
            <Text style={styles.bannerLinkSub}>Create photo-only or full advert banner popups</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Security & Access Control */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color={colors.success} />
            <Text style={styles.sectionTitle}>Security &amp; Access Control</Text>
          </View>
          <Text style={styles.sectionHint}>
            Master passcode, biometric unlock, and startup enforcement for admin access.
          </Text>

          <Text style={styles.label}>Master Admin Passcode (4 or 6 digits)</Text>
          <View style={styles.passcodeRow}>
            <TextInput
              style={[styles.input, styles.passcodeInput]}
              value={adminPasscode}
              onChangeText={(t) => setAdminPasscode(t.replace(/[^0-9]/g, ''))}
              placeholder="Set / update 4 or 6-digit passcode"
              placeholderTextColor="#526E63"
              keyboardType="number-pad"
              secureTextEntry={!showAdminPasscode}
              maxLength={6}
            />
            <TouchableOpacity style={styles.eyeToggleBtn} onPress={() => setShowAdminPasscode(!showAdminPasscode)}>
              {showAdminPasscode ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
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
              trackColor={{ false: '#D1FAE5', true: '#10B981' }}
              thumbColor='#FFFFFF'
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
              trackColor={{ false: '#D1FAE5', true: '#10B981' }}
              thumbColor='#FFFFFF'
            />
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSavePasscode}>
            <CheckCircle2 size={16} color={colors.text} />
            <Text style={styles.saveBtnText}>Save Passcode</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled, { backgroundColor: colors.primary }]}
          onPress={saveSettingsHandler}
          disabled={loading || saving}
        >
          <CheckCircle2 size={18} color={colors.text} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving\u2026' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
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
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 10,
  },
  // ---- Admin Overview / Quick Actions / Needs Attention ----
  refreshText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  metricsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricFootnote: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 10,
    lineHeight: 14,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attentionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  attentionSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  countText: { color: colors.background, fontSize: 12, fontWeight: 'bold' },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qaCell: {
    flexGrow: 1,
    minWidth: '30%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  qaText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
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
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  passcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  passcodeInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 0,
    color: colors.text,
  },
  eyeToggleBtn: { paddingHorizontal: 12 },
  saveBtn: {
    backgroundColor: colors.success,
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
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loanSection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginVertical: 10,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: colors.success },
  modeBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  modeBtnTextActive: { color: colors.text },
  bannerLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  themePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  themePreviewDot: { width: 12, height: 12, borderRadius: 6 },
  themePreviewLabel: { fontSize: 12, fontWeight: '700' },
  bannerLinkTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
    bannerLinkSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeSwatch: {
    flex: 1,
    minWidth: 90,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeSwatchActive: {
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  themeSwatchLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  controlIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  controlSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  controlPill: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

const styles = makeStyles(themes.darkEmerald, true);

