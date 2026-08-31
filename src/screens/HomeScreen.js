import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Pressable,
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
import { COLORS, GRADIENTS } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

/**
 * FIXED gradient for the "Available Balance" hero card on the Dashboard.
 * This card intentionally does NOT follow the theme: it always keeps its
 * dark-green metallic appearance in both light and dark mode. We hardcode the
 * colours here so syncStaticTheme() (which swaps GRADIENTS.metallicDashboard
 * between modes) can never change this card's look.
 */
const AVAILABLE_BALANCE_GRADIENT = ['#1A3327', '#132A20', '#0E211A', '#0A1A13'];

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  // Centralized currency formatter � explicit Unicode escape so the ? symbol
  // never suffers source-file encoding corruption (₦ mojibake).
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
  // Supabase auth metadata full name (user_metadata.full_name) participates in
  // the resolution chain between the saved profile name and email derivation.
  const metadataName = user?.user_metadata?.full_name || null;
  const displayName =
    savedName ||
    metadataName ||
    authDisplayName ||
    (userEmail ? deriveDisplayName(userEmail) : 'Member');
  const isAdminVisible = isAdminAccount(userEmail);
  // Auditor access: a user whose profile role is 'auditor' gets the dedicated
  // financial AuditScreen instead of the standard user menu.
  const isAuditor = user?.role === 'auditor';
  // Dual-role popup: auditors who are ALSO admins choose their destination.
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const handleTopMenuPress = () => {
    if (isAuditor && isAdminVisible) {
      setRoleMenuVisible(true);
    } else if (isAuditor) {
      navigateTo('AuditDashboard');
    } else {
      navigateTo('ProfileSettings');
    }
  };

  // Global admin verification: biometric prompt ? PIN keypad fallback.
  // Navigation to AdminSettings happens ONLY when access is granted.
  const { requestAdminAccess } = useAdminLock();
  const handleShieldAccess = async () => {
    const granted = await requestAdminAccess();
    if (granted && navigation?.navigate) {
      navigation.navigate('AdminSettings');
    }
  };

  // SECRET ADMIN TRIGGER � hidden on the brand logo inside the balance card.
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
  const navigateTo = (screenName, params) => {
    if (navigation && navigation.navigate) {
      navigation.navigate(screenName, params);
    } else {
      console.log('Navigating to screen: ' + screenName);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor='#06130D' />

      {/* Dual-role destination picker (admin + auditor accounts only) */}
      <Modal
        visible={roleMenuVisible}
        transparent
        animationType='fade'
        onRequestClose={() => setRoleMenuVisible(false)}
      >
        <Pressable
          style={styles.roleMenuOverlay}
          onPress={() => setRoleMenuVisible(false)}
        >
          <View style={styles.roleMenuCard}>
            <Text style={styles.roleMenuTitle}>Open Dashboard</Text>
            <TouchableOpacity
              style={styles.roleMenuItem}
              onPress={() => {
                setRoleMenuVisible(false);
                navigateTo('AdminSettings');
              }}
            >
              <Ionicons name='settings-outline' size={18} color={colors.primary} />
              <Text style={styles.roleMenuText}>Admin Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roleMenuItem}
              onPress={() => {
                setRoleMenuVisible(false);
                navigateTo('AuditDashboard');
              }}
            >
              <Ionicons name='clipboard-outline' size={18} color={colors.primary} />
              <Text style={styles.roleMenuText}>Audit Dashboard</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* FIXED TOP — Header + Available Balance Card stay static on screen */}
      <View style={styles.fixedTop}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <View>
            <Greeting textStyle={styles.greetingText} weather={env.weather} />
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.badgeRow}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.mintAccent} />
              <Text style={styles.societyName}>Standard Mutual Savings</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => navigateTo('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color='#FFFFFF' />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileCircle}
              onPress={() => navigateTo('Profile')}
            >
              <Ionicons name="person-outline" size={20} color='#06130D' />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircle}
              onPress={handleTopMenuPress}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color='#FFFFFF' />
            </TouchableOpacity>
          </View>
        </View>

        {/* METALLIC MAIN BALANCE CARD — intentionally theme-independent (see
            AVAILABLE_BALANCE_GRADIENT above): always dark-green, never swapped
            to the light palette by syncStaticTheme(). */}
        <LinearGradient
          colors={AVAILABLE_BALANCE_GRADIENT}
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
              <Ionicons name="lock-closed" size={14} color='#FFFFFF' />
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
                <FontAwesome5 name="university" size={24} color='#D1D5DB' />
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
                color='#FFFFFF'
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <View style={styles.miniIconCircle}>
                  <FontAwesome5 name="piggy-bank" size={12} color={colors.primary} />
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
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <View style={styles.miniIconCircle}>
                  <Ionicons name="wallet-outline" size={13} color={colors.primary} />
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Services</Text>
          <TouchableOpacity onPress={() => navigateTo('FinancialServices')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('CoopContribution')}
          >
            <LinearGradient colors={GRADIENTS.greenService} style={styles.serviceIconContainer}>
              <FontAwesome5 name="piggy-bank" size={16} color={isDark ? colors.text : '#FFFFFF'} />
            </LinearGradient>
            <Text style={[styles.serviceLabel, { color: colors.text }]}>Coop Contribution</Text>
            <Text style={[styles.serviceSubtext, { color: colors.textSecondary }]}>Deposit weekly or monthly savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('AccountStatement')}
          >
            <LinearGradient colors={GRADIENTS.blueService} style={styles.serviceIconContainer}>
              <Ionicons name="document-text-outline" size={18} color={isDark ? colors.text : '#FFFFFF'} />
            </LinearGradient>
            <Text style={[styles.serviceLabel, { color: colors.text }]}>Account Statement</Text>
            <Text style={[styles.serviceSubtext, { color: colors.textSecondary }]}>Download report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('RequestLoan')}
          >
            <LinearGradient colors={GRADIENTS.orangeService} style={styles.serviceIconContainer}>
              <FontAwesome5 name="hand-holding-usd" size={16} color={isDark ? colors.text : '#FFFFFF'} />
            </LinearGradient>
            <Text style={[styles.serviceLabel, { color: colors.text }]}>Request Loan</Text>
            <Text style={[styles.serviceSubtext, { color: colors.textSecondary }]}>Apply for member credit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => navigateTo('RepayLoan')}
          >
            <LinearGradient colors={GRADIENTS.purpleService} style={styles.serviceIconContainer}>
              <Ionicons name="card-outline" size={18} color={isDark ? colors.text : '#FFFFFF'} />
            </LinearGradient>
            <Text style={[styles.serviceLabel, { color: colors.text }]}>Repay Loan</Text>
            <Text style={[styles.serviceSubtext, { color: colors.textSecondary }]}>Make loan repayments</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* COOP AI ASSISTANT BANNER */}
        <View style={[styles.aiBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aiLeft}>
            <View style={[styles.botIconWrapper, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.aiTextGroup}>
              <Text style={[styles.aiTitle, { color: colors.text }]}>Coop AI Assistant</Text>
              <Text style={[styles.aiSubtext, { color: colors.textSecondary }]}>
                Ask questions about your savings or loan limits.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.askNowBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo('AIAssistant')}
          >
            <Text style={[styles.askNowText, { color: colors.background }]}>ASK NOW</Text>
          </TouchableOpacity>
        </View>

        {/* COOPERATIVE HUB SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cooperative Hub</Text>
          <TouchableOpacity onPress={() => navigateTo('Marketplace')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.hubListItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigateTo('Marketplace', { category: 'land_and_property' })}
        >
          <View style={styles.hubLeft}>
            <View style={[styles.hubIconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons name="home-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.hubTextContainer}>
              <Text style={[styles.hubItemTitle, { color: colors.text }]}>Land & Property</Text>
              <Text style={[styles.hubItemSub, { color: colors.textSecondary }]}>
                Acquire plots with flexible payment plans
              </Text>
            </View>
          </View>
          <View style={styles.hubRight}>
            <View style={[styles.hubTagIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubListItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigateTo('Marketplace', { category: 'vehicles_and_appliances' })}
        >
          <View style={styles.hubLeft}>
            <View style={[styles.hubIconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons name="car-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.hubTextContainer}>
              <Text style={[styles.hubItemTitle, { color: colors.text }]}>Vehicles</Text>
              <Text style={[styles.hubItemSub, { color: colors.textSecondary }]}>Member auto financing options</Text>
            </View>
          </View>
          <View style={styles.hubRight}>
            <View style={[styles.hubTagIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name="car-sport-outline" size={16} color={colors.primary} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubListItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigateTo('MeetingChat')}
        >
          <View style={styles.hubLeft}>
            <View style={[styles.hubIconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.hubTextContainer}>
              <Text style={[styles.hubItemTitle, { color: colors.text }]}>Meeting Chat</Text>
              <Text style={[styles.hubItemSub, { color: colors.textSecondary }]}>Discuss & decide with members</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedTop: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#06130D',
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
  greetingText: { color: '#A7F3D0', fontSize: 14, fontWeight: '400' },
  userName: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  societyName: { color: '#A7F3D0', fontSize: 13 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  adminButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accentGreen,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.mintAccent,
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
  cardLabel: { color: '#A7F3D0', fontSize: 13, fontWeight: '500' },
  balanceText: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginVertical: 10 },
  addFundBtn: {
    backgroundColor: COLORS.addFundDeep,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  addFundText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
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
  showBalanceText: { color: '#FFFFFF', fontSize: 12 },
  dualCardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  subCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subCardTitle: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  subCardHeaderIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardAmount: { color: colors.text, fontSize: 18, fontWeight: '700', marginVertical: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 8 },
  subCardFooterText: { color: colors.textSecondary, fontSize: 10.5 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  viewAllText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  servicesScroll: { marginBottom: 20 },
  serviceItem: {
    width: 104,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  serviceIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceLabel: {
    color: colors.text,
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 3,
  },
  serviceSubtext: { color: colors.textSecondary, fontSize: 9, textAlign: 'center', lineHeight: 11 },
  aiBanner: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  aiLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  botIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextGroup: { flex: 1 },
  aiTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  aiSubtext: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  askNowBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  askNowText: { color: colors.background, fontSize: 11, fontWeight: '700' },
  hubListItem: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  hubItemSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  hubRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubTagIcon: {
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  roleMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 90,
    paddingRight: 20,
  },
  roleMenuCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleMenuTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  roleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  roleMenuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

const styles = makeStyles(themes.darkEmerald, true);

