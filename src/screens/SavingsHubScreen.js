import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PiggyBank, Plus, ArrowUpRight, ShieldCheck, Lock } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { GRADIENTS } from '../constants/theme';
import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSavingsPlans, FREQUENCY_META } from '../context/SavingsPlansContext';
import { useSafeNavigation } from '../hooks/useSafeNavigation';

const fmt = n =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SavingsHubScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { totalSavings } = useTransactions();
  const { plans } = useSavingsPlans();

  // Cooperative targets (weekly / monthly / annual) plus any custom member goals.
  const targetPlans = plans.filter(p =>
    p.frequency === 'weekly' || p.frequency === 'monthly' || p.frequency === 'annual');

  const openTarget = (plan) => {
    navigation.navigate('CoopTargetDetails', {
      planId: plan.planId || plan.id,
      planType: plan.frequency, // 'weekly' | 'monthly' | 'annual'
      title: plan.title,
      targetAmount: plan.targetAmount,
      currentProgress: plan.currentProgress,
      cycleInfo: plan.totalCycles ? `Cycle ${plan.currentCycle} of ${plan.totalCycles}` : '',
    });
  };

  const openNewGoal = (frequency) => {
    navigation.navigate('AddGoal', { defaultFrequency: frequency });
  };
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
          <TouchableOpacity style={[styles.heroBtn, { backgroundColor: colors.primary }]} onPress={() => openNewGoal('monthly')}>
            <Plus size={16} color={colors.background} />
            <Text style={[styles.heroBtnText, { color: colors.background }]}>New Goal</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick frequency shortcuts */}
        <View style={styles.shortcutRow}>
          {(['weekly', 'monthly', 'annual']).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.shortcutChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openNewGoal(f)}
            >
              <Text style={[styles.shortcutChipText, { color: colors.text }]}>+ {FREQUENCY_META[f].label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cooperative Targets</Text>
        </View>

        {targetPlans.map(plan => {
          const meta = FREQUENCY_META[plan.frequency] || FREQUENCY_META.monthly;
          const pct = Math.min(100, plan.targetAmount ? (plan.currentProgress / plan.targetAmount) * 100 : 0);
          const pctRounded = Math.round(pct);
          return (
            <TouchableOpacity
              key={plan.planId || plan.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openTarget(plan)}
              activeOpacity={0.85}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                  <PiggyBank size={20} color={colors.primary} />
                </View>
                <View style={styles.cardTextGroup}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={1}>{plan.title}</Text>
                    <View style={[styles.freqBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.freqBadgeText, { color: colors.background }]}>{meta.badge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.planSub, { color: colors.textSecondary }]}>
                    {plan.totalCycles ? `Cycle ${plan.currentCycle} of ${plan.totalCycles} • ₦${fmt(plan.contributionPerCycle)}${meta.cycle}` : `Locked until ${plan.lockUntil || 'maturity'}`}
                  </Text>
                </View>
                <ArrowUpRight size={20} color={colors.textSecondary} />
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                <View style={[styles.progressBar, { backgroundColor: colors.primary, width: `${pct}%` }]} />
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={[styles.progressAmount, { color: colors.text }]}>
                  ₦{fmt(plan.currentProgress)} / ₦{fmt(plan.targetAmount)}
                </Text>
                <Text style={[styles.progressPct, { color: colors.textSecondary }]}>{pctRounded}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Locked Reserves</Text>
        </View>

        {plans.filter(p => p.locked).map(plan => (
          <TouchableOpacity
            key={plan.planId || plan.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openTarget(plan)}
            activeOpacity={0.85}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                <Lock size={20} color={colors.primary} />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={1}>{plan.title}</Text>
                <Text style={[styles.planSub, { color: colors.textSecondary }]}>Locked until {plan.lockUntil || 'maturity'}</Text>
              </View>
              <ShieldCheck size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
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
    marginBottom: 12,
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
  shortcutRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  shortcutChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  shortcutChipText: { fontSize: 11, fontWeight: '600' },
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  freqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  freqBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  planSub: { fontSize: 11, marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: { height: '100%' },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressAmount: { fontSize: 11, fontWeight: '600' },
  progressPct: { fontSize: 11, fontWeight: '700' },
});

const styles = makeStyles(themes.darkEmerald, true);