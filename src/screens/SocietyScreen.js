import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Users, Shield, Award, ChevronRight, Lock } from 'lucide-react-native';
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
    sectionTitle: [styles.sectionTitle, { color: colors.text }],
    lockedCard: [
      styles.card,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        opacity: 0.72,
      },
    ],
    lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      alignSelf: 'flex-start',
      backgroundColor: colors.warning + '20',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 4,
    },
    lockBadgeText: {
      color: colors.warning,
      fontSize: 10,
      fontWeight: '700',
    },
  };

  /** Dividend is not yet available — show a "coming soon" notice. */
  const openDividend = () => {
    Alert.alert(
      'Dividend Distribution',
      'Dividend Distribution feature is coming soon.',
      [{ text: 'OK' }],
    );
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

        <Text style={s.sectionTitle}>Community Activities</Text>

        <TouchableOpacity
          style={s.card}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate?.('MonthlyGeneralMeeting', { date: '1st Sunday of next month' })}
        >
          <View style={s.row}>
            <View style={s.iconCircle}>
              <Users size={20} color={colors.text} />
            </View>
            <View style={s.textGroup}>
              <Text style={s.title}>Monthly General Meeting</Text>
              <Text style={s.sub}>Scheduled for 1st Sunday of next month</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.lockedCard}
          activeOpacity={0.8}
          onPress={openDividend}
        >
          <View style={s.row}>
            <View style={s.iconCircle}>
              <Award size={20} color={colors.text} />
            </View>
            <View style={s.textGroup}>
              <Text style={s.title}>Dividend Distribution</Text>
              <Text style={s.sub}>Annual financial ledger report</Text>
              <View style={s.lockBadge}>
                <Lock size={11} color={colors.warning} />
                <Text style={s.lockBadgeText}>LOCKED</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
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
  sectionTitle: { fontSize: 16, fontWeight: '600', marginVertical: 12 },
});

const styles = makeStyles(themes.darkEmerald, true);
