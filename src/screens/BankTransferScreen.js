import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import * as Clipboard from 'expo-clipboard';
import { Landmark, Copy, ShieldCheck, User } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useUser } from '../context/UserContext';

export default function BankTransferScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { user, updateUser } = useUser();

  const copy = async value => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${value} copied to clipboard.`);
  };

  const hasSavedDetails =
    user.userBankName && user.userAccountNumber && user.userAccountName;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Bank Transfer"
        subtitle="Your saved payout account"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {hasSavedDetails ? (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Landmark size={18} color="#4CAF50" />
              <Text style={styles.headerTitle}>Saved Bank Account</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank Name</Text>
              <Text style={styles.detailValue}>{user.userBankName}</Text>
            </View>
            <TouchableOpacity style={styles.detailRow} onPress={() => copy(user.userAccountNumber)}>
              <Text style={styles.detailLabel}>Account Number</Text>
              <View style={styles.copyRow}>
                <Text style={[styles.detailValue, styles.accountNumber]}>
                  {user.userAccountNumber}
                </Text>
                <Copy size={15} color="#4CAF50" />
              </View>
            </TouchableOpacity>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Name</Text>
              <Text style={styles.detailValue}>{user.userAccountName}</Text>
            </View>

            <View style={styles.footerRow}>
              <ShieldCheck size={14} color="#4CAF50" />
              <Text style={styles.footerText}>Tap the account number to copy</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <User size={34} color="#9CB8A6" />
            <Text style={styles.emptyTitle}>No bank account saved yet</Text>
            <Text style={styles.emptySub}>
              Add your bank details in Profile Settings to enable transfers.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('ProfileSettings')}
            >
              <Text style={styles.primaryBtnText}>Go to Profile Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick edit shortcut */}
        {hasSavedDetails ? (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <Text style={styles.secondaryBtnText}>Edit Saved Details</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },
  headerTitle: {
    color: '#0B2211',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F0',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#0B2211',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 13,
  },
});