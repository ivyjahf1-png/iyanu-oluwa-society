import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Landmark, AlertCircle, CheckCircle2, Clock } from 'lucide-react-native';

export default function LoansScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.headerTitle}>Member Loans</Text>
        <Text style={styles.headerSub}>Apply for credit or manage existing loan facilities</Text>

        {/* Active Loan Overview */}
        <View style={styles.loanCard}>
          <View style={styles.cardHeader}>
            <Landmark color="#A7F3D0" size={22} />
            <Text style={styles.loanType}>Personal Loan</Text>
          </View>

          <Text style={styles.cardLabel}>Remaining Balance</Text>
          <Text style={styles.balanceAmount}>₦ 100,000.00</Text>

          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressText}>Paid: ₦50,000</Text>
            <Text style={styles.progressText}>Total: ₦150,000</Text>
          </View>

          <TouchableOpacity style={styles.repayBtn}>
            <Text style={styles.repayBtnText}>MAKE REPAYMENT</Text>
          </TouchableOpacity>
        </View>

        {/* Apply CTA Card */}
        <TouchableOpacity style={styles.applyCard}>
          <View style={styles.applyIconWrapper}>
            <Landmark color="#4CAF50" size={24} />
          </View>
          <View style={styles.applyTextContainer}>
            <Text style={styles.applyTitle}>Request New Loan</Text>
            <Text style={styles.applySub}>Access up to 200% of your total savings balance</Text>
          </View>
        </TouchableOpacity>

        {/* Loan Schedule */}
        <Text style={styles.sectionHeader}>Repayment Schedule</Text>
        <View style={styles.scheduleList}>

          <View style={styles.scheduleItem}>
            <View style={styles.schedLeft}>
              <CheckCircle2 color="#4CAF50" size={18} />
              <View>
                <Text style={styles.schedTitle}>Instalment 1 of 3</Text>
                <Text style={styles.schedDate}>Paid on Jul 15, 2026</Text>
              </View>
            </View>
            <Text style={styles.paidText}>₦ 50,000</Text>
          </View>

          <View style={styles.scheduleItem}>
            <View style={styles.schedLeft}>
              <Clock color="#A7F3D0" size={18} />
              <View>
                <Text style={styles.schedTitle}>Instalment 2 of 3</Text>
                <Text style={styles.schedDate}>Due on Sep 15, 2026</Text>
              </View>
            </View>
            <Text style={styles.pendingText}>₦ 50,000</Text>
          </View>

          <View style={styles.scheduleItem}>
            <View style={styles.schedLeft}>
              <AlertCircle color="#9CB8A6" size={18} />
              <View>
                <Text style={styles.schedTitle}>Instalment 3 of 3</Text>
                <Text style={styles.schedDate}>Due on Oct 15, 2026</Text>
              </View>
            </View>
            <Text style={styles.upcomingText}>₦ 50,000</Text>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B2211' },
  scrollContent: { padding: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#9CB8A6', fontSize: 12, marginBottom: 16, marginTop: 4 },
  loanCard: { backgroundColor: '#123B24', borderRadius: 16, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loanType: { color: '#A7F3D0', fontSize: 13, fontWeight: 'bold' },
  cardLabel: { color: '#D3F99D', fontSize: 12 },
  balanceAmount: { color: '#FFFFFF', fontSize: 26, fontWeight: 'bold', marginVertical: 4 },
  progressBg: { height: 8, backgroundColor: '#1C4A2E', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#A7F3D0', borderRadius: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 16 },
  progressText: { color: '#D3F99D', fontSize: 11 },
  repayBtn: { backgroundColor: '#4CAF50', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  repayBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  applyCard: { backgroundColor: '#0F2A19', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1C4A2E', marginBottom: 20 },
  applyIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  applyTextContainer: { flex: 1 },
  applyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  applySub: { color: '#9CB8A6', fontSize: 11, marginTop: 2 },
  sectionHeader: { color: '#D3F99D', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  scheduleList: { backgroundColor: '#0F2A19', borderRadius: 14, borderWidth: 1, borderColor: '#1C4A2E', paddingHorizontal: 14 },
  scheduleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1B3D28' },
  schedLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  schedTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  schedDate: { color: '#9CB8A6', fontSize: 10, marginTop: 2 },
  paidText: { color: '#4CAF50', fontSize: 13, fontWeight: 'bold' },
  pendingText: { color: '#A7F3D0', fontSize: 13, fontWeight: 'bold' },
  upcomingText: { color: '#9CB8A6', fontSize: 13, fontWeight: 'bold' },
});