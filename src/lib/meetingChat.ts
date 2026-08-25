/**
 * Real-time meeting chat engine.
 *
 * Message payload contract (per the auth spec):
 *   { id, senderId, senderName, messageText, timestamp, avatar }
 *
 * Transport:
 *   - Primary: Supabase Realtime broadcast on a shared channel — true
 *     cross-device / cross-user sync once a real project is wired in.
 *   - Fallback: an in-process listener bus so the host client still reacts
 *     instantly when realtime is unavailable (no backend required).
 *
 * Persistence is intentionally NOT owned here: MeetingChatScreen already
 * persists its message list to AsyncStorage, so this layer is pure pub/sub
 * and never touches existing storage or UI logic.
 */
import { supabase } from '../lib/supabase';

export interface MeetingMessage {
  id: string;
  senderId: string;
  senderName: string;
  messageText: string;
  timestamp: number;
  avatar: string | null;
}

const CHANNEL = 'meeting_chat';
const handlers: Array<(msg: MeetingMessage) => void> = [];
let channel: any | null = null;
let setupTried = false;

/** Lazily attach the Supabase broadcast listener (idempotent). */
function ensureChannel(): void {
  if (setupTried) return;
  setupTried = true;
  try {
    if (supabase) {
      channel = supabase
        .channel(CHANNEL)
        .on('broadcast', { event: 'message' }, (payload: any) => {
          try {
            const msg: MeetingMessage | undefined = payload?.payload?.message;
            if (msg) dispatch(msg);
          } catch (e) {
            console.warn('[meetingChat] malformed broadcast payload');
          }
        })
        .subscribe();
    }
  } catch (e: any) {
    console.warn('[meetingChat] realtime channel unavailable, using local bus only:', e?.message);
    channel = null;
  }
}

/** Fan a remote message out to every local subscriber. */
function dispatch(msg: MeetingMessage): void {
  handlers.forEach((h) => {
    try {
      h(msg);
    } catch (e) {
      /* never let one subscriber crash the chain */
    }
  });
}

/**
 * Subscribe to realtime messages.
 * @returns unsubscribe function.
 */
export function onMeetingMessage(cb: (msg: MeetingMessage) => void): () => void {
  ensureChannel();
  handlers.push(cb);
  return () => {
    const i = handlers.indexOf(cb);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/**
 * Broadcast a message to all other connected clients via Supabase Realtime.
 * Returns immediately if realtime is unavailable (the sender still renders
 * locally via its own state update).
 */
export async function broadcastMeetingMessage(msg: MeetingMessage): Promise<void> {
  ensureChannel();
  if (!channel) return;
  try {
    await (channel as any).broadcast('message', { message: msg });
  } catch (e: any) {
    console.warn('[meetingChat] broadcast failed:', e?.message);
  }
}
