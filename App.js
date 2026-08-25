import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { BankProvider } from './src/context/BankContext';
import { UserProvider } from './src/context/UserContext';
import { MarketItemsProvider } from './src/context/MarketItemsContext';
import { AnnouncementsProvider } from './src/context/AnnouncementsContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import RouteGuard from './src/navigation/RouteGuard';
import { AdminLockProvider } from './src/components/AdminLock';
import BroadcastModal from './src/components/BroadcastModal';

function ThemedContainer({ children }) {
  const { isDark } = useAppTheme();
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: '#4CAF50',
      background: isDark ? '#0B2211' : '#F4F7F5',
      card: isDark ? '#0F2A19' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#0B2211',
      border: isDark ? '#1C4A2E' : '#E5E7EB',
    },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {children}
      <RouteGuard />
      <BroadcastModal />
    </NavigationContainer>
  );
}
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppLockScreen from './src/components/AppLockScreen';
import { TransactionsProvider } from './src/context/TransactionsContext';
import { BannerProvider } from './src/context/BannerContext';
import { View, ActivityIndicator } from 'react-native';
import { startRealtimeSync } from './src/lib/realtime';

/** Shows the app once auth state is restored; gates on the lock screen. */
function AuthGate({ children }) {
  const { restoring, userEmail, isLocked } = useAuth();

  useEffect(() => {
    // Supabase realtime channels + polling fallback for admin→user sync.
    startRealtimeSync();
  }, []);

  if (restoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B2211' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Signed-in user + a lock method enabled → show the unlock gate.
  if (userEmail && isLocked) {
    return <AppLockScreen />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TransactionsProvider>
          <BannerProvider>
            <AuthGate>
          <UserProvider>
            <AnnouncementsProvider>
              <MarketItemsProvider>
                <BankProvider>
                  <ThemeProvider>
                    <AdminLockProvider>
                      <ThemedContainer>
                        <AppNavigator />
                      </ThemedContainer>
                    </AdminLockProvider>
                  </ThemeProvider>
                </BankProvider>
              </MarketItemsProvider>
            </AnnouncementsProvider>
          </UserProvider>
          </AuthGate>
          </BannerProvider>
        </TransactionsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}