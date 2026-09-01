/**
 * AI Chat Assistant client service.
 *
 * Talks to the Coop AI chat endpoint (Supabase Edge Function coop-ai),
 * which is the app's equivalent of POST /api/chat:
 *
 *   Request body : { userMessage: string, chatHistory?: [{ role, content }] }
 *   Response     : text/event-stream (Gemini SSE stream) OR { reply: string }
 *
 * The authoritative SYSTEM_PROMPT lives server-side (supabase/functions/
 * coop-ai/index.ts) so it cannot be tampered with from the client.
 */
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_UNCONFIGURED,
} from './supabase';

// Reference only — the real prompt is server-side. Kept here for documentation
 // and local tooling so the client never needs to duplicate it.
export const SYSTEM_PROMPT = `
You are Coop AI, the official assistant for our cooperative banking app with the name standard mutual savings.

=== APP KNOWLEDGE ===
Standard mutual savings is built by a prominent developer who is also the CEO of LumiBiz business Assist app since 1896.
- Savings Plans: Weekly savings require a minimum of ?1,000. Monthly savings earn 10% annual interest.
- Loans: Users qualify after 3 months of active contributions. Maximum loan amount is 2x total savings balance.
- Interest Rates: Simple interest calculated at 5% annually for normal loans, 2% for emergency loans.
- Withdrawals: Processed within 24 hours. Emergency withdrawals incur a 1% processing fee.
- Support Contact: ivyjaf1@gmail.com or via the Help tab.

=== RESPONSE RULES ===
1. Only answer app-related questions using the Knowledge Base above.
2. If a general knowledge question is asked, answer it accurately and directly.
3. If an app question is asked that is not in the knowledge base, direct the user to human support.
`;

/** A single conversation turn sent alongside the system prompt. */
export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

const ANON_KEY_HELP =
  'Supabase is not configured. Open src/lib/supabase.js and paste your ' +
  'project anon key into SUPABASE_ANON_KEY (Dashboard ? Settings ? API).';

/**
 * User-facing message for any AI configuration failure. Raw API error
 * payloads are replaced by this friendly copy so secrets never leak to the UI.
 */
export const AI_CONFIG_ERROR_MESSAGE =
  'AI Service is temporarily unavailable due to API configuration. Please check back shortly.';

/**
 * Extract the assistant reply from a Gemini SSE stream.
 *
 * The Edge Function pipes Gemini's streamGenerateContent response (alt=sse)
 * directly to the client. Each `data:` line is a JSON object containing
 * candidates with text parts. We concatenate all text parts to form the
 * full reply.
 *
 * Example SSE chunk:
 *   data: {"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"}},"index":0]}
 */
function parseSseStream(text: string): string {
  const lines = text.split('\n');
  let reply = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) continue;
    try {
      const chunk = JSON.parse(jsonStr);
      const parts = chunk?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.text) reply += part.text;
        }
      }
    } catch {
      // Skip malformed chunk — the stream may contain partial JSON.
    }
  }
  return reply.trim();
}

/**
 * Send a prompt to the Supabase Edge Function coop-ai (Gemini-powered).
 *
 * The Edge Function is the ONLY production AI gateway. It keeps the Gemini
 * API key server-side as a Supabase secret — the client never calls Gemini
 * directly and never possesses the key.
 *
 * @param userPrompt - The user's latest message.
 * @param chatHistory - Prior turns for context (last 20 valid turns).
 * @returns The assistant's reply text.
 */
export async function askAI(
  userPrompt: string,
  chatHistory: ChatHistoryTurn[] = [],
): Promise<string> {
  const trimmedMessage = String(userPrompt || '').trim();
  if (!trimmedMessage) {
    throw new Error('A message is required.');
  }

  if (SUPABASE_UNCONFIGURED) {
    throw new Error(ANON_KEY_HELP);
  }

  const history = (Array.isArray(chatHistory) ? chatHistory : [])
    .filter((t) => t && typeof t.content === 'string' && t.content.trim())
    .slice(-20);

  const body = {
    userMessage: trimmedMessage,
    chatHistory: history,
  };

  const endpoint = `${SUPABASE_URL}/functions/v1/coop-ai`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.error('[aiChat] network error contacting edge function:', msg);
    throw new Error(AI_CONFIG_ERROR_MESSAGE);
  }

  if (!response.ok) {
    // Non-2xx: log the real error for developers, but never expose it raw.
    const errText = (await response.text()).slice(0, 500);
    console.error('[aiChat] edge function returned', response.status, errText);
    throw new Error(AI_CONFIG_ERROR_MESSAGE);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    // SSE stream — parse the Gemini streaming format.
    const text = await response.text();
    const reply = parseSseStream(text);
    if (!reply) {
      console.error('[aiChat] SSE stream contained no text');
      throw new Error(AI_CONFIG_ERROR_MESSAGE);
    }
    return reply;
  }

  // Fallback: plain JSON { reply: string }
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    if (json?.reply) return json.reply.trim();
  } catch {
    if (text.trim()) return text.trim();
  }

  console.error('[aiChat] unexpected response format:', text.slice(0, 200));
  throw new Error(AI_CONFIG_ERROR_MESSAGE);
}

/**
 * Send a prompt (with optional conversation history) to the chat endpoint.
 *
 * Thin wrapper around askAI — preserved as a separate export so existing
 * imports continue to work while the implementation stays in one place.
 *
 * @param userMessage - The user's latest message.
 * @param chatHistory - Prior turns for context.
 * @returns The assistant's reply text.
 */
export async function sendChatMessage(
  userMessage: string,
  chatHistory: ChatHistoryTurn[] = [],
): Promise<string> {
  return askAI(userMessage, chatHistory);
}

export default { SYSTEM_PROMPT, sendChatMessage, askAI };