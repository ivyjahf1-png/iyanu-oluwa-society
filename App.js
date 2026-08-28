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
import * as SplashScreen from 'expo-splash-screen';
import { Image, View as RNView, View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';

// Keep the native splash screen visible while persisted auth/onboarding
// state is restored. Hidden with a smooth fade once initialization finishes.
SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedContainer({ children }) {
  const { isDark, colors } = useAppTheme();
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {/* Status bar reflects the active theme for the whole app shell. */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
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
import { SavingsPlansProvider } from './src/context/SavingsPlansContext';
import { startRealtimeSync } from './src/lib/realtime';

/** Shows the app once auth state is restored; gates on the lock screen. */
function AuthGate({ children }) {
  const { restoring, userEmail, isLocked, welcomeLoaded } = useAuth();

  useEffect(() => {
    // Supabase realtime channels + polling fallback for admin→user sync.
    startRealtimeSync();
  }, []);

  // Hide the native splash with a smooth fade ONLY after both the session
  // and the persisted onboarding flag have fully loaded — cleanly handing
  // off into the Welcome / Dashboard flow without any flicker.
  useEffect(() => {
    if (!restoring && welcomeLoaded) {
      SplashScreen.hideAsync({ fade: true }).catch(() => {});
    }
  }, [restoring, welcomeLoaded]);

  if (restoring || !welcomeLoaded) {
    // Branded static splash — logo centered on the configured splash background.
    return (
      <RNView style={splashStyles.container}>
        <Image
          resizeMode="contain"
          source={require('./assets/logo.png')}
          style={splashStyles.logo}
        />
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 24 }} />
      </RNView>
    );
  }

  // Signed-in user + a lock method enabled → show the unlock gate.
  if (userEmail && isLocked) {
    return <AppLockScreen />;
  }

  return children;
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: 180, height: 180 },
});

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TransactionsProvider>
          <BannerProvider>
            <AuthGate>
          <UserProvider>
            <AnnouncementsProvider>
              <SavingsPlansProvider>
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
              </SavingsPlansProvider>
            </AnnouncementsProvider>
          </UserProvider>
          </AuthGate>
          </BannerProvider>
        </TransactionsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}