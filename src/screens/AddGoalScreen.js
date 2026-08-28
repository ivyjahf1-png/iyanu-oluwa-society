import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { ChevronLeft, Target, Check, Lock } from 'lucide-react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { useSavingsPlans, FREQUENCY_META } from '../context/SavingsPlansContext';

const FREQUENCIES = ['weekly', 'monthly', 'annual'];

/**
 * AddGoalScreen — "Create New Goal" form for the Savings Hub.
 *
 * Route params:
 *   defaultFrequency?: 'weekly' | 'monthly' | 'annual'
 *
 * Lets the user pick a frequency (Weekly / Monthly / Annual), name the goal,
 * set a target amount, choose duration/cycles, and toggle auto-debit. On save,
 * the new plan is written into the persistent savings-plans store
 * (SavingsPlansContext, backed by AsyncStorage).
 */
export default function AddGoalScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { addPlan } = useSavingsPlans();

  const params = route?.params || {};
  const [frequency, setFrequency] = useState(params.defaultFrequency || 'monthly');
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [cycles, setCycles] = useState('12');
  const [autoDebit, setAutoDebit] = useState(true);

  const meta = FREQUENCY_META[frequency] || FREQUENCY_META.monthly;

  const saveGoal = () => {
    const name = goalName.trim();
    const amount = Number(targetAmount);
    if (!name) return Alert.alert('Goal name required', 'Please give your goal a name.');
    if (!amount || amount <= 0)
      return Alert.alert('Invalid amount', 'Please enter a target amount greater than zero.');

    const totalCycles = Math.max(1, Number(cycles) || 12);
    const perCycle = Math.round(amount / totalCycles);

    addPlan({
      title: name,
      frequency,
      targetAmount: amount,
      currentProgress: 0,
      contributionPerCycle: perCycle,
      totalCycles,
      currentCycle: 0,
      nextDeduction:
        frequency === 'weekly'
          ? 'Every Monday • 9:00 AM'
          : '1st of next month • 9:00 AM',
      autoDebit,
      locked: false,
      lockUntil: '',
    });

    Alert.alert('Goal created', `"${name}" has been added to your savings plans.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };
return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Create New Goal</Text>
            <Text style={styles.headerSub}>Set up a savings target</Text>
          </View>
        </View>

        {/* Goal name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Goal Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            value={goalName}
            onChangeText={setGoalName}
            placeholder="e.g. New Car, School Fees, Vacation"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Target amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Target Amount</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="numeric"
            placeholder="₦ 0.00"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Frequency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map(f => {
              const active = frequency === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.freqChip,
                    { backgroundColor: active ? colors.primary : colors.inputBackground, borderColor: active ? colors.primary : colors.border },
                  ]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.freqChipText, { color: active ? colors.background : colors.text }]}>
                    {FREQUENCY_META[f].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Duration / cycles */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Duration (cycles)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            value={cycles}
            onChangeText={setCycles}
            keyboardType="numeric"
            placeholder="Number of cycles"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.hint}>
            Target of ₦{Number(targetAmount || 0).toLocaleString('en-NG')} over {Math.max(1, Number(cycles) || 12)} cycles ≈ ₦
            {Math.round(Number(targetAmount || 0) / Math.max(1, Number(cycles) || 12)).toLocaleString('en-NG')} per {{ weekly: 'week', monthly: 'month', annual: 'year' }[frequency]}
          </Text>
        </View>

        {/* Auto-debit */}
        <TouchableOpacity
          style={[styles.autoDebitRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          onPress={() => setAutoDebit(v => !v)}
        >
          {autoDebit ? (
            <Check size={16} color={colors.success} />
          ) : (
            <Lock size={16} color={colors.textSecondary} />
          )}
          <View style={styles.autoDebitTextGroup}>
            <Text style={[styles.autoDebitTitle, { color: colors.text }]}>Auto-debit contributions</Text>
            <Text style={[styles.autoDebitSub, { color: colors.textSecondary }]}>
              {autoDebit ? 'Enabled — automatically deducted each cycle' : 'Disabled — you will contribute manually'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveGoal}>
          <Target size={18} color={colors.background} />
          <Text style={[styles.saveBtnText, { color: colors.background }]}>Create Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const makeStyles = (c, dk) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: { padding: 6, marginRight: 6 },
  headerTextGroup: { flex: 1 },
  headerTitle: { color: c.text, fontSize: 22, fontWeight: '700' },
  headerSub: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  fieldGroup: { marginBottom: 18 },
  label: { color: c.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  freqChipText: { fontSize: 13, fontWeight: '700' },
  hint: { color: c.textSecondary, fontSize: 11, marginTop: 6 },
  autoDebitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  autoDebitTextGroup: { flex: 1 },
  autoDebitTitle: { fontSize: 13, fontWeight: '600' },
  autoDebitSub: { fontSize: 11, marginTop: 2 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
});

const styles = makeStyles(themes.darkEmerald, true);