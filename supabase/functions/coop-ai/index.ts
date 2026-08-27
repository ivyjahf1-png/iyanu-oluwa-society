/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are Coop AI, the official assistant for our cooperative banking app with the name standard mutual savings.

=== APP KNOWLEDGE ===
Standard mutual savings is built by a prominent developer who is also the CEO of LumiBiz business Assist app since 1896.
- Savings Plans: Weekly savings require a minimum of ₦1,000. Monthly savings earn 10% annual interest.
- Loans: Users qualify after 3 months of active contributions. Maximum loan amount is 2x total savings balance.
- Interest Rates: Simple interest calculated at 5% annually for normal loans, 2% for emergency loans.
- Withdrawals: Processed within 24 hours. Emergency withdrawals incur a 1% processing fee.
- Support Contact: ivyjaf1@gmail.com or via the Help tab.

=== RESPONSE RULES ===
1. Only answer app-related questions using the Knowledge Base above.
2. If a general knowledge question is asked, answer it accurately and directly.
3. If an app question is asked that is not in the knowledge base, direct the user to human support.`;

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
    let stream: ReadableStream | null = null;
    let lastDetail: any = null;
    let lastModel = '';

    for (const model of GEMINI_MODELS) {
      // Retry transient failures (503 high demand / 429 rate limit) up to 2x
      // per model with a short backoff before falling to the next model.
      for (let attempt = 0; attempt < 3; attempt++) {
        // streamGenerateContent + SSE gives token-by-token latency (~instant).
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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

        if (response.ok && response.body) {
          stream = response.body;
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

      if (stream) break;
      console.error(`Gemini attempts for ${model} failed:`, JSON.stringify(lastDetail));
    }

    if (!stream) {
      return new Response(
        JSON.stringify({ error: 'Gemini stream failed', model: lastModel, detail: lastDetail }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Pipe the Gemini SSE stream straight back to the client as
    // text/event-stream, so answers render progressively instead of
    // arriving in one JSON blob after the full response completes.
    return new Response(stream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
