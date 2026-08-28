import { Alert } from 'react-native';

/**
 * Registry of every registered route in AppNavigator.
 * Used to defensively validate navigation targets before dispatching.
 */
export const KNOWN_ROUTES = new Set([
  'MainDashboard',
  'Home',
  'Dashboard',
  'Savings',
  'Savings Hub',
  'SavingsHub',
  'Co-op Hub',
  'Co-op Credit',
  'More',
  'WelcomeScreen',
  'SignInScreen',
  'SignUpScreen',
  'MeetingChat',
  'CallScreen',
  'Marketplace',
  'MarketplaceDetail',
  'AdminSettings',
  'AirtimeData',
  'CoopContribution',
  'RepayLoan',
  'RequestLoan',
  'FundWallet',
  'AdminDeposits',
  'ProfileSettings',
  'Profile',
  'Notifications',
  'AddFunds',
  'BankTransfer',
  'AdminMarketplace',
  'AIAssistant',
  'AccountStatement',
  'Announcements',
  'AdminUserManagement',
  'PromotionalBanners',
  'CoopCredit',
  'Society',
  'SocietyHub',
  'AuditScreen',
  'AddGoal',
  'CoopTargetDetails',
]);

/**
 * Non-blocking friendly feedback (never throws, never blocks the UI).
 */
export function toast(title, message) {
  try {
    Alert.alert(title, message);
  } catch (e) {
    // Last-resort swallow — a broken alert must never crash the app.
    console.log('[toast]', title, message);
  }
}

/**
 * Run any handler defensively. Returns the result, or undefined on failure.
 */
export function safeRun(fn, onError) {
  try {
    return fn();
  } catch (e) {
    console.log('[safeRun]', e?.message || e);
    if (typeof onError === 'function') {
      try {
        onError(e);
      } catch (_) {}
    }
    return undefined;
  }
}

/**
 * Defensive navigation: validates the target route exists, wraps the dispatch
 * in try/catch, and falls back to a friendly "coming soon" toast when the
 * route is missing or the dispatcher fails.
 */
export function safeNavigate(navigation, route, params) {
  try {
    if (!navigation || typeof navigation.navigate !== 'function') {
      toast('Coming Soon', 'This feature will be available soon.');
      return;
    }

    if (typeof route === 'string' && !KNOWN_ROUTES.has(route)) {
      toast('Coming Soon', 'This feature will be available soon.');
      return;
    }

    navigation.navigate(route, params);
  } catch (e) {
    console.log('[safeNavigate]', e?.message || e);
    toast('Coming Soon', 'This feature will be available soon.');
  }
}
