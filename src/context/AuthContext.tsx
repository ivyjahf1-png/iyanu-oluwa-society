/**
 * AuthContext — central auth state: current user, available unlock methods,
 * app lock/unlock, and background-return locking.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as authService from '../auth/authService';
import { supabase, SUPABASE_UNCONFIGURED } from '../lib/supabase';

export interface AuthState {
  userEmail: string | null;
  /**
   * Human-friendly name derived from the signed-in email prefix
   * (skiszyofficial@gmail.com -> "Skiszyofficial"). Additive field —
   * existing consumers are unaffected.
   */
  displayName: string | null;
  restoring: boolean;
  /** True once the persisted onboarding flag has been read from storage. */
  welcomeLoaded: boolean;
  hasCompletedWelcome: boolean;
  completeWelcome: () => Promise<void>;
  isLocked: boolean;
  methods: {
    password: boolean;
    passcode: boolean;
    passcodeLockEnabled: boolean;
    biometric: boolean;
    biometricAvailable: boolean;
  };
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerAccount: (email: string, password: string, fullName?: string) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Launch a Supabase OAuth flow for a social provider (e.g. 'facebook', 'apple').
   * On web the browser redirects automatically; on native the provider URL is
   * opened via Linking and the session is picked up by onAuthStateChange.
   */
  signInWithOAuth: (provider: 'facebook' | 'apple') => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginWithPasscode: (passcode: string) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  setPasscode: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  setPasscodeEnabled: (enabled: boolean) => Promise<void>;
  enableBiometric: () => Promise<{ ok: boolean; error?: string }>;
  disableBiometric: () => Promise<void>;
  resetAllAccounts: () => Promise<void>;
  refreshMethods: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Safely extract a human-readable message from an unknown caught error. */
function getErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = (e as { message?: unknown }).message;
    return typeof msg === 'string' ? msg : String(msg ?? '');
  }
  return typeof e === 'string' ? e : '';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  // Onboarding flag — persisted; false forces new users through Welcome first.
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);
  // True once the persisted flag has been read (gates the splash screen).
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [passcodeSet, setPasscodeSet] = useState(false);
  const [passcodeLockEnabled, setPasscodeLockEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const appState = useRef(AppState.currentState);

  /* ---- Restore session + methods on launch ---- */
  useEffect(() => {
    (async () => {
      try {
        const session = await authService.getSession();
        if (session?.email) {
          setUserEmail(session.email);
          const bio = await authService.isBiometricEnabled();
          const pcEnabled = await authService.isPasscodeLockEnabled();
          if (bio || pcEnabled) setIsLocked(true);
        }
        await refreshMethods();
        try {
          // Native biometric probes are unavailable in browsers — skip on web.
          if (Platform.OS !== 'web') {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setBiometricAvailable(hasHardware && enrolled);
          } else {
            setBiometricAvailable(false);
          }
        } catch (e) {
          setBiometricAvailable(false);
        }
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  // Restore the persisted onboarding flag alongside the session.
  useEffect(() => {
    (async () => {
      try {
        const done = await authService.getWelcomeCompleted();
        setHasCompletedWelcome(done);
      } catch (e) {
        /* default false — user goes through Welcome */
      } finally {
        setWelcomeLoaded(true);
      }
    })();
  }, []);

  /** Mark the Welcome/onboarding flow as completed (persisted). */
  const completeWelcome = async () => {
    setHasCompletedWelcome(true);
    await authService.setWelcomeCompleted(true);
  };

  /* ---- Lock when app returns from background (if any lock method on) ---- */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (
        appState.current.match(/active/) &&
        next === 'background' &&
        userEmail &&
        (biometricEnabled || (passcodeLockEnabled && passcodeSet))
      ) {
        setIsLocked(true);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [userEmail, biometricEnabled, passcodeLockEnabled, passcodeSet]);

  async function refreshMethods() {
    const [pcSet, pcEnabled, bioEnabled] = await Promise.all([
      authService.isPasscodeSet(),
      authService.isPasscodeLockEnabled(),
      authService.isBiometricEnabled(),
    ]);
    setPasscodeSet(pcSet);
    setPasscodeLockEnabled(pcEnabled);
    setBiometricEnabled(bioEnabled);
  }

  const loginWithPassword = async (email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();

    // Try Supabase Auth first so credentials persist server-side for future logins.
    if (!SUPABASE_UNCONFIGURED && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (!error && data?.session) {
          setUserEmail((data.user?.email || trimmed).toLowerCase());
          setIsLocked(false);
          return { ok: true };
        }
      } catch (e) {
        console.warn('[auth] supabase signIn failed, falling back to local:', getErrorMessage(e));
      }
    }

    // Local (offline / unconfigured) fallback.
    const res = await authService.loginWithPassword(trimmed, password);
    if (res.ok) {
      setUserEmail(trimmed);
      // Successful sign-in always clears the lock so the user goes straight
      // to the dashboard (fixes forced "Sign In Required" loop).
      setIsLocked(false);
    }
    return res;
  };

  const registerAccount = async (email: string, password: string, fullName?: string) => {
    const trimmed = email.trim().toLowerCase();

    // Persist the account in Supabase Auth + create a public.profiles entry.
    if (!SUPABASE_UNCONFIGURED && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: fullName ? { data: { full_name: fullName } } : undefined,
        });
        if (error && error.message && !/already registered|already been registered/i.test(error.message)) {
          // Surface real auth errors (but allow local fallback for pre-existing local users)
          console.warn('[auth] supabase signUp error:', error.message);
        } else if (data?.user) {
          // Create / upsert the public.profiles row so member management sees them.
          try {
            await supabase.from('profiles').upsert(
              {
                id: data.user.id,
                email: data.user.email,
                full_name: fullName || data.user.email?.split('@')[0] || '',
                role: 'member',
                status: 'active',
              },
              { onConflict: 'id' },
            );
          } catch (e) {
            console.warn('[auth] profile upsert failed:', getErrorMessage(e));
          }
        }
      } catch (e) {
        console.warn('[auth] supabase signUp failed, falling back to local:', getErrorMessage(e));
      }
    }

    const res = await authService.registerAccount(trimmed, password);
    if (res.ok) {
      setUserEmail(trimmed);
      setIsLocked(false);
    }
    return res;
  };

  const logout = async () => {
    await authService.endSession();
    setUserEmail(null);
    setIsLocked(false);
  };

  const loginWithPasscode = async (passcode: string) => {
    const ok = await authService.verifyPasscode(passcode);
    if (ok) setIsLocked(false);
    return ok;
  };

  const loginWithBiometric = async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Standard Mutual Savings',
        fallbackLabel: 'Use passcode',
      });
      if (res.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const setPasscode = async (passcode: string) => {
    const res = await authService.setPasscode(passcode);
    if (res.ok) {
      setPasscodeSet(true);
      setPasscodeLockEnabled(true);
    }
    return res;
  };

  const setPasscodeEnabled = async (enabled: boolean) => {
    await authService.enablePasscode(enabled);
    setPasscodeLockEnabled(enabled);
    if (!enabled && !biometricEnabled) setIsLocked(false);
  };

  const enableBiometric = async () => {
    try {
      // ---- ADDITIVE: web platform guard ----
      // expo-local-authentication's native hardware APIs have no browser
      // implementation without WebAuthn. On web, probe for a WebAuthn
      // capable browser and fail gracefully (never throw / hang the toggle).
      if (Platform.OS === 'web') {
        // WebAuthn probe kept for future browser-credential support; today we
        // degrade gracefully instead of throwing or leaving the toggle stuck.
        const hasWebAuthn =
          typeof window !== 'undefined' &&
          typeof window.PublicKeyCredential !== 'undefined';
        void hasWebAuthn;
        return {
          ok: false,
          error: 'Biometric authentication is only available on supported mobile devices',
        };
      }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        return {
          ok: false,
          error: !hasHardware
            ? 'This device does not support biometric authentication'
            : 'No fingerprint or face is enrolled on this device. Enroll one in system settings first.',
        };
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to enable biometric unlock',
      });
      if (!res.success) return { ok: false, error: 'Biometric verification failed' };

      await authService.setBiometricEnabled(true);
      setBiometricEnabled(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not enable biometric authentication' };
    }
  };

  const disableBiometric = async () => {
    await authService.setBiometricEnabled(false);
    setBiometricEnabled(false);
    if (!passcodeLockEnabled) setIsLocked(false);
  };

  const resetAllAccounts = async () => {
    await authService.resetAllAccounts();
    setUserEmail(null);
    setIsLocked(false);
    setPasscodeSet(false);
    setPasscodeLockEnabled(false);
    setBiometricEnabled(false);
  };

  const signInWithOAuth = async (provider: 'facebook' | 'apple') => {
    if (SUPABASE_UNCONFIGURED || !supabase) {
      return { ok: false, error: 'Social sign-in is unavailable — Supabase is not configured.' };
    }
    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        ...(redirectTo ? { options: { redirectTo } } : {}),
      });
      if (error) return { ok: false, error: error.message };
      // On native, supabase-js hands back the consent URL instead of redirecting.
      if (data?.url) {
        const Linking = require('react-native').Linking;
        await Linking.openURL(data.url);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: getErrorMessage(e) || 'Could not start social sign-in.' };
    }
  };

  const value: AuthState = {
    userEmail,
    // Live email-prefix display name (additive — see AuthState docs).
    displayName: userEmail ? authService.deriveDisplayName(userEmail) : null,
    restoring,
    welcomeLoaded,
    hasCompletedWelcome,
    completeWelcome,
    isLocked,
    methods: {
      password: Boolean(userEmail),
      passcode: passcodeSet,
      passcodeLockEnabled,
      biometric: biometricEnabled,
      biometricAvailable,
    },
    loginWithPassword,
    registerAccount,
    signInWithOAuth,
    logout,
    loginWithPasscode,
    loginWithBiometric,
    setPasscode,
    setPasscodeEnabled,
    enableBiometric,
    disableBiometric,
    resetAllAccounts,
    refreshMethods,
    unlock: () => setIsLocked(false),
    lock: () => setIsLocked(true),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}