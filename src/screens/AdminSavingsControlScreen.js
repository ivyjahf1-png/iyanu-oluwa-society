import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Lock,
  Save,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { useSavingsPlans, FREQUENCY_META } from '../context/SavingsPlansContext';
import { isAdminAccount } from '../lib/adminSecurity';
import { useAuth } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';

const fmt = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * AdminSavingsControlScreen — Admin-only controls for managing savings plans.
 *
 * Allows admins to:
 * - Toggle auto-debit on/off
 * - Edit contribution amounts
 * - Override cycle rules
 * - Update next deduction date
 *
 * Access is restricted to admin users only.
 */
export default function AdminSavingsControlScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { plans, updatePlan } = useSavingsPlans();
  const { userEmail } = useAuth();

  const params = route?.params || {};
  const planId = params.planId;

  // Security: Redirect non-admin users
  if (!isAdminAccount(userEmail)) {
    navigation.goBack();
    return null;
  }

  const plan = plans.find(p => p.id === planId || p.planId === planId);

  const [autoDebit, setAutoDebit] = useState(plan?.autoDebit ?? true);
  const [contributionAmount, setContributionAmount] = useState(
    String(plan?.contributionPerCycle || 0)
  );
  const [nextDeduction, setNextDeduction] = useState(
    plan?.nextDeduction || '1st of next month • 9:00 AM'
  );
  const [totalCycles, setTotalCycles] = useState(String(plan?.totalCycles || 12));

  useEffect(() => {
    if (plan) {
      setAutoDebit(plan.autoDebit);
      setContributionAmount(String(plan.contributionPerCycle || 0));
      setNextDeduction(plan.nextDeduction || '1st of next month • 9:00 AM');
      setTotalCycles(String(plan.totalCycles || 12));
    }
  }, [plan]);

  const handleSave = () => {
    if (!plan) {
      Alert.alert('Error', 'Plan not found');
      return;
    }

    const contribution = parseFloat(contributionAmount);
    const cycles = parseInt(totalCycles, 10);

    if (isNaN(contribution) || contribution <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid contribution amount');
      return;
    }

    if (isNaN(cycles) || cycles <= 0) {
      Alert.alert('Invalid Cycles', 'Please enter a valid number of cycles');
      return;
    }

    Alert.alert(
      'Confirm Changes',
      `Update ${plan.title}?\n\nContribution: ${fmt(contribution)}\nCycles: ${cycles}\nAuto-debit: ${autoDebit ? 'On' : 'Off'}`,
      [
  if (!plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Savings Control" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.danger }]}>Plan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const meta = FREQUENCY_META[plan.frequency] || FREQUENCY_META.monthly;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Savings Control" onBack={() => navigation.goBack()} subtitle="Admin Only" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan info card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
          <Text style={[styles.planMeta, { color: colors.textSecondary }]}>
            {meta.label} • {fmt(plan.targetAmount)} target
          </Text>
          <View style={[styles.adminBadge, { backgroundColor: colors.primary + '20' }]}>
            <TrendingUp size={12} color={colors.primary} />
            <Text style={[styles.adminBadgeText, { color: colors.primary }]}>ADMIN CONTROLS</Text>
          </View>
        </View>

        {/* Auto-debit toggle */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            {autoDebit ? (
              <CheckCircle2 size={18} color={colors.success} />
            ) : (
              <Lock size={18} color={colors.textSecondary} />
            )}
            <Text style={styles.cardTitle}>Auto-Debit</Text>
            <Switch
              value={autoDebit}
              onValueChange={setAutoDebit}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={autoDebit ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {autoDebit
              ? 'Contributions will be automatically deducted on the scheduled date'
              : 'Members must manually make contributions'}
          </Text>
        </View>

        {/* Contribution amount */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <TrendingUp size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Contribution Amount</Text>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={contributionAmount}
            onChangeText={setContributionAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Amount per cycle ({meta.cycle})
          </Text>
        </View>

        {/* Total cycles */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Total Cycles</Text>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={totalCycles}
            onChangeText={setTotalCycles}
            keyboardType="numeric"
            placeholder="Enter cycles"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Current cycle: {plan.currentCycle}
          </Text>
        </View>

        {/* Next deduction */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRowHeader}>
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Next Deduction</Text>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={nextDeduction}

const makeStyles = (c, dk) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { color: c.text, fontSize: 15, fontWeight: '600', flex: 1 },
  planTitle: { fontSize: 18, fontWeight: '700' },
  planMeta: { fontSize: 13, marginTop: 4 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  adminBadgeText: { fontSize: 10, fontWeight: '700' },
  helperText: { fontSize: 12, marginTop: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  errorText: { fontSize: 14, textAlign: 'center' },
});

const styles = makeStyles(themes.darkEmerald, true);
            onChangeText={setNextDeduction}
            placeholder="e.g. 1st of next month • 9:00 AM"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Save size={18} color={colors.background} />
          <Text style={[styles.saveBtnText, { color: colors.background }]}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            updatePlan(plan.id || plan.planId, {
              autoDebit,
              contributionPerCycle: contribution,
              nextDeduction,
              totalCycles: cycles,
            });
            Alert.alert('Success', 'Plan updated successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };