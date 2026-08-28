import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PiggyBank, Plus, ArrowUpRight, ShieldCheck, Lock } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { GRADIENTS } from '../constants/theme';
import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

const fmt = n =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SavingsHubScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  // Total Accumulated Savings derives from the real transaction ledger
  // (contributions + deposits - withdrawals). Starts at ₦0.00.
  const { totalSavings } = useTransactions();

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Savings Hub</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Manage your target and cooperative plans</Text>

        <LinearGradient
          colors={GRADIENTS.metallicCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Accumulated Savings</Text>
            <Text style={[styles.heroAmount, { color: colors.text }]}>₦ {fmt(totalSavings)}</Text>
          </View>
          <TouchableOpacity style={[styles.heroBtn, { backgroundColor: colors.primary }]}>
            <Plus size={16} color={colors.background} />
            <Text style={[styles.heroBtnText, { color: colors.background }]}>New Goal</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Savings Plans</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.icon }]}>
              <PiggyBank size={20} color={colors.primary} />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={[styles.planTitle, { color: colors.text }]}>Weekly Cooperative Target</Text>
              <Text style={[styles.planSub, { color: colors.textSecondary }]}>Cycle 4 of 12 • ₦10,000 / week</Text>
            </View>
            <ArrowUpRight size={20} color={colors.textSecondary} />
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.icon }]}>
            <View style={[styles.progressBar, { backgroundColor: colors.primary, width: '33%' }]} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.icon }]}>
              <Lock size={20} color={colors.primary} />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={[styles.planTitle, { color: colors.text }]}>Fixed Emergency Reserve</Text>
              <Text style={[styles.planSub, { color: colors.textSecondary }]}>Locked until Dec 2026</Text>
            </View>
            <ShieldCheck size={20} color={colors.primary} />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 90 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 13, marginBottom: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  heroLabel: { fontSize: 12 },
  heroAmount: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  heroBtnText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextGroup: { flex: 1 },
  planTitle: { fontSize: 14, fontWeight: '600' },
  planSub: { fontSize: 11, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: { height: '100%' },
});

const styles = makeStyles(themes.darkEmerald, true);
