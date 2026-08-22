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
  Switch,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Landmark, CheckCircle2, Key } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getAllSettings, saveSettings } from '../lib/supabase';

export default function AdminSettingsScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Payment gateway credentials (app_settings)
  const [flwPublicKey, setFlwPublicKey] = useState('');
  const [flwSecretKey, setFlwSecretKey] = useState('');
  const [flwSecretHash, setFlwSecretHash] = useState('');
  const [passFeesToUser, setPassFeesToUser] = useState(false);

  // Official cooperative bank details (app_settings)
  const [bankNameInput, setBankNameInput] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [accountNameInput, setAccountNameInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await getAllSettings();
      setFlwPublicKey(s.flutterwave_public_key || '');
      setFlwSecretKey(s.flutterwave_secret_key || '');
      setFlwSecretHash(s.flutterwave_secret_hash || '');
      setPassFeesToUser(s.pass_fees_to_user === 'true');
      setBankNameInput(s.coop_bank_name || '');
      setAccountNumberInput(s.coop_account_number || '');
      setAccountNameInput(s.coop_account_name || '');
    } catch (e) {
      Alert.alert('Load failed', e.message);
    }
    setLoading(false);
  };

  const saveSettingsHandler = async () => {
    if (!bankNameInput.trim() || !accountNumberInput.trim() || !accountNameInput.trim()) {
      Alert.alert(
        'Missing details',
        'Please fill in the cooperative bank name, account number and account name.',
      );
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        flutterwave_public_key: flwPublicKey.trim(),
        flutterwave_secret_key: flwSecretKey.trim(),
        flutterwave_secret_hash: flwSecretHash.trim(),
        pass_fees_to_user: passFeesToUser ? 'true' : 'false',
        coop_bank_name: bankNameInput.trim(),
        coop_account_number: accountNumberInput.trim(),
        coop_account_name: accountNameInput.trim(),
      });
      Alert.alert('Saved', 'Payment gateway and cooperative bank details updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', e.message);
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Admin Settings"
        subtitle="Gateway credentials & cooperative bank account"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Flutterwave credentials */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Key size={18} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Flutterwave Gateway</Text>
          </View>

          <Text style={styles.label}>Public Key</Text>
          <TextInput
            style={styles.input}
            value={flwPublicKey}
            onChangeText={setFlwPublicKey}
            placeholder="FLWPUBK-..."
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Secret Key</Text>
          <TextInput
            style={styles.input}
            value={flwSecretKey}
            onChangeText={setFlwSecretKey}
            placeholder="FLWSECK-..."
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            secureTextEntry
          />

          <Text style={styles.label}>Secret Hash</Text>
          <TextInput
            style={styles.input}
            value={flwSecretHash}
            onChangeText={setFlwSecretHash}
            placeholder="Webhook verification hash"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            secureTextEntry
          />

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Pass transaction fees to user</Text>
              <Text style={styles.switchSub}>Add gateway charges to member funding amounts</Text>
            </View>
            <Switch
              value={passFeesToUser}
              onValueChange={setPassFeesToUser}
              trackColor={{ false: '#E5E7EB', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Cooperative bank details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Landmark size={18} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Cooperative Bank Account</Text>
          </View>
          <Text style={styles.sectionHint}>
            Shown to members on contribution and loan repayment screens.
          </Text>

          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bankNameInput}
            onChangeText={setBankNameInput}
            placeholder="e.g. Zenith Bank, First Bank, Wema Bank"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumberInput}
            onChangeText={setAccountNumberInput}
            placeholder="e.g. 1234567890"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={accountNameInput}
            onChangeText={setAccountNameInput}
            placeholder="e.g. Iyanu Oluwa Society"
            placeholderTextColor="#6B7280"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveSettingsHandler}
          disabled={loading || saving}
        >
          <CheckCircle2 size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0B2211',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHint: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 10,
  },
  label: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  switchTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
