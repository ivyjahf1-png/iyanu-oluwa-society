import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { isAdminAccount } from '../lib/adminSecurity';
import { useAdminLock } from '../components/AdminLock';
import { useUser } from '../context/UserContext';
import { deriveDisplayName } from '../auth/authService';
import Greeting from '../components/Greeting';
import useLiveEnvironment from '../hooks/useLiveEnvironment';

export default function HomeScreen({ navigation }) {
  // Centralized currency formatter — explicit Unicode escape so the ₦ symbol
  // never suffers source-file encoding corruption (â‚¦ mojibake).
  const formatCurrency = (amount) => `\u20A6${Number(amount).toLocaleString()}`;

  const [hideMainBalance, setHideMainBalance] = useState(true);
  const [hideSavingsBalance, setHideSavingsBalance] = useState(false);
  const [hideLoanBalance, setHideLoanBalance] = useState(true);
  const shieldTapCount = useRef(0);
  const shieldTapTimer = useRef(null);

  // Admin visibility: the header shield is shown only to allowed admin accounts.
  // When no admin allowlist is configured (env empty), this defaults to true so
  // the existing admin passcode/biometric lock remains the sole gate.
    const { userEmail, displayName: authDisplayName } = useAuth();
  const { user } = useUser();
  // Live environment (time-synced greeting + optional weather chip).
  // Fully additive: degrades gracefully when permission/network unavailable.
  const env = useLiveEnvironment();
  // Name resolution order: saved custom full name -> auth-derived email
  // prefix (skiszyofficial@gmail.com -> "Skiszyofficial") -> generic member.
  // The factory placeholder never masks the real email-derived identity.
  const PLACEHOLDER_NAME = 'Temitope Adewale';
  const savedName =
    user?.fullName && user.fullName !== PLACEHOLDER_NAME ? user.fullName : null;
  const displayName =
    savedName || authDisplayName || (userEmail ? deriveDisplayName(userEmail) : 'Member');
  const isAdminVisible = isAdminAccount(userEmail);

  // Global admin verification: biometric prompt → PIN keypad fallback.
  // Navigation to AdminSettings happens ONLY when access is granted.
  const { requestAdminAccess } = useAdminLock();
  const handleShieldAccess = async () => {
    const granted = await requestAdminAccess();
    if (granted && navigation?.navigate) {
      navigation.navigate('AdminSettings');
    }
  };

  // SECRET ADMIN TRIGGER — hidden on the brand logo inside the balance card.
  // Requires 5 quick taps within a 3-second window; single taps do nothing
  // visible (subtle no-op) so the backdoor stays completely hidden.
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef(null);
  const onBrandLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => {
      if (logoTapCount.current >= 5) {
        logoTapCount.current = 0;
        handleShieldAccess();
        return;
      }
      logoTapCount.current = 0;
      // single/stray taps: silent no-op
    }, 3000);
  };

  // Safe navigation helper
  const navigateTo = (screenName) => {
    if (navigation && navigation.navigate) {
      navigation.navigate(screenName);
    } else {
      console.log('Navigating to screen: ' + screenName);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07120E" />

      {/* FIXED TOP â€” Header + Available Balance Card stay static on screen */}
      <View style={styles.fixedTop}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <View>
            <Greeting textStyle={styles.greetingText} weather={env.weather} />
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.badgeRow}>
              <Ionicons name="shield-checkmark" size={14} color="#00D084" />
              <Text style={styles.societyName}>Standard Mutual Savings</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => navigateTo('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color="#E2E8F0" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileCircle}
              onPress={() => navigateTo('Profile')}
            >
              <Ionicons name="person-outline" size={20} color="#07120E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => navigateTo('Settings')}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#E2E8F0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* METALLIC MAIN BALANCE CARD */}
        <LinearGradient
          colors={['#182B26', '#354B45', '#95A7A1', '#213530']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.metallicCard}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.cardLabel}>Available Balance</Text>
            <Text style={styles.balanceText}>
              {hideMainBalance ? `${formatCurrency('')} **` : formatCurrency(250000)}
            </Text>

            <TouchableOpacity
              style={styles.addFundBtn}
              onPress={() => navigateTo('AddFunds')}
            >
              <Ionicons name="lock-closed" size={14} color="#FFF" />
              <Text style={styles.addFundText}>+ Add Fund</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onBrandLogoTap}
              style={styles.watermarkContainer}
            >
              <View style={styles.emblemOutline}>
                <FontAwesome5 name="university" size={24} color="#D1D5DB" />
              </View>
              <Text style={styles.watermarkTitle}>Standard Mutual Savings</Text>
              <Text style={styles.watermarkSub}>Community</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.showBalanceBtn}
              onPress={() => setHideMainBalance(!hideMainBalance)}
            >
              <Ionicons
                name={hideMainBalance ? 'eye-outline' : 'eye-off-outline'}
                size={14}
                color="#FFF"
              />
              <Text style={styles.showBalanceText}>
                {hideMainBalance ? 'Show Balance' : 'Hide Balance'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* DUAL STAT CARDS ROW */}
        <View style={styles.dualCardRow}>
          {/* SAVINGS CARD */}
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => navigateTo('SavingsHub')}
          >
            <View style={styles.subCardHeader}>
              <Text style={styles.subCardTitle}>Savings</Text>
              <View style={styles.subCardHeaderIcons}>
                <TouchableOpacity onPress={() => setHideSavingsBalance(!hideSavingsBalance)}>
                  <Ionicons
                    name={hideSavingsBalance ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color="#64748B"
                  />
                </TouchableOpacity>
                <View style={styles.miniIconCircle}>
                  <FontAwesome5 name="piggy-bank" size={12} color="#00D084" />
                </View>
              </View>
            </View>
            <Text style={styles.subCardAmount}>
              {hideSavingsBalance ? `${formatCurrency('')} **` : formatCurrency(0)}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.subCardFooterText}>Total Savings</Text>
          </TouchableOpacity>

          {/* ACTIVE LOAN CARD */}
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => navigateTo('CoopCredit')}
          >
            <View style={styles.subCardHeader}>
              <Text style={styles.subCardTitle}>Active Loan</Text>
              <View style={styles.subCardHeaderIcons}>
                <TouchableOpacity onPress={() => setHideLoanBalance(!hideLoanBalance)}>
                  <Ionicons
                    name={hideLoanBalance ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color="#64748B"
                  />
                </TouchableOpacity>
                <View style={styles.miniIconCircle}>
                  <Ionicons name="wallet-outline" size={13} color="#00D084" />
                </View>
              </View>
            </View>
            <Text style={styles.subCardAmount}>
              {hideLoanBalance ? `${formatCurrency('')} **` : formatCurrency(50000)}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.subCardFooterText}>
              Paid: {hideLoanBalance ? `${formatCurrency('')}**` : formatCurrency(10000)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FINANCIAL SERVICES SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Services</Text>
          <TouchableOpacity onPress={() => navigateTo('FinancialServices')}>
            <Text style={styles.viewAllText}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('CoopContribution')}
          >
            <LinearGradient colors={['#008767', '#00382B']} style={styles.serviceIconContainer}>
              <FontAwesome5 name="piggy-bank" size={18} color="#FFF" />
            </LinearGradient>
            <Text style={styles.serviceLabel}>Coop Contribution</Text>
            <Text style={styles.serviceSubtext}>Deposit weekly or monthly savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('AccountStatement')}
          >
            <LinearGradient colors={['#4F86F7', '#1D4ED8']} style={styles.serviceIconContainer}>
              <Ionicons name="document-text-outline" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.serviceLabel}>Account Statement</Text>
            <Text style={styles.serviceSubtext}>Download report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('RequestLoan')}
          >
            <LinearGradient colors={['#D97706', '#78350F']} style={styles.serviceIconContainer}>
              <FontAwesome5 name="hand-holding-usd" size={18} color="#FFF" />
            </LinearGradient>
            <Text style={styles.serviceLabel}>Request Loan</Text>
            <Text style={styles.serviceSubtext}>Apply for member credit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('RepayLoan')}
          >
            <LinearGradient colors={['#8B5CF6', '#4C1D95']} style={styles.serviceIconContainer}>
              <Ionicons name="card-outline" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.serviceLabel}>Repay Loan</Text>
            <Text style={styles.serviceSubtext}>Make loan repayments</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* COOP AI ASSISTANT BANNER */}
        <View style={styles.aiBanner}>
          <View style={styles.aiLeft}>
            <View style={styles.botIconWrapper}>
              <MaterialCommunityIcons name="robot-outline" size={24} color="#E2E8F0" />
            </View>
            <View style={styles.aiTextGroup}>
              <Text style={styles.aiTitle}>Coop AI Assistant</Text>
              <Text style={styles.aiSubtext}>
                Ask questions about your savings or loan limits.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.askNowBtn}
            onPress={() => navigateTo('AIAssistant')}
          >
            <Text style={styles.askNowText}>ASK NOW</Text>
          </TouchableOpacity>
        </View>

        {/* COOPERATIVE HUB SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cooperative Hub</Text>
          <TouchableOpacity onPress={() => navigateTo('Marketplace')}>
            <Text style={styles.viewAllText}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.hubListItem}
          onPress={() => navigateTo('LandProperty')}
        >
          <View style={styles.hubLeft}>
            <View style={[styles.hubIconCircle, { backgroundColor: '#059669' }]}>
              <Ionicons name="home-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.hubTextContainer}>
              <Text style={styles.hubItemTitle}>Land & Property</Text>
              <Text style={styles.hubItemSub}>
                Acquire plots with flexible payment plans
              </Text>
            </View>
          </View>
          <View style={styles.hubRight}>
            <View style={styles.hubTagIcon}>
              <Ionicons name="location-outline" size={16} color="#00D084" />
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hubListItem}
          onPress={() => navigateTo('Vehicles')}
        >
          <View style={styles.hubLeft}>
            <View style={[styles.hubIconCircle, { backgroundColor: '#2563EB' }]}>
              <Ionicons name="car-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.hubTextContainer}>
              <Text style={styles.hubItemTitle}>Vehicles</Text>
              <Text style={styles.hubItemSub}>Member auto financing options</Text>
            </View>
          </View>
          <View style={styles.hubRight}>
            <View style={styles.hubTagIcon}>
              <Ionicons name="car-sport-outline" size={16} color="#00D084" />
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hubListItem}
          onPress={() => navigateTo('MeetingChat')}
        >
          <View style={styles.hubLeft}>
            <View style={[styles.hubIconCircle, { backgroundColor: '#9333EA' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.hubTextContainer}>
              <Text style={styles.hubItemTitle}>Meeting Chat</Text>
              <Text style={styles.hubItemSub}>Discuss & decide with members</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07120E',
  },
  fixedTop: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#07120E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingText: { color: '#94A3B8', fontSize: 14, fontWeight: '400' },
  userName: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  societyName: { color: '#94A3B8', fontSize: 13 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#12221D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  adminButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D084',
  },
  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metallicCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
  },
  cardLeft: { justifyContent: 'space-between' },
  cardLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  balanceText: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginVertical: 10 },
  addFundBtn: {
    backgroundColor: '#005F4B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  addFundText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  watermarkContainer: { alignItems: 'center', opacity: 0.8 },
  emblemOutline: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  watermarkTitle: { color: '#E2E8F0', fontSize: 10, fontWeight: '600', marginTop: 4 },
  watermarkSub: { color: '#94A3B8', fontSize: 9 },
  showBalanceBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  showBalanceText: { color: '#FFF', fontSize: 12 },
  dualCardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  subCard: {
    flex: 1,
    backgroundColor: '#0F1E1A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#172C27',
  },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subCardTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '500' },
  subCardHeaderIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#162924',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardAmount: { color: '#FFF', fontSize: 20, fontWeight: '700', marginVertical: 10 },
  divider: { height: 1, backgroundColor: '#172C27', marginBottom: 8 },
  subCardFooterText: { color: '#64748B', fontSize: 11 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  viewAllText: { color: '#00D084', fontSize: 13, fontWeight: '500' },
  servicesScroll: { marginBottom: 20 },
  serviceItem: {
    width: 120,
    backgroundColor: '#0F1E1A',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#172C27',
    alignItems: 'center',
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  serviceSubtext: { color: '#64748B', fontSize: 9, textAlign: 'center', lineHeight: 11 },
  aiBanner: {
    backgroundColor: '#0F1E1A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#172C27',
    marginBottom: 20,
  },
  aiLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  botIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#162924',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextGroup: { flex: 1 },
  aiTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  aiSubtext: { color: '#64748B', fontSize: 10, marginTop: 2 },
  askNowBtn: {
    backgroundColor: '#00D084',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  askNowText: { color: '#07120E', fontSize: 11, fontWeight: '700' },
  hubListItem: {
    backgroundColor: '#0F1E1A',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#172C27',
  },
  hubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hubIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  hubItemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hubItemSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  hubRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubTagIcon: {
    backgroundColor: '#12221D',
    padding: 6,
    borderRadius: 8,
    marginRight: 8,
  },
});
