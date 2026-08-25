/**
 * SignUpScreen — cooperative auth sign-up.
 *
 * Design (dark theme):
 *   - Top multi-step progress indicator.
 *   - Gold-accented emblem logo at the top.
 *   - Heading: "Create Your Account".
 *   - Inputs: Full Name, Email Address, Phone Number, Password, Confirm Password
 *     (dark translucent fields, thin subtle borders, light placeholders).
 *   - Footer: "Already have an account? Sign In" -> SignInScreen.
 *   - Continue button (green filled) -> registers via AuthContext -> MainDashboard.
 */
import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { AUTH_COLORS, AUTH_GRADIENTS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function SignUpScreen({ navigation }) {
  const { registerAccount } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fullName.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return false;
    }
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await registerAccount(email.trim(), password);
      if (!res.ok) {
        Alert.alert('Sign Up Failed', res.error || 'Could not create your account.');
        return;
      }
      navigation.replace('MainDashboard');
    } catch (e) {
      Alert.alert('Sign Up Failed', 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={AUTH_COLORS.background} barStyle="light-content" />
      <LinearGradient colors={AUTH_GRADIENTS.screen} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepSegment, styles.stepSegmentActive]} />
            <View style={[styles.stepSegment, { marginLeft: 8 }]} />
          </View>
          <Text style={styles.stepLabel}>Step 1 of 2 - Account Details</Text>

          <View style={styles.logoWrapper}>
            <Image resizeMode="contain" source={require('../../assets/logo.png')} style={styles.logo} />
          </View>

          <Text style={styles.heading}>Create Your Account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Temitope Adewale"
              placeholderTextColor={AUTH_COLORS.placeholder}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
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
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +234 801 234 5678"
              placeholderTextColor={AUTH_COLORS.placeholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
                {showPassword}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                placeholder="........."
                placeholderTextColor={AUTH_COLORS.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showConfirmPassword}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSignUp}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={AUTH_COLORS.textPrimary} />
            ) : (
              <Text style={styles.primaryBtnTxt}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignInScreen')}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AUTH_COLORS.background },
  gradient: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 24 },
  stepIndicator: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 6,
    marginBottom: 6,
  },
  stepSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: AUTH_COLORS.cardBorder,
  },
  stepSegmentActive: { backgroundColor: AUTH_COLORS.secondaryBorder },
  stepLabel: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
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
    marginBottom: 16,
  },
  logo: { width: 88, height: 88 },
  heading: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 22,
  },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    gap: 4,
  },
  footerTxt: { color: AUTH_COLORS.textSecondary, fontSize: 13 },
  link: { color: AUTH_COLORS.primary, fontSize: 13, fontWeight: '600' },
});
