/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

// ============================================================================
// Coop AI Assistant — Universal (Supabase Edge Function)
// Deno runtime — deploy with:  supabase functions deploy coop-ai
//
// Handles BOTH cooperative app actions (savings, loans, repayments) and any
// general knowledge / real-world / creative / conversational question via the
// Google Gemini API.
//
// Required secret:  supabase secrets set GEMINI_API_KEY=<your-key>
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_INSTRUCTION = `You are an intelligent, friendly, and adaptive AI Assistant embedded in the cooperative platform. You provide clear, accurate answers for cooperative financial tasks (savings, loan requirements, repayment formulas) as well as any general knowledge, technical, real-world, creative, or conversational questions the user asks outside of the app context.`;

// Optional Supabase client (anon) — reserved for future app-data lookups.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { auth: { persistSession: false } },
);

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
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

    const { prompt, history } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Build the conversation contents (prior turns + the new user prompt).
    const turns: ChatTurn[] = Array.isArray(history) ? history : [];
    const contents = [
      ...turns
        .filter(t => t && (t.role === 'user' || t.role === 'model') && t.text)
        .map(t => ({ role: t.role, parts: [{ text: String(t.text) }] })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: 'Gemini request failed', detail: errText }),
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