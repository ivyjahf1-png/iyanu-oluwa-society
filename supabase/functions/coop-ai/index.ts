/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

// ============================================================================
// Coop AI Assistant — Universal Chat Endpoint (Supabase Edge Function)
// Deno runtime — deploy with:  supabase functions deploy coop-ai
//
// Equivalent of:  POST /api/chat
//   Body:  { userMessage: string, chatHistory?: Array<{ role, content|text }> }
//   Resp:  { reply: string }
//
// Handles BOTH cooperative app actions (savings, loans, repayments) and any
// general knowledge / real-world / creative / conversational question via the
// Google Gemini API.
//
// Required secret:  supabase secrets set GEMINI_API_KEY=<your-key>
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta';

/**
 * Model fallback chain. Google retires older models over time
 * (gemini-1.5-flash now returns 404 NOT_FOUND), so we try current models in
 * order until one accepts the request. `gemini-flash-latest` is Google's
 * rolling alias for the newest stable Flash model.
 */
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `
You are an intelligent, versatile, and supportive AI assistant embedded in the application.

Core Behavior:
1. Versatile Knowledge: Answer both general knowledge questions and app-specific inquiries accurately and directly.
2. Direct Openings: Jump straight into the answer without introductory fluff or robotic setup phrases (e.g., avoid "Here is a list of...", "Sure, I can help with that").
3. Clear Structure: Prioritize scannability using bullet points, inline bolding, and markdown tables for comparative or complex data.
4. Tone & Style: Maintain an authentic, grounded, and helpful tone.
`;

// Optional Supabase client (anon) — reserved for future app-data lookups.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { auth: { persistSession: false } },
);

interface ChatTurn {
  role: 'user' | 'model' | 'assistant' | 'system';
  text?: string;
  content?: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();

    // New contract: { userMessage, chatHistory }
    // Legacy contract (kept for backward compatibility): { prompt, history }
    const userMessage: string = body?.userMessage ?? body?.prompt;
    const chatHistory: ChatTurn[] =
      Array.isArray(body?.chatHistory) ? body.chatHistory :
      Array.isArray(body?.history) ? body.history : [];

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return new Response(JSON.stringify({ error: 'Missing userMessage' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const toText = (t: ChatTurn) => String(t?.text ?? t?.content ?? '');
    const toRole = (r: string) => (r === 'assistant' || r === 'system' ? 'model' : 'user');

    // Build the conversation contents (prior turns + the new user message).
    const contents = [
      ...chatHistory
        .filter(t => t && ['user', 'model', 'assistant', 'system'].includes(t.role) && toText(t))
        .map(t => ({ role: toRole(t.role), parts: [{ text: toText(t) }] })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    // Try each model in the chain until one accepts the request. This keeps
    // the assistant working when Google retires a specific model version.
    let geminiResponse: Response | null = null;
    let lastErrorText = '';
    for (const model of GEMINI_MODELS) {
      const res = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              topP: 0.95,
            },
          }),
        },
      );
      if (res.ok) {
        geminiResponse = res;
        break;
      }
      lastErrorText = await res.text();
      // 404 = model retired/unavailable for this key → try the next model.
      if (res.status !== 404) break;
    }

    if (!geminiResponse) {
      return new Response(
        JSON.stringify({ error: 'Gemini request failed', detail: lastErrorText }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const geminiData = await geminiResponse.json();
    const reply: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'Sorry, I could not generate a response right now.';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});