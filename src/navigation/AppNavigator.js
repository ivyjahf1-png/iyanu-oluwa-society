import React from 'react';
import { View, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, PiggyBank, Wallet, Users, Menu } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import SavingsHubScreen from '../screens/SavingsHubScreen';
import CoopHubScreen from '../screens/CoopHubScreen';
import MoreScreen from '../screens/MoreScreen';
import MeetingChatScreen from '../screens/MeetingChatScreen';
import CallScreen from '../screens/CallScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MarketplaceDetailScreen from '../screens/MarketplaceDetailScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminDepositsScreen from '../screens/AdminDepositsScreen';
import AirtimeDataScreen from '../screens/AirtimeDataScreen';
import CoopContributionScreen from '../screens/CoopContributionScreen';
import RepayLoanScreen from '../screens/RepayLoanScreen';
import RequestLoanScreen from '../screens/RequestLoanScreen';
import FundWalletScreen from '../screens/FundWalletScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AddFundsScreen from '../screens/AddFundsScreen';
import BankTransferScreen from '../screens/BankTransferScreen';
import AdminMarketplaceScreen from '../screens/AdminMarketplaceScreen';
import AdminLedgerScreen from '../screens/AdminLedgerScreen';
import AdminLoansScreen from '../screens/AdminLoansScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import AccountStatementScreen from '../screens/AccountStatementScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import AnnouncementsFeedScreen from '../screens/AnnouncementsFeedScreen';
import PastMeetingsScreen from '../screens/PastMeetingsScreen';
import AdminUserManagementScreen from '../screens/AdminUserManagementScreen';
import BannerManagerScreen from '../screens/BannerManagerScreen';
import CoopCreditScreen from '../screens/CoopCreditScreen';
import SocietyScreen from '../screens/SocietyScreen';
import MonthlyGeneralMeetingScreen from '../screens/MonthlyGeneralMeetingScreen';
import MeetingMinutesDetailScreen from '../screens/MeetingMinutesDetailScreen';
import VirtualMeetingRoomScreen from '../screens/VirtualMeetingRoomScreen';
import DividendDistributionScreen from '../screens/DividendDistributionScreen';
import AdminLoanDetailScreen from '../screens/AdminLoanDetailScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import NotificationScreen from '../screens/NotificationScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import KYCVerificationScreen from '../screens/KYCVerificationScreen';
import GuarantorRequestScreen from '../screens/GuarantorRequestScreen';
import GuarantorApprovalScreen from '../screens/GuarantorApprovalScreen';
import LoanScheduleScreen from '../screens/LoanScheduleScreen';
import SupportScreen from '../screens/SupportScreen';
import FinancialServicesScreen from '../screens/FinancialServicesScreen';
import AuditScreen from '../screens/AuditScreen';
import AddGoalScreen from '../screens/AddGoalScreen';
import AuditDashboardScreen from '../screens/AuditDashboardScreen';

import CoopTargetDetailsScreen from '../screens/CoopTargetDetailsScreen';
import AdminSavingsControlScreen from '../screens/AdminSavingsControlScreen';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { getIconScale } from '../lib/iconScale';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const fullScreenOptions = {
  headerShown: false,
};

function BottomTabs() {
  const { colors } = useAppTheme();
  // Feature icon size preference (Small / Medium / Large) from the profile.
  const { user } = useUser();
  const tabIconScale = getIconScale(user?.iconSize);
  // Bottom safe-area inset: the home-gesture bar / mobile browser chrome that
  // overlaps the bottom of the screen. Icons/labels get clipped without this.
  const insets = useSafeAreaInsets();
  const tabBarOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.tabBarInactive,
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '600',
    },
    tabBarStyle: {
      backgroundColor: colors.tabBar,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      // Tall enough that labels + icons sit above the system chrome.
      height: 65 + Math.max(insets.bottom, 12),
      paddingTop: 11,
      // Respect the home-gesture bar: max(1rem ≈ 16px, safe-area inset).
      paddingBottom: Math.max(insets.bottom, 16),
    },
  };
  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={Math.round(size * tabIconScale)} color={color} />,
        }}
      />
      <Tab.Screen
        name="Savings Hub"
        component={SavingsHubScreen}
        options={{
          title: 'Savings Hub',
          tabBarIcon: ({ color, size }) => <PiggyBank size={Math.round(size * tabIconScale)} color={color} />,
        }}
      />
      <Tab.Screen
        name="Co-op Credit"
        component={CoopCreditScreen}
        options={{
          title: 'Co-op Credit',
          tabBarIcon: ({ color, size }) => <Wallet size={Math.round(size * tabIconScale)} color={color} />,
        }}
      />
      <Tab.Screen
        name="Society"
        component={SocietyScreen}
        options={{
          title: 'Society',
          tabBarIcon: ({ color, size }) => <Users size={Math.round(size * tabIconScale)} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { userEmail, restoring } = useAuth();
  // Authenticated users land directly on the app; guests see the Welcome flow.
  const initialRoute = !restoring && userEmail ? 'MainDashboard' : 'WelcomeScreen';
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.webWrapper}>
        <Stack.Navigator key={initialRoute} initialRouteName={initialRoute} screenOptions={fullScreenOptions}>
          {/* Auth flow */}
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen
            name="SignInScreen"
            component={SignInScreen}
            initialParams={{ autoTriggerBiometrics: false }}
          />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />

          <Stack.Screen name="MainDashboard" component={BottomTabs} />
          <Stack.Screen name="MeetingChat" component={MeetingChatScreen} />
          <Stack.Screen name="CallScreen" component={CallScreen} />
          <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
          <Stack.Screen name="MarketplaceDetail" component={MarketplaceDetailScreen} />
          <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
          <Stack.Screen name="AirtimeData" component={AirtimeDataScreen} />
          <Stack.Screen name="CoopContribution" component={CoopContributionScreen} />
          <Stack.Screen name="RepayLoan" component={RepayLoanScreen} />
          <Stack.Screen name="RequestLoan" component={RequestLoanScreen} />
          <Stack.Screen name="FundWallet" component={FundWalletScreen} />
          <Stack.Screen name="AdminDeposits" component={AdminDepositsScreen} />
          <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileSettingsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="AddFunds" component={AddFundsScreen} />
          <Stack.Screen name="BankTransfer" component={BankTransferScreen} />
          <Stack.Screen name="AdminMarketplace" component={AdminMarketplaceScreen} />
          <Stack.Screen name="AdminLedger" component={AdminLedgerScreen} />
          <Stack.Screen name="AdminLoans" component={AdminLoansScreen} />
<Stack.Screen name="AdminLoanDetail" component={AdminLoanDetailScreen} />
          <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
          <Stack.Screen name="AccountStatement" component={AccountStatementScreen} />
          <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
          <Stack.Screen name="AnnouncementsFeed" component={AnnouncementsFeedScreen} />
          <Stack.Screen name="PastMeetings" component={PastMeetingsScreen} />
          <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} />
          <Stack.Screen name="PromotionalBanners" component={BannerManagerScreen} />
          <Stack.Screen name="CoopCredit" component={CoopCreditScreen} />
          <Stack.Screen name="Society" component={SocietyScreen} />
                    <Stack.Screen name="MonthlyGeneralMeeting" component={MonthlyGeneralMeetingScreen} />
          <Stack.Screen
            name="MeetingMinutesDetail"
            component={MeetingMinutesDetailScreen}
            initialParams={{ meetingId: undefined }}
          />
          <Stack.Screen
            name="VirtualMeetingRoom"
            component={VirtualMeetingRoomScreen}
            initialParams={{ roomId: undefined, roomTitle: undefined, hostName: undefined, isVideoEnabled: true, isAudioEnabled: true }}
          />
          <Stack.Screen name="DividendDistribution" component={DividendDistributionScreen} />
          <Stack.Screen name="SocietyHub" component={SocietyScreen} />
          <Stack.Screen name="More" component={MoreScreen} />
          <Stack.Screen name="Co-op Hub" component={CoopHubScreen} />
          <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} />
          <Stack.Screen name="NotificationCenter" component={NotificationScreen} />
          <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
          <Stack.Screen name="GuarantorRequest" component={GuarantorRequestScreen} />
          <Stack.Screen name="GuarantorApproval" component={GuarantorApprovalScreen} />
          <Stack.Screen name="LoanSchedule" component={LoanScheduleScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen
            name="AuditScreen"
            component={AuditScreen}
            initialParams={{ auditorId: undefined }}
          />
          <Stack.Screen name="FinancialServices" component={FinancialServicesScreen} />
          <Stack.Screen name="AddGoal" component={AddGoalScreen} />
          <Stack.Screen
            name="AuditDashboard"
            component={AuditDashboardScreen}
            initialParams={{ auditorId: undefined }}
          />
          <Stack.Screen name="CoopTargetDetails" component={CoopTargetDetailsScreen} />
          <Stack.Screen name="AdminSavingsControl" component={AdminSavingsControlScreen} />
        </Stack.Navigator>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06130D',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  webWrapper: {
    flex: 1,
    // Dynamic viewport height: on mobile web, 100vh doesn't account for the
    // address bar / home gesture chrome, which clips the bottom tab bar.
    // 100dvh tracks the *visible* viewport so nothing gets cut off.
    height: Platform.OS === 'web' ? '100dvh' : '100%',
    overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
    // Buffer below the fixed tab bar so it never hugs the screen edge and the
    // nav icons/labels stay fully visible above system chrome.
    paddingBottom: Platform.OS === 'web' ? 8 : 0,
  },
});