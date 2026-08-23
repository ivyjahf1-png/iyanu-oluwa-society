import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import SafeImage from '../components/SafeImage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Eye,
  EyeOff,
  Plus,
  Bell,
  User,
  ShieldCheck,
  PiggyBank,
  Wallet,
  Landmark,
  CreditCard,
  FileText,
  Smartphone,
  Database,
  Bot,
  Home,
  Car,
  MapPin,
  ChevronRight,
  MessageSquare,
  Lock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { deriveDisplayName } from '../auth/authService';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { useBanners } from '../context/BannerContext';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS, GRADIENTS } from '../constants/theme';
import { useTransactions } from '../context/TransactionsContext';

export default function HomeScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { user } = useUser();

  // Guarded theme access — the context carries a built-in default, and this
  // fallback object guarantees `colors` is always defined for consumers.
  const themeCtx = useContext(ThemeContext) || {};
  const colors = themeCtx?.colors || {
    background: '#091813',
    card: '#132620',
    primary: '#10B981',
    text: '#FFFFFF',
    subtext: '#8EA89D',
    border: '#172F27',
  };
  const { userEmail } = useAuth();
  // Display name comes from the authenticated user's email
  // (temitope.adewale@gmail.com -> "Temitope Adewale"); falls back to the
  // saved profile name when no auth email exists yet.
  const displayName = userEmail
    ? deriveDisplayName(userEmail)
    : user?.fullName || 'Member';

  // Announcements: badge on the bell + drop-down banner for the latest unread.
  const { unreadAnnouncements, dismissAnnouncement } = useAnnouncements();
  const latestAnnouncement = unreadAnnouncements[0] || null;
  const hasUnread = unreadAnnouncements.length > 0;

  // Promotional banner popup (admin-created, cooperative content only).
  const { visibleBanners, activeBanners, dismissBanner } = useBanners();
  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  // Show the first visible banner automatically; auto-rotate every 2 hours.
  useEffect(() => {
    if (visibleBanners.length > 0) {
      setBannerIndex((i) => (bannerIndex >= visibleBanners.length ? 0 : bannerIndex));
      const t = setTimeout(() => setBannerOpen(true), 600);
      const rotate = setInterval(
        () => setBannerIndex((i) => (i + 1) % Math.max(visibleBanners.length, 1)),
        2 * 60 * 60 * 1000 // 2 hours
      );
      return () => { clearTimeout(t); clearInterval(rotate); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBanners.length]);

  const currentBanner = visibleBanners[bannerIndex] || visibleBanners[0] || null;

  // Existing state handlers preserved: visibility toggles for each balance area.
  const [showBalance, setShowBalance] = useState(false);
  const [showSavings, setShowSavings] = useState(true);
  const [showLoan, setShowLoan] = useState(false);

  // Dynamic (non-hardcoded) account amounts — derived from the real
  // transaction ledger (start at ₦0.00 for new members).
  const { totalSavings, loanOutstanding, totalPaid } = useTransactions();
  const balance = Number(totalSavings).toFixed(2);
  const savings = Number(totalSavings).toFixed(2);
  const loan = Number(loanOutstanding).toFixed(2);
  const paid = Number(totalPaid).toFixed(2);

  // Expanded "View All" states for Financial Services & Co-op Hub.
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllHub, setShowAllHub] = useState(false);

  // Data purchase — network provider selection modal.
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor='#091813' />

      {/* ===== STICKY HEADER & BALANCE SECTION (pinned above the scroll) ===== */}
      <View style={styles.headerSection}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <Text style={styles.greetingLine}>Good morning,</Text>
              <Text style={styles.greetingName}>{displayName}</Text>
              <View style={styles.societyRow}>
                <ShieldCheck size={14} color="#4ADE80" />
                <Text style={styles.societyText}>Iyanu Oluwa Society</Text>
              </View>
            </View>
            <View style={styles.greetingIcons}>
              <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={18} color="#FFFFFF" />
                {hasUnread ? <View style={styles.notifDot} /> : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('ProfileSettings')}>
                {user.avatarUri ? (
                  <SafeImage source={{ uri: user.avatarUri }} style={styles.avatarImage} />
                ) : (
                  <User size={18} color="#0B2217" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Available Balance Card — metallic diagonal gradient */}
          <LinearGradient
            colors={GRADIENTS.metallicCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metallicCard}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {showBalance ? `₦${balance ?? '0.00'}` : '₦ **'}
              </Text>
              <TouchableOpacity
                style={styles.addFundBtn}
                onPress={() => Alert.alert('Coming Soon', 'Online funding will be available soon. Please use the Coop Contribution option to deposit.')}
              >
                <Lock size={14} color="#FFFFFF" />
                <Text style={styles.addFundText}>+ Add Fund</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardRight}>
              <View style={styles.watermarkContainer}>
                <Landmark size={36} color="#A0AEC0" />
                <Text style={styles.watermarkTitle}>Iyanu Oluwa Society</Text>
                <Text style={styles.watermarkSub}>Community</Text>
              </View>

              <TouchableOpacity
                style={styles.showBalanceBtn}
                onPress={() => setShowBalance(!showBalance)}
              >
                {showBalance ? (
                  <Eye size={14} color="#FFFFFF" />
                ) : (
                  <EyeOff size={14} color="#FFFFFF" />
                )}
                <Text style={styles.showBalanceText}>
                  {showBalance ? 'Hide Balance' : 'Show Balance'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

        </View>

        {/* ===== ANNOUNCEMENT DROP-DOWN BANNER (stays until dismissed) ===== */}
        {latestAnnouncement && (
          <View style={styles.announceBanner}>
            <View style={styles.announceIconWrap}>
              <Bell size={18} color='#10B981' />
            </View>
            <View style={styles.announceTextGroup}>
              <Text style={styles.announceTitle} numberOfLines={1}>
                {latestAnnouncement.title}
              </Text>
              <Text style={styles.announceMessage} numberOfLines={2}>
                {latestAnnouncement.message}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.announceDismiss}
              onPress={() => dismissAnnouncement(latestAnnouncement.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.announceDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== SCROLLABLE DASHBOARD CONTENT (scrolls under sticky header) ===== */}
        <ScrollView style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, styles.grow]}
        >
        {/* ============ WHITE CONTENT CONTAINER ============ */}
        <View style={styles.whiteSection}>

          {/* ============ DUAL SUMMARY CARDS ============ */}
          <View style={styles.dualCardRow}>
            {/* Savings card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Savings</Text>
                <TouchableOpacity onPress={() => setShowSavings(!showSavings)}>
                  {showSavings ? <EyeOff size={16} color='#8EA89D' /> : <Eye size={16} color='#8EA89D' />}
                </TouchableOpacity>
                <View style={styles.summaryBadge}>
                  <PiggyBank size={18} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.summaryAmount}>{showSavings ? `₦${savings ?? "0.00"}` : '₦ **'}</Text>
              <View style={styles.summaryDivider} />
              <Text style={styles.summarySub}>Total Savings</Text>
            </View>

            {/* Active Loan card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Active Loan</Text>
                <TouchableOpacity onPress={() => setShowLoan(!showLoan)}>
                  {showLoan ? <EyeOff size={16} color='#8EA89D' /> : <Eye size={16} color='#8EA89D' />}
                </TouchableOpacity>
                <View style={styles.summaryBadge}>
                  <Wallet size={18} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.summaryAmount}>{showLoan ? `₦${loan ?? "0.00"}` : '₦ **'}</Text>
              <View style={styles.summaryDivider} />
              <Text style={styles.summarySub}>Paid: ₦{showLoan ? (paid ?? "0.00") : "**"}</Text>
            </View>
          </View>

          {/* ============ FINANCIAL SERVICES ============ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Financial Services</Text>
            <TouchableOpacity onPress={() => setShowAllServices(!showAllServices)}>
              <Text style={styles.viewAllText}>View All &gt;</Text>
            </TouchableOpacity>
          </View>
          {/* Colorful gradient badge definitions for each service */}
          <View style={styles.serviceGrid}>
            {[
              {
                key: 'coop',
                title: 'Coop Contribution',
                desc: 'Deposit weekly or monthly savings',
                Icon: PiggyBank,
                badge: '#0D4035',
                iconTint: '#10B981',
                route: 'AddFunds',
                isNew: true,
              },
              {
                key: 'statement',
                title: 'Account Statement',
                desc: 'Download report',
                Icon: FileText,
                badge: '#1D303E',
                iconTint: '#38BDF8',
                route: 'AccountStatement',
              },
              {
                key: 'request',
                title: 'Request Loan',
                desc: 'Apply for member credit',
                Icon: Landmark,
                badge: '#3E2718',
                iconTint: '#F97316',
                route: 'RequestLoan',
              },
              {
                key: 'repay',
                title: 'Repay Loan',
                desc: 'Make loan payments',
                Icon: CreditCard,
                badge: '#2A1E3E',
                iconTint: '#A855F7',
                route: 'RepayLoan',
              },
            ].map(({ key, title, desc, Icon, badge, iconTint, route, isNew }) => (
              <TouchableOpacity
                key={key}
                style={styles.serviceCard}
                onPress={route ? () => navigation.navigate(route) : undefined}
              >
                <View>
                  <LinearGradient
                    colors={[badge, badge]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.serviceIconBadge}
                  >
                    <Icon size={22} color={iconTint} />
                  </LinearGradient>
                  {isNew ? (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.serviceTitle}>{title}</Text>
                <Text style={styles.serviceDesc}>{desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expanded services — includes the Data purchase option */}
          {showAllServices && (
            <View style={styles.expandedServices}>
              <TouchableOpacity
                style={styles.expandedRow}
                onPress={() => setShowNetworkModal(true)}
              >
                <LinearGradient
                  colors={['#14B8A6', '#0D9488']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.expandedBadge}
                >
                  <Database size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.expandedTitle}>Data</Text>
                <Text style={styles.expandedHint}>Purchase data bundles</Text>
                <ChevronRight size={18} color='#8EA89D' />
              </TouchableOpacity>
            </View>
          )}

          {/* ============ AI ASSISTANT BANNER ============ */}
          <TouchableOpacity
            style={styles.aiBanner}
            onPress={() => navigation.navigate('AIAssistant')}
          >
            <View style={styles.aiIconWrap}>
              <Bot size={26} color="#FFFFFF" />
            </View>
            <View style={styles.aiTextGroup}>
              <View style={styles.aiTitleRow}>
                <Text style={styles.aiTitle}>Coop AI Assistant</Text>
                <View style={styles.betaPill}>
                  <Text style={styles.betaText}>BETA</Text>
                </View>
              </View>
              <Text style={styles.aiSub}>Ask questions about your savings or loan limits.</Text>
            </View>
            <View style={styles.askNowBtn}>
              <Text style={styles.askNowText}>Ask Now &gt;</Text>
            </View>
          </TouchableOpacity>

          {/* ============ COOPERATIVE HUB ============ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Cooperative Hub</Text>
            <TouchableOpacity onPress={() => setShowAllHub(!showAllHub)}>
              <Text style={styles.viewAllText}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hubList}>
            {/* Land & Property */}
            <TouchableOpacity
              style={styles.hubRow}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <LinearGradient
                colors={['#10B981', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hubIconWrap}
              >
                <Home size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.hubTextGroup}>
                <Text style={styles.hubTitle}>Land &amp; Property</Text>
                <Text style={styles.hubDesc}>Acquire plots with flexible payment plans</Text>
              </View>
              <View style={styles.hubThumb}>
                <MapPin size={16} color="#FFFFFF" />
              </View>
              <ChevronRight size={18} color='#8EA89D' />
            </TouchableOpacity>

            {/* Vehicles */}
            <TouchableOpacity
              style={styles.hubRow}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <LinearGradient
                colors={['#2563EB', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hubIconWrap}
              >
                <Car size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.hubTextGroup}>
                <Text style={styles.hubTitle}>Vehicles</Text>
                <Text style={styles.hubDesc}>Member auto financing options</Text>
              </View>
              <View style={styles.hubThumbCar}>
                <Car size={16} color="#FFFFFF" />
              </View>
              <ChevronRight size={18} color='#8EA89D' />
            </TouchableOpacity>

            {/* Preserved route: Meeting Chat */}
            <TouchableOpacity
              style={styles.hubRow}
              onPress={() => navigation.navigate('MeetingChat')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hubIconWrap}
              >
                <MessageSquare size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.hubTextGroup}>
                <Text style={styles.hubTitle}>Meeting Chat</Text>
                <Text style={styles.hubDesc}>Discuss &amp; decide with members</Text>
              </View>
              <ChevronRight size={18} color='#8EA89D' />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Data purchase — network provider selection modal */}
      <Modal visible={showNetworkModal} transparent animationType="slide">
        <View style={styles.networkOverlay}>
          <View style={styles.networkSheet}>
            <Text style={styles.networkTitle}>Select Network</Text>
            <Text style={styles.networkSub}>Choose a provider for your data purchase</Text>

            {[
              { key: 'MTN', label: 'MTN', color: '#FFCC00', text: '#000000' },
              { key: 'AIRTEL', label: 'Airtel', color: '#E40000', text: '#FFFFFF' },
              { key: 'GLO', label: 'Glo', color: '#43B02A', text: '#FFFFFF' },
              { key: 'NINEMOBILE', label: '9mobile', color: '#00694B', text: '#FFFFFF' },
            ].map(n => (
              <TouchableOpacity
                key={n.key}
                style={styles.networkRow}
                onPress={() => {
                  setShowNetworkModal(false);
                  navigation.navigate('AirtimeData', { provider: n.key, txType: 'data' });
                }}
              >
                <View style={[styles.networkLogo, { backgroundColor: n.color }]}>
                  <Text style={[styles.networkLogoText, { color: n.text }]}>
                    {n.label.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.networkName}>{n.label}</Text>
                <ChevronRight size={18} color="#9CB8A6" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.networkCancel}
              onPress={() => setShowNetworkModal(false)}
            >
              <Text style={styles.networkCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Promotional banner popup (admin-created, cooperative content only) */}
      <Modal visible={bannerOpen && !!currentBanner} transparent animationType="fade">
        <View style={styles.bannerPopupOverlay}>
          <View style={styles.bannerPopupCard}>
            {currentBanner?.imageUri ? (
              <SafeImage
                source={{ uri: currentBanner.imageUri }}
                style={currentBanner.kind === 'photo' ? styles.bannerPopupPhoto : styles.bannerPopupImage}
              />
            ) : null}
            {currentBanner?.kind !== 'photo' && (
              <View style={styles.bannerPopupBody}>
                {!!currentBanner?.title && (
                  <Text style={styles.bannerPopupTitle}>{currentBanner.title}</Text>
                )}
                {!!currentBanner?.description && (
                  <Text style={styles.bannerPopupDesc}>{currentBanner.description}</Text>
                )}
                {!!currentBanner?.category && (
                  <Text style={styles.bannerPopupCategory}>{currentBanner.category}</Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={styles.bannerDismissBtn}
              onPress={() => {
                if (currentBanner) dismissBanner(currentBanner.id);
                setBannerOpen(false);
              }}
            >
              <Text style={styles.bannerDismissText}>Maybe Later</Text>
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
  // Page — deep-green matching the reference
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Announcement drop-down banner
  announceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.cardBg,
      borderRadius: 14,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 10,
      borderWidth: 1,
      borderColor: COLORS.emeraldAccent,
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    announceIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#E8F5E9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    announceTextGroup: { flex: 1 },
    announceTitle: {
      color: COLORS.background,
      fontSize: 13,
      fontWeight: 'bold',
    },
    announceMessage: {
      color: '#E2E8F0',
      fontSize: 11,
      marginTop: 2,
    },
    announceDismiss: {
      backgroundColor: COLORS.emeraldAccent,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginLeft: 8,
    },
    announceDismissText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  // Sticky header section (deep green) — pinned above the scrolling dashboard
  headerSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingLine: {
    color: '#8EA89D',
    fontSize: 14,
    fontWeight: '400',
  },
  greetingName: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  societyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  societyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  greetingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D2D27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.emeraldAccent,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Available Balance Card — distinct neon green outline so it stands apart
  metallicCard: {
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A3E37',
  },
  cardLeft: { justifyContent: 'space-between' },
  balanceLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  addFundBtn: {
    backgroundColor: '#0D4035',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  addFundText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  watermarkContainer: { alignItems: 'center', opacity: 0.75 },
  watermarkTitle: { color: '#E2E8F0', fontSize: 10, fontWeight: '600', marginTop: 4 },
  watermarkSub: { color: COLORS.textSecondary, fontSize: 9 },
  showBalanceBtn: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  showBalanceText: { color: '#FFFFFF', fontSize: 12 },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  // White rounded content container — inverted to deep forest green per design
  whiteSection: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // Dual summary cards — deep green monochrome
  dualCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D2D27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#1C3028',
    marginVertical: 8,
  },
  summarySub: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  // Financial Services
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  serviceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    width: '24%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  serviceIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: COLORS.emeraldAccent,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: 'bold',
  },
  serviceTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  serviceDesc: {
    color: COLORS.textSecondary,
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  expandedServices: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  expandedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  expandedTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  expandedHint: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginLeft: 8,
  },
  // AI Assistant Banner — deep green monochrome with light green accents
  aiBanner: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.emeraldAccent,
  },
  aiIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.emeraldAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiTextGroup: {
    flex: 1,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  betaPill: {
    backgroundColor: COLORS.emeraldAccent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  aiSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  askNowBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  askNowText: { color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Cooperative Hub — deep green monochrome
  hubList: {
    marginBottom: 10,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.emeraldAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  hubTextGroup: {
    flex: 1,
  },
  hubTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  hubDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  // Network provider selection modal
  networkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  networkSheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  networkTitle: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  networkSub: {
    color: '#4B6358',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  networkLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkLogoText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  networkName: {
    flex: 1,
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  networkCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  networkCancelText: {
    color: '#4B6358',
    fontSize: 13,
    fontWeight: '600',
  },
  hubThumb: {
    width: 46,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#132620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hubThumbCar: {
    width: 46,
    height: 34,
    borderRadius: 6,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  // Promotional banner popup
  bannerPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bannerPopupCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.emeraldAccent,
  },
  bannerPopupImage: { width: '100%', height: 160 },
  bannerPopupPhoto: { width: '100%', height: 260 },
  bannerPopupBody: { padding: 16 },
  bannerPopupTitle: { color: COLORS.background, fontSize: 18, fontWeight: 'bold' },
  bannerPopupDesc: { color: '#E2E8F0', fontSize: 13, marginTop: 6, lineHeight: 19 },
  bannerPopupCategory: {
    color: COLORS.emeraldAccent, fontSize: 11, fontWeight: '600', marginTop: 8,
    backgroundColor: '#E8F5E9', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden',
  },
  bannerDismissBtn: {
    margin: 14, marginTop: 6,
    backgroundColor: COLORS.emeraldAccent, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  bannerDismissText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
