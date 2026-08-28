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
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import * as Clipboard from 'expo-clipboard';
import { Landmark, Copy, ShieldCheck, User } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useUser } from '../context/UserContext';

export default function BankTransferScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
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
      <StatusBar barStyle="dark-content" backgroundColor='#F4F7F5' />
      <ScreenHeader
        title="Bank Transfer"
        subtitle="Your saved payout account"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {hasSavedDetails ? (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Landmark size={18} color={colors.success} />
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
                <Copy size={15} color={colors.success} />
              </View>
            </TouchableOpacity>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Name</Text>
              <Text style={styles.detailValue}>{user.userAccountName}</Text>
            </View>

            <View style={styles.footerRow}>
              <ShieldCheck size={14} color={colors.success} />
              <Text style={styles.footerText}>Tap the account number to copy</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <User size={34} color={colors.textSecondary} />
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

const makeStyles = (colors, isDark) => StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  headerTitle: {
    color: '#0F172A',
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
    color: '#8EA89D',
    fontSize: 12,
  },
  detailValue: {
    color: '#0F172A',
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
    borderTopColor: '#D1FAE5',
  },
  footerText: {
    color: '#8EA89D',
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    color: '#8EA89D',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 13,
  },
});

const styles = makeStyles(themes.darkEmerald, true);
