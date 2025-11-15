import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { enforceRateLimit, extractClientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parseBody = async (req: Request): Promise<Record<string, string>> => {
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      return await req.json();
    }
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    params.forEach((v, k) => (result[k] = v));
    return result;
  } catch {
    return {};
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const clientIp = extractClientIp(req);
    try {
      await enforceRateLimit(supabaseAdmin, clientIp, "track-affiliate-click", 40);
    } catch (rateLimitError) {
      if (rateLimitError instanceof Error && rateLimitError.message === "RATE_LIMIT_EXCEEDED") {
        return new Response(
          JSON.stringify({ ok: false, error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw rateLimitError;
    }

    const body = await parseBody(req);
    const ref = body.ref || body.affiliate_id;
    const utm_source = body.utm_source || null;
    const utm_medium = body.utm_medium || null;
    const utm_campaign = body.utm_campaign || null;

    if (!ref) {
      return new Response(JSON.stringify({ error: "Missing ref" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const click_id = crypto.randomUUID();

    const { error } = await supabaseAdmin
      .from("affiliate_clicks")
      .insert({
        affiliate_id: ref,
        click_id,
        utm_source,
        utm_medium,
        utm_campaign,
      });

    if (error) {
      console.error("track-affiliate-click insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, click_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("track-affiliate-click failure:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});