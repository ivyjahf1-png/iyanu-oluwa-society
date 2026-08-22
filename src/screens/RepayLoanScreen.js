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
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Upload, Send, TrendingDown } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import BankDetailsCard from '../components/BankDetailsCard';

export default function RepayLoanScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  // Current loan metrics (bound to the member's live loan state).
  const [totalOutstanding] = useState(150000.0);
  const [totalPaid] = useState(50000.0);
  const remainingBalance = totalOutstanding - totalPaid;

  const [mode, setMode] = useState('full'); // 'full' | 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState(null);

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

  const submitRepayment = () => {
    if (repaymentAmount <= 0) {
      Alert.alert('Enter amount', 'Choose "Pay Full Balance" or enter a custom repayment amount.');
      return;
    }
    if (!receipt && !reference.trim()) {
      Alert.alert('Proof required', 'Upload a payment receipt or enter the transaction reference.');
      return;
    }
    Alert.alert(
      'Repayment submitted',
      `Your loan repayment of ₦${repaymentAmount.toLocaleString()} has been submitted for verification.`,
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Repay Loan"
        subtitle="Settle your outstanding cooperative loan"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <TrendingDown size={18} color={mode === 'full' ? '#FFFFFF' : '#4CAF50'} />
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
              placeholderTextColor="#6B7280"
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
          <Upload size={20} color="#4CAF50" />
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
          placeholderTextColor="#6B7280"
        />

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={submitRepayment}>
          <Send size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Submit Loan Repayment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  metricsCard: {
    backgroundColor: '#0B2211',
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
    color: '#A7F3D0',
    fontSize: 12,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricGreen: {
    color: '#4CAF50',
  },
  metricHighlight: {
    color: '#F4F7F5',
    fontSize: 15,
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#1B3D28',
  },
  label: {
    color: '#0B2211',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
  },
  modeBtnActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  modeBtnText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 18,
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
  fullAmountBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  fullAmountLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  fullAmountValue: {
    color: '#4CAF50',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 14,
  },
  uploadTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  uploadTitle: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadHint: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
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
  submitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
