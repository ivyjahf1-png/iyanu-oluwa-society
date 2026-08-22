import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';

/**
 * Global user profile & settings context.
 * Persisted locally with AsyncStorage so values survive restarts, and shared
 * across Profile Settings, Add Funds, and Bank Transfer screens.
 */
const DEFAULTS = {
  fullName: 'Temitope Adewale',
  email: 'temitope.adewale@iyanuoluwa.org',
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
  // Appearance / theme settings
  themeMode: 'light', // 'automatic' | 'light' | 'dark'
  lightBrightness: 100, // 0–100 (higher = brighter light mode)
  darkContrast: 60, // 0–100 (higher = deeper dark contrast)
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