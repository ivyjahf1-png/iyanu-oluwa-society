import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Landmark, ShieldAlert, HandCoins, SearchCheck } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchMyLoans, adminReviewLoan, adminDisburseLoan, isServerConfigured } from '../lib/ledger';
import { useTheme } from '../theme/ThemeContext';

/**
 * AdminLoansScreen — loan management for admins, using the EXISTING secure
 * backend RPCs only:
 *   • admin_review_loan  (approve / reject — server-side eligibility checks)
 *   • disburse_loan      (credits the wallet through post_ledger_entry)
 * No client-side financial calculation happens here: outstanding balance is
 * `total_repayable − amount_repaid`, both authoritative DB columns.
 */

const GROUPS = [
  { key: 'review', label: 'Review', statuses: ['pending'] },
  { key: 'approved', label: 'Approved', statuses: ['approved'] },
  { key: 'active', label: 'Active', statuses: ['disbursed'] },
  { key: 'repaid', label: 'Repaid', statuses: ['repaid'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

const fmt = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminLoansScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('review');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!isServerConfigured()) {
      setError('Backend not configured on this device.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await fetchMyLoans(); // RLS: admins read all loans
      setLoans(rows || []);
    } catch (e) {
      setError(e.message || 'Could not load loans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = GROUPS.find(g => g.key === group) || GROUPS[0];
  const grouped = loans.filter(l => active.statuses.includes(l.status));

  const review = (loan, approve) => {
    Alert.alert(
      approve ? 'Approve loan?' : 'Reject loan?',
      `${fmt(loan.principal)} over ${loan.tenure_months} month(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setBusyId(loan.id);
            try {
              await adminReviewLoan(loan.id, approve);
              await load();
            } catch (e) {
              Alert.alert('Not permitted', e.message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const disburse = (loan) => {
    Alert.alert(
      'Disburse loan?',
      `Credit ${fmt(loan.principal)} to the member's available balance now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disburse',
          onPress: async () => {
            setBusyId(loan.id);
            try {
              await adminDisburseLoan(loan.id);
              await load();
            } catch (e) {
              Alert.alert('Not permitted', e.message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Loan Management"
        subtitle="Review, approve, reject and disburse member loans"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.chipRow}>
        {GROUPS.map(g => (
          <TouchableOpacity
            key={g.key}
            style={[styles.chip, group === g.key && styles.chipActive]}
            onPress={() => setGroup(g.key)}
          >
            <Text style={[styles.chipText, group === g.key && styles.chipTextActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.hint}>Loading loans…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ShieldAlert size={34} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.center}>
          <Landmark size={34} color={colors.textSecondary} />
          <Text style={styles.hint}>No {active.label.toLowerCase()} loans right now.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        >
          {grouped.map(l => (
            <LoanCard
              key={l.id}
              loan={l}
              busy={busyId === l.id}
              colors={colors}
              styles={styles}
              onApprove={() => review(l, true)}
              onReject={() => review(l, false)}
              onDisburse={() => disburse(l)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** One loan card — figures come straight from the authoritative DB columns. */
function LoanCard({ loan: l, busy, colors, styles, onApprove, onReject, onDisburse }) {
  const outstanding = Math.max(
    0,
    Number(l.total_repayable || 0) - Number(l.amount_repaid || 0),
  );
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Landmark size={16} color={colors.primary} />
        <Text style={styles.member} numberOfLines={1}>
          {l.profiles?.full_name || `Member ${String(l.user_id).slice(0, 8)}…`}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Principal</Text>
          <Text style={styles.metricValue}>{fmt(l.principal)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total repayable</Text>
          <Text style={styles.metricValue}>{fmt(l.total_repayable)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Outstanding</Text>
          <Text style={[styles.metricValue, { color: colors.primary }]}>{fmt(outstanding)}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {l.tenure_months || 0} months • requested{' '}
        {l.requested_at
          ? new Date(l.requested_at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })
          : '—'}
        {l.purpose ? ` • ${l.purpose}` : ''}
      </Text>

      <View style={styles.actions}>
        {l.status === 'pending' ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              disabled={busy}
              onPress={onApprove}
            >
              <SearchCheck size={15} color={colors.background} />
              <Text style={[styles.actionText, { color: colors.background }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.danger, borderWidth: 1 }]}
              disabled={busy}
              onPress={onReject}
            >
              <Text style={[styles.actionText, { color: colors.danger }]}>Reject</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {l.status === 'approved' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            disabled={busy}
            onPress={onDisburse}
          >
            <HandCoins size={15} color={colors.background} />
            <Text style={[styles.actionText, { color: colors.background }]}>
              Disburse {fmt(l.principal)}
            </Text>
          </TouchableOpacity>
        ) : null}

        {l.status === 'disbursed' ? (
          <View style={styles.repayBox}>
            <Text style={styles.repayLabel}>Repayments received</Text>
            <Text style={styles.repayValue}>
              {fmt(l.amount_repaid)} of {fmt(l.total_repayable)}
            </Text>
          </View>
        ) : null}

        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  member: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 8,
  },
  metricLabel: { color: colors.textSecondary, fontSize: 10 },
  metricValue: { color: colors.text, fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  meta: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  repayBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 8 },
  repayLabel: { color: colors.textSecondary, fontSize: 10 },
  repayValue: { color: colors.text, fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  hint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryText: { color: colors.background, fontWeight: '700', fontSize: 13 },
});
