import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
      <LinearGradient colors={['#0B2211', '#1A3A24']} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoTxt}>Iyanu</Text>
            <Text style={styles.logoTxt2}>Oluwa</Text>
            <Text style={styles.logoSociety}>Society</Text>
          </View>

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
  container: { flex: 1, backgroundColor: '#0B2211' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  logoPlaceholder: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoTxt: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoTxt2: {
    fontSize: 38,
    fontWeight: '800',
    color: '#4CAF50',
    letterSpacing: 1,
    marginTop: -6,
  },
  logoSociety: {
    fontSize: 16,
    color: '#A7F3D0',
    letterSpacing: 3,
    fontWeight: '600',
  },
  tagline: {
    color: '#A7F3D0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  btnGroup: { width: '100%', gap: 14 },
  primaryBtn: {
    backgroundColor: '#4CAF50',
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
    borderColor: '#4CAF50',
  },
  secondaryBtnTxt: {
    color: '#A7F3D0',
    fontSize: 15,
    fontWeight: '600',
  },
});