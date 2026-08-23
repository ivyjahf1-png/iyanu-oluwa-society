import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen({ navigation }) {
  // Hidden admin trigger: 5 taps on the logo within 2.5 seconds.
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef(null);

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
    // Auto-reset after 2.5s of inactivity
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#091813' barStyle="light-content" />
      <LinearGradient colors={['#091813', '#1A3A24']} style={styles.gradient}>
        <View style={styles.content}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogoTap}
            style={styles.logoPlaceholder}
          >
            <Image
              resizeMode="contain"
              source={require('../../assets/logo.png')}
              style={styles.welcomeLogo}
            />
          </TouchableOpacity>

          <Text style={styles.tagline}>
            Your cooperative financial platform
          </Text>

          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.primaryBtnTxt}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.secondaryBtnTxt}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091813' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  logoPlaceholder: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeLogo: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  tagline: {
    color: '#A7F3D0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  btnGroup: { width: '100%', gap: 14 },
  primaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(167, 243, 208, 0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  secondaryBtnTxt: {
    color: '#A7F3D0',
    fontSize: 15,
    fontWeight: '600',
  },
});