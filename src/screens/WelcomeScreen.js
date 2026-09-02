/**
 * WelcomeScreen — landing screen for unauthenticated users.
 *
 * Design (cooperative dark theme):
 *   - Central gold-accented emblem logo.
 *   - "Welcome to Standard Mutual Savings" title.
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
import { openExternalLink } from '../lib/webBrowser';
import { useAuth } from '../context/AuthContext';

const COOP_WEBSITE_URL = 'https://standardmutualsavings.com';

export default function WelcomeScreen({ navigation }) {
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef(null);
  const { completeWelcome } = useAuth();

  /** Proceed to the auth flow — marks onboarding as completed (persisted). */
  const goToAuth = (screen) => {
    completeWelcome().catch(() => {});
    navigation.navigate(screen);
  };

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
            {/* Transparent logo — no background box or border so it blends
                cleanly into the gradient screen background. */}
            <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap} style={styles.logoWrap}>
              <Image
                resizeMode="contain"
                source={require('../../assets/images/icon.png')}
                style={styles.welcomeLogo}
              />
            </TouchableOpacity>

            <Text style={styles.title}>Welcome to Standard Mutual Savings</Text>
            <Text style={styles.subtitle}>
              Your financial hub for savings, loans, and cooperative growth.
            </Text>

            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => goToAuth('SignUpScreen')}
              >
                <Text style={styles.primaryBtnTxt}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => goToAuth('SignInScreen')}
              >
                <Text style={styles.secondaryBtnTxt}>Sign In</Text>
              </TouchableOpacity>

              {/* Secondary web link — opens in branded in-app browser */}
              <TouchableOpacity
                style={styles.webLinkBtn}
                onPress={() => openExternalLink(COOP_WEBSITE_URL)}
              >
                <Text style={styles.webLinkTxt}>Visit Our Website</Text>
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
  // Transparent wrapper: no border, no fill — the PNG's own alpha blends
  // directly into the screen background. Keeps the secret admin tap gesture.
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  welcomeLogo: { width: 120, height: 120, resizeMode: 'contain' },
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
  webLinkBtn: { alignItems: 'center', paddingVertical: 10 },
  webLinkTxt: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
