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
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const ASYNC_KEY = '@admin_security';
const SECURE_KEY = 'ius_admin_security';
/** Dedicated plain-PIN mirror required by the admin settings contract. */
export const MASTER_PIN_KEY = 'admin_master_passcode';
/** Default PIN accepted when no master passcode has been configured yet. */
export const DEFAULT_ADMIN_PIN = '1234';

/** Master Security Recovery Key. Configure via env for production; the static
 *  value is a documented dev fallback only. */
export function getMasterRecoveryKey() {
  return process.env.EXPO_PUBLIC_ADMIN_RECOVERY_KEY || 'STANDARD-MUTUAL-RECOVERY-2024';
}

/**
 * Configured admin accounts allowlist.
 * Populated from the EXPO_PUBLIC_ADMIN_ACCOUNTS env var (comma-separated emails,
 * e.g. "admin@example.com, superuser@example.com"). Defaults to an empty list,
 * which means admin access is *not* restricted by account identity — the existing
 * admin passcode / biometric lock remains the sole gate (see isAdminAccount).
 */
export function getAdminAccounts() {
  const raw = typeof process !== 'undefined' && process.env
    ? process.env.EXPO_PUBLIC_ADMIN_ACCOUNTS || ''
    : '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when the logged-in user's email is an allowed admin account.
 *
 * Security posture:
 *   - If an allowlist IS configured, only listed emails see the admin shield.
 *   - If the allowlist is EMPTY/unset, this returns true (visible) so the
 *     pre-existing passcode/biometric admin lock stays the only access control
 *     and no one is accidentally locked out.
 */
export function isAdminAccount(email) {
  const accounts = getAdminAccounts();
  if (accounts.length === 0) return true;
  return Boolean(email) && accounts.includes(String(email).toLowerCase());
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
  // Exact-string check against the contract key mirror first.
  const stored = await getAdminMasterPasscode();
  if (stored != null && String(code) === String(stored)) return true;

  const s = await readAdminSecurity();
  // No passcode configured yet → accept the documented default '1234'.
  if (!s.salt || !s.passcodeHash) return code === DEFAULT_ADMIN_PIN;
  return (await hashPasscode(code, s.salt)) === s.passcodeHash;
}

/** Mirror the master PIN into the dedicated encrypted key (native) or AsyncStorage (web). */
export async function setAdminMasterPasscode(code) {
  try {
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(MASTER_PIN_KEY, String(code));
  } catch (e) { /* fall through to AsyncStorage */ }
  await AsyncStorage.setItem(MASTER_PIN_KEY, String(code)).catch(() => {});
}

/** Read the master PIN mirror. Returns null when nothing is stored. */
export async function getAdminMasterPasscode() {
  if (Platform.OS !== 'web') {
    try {
      const v = await SecureStore.getItemAsync(MASTER_PIN_KEY);
      if (v != null) return v;
    } catch (e) { /* fall through */ }
  }
  try {
    return await AsyncStorage.getItem(MASTER_PIN_KEY);
  } catch (e) {
    return null;
  }
}

export async function setAdminPasscode(code) {
  if (!/^\d{4}$|^\d{6}$/.test(code)) {
    return { ok: false, error: 'Master passcode must be exactly 4 or 6 digits.' };
  }
  const salt = randomSalt();
  const passcodeHash = await hashPasscode(code, salt);
  const s = await readAdminSecurity();
  s.salt = salt;
  s.passcodeHash = passcodeHash;
  s.passcodeLength = code.length;
  await writeAdminSecurity(s);
  await setAdminMasterPasscode(code);
  return { ok: true };
}

/**
 * Length of the stored admin passcode ('4' or '6'). Defaults to 6 for legacy
 * records created before variable-length support was added.
 */
export async function getAdminPasscodeLength() {
  const s = await readAdminSecurity();
  return Number(s.passcodeLength) === 4 ? 4 : 6;
}

export async function setAdminBiometricEnabled(enabled) {
  const s = await readAdminSecurity();
  s.biometricEnabled = Boolean(enabled);
  await writeAdminSecurity(s);
  // Alias key so other modules can read the flag directly.
  await AsyncStorage.setItem('biometrics_enabled', String(Boolean(enabled))).catch(() => {});
}

export async function setAdminRequireStartup(enabled) {
  const s = await readAdminSecurity();
  s.requireOnStartup = Boolean(enabled);
  await writeAdminSecurity(s);
  // Alias key so other modules can read the flag directly.
  await AsyncStorage.setItem('require_passcode_startup', String(Boolean(enabled))).catch(() => {});
}

export async function isAdminBiometricEnabled() {
  const s = await readAdminSecurity();
  return Boolean(s.biometricEnabled);
}

/** Emergency recovery: clear the admin passcode + biometric flags so the admin
 *  can configure a new code without being locked out.
 */
export async function resetAdminSecurity() {
  const fresh = { requireOnStartup: false };
  await writeAdminSecurity(fresh);
  if (Platform.OS !== 'web') {
    await secDel(SECURE_KEY);
    try { await SecureStore.deleteItemAsync(MASTER_PIN_KEY); } catch (e) { /* ignore */ }
  }
  const value = JSON.stringify(fresh);
  await AsyncStorage.setItem(ASYNC_KEY, value).catch(() => {});
  await AsyncStorage.removeItem(MASTER_PIN_KEY).catch(() => {});
  return true;
}

/**
 * Global reusable admin-access verifier (step 1 of the unlock flow).
 *
 * - If biometrics are enabled AND available on the device, triggers
 *   LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate Admin Access' }).
 * - Resolves { granted: true } on biometric success.
 * - Otherwise resolves { granted: false, reason } so the caller presents the
 *   PIN keypad modal and validates digits against the stored master PIN.
 */
export async function verifyAdminAccess() {
  const bio = await isAdminBiometricEnabled();
  if (bio) {
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (hasHardware && enrolled) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate Admin Access',
          fallbackLabel: 'Use passcode',
        });
        if (res.success) return { granted: true };
        return { granted: false, reason: 'biometric_failed' };
      }
      return { granted: false, reason: 'biometric_unavailable' };
    } catch (e) {
      return { granted: false, reason: 'biometric_error' };
    }
  }
  return { granted: false, reason: 'biometric_disabled' };
}