import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Landmark, CheckCircle2 } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, GRADIENTS } from '../constants/theme';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { useTransactions } from '../context/TransactionsContext';
import { getAllSettings } from '../lib/supabase';

const fmt = n =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Co-op Credit — loan options & credit status (ledger + admin-limit driven). */
export default function CoopCreditScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { totalSavings, loanOutstanding, totalPaid } = useTransactions();

  // Admin-controlled limit (Admin Settings → Loan Eligibility).
  const [limitMode, setLimitMode] = useState('percent');
  const [limitPercent, setLimitPercent] = useState(200);
  const [limitFixed, setLimitFixed] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const s = await getAllSettings();
        if (s?.loan_limit_mode === 'fixed') {
          setLimitMode('fixed');
          setLimitFixed(Number(s.loan_limit_fixed) || 0);
        } else if (s?.loan_limit_percent) {
          setLimitMode('percent');
          setLimitPercent(Number(s.loan_limit_percent) || 200);
        }
      } catch (e) {
        // Default cooperative rule (200% of savings).
      }
    })();
  }, []);

  const maxEligible =
    limitMode === 'fixed'
      ? limitFixed
      : Math.round(totalSavings * (limitPercent / 100) * 100) / 100;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Co-op Credit</Text>
        <Text style={styles.headerSub}>Loan options and credit status</Text>

        <LinearGradient
          colors={GRADIENTS.metallicCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View>
            <Text style={styles.heroLabel}>Maximum Eligible Loan Limit</Text>
            <Text style={styles.heroAmount}>₦ {fmt(maxEligible)}</Text>
          </View>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => navigation.navigate('RequestLoan')}
          >
            <Text style={styles.applyBtnText}>Apply Now</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Credit Services</Text>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('RequestLoan')}
          >
            <LinearGradient colors={GRADIENTS.orangeBtn} style={styles.iconCircle}>
              <Landmark size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Request Credit</Text>
            <Text style={styles.cardSub}>Instant approval evaluation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('RepayLoan')}
          >
            <LinearGradient colors={GRADIENTS.purpleBtn} style={styles.iconCircle}>
              <Wallet size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.cardTitle}>Repayments</Text>
            <Text style={styles.cardSub}>Direct debit or manual transfer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <CheckCircle2 size={18} color={COLORS.emeraldAccent} />
            <Text style={styles.statusTitle}>Active Credit Line Status</Text>
          </View>
          <Text style={styles.statusText}>
            {loanOutstanding > 0
              ? `Outstanding balance: ₦${fmt(loanOutstanding)} • Repaid so far: ₦${fmt(totalPaid)}. No overdues. Guaranteed interest rate: 2.5% p.a.`
              : `No active loan. Guaranteed interest rate: 2.5% p.a.`}
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 90 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
  },
  heroLabel: { color: COLORS.textSecondary, fontSize: 12 },
  heroAmount: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 4 },
  applyBtn: {
    backgroundColor: COLORS.emeraldDark,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  applyBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  cardSub: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 4 },
  statusCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  statusText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 16 },
});