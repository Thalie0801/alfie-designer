// supabase/functions/generate-media/index.ts
// Crée un job dans la table job_queue pour que le worker s'en occupe.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // TODO : restreindre ton domaine en prod
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Préflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[generate-media] ❌ Missing Supabase env", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "SUPABASE_ENV_MISSING",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const rawBody = await req.json();
    console.log("[generate-media] Incoming body", rawBody);

    // 🔹 Normalisation des champs (on gère camelCase ET snake_case)
    const userId: string | undefined = rawBody.userId ?? rawBody.user_id;
    const brandId: string | undefined = rawBody.brandId ?? rawBody.brand_id;

    const kind: string = rawBody.kind ?? rawBody.format ?? rawBody.type ?? rawBody.intent?.kind ?? "image";

    const count: number = rawBody.count ?? rawBody.slides ?? rawBody.intent?.count ?? 1;

    const ratio: string = rawBody.ratio ?? rawBody.aspect_ratio ?? rawBody.intent?.ratio ?? "1:1";

    const prompt: string = rawBody.prompt ?? rawBody.brief ?? rawBody.description ?? rawBody.intent?.brief ?? "";

    if (!userId || !brandId) {
      console.error("[generate-media] Missing userId or brandId", {
        userId,
        brandId,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "MISSING_USER_OR_BRAND",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!prompt) {
      console.warn("[generate-media] Empty prompt", { userId, brandId });
    }

    console.log("[generate-media] Normalized intent", {
      userId,
      brandId,
      kind,
      count,
      ratio,
    });

    // 🔹 Déterminer le type de job en fonction du kind
    let jobType: string;
    if (kind === "carousel") {
      jobType = "render_carousels";
    } else if (kind === "video") {
      jobType = "generate_video";
    } else {
      jobType = "render_images";
    }

    // 🔹 Création du job dans la table job_queue (pas jobs)
    const payload = {
      intent: {
        brandId,
        topic: prompt,
        ratio,
        count,
      },
    };

    const { data: job, error: insertError } = await supabaseAdmin
      .from("job_queue")
      .insert({
        user_id: userId,
        type: jobType,
        status: "queued",
        payload,
      })
      .select("*")
      .single();

    if (insertError || !job) {
      console.error("[generate-media] ❌ Error inserting job", insertError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "JOB_INSERT_FAILED",
          details: insertError?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[generate-media] ✅ Job created in job_queue", {
      jobId: job.id,
      userId,
      brandId,
      jobType,
      count,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        jobId: job.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("[generate-media] ❌ Uncaught error", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "INTERNAL_ERROR",
        message: err?.message ?? String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
