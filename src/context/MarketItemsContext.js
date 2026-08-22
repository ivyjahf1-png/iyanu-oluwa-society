import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shared marketplace inventory.
 * The Admin Marketplace Dashboard writes items here; the user-facing
 * Marketplace feed reads them — so new uploads render instantly.
 * Persisted locally with AsyncStorage.
 */
const MarketItemsContext = createContext(null);
const STORAGE_KEY = '@ius_market_items';

export function MarketItemsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch (e) {
        // Corrupt storage — start empty.
      }
      setHydrated(true);
    })();
  }, []);

  const persist = next => {
    setItems(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const addItem = item => {
    const entry = {
      id: `m-${Date.now()}`,
      title: item.title,
      description: item.description || '',
      price: item.price,
      location: item.location || '',
      category: item.category || 'General',
      imageUri: item.imageUri || null,
      createdAt: Date.now(),
    };
    persist([entry, ...items]);
    return entry;
  };

  const removeItem = id => {
    persist(items.filter(i => i.id !== id));
  };

  return (
    <MarketItemsContext.Provider value={{ items, addItem, removeItem, hydrated }}>
      {children}
    </MarketItemsContext.Provider>
  );
}

export function useMarketItems() {
  const ctx = useContext(MarketItemsContext);
  if (!ctx) throw new Error('useMarketItems must be used inside <MarketItemsProvider>');
  return ctx;
}