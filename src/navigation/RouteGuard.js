import { useEffect, useRef } from 'react';
import { navigationRef } from './navigationRef';
import { useAuth } from '../context/AuthContext';
import { useAdminLock } from '../components/AdminLock';

/**
 * Global navigation guard.
 *
 *  A) STRICT AUTH GUARD — blocks unauthenticated (guest) users from reaching
 *     any authenticated/member screen. Non-public routes redirect to
 *     WelcomeScreen for guests.
 *
 *  B) ADMIN AUTO-LOCK — the moment navigation lands on any admin-panel route,
 *     the Admin Security Lock engine is triggered (passcode / biometric).
 *     Entry is denied entirely unless verification succeeds.
 *
 * Renders nothing; it only watches navigation state.
 */
const PUBLIC_ROUTES = new Set(['WelcomeScreen', 'SignInScreen', 'SignUpScreen']);

const ADMIN_ROUTES = new Set([
  'AdminSettings',
  'AdminDeposits',
  'AdminMarketplace',
  'AdminUserManagement',
  'AdminLedger',
  'AdminLoans',
  'Announcements',
  'PromotionalBanners',
  'SocietyHub',
]);

export default function RouteGuard() {
    const { userEmail, restoring, welcomeLoaded, hasCompletedWelcome } = useAuth();
  const { requestAdminAccess } = useAdminLock();

  const lastRouteRef = useRef(null);
  const inAdminPanelRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      if (!navigationRef.isReady()) return;
      // Never route-judge while persisted auth/onboarding state is loading —
      // this prevents startup flicker / false redirects.
      if (restoring || !welcomeLoaded) return;
      const route = navigationRef.getCurrentRoute();
      const name = route?.name;
      if (!name || name === lastRouteRef.current) return;

      const prevName = lastRouteRef.current;
      lastRouteRef.current = name;

      // --- STAGE 1: Onboarding gate — Welcome must be completed first. ---
      if (!hasCompletedWelcome) {
        if (name !== 'WelcomeScreen') {
          navigationRef.reset({ index: 0, routes: [{ name: 'WelcomeScreen' }] });
        }
        return;
      }

      // --- STAGE 2: Authentication gate. ---
      if (!userEmail && !PUBLIC_ROUTES.has(name)) {
        // Onboarded but not signed in → force the sign-in flow (not Welcome).
        navigationRef.reset({ index: 0, routes: [{ name: 'SignInScreen' }] });
        return;
      }

      // Authenticated users cannot fall back into onboarding screens.
      if (userEmail && name === 'WelcomeScreen') {
        navigationRef.reset({ index: 0, routes: [{ name: 'MainDashboard' }] });
        return;
      }

      // --- B: Admin auto-lock on entering the admin panel. ---
      const isAdminRoute = ADMIN_ROUTES.has(name);
      if (!isAdminRoute) {
        inAdminPanelRef.current = false;
        return;
      }

      // Entry into an admin route from OUTSIDE the panel -> require auth once.
      if (!inAdminPanelRef.current && (prevName === null || !ADMIN_ROUTES.has(prevName))) {
        inAdminPanelRef.current = true;
        requestAdminAccess().then((granted) => {
          if (!granted) {
            inAdminPanelRef.current = false;
            try {
              if (navigationRef.canGoBack()) navigationRef.goBack();
            } catch (e) {
              /* ignore */
            }
          }
        });
      }
    });

    return unsubscribe;
  }, [restoring, welcomeLoaded, userEmail, hasCompletedWelcome, requestAdminAccess]);

  return null;
}