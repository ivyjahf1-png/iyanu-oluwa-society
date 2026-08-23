/**
 * authService — secure, reusable credential storage for the auth system.
 *
 * - Passwords are HASHED (SHA-256 via expo-crypto) before storage; the plain
 *   text never touches disk.
 * - Passcode and biometric flags live in expo-secure-store (encrypted on
 *   device). A graceful in-memory fallback keeps web/no-native builds working.
 * - All methods are async and fail-safe: errors reject cleanly so callers can
 *   show friendly messages instead of crashing.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEYS = {
  EMAIL: 'auth.email',
  PWD_HASH: 'auth.passwordHash',
  SALT: 'auth.salt',
  PASSCODE_HASH: 'auth.passcodeHash',
  PASSCODE_ENABLED: 'auth.passcodeEnabled',
  BIOMETRIC_ENABLED: 'auth.biometricEnabled',
  SESSION: 'auth.session',
};

/** In-memory fallback used only when SecureStore is unavailable (e.g. web). */
const memory = new Map<string, string>();

async function secGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return memory.get(key) ?? null;
  }
}

async function secSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    memory.set(key, value);
  }
}

async function secDel(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    memory.delete(key);
  }
}

/** SHA-256 hex digest of salt + value. Falls back to a simple digest if crypto is unavailable. */
export async function hashValue(value: string, salt: string): Promise<string> {
  try {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${value}`,
    );
  } catch (e) {
    // Deterministic fallback hash (FNV-1a style) — still never stores plaintext.
    let h = 0x811c9dc5;
    const input = `${salt}:${value}`;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `fnv:${h.toString(16)}:${input.length}`;
  }
}

function randomSalt(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ============================ ACCOUNT / PASSWORD ============================ */

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

/** Create the account with email + password (password is hashed + salted). */
export async function registerAccount(email: string, password: string): Promise<RegisterResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const existing = await secGet(KEYS.EMAIL);
    if (existing && existing === normalized) {
      return { ok: false, error: 'An account with this email already exists' };
    }

    const salt = randomSalt();
    const hash = await hashValue(password, salt);

    await secSet(KEYS.EMAIL, normalized);
    await secSet(KEYS.SALT, salt);
    await secSet(KEYS.PWD_HASH, hash);

    await createSession(normalized);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Could not create account. Please try again.' };
  }
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

/** Verify email + password against stored credentials. */
export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const storedEmail = await secGet(KEYS.EMAIL);
    const salt = await secGet(KEYS.SALT);
    const storedHash = await secGet(KEYS.PWD_HASH);

    if (!storedEmail || !storedHash || !salt) {
      return { ok: false, error: 'No account found. Please create one first.' };
    }
    if (normalized !== storedEmail) {
      return { ok: false, error: 'No account found with this email' };
    }

    const attemptHash = await hashValue(password, salt);
    if (attemptHash !== storedHash) {
      return { ok: false, error: 'Wrong password' };
    }

    await createSession(normalized);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Sign in failed. Please try again.' };
  }
}

/* ================================= SESSION ================================= */

/** Persist a lightweight session so the app can auto-resume after restarts. */
export async function createSession(email: string): Promise<void> {
  await secSet(KEYS.SESSION, JSON.stringify({ email, at: Date.now() }));
}

export async function getSession(): Promise<{ email: string } | null> {
  try {
    const raw = await secGet(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function endSession(): Promise<void> {
  await secDel(KEYS.SESSION);
}

/* ================================= PASSCODE ================================= */

/** Save a 4/6-digit passcode (hashed) and enable it in one step. */
export async function setPasscode(passcode: string): Promise<LoginResult> {
  try {
    if (!/^\d{4}$|^\d{6}$/.test(passcode)) {
      return { ok: false, error: 'Passcode must be 4 or 6 digits' };
    }
    const salt = randomSalt();
    const hash = await hashValue(passcode, salt);
    await secSet(`${KEYS.PASSCODE_HASH}.salt`, salt);
    await secSet(KEYS.PASSCODE_HASH, hash);
    await enablePasscode(true);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Could not save passcode' };
  }
}

/** Verify a passcode attempt against the stored hash. */
export async function verifyPasscode(passcode: string): Promise<boolean> {
  try {
    const salt = await secGet(`${KEYS.PASSCODE_HASH}.salt`);
    const storedHash = await secGet(KEYS.PASSCODE_HASH);
    if (!salt || !storedHash) return false;
    return (await hashValue(passcode, salt)) === storedHash;
  } catch (e) {
    return false;
  }
}

export async function isPasscodeSet(): Promise<boolean> {
  return Boolean(await secGet(KEYS.PASSCODE_HASH));
}

export async function enablePasscode(enabled: boolean): Promise<void> {
  await secSet(KEYS.PASSCODE_ENABLED, enabled ? '1' : '0');
}

export async function isPasscodeLockEnabled(): Promise<boolean> {
  const flag = await secGet(KEYS.PASSCODE_ENABLED);
  return flag === '1';
}

export async function clearPasscode(): Promise<void> {
  await secDel(KEYS.PASSCODE_HASH);
  await secDel(`${KEYS.PASSCODE_HASH}.salt`);
  await secDel(KEYS.PASSCODE_ENABLED);
}

/* ================================ BIOMETRIC ================================ */

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await secSet(KEYS.BIOMETRIC_ENABLED, enabled ? '1' : '0');
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await secGet(KEYS.BIOMETRIC_ENABLED)) === '1';
}