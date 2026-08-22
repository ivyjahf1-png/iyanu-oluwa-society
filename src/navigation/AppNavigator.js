import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, PiggyBank, Landmark, Users, Menu } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import SavingsScreen from '../screens/SavingsScreen';
import LoansScreen from '../screens/LoansScreen';
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
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AddFundsScreen from '../screens/AddFundsScreen';
import BankTransferScreen from '../screens/BankTransferScreen';
import AdminMarketplaceScreen from '../screens/AdminMarketplaceScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import AccountStatementScreen from '../screens/AccountStatementScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const tabBarOptions = {
  headerShown: false,
  tabBarActiveTintColor: '#4CAF50',
  tabBarInactiveTintColor: '#8E8E93',
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabBarStyle: {
    backgroundColor: '#0F2A19',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    height: 65,
    paddingTop: 11,
    paddingBottom: 8,
  },
};

const fullScreenOptions = {
  headerShown: false,
};

function BottomTabs() {
  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Savings"
        component={SavingsScreen}
        options={{
          title: 'Savings',
          tabBarIcon: ({ color, size }) => <PiggyBank size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Loans"
        component={LoansScreen}
        options={{
          title: 'Loans',
          tabBarIcon: ({ color, size }) => <Landmark size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Co-op Hub"
        component={CoopHubScreen}
        options={{
          title: 'Co-op Hub',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="MainTabs" screenOptions={fullScreenOptions}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
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
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="AddFunds" component={AddFundsScreen} />
      <Stack.Screen name="BankTransfer" component={BankTransferScreen} />
      <Stack.Screen name="AdminMarketplace" component={AdminMarketplaceScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Stack.Screen name="AccountStatement" component={AccountStatementScreen} />
    </Stack.Navigator>
  );
}