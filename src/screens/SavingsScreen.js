import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Calendar,
  ShieldCheck,
  History,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useTransactions } from '../context/TransactionsContext';

export default function SavingsScreen() {
  const [activeTab, setActiveTab] = useState('monthly');
  const [savingsVisible, setSavingsVisible] = useState(true);
  const { transactions, totalSavings } = useTransactions();

  const fmt = n => '₦ ' + Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Contribution history derived from the real transaction ledger only.
  const history = transactions
    .filter(t => ['contribution', 'deposit', 'withdrawal'].includes(t.type))
    .slice(0, 10);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#091813' barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, styles.grow]} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.headerTitle}>Savings & Vault</Text>
        <Text style={styles.headerSub}>Manage your co-op contributions and target savings</Text>

        {/* Savings Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeaderRow}>
            <Text style={styles.balanceLabel}>Total Savings Balance</Text>
            <TouchableOpacity
              style={styles.eyeToggleBtn}
              onPress={() => setSavingsVisible(!savingsVisible)}
            >
              {savingsVisible ? (
                <Eye size={18} color="#FFFFFF" />
              ) : (
                <EyeOff size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {savingsVisible ? fmt(totalSavings) : '₦ ••••••••'}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.interestBadge}>
              <TrendingUp color="#10B981" size={14} />
              <Text style={styles.interestText}>+8.5% p.a. Dividend</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => Alert.alert('Coming Soon', 'Deposits will be available soon.')}
            >
              <Lock color="#FFFFFF" size={16} />
              <Text style={styles.btnText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Alert.alert('Coming Soon', 'Withdrawals will be available soon.')}
            >
              <Lock color="#A7F3D0" size={16} />
              <Text style={styles.secBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Selectors */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
              Monthly Dues
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'target' && styles.activeTab]}
            onPress={() => setActiveTab('target')}
          >
            <Text style={[styles.tabText, activeTab === 'target' && styles.activeTabText]}>
              Target Savings
            </Text>
          </TouchableOpacity>
        </View>
{/* Breakdown Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Calendar color="#A7F3D0" size={20} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoTitle}>Next Due Date</Text>
              <Text style={styles.infoSub}>1st of Next Month</Text>
            </View>
            <Text style={styles.infoAmount}>{fmt(0)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <ShieldCheck color="#A7F3D0" size={20} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoTitle}>Lock Status</Text>
              <Text style={styles.infoSub}>Active Contribution Lock</Text>
            </View>
            <Text style={styles.statusBadgeText}>LOCKED</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Contribution History</Text>
          <History color="#9CB8A6" size={18} />
        </View>

        <View style={styles.historyList}>
          {history.length === 0 ? (
            <View style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <View style={styles.histIconWrapper}>
                  <PiggyBank color="#10B981" size={18} />
                </View>
                <View>
                  <Text style={styles.histTitle}>No contributions yet</Text>
                  <Text style={styles.histDate}>Your deposits will appear here</Text>
                </View>
              </View>
              <Text style={styles.histAmount}>{fmt(0)}</Text>
            </View>
          ) : (
            history.map(t => (
              <View key={t.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <View style={styles.histIconWrapper}>
                    <PiggyBank color="#10B981" size={18} />
                  </View>
                  <View>
                    <Text style={styles.histTitle}>{t.label}</Text>
                    <Text style={styles.histDate}>{t.date}</Text>
                  </View>
                </View>
                <Text style={styles.histAmount}>
                  {t.type === 'withdrawal' ? '-' : '+'}
                  {fmt(t.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#091813' },
  scrollContent: { padding: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#9CB8A6', fontSize: 12, marginBottom: 16, marginTop: 4 },
  balanceCard: { backgroundColor: '#132620', borderRadius: 16, padding: 20, marginBottom: 16 },
  balanceLabel: { color: '#D3F99D', fontSize: 13 },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyeToggleBtn: { padding: 4 },
  balanceAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginVertical: 6 },
  badgeRow: { flexDirection: 'row', marginBottom: 16 },
  interestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  interestText: { color: '#10B981', fontSize: 11, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  secondaryBtn: { flex: 1, backgroundColor: '#0D1D18', paddingVertical: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#172F27' },
  secBtnText: { color: '#A7F3D0', fontWeight: 'bold', fontSize: 13 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#0D1D18', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#132620' },
  tabText: { color: '#9CB8A6', fontSize: 12, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF' },
  infoCard: { backgroundColor: '#0D1D18', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#172F27', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#172F27', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoTextGroup: { flex: 1 },
  infoTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  infoSub: { color: '#9CB8A6', fontSize: 11, marginTop: 2 },
  infoAmount: { color: '#A7F3D0', fontSize: 14, fontWeight: 'bold' },
  statusBadgeText: { color: '#10B981', fontSize: 11, fontWeight: 'bold', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  divider: { height: 1, backgroundColor: '#1B3D28', marginVertical: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { color: '#D3F99D', fontSize: 15, fontWeight: '700' },
  historyList: { backgroundColor: '#0D1D18', borderRadius: 14, borderWidth: 1, borderColor: '#172F27', paddingHorizontal: 14 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1B3D28' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  histIconWrapper: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  histTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  histDate: { color: '#9CB8A6', fontSize: 10, marginTop: 2 },
  histAmount: { color: '#10B981', fontSize: 13, fontWeight: 'bold' },
});