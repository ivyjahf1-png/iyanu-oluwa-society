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
  Modal,
  Alert,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Smartphone, Database, CheckCircle2 } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';

const PROVIDERS = [
  { key: 'MTN', label: 'MTN', color: '#FFCC00' },
  { key: 'AIRTEL', label: 'Airtel', color: '#E40000' },
  { key: 'GLO', label: 'Glo', color: '#43B02A' },
  { key: 'NINEMOBILE', label: '9mobile', color: '#00694B' },
];

const AIRTIME_AMOUNTS = ['₦100', '₦200', '₦500', '₦1,000', '₦2,000', '₦5,000'];
const DATA_PLANS = [
  { label: '1GB — 30 Days', price: '₦500' },
  { label: '2.5GB — 30 Days', price: '₦1,000' },
  { label: '5GB — 30 Days', price: '₦1,800' },
  { label: '10GB — 30 Days', price: '₦3,000' },
];

export default function AirtimeDataScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  // Preselect provider / transaction type when arriving from the Data modal.
  const initialProvider = route.params?.provider;
  const initialTxType = route.params?.txType;

  const [provider, setProvider] = useState(
    PROVIDERS.some(p => p.key === initialProvider) ? initialProvider : 'MTN',
  );
  const [txType, setTxType] = useState(initialTxType === 'data' ? 'data' : 'airtime');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const phoneValid = /^0[7-9][01]\d{8}$/.test(phone);

  const proceedToBuy = () => {
    if (!phoneValid) {
      Alert.alert('Invalid number', 'Enter a valid 11-digit Nigerian phone number (e.g. 08031234567).');
      return;
    }
    if (txType === 'airtime' && !amount) {
      Alert.alert('Select amount', 'Choose an airtime amount to continue.');
      return;
    }
    if (txType === 'data' && !selectedPlan) {
      Alert.alert('Select a plan', 'Choose a data bundle to continue.');
      return;
    }
    const summary =
      txType === 'airtime'
        ? `${provider} airtime of ${amount} for ${phone}`
        : `${provider} ${selectedPlan.label} for ${phone}`;
    Alert.alert('Purchase initiated', summary);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
      <ScreenHeader
        title="Buy Airtime / Data"
        subtitle="Top up instantly for any network"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Provider selector */}
        <Text style={styles.label}>Select Network Provider</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.providerBadge, provider === p.key && styles.providerActive]}
              onPress={() => setProvider(p.key)}
            >
              <View style={[styles.providerDot, { backgroundColor: p.color }]}>
                {provider === p.key ? <CheckCircle2 size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.providerLabel, provider === p.key && styles.providerLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction type toggle */}
        <Text style={styles.label}>Transaction Type</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, txType === 'airtime' && styles.typeBtnActive]}
            onPress={() => setTxType('airtime')}
          >
            <Smartphone size={18} color={txType === 'airtime' ? '#FFFFFF' : '#10B981'} />
            <Text style={[styles.typeBtnText, txType === 'airtime' && styles.typeBtnTextActive]}>
              Airtime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, txType === 'data' && styles.typeBtnActive]}
            onPress={() => setTxType('data')}
          >
            <Database size={18} color={txType === 'data' ? '#FFFFFF' : '#10B981'} />
            <Text style={[styles.typeBtnText, txType === 'data' && styles.typeBtnTextActive]}>
              Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phone number */}
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, phone.length > 0 && !phoneValid && styles.inputError]}
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 08031234567"
          placeholderTextColor="#526E63"
          keyboardType="phone-pad"
          maxLength={11}
        />
        {phone.length > 0 && !phoneValid ? (
          <Text style={styles.errorText}>Enter a valid 11-digit number starting with 0</Text>
        ) : null}

        {/* Amount or Data plan selector */}
        {txType === 'airtime' ? (
          <>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountGrid}>
              {AIRTIME_AMOUNTS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.amountChip, amount === a && styles.amountChipActive]}
                  onPress={() => setAmount(a)}
                >
                  <Text style={[styles.amountChipText, amount === a && styles.amountChipTextActive]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Data Plan</Text>
            <TouchableOpacity style={styles.planSelector} onPress={() => setPlanModalVisible(true)}>
              <Text style={[styles.planSelectorText, !selectedPlan && styles.planPlaceholder]}>
                {selectedPlan ? `${selectedPlan.label} — ${selectedPlan.price}` : 'Choose a data bundle'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Proceed button */}
        <TouchableOpacity style={styles.buyBtn} onPress={proceedToBuy}>
          <Text style={styles.buyBtnText}>
            Proceed to Buy {txType === 'airtime' ? 'Airtime' : 'Data'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Data plan modal */}
      <Modal visible={planModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Data Plan ({provider})</Text>
            {DATA_PLANS.map(plan => (
              <TouchableOpacity
                key={plan.label}
                style={styles.modalRow}
                onPress={() => {
                  setSelectedPlan(plan);
                  setPlanModalVisible(false);
                }}
              >
                <Text style={styles.modalRowTitle}>{plan.label}</Text>
                <Text style={styles.modalRowPrice}>{plan.price}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setPlanModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#091813' },
  content: { padding: 16, paddingBottom: 32 },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  providerBadge: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0D1D18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingVertical: 10,
    marginHorizontal: 3,
  },
  providerActive: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FAF4',
  },
  providerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  providerLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  providerLabelActive: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#0D1D18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#172F27',
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: '#10B981',
  },
  typeBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#D9534F',
  },
  errorText: {
    color: '#D9534F',
    fontSize: 11,
    marginBottom: 10,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountChip: {
    backgroundColor: '#0D1D18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  amountChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  amountChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  amountChipTextActive: {
    color: '#FFFFFF',
  },
  planSelector: {
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  planSelectorText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  planPlaceholder: {
    color: '#8EA89D',
  },
  buyBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45,30,27,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0D1D18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#172F27',
  },
  modalRowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalRowPrice: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalCancel: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#8EA89D',
    fontSize: 13,
    fontWeight: '600',
  },
});
