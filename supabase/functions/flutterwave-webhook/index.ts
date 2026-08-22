/// <reference lib="deno.window" />
/// <reference lib="deno.ns" />

// ============================================================================
// Flutterwave Webhook Handler (Supabase Edge Function)
// Deno runtime — deploy with:  supabase functions deploy flutterwave-webhook
//
// Responsibilities:
//   1. Verify the request signature against `flutterwave_secret_hash`
//      stored in app_settings (read with the service_role client).
//   2. Confirm the payment payload and locate the matching pending deposit.
//   3. Atomically mark it 'successful' and increment the member balance.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// service_role bypasses RLS — required to read secrets and update any row.
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getSecretHash(): Promise<string> {
  const { data, error } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'flutterwave_secret_hash')
    .single();
  if (error || !data?.value) throw new Error('flutterwave_secret_hash is not configured');
  return data.value;
}

/** Constant-time-ish comparison to avoid trivial timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // ---- 1. Signature verification -----------------------------------------
    const secretHash = await getSecretHash();
    const signature = req.headers.get('verif-hash') || '';

    if (!signature || !safeEqual(signature, secretHash)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ---- 2. Parse the Flutterwave payload ----------------------------------
    const payload = await req.json();
    const event = payload['event'];
    const data = payload['data'] ?? {};

    if (event !== 'charge.completed' && data['status'] !== 'successful') {
      return new Response(JSON.stringify({ received: true, ignored: event }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const txRef: string = data['tx_ref'] ?? '';
    const paidAmount: number = Number(data['amount'] ?? 0);

    if (!txRef) {
      return new Response(JSON.stringify({ error: 'Missing tx_ref' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ---- 3. Locate the matching pending deposit ----------------------------
    const { data: deposit, error: depositError } = await adminClient
      .from('deposits')
      .select('id, user_id, amount, status')
      .eq('reference_id', txRef)
      .eq('status', 'pending')
      .single();

    if (depositError || !deposit) {
      return new Response(
        JSON.stringify({ received: true, note: 'No matching pending deposit' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (paidAmount < Number(deposit.amount)) {
      await adminClient.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
      return new Response(JSON.stringify({ error: 'Underpayment detected' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ---- 4. Atomically credit balance + mark successful --------------------
    // Reuse the same atomic RPC the admin portal uses (service role = trusted).
    const { error: rpcError } = await adminClient.rpc('approve_deposit', {
      p_deposit_id: deposit.id,
    });
    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ success: true, deposit_id: deposit.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});