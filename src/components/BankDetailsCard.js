import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Landmark, Copy, ShieldCheck } from 'lucide-react-native';
import { useBankDetails } from '../context/BankContext';

/**
 * Dynamic Cooperative Bank Account card.
 * Reads live details from BankContext (set by the Admin Settings screen)
 * and supports tap-to-copy on the account number.
 */
export default function BankDetailsCard() {
  const { bankName, accountNumber, accountName } = useBankDetails();

  const copyAccountNumber = async () => {
    if (!accountNumber) return;
    await Clipboard.setStringAsync(accountNumber);
    Alert.alert('Copied', `Account number ${accountNumber} copied to clipboard.`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Landmark size={18} color="#4CAF50" />
        <Text style={styles.headerTitle}>Cooperative Bank Account</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Bank Name</Text>
        <Text style={styles.detailValue}>{bankName || 'Not configured'}</Text>
      </View>

      <TouchableOpacity style={styles.detailRow} onPress={copyAccountNumber} disabled={!accountNumber}>
        <Text style={styles.detailLabel}>Account Number</Text>
        <View style={styles.copyRow}>
          <Text style={[styles.detailValue, styles.accountNumber]}>
            {accountNumber || 'Not configured'}
          </Text>
          {accountNumber ? <Copy size={15} color="#4CAF50" /> : null}
        </View>
      </TouchableOpacity>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Account Name</Text>
        <Text style={styles.detailValue}>{accountName || 'Not configured'}</Text>
      </View>

      <View style={styles.footerRow}>
        <ShieldCheck size={14} color="#4CAF50" />
        <Text style={styles.footerText}>
          {accountNumber
            ? 'Tap the account number to copy'
            : 'Awaiting account details from the cooperative admin'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
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
    paddingVertical: 8,
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
});