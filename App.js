import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { BankProvider } from './src/context/BankContext';
import { UserProvider } from './src/context/UserContext';
import { MarketItemsProvider } from './src/context/MarketItemsContext';
import { AnnouncementsProvider } from './src/context/AnnouncementsContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

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
  return <NavigationContainer theme={navTheme}>{children}</NavigationContainer>;
}
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppLockScreen from './src/components/AppLockScreen';
import { TransactionsProvider } from './src/context/TransactionsContext';
import { View, ActivityIndicator } from 'react-native';

/** Shows the app once auth state is restored; gates on the lock screen. */
function AuthGate({ children }) {
  const { restoring, userEmail, isLocked } = useAuth();

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
          <AuthGate>
          <UserProvider>
            <AnnouncementsProvider>
              <MarketItemsProvider>
                <BankProvider>
                  <ThemeProvider>
                    <ThemedContainer>
                      <AppNavigator />
                    </ThemedContainer>
                  </ThemeProvider>
                </BankProvider>
              </MarketItemsProvider>
            </AnnouncementsProvider>
          </UserProvider>
          </AuthGate>
        </TransactionsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}