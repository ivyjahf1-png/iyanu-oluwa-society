/**
 * AuthContext — central auth state: current user, available unlock methods,
 * app lock/unlock, and background-return locking.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as authService from '../auth/authService';

export interface AuthState {
  userEmail: string | null;
  restoring: boolean;
  isLocked: boolean;
  methods: {
    password: boolean;
    passcode: boolean;
    passcodeLockEnabled: boolean;
    biometric: boolean;
    biometricAvailable: boolean;
  };
  loginWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerAccount: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
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
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricAvailable(hasHardware && enrolled);
        } catch (e) {
          setBiometricAvailable(false);
        }
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

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
    const res = await authService.loginWithPassword(email, password);
    if (res.ok) {
      setUserEmail(email.trim().toLowerCase());
      // Successful sign-in always clears the lock so the user goes straight
      // to the dashboard (fixes forced "Sign In Required" loop).
      setIsLocked(false);
    }
    return res;
  };

  const registerAccount = async (email: string, password: string) => {
    const res = await authService.registerAccount(email, password);
    if (res.ok) {
      setUserEmail(email.trim().toLowerCase());
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

  const value: AuthState = {
    userEmail,
    restoring,
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