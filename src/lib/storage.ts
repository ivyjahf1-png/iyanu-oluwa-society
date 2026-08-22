/**
 * Crash-proof storage adapter.
 *
 * Wraps @react-native-async-storage/async-storage so a missing/mismatched
 * native module ("Native module is null") can never crash the app: if the
 * native bindings are unavailable, an in-memory store transparently takes
 * over for the current session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

let nativeBroken = false;

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (!nativeBroken && AsyncStorage) {
        const value = await AsyncStorage.getItem(key);
        return value ?? null;
      }
    } catch (e) {
      nativeBroken = true;
      console.log('[storage] AsyncStorage unavailable, using memory fallback');
    }
    return memoryStore.has(key) ? (memoryStore.get(key) as string) : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!nativeBroken && AsyncStorage) {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      nativeBroken = true;
      console.log('[storage] AsyncStorage unavailable, using memory fallback');
    }
    memoryStore.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (!nativeBroken && AsyncStorage) {
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch (e) {
      nativeBroken = true;
    }
    memoryStore.delete(key);
  },
};

export default storage;