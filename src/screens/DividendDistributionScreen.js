import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import {
  Award,
  CalendarClock,
  Wallet,
  TrendingUp,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

// ---------------------------------------------------------------------------
// Dividend Distribution — detail page.
// Presentational only: annual ledger report, payout calculation, dates and
// breakdown statement. Params: { reportId?: string, year?: string }.
// ---------------------------------------------------------------------------
export default function DividendDistributionScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const params = route?.params ?? {};
  const year = params.year || '2026';

  const breakdown = [
    { label: 'Total Contributions (year)', value: '₦240,000' },
    { label: 'Cooperative Surplus', value: '₦86,000' },
    { label: 'Operating Reserve (20%)', value: '−₦17,200' },
    { label: 'Distributable Pool', value: '₦68,800' },
    { label: 'Your Share (5.4 units)', value: '₦12,412' },
  ];

  const history = [
    { title: '2025 Dividend Payout', amount: '₦10,850', date: 'Paid 15 Jan 2026' },
    { title: '2024 Dividend Payout', amount: '₦9,300', date: 'Paid 12 Jan 2025' },
  ];

  // Theme-aware style overrides so every surface follows the active theme.
  const s = {
    card: [styles.card, { backgroundColor: colors.card, borderColor: colors.border }],
    sectionTitle: [styles.sectionTitle, { color: colors.text }],
    label: [styles.label, { color: colors.textSecondary }],
    heroValue: [styles.heroValue, { color: colors.text }],
    heroBadge: [styles.heroBadge, { backgroundColor: colors.surface }],
    heroBadgeText: [styles.heroBadgeText, { color: colors.primary }],
    breakdownLabel: [styles.breakdownLabel, { color: colors.textSecondary }],
    breakdownValue: [styles.breakdownValue, { color: colors.text }],
    totalRow: [styles.totalRow, { borderTopColor: colors.border }],
    totalLabel: [styles.totalLabel, { color: colors.text }],
    totalValue: [styles.totalValue, { color: colors.primary }],
    payoutDate: [styles.payoutDate, { backgroundColor: colors.surface }],
    payoutDateText: [styles.payoutDateText, { color: colors.text }],
    rowTitle: [styles.rowTitle, { color: colors.text }],
    rowSub: [styles.rowSub, { color: colors.textSecondary }],
    rowAmount: [styles.rowAmount, { color: colors.success }],
    iconCircle: [styles.iconCircle, { backgroundColor: colors.surface }],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Dividend Distribution"
        subtitle={`Annual financial ledger report • ${year}`}
        onBack={() => navigation?.goBack?.()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero payout card */}
        <View style={s.card}>
          <Text style={s.label}>Projected Dividend Payout • {year}</Text>
          <Text style={s.heroValue}>₦12,412</Text>
          <View style={s.heroBadge}>
            <TrendingUp size={13} color={colors.primary} />
            <Text style={s.heroBadgeText}>+14.3% vs last year</Text>
          </View>
        </View>

        {/* Payout calculation breakdown */}
        <Text style={s.sectionTitle}>Payout Calculation</Text>
        <View style={s.card}>
          {breakdown.map((row) => (
            <View key={row.label} style={styles.breakdownRow}>
              <Text style={s.breakdownLabel}>{row.label}</Text>
              <Text style={s.breakdownValue}>{row.value}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, s.totalRow]}>
            <Text style={s.totalLabel}>Your Payout</Text>
            <Text style={s.totalValue}>₦12,412</Text>
          </View>
        </View>

        {/* Payout date */}
        <Text style={s.sectionTitle}>Payout Date</Text>
        <View style={[s.card, styles.payoutCard]}>
          <View style={s.payoutDate}>
            <CalendarClock size={15} color={colors.primary} />
            <Text style={s.payoutDateText}>20 January {year}</Text>
          </View>
          <Text style={s.breakdownLabel}>
            Paid directly to your wallet — no action required.
          </Text>
        </View>

        {/* Breakdown statement history */}
        <Text style={s.sectionTitle}>Past Distributions</Text>
        {history.map((h) => (
          <TouchableOpacity key={h.title} style={s.card} activeOpacity={0.8}>
            <View style={s.iconCircle}>
              <Wallet size={18} color={colors.primary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={s.rowTitle}>{h.title}</Text>
              <Text style={s.rowSub}>{h.date}</Text>
            </View>
            <Text style={s.rowAmount}>{h.amount}</Text>
          </TouchableOpacity>
        ))}

        {/* Full ledger report */}
        <TouchableOpacity style={s.card} activeOpacity={0.8}>
          <View style={s.iconCircle}>
            <FileText size={18} color={colors.primary} />
          </View>
          <View style={styles.textGroup}>
            <Text style={s.rowTitle}>Annual Financial Ledger Report</Text>
            <Text style={s.rowSub}>Full audited breakdown statement (PDF)</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Layout skeleton; all colors are applied dynamically in the component body.
const makeStyles = () => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  label: { fontSize: 12 },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 6 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '600' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  breakdownLabel: { fontSize: 12.5 },
  breakdownValue: { fontSize: 12.5, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 13.5, fontWeight: '700' },
  totalValue: { fontSize: 15, fontWeight: '800' },
  payoutCard: { gap: 10 },
  payoutDate: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  payoutDateText: { fontSize: 13, fontWeight: '700' },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  rowTitle: { fontSize: 13.5, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 13, fontWeight: '700' },
});

const styles = makeStyles(themes.darkEmerald, true);
