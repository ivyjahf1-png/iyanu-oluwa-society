import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Landmark, Copy, ShieldCheck } from 'lucide-react-native';
import { useBankDetails } from '../context/BankContext';
import { useTheme } from '../theme/ThemeContext';

/**
 * Dynamic Cooperative Bank Account card.
 * Reads live details from BankContext (set by the Admin Settings screen)
 * and supports tap-to-copy on the account number. Theme-aware: colors follow
 * the active theme so text stays readable on light and dark backgrounds.
 */
export default function BankDetailsCard() {
  const { bankName, accountNumber, accountName } = useBankDetails();
  const { colors } = useTheme();

  const copyAccountNumber = async () => {
    if (!accountNumber) return;
    await Clipboard.setStringAsync(accountNumber);
    Alert.alert('Copied', `Account number ${accountNumber} copied to clipboard.`);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Landmark size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cooperative Bank Account</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bank Name</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{bankName || 'Not configured'}</Text>
      </View>

      <TouchableOpacity style={styles.detailRow} onPress={copyAccountNumber} disabled={!accountNumber}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Number</Text>
        <View style={styles.copyRow}>
          <Text style={[styles.detailValue, styles.accountNumber, { color: colors.text }]}>
            {accountNumber || 'Not configured'}
          </Text>
          {accountNumber ? <Copy size={15} color={colors.primary} /> : null}
        </View>
      </TouchableOpacity>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Name</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{accountName || 'Not configured'}</Text>
      </View>

      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <ShieldCheck size={14} color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
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
    fontSize: 12,
  },
  detailValue: {
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
  },
  footerText: {
    fontSize: 11,
  },
});