import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Shield } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

export default function SocietyScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  // Dynamic styles so every surface follows the active theme.
  const s = {
    scrollContent: styles.scrollContent,
    headerTitle: [styles.headerTitle, { color: colors.text }],
    headerSub: [styles.headerSub, { color: colors.textSecondary }],
    card: [
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
    ],
    row: styles.row,
    iconCircle: [styles.iconCircle, { backgroundColor: colors.surface }],
    textGroup: styles.textGroup,
    title: [styles.title, { color: colors.text }],
    sub: [styles.sub, { color: colors.textSecondary }],
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.headerTitle}>Society Hub</Text>
        <Text style={s.headerSub}>Standard Mutual Cooperative Community</Text>

        <View style={s.card}>
          <View style={s.row}>
            <View style={s.iconCircle}>
              <Shield size={22} color={colors.primary} />
            </View>
            <View style={s.textGroup}>
              <Text style={s.title}>Membership Status</Text>
              <Text style={s.sub}>Verified Member • ID: #IOS-8842</Text>
            </View>
          </View>
        </View>

        {/* Monthly General Meeting and Dividend Distribution have been
            relocated to the Admin Dashboard (Community Management section). */}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Static layout-only styles; all colors are applied dynamically above.
const makeStyles = (colors, isDark) => StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 90 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 13, marginBottom: 16 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 2 },
});

const styles = makeStyles(themes.darkEmerald, true);
