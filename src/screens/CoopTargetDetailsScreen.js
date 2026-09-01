import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import {
  ChevronLeft,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  History,
  TrendingUp,
  Lock,
  Settings,
} from 'lucide-react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { useSavingsPlans, FREQUENCY_META } from '../context/SavingsPlansContext';
import { isAdminAccount } from '../lib/adminSecurity';
import { useAuth } from '../context/AuthContext';

const fmt = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * CoopTargetDetails — full detail + schedule view for a cooperative target.
 *
 * Route params (registered in AppNavigator):
 *   planId: string
 *   planType: 'weekly' | 'monthly' | 'annual'
 *   title: string
 *   targetAmount: number
 *   currentProgress: number
 *   cycleInfo: string
 *
 * Falls back to the full plan record from the savings store when available,
 * otherwise renders from the route params passed by the Savings Hub cards.
 */
export default function CoopTargetDetailsScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { plans } = useSavingsPlans();
  const { userEmail } = useAuth();

  const params = route?.params || {};
  const planId = params.planId;

  // Prefer the live plan record (has full cycle/payment data).
  const storePlan = planId ? plans.find(p => p.id === planId || p.planId === planId) : null;

  const plan = storePlan || {
    title: params.title || 'Cooperative Target',
    frequency: params.planType || 'monthly',
    targetAmount: Number(params.targetAmount) || 0,
    currentProgress: Number(params.currentProgress) || 0,
    contributionPerCycle: 0,
    totalCycles: (params.cycleInfo || '').match(/of (\d+)/)?.[1]
      ? Number((params.cycleInfo || '').match(/of (\d+)/)[1])
      : 12,
    currentCycle: (params.cycleInfo || '').match(/Cycle (\d+)/)?.[1]
      ? Number((params.cycleInfo || '').match(/Cycle (\d+)/)[1])
      : 0,
    nextDeduction: '1st of next month • 9:00 AM',
    autoDebit: true,
    locked: false,
    lockUntil: '',
  };

  const meta = FREQUENCY_META[plan.frequency] || FREQUENCY_META.monthly;
  const pct = Math.min(100, plan.targetAmount ? (plan.currentProgress / plan.targetAmount) * 100 : 0);
  const pctRounded = Math.round(pct);
  const outstanding = Math.max(0, (plan.targetAmount || 0) - (plan.currentProgress || 0));
  const remainingCycles = Math.max(0, (plan.totalCycles || 0) - (plan.currentCycle || 0));
  const isAdmin = isAdminAccount(userEmail);

  // Sample payment-schedule history derived from the plan's cycle data.
  const schedule = Array.from({ length: Math.min((plan.totalCycles || 0), 6) }, (_, i) => {
    const cycleNum = i + 1;
    const paid = cycleNum <= (plan.currentCycle || 0);
    return {
      cycle: cycleNum,
      label: `${meta.label} ${cycleNum}`,
      amount: plan.contributionPerCycle || 0,
      paid,
    };
  });
