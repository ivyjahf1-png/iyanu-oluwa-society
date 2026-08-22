import React, { useState } from 'react';
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
  Platform,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { PiggyBank, Send, CheckCircle2 } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import useLoanInterest from '../hooks/useLoanInterest';

const TENURES = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '12 Months', months: 12 },
];

export default function RequestLoanScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  // Max eligible loan limit computed from the member's savings balance.
  const [savingsBalance] = useState(360466.78);
  const maxEligible = savingsBalance * 2; // up to 200% of total savings

  const {
    amount,
    setAmount,
    tenureMonths,
    setTenureMonths,
    frequency,
    setFrequency,
    monthlyRate,
    breakdown,
  } = useLoanInterest({ monthlyRate: 0.025 });

  const [bvn, setBvn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [agreed, setAgreed] = useState(false);

  const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submitApplication = () => {
    if (!amount || breakdown.principal <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid requested loan amount.');
      return;
    }
    if (breakdown.principal > maxEligible) {
      Alert.alert('Above limit', 'Your maximum eligible loan is ₦' + fmt(maxEligible) + '.');
      return;
    }
    if (!/^\d{11}$/.test(bvn)) {
      Alert.alert('Invalid BVN', 'Enter your 11-digit Bank Verification Number.');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Purpose required', 'Tell us what the loan is for.');
      return;
    }
    if (!agreed) {
      Alert.alert('Terms & Conditions', 'You must accept the terms to continue.');
      return;
    }
    Alert.alert(
      'Application submitted',
      'Loan of ₦' + fmt(breakdown.principal) + ' over ' + tenureMonths + ' month(s). Total repayment ₦' + fmt(breakdown.totalRepayment) + '.'
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Request Loan"
        subtitle="Apply for member credit with flexible repayment"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Eligibility */}
        <View style={styles.eligibleCard}>
          <PiggyBank size={20} color="#4CAF50" />
          <View style={styles.eligibleTextGroup}>
            <Text style={styles.eligibleLabel}>Max Eligible Loan Limit</Text>
            <Text style={styles.eligibleValue}>₦{fmt(maxEligible)}</Text>
            <Text style={styles.eligibleHint}>Up to 200% of your total savings</Text>
          </View>
        </View>

        {/* Requested amount */}
        <Text style={styles.label}>Requested Amount</Text>
        <View style={styles.amountInputWrap}>
          <Text style={styles.nairaPrefix}>₦</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#6B7280"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Tenure */}
        <Text style={styles.label}>Loan Tenure</Text>
        <View style={styles.tenureRow}>
          {TENURES.map(t => (
            <TouchableOpacity
              key={t.months}
              style={[styles.tenureChip, tenureMonths === t.months && styles.tenureChipActive]}
              onPress={() => setTenureMonths(t.months)}
            >
              <Text style={[styles.tenureChipText, tenureMonths === t.months && styles.tenureChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Frequency */}
        <Text style={styles.label}>Repayment Frequency</Text>
        <View style={styles.freqToggle}>
          <TouchableOpacity
            style={[styles.freqBtn, frequency === 'monthly' && styles.freqBtnActive]}
            onPress={() => setFrequency('monthly')}
          >
            <Text style={[styles.freqBtnText, frequency === 'monthly' && styles.freqBtnTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.freqBtn, frequency === 'weekly' && styles.freqBtnActive]}
            onPress={() => setFrequency('weekly')}
          >
            <Text style={[styles.freqBtnText, frequency === 'weekly' && styles.freqBtnTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
        </View>

        {/* BVN */}
        <Text style={styles.label}>Bank Verification Number (BVN)</Text>
        <TextInput
          style={styles.input}
          value={bvn}
          onChangeText={setBvn}
          placeholder="11-digit BVN"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          maxLength={11}
        />

        {/* Purpose */}
        <Text style={styles.label}>Purpose of Loan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={purpose}
          onChangeText={setPurpose}
          placeholder="e.g. School fees, business capital..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
        />

        {/* Dynamic summary breakdown */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Loan Breakdown</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Requested Amount</Text>
            <Text style={styles.summaryValue}>₦{fmt(breakdown.principal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Interest ({(monthlyRate * 100).toFixed(1)}% / month × {tenureMonths}m)
            </Text>
            <Text style={styles.summaryValue}>₦{fmt(breakdown.interestAmount)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Repayment</Text>
            <Text style={styles.summaryTotalValue}>₦{fmt(breakdown.totalRepayment)}</Text>
          </View>
          <View style={styles.installmentBox}>
            <Text style={styles.installmentLabel}>
              Estimated {frequency === 'weekly' ? 'Weekly' : 'Monthly'} Repayment
              {' '}({breakdown.installments} {frequency === 'weekly' ? 'weeks' : 'months'})
            </Text>
            <Text style={styles.installmentValue}>₦{fmt(breakdown.perInstallment)}</Text>
          </View>
        </View>

        {/* Terms & conditions */}
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)}>
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed ? <CheckCircle2 size={16} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.termsText}>
            I agree to the cooperative loan terms, interest rate and repayment schedule.
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitApplication}>
          <Send size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Submit Loan Application</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F4F7F5' 
  },
  scrollView: { 
    flex: 1 
  },
  content: { 
    padding: 16, 
    paddingBottom: Platform.OS === 'web' ? 110 : 50,
    flexGrow: 1,
  },
  eligibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
    padding: 14,
    marginBottom: 18,
  },
  eligibleTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  eligibleLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  eligibleValue: {
    color: '#4CAF50',
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 2,
  },
  eligibleHint: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  label: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  nairaPrefix: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#0B2211',
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 13,
  },
  tenureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tenureChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  tenureChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  tenureChipText: {
    color: '#0B2211',
    fontSize: 12,
    fontWeight: '600',
  },
  tenureChipTextActive: {
    color: '#FFFFFF',
  },
  freqToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    marginBottom: 16,
  },
  freqBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  freqBtnActive: {
    backgroundColor: '#4CAF50',
  },
  freqBtnText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B2211',
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#0B2211',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#F4F7F5',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    color: '#A7F3D0',
    fontSize: 12,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#1B3D28',
    marginVertical: 6,
  },
  summaryTotalLabel: {
    color: '#F4F7F5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: 'bold',
  },
  installmentBox: {
    backgroundColor: '#1B3D28',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  installmentLabel: {
    color: '#A7F3D0',
    fontSize: 11,
    textAlign: 'center',
  },
  installmentValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
  },
  termsText: {
    flex: 1,
    color: '#0B2211',
    fontSize: 12,
    lineHeight: 17,
  },
  submitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});