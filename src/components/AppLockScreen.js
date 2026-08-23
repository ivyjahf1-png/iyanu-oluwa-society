import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint, Lock, Delete } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

/**
 * AppLockScreen — reusable unlock gate.
 * Priority: Biometric prompt → Passcode input → full Sign-In fallback.
 */
export default function AppLockScreen() {
  const { methods, loginWithPasscode, loginWithBiometric } = useAuth();

  const [mode, setMode] = useState('biometric');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const passcodeAvailable = methods.passcode && methods.passcodeLockEnabled;

  // Decide the starting mode once on mount and auto-fire biometrics.
  // Password fallback is ONLY shown when biometric AND passcode are both
  // unavailable — a failed/cancelled biometric always falls back to passcode.
  useEffect(() => {
    if (methods.biometric && methods.biometricAvailable) {
      setMode('biometric');
      (async () => {
        const ok = await loginWithBiometric();
        if (!ok) setMode(passcodeAvailable ? 'passcode' : 'password');
      })();
    } else if (passcodeAvailable) {
      setMode('passcode');
    } else if (methods.biometric) {
      // Biometric flag on but hardware/enrollment unavailable → passcode or password.
      setMode(passcodeAvailable ? 'passcode' : 'password');
    } else {
      setMode('password');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasscodeDigit = (d) => {
    setError('');
    // Passcode is exactly 4 digits — extra presses are ignored.
    const next = (passcode + d).slice(0, 4);
    setPasscode(next);
    if (next.length === 4) {
      submitPasscode(next);
    }
  };

  const submitPasscode = async (code) => {
    setChecking(true);
    const ok = await loginWithPasscode(code);
    setChecking(false);
    if (!ok) {
      setError('Incorrect passcode. Try again.');
      setPasscode('');
    }
  };

  const tryBiometric = async () => {
    setError('');
    const ok = await loginWithBiometric();
    if (!ok) setMode(passcodeAvailable ? 'passcode' : 'password');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#091813' barStyle="light-content" />
      <LinearGradient colors={['#091813', '#1A3A24']} style={styles.gradient}>
        <View style={styles.body}>
          <View style={styles.logoRow}>
            <Lock size={22} color="#10B981" />
            <Text style={styles.logoText}>Iyanu Oluwa Society</Text>
          </View>

          {mode === 'biometric' && (
            <>
              <TouchableOpacity style={styles.bioBtn} onPress={tryBiometric} activeOpacity={0.8}>
                <Fingerprint size={64} color="#10B981" />
              </TouchableOpacity>
              <Text style={styles.title}>Unlock with Biometrics</Text>
              <Text style={styles.subtitle}>Use fingerprint or Face ID to continue</Text>
              <TouchableOpacity onPress={() => setMode(passcodeAvailable ? 'passcode' : 'password')}>
                <Text style={styles.link}>
                  Use {passcodeAvailable ? 'passcode' : 'password'} instead
                </Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'passcode' && (
            <>
              <Text style={styles.title}>Enter Passcode</Text>
              <Text style={styles.subtitle}>Passcode must be 4 numbers</Text>
              <View style={styles.dots}>
                {Array.from({ length: passcode.length }).map((_, i) => (
                  <View key={i} style={styles.dotFilled} />
                ))}
                {Array.from({ length: 4 - passcode.length }).map((_, i) => (
                  <View key={`e${i}`} style={styles.dotEmpty} />
                ))}
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <TouchableOpacity key={d} style={styles.key} onPress={() => handlePasscodeDigit(d)}>
                    <Text style={styles.keyText}>{d}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.key} />
                <TouchableOpacity style={styles.key} onPress={() => handlePasscodeDigit('0')}>
                  <Text style={styles.keyText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.key} onPress={() => setPasscode(passcode.slice(0, -1))}>
                  <Delete size={22} color="#A7F3D0" />
                </TouchableOpacity>
              </View>
              {checking && <ActivityIndicator color="#10B981" style={{ marginTop: 10 }} />}
              <TouchableOpacity onPress={() => setMode('password')}>
                <Text style={styles.link}>Use password instead</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'password' && <PasswordFallback />}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

/** Full email + password fallback — last resort when biometric/passcode fail. */
function PasswordFallback() {
  const { loginWithPassword, userEmail, logout } = useAuth();
  const [email, setEmail] = useState(userEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const res = await loginWithPassword(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error || 'Sign in failed');
  };

  const goSignUp = () => {
    // The lock screen sits outside the navigator; signing out of this session
    // returns to the app entry flow where "Create Account" is available.
    Alert.alert('Sign Up', 'Sign out of the current session to create a new account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.passwordCard}>
      <Text style={styles.title}>Sign In Required</Text>
      <Text style={styles.subtitle}>Biometric and passcode are unavailable</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#526E63"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#526E63"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.signInBtn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={goSignUp} hitSlop={{ top: 10, bottom: 10 }}>
        <Text style={styles.signUpLink}>Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091813' },
  gradient: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  logoText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  bioBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#172F27',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: '#A7F3D0', fontSize: 13, marginTop: 6, marginBottom: 16 },
  link: { color: '#10B981', fontSize: 13, fontWeight: '600', marginTop: 18 },
  dots: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  dotFilled: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981' },
  dotEmpty: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#172F27' },
  error: { color: '#F87171', fontSize: 12, marginTop: 6 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 260,
    marginTop: 8,
  },
  key: {
    width: 76,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#172F27',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  keyText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  passwordCard: { width: '100%' },
  input: {
    backgroundColor: '#172F27',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginTop: 10,
  },
  signInBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  signInText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  signUpLink: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 12,
  },
});