import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JobStatus = "pending" | "queued" | "running" | "checking" | "ready" | "failed" | "canceled";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BaseJobInput {
  prompt: string;
  aspectRatio: string;
  imageUrl?: string | null;
  opts?: Record<string, unknown> | null;
  brandId?: string | null;
  provider?: string | null;
}

const mapReplicateStatus = (status: string): JobStatus => {
  switch (status) {
    case "succeeded":
      return "ready";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    case "queued":
      return "queued";
    case "starting":
    case "processing":
    default:
      return "running";
  }
};

const statusToProgress = (status: string): number => {
  switch (status) {
    case "queued":
      return 5;
    case "starting":
      return 15;
    case "processing":
      return 60;
    case "succeeded":
    case "failed":
    case "canceled":
      return 100;
    default:
      return 10;
  }
};

const buildWebhookUrl = (base: string | null, jobId: string, provider: string) => {
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("jobId", jobId);
    url.searchParams.set("provider", provider);
    return url.toString();
  } catch (error) {
    console.warn("⚠️ Invalid VIDEO_WEBHOOK_URL, skipping webhook registration", error);
    return null;
  }
};

serve(async (req) => {
  // 🔍 DEBUG: Log immédiat pour confirmer que la fonction est appelée
  console.log("🎬 [generate-video] Function called at:", new Date().toISOString());

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
  const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
  const VIDEO_WEBHOOK_URL = Deno.env.get("VIDEO_WEBHOOK_URL") || null;
  const VIDEO_WEBHOOK_SECRET = Deno.env.get("VIDEO_WEBHOOK_SECRET") || undefined;

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error("❌ Missing Supabase configuration");
    return new Response(JSON.stringify({ error: "Configuration Supabase incomplète." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!KIE_AI_API_KEY) {
    console.error("❌ KIE_AI_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "KIE_AI_API_KEY non configuré. Configure-le dans les Secrets backend." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!REPLICATE_API_TOKEN) {
    console.error("❌ REPLICATE_API_TOKEN is not set");
    return new Response(
      JSON.stringify({ error: "REPLICATE_API_TOKEN non configuré. Configure-le dans les Secrets backend." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer", "").trim();

  try {
    const body = await req.json();
    console.log("📥 [generate-video] Request body:", JSON.stringify(body));

    let jobId: string | null = null;
    let jobShortId: string | null = null;
    let baseJobInput: BaseJobInput | null = null;

    // 🔧 MODE DIAGNOSTIC: Retourne l'IP sortante du backend pour whitelist Kie.ai
    if (body.diagnose === true) {
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        console.log("🌐 [Diagnostic] Outbound IP:", ipData.ip);
        return new Response(
          JSON.stringify({
            ip: ipData.ip,
            message: "Ajoute cette IP à la whitelist Kie.ai: https://kie.ai/settings",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (diagError) {
        console.error("❌ [Diagnostic] Failed to get IP:", diagError);
        return new Response(JSON.stringify({ error: "Failed to retrieve IP" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    // Check status of existing generation
    if (body.generationId) {
      const provider = body.provider || "sora";
      const jobId = body.jobId as string | undefined;
      console.log(`Checking video generation status for ${provider}:`, body.generationId);

      if (provider === "sora") {
        // Kie AI recordInfo endpoint
        const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${body.generationId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${KIE_AI_API_KEY}`,
          },
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error("Kie AI status check error:", statusResponse.status, errorText);
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }

        const statusData = await statusResponse.json();
        console.log("Kie.ai status:", JSON.stringify(statusData));

        let finalResponse: any = { status: "processing" };
        let jobStatus: JobStatus = "running";
        let progress = 25;
        let outputUrl: string | null = null;

        if (statusData.data?.state === "success") {
          const resultJson = JSON.parse(statusData.data.resultJson);
          outputUrl = resultJson.resultUrls?.[0] || null;
          finalResponse = {
            status: "succeeded",
            output: outputUrl,
          };
          jobStatus = "ready";
          progress = 100;
        } else if (statusData.data?.state === "fail") {
          console.error("Kie.ai generation failed:", statusData.data);
          finalResponse = {
            status: "failed",
            error: statusData.data.failMsg || "Generation failed",
          };
          jobStatus = "failed";
          progress = 100;
        } else {
          finalResponse = {
            status: "processing",
            progress: statusData.data?.state === "generating" ? 50 : 10,
          };
          jobStatus = "running";
          progress = statusData.data?.state === "generating" ? 60 : 25;
        }

        if (jobId) {
          const jobUpdate: Record<string, unknown> = {
            status: jobStatus,
            progress,
          };

          if (outputUrl) {
            jobUpdate.output_data = { videoUrl: outputUrl };
          }

          if (jobStatus === "ready" || jobStatus === "failed") {
            jobUpdate.completed_at = new Date().toISOString();
          }

          await supabaseAdmin
            .from("jobs")
            .update(jobUpdate)
            .eq("id", jobId);
        }

        return new Response(JSON.stringify(finalResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Replicate status check (for Seededance and Kling)
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${body.generationId}`, {
          method: "GET",
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error(`${provider} status check error:`, statusResponse.status, errorText);
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }

        const prediction = await statusResponse.json();
        console.log(`${provider} status:`, JSON.stringify(prediction));

        let finalResponse: any = { status: "processing" };
        const jobStatus = mapReplicateStatus(prediction.status);
        const progress = statusToProgress(prediction.status);
        const videoOutput = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;

        if (prediction.status === "succeeded") {
          finalResponse = {
            status: "succeeded",
            output: prediction.output || null,
          };
        } else if (prediction.status === "failed" || prediction.status === "canceled") {
          finalResponse = {
            status: "failed",
            error: prediction.error || "Generation failed",
          };
        } else {
          finalResponse = {
            status: "processing",
            progress: prediction.status === "processing" ? 50 : 10,
          };
        }

        if (jobId) {
          const jobUpdate: Record<string, unknown> = {
            status: jobStatus,
            progress,
            output_data: prediction ? { prediction } : undefined,
          };

          if (jobStatus === "ready" || jobStatus === "failed") {
            jobUpdate.completed_at = new Date().toISOString();
          }

          await supabaseAdmin
            .from("jobs")
            .update(jobUpdate)
            .eq("id", jobId);

          if (videoOutput && jobStatus === "ready") {
            await supabaseAdmin
              .from("media_generations")
              .update({
                status: "completed",
                output_url: videoOutput,
              })
              .eq("job_id", jobId);
          }
        }

        return new Response(JSON.stringify(finalResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Start new video generation with cascade fallback
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    console.log("🎬 [generate-video] Starting cascade fallback with prompt:", body.prompt);
    const aspectRatio = body.aspectRatio === "9:16" ? "portrait" : "landscape";

    const { data: userData, error: userError } = token
      ? await supabaseAdmin.auth.getUser(token)
      : { data: { user: null }, error: null } as const;

    if (userError) {
      console.error("❌ [Auth] Unable to retrieve user:", userError);
    }

    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentification requise pour générer une vidéo." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    baseJobInput = {
      prompt: body.prompt,
      aspectRatio: body.aspectRatio || "16:9",
      imageUrl: body.imageUrl || null,
      opts: body.opts || null,
      brandId: body.brandId || null,
      provider: null,
    };

    const { data: jobRecord, error: jobError } = await supabaseAdmin
      .from("jobs")
      .insert({
        user_id: userId,
        type: "video",
        status: "queued",
        progress: 5,
        max_retries: 3,
        input_data: baseJobInput,
      })
      .select("id, short_id")
      .single();

    if (jobError || !jobRecord) {
      console.error("❌ [Jobs] Failed to create job record:", jobError);
      throw new Error("Impossible de créer l'entrée de suivi de job");
    }

    jobId = jobRecord.id;
    jobShortId = jobRecord.short_id;

    const updateJob = async (
      status: JobStatus,
      progress: number,
      provider: string,
      outputData: Record<string, unknown>,
    ) => {
      if (!jobId) return;
      baseJobInput = baseJobInput ? { ...baseJobInput, provider } : baseJobInput;

      const jobUpdate: Record<string, unknown> = {
        status,
        progress,
        input_data: baseJobInput,
        output_data: outputData,
      };

      if (status === "ready" || status === "failed" || status === "canceled") {
        jobUpdate.completed_at = new Date().toISOString();
      }

      await supabaseAdmin
        .from("jobs")
        .update(jobUpdate)
        .eq("id", jobId);
    };

    // 1️⃣ TENTATIVE SORA2 (Kie.ai) avec timeout 5s
    try {
      console.log("🎬 [Sora2] Attempting generation...");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const kiePayload: any = {
        model: "sora-2-text-to-video",
        input: {
          prompt: body.prompt,
          aspect_ratio: aspectRatio,
        },
      };

      if (body.imageUrl) {
        kiePayload.input.image = body.imageUrl;
      }

      const kieResponse = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KIE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kiePayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (kieResponse.ok) {
        const generation = await kieResponse.json();
        if (generation.data?.taskId) {
          console.log("✅ [Sora2] Generation started with ID:", generation.data.taskId);
          await updateJob("running", 20, "sora", {
            provider: "sora",
            predictionId: generation.data.taskId,
          });
          return new Response(
            JSON.stringify({
              id: generation.data.taskId,
              provider: "sora",
              status: "processing",
              jobId,
              jobShortId,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
      } else {
        const errorText = await kieResponse.text();
        console.error(`❌ [Sora2] HTTP ${kieResponse.status}: ${errorText}`);
      }

      console.warn("⚠️ [Sora2] Failed or timeout, trying Seededance...");
    } catch (soraError: any) {
      if (soraError.name === "AbortError") {
        console.warn("⏱️ [Sora2] Timeout (5s), trying Seededance...");
      } else {
        console.error("❌ [Sora2] Exception:", soraError?.message || soraError);
      }
    }
    
    // 2️⃣ FALLBACK SEEDEDANCE (Replicate/ByteDance)
    try {
      console.log("🎬 [Seededance] Attempting generation...");

      const provider = "seededance";
      const webhookUrl = jobId ? buildWebhookUrl(VIDEO_WEBHOOK_URL, jobId, provider) : null;
      const payload: Record<string, unknown> = {
        version: "fcc89eae3420a0476cfa109f8afbd8304327acb7e0d4ddcf63a980e870898a6b",
        input: {
          prompt: body.prompt,
          aspect_ratio: body.aspectRatio || "16:9",
          duration: body.opts?.duration || 5,
        },
      };

      if (webhookUrl) {
        payload.webhook = webhookUrl;
        payload.webhook_events_filter = ["completed", "failed"];
        if (VIDEO_WEBHOOK_SECRET) {
          payload.webhook_secret = VIDEO_WEBHOOK_SECRET;
        }
      }

      const seededanceResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify(payload),
      });

      if (seededanceResponse.ok) {
        const prediction = await seededanceResponse.json();
        console.log("✅ [Seededance] Generation started with ID:", prediction.id);
        const replicateStatus: string = prediction.status || "starting";
        const jobStatus = mapReplicateStatus(replicateStatus);
        await updateJob(jobStatus, statusToProgress(replicateStatus), provider, {
          provider,
          predictionId: prediction.id,
          prediction,
        });

        return new Response(
          JSON.stringify({
            id: prediction.id,
            provider,
            status: jobStatus,
            jobId,
            jobShortId,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      const errorText = await seededanceResponse.text();
      console.error(`❌ [Seededance] HTTP ${seededanceResponse.status}: ${errorText}`);
      console.warn("⚠️ [Seededance] Failed, trying Kling...");
    } catch (seededanceError: any) {
      console.error("❌ [Seededance] Exception:", seededanceError?.message || seededanceError);
    }
    
    // 3️⃣ FALLBACK FINAL : KLING (Replicate)
    try {
      console.log("🎬 [Kling] Attempting generation (final fallback)...");

      const provider = "kling";
      const webhookUrl = jobId ? buildWebhookUrl(VIDEO_WEBHOOK_URL, jobId, provider) : null;
      const klingPayload: Record<string, unknown> = {
        input: {
          prompt: body.prompt,
          aspect_ratio: body.aspectRatio || "16:9",
          duration: body.opts?.duration || 5,
        },
      };

      if (webhookUrl) {
        klingPayload.webhook = webhookUrl;
        klingPayload.webhook_events_filter = ["completed", "failed"];
        if (VIDEO_WEBHOOK_SECRET) {
          klingPayload.webhook_secret = VIDEO_WEBHOOK_SECRET;
        }
      }

      const klingResponse = await fetch(
        "https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: "wait=60",
          },
          body: JSON.stringify(klingPayload),
        },
      );

      if (klingResponse.ok) {
        const prediction = await klingResponse.json();
        console.log("✅ [Kling] Generation started with ID:", prediction.id);
        const replicateStatus: string = prediction.status || "starting";
        const jobStatus = mapReplicateStatus(replicateStatus);
        await updateJob(jobStatus, statusToProgress(replicateStatus), provider, {
          provider,
          predictionId: prediction.id,
          prediction,
        });

        return new Response(
          JSON.stringify({
            id: prediction.id,
            provider,
            status: jobStatus,
            jobId,
            jobShortId,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      const errorText = await klingResponse.text();
      console.error(`❌ [Kling] HTTP ${klingResponse.status}: ${errorText}`);
      throw new Error(`Kling generation failed: ${klingResponse.status}`);
    } catch (klingError: any) {
      console.error("❌ [Kling] Exception:", klingError?.message || klingError);
      throw new Error("All video providers failed");
    }
  } catch (error) {
    console.error("Error in generate-video function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (jobId) {
      try {
        await supabaseAdmin
          .from("jobs")
          .update({
            status: "failed",
            progress: 100,
            error: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } catch (updateError) {
        console.error("⚠️ Failed to update job status after error:", updateError);
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
