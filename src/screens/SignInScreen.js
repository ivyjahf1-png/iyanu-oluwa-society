import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Eye, EyeOff, Fingerprint, Delete } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export default function SignInScreen({ navigation, route }) {
  const { loginWithPassword, loginWithBiometric, loginWithPasscode, methods } = useAuth();
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const [biometricRunning, setBiometricRunning] = useState(false);

  const bioAvailable = methods.biometric && methods.biometricAvailable;
  const passcodeSet = methods.passcode;

  // Auto-trigger biometrics when arriving with the option enabled.
  useEffect(() => {
    const shouldAuto = route.params?.autoTriggerBiometrics === true;
    if (shouldAuto && bioAvailable) {
      handleBiometricSignIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authenticate = () => {
    navigation.replace('MainDashboard');
  };

  const handleBiometricSignIn = async () => {
    setBiometricRunning(true);
    const ok = await loginWithBiometric();
    setBiometricRunning(false);
    if (ok) authenticate();
  };

  const handlePasscodeDigit = (d) => {
    setPinError('');
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submitPin(next);
  };

  const removePinDigit = () => {
    setPinError('');
    setPin((p) => p.slice(0, -1));
  };

  const submitPin = async (code) => {
    setCheckingPin(true);
    const ok = await loginWithPasscode(code);
    setCheckingPin(false);
    if (ok) {
      authenticate();
      return;
    }
    setPinError(
      passcodeSet ? 'Incorrect passcode. Try again.' : 'No passcode set. Use email & password.'
    );
    setPin('');
  };

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handlePasswordSignIn = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const res = await loginWithPassword(email, password);
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('Sign In Failed', res.error || 'Could not sign you in.');
      return;
    }
    authenticate();
  };

  const forgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'If a password reset email flow is configured on your hosted build it will be sent here. For demo builds, sign up again with a fresh password after clearing your session.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#091713" barStyle="light-content" />
      <LinearGradient colors={['#091813', '#1A3A24']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Sign In</Text>
          </View>

          <Image
            resizeMode="contain"
            source={require('../../assets/logo.png')}
            style={styles.brandLogo}
          />
          <Text style={styles.brandTitle}>Sign in to Iyanu Oluwa Society</Text>

          {bioAvailable && (
            <TouchableOpacity
              style={styles.bioBtn}
              onPress={handleBiometricSignIn}
              disabled={biometricRunning}
            >
              <Fingerprint size={22} color="#10B981" />
              <Text style={styles.bioBtnText}>
                {biometricRunning ? 'Authenticating…' : 'Sign in with Fingerprint / Face ID'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segment, mode === 'password' && styles.segmentActive]}
              onPress={() => setMode('password')}
            >
              <Text style={[styles.segmentText, mode === 'password' && styles.segmentTextActive]}>
                Email / Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, mode === 'passcode' && styles.segmentActive]}
              onPress={() => setMode('passcode')}
            >
              <Text style={[styles.segmentText, mode === 'passcode' && styles.segmentTextActive]}>
                Passcode
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'password' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email / Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#4B6358"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#4B6358"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#A7F3D0" />
                    ) : (
                      <Eye size={18} color="#A7F3D0" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
                onPress={handlePasswordSignIn}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnTxt}>Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          )}
{mode === 'passcode' && (
            <>
              <Text style={styles.pinCaption}>Enter your 4-digit passcode</Text>
              <View style={styles.dots}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[styles.dot, i < pin.length ? styles.dotFilled : styles.dotEmpty]}
                  />
                ))}
              </View>
              {!!pinError && <Text style={styles.pinErrorText}>{pinError}</Text>}

              <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={styles.key}
                    onPress={() => handlePasscodeDigit(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyText}>{d}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.key} onPress={removePinDigit} activeOpacity={0.7}>
                  <Delete size={24} color="#A7F3D0" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handlePasscodeDigit('0')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyText}>0</Text>
                </TouchableOpacity>
              </View>
              {checkingPin && <ActivityIndicator color="#10B981" style={styles.pinLoader} />}
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={forgotPassword} hitSlop={{ top: 10, bottom: 10 }}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerTxt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
              <Text style={styles.link}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091813' },
  gradient: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#172F27',
    marginBottom: 16,
  },
  backBtn: { padding: 6, marginRight: 8 },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandLogo: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    marginBottom: 4,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 26,
    paddingVertical: 13,
    marginBottom: 16,
  },
  bioBtnText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#0E201A',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#1C4A32' },
  segmentText: { color: '#8EA89D', fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF' },
  inputGroup: { gap: 6, marginBottom: 16 },
  label: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172F27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E3A30',
  },
  eyeBtn: { paddingHorizontal: 12 },
  primaryBtn: {
    backgroundColor: '#0D5C46',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pinCaption: {
    color: '#9BB8AC',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotFilled: { backgroundColor: '#10B981' },
  dotEmpty: { backgroundColor: '#172F27', borderWidth: 1, borderColor: '#1E3A30' },
  pinErrorText: { color: '#F87171', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 260,
    alignSelf: 'center',
    marginTop: 4,
  },
  key: {
    width: 74,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#172F27',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  keyText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  pinLoader: { marginTop: 10 },
  footer: { alignItems: 'center', marginTop: 20 },
  forgot: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    gap: 4,
  },
  footerTxt: { color: '#A7F3D0', fontSize: 13 },
  link: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
});