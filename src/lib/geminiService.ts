import { GoogleGenAI } from '@google/genai';

/**
 * Gemini Service Helper
 *
 * Initializes the official @google/genai SDK and exposes a single
 * generateAnswer(prompt, history) function that the Co-op AI chat screen
 * calls when the user submits a message.
 *
 * The API key is read from Expo's public env (inlined at build time) so it
 * ships with the client bundle. Falls back to GEMINI_API_KEY for non-Expo
 * runtimes (e.g. a local Node test harness).
 */

/** Pull the Gemini key from the Expo client environment without crashing. */
function getGeminiKey(): string {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!key) {
    console.error(
      '[geminiService] Gemini API Key missing. ' +
        'Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file to enable AI responses.',
    );
  }
  return key;
}

/** Human-friendly copy surfaced when the SDK throws or the network drops. */
export const GEMINI_ERROR_MESSAGE =
  'AI Service is temporarily unavailable. Please check your connection and try again.';

/** Lazily-instantiated SDK client (created on first use so env is ready). */
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (_ai) return _ai;
  const key = getGeminiKey();
  if (!key) return null;
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
}

/**
 * Send a prompt (with optional prior chat history) to Gemini and return the
 * assistant's reply text.
 *
 * @param prompt  The user's latest message.
 * @param history Prior turns for context (newest last). Roles: 'user' | 'model'.
 * @returns The assistant reply text, or throws a user-friendly Error.
 */
export async function generateAnswer(
  prompt: string,
  history: Array<{ role: string; content: string }> = [],
): Promise<string> {
  if (!prompt || !prompt.trim()) {
    throw new Error('A message is required.');
  }

  const ai = getAI();
  if (!ai) {
    throw new Error(
      'Gemini is not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.',
    );
  }

  try {
    // Build the contents array: history turns followed by the latest prompt.
    // The @google/genai SDK uses 'model' (not 'assistant') for prior replies.
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const turn of history.slice(-20)) {
      if (!turn || !turn.content || !turn.content.trim()) continue;
      const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: turn.content }] });
    }

    // Always end with the user's latest prompt.
    contents.push({ role: 'user', parts: [{ text: prompt.trim() }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    // The SDK returns .text for simple (non-streaming) responses.
    const text = (response as any)?.text;
    if (typeof text === 'function') {
      const out = text.call(response);
      if (!out || !out.trim()) {
        throw new Error('Gemini returned an empty response.');
      }
      return out.trim();
    }
    if (typeof text === 'string' && text.trim()) {
      return text.trim();
    }

    // Fallback: dig into candidates if .text isn't populated.
    const candidates = (response as any)?.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const candidateText = candidates[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .filter(Boolean)
        .join('\n')
        .trim();
      if (candidateText) return candidateText;
    }

    throw new Error('Gemini returned an unrecognised response shape.');
  } catch (err: any) {
    const raw = err?.message || String(err);

    // Log the real error for developers; throw a friendly copy for users.
    console.error('[geminiService] generateAnswer failed:', raw);

    // Configuration errors (bad key, quota) — surface a precise hint.
    if (/API key|apikey|invalid|unauthorized|401|403|quota|billing/i.test(raw)) {
      throw new Error(
        'Gemini API key is invalid or has hit its quota. Check EXPO_PUBLIC_GEMINI_API_KEY.',
      );
    }
    if (/network|fetch|ENOTFOUND|ECONNREFUSED|timeout|socket/i.test(raw)) {
      throw new Error('Network error reaching Gemini. Check your connection.');
    }

    // Anything else → generic friendly message.
    throw new Error(GEMINI_ERROR_MESSAGE);
  }
}

export default { generateAnswer, GEMINI_ERROR_MESSAGE };
