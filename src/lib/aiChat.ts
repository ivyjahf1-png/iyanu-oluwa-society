/**
 * AI Chat Assistant client service.
 *
 * Talks to the Coop AI chat endpoint (Supabase Edge Function `coop-ai`),
 * which is the app's equivalent of  POST /api/chat:
 *
 *   Request body : { userMessage: string, chatHistory?: [{ role, content }] }
 *   Response     : { reply: string }
 *
 * The authoritative SYSTEM_PROMPT lives server-side (supabase/functions/
 * coop-ai/index.ts) so it cannot be tampered with from the client; it is
 * re-declared here purely as documentation/reference for local tooling.
 */
import { SUPABASE_UNCONFIGURED, supabase } from './supabase';

export const SYSTEM_PROMPT = `
You are an intelligent, versatile, and supportive AI assistant embedded in the application.

Core Behavior:
1. Versatile Knowledge: Answer both general knowledge questions and app-specific inquiries accurately and directly.
2. Direct Openings: Jump straight into the answer without introductory fluff or robotic setup phrases (e.g., avoid "Here is a list of...", "Sure, I can help with that").
3. Clear Structure: Prioritize scannability using bullet points, inline bolding, and markdown tables for comparative or complex data.
4. Tone & Style: Maintain an authentic, grounded, and helpful tone.
`;

/** A single conversation turn sent alongside the system prompt. */
export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

const ANON_KEY_HELP =
  'Supabase is not configured. Open src/lib/supabase.js and paste your ' +
  'project anon key into SUPABASE_ANON_KEY (Dashboard → Settings → API).';

/**
 * Model chain for the direct Gemini fallback. `gemini-1.5-flash` is tried
 * first (per spec) but has been retired by Google (404), so newer models are
 * attempted in order until one accepts the request.
 */
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

/** Read the Gemini key from env without crashing when absent. */
function geminiKey(): string {
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
}

/**
 * Direct-to-Gemini fallback used when the Edge Function fails or returns a
 * non-200 response. Applies SYSTEM_PROMPT + history exactly like the server
 * route so replies stay consistent either way.
 */
async function askGeminiDirect(
  userMessage: string,
  history: ChatHistoryTurn[],
): Promise<string> {
  const key = geminiKey();
  if (!key) {
    throw new Error(
      'The AI service is unavailable and no Gemini key is configured for the direct fallback.',
    );
  }

  const contents = [
    ...history.map(t => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  let lastDetail = '';
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000, topP: 0.95 },
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const reply =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('') ?? '';
        if (reply.trim()) return reply.trim();
        lastDetail = 'Empty response from model.';
        continue;
      }
      lastDetail = await res.text();
      // 404 → retired/unsupported model; try the next one in the chain.
      if (res.status !== 404 && res.status !== 400) break;
    } catch (e: any) {
      lastDetail = e?.message || String(e);
    }
  }

  throw new Error(
    'The AI service could not be reached directly. ' + lastDetail.slice(0, 160),
  );
}

/**
 * Send a prompt to the Supabase Edge Function `coop-ai` (Gemini-powered).
 *
 * Uses the Supabase JS client's `functions.invoke` so the request is
 * automatically authenticated with the anon key and routed correctly.
 *
 * @param {string} userPrompt - The user's latest message.
 * @param {Array<{ role: string, content: string }>} [chatHistory] - Prior turns for context.
 * @returns {Promise<string>} The assistant's reply text.
 */
export async function askAI(userPrompt, chatHistory = []) {
  const { data, error } = await supabase.functions.invoke('coop-ai', {
    body: { prompt: userPrompt, history: chatHistory },
  });
  if (error) throw error;
  return data.reply;
}

/**
 * Send a prompt (with optional conversation history) to the chat endpoint.
 *
 * @param {string} userMessage - The user's latest message.
 * @param {ChatHistoryTurn[]} [chatHistory] - Prior turns for context.
 * @returns {Promise<string>} The assistant's reply text.
 */
export async function sendChatMessage(userMessage, chatHistory = []) {
  if (!userMessage || !String(userMessage).trim()) {
    throw new Error('A message is required.');
  }
  if (SUPABASE_UNCONFIGURED) {
    throw new Error(ANON_KEY_HELP);
  }

  // OpenAI-style roles: 'user' | 'assistant'.
  const history = (Array.isArray(chatHistory) ? chatHistory : [])
    .filter(t => t && typeof t.content === 'string' && t.content.trim())
    .slice(-20); // keep the payload lean — last 20 turns is ample context.

  // Dual-format payload:
  //  - `userMessage` / `chatHistory`  → current endpoint contract.
  //  - `prompt` / `history`           → legacy fallback so older deployments
  //    that have not been redeployed yet keep working unchanged.
  const trimmedMessage = String(userMessage).trim();
  const body = {
    userMessage: trimmedMessage,
    chatHistory: history,
    prompt: trimmedMessage,
    history: history.map(t => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      text: t.content,
    })),
  };

  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY';
  const functionsUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://kvvodpeewrbdbdtlvzuc.supabase.co';
  const endpoint = `${functionsUrl}/functions/v1/coop-ai`;

  // Plain fetch instead of functions.invoke so real HTTP status codes are
  // readable and the Gemini fallback can trigger on any non-200 response.
  let edgeFailed = false;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (reply) return reply;
      edgeFailed = true; // 200 but unusable body → still try the fallback.
    } else {
      const errText = (await res.text()).slice(0, 200);
      console.warn('[aiChat] edge function', res.status, errText);
      if (/not configured/i.test(errText)) {
        throw new Error(
          'The coop-ai function is missing GEMINI_API_KEY. Run: supabase secrets set GEMINI_API_KEY=<your-key>',
        );
      }
      edgeFailed = true;
    }
  } catch (e: any) {
    if (typeof e?.message === 'string' && /GEMINI_API_KEY/.test(e.message)) throw e;
    edgeFailed = true;
  }

  // Fallback — talk to Gemini directly from the client.
  if (edgeFailed) {
    return askGeminiDirect(trimmedMessage, history);
  }

  throw new Error('No response received.');
}

export default { SYSTEM_PROMPT, sendChatMessage, askAI };
