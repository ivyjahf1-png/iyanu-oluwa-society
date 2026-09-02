/**
 * SignInScreen � cooperative auth sign-in.
 *
 * Design (dark theme):
 *   - Centered gold-accented emblem logo.
 *   - Heading: "Sign In".
 *   - Email / Phone text input.
 *   - 4-digit passcode: dot indicator that fills dynamically + a custom 0-9 numeric keypad.
 *   - Biometric (Fingerprint / FaceID) action row via expo-local-authentication.
 *     Reads `autoTriggerBiometrics` from route params to auto-launch on entry.
 *   - "Log In" (green filled) -> verifies credentials -> MainDashboard.
 *   - Bottom link: "Forgot Password?".
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint, Delete, ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AUTH_COLORS, AUTH_GRADIENTS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function SignInScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { loginWithPassword, loginWithPasscode, methods } = useAuth();
  const [mode, setMode] = useState('password'); // 'password' | 'passcode'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const [bioRunning, setBioRunning] = useState(false);

  const bioAvailable = methods.biometric && methods.biometricAvailable;
  const passcodeSet = methods.passcode;

  // Auto-trigger biometrics when entering with the option enabled.
  useEffect(() => {
    const shouldAuto = route.params?.autoTriggerBiometrics === true;
    if (shouldAuto && bioAvailable) {
      handleBiometricAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authenticate = () => navigation.replace('MainDashboard');

  const handleBiometricAuth = async () => {
    setBioRunning(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          'No fingerprint or Face ID is enrolled on this device. Set one up in system settings first.'
        );
        setBioRunning(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Standard Mutual Savings',
        fallbackTitle: 'Use passcode',
      });
      if (result.success) {
        // Align session state with the auth context, then proceed.
        const ok = await loginWithBiometric();
        if (ok || result.success) authenticate();
      } else {
        Alert.alert('Authentication Failed', 'Biometric verification was not successful.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not complete biometric authentication.');
    } finally {
      setBioRunning(false);
    }
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
    if (!passcodeSet) {
      setPinError('No passcode set. Sign in with email & password.');
      setPin('');
      return;
    }
    setCheckingPin(true);
    try {
      const ok = await loginWithPasscode(code);
      if (ok) authenticate();
      else {
        setPinError('Incorrect passcode. Try again.');
        setPin('');
      }
    } catch (e) {
      setPinError('Could not verify passcode.');
      setPin('');
    } finally {
      setCheckingPin(false);
    }
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
    try {
      const res = await loginWithPassword(email.trim(), password);
      if (!res.ok) {
        Alert.alert('Sign In Failed', res.error || 'Could not sign you in.');
        return;
      }
      authenticate();
    } catch (e) {
      Alert.alert('Sign In Failed', 'Could not sign you in.');
    } finally {
      setSubmitting(false);
    }
  };

  const forgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'If a password reset flow is configured it will be sent to your registered email. For demo builds, sign up again with a fresh password after clearing your session.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={AUTH_COLORS.background} barStyle="light-content" />
      <LinearGradient colors={AUTH_GRADIENTS.screen} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Sign In</Text>
          </View>

          <View style={styles.logoWrapper}>
            <Image resizeMode="contain" source={require('../../assets/images/icon.png')} style={styles.logo} />
          </View>

          <Text style={styles.brandTitle}>Sign in to Standard Mutual Savings</Text>

          {/* Biometric action row */}
          {bioAvailable && (
            <TouchableOpacity
              style={[styles.bioBtn, bioRunning && { opacity: 0.7 }]}
              onPress={handleBiometricAuth}
              disabled={bioRunning}
            >
              <Fingerprint size={22} color={colors.success} />
              <Text style={styles.bioBtnText}>
                {bioRunning ? 'Authenticating...' : 'Sign in with Fingerprint / Face ID'}
              </Text>
            </TouchableOpacity>
          )}

          {!bioAvailable && (
            <View style={styles.bioUnavailable}>
                            <Fingerprint size={18} color={AUTH_COLORS.textSecondary} />
              <Text style={styles.bioUnavailableText}>
                Or continue with Biometric Authentication (Fingerprint / FaceID)
              </Text>
            </View>
          )}

          {/* Mode toggle */}
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
                  placeholderTextColor={AUTH_COLORS.placeholder}
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
                    style={styles.inputFlex}
                    placeholder="........."
                    placeholderTextColor={AUTH_COLORS.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={AUTH_COLORS.textSecondary} />
                    ) : (
                      <Eye size={20} color={AUTH_COLORS.textSecondary} />
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
                  <ActivityIndicator color={AUTH_COLORS.textPrimary} />
                ) : (
                  <Text style={styles.primaryBtnTxt}>Log In</Text>
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
                <TouchableOpacity
                  style={styles.key}
                  onPress={removePinDigit}
                  activeOpacity={0.7}
                >
                  <Delete size={24} color={AUTH_COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.key}
                  onPress={() => handlePasscodeDigit('0')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyText}>0</Text>
                </TouchableOpacity>
              </View>

              {checkingPin && <ActivityIndicator color={colors.success} style={styles.pinLoader} />}

              <TouchableOpacity
                style={[styles.primaryBtn, pin.length < 4 && { opacity: 0.5 }]}
                onPress={() => (pin.length === 4 ? submitPin(pin) : null)}
                disabled={pin.length < 4 || checkingPin}
              >
                {checkingPin ? (
                  <ActivityIndicator color={AUTH_COLORS.textPrimary} />
                ) : (
                  <Text style={styles.primaryBtnTxt}>Verify Passcode</Text>
                )}
              </TouchableOpacity>
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

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: AUTH_COLORS.background },
  gradient: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: { padding: 6, marginRight: 8 },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 104,
    height: 104,
    alignSelf: 'center',
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.secondaryBorder,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    marginBottom: 8,
  },
  logo: { width: 80, height: 80 },
  brandTitle: {
    color: AUTH_COLORS.textPrimary,
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
    backgroundColor: 'rgba(16, 185, 135, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 26,
    paddingVertical: 13,
    marginBottom: 16,
  },
  bioBtnText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  bioUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  bioUnavailableText: { color: AUTH_COLORS.textSecondary, fontSize: 12 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#0E201A',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 22, alignItems: 'center' },
  segmentActive: { backgroundColor: '#1C4A32' },
  segmentText: { color: '#8EA89D', fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF' },
  inputGroup: { gap: 6, marginBottom: 18 },
  label: { color: AUTH_COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: AUTH_COLORS.inputBg,
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    placeholderTextColor: AUTH_COLORS.placeholder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AUTH_COLORS.inputBorder,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: AUTH_COLORS.inputBg,
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    placeholderTextColor: AUTH_COLORS.placeholder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AUTH_COLORS.inputBorder,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtn: {
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnTxt: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  pinCaption: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotFilled: { backgroundColor: '#10B981' },
  dotEmpty: { backgroundColor: AUTH_COLORS.inputBg, borderWidth: 1, borderColor: AUTH_COLORS.inputBorder },
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
    backgroundColor: AUTH_COLORS.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  keyText: { color: AUTH_COLORS.textPrimary, fontSize: 22, fontWeight: '600' },
  pinLoader: { marginTop: 10 },
  footer: { alignItems: 'center', marginTop: 20 },
  forgot: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    gap: 4,
  },
  footerTxt: { color: AUTH_COLORS.textSecondary, fontSize: 13 },
  link: { color: '#10B981', fontSize: 13, fontWeight: '600' },
});

const styles = makeStyles(themes.darkEmerald, true);