return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Target Details</Text>
            <Text style={styles.headerSub}>{plan.title}</Text>
          </View>
        </View>

        {/* Frequency badge */}
        <View style={[styles.badgeRow, { paddingHorizontal: 20, marginTop: 4 }]}>
          <View style={[styles.freqBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.freqBadgeText, { color: colors.background }]}>{meta.badge}</Text>
          </View>
          {plan.locked ? (
            <View style={[styles.lockBadge, { borderColor: colors.warning }]}>
              <Lock size={11} color={colors.warning} />
              <Text style={[styles.lockBadgeText, { color: colors.warning }]}>LOCKED</Text>
            </View>
          ) : null}
        </View>

        {/* Savings breakdown */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
          <Text style={styles.cardLabel}>Savings Breakdown</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{fmt(plan.currentProgress)}</Text>
            <Text style={styles.amountTarget}>of {fmt(plan.targetAmount)}</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <View style={[styles.progressBar, { backgroundColor: colors.primary, width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{pctRounded}% completed</Text>

          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Contributed</Text>
            <Text style={styles.metricValue}>{fmt(plan.currentProgress)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Outstanding</Text>
            <Text style={styles.metricValue}>{fmt(outstanding)}</Text>
          </View>
        </View>

        {/* Cycle tracker */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <TrendingUp size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Cycle Tracker</Text>
          </View>
          <Text style={[styles.cycleInfo, { color: colors.text }]}>
            Cycle {plan.currentCycle} of {plan.totalCycles}
          </Text>
          <Text style={[styles.cycleSub, { color: colors.textSecondary }]}>
            {remainingCycles} {remainingCycles === 1 ? 'cycle' : 'cycles'} remaining · {fmt(plan.contributionPerCycle)}{plan.totalCycles === 12 ? '/ month' : meta.cycle} contribution
          </Text>

          {plan.totalCycles > 0 ? (
            <View style={styles.cycleDots}>
              {Array.from({ length: Math.min(plan.totalCycles, 12) }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.cycleDot,
                    {
                      backgroundColor: i < (plan.currentCycle || 0) ? colors.primary : colors.surface,
                      borderColor: i < (plan.currentCycle || 0) ? colors.primary : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Next deduction — read-only status for users */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Next Deduction</Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.adminLink}
                onPress={() => navigation.navigate('AdminSavingsControl', { planId: plan.id || plan.planId })}
              >
                <Settings size={14} color={colors.primary} />
                <Text style={styles.adminLinkText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.infoValue}>{plan.nextDeduction}</Text>
          {plan.autoDebit ? (
            <View style={styles.autoDebitRow}>
              <CheckCircle2 size={14} color={colors.success} />
              <Text style={[styles.autoDebitText, { color: colors.success }]}>Auto-debit enabled</Text>
            </View>
          ) : (
            <View style={styles.autoDebitRow}>
              <Lock size={14} color={colors.textSecondary} />
              <Text style={[styles.autoDebitText, { color: colors.textSecondary }]}>Manual contribution</Text>
            </View>
          )}
        </View>
{/* Payment schedule history */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <History size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Schedule</Text>
          </View>
          {schedule.map((row) => (
            <View key={row.cycle} style={styles.scheduleRow}>
              <View style={styles.scheduleLeft}>
                {row.paid ? (
                  <CheckCircle2 size={16} color={colors.success} />
                ) : (
                  <View style={[styles.scheduleDot, { backgroundColor: colors.surface, borderColor: colors.border }]} />
                )}
                <Text style={[styles.scheduleLabel, { color: row.paid ? colors.text : colors.textSecondary }]}>
                  {row.label}
                </Text>
              </View>
              <Text style={[styles.scheduleAmount, { color: row.paid ? colors.text : colors.textSecondary }]}>
                {row.paid ? fmt(row.amount) : 'Upcoming'}
              </Text>
            </View>
          ))}
        </View>

        {/* Withdrawal lock status */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <ShieldCheck size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Withdrawal Lock</Text>
          </View>
          {plan.locked ? (
            <>
              <Text style={[styles.lockStatusText, { color: colors.warning }]}>FUNDS LOCKED</Text>
              <Text style={[styles.lockUntil, { color: colors.textSecondary }]}>
                Locked until {plan.lockUntil || 'maturity'}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.lockStatusText, { color: colors.success }]}>ACTIVE · UNLOCKED</Text>
              <Text style={[styles.lockUntil, { color: colors.textSecondary }]}>
                You may make contributions toward this target.
              </Text>
            </>
          )}
        </View>

        {/* Primary action */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CoopContribution')}
        >
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>Make Contribution</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const makeStyles = (c, dk) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 6, marginRight: 6 },
  headerTextGroup: { flex: 1 },
  headerTitle: { color: c.text, fontSize: 20, fontWeight: '700' },
  headerSub: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freqBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  freqBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  lockBadgeText: { fontSize: 10, fontWeight: '700' },
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  amountValue: { color: c.text, fontSize: 28, fontWeight: '700' },
  amountTarget: { color: c.textSecondary, fontSize: 13 },
  progressTrack: { height: 8, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  progressPct: { color: c.textSecondary, fontSize: 11, marginTop: 6 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metricLabel: { color: c.textSecondary, fontSize: 13 },
  metricValue: { color: c.text, fontSize: 13, fontWeight: '600' },
  cardRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: c.text, fontSize: 15, fontWeight: '600' },
  cycleInfo: { fontSize: 24, fontWeight: '700', marginTop: 10 },
  cycleSub: { fontSize: 12, marginTop: 2 },
  cycleDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  cycleDot: {
    width: 22,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  infoValue: { color: c.text, fontSize: 15, fontWeight: '600', marginTop: 10 },
  autoDebitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  autoDebitText: { fontSize: 12, fontWeight: '600' },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  scheduleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  scheduleLabel: { fontSize: 13 },
  scheduleAmount: { fontSize: 13, fontWeight: '600' },
  lockStatusText: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  lockUntil: { fontSize: 12, marginTop: 3 },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: c.primary + '15',
  },
  adminLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
  },
  primaryBtn: {
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
});

const styles = makeStyles(themes.darkEmerald, true);