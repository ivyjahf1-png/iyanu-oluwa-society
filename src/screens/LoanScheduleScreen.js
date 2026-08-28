import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { ArrowRight, CheckCircle } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';

export default function LoanScheduleScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const loan = route?.params?.loan || route?.params?.loanDetails || {};
  const loanId = route?.params?.loanId || loan.id || 'loan-001';
  const principal = Number(loan.principal || loan.amount || loan.totalRepayable || 100000);
  const rate = Number(loan.interestRate || loan.rate || 8);
  const tenure = Number(loan.tenure || loan.months || 6);
  const monthly = Math.round(principal / tenure);

  const schedule = Array.from({ length: tenure }, (_, i) => ({
    id: 'pay-' + (i + 1),
    dueDate: new Date(Date.now() + (i + 1) * 30 * 86400000).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
    principal: monthly,
    interest: Math.round((principal * rate / 100) / tenure),
    paid: i < 2,
  }));

  const totalInterest = schedule.reduce((s, x) => s + x.interest, 0);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="Loan Schedule" subtitle="Repayment plan" onBack={() => rawNav?.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Principal</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>₦{principal.toLocaleString()}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}><Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Interest Rate</Text><Text style={[styles.smallValue, { color: colors.primary }]}>{rate}%</Text></View>
            <View style={styles.summaryItem}><Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Remaining Tenure</Text><Text style={[styles.smallValue, { color: colors.text }]}>{tenure} months</Text></View>
          </View>
          <Text style={[styles.totalInterest, { color: colors.textSecondary }]}>Total Interest: ₦{totalInterest.toLocaleString()}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Repayment Schedule</Text>
        {schedule.map((row) => (
          <View key={row.id} style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.scheduleLeft}>
              <Text style={[styles.scheduleDate, { color: colors.text }]}>{row.dueDate}</Text>
              <Text style={[styles.scheduleSub, { color: colors.textSecondary }]}>Principal: ₦{row.principal.toLocaleString()} · Interest: ₦{row.interest.toLocaleString()}</Text>
            </View>
            {row.paid ? (
              <View style={[styles.paidPill, { backgroundColor: colors.success + '20' }]}><CheckCircle size={12} color={colors.success} /><Text style={[styles.paidText, { color: colors.success }]}>Paid</Text></View>
            ) : (
              <View style={[styles.pendingPill, { backgroundColor: colors.warning + '20' }]}><Text style={[styles.pendingText, { color: colors.warning }]}>Pending</Text></View>
            )}
          </View>
        ))}

        <TouchableOpacity style={[styles.repayBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('RepayLoan', { loanId, prefill: monthly })}>
          <Text style={[styles.repayText, { color: colors.background }]}>Make Repayment</Text><ArrowRight size={18} color={colors.background} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 }, scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20 }, summaryLabel: { fontSize: 12 }, summaryValue: { fontSize: 26, fontWeight: '700', marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 20, marginTop: 14 }, summaryItem: { flex: 1 }, smallLabel: { fontSize: 11 }, smallValue: { fontSize: 14, fontWeight: '600', marginTop: 2 }, totalInterest: { fontSize: 12, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 }, scheduleLeft: { flex: 1 }, scheduleDate: { fontSize: 13, fontWeight: '600' }, scheduleSub: { fontSize: 12, marginTop: 2 },
  paidPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }, paidText: { fontSize: 11, fontWeight: '700' }, pendingPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }, pendingText: { fontSize: 11, fontWeight: '700' },
  repayBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 14, paddingVertical: 15, marginTop: 16 }, repayText: { fontSize: 15, fontWeight: 'bold' },
});
