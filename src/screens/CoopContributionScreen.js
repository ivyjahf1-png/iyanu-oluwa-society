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
import { Calendar, Upload, Send } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import BankDetailsCard from '../components/BankDetailsCard';

export default function CoopContributionScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const [schedule, setSchedule] = useState('monthly'); // 'weekly' | 'monthly'
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
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceipt(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the document picker.');
    }
  };

  const proceedToPayment = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid contribution amount.');
      return;
    }
    // Route straight to the Method of Payment screen, carrying transaction
    // metadata (amount + frequency) through the route parameters.
    navigation.navigate('AddFunds', {
      amount: parsedAmount,
      frequency: schedule,
      purpose: 'contribution',
    });
  };

  const submitProof = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid contribution amount.');
      return;
    }
    if (!receipt && !reference.trim()) {
      Alert.alert('Proof required', 'Upload a payment receipt or enter the transaction reference.');
      return;
    }
    Alert.alert(
      'Contribution submitted',
      `Your ${schedule} contribution of ₦${amount} has been submitted for verification.`,
    );
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Coop Contribution"
        subtitle="Deposit weekly or monthly savings"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Schedule toggle */}
        <Text style={styles.label}>Contribution Schedule</Text>
        <View style={styles.scheduleToggle}>
          <TouchableOpacity
            style={[styles.scheduleBtn, schedule === 'weekly' && styles.scheduleBtnActive]}
            onPress={() => setSchedule('weekly')}
          >
            <Calendar size={18} color={schedule === 'weekly' ? '#FFFFFF' : '#4CAF50'} />
            <Text style={[styles.scheduleBtnText, schedule === 'weekly' && styles.scheduleBtnTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scheduleBtn, schedule === 'monthly' && styles.scheduleBtnActive]}
            onPress={() => setSchedule('monthly')}
          >
            <Calendar size={18} color={schedule === 'monthly' ? '#FFFFFF' : '#4CAF50'} />
            <Text style={[styles.scheduleBtnText, schedule === 'monthly' && styles.scheduleBtnTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Text style={styles.label}>Contribution Amount</Text>
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

        {/* Dynamic cooperative bank details (from Admin settings) */}
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

        <Text style={styles.orText}>— or enter manually —</Text>

        <Text style={styles.label}>Transaction Reference</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. GTB1234567890"
          placeholderTextColor="#6B7280"
        />

        <Text style={styles.label}>Sender Name</Text>
        <TextInput
          style={styles.input}
          value={senderName}
          onChangeText={setSenderName}
          placeholder="Name on the paying account"
          placeholderTextColor="#6B7280"
        />

        {/* Submit — routes to the Method of Payment page with metadata */}
        <TouchableOpacity style={styles.submitBtn} onPress={proceedToPayment}>
          <Send size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  label: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  scheduleToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    marginBottom: 16,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scheduleBtnActive: {
    backgroundColor: '#4CAF50',
  },
  scheduleBtnText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleBtnTextActive: {
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
  orText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 11,
    marginVertical: 10,
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
