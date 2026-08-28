import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import * as authService from '../auth/authService';

/**
 * Global user profile & settings context.
 * Persisted locally with AsyncStorage so values survive restarts, and shared
 * across Profile Settings, Add Funds, and Bank Transfer screens.
 */
const DEFAULTS = {
  fullName: 'Temitope Adewale',
  email: 'temitope.adewale@standardmutual.org',
  phone: '',
  avatarUri: null,
  biometricEnabled: false,
  transferPin: '',
  userBankName: '',
  userAccountNumber: '',
  userAccountName: '',
  // Notification / reminder settings
  remindersEnabled: true,
  reminderFrequency: 'monthly', // 'weekly' | 'monthly'
  reminderDaysBefore: '3',
  soundAlertsEnabled: true,
  alertSound: 'Chime',
  alertSoundUri: null,
  // Feature icon size preference: 'small' | 'medium' | 'large'
  iconSize: 'medium',
  // Access role: 'member' | 'admin' | 'auditor'. Derives audit-menu visibility.
  role: 'member',
};

const UserContext = createContext(null);
const STORAGE_KEY = '@ius_user_settings';

export function UserProvider({ children }) {
  const [user, setUser] = useState(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
                const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setUser({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch (e) {
        // Corrupt storage — fall back to defaults.
      }
      // ---- ADDITIVE: email-based name sync ----
      // If the profile still carries the factory-placeholder name (or none),
      // replace it with the signed-in user's email-derived display name
      // (skiszyofficial@gmail.com -> "Skiszyofficial"). A deliberately saved
      // custom name is never overwritten.
      try {
        const session = await authService.getSession();
        const email = session?.email;
        if (email) {
          const derived = authService.deriveDisplayName(email);
          setUser(prev => {
            const isPlaceholder =
              !prev.fullName || prev.fullName.trim() === DEFAULTS.fullName;
            if (!isPlaceholder || !derived || derived === 'Member') return prev;
            const next = { ...prev, fullName: derived };
            storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
            return next;
          });
        }
      } catch (e) {
        // Auth not ready / unavailable — dashboard falls back to live
        // derivation from userEmail, so nothing breaks.
      }
      setHydrated(true);
    })();
  }, []);

  const updateUser = async patch => {
    setUser(prev => {
      const next = { ...prev, ...patch };
            storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <UserContext.Provider value={{ user, updateUser, hydrated }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}