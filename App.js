import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { BankProvider } from './src/context/BankContext';
import { UserProvider } from './src/context/UserContext';
import { MarketItemsProvider } from './src/context/MarketItemsContext';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <MarketItemsProvider>
          <BankProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </BankProvider>
        </MarketItemsProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}