/**
 * WelcomeScreen — landing screen for unauthenticated users.
 *
 * Design (cooperative dark theme):
 *   - Central gold-accented emblem logo.
 *   - "Welcome to Iyanu Oluwa Society" title.
 *   - Subtitle: financial-hub tagline.
 *   - Sign Up (green filled) → SignUpScreen
 *   - Sign In  (outlined gold/emerald pill) → SignInScreen
 *   - Hidden 5-tap-on-logo gesture → AdminSettingsScreen
 */
import React, { useRef, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AUTH_COLORS, AUTH_GRADIENTS } from '../constants/theme';

export default function WelcomeScreen({ navigation }) {
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef(null);

  // Secret admin trigger: 5 rapid taps on the emblem within 2.5s.
  const handleLogoTap = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        if (tapTimer.current) clearTimeout(tapTimer.current);
        navigation.navigate('AdminSettings');
        return 0;
      }
      return next;
    });
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={AUTH_COLORS.background} barStyle="light-content" />
      <LinearGradient colors={AUTH_GRADIENTS.screen} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap} style={styles.logoRing}>
              <Image
                resizeMode="contain"
                source={require('../../assets/logo.png')}
                style={styles.welcomeLogo}
              />
            </TouchableOpacity>

            <Text style={styles.title}>Welcome to Iyanu Oluwa Society</Text>
            <Text style={styles.subtitle}>
              Your financial hub for savings, loans, and cooperative growth.
            </Text>

            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('SignUpScreen')}
              >
                <Text style={styles.primaryBtnTxt}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('SignInScreen')}
              >
                <Text style={styles.secondaryBtnTxt}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AUTH_COLORS.background },
  gradient: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  body: { width: '100%', alignItems: 'center' },
  logoRing: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 2,
    borderColor: AUTH_COLORS.secondaryBorder,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    marginBottom: 24,
  },
  welcomeLogo: { width: 128, height: 128 },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  btnGroup: { width: '100%', gap: 14 },
  primaryBtn: {
    backgroundColor: AUTH_COLORS.primary,
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnTxt: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: AUTH_COLORS.secondaryFill,
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.secondaryBorder,
  },
  secondaryBtnTxt: {
    color: AUTH_COLORS.secondaryBorder,
    fontSize: 15,
    fontWeight: '600',
  },
});
