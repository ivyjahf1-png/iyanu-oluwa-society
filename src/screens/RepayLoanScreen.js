import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Upload, Send, TrendingDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import BankDetailsCard from '../components/BankDetailsCard';
import { useTransactions } from '../context/TransactionsContext';
import { fetchMyLoans, repayLoanFromWallet, isServerConfigured, submitPayment } from '../lib/ledger';
import { useTheme } from '../theme/ThemeContext';

export default function RepayLoanScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { loanOutstanding, totalPaid, addTransaction } = useTransactions();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  // Current loan metrics derived from the real transaction ledger only.
  const totalOutstanding = loanOutstanding + totalPaid; // gross disbursed
  const remainingBalance = loanOutstanding;

  const [mode, setMode] = useState('full'); // 'full' | 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState(null);

  // Phase 7/8: the member's active server loan (null when none/not configured).
  const [activeLoan, setActiveLoan] = useState(null);
  const [payingFromWallet, setPayingFromWallet] = useState(false);
  useEffect(() => {
    if (!isServerConfigured()) return;
    (async () => {
      const loans = await fetchMyLoans();
      setActiveLoan(loans.find(l => l.status === 'disbursed') || null);
    })();
  }, []);

  // Pay the outstanding balance (or custom amount) from the wallet balance.
  const payFromWallet = () => {
    if (!activeLoan) return;
    const remainingServer = Number(activeLoan.total_repayable) - Number(activeLoan.amount_repaid);
    const walletAmount = mode === 'full' ? remainingServer : parseFloat(customAmount) || 0;
    if (walletAmount <= 0) {
      Alert.alert('Enter amount', 'Choose "Pay Full Balance" or enter a custom repayment amount.');
      return;
    }
    Alert.alert(
      'Pay from wallet',
      `Debit ₦${walletAmount.toLocaleString()} from your available balance to repay this loan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async () => {
            setPayingFromWallet(true);
            try {
              await repayLoanFromWallet(activeLoan.id, walletAmount);
              Alert.alert('Repayment successful', 'Your wallet has been debited and the loan updated.');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Payment failed', e.message);
            } finally {
              setPayingFromWallet(false);
            }
          },
        },
      ],
    );
  };

  const repaymentAmount = mode === 'full' ? remainingBalance : parseFloat(customAmount) || 0;

  const pickReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceipt(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the document picker.');
    }
  };

  const submitRepayment = async () => {
    if (repaymentAmount <= 0) {
      Alert.alert('Enter amount', 'Choose "Pay Full Balance" or enter a custom repayment amount.');
      return;
    }
    if (!receipt && !reference.trim()) {
      Alert.alert('Proof required', 'Upload a payment receipt or enter the transaction reference.');
      return;
    }
    // Server-configured: create a PENDING loan repayment tied to the official
    // loan record. The outstanding balance is recalculated by the backend on
    // admin approval — never from client-supplied values.
    if (isServerConfigured()) {
      try {
        await submitPayment({
          txType: 'loan_repayment',
          amount: repaymentAmount,
          loanId: activeLoan?.id || null,
          reference: reference.trim(),
        });
        if (!activeLoan) {
          // No active server loan: fall back to the local audit trail.
          addTransaction({
            type: 'loan_repayment',
            label: 'Loan Repayment',
            amount: repaymentAmount,
            reference: reference.trim(),
          });
        }
      } catch (e) {
        Alert.alert('Submission failed', e.message);
        return;
      }
    } else {
      // Record the repayment in the member's audit trail (updates all figures).
      addTransaction({
        type: 'loan_repayment',
        label: 'Loan Repayment',
        amount: repaymentAmount,
        reference: reference.trim(),
      });
    }
    Alert.alert(
      'Repayment submitted',
      `Your loan repayment of ₦${repaymentAmount.toLocaleString()} has been submitted for verification.`,
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Repay Loan"
        subtitle="Settle your outstanding cooperative loan"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Loan metrics */}
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Outstanding Loan</Text>
            <Text style={styles.metricValue}>₦{totalOutstanding.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Paid</Text>
            <Text style={[styles.metricValue, styles.metricGreen]}>₦{totalPaid.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Remaining Balance Due</Text>
            <Text style={[styles.metricValue, styles.metricHighlight]}>
              ₦{remainingBalance.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Repayment mode */}
        <Text style={styles.label}>Repayment Amount</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'full' && styles.modeBtnActive]}
            onPress={() => setMode('full')}
          >
            <TrendingDown size={18} color={mode === 'full' ? '#FFFFFF' : colors.primary} />
            <Text style={[styles.modeBtnText, mode === 'full' && styles.modeBtnTextActive]}>
              Pay Full Balance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'custom' && styles.modeBtnActive]}
            onPress={() => setMode('custom')}
          >
            <Text style={[styles.modeBtnText, mode === 'custom' && styles.modeBtnTextActive]}>
              Custom Amount
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'custom' ? (
          <View style={styles.amountInputWrap}>
            <Text style={styles.nairaPrefix}>₦</Text>
            <TextInput
              style={styles.amountInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
        ) : (
          <View style={styles.fullAmountBox}>
            <Text style={styles.fullAmountLabel}>You will pay</Text>
            <Text style={styles.fullAmountValue}>₦{remainingBalance.toLocaleString()}.00</Text>
          </View>
        )}

        {/* Dynamic cooperative bank details */}
        <BankDetailsCard />

        {/* Payment confirmation */}
        <Text style={styles.label}>Payment Confirmation</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt}>
          <Upload size={20} color={colors.primary} />
          <View style={styles.uploadTextGroup}>
            <Text style={styles.uploadTitle} numberOfLines={1}>
              {receipt ? receipt.name : 'Upload Payment Receipt'}
            </Text>
            <Text style={styles.uploadHint}>Image or PDF proof of transfer</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Transaction Reference</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. TRF9988776655"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitRepayment}>
          <Send size={18} color={colors.background} />
          <Text style={[styles.submitBtnText, { color: colors.background }]}>Submit Loan Repayment</Text>
        </TouchableOpacity>

        {/* Phase 8: pay from available wallet balance (server-side loan) */}
        {activeLoan ? (
          <TouchableOpacity
            style={[styles.submitBtn, { marginTop: 10, backgroundColor: colors.surface }]}
            onPress={payFromWallet}
            disabled={payingFromWallet}
          >
            <Send size={18} color={colors.primary} />
            <Text style={[styles.submitBtnText, { color: colors.primary }]}>
              {payingFromWallet ? 'Processing…' : 'Pay from Available Balance'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricGreen: {
    color: colors.primary,
  },
  metricHighlight: {
    color: colors.text,
    fontSize: 15,
  },
  metricDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: colors.background,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  nairaPrefix: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 13,
  },
  fullAmountBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  fullAmountLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  fullAmountValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 14,
  },
  uploadTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  uploadHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
