/**
 * Co-op AI chat history — database persistence layer.
 *
 * Persists AI conversation history mapped by user_id + session_id so it
 * survives app restarts and re-login. Wraps the RPC "routes" from migration
 * 0006 (get_or_create_ai_session / save_ai_message / list_ai_sessions /
 * fetch_ai_history / delete_ai_session).
 *
 * When Supabase is unconfigured, it transparently falls back to AsyncStorage
 * so chat still persists per device/session without backend writes.
 */
import { supabase, SUPABASE_UNCONFIGURED } from './supabase';
import { storage } from './storage';

const LOCAL_SESSION_KEY = '@ius_ai_session';
const LOCAL_HISTORY_KEY = '@ius_ai_history';

export interface AiHistoryTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface AiSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** Coerce an RPC row (snake_case) into the app's turn shape. */
function mapTurn(row: any, fallbackId: string): AiHistoryTurn {
  return {
    id: String(row?.id || fallbackId),
    role: (row?.role === 'assistant' ? 'assistant' : 'user'),
    content: row?.content || '',
    createdAt: row?.created_at
      ? new Date(row.created_at).getTime()
      : Date.now(),
  };
}

function mapSession(row: any): AiSession {
  return {
    id: String(row?.id),
    title: row?.title || 'New chat',
    createdAt: row?.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row?.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

const isConfigured = () => !SUPABASE_UNCONFIGURED && !!supabase;

/** Ensure a session exists for the current user; returns its id. */
export async function ensureAiSession(title = 'New chat'): Promise<AiSession> {
  if (isConfigured()) {
    const { data, error } = await supabase.rpc('get_or_create_ai_session', {
      p_title: title,
    });
    if (!error && data) {
      const session = mapSession(data);
      storage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session)).catch(() => {});
      return session;
    }
    console.warn('[aiHistory] ensure session rpc failed:', error?.message);
  }

  // Fallback: local session id.
  const fallback: AiSession = {
    id: `local-${Date.now()}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  try {
    const raw = await storage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.id) return cached as AiSession;
    }
  } catch { /* corrupted */ }
  storage.setItem(LOCAL_SESSION_KEY, JSON.stringify(fallback)).catch(() => {});
  return fallback;
}

/** Persist one chat turn (user or assistant) for a session. */
export async function saveAiMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  if (!content || !String(content).trim()) return;

  if (isConfigured()) {
    const { error } = await supabase.rpc('save_ai_message', {
      p_session_id: sessionId,
      p_role: role,
      p_content: content,
    });
    if (!error) return;
    console.warn('[aiHistory] save message rpc failed:', error?.message);
  }

  // Local fallback so history persists even when offline/unconfigured.
  try {
    const raw = (await storage.getItem(LOCAL_HISTORY_KEY)) || '[]';
    const turns: AiHistoryTurn[] = JSON.parse(raw) || [];
    turns.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content: String(content).trim(),
      createdAt: Date.now(),
    });
    await storage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(turns));
  } catch (e) {
    console.warn('[aiHistory] local save failed:', e);
  }
}

/** Fetch the full history for a session (used on mount / re-login). */
export async function fetchAiHistory(sessionId: string): Promise<AiHistoryTurn[]> {
  if (isConfigured()) {
    const { data, error } = await supabase.rpc('fetch_ai_history', {
      p_session_id: sessionId,
    });
    if (!error && Array.isArray(data)) {
      return data.map((row, i) => mapTurn(row, `h-${i}`));
    }
    console.warn('[aiHistory] fetch history rpc failed:', error?.message);
  }

  // Local fallback (shared history store).
  try {
    const raw = (await storage.getItem(LOCAL_HISTORY_KEY)) || '[]';
    const turns: AiHistoryTurn[] = JSON.parse(raw) || [];
    return turns.filter(
      (t) =>
        !String(t.id).startsWith('local-') || String(t.id).startsWith(sessionId),
    );
  } catch {
    return [];
  }
}

/** List all sessions for the current user (newest first). */
export async function listAiSessions(): Promise<AiSession[]> {
  if (isConfigured()) {
    const { data, error } = await supabase.rpc('list_ai_sessions');
    if (!error && Array.isArray(data)) {
      return data.map(mapSession);
    }
    console.warn('[aiHistory] list sessions rpc failed:', error?.message);
  }
  return [];
}

/** Explicitly delete a session and its messages. */
export async function deleteAiSession(sessionId: string): Promise<void> {
  if (isConfigured()) {
    const { error } = await supabase.rpc('delete_ai_session', {
      p_session_id: sessionId,
    });
    if (!error) return;
    console.warn('[aiHistory] delete session rpc failed:', error?.message);
  }
  // Local: if it's a local session, clear the shared history store.
  if (String(sessionId).startsWith('local-')) {
    await storage.removeItem(LOCAL_HISTORY_KEY).catch(() => {});
  }
}

export default {
  ensureAiSession,
  saveAiMessage,
  fetchAiHistory,
  listAiSessions,
  deleteAiSession,
};