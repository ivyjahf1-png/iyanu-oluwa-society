import React, { useEffect, useState } from 'react';
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
import { Zap, Landmark, Upload, Send, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';

export default function FundWalletScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);

  // Route params from the Method of Payment screen (contribution metadata).
  const incomingMethod = route?.params?.method === 'manual' ? 'manual' : 'flutterwave';
  const incomingAmount =
    typeof route?.params?.amount === 'number' && route.params.amount > 0
      ? route.params.amount.toFixed(2)
      : '';
  const incomingFrequency = route?.params?.frequency || null;

  // Option A — dynamic Flutterwave virtual account assigned to this member.
  const [flwAccountNumber, setFlwAccountNumber] = useState('');
  const [flwBankName, setFlwBankName] = useState('');

  // Option B — manual transfer form.
  const [method, setMethod] = useState(incomingMethod); // 'flutterwave' | 'manual'
  const [amount, setAmount] = useState(incomingAmount);
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Cooperative bank details come from app_settings (admin-managed).
  const [coopBank, setCoopBank] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    loadProfileAndSettings();
  }, []);

  const loadProfileAndSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('flw_account_number, flw_bank_name')
        .eq('id', user.id)
        .single();
      if (profile) {
        setFlwAccountNumber(profile.flw_account_number || '');
        setFlwBankName(profile.flw_bank_name || 'Flutterwave');
      }
    }
    const { data: settings } = await supabase.from('app_settings').select('key, value');
    if (settings) {
      const map = Object.fromEntries(settings.map(r => [r.key, r.value]));
      setCoopBank({
        bankName: map.coop_bank_name || '',
        accountNumber: map.coop_account_number || '',
        accountName: map.coop_account_name || '',
      });
    }
  };

  const copyToClipboard = async value => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${value} copied to clipboard.`);
  };

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

  const submitManualDeposit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid funding amount.');
      return;
    }
    if (!reference.trim()) {
      Alert.alert('Reference required', 'Enter the transfer reference / transaction ID.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      let receiptUrl = null;

      // Upload the receipt to the private `receipts` storage bucket.
      if (receipt) {
        const ext = receipt.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const response = await fetch(receipt.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, arrayBuffer, {
            contentType: receipt.mimeType || 'application/octet-stream',
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
        receiptUrl = urlData?.publicUrl || filePath;
      }

      // Insert the pending deposit row (RLS scopes it to this member).
      const { error: insertError } = await supabase.from('deposits').insert({
        user_id: user.id,
        amount: parsedAmount,
        method: 'manual',
        status: 'pending',
        reference_id: reference.trim(),
        receipt_url: receiptUrl,
      });
      if (insertError) throw insertError;

      Alert.alert(
        'Deposit submitted',
        'Your manual deposit is pending verification by the cooperative admin.',
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Submission failed', e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D1E1B" />
      <ScreenHeader
        title="Fund Wallet"
        subtitle="Choose instant or free bank transfer"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>

        {/* Incoming transaction metadata banner */}
        {incomingAmount ? (
          <View style={styles.metaBanner}>
            <Text style={styles.metaBannerLabel}>Funding for contribution</Text>
            <Text style={styles.metaBannerValue}>
              ₦{incomingAmount}
              {incomingFrequency
                ? ` • ${incomingFrequency.charAt(0).toUpperCase()}${incomingFrequency.slice(1)}`
                : ''}
            </Text>
          </View>
        ) : null}

        {/* Method toggle */}
        <View style={styles.methodToggle}>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'flutterwave' && styles.methodBtnActive]}
            onPress={() => setMethod('flutterwave')}
          >
            <Zap size={18} color={method === 'flutterwave' ? '#FFFFFF' : '#4CAF50'} />
            <Text style={[styles.methodBtnText, method === 'flutterwave' && styles.methodBtnTextActive]}>
              Instant Transfer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'manual' && styles.methodBtnActive]}
            onPress={() => setMethod('manual')}
          >
            <Landmark size={18} color={method === 'manual' ? '#FFFFFF' : '#4CAF50'} />
            <Text style={[styles.methodBtnText, method === 'manual' && styles.methodBtnTextActive]}>
              Free Bank Transfer
            </Text>
          </TouchableOpacity>
        </View>

        {/* OPTION A — Flutterwave dynamic account */}
        {method === 'flutterwave' && (
          <View style={styles.optionCard}>
            <Text style={styles.optionTitle}>Option A — Instant Transfer</Text>
            <Text style={styles.optionHint}>
              Transfer to your personal Flutterwave account. Credit is automatic.
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank</Text>
              <Text style={styles.detailValue}>{flwBankName || 'Not yet assigned'}</Text>
            </View>
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => copyToClipboard(flwAccountNumber)}
              disabled={!flwAccountNumber}
            >
              <Text style={styles.detailLabel}>Account Number</Text>
              <View style={styles.copyRow}>
                <Text style={[styles.detailValue, styles.accountNumber]}>
                  {flwAccountNumber || '—'}
                </Text>
                {flwAccountNumber ? <Copy size={15} color="#4CAF50" /> : null}
              </View>
            </TouchableOpacity>

            {!flwAccountNumber ? (
              <Text style={styles.pendingNote}>
                Your dedicated virtual account is being generated. Check back shortly.
              </Text>
            ) : null}
          </View>
        )}

        {/* OPTION B — Manual cooperative bank transfer */}
        {method === 'manual' && (
          <View style={styles.optionCard}>
            <Text style={styles.optionTitle}>Option B — Free Bank Transfer</Text>
            <Text style={styles.optionHint}>
              Transfer to the official cooperative account, then submit proof below.
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank Name</Text>
              <Text style={styles.detailValue}>{coopBank.bankName}</Text>
            </View>
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => copyToClipboard(coopBank.accountNumber)}
            >
              <Text style={styles.detailLabel}>Account Number</Text>
              <View style={styles.copyRow}>
                <Text style={[styles.detailValue, styles.accountNumber]}>{coopBank.accountNumber}</Text>
                <Copy size={15} color="#4CAF50" />
              </View>
            </TouchableOpacity>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Name</Text>
              <Text style={styles.detailValue}>{coopBank.accountName}</Text>
            </View>

            <Text style={styles.label}>Amount</Text>
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

            <Text style={styles.label}>Transaction Reference ID</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. TRF9988776655"
              placeholderTextColor="#6B7280"
            />

            <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt}>
              <Upload size={20} color="#4CAF50" />
              <View style={styles.uploadTextGroup}>
                <Text style={styles.uploadTitle} numberOfLines={1}>
                  {receipt ? receipt.name : 'Upload Transfer Receipt'}
                </Text>
                <Text style={styles.uploadHint}>Image or PDF screenshot of the transfer</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submitManualDeposit}
              disabled={submitting}
            >
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting…' : 'Submit Deposit for Approval'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  metaBanner: {
    backgroundColor: '#0B2211',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaBannerLabel: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
  },
  metaBannerValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  methodBtn: {
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
  methodBtnActive: {
    backgroundColor: '#0B2211',
    borderColor: '#0B2211',
  },
  methodBtnText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionTitle: {
    color: '#0B2211',
    fontSize: 15,
    fontWeight: 'bold',
  },
  optionHint: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  detailValue: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pendingNote: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 12,
    fontStyle: 'italic',
  },
  label: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
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
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0B2211',
    fontSize: 14,
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
    marginTop: 16,
    marginBottom: 18,
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
  submitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
