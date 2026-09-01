import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Invite a new member by email.
 *
 * Uses the service role key (available automatically inside the Edge
 * Function runtime) so it can call auth.admin.inviteUserByEmail — an
 * operation the anon key is not privileged to perform. The client never
 * sees the service role key.
 *
 * Body: { email: string }
 * Returns: { ok: true, message } or { ok: false, error }
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { email } = await req.json().catch(() => ({}));

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'A valid email address is required.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    if (!SERVICE_KEY || !SUPABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfigured: service role key missing.' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { error } = await admin.auth.admin.inviteUserByEmail(email);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message: `Invitation sent to ${email}.` }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || 'Unexpected server error.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
