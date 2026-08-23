import React, { useState } from 'react';
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
import { useTransactions } from '../context/TransactionsContext';

export default function HomeScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { user } = useUser();
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
      <StatusBar barStyle="dark-content" backgroundColor="#0B2211" />

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

          {/* Available Balance Card — diagonal green→white split */}
          <View style={styles.balanceCard}>
            {/* Diagonal white split panel (right side) */}
            <View style={styles.cardSplit} />

            {/* Watermark (classical building pillar) over the split */}
            <View style={styles.watermark}>
              <Landmark size={150} color="#0B2211" />
            </View>

            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.eyeToggle}>
                {showBalance ? <EyeOff size={18} color="#FFFFFF" /> : <Eye size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>{showBalance ? `₦${balance ?? "0.00"}` : '₦ **'}</Text>
            <Text style={styles.balanceTag}>Iyanu Oluwa Society</Text>

            <View style={styles.balanceActions}>
              <TouchableOpacity
                style={styles.addFundBtn}
                onPress={() => Alert.alert('Coming Soon', 'Online funding will be available soon. Please use the Coop Contribution option to deposit.')}
              >
                <Lock size={15} color="#FFFFFF" />
                <Text style={styles.addFundText}>+ Add Fund</Text>
              </TouchableOpacity>
              <Text style={styles.addFundCaption}>Fund your account to save or pay</Text>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.hideBtn}>
                <EyeOff size={15} color="#0B2211" />
                <Text style={styles.hideText}>Hide</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ===== ANNOUNCEMENT DROP-DOWN BANNER (stays until dismissed) ===== */}
        {latestAnnouncement && (
          <View style={styles.announceBanner}>
            <View style={styles.announceIconWrap}>
              <Bell size={18} color="#4CAF50" />
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
                  {showSavings ? <EyeOff size={16} color="#98A2B3" /> : <Eye size={16} color="#98A2B3" />}
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
                  {showLoan ? <EyeOff size={16} color="#98A2B3" /> : <Eye size={16} color="#98A2B3" />}
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
                colors: ['#10B981', '#0D9488'],
                route: 'AddFunds',
                isNew: true,
              },
              {
                key: 'loan',
                title: 'Request Loan',
                desc: 'Apply for member credit',
                Icon: Landmark,
                colors: ['#2563EB', '#06B6D4'],
                route: 'RequestLoan',
              },
              {
                key: 'repay',
                title: 'Repay Loan',
                desc: 'Make loan repayments',
                Icon: CreditCard,
                colors: ['#F59E0B', '#EA580C'],
                route: 'RepayLoan',
              },
              {
                key: 'statement',
                title: 'Account Statement',
                desc: 'Download report',
                Icon: FileText,
                colors: ['#7C3AED', '#4F46E5'],
                route: 'AccountStatement',
              },
            ].map(({ key, title, desc, Icon, colors, route, isNew }) => (
              <TouchableOpacity
                key={key}
                style={styles.serviceCard}
                onPress={route ? () => navigation.navigate(route) : undefined}
              >
                <View>
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.serviceIconBadge}
                  >
                    <Icon size={22} color="#FFFFFF" />
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
                <ChevronRight size={18} color="#A7F3D0" />
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
              <ChevronRight size={18} color="#A7F3D0" />
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
              <ChevronRight size={18} color="#A7F3D0" />
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
              <ChevronRight size={18} color="#A7F3D0" />
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
    backgroundColor: '#0B2211',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Announcement drop-down banner
  announceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0F2A19',
      borderRadius: 14,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#4CAF50',
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
      color: '#0B2211',
      fontSize: 13,
      fontWeight: 'bold',
    },
    announceMessage: {
      color: '#C9D6CE',
      fontSize: 11,
      marginTop: 2,
    },
    announceDismiss: {
      backgroundColor: '#4CAF50',
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
    backgroundColor: '#0B2211',
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
    color: '#A7F3D0',
    fontSize: 15,
    fontWeight: '600',
  },
  greetingName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  societyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  societyText: {
    color: '#A7F3D0',
    fontSize: 12,
    marginLeft: 4,
  },
  greetingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0B1F12',
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
    backgroundColor: '#22C55E',
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F2A19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Available Balance Card — distinct neon green outline so it stands apart
  balanceCard: {
    backgroundColor: '#0B2A15',
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  cardSplit: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    right: -70,
    width: '62%',
    backgroundColor: '#0F2A19',
    transform: [{ rotate: '16deg' }],
  },
  watermark: {
    position: 'absolute',
    right: -14,
    top: 24,
    opacity: 0.35,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#D3F99D',
    fontSize: 13,
    fontWeight: '600',
  },
  eyeToggle: {
    padding: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceTag: {
    color: '#1F5C39',
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  balanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  addFundBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addFundText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  addFundCaption: {
    flex: 1,
    color: '#A7F3D0',
    fontSize: 10,
    lineHeight: 13,
    marginHorizontal: 2,
  },
  hideBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3E5C4C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  hideText: {
    color: '#0B2211',
    fontWeight: '600',
    fontSize: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  // White rounded content container — inverted to deep forest green per design
  whiteSection: {
    backgroundColor: '#0B2211',
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
    backgroundColor: '#0B2211',
    borderRadius: 16,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: '#1C4A2E',
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
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#1C4A2E',
    marginVertical: 8,
  },
  summarySub: {
    color: '#A7F3D0',
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
    fontSize: 15,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '600',
  },
  serviceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceCard: {
    backgroundColor: '#0B2211',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    width: '24%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C4A2E',
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
    backgroundColor: '#22C55E',
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
    color: '#A7F3D0',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  expandedServices: {
    backgroundColor: '#0B2211',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1C4A2E',
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C4A2E',
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
    color: '#A7F3D0',
    fontSize: 10,
    marginLeft: 8,
  },
  // AI Assistant Banner — deep green monochrome with light green accents
  aiBanner: {
    backgroundColor: '#0B2A15',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  aiIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4CAF50',
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  betaPill: {
    backgroundColor: '#4CAF50',
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
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 2,
  },
  askNowBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  askNowText: {
    color: '#FFFFFF',
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
    backgroundColor: '#0B2211',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4CAF50',
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
    color: '#A7F3D0',
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
    backgroundColor: '#0F2A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  networkTitle: {
    color: '#0B2211',
    fontSize: 16,
    fontWeight: 'bold',
  },
  networkSub: {
    color: '#93A69B',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C4A2E',
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
    color: '#0B2211',
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
    color: '#93A69B',
    fontSize: 13,
    fontWeight: '600',
  },
  hubThumb: {
    width: 46,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#123B24',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hubThumbCar: {
    width: 46,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#0F2A19',
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
    backgroundColor: '#0F2A19',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  bannerPopupImage: { width: '100%', height: 160 },
  bannerPopupPhoto: { width: '100%', height: 260 },
  bannerPopupBody: { padding: 16 },
  bannerPopupTitle: { color: '#0B2211', fontSize: 18, fontWeight: 'bold' },
  bannerPopupDesc: { color: '#C9D6CE', fontSize: 13, marginTop: 6, lineHeight: 19 },
  bannerPopupCategory: {
    color: '#4CAF50', fontSize: 11, fontWeight: '600', marginTop: 8,
    backgroundColor: '#E8F5E9', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden',
  },
  bannerDismissBtn: {
    margin: 14, marginTop: 6,
    backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  bannerDismissText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
