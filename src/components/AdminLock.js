import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint, Delete, ShieldCheck, KeyRound } from 'lucide-react-native';
import {
  verifyAdminPasscode,
  isAdminSecure,
  isAdminBiometricEnabled,
  getMasterRecoveryKey,
  resetAdminSecurity,
} from '../lib/adminSecurity';

const AdminLockContext = createContext(null);

/** Access the admin lock engine. */
export function useAdminLock() {
  const ctx = useContext(AdminLockContext);
  if (!ctx) throw new Error('useAdminLock must be used inside <AdminLockProvider>');
  return ctx;
}

export function AdminLockProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');

  const resolverRef = useRef(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const complete = useCallback((granted) => {
    setVisible(false);
    setPin('');
    setRecoveryVisible(false);
    setRecoveryKey('');
    if (resolverRef.current) {
      resolverRef.current(granted);
      resolverRef.current = null;
    }
  }, []);

  const verifyPin = useCallback(
    async (code) => {
      if (!/^\d{6}$/.test(code)) return;
      setBusy(true);
      const ok = await verifyAdminPasscode(code);
      setBusy(false);
      if (ok) {
        complete(true);
      } else {
        setPin('');
        Alert.alert('Access Denied', 'Incorrect admin passcode. Please try again.');
      }
    },
    [complete],
  );

  const tryBiometric = useCallback(async () => {
    setBusy(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Admin Settings',
        fallbackLabel: 'Use passcode',
      });
      if (res.success) complete(true);
    } catch (e) {
      /* device cancelled / unsupported — stay locked */
    }
    setBusy(false);
  }, [complete]);

  /**
   * Request admin access. Resolves `true` only when the admin authenticates.
   * Returns immediately (true) if no admin security is configured yet.
   */
  const requestAdminAccess = useCallback(async () => {
    const secured = await isAdminSecure();
    if (!secured) return true;
    const bio = await isAdminBiometricEnabled();
    setBiometricEnabled(bio);
    setPin('');
    setVisible(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Auto-attempt biometrics when the lock opens and biometrics are enabled.
  useEffect(() => {
    if (visible && biometricEnabled) {
      const t = setTimeout(tryBiometric, 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, biometricEnabled]);

  // Auto-submit when 6 digits are entered on the keypad.
  useEffect(() => {
    if (pin.length === 6) verifyPin(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  /** Hidden: 5 rapid taps on the emblem opens the emergency recovery modal. */
  const onEmblemTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 800);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setRecoveryKey('');
      setRecoveryVisible(true);
    }
  };

  const submitRecovery = async () => {
    if (recoveryKey.trim() !== getMasterRecoveryKey()) {
      Alert.alert('Invalid Key', 'The master recovery key is incorrect.');
      return;
    }
    await resetAdminSecurity();
    Alert.alert(
      'Security Reset',
      'Admin passcode and biometric flags have been cleared. Configure a new passcode.',
    );
    setRecoveryVisible(false);
    complete(true);
  };

    return (
    <AdminLockContext.Provider value={{ requestAdminAccess }}>
      {children}

      {/* Admin Security Lock overlay */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => complete(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <TouchableOpacity onPress={onEmblemTap} activeOpacity={1}>
              <View style={styles.logoWrap}>
                <Image
                  resizeMode="contain"
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                />
              </View>
            </TouchableOpacity>

            <Text style={styles.title}>Admin Access Required</Text>
            <Text style={styles.subtitle}>
              Enter your 6-digit passcode to continue
            </Text>

            {/* Pin dots */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[styles.dot, i < pin.length && styles.dotFilled]}
                />
              ))}
            </View>

            {biometricEnabled && (
              <TouchableOpacity style={styles.bioBtn} onPress={tryBiometric} disabled={busy}>
                <Fingerprint size={26} color="#10B981" />
                <Text style={styles.bioBtnText}>Use Fingerprint / Face ID</Text>
              </TouchableOpacity>
            )}

            {/* Numeric keypad */}
            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.key}
                  onPress={() => !busy && setPin((p) => (p.length < 6 ? p + d : p))}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.key} />
              <TouchableOpacity
                style={styles.key}
                onPress={() => !busy && setPin((p) => (p.length < 6 ? p + '0' : p))}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.key}
                onPress={() => !busy && setPin((p) => p.slice(0, -1))}
              >
                <Delete size={24} color="#8EA89D" />
              </TouchableOpacity>
            </View>

            {busy && <ActivityIndicator color="#10B981" style={{ marginTop: 4 }} />}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => complete(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emergency Recovery modal (hidden trigger) */}
      <Modal
        visible={recoveryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRecoveryVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.recoveryCard}>
            <View style={styles.recoveryHeader}>
              <KeyRound size={20} color="#10B981" />
              <Text style={styles.recoveryTitle}>Emergency Recovery</Text>
            </View>
            <Text style={styles.recoverySub}>
              Enter the master security recovery key to reset the admin passcode
              and biometric access.
            </Text>
            <TextInput
              style={styles.recoveryInput}
              value={recoveryKey}
              onChangeText={setRecoveryKey}
              placeholder="Master recovery key"
              placeholderTextColor="#526E63"
              autoCapitalize="none"
              secureTextEntry
            />
            <TouchableOpacity style={styles.recoveryBtn} onPress={submitRecovery}>
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={styles.recoveryBtnText}>Reset Admin Security</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recoveryCancel}
              onPress={() => setRecoveryVisible(false)}
            >
              <Text style={styles.cancelText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminLockContext.Provider>
  );
}

export default AdminLockProvider;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,10,8,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0D1D18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    padding: 24,
    alignItems: 'center',
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#132620',
    borderWidth: 2,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  logo: { width: 56, height: 56 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#8EA89D', fontSize: 12, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3E5A4F',
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: '#10B981', borderColor: '#10B981' },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#132620',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bioBtnText: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 224, justifyContent: 'center' },
  key: {
    width: 68,
    height: 56,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#132620',
    borderWidth: 1,
    borderColor: '#1C4A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  cancelBtn: { marginTop: 16, padding: 8 },
  cancelText: { color: '#8EA89D', fontSize: 13, fontWeight: '600' },
  recoveryCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0D1D18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    padding: 24,
  },
  recoveryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recoveryTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  recoverySub: { color: '#8EA89D', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  recoveryInput: {
    backgroundColor: '#132620',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
  },
  recoveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 13,
  },
  recoveryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  recoveryCancel: { marginTop: 14, alignItems: 'center', padding: 6 },
});
