/**
 * AdminLoanDetailScreen — full detail view for a single loan record.
 *
 * Opened from AdminLoansScreen when an admin taps a loan card (any status:
 * pending, approved, rejected, disbursed, repaid). Receives the authoritative
 * loan row via route params: { loan: {...} }. Read-only by design — the
 * approve/reject/disburse actions stay on the list screen where the secure
 * backend RPCs are invoked.
 */
import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Landmark, CalendarClock, Wallet, TrendingDown, FileText } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

const STATUS_STYLES = {
  pending: { label: 'Pending Review', color: '#FBBF24', bg: '#6B4A00' },
  approved: { label: 'Approved', color: '#4ADE80', bg: '#0F4C38' },
  rejected: { label: 'Rejected', color: '#F87171', bg: '#4A1520' },
  disbursed: { label: 'Active (Disbursed)', color: '#60A5FA', bg: '#1E3A5F' },
  repaid: { label: 'Repaid', color: '#4ADE80', bg: '#14532D' },
};

const fmt = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = d =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export default function AdminLoanDetailScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const loan = route?.params?.loan || null;

  if (!loan) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <ScreenHeader title="Loan Detail" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTxt}>No loan record was provided for this view.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const outstanding = Math.max(
    0,
    Number(loan.total_repayable || 0) - Number(loan.amount_repaid || 0),
  );
  const badge = STATUS_STYLES[loan.status] || STATUS_STYLES.pending;
  const member = loan.profiles?.full_name || `Member ${String(loan.user_id).slice(0, 8)}…`;

  const rows = [
    { icon: Wallet, label: 'Principal', value: fmt(loan.principal) },
    { icon: TrendingDown, label: 'Total repayable', value: fmt(loan.total_repayable) },
    { icon: FileText, label: 'Amount repaid', value: fmt(loan.amount_repaid) },
    { icon: Wallet, label: 'Outstanding balance', value: fmt(outstanding), accent: colors.primary },
    { icon: CalendarClock, label: 'Tenure', value: `${loan.tenure_months || 0} month(s)` },
    { icon: CalendarClock, label: 'Requested', value: fmtDate(loan.requested_at) },
    { icon: CalendarClock, label: 'Decision date', value: fmtDate(loan.reviewed_at || loan.decided_at) },
    { icon: CalendarClock, label: 'Disbursed', value: fmtDate(loan.disbursed_at) },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="Loan Detail" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <Landmark size={18} color={colors.primary} />
            <Text style={styles.member} numberOfLines={1}>{member}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {rows.map(({ icon: Icon, label, value, accent }, i) => (
            <View key={`${label}-${i}`} style={[styles.row, i > 0 && styles.rowDivided]}>
              <View style={styles.rowLeft}>
                <Icon size={16} color={colors.textSecondary} />
                <Text style={styles.rowLabel}>{label}</Text>
              </View>
              <Text style={[styles.rowValue, accent ? { color: accent } : null]}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Purpose</Text>
          <Text style={styles.purpose}>{loan.purpose || 'No purpose statement provided.'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyTxt: { color: colors.textSecondary, textAlign: 'center' },
    hero: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
      gap: 10,
    },
    heroHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    member: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    rowLabel: { color: colors.textSecondary, fontSize: 13 },
    rowValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      paddingHorizontal: 14,
      paddingTop: 12,
    },
    purpose: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
  });
