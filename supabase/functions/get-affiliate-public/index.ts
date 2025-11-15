import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { enforceRateLimit, extractClientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const parseBody = async (req: Request): Promise<Record<string, string>> => {
  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) return await req.json();
    const text = await req.text();
    const params = new URLSearchParams(text);
    const out: Record<string, string> = {};
    params.forEach((v, k) => (out[k] = v));
    return out;
  } catch {
    // Support GET with query params as fallback
    const url = new URL(req.url);
    const out: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (out[k] = v));
    return out;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const clientIp = extractClientIp(req);
    try {
      await enforceRateLimit(supabaseAdmin, clientIp, 'get-affiliate-public');
    } catch (rateLimitError) {
      if (rateLimitError instanceof Error && rateLimitError.message === 'RATE_LIMIT_EXCEEDED') {
        return new Response(
          JSON.stringify({ ok: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw rateLimitError;
    }

    const payload = await parseBody(req);
    const ref = payload.ref || payload.affiliate_id;

    if (!ref) {
      return new Response(JSON.stringify({ error: 'Missing ref' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('name, email')
      .eq('id', ref)
      .maybeSingle();

    if (error) {
      console.error('get-affiliate-public error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const safeName = data?.name || (data?.email ? data.email.split('@')[0] : 'Partenaire');

    return new Response(JSON.stringify({ name: safeName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    console.error('get-affiliate-public failure:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
