import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { GRADIENTS } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';

/**
 * Financial Services hub — the "View All" destination for the Home screen's
 * Financial Services carousel. Lists every financial service entry point.
 */
export default function FinancialServicesScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const SERVICES = [
    { label: 'Coop Contribution', sub: 'Deposit weekly or monthly savings', icon: 'piggy-bank', font: 'fa5', gradient: GRADIENTS.greenService, route: 'CoopContribution' },
    { label: 'Account Statement', sub: 'Download your transaction report', icon: 'document-text-outline', font: 'ion', gradient: GRADIENTS.blueService, route: 'AccountStatement' },
    { label: 'Request Loan', sub: 'Apply for member credit', icon: 'hand-holding-usd', font: 'fa5', gradient: GRADIENTS.orangeService, route: 'RequestLoan' },
    { label: 'Repay Loan', sub: 'Settle an active loan balance', icon: 'card-outline', font: 'ion', gradient: GRADIENTS.purpleService, route: 'RepayLoan' },
    { label: 'Fund Wallet', sub: 'Top up your society wallet', icon: 'wallet-outline', font: 'ion', gradient: GRADIENTS.greenService, route: 'FundWallet' },
    { label: 'Airtime & Data', sub: 'Buy airtime or data bundles', icon: 'phone-portrait-outline', font: 'ion', gradient: GRADIENTS.blueService, route: 'AirtimeData' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Financial Services"
        subtitle="Everything you need to manage your money"
        onBack={() => rawNav?.goBack?.()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SERVICES.map((svc) => (
          <TouchableOpacity
            key={svc.label}
            style={styles.serviceCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(svc.route)}
          >
            <LinearGradient colors={svc.gradient} style={styles.iconCircle}>
              {svc.font === 'fa5' ? (
                <FontAwesome5 name={svc.icon} size={18} color={isDark ? colors.text : '#FFFFFF'} />
              ) : (
                <Ionicons name={svc.icon} size={20} color={isDark ? colors.text : '#FFFFFF'} />
              )}
            </LinearGradient>
            <View style={styles.textGroup}>
              <Text style={styles.serviceLabel}>{svc.label}</Text>
              <Text style={styles.serviceSub}>{svc.sub}</Text>
            </View>
            <Text style={styles.chevron}>{'›'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40 },
    serviceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    textGroup: { flex: 1, marginLeft: 12 },
    serviceLabel: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
    serviceSub: { color: colors.textSecondary, fontSize: 11.5, marginTop: 2 },
    chevron: { color: colors.textSecondary, fontSize: 20, fontWeight: '600', paddingHorizontal: 4 },
  });
