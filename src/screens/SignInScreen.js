import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Eye, EyeOff, Fingerprint } from 'lucide-react-native'
import { useAuth } from '../context/AuthContext'

export default function SignInScreen({ navigation }) {
  const { loginWithPassword, loginWithBiometric, methods } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const bioReady = methods.biometric && methods.biometricAvailable;

  const handleBiometricSignIn = async () => {
    const ok = await loginWithBiometric();
    if (ok) navigation.replace('MainTabs');
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

  const handleSignIn = async () => {
    if (!validate()) return;
    setSubmitting(true);
    // Verifies against the hashed credentials created at sign-up.
    // A wrong password surfaces as "Wrong password".
    const res = await loginWithPassword(email, password);
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('Sign In Failed', res.error || 'Could not sign you in.');
      return;
    }
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
      <LinearGradient colors={['#0B2211', '#1A3A24']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Sign In</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#6B7280"
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
                placeholderTextColor="#6B7280"
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

          {bioReady && (
            <TouchableOpacity style={styles.bioBtn} onPress={handleBiometricSignIn}>
              <Fingerprint size={20} color="#4CAF50" />
              <Text style={styles.bioBtnText}>Sign in with Biometrics</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnTxt}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.link}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B2211' },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C4A2E',
  },
  backBtn: { padding: 6, marginRight: 8 },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  form: { paddingHorizontal: 24, gap: 20, marginTop: 28, paddingBottom: 24 },
  inputGroup: { gap: 6 },
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
    backgroundColor: '#1C4A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
  },
  eyeBtn: { paddingHorizontal: 12 },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 12,
  },
  bioBtnText: { color: '#4CAF50', fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  footerTxt: { color: '#A7F3D0', fontSize: 13 },
  link: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
});