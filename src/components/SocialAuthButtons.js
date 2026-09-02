/**
 * SocialAuthButtons — Email / Facebook / Apple social sign-in row.
 *
 * Shared by SignInScreen and SignUpScreen. Styled with the co-op
 * green/dark theme: outlined pill buttons on the auth gradient, green
 * primary accents, theme-aware text colors.
 */
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Apple, Facebook, Mail } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function SocialAuthButtons({ navigation, onEmail }) {
  const { colors } = useTheme();
  const { signInWithOAuth } = useAuth();
  const [busy, setBusy] = React.useState(null); // null | 'facebook' | 'apple'
  const styles = makeStyles(colors);

  const runOAuth = async (provider) => {
    if (busy) return;
    setBusy(provider);
    const res = await signInWithOAuth(provider);
    setBusy(null);
    if (!res?.ok) {
      Alert.alert(`${provider === 'apple' ? 'Apple' : 'Facebook'} Sign-In`, res?.error || 'Could not start social sign-in.');
    }
    // On success the session propagates through AuthContext (onAuthStateChange),
    // and the navigator switches to the dashboard automatically.
  };

  const divider = () => (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerTxt}>or continue with</Text>
      <View style={styles.dividerLine} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      {divider()}

      {/* Email */}
      <TouchableOpacity
        style={styles.socialBtn}
        activeOpacity={0.8}
        onPress={() => (onEmail ? onEmail() : navigation?.navigate?.('SignInScreen'))}
      >
        <View style={styles.iconBadge}>
          <Mail size={18} color={colors.success} />
        </View>
        <Text style={styles.socialBtnTxt}>Continue with Email</Text>
      </TouchableOpacity>

      {/* Facebook */}
      <TouchableOpacity
        style={styles.socialBtn}
        activeOpacity={0.8}
        disabled={busy !== null}
        onPress={() => runOAuth('facebook')}
      >
        <View style={styles.iconBadge}>
          {busy === 'facebook' ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <Facebook size={18} color="#4267B2" />
          )}
        </View>
        <Text style={styles.socialBtnTxt}>Continue with Facebook</Text>
      </TouchableOpacity>

      {/* Apple */}
      <TouchableOpacity
        style={styles.socialBtn}
        activeOpacity={0.8}
        disabled={busy !== null}
        onPress={() => runOAuth('apple')}
      >
        <View style={styles.iconBadge}>
          {busy === 'apple' ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <Apple size={18} color={colors.text} />
          )}
        </View>
        <Text style={styles.socialBtnTxt}>Sign in with Apple</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
      marginTop: 18,
      gap: 10,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerTxt: {
      color: colors.textSecondary,
      fontSize: 11,
      marginHorizontal: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    iconBadge: {
      width: 30,
      alignItems: 'center',
      marginRight: 12,
    },
    socialBtnTxt: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
