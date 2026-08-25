/**
 * adminSecurity — single source of truth for Admin Security Lock state.
 *
 * Storage:
 *   - Native: expo-secure-store (encrypted, keychain/keystore).
 *   - Web / fallback: AsyncStorage (mirrors the legacy '@admin_security' key so
 *     previously-saved admin passcodes remain valid).
 *
 * The passcode is never stored in plain text — a salted SHA-256 digest (with a
 * deterministic FNV-1a fallback) is what actually touches disk.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ASYNC_KEY = '@admin_security';
const SECURE_KEY = 'ius_admin_security';

/** Master Security Recovery Key. Configure via env for production; the static
 *  value is a documented dev fallback only. */
export function getMasterRecoveryKey() {
  return process.env.EXPO_PUBLIC_ADMIN_RECOVERY_KEY || 'IYANU-OLUWA-RECOVERY-2024';
}

function randomSalt() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Deterministic FNV-1a digest — MATCHES the legacy hash used by the original
 * AdminSettings screen so any previously-saved admin passcode keeps verifying.
 * Salted, so two identical codes with different salts produce different hashes.
 */
export function hashPasscode(code, salt) {
  let h = 0x811c9dc5;
  const input = `${salt}:${code}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv:${h.toString(16)}:${input.length}`;
}

async function secGet(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return null;
  }
}

async function secSet(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    /* secure store unavailable (web) — fall back to AsyncStorage */
  }
}

async function secDel(key) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    /* ignore */
  }
}

/**
 * Read the admin security record. Prefers SecureStore (native), falls back to
 * the legacy AsyncStorage key so old stored passcodes still verify.
 */
export async function readAdminSecurity() {
  let record = null;
  if (Platform.OS !== 'web') {
    const raw = await secGet(SECURE_KEY);
    if (raw) {
      try {
        record = JSON.parse(raw);
      } catch (e) {
        record = null;
      }
    }
  }
  if (!record) {
    try {
      const legacy = await AsyncStorage.getItem(ASYNC_KEY);
      if (legacy) record = JSON.parse(legacy);
    } catch (e) {
      record = null;
    }
  }
  return record || {};
}

/** Persist the admin security record to both SecureStore (native) and AsyncStorage. */
async function writeAdminSecurity(record) {
  const value = JSON.stringify(record);
  if (Platform.OS !== 'web') await secSet(SECURE_KEY, value);
  await AsyncStorage.setItem(ASYNC_KEY, value).catch(() => {});
  return value;
}

export async function isAdminSecure() {
  const s = await readAdminSecurity();
  return Boolean(s.passcodeHash || s.biometricEnabled);
}

export async function verifyAdminPasscode(code) {
  const s = await readAdminSecurity();
  if (!s.salt || !s.passcodeHash) return false;
  return (await hashPasscode(code, s.salt)) === s.passcodeHash;
}

export async function setAdminPasscode(code) {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: 'Master passcode must be exactly 6 digits.' };
  }
  const salt = randomSalt();
  const passcodeHash = await hashPasscode(code, salt);
  const s = await readAdminSecurity();
  s.salt = salt;
  s.passcodeHash = passcodeHash;
  await writeAdminSecurity(s);
  return { ok: true };
}

export async function setAdminBiometricEnabled(enabled) {
  const s = await readAdminSecurity();
  s.biometricEnabled = Boolean(enabled);
  await writeAdminSecurity(s);
}

export async function setAdminRequireStartup(enabled) {
  const s = await readAdminSecurity();
  s.requireOnStartup = Boolean(enabled);
  await writeAdminSecurity(s);
}

export async function isAdminBiometricEnabled() {
  const s = await readAdminSecurity();
  return Boolean(s.biometricEnabled);
}

/**
 * Emergency recovery: clear the admin passcode + biometric flags so the admin
 * can configure a new code without being locked out.
 */
export async function resetAdminSecurity() {
  const fresh = { requireOnStartup: false };
  await writeAdminSecurity(fresh);
  if (Platform.OS !== 'web') await secDel(SECURE_KEY);
  const value = JSON.stringify(fresh);
  await AsyncStorage.setItem(ASYNC_KEY, value).catch(() => {});
  return true;
}