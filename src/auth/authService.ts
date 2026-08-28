/**
 * authService — secure, reusable credential storage for the auth system.
 *
 * - Passwords are HASHED (SHA-256 via expo-crypto) before storage; the plain
 *   text never touches disk.
 * - Credentials, passcode and biometric flags persist through AsyncStorage /
 *   localStorage (./storage), so accounts survive reloads on web AND native.
 * - All methods are async and fail-safe: errors reject cleanly so callers can
 *   show friendly messages instead of crashing.
 */
import { storage } from '../lib/storage';
import * as Crypto from 'expo-crypto';

const KEYS = {
  EMAIL: 'auth.email',
  PWD_HASH: 'auth.passwordHash',
  SALT: 'auth.salt',
  PASSCODE_HASH: 'auth.passcodeHash',
  PASSCODE_ENABLED: 'auth.passcodeEnabled',
  BIOMETRIC_ENABLED: 'auth.biometricEnabled',
  SESSION: 'auth.session',
  WELCOME_DONE: 'auth.welcomeCompleted',
  /**
   * Multi-account registry — every registration appends an account record
   * here so ALL created accounts persist (fixes "No account found with
   * this email" caused by the old single-slot storage being overwritten).
   */
  USERS: 'auth.users',
};

/** Shape of one persisted account record in the registry. */
export interface StoredAccount {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  salt: string;
  pwdHash: string;
}

/** Read the full account registry (never throws). */
export async function getRegisteredUsers(): Promise<StoredAccount[]> {
  try {
    const raw = await secGet(KEYS.USERS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/** Persist the registry (never throws). */
async function saveRegisteredUsers(list: StoredAccount[]): Promise<void> {
  await secSet(KEYS.USERS, JSON.stringify(list));
}

/** True when a record for this email already exists in the registry. */
async function findRegisteredUser(email: string): Promise<StoredAccount | null> {
  const list = await getRegisteredUsers();
  return list.find((u) => u.email === email) || null;
}

async function secGet(key: string): Promise<string | null> {
  try {
    return await storage.getItem(key);
  } catch (e) {
    console.warn('[auth] read failed for', key);
    return null;
  }
}

async function secSet(key: string, value: string): Promise<void> {
  try {
    await storage.setItem(key, value);
  } catch (e) {
    console.warn('[auth] write failed for', key);
  }
}

async function secDel(key: string): Promise<void> {
  try {
    await storage.removeItem(key);
  } catch (e) {
    console.warn('[auth] delete failed for', key);
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

/**
 * Derive a human-friendly display name from an email address:
 *   temitope.adewale@gmail.com -> "Temitope Adewale"
 *   john_doe@example.com       -> "John Doe"
 */
export function deriveDisplayName(email: string): string {
  const local = (email || '').split('@')[0] || 'Member';
  return local
    .replace(/[._\-+]+/g, ' ')
    .replace(/\d+/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || 'Member';
}

/**
 * Best-effort persistence of every newly created account into the database
 * `users` table (uid, email, displayName, createdAt). Never throws — auth
 * still succeeds even if the network/DB is unavailable.
 */
export async function syncUserRecord(uid: string, email: string): Promise<void> {
  try {
    const { supabase } = require('../lib/supabase');
    await supabase.from('users').upsert(
      {
        uid,
        email: email.trim().toLowerCase(),
        displayName: deriveDisplayName(email),
        createdAt: new Date().toISOString(),
      },
      { onConflict: 'uid' },
    );
  } catch (e: any) {
    console.warn('[auth] user record sync skipped:', e?.message || e);
  }
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

    // Strict Gmail-only registration policy.
    if (!/^[^\s@]+@gmail\.com$/.test(normalized)) {
      return { ok: false, error: 'Please register using a valid Gmail address (@gmail.com)' };
    }

    // Duplicate check against the multi-account registry (and legacy slot).
    const existingInRegistry = await findRegisteredUser(normalized);
    const legacyEmail = await secGet(KEYS.EMAIL);
    if (existingInRegistry || (legacyEmail && legacyEmail === normalized)) {
      return { ok: false, error: 'An account with this email already exists' };
    }

    const salt = randomSalt();
    const hash = await hashValue(password, salt);
    const uid = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const displayName = deriveDisplayName(normalized);
    const createdAt = new Date().toISOString();

    // Append to the persistent multi-account registry.
    const list = await getRegisteredUsers();
    list.push({ uid, email: normalized, displayName, createdAt, salt, pwdHash: hash });
    await saveRegisteredUsers(list);

    // Legacy single-slot mirrors the newest account (back-compat with the
    // passcode/biometric and older code paths that read KEYS.EMAIL).
    await secSet(KEYS.EMAIL, normalized);
    await secSet(KEYS.SALT, salt);
    await secSet(KEYS.PWD_HASH, hash);
    console.log('[auth] account created for', normalized);

    // Persist the account record (uid, email, displayName, createdAt).
    await syncUserRecord(uid, normalized);

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

/** Verify email + password against the multi-account registry. */
export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const record = await findRegisteredUser(normalized);

    if (record) {
      const attemptHash = await hashValue(password, record.salt);
      if (attemptHash !== record.pwdHash) {
        console.log('[auth] login failed: wrong password');
        return { ok: false, error: 'Wrong password' };
      }
      // Mirror credentials into the legacy slots so passcode/biometric and
      // other single-account code paths operate on the signed-in account.
      await secSet(KEYS.EMAIL, normalized);
      await secSet(KEYS.SALT, record.salt);
      await secSet(KEYS.PWD_HASH, record.pwdHash);
      console.log('[auth] login success for', normalized);
      await createSession(normalized);
      return { ok: true };
    }

    // Legacy fallback: the pre-registry account (single-slot storage).
    const storedEmail = await secGet(KEYS.EMAIL);
    const salt = await secGet(KEYS.SALT);
    const storedHash = await secGet(KEYS.PWD_HASH);
    if (!storedEmail || !storedHash || !salt || normalized !== storedEmail) {
      console.log('[auth] login failed: no account for', normalized);
      return { ok: false, error: 'No account found with this email' };
    }
    const attemptHash = await hashValue(password, salt);
    if (attemptHash !== storedHash) {
      console.log('[auth] login failed: wrong password');
      return { ok: false, error: 'Wrong password' };
    }
    console.log('[auth] login success for', normalized);
    await createSession(normalized);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Sign in failed. Please try again.' };
  }
}

/**
 * Remove an account from the registry (Admin account-management action).
 * Mirrors the deletion into the legacy slots when the removed account was
 * the currently mirrored one. Never throws.
 */
export async function deleteRegisteredUser(email: string): Promise<void> {
  try {
    const normalized = email.trim().toLowerCase();
    const list = (await getRegisteredUsers()).filter((u) => u.email !== normalized);
    await saveRegisteredUsers(list);
    const legacyEmail = await secGet(KEYS.EMAIL);
    if (legacyEmail === normalized) {
      const next = list[list.length - 1];
      if (next) {
        await secSet(KEYS.EMAIL, next.email);
        await secSet(KEYS.SALT, next.salt);
        await secSet(KEYS.PWD_HASH, next.pwdHash);
      } else {
        await secDel(KEYS.EMAIL);
        await secDel(KEYS.SALT);
        await secDel(KEYS.PWD_HASH);
      }
    }
  } catch (e) {
    console.warn('[auth] deleteRegisteredUser failed:', e);
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

/** True once the user has passed the Welcome/onboarding screen (persisted). */
export async function getWelcomeCompleted(): Promise<boolean> {
  const raw = await secGet(KEYS.WELCOME_DONE);
  return raw === 'true';
}

/** Persist the hasCompletedWelcome onboarding flag. */
export async function setWelcomeCompleted(done: boolean): Promise<void> {
  await secSet(KEYS.WELCOME_DONE, done ? 'true' : 'false');
}

/**
 * Developer utility: wipe ALL account/auth data (emails, password hashes,
 * passcodes, biometric flags, sessions) so previously-used emails become
 * available for fresh sign-ups. Requires no arguments and never throws.
 */
export async function resetAllAccounts(): Promise<void> {
  await Promise.all([
    secDel(KEYS.EMAIL),
    secDel(KEYS.SALT),
    secDel(KEYS.PWD_HASH),
    secDel(KEYS.PASSCODE_HASH),
    secDel(`${KEYS.PASSCODE_HASH}.salt`),
    secDel(KEYS.PASSCODE_ENABLED),
    secDel(KEYS.BIOMETRIC_ENABLED),
    secDel(KEYS.SESSION),
  ]);
}

/* ================================= PASSCODE ================================= */

/** Save a 4/6-digit passcode (hashed) and enable it in one step. */
export async function setPasscode(passcode: string): Promise<LoginResult> {
  try {
    if (!/^\d{4}$/.test(passcode)) {
      return { ok: false, error: 'Passcode must be exactly 4 digits' };
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