/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are an intelligent, versatile, and supportive AI assistant embedded in the cooperative application.

Core Behavior:
1. Versatile Knowledge: Answer general knowledge/coding questions AND app-specific cooperative inquiries accurately and directly.
2. Direct Openings: Jump straight into the answer without introductory fluff.
3. Clear Structure: Prioritize scannability using bullet points and bolding.
4. Tone & Style: Maintain an authentic, grounded, and helpful tone.`;

interface ChatTurn {
  role?: string;
  sender?: string;
  text?: string;
  content?: string;
  message?: string;
}

// Current-generation Gemini models - tried in order until one accepts the request.
// Older models (gemini-1.5-*, gemini-2.5-flash) have been retired by Google and
// return 404 NOT_FOUND. Prioritized current stable model, then short aliases.
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
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
    const rawHistory: ChatTurn[] = Array.isArray(body?.chatHistory)
      ? body.chatHistory
      : Array.isArray(body?.history)
      ? body.history
      : [];

    if (!userMessage || !userMessage.trim()) {
      return new Response(JSON.stringify({ error: 'Missing userMessage' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const extractText = (turn: ChatTurn): string => {
      return (turn?.text || turn?.content || turn?.message || '').trim();
    };

    const mapRole = (roleStr?: string, senderStr?: string): 'user' | 'model' => {
      const r = (roleStr || senderStr || '').toLowerCase();
      if (r === 'assistant' || r === 'model' || r === 'bot' || r === 'coop ai') {
        return 'model';
      }
      return 'user';
    };

    const formattedHistory = rawHistory
      .map(turn => ({
        role: mapRole(turn.role, turn.sender),
        parts: [{ text: extractText(turn) }]
      }))
      .filter(turn => turn.parts[0].text.length > 0);

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: userMessage.trim() }] }
    ];

    const retryStatuses = [404, 429, 503];
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let okResponse: Response | null = null;
    let lastDetail: any = null;
    let lastModel = '';

    for (const model of GEMINI_MODELS) {
      // Retry transient failures (503 high demand / 429 rate limit) up to 2x
      // per model with a short backoff before falling to the next model.
      for (let attempt = 0; attempt < 3; attempt++) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: contents
          })
        });

        if (response.ok) {
          okResponse = response;
          break;
        }

        lastDetail = await response.json().catch(() => null);
        lastModel = model;
        if (retryStatuses.includes(response.status) && attempt < 2) {
          console.error(`Gemini ${model} ${response.status}, retrying (${attempt + 1}/2)`);
          await delay(600 * (attempt + 1));
          continue;
        }
        break; // non-retryable error for this model
      }

      if (okResponse) break;
      console.error(`Gemini attempts for ${model} failed:`, JSON.stringify(lastDetail));
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
