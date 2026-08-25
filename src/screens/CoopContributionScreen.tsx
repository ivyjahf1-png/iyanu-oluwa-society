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

export default function CoopContributionScreen({ navigation: rawNav }: { navigation?: any }) {
  const navigation = useSafeNavigation(rawNav);
  const { addTransaction } = useTransactions();
  const [schedule, setSchedule] = useState('monthly');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [senderName, setSenderName] = useState('');
  const [receipt, setReceipt] = useState(null);

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

    navigation.navigate('AddFunds', {
      amount: parsedAmount,
      frequency: schedule,
      purpose: 'contribution',
    });
  };

  const submitProof = () => {
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

    // Record the contribution in the member's audit trail so every balance,
    // history and statement updates automatically.
    (addTransaction as any)({
      type: 'contribution',
      label: `${schedule.charAt(0).toUpperCase()}${schedule.slice(1)} Co-op Contribution`,
      amount: parsedAmount,
      reference: reference.trim(),
    });

    Alert.alert(
      'Contribution submitted',
      `Your ${schedule} contribution of \u20A6${formattedAmount} has been submitted for verification.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
      <ScreenHeader
        title="Coop Contribution"
        subtitle="Deposit weekly or monthly savings"
        onBack={() => navigation.goBack()}
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
            <Calendar size={18} color={schedule === 'weekly' ? '#FFFFFF' : '#10B981'} />
            <Text style={[styles.scheduleBtnText, schedule === 'weekly' && styles.scheduleBtnTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scheduleBtn, schedule === 'monthly' && styles.scheduleBtnActive]}
            onPress={() => setSchedule('monthly')}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={schedule === 'monthly' ? '#FFFFFF' : '#10B981'} />
            <Text style={[styles.scheduleBtnText, schedule === 'monthly' && styles.scheduleBtnTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Contribution Amount</Text>
        <View style={styles.amountInputWrap}>
          <Text style={styles.nairaPrefix}>{"\u20A6"}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#526E63"
            keyboardType="decimal-pad"
          />
        </View>

        <BankDetailsCard />

        <Text style={styles.label}>Payment Confirmation (Optional / Manual Proof)</Text>

        {receipt ? (
          <View style={styles.receiptSelectedBox}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.receiptName} numberOfLines={1}>
              {receipt.name ? receipt.name : 'Receipt Attached'}
            </Text>
            <TouchableOpacity onPress={removeReceipt} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <XCircle size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt} activeOpacity={0.7}>
            <Upload size={20} color="#10B981" />
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
          placeholderTextColor="#526E63"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Sender Name</Text>
        <TextInput
          style={styles.input}
          value={senderName}
          onChangeText={setSenderName}
          placeholder="Name on the paying account"
          placeholderTextColor="#526E63"
        />

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.submitBtn} onPress={proceedToPayment} activeOpacity={0.8}>
            <Send size={18} color="#FFFFFF" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091813',
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 6,
  },
  scheduleToggle: {
    flexDirection: 'row',
    backgroundColor: '#0D1D18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#172F27',
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
    backgroundColor: '#10B981',
  },
  scheduleBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  scheduleBtnTextActive: {
    color: '#FFFFFF',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  nairaPrefix: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 13,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    padding: 14,
    marginBottom: 10,
  },
  uploadTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  uploadTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadHint: {
    color: '#8EA89D',
    fontSize: 11,
    marginTop: 2,
  },
  receiptSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 14,
    marginBottom: 10,
  },
  receiptName: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    fontWeight: '500',
    marginHorizontal: 10,
  },
  orText: {
    textAlign: 'center',
    color: '#8EA89D',
    fontSize: 11,
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  actionSection: {
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  },
});