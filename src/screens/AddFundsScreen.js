import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { CreditCard, Landmark, ChevronRight, Clock } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useUser } from '../context/UserContext';

export default function AddFundsScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { user } = useUser();
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Transaction metadata passed from the contribution / payment workflow.
  const params = route?.params || {};
  const pendingAmount = typeof params.amount === 'number' ? params.amount : null;
  const pendingFrequency = params.frequency || null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor='#F4F7F5' />
      <ScreenHeader
        title="Add Funds"
        subtitle="Choose how you want to fund your wallet"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={false}>
        {/* Pending transaction metadata banner */}
        {pendingAmount ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingTitle}>Pending Contribution</Text>
            <Text style={styles.pendingText}>
              ₦
              {pendingAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {pendingFrequency ? ` • ${pendingFrequency.charAt(0).toUpperCase()}${pendingFrequency.slice(1)}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Card Payment */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => setShowComingSoon(true)}
        >
          <View style={[styles.optionIcon, { backgroundColor: '#D1FAE5' }]}>
            <CreditCard size={22} color="#10B981" />
          </View>
          <View style={styles.optionTextGroup}>
            <Text style={styles.optionTitle}>Card Payment</Text>
            <Text style={styles.optionSub}>Pay instantly with your debit card</Text>
          </View>
          <ChevronRight size={18} color="#9CB8A6" />
        </TouchableOpacity>

        {/* Bank Transfer — opens the Admin Account Details view with metadata */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() =>
            navigation.navigate('FundWallet', {
              method: 'manual',
              amount: pendingAmount,
              frequency: pendingFrequency,
              userId: user?.id ?? null,
            })
          }
        >
          <View style={[styles.optionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Landmark size={22} color="#10B981" />
          </View>
          <View style={styles.optionTextGroup}>
            <Text style={styles.optionTitle}>Bank Transfer</Text>
            <Text style={styles.optionSub}>
              Transfer to the official cooperative account
            </Text>
          </View>
          <ChevronRight size={18} color="#9CB8A6" />
        </TouchableOpacity>

        {/* Info note */}
        <View style={styles.noteCard}>
          <Clock size={16} color="#10B981" />
          <Text style={styles.noteText}>
            Manual cooperative transfers are also available under "Free Bank Transfer" on the Fund
            Wallet screen.
          </Text>
        </View>
      </ScrollView>

      {/* Coming soon modal */}
      <Modal visible={showComingSoon} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <CreditCard size={40} color="#10B981" />
            <Text style={styles.modalTitle}>Card Payment Coming Soon</Text>
            <Text style={styles.modalSub}>
              Debit card funding will be available in a future update. Use bank transfer for now.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowComingSoon(false)}
            >
              <Text style={styles.modalBtnText}>Got it</Text>
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
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextGroup: { flex: 1 },
  optionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionSub: {
    color: '#8EA89D',
    fontSize: 11,
    marginTop: 2,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    gap: 8,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    color: '#8EA89D',
    fontSize: 11,
    lineHeight: 15,
  },
  pendingBanner: {
    backgroundColor: '#06130D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTitle: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,34,17,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  modalSub: {
    color: '#8EA89D',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  modalBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 11,
    marginTop: 18,
  },
  modalBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
});