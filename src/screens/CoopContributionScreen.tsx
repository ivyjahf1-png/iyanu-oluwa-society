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
import { useTransactions } from '../context/TransactionsContext';
import { Calendar, Upload, Send, CheckCircle, XCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import BankDetailsCard from '../components/BankDetailsCard';
import { saveContributionSchedule, isServerConfigured, submitPayment } from '../lib/ledger';
import { useTheme } from '../theme/ThemeContext';

export default function CoopContributionScreen({ navigation: rawNav }: { navigation?: any }) {
  const navigation = useSafeNavigation(rawNav);
  const { addTransaction } = useTransactions();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [schedule, setSchedule] = useState('monthly');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [senderName, setSenderName] = useState('');
const [receipt, setReceipt] = useState<any>(null);

  const pickReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && Array.isArray(result.assets) && result.assets.length > 0) {
        setReceipt(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the document picker.');
    }
  };

  const removeReceipt = () => {
    setReceipt(null);
  };

  const proceedToPayment = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid contribution amount.');
      return;
    }

    rawNav?.navigate('AddFunds', {
      amount: parsedAmount,
      frequency: schedule,
      purpose: 'contribution',
    });
  };

  const submitProof = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid contribution amount.');
      return;
    }
    if (!receipt && !reference.trim()) {
      Alert.alert('Proof required', 'Upload a payment receipt or enter the transaction reference.');
      return;
    }

    const formattedAmount = parsedAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Server-configured: create a PENDING payment. Official contribution
    // records are updated ONLY when an admin approves (backend-authoritative).
    if (isServerConfigured()) {
      try {
await submitPayment({
  txType: 'contribution',
  amount: parsedAmount,
  reference: reference.trim(),
  senderName: senderName.trim(),
} as any);
      } catch (e: any) {
        Alert.alert('Submission failed', e?.message || 'Could not submit payment.');
        return;
      }
    } else {
      // Offline fallback: local audit trail only (existing behaviour).
      (addTransaction as any)({
        type: 'contribution',
        label: `${schedule.charAt(0).toUpperCase()}${schedule.slice(1)} Co-op Contribution`,
        amount: parsedAmount,
        reference: reference.trim(),
      });
    }

    // Phase 5: register the automatic contribution engine schedule
    // (server charges the wallet on the due date when funded).
    if (isServerConfigured()) {
      saveContributionSchedule(parsedAmount, schedule, true).catch(() => {});
    }

    Alert.alert(
      'Contribution submitted',
      `Your ${schedule} contribution of \u20A6${formattedAmount} has been submitted for verification.`,
      [
        {
          text: 'OK',
        onPress: () => rawNav?.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Coop Contribution"
        subtitle="Deposit weekly or monthly savings"
      onBack={() => (rawNav as any)?.goBack?.()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Contribution Schedule</Text>
        <View style={styles.scheduleToggle}>
          <TouchableOpacity
            style={[styles.scheduleBtn, schedule === 'weekly' && styles.scheduleBtnActive]}
            onPress={() => setSchedule('weekly')}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={schedule === 'weekly' ? colors.background : colors.primary} />
            <Text style={[styles.scheduleBtnText, schedule === 'weekly' && styles.scheduleBtnTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scheduleBtn, schedule === 'monthly' && styles.scheduleBtnActive]}
            onPress={() => setSchedule('monthly')}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={schedule === 'monthly' ? colors.background : colors.primary} />
            <Text style={[styles.scheduleBtnText, schedule === 'monthly' && styles.scheduleBtnTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contribution amount input */}
        <Text style={styles.label}>Contribution Amount</Text>
        <View style={styles.amountInputWrap}>
          <Text style={styles.nairaPrefix}>{"\u20A6"}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>

        <BankDetailsCard />

        <Text style={styles.label}>Payment Confirmation (Optional / Manual Proof)</Text>

        {receipt ? (
          <View style={styles.receiptSelectedBox}>
            <CheckCircle size={20} color={colors.primary} />
            <Text style={styles.receiptName} numberOfLines={1}>
           {(receipt as any)?.name || 'Receipt Attached'}
            </Text>
            <TouchableOpacity onPress={removeReceipt} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <XCircle size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt} activeOpacity={0.7}>
            <Upload size={20} color={colors.primary} />
            <View style={styles.uploadTextGroup}>
              <Text style={styles.uploadTitle} numberOfLines={1}>
                Upload Payment Receipt
              </Text>
              <Text style={styles.uploadHint}>Image or PDF proof of transfer</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.orText}>— or enter transaction details —</Text>

        <Text style={styles.label}>Transaction Reference</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. GTB1234567890"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Sender Name</Text>
        <TextInput
          style={styles.input}
          value={senderName}
          onChangeText={setSenderName}
          placeholder="Name on the paying account"
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.submitBtn} onPress={proceedToPayment} activeOpacity={0.8}>
            <Send size={18} color={colors.background} />
            <Text style={styles.submitBtnText}>Proceed to Payment</Text>
          </TouchableOpacity>

          {(receipt !== null || reference.trim().length > 0) && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={submitProof} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>Submit Proof Directly</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Record<string, string>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 110 : 40,
    flexGrow: 1,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 6,
  },
  scheduleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 16,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  scheduleBtnActive: {
    backgroundColor: colors.primary,
  },
  scheduleBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  scheduleBtnTextActive: {
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 10,
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
  receiptSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    marginBottom: 10,
  },
  receiptName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    marginHorizontal: 10,
  },
  orText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
    marginVertical: 10,
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
    marginBottom: 12,
  },
  actionSection: {
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});