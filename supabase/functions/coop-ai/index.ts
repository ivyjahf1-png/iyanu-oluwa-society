/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are an intelligent, versatile, and supportive AI assistant embedded in the application.

Core Behavior:
1. Versatile Knowledge: Answer both general knowledge questions and app-specific inquiries accurately and directly.
2. Direct Openings: Jump straight into the answer without introductory fluff.
3. Clear Structure: Prioritize scannability using bullet points and bolding.
4. Tone & Style: Maintain an authentic, grounded, and helpful tone.`;

interface ChatTurn {
  role: 'user' | 'model' | 'assistant' | 'system';
  text?: string;
  content?: string;
}

// Current Gemini models - tried in order until one accepts the request.
// (gemini-1.5-* have been retired by Google and return 404 NOT_FOUND.)
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY secret missing on Supabase' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const userMessage: string = body?.userMessage ?? body?.prompt;
    const chatHistory: ChatTurn[] = Array.isArray(body?.chatHistory) ? body.chatHistory : Array.isArray(body?.history) ? body.history : [];

    if (!userMessage || !userMessage.trim()) {
      return new Response(JSON.stringify({ error: 'Missing userMessage' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const toText = (t: ChatTurn) => String(t?.text ?? t?.content ?? '');
    const toRole = (r: string) => (r === 'assistant' || r === 'system' ? 'model' : 'user');

    const contents = [
      ...chatHistory
        .filter(t => t && ['user', 'model', 'assistant', 'system'].includes(t.role) && toText(t))
        .map(t => ({ role: toRole(t.role), parts: [{ text: toText(t) }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    let okResponse: Response | null = null;
    let lastDetail: any = null;
    let lastModel = '';

    for (const model of GEMINI_MODELS) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: contents,
          generationConfig: {
            maxOutputTokens: 1000
          }
        })
      });

      if (response.ok) {
        okResponse = response;
        break;
      }

      // 404 means the model is retired/unavailable -> try the next one.
      // Any other failure (401 bad key, 429 quota, 400 bad request) stops the chain.
      lastDetail = await response.json().catch(() => null);
      lastModel = model;
      console.error(`Gemini attempt with ${model} failed:`, JSON.stringify(lastDetail));
      if (response.status !== 404 && response.status !== 400) break;
    }

    if (!okResponse) {
      return new Response(
        JSON.stringify({ error: 'Gemini request failed', model: lastModel, detail: lastDetail }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const data = await okResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
