import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JobStatus = "pending" | "queued" | "running" | "checking" | "ready" | "failed" | "canceled";

type Provider = "sora" | "seededance" | "kling";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const extractVideoUrl = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const output = data.output;

  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      const url = (first as { url?: unknown }).url;
      if (typeof url === "string") return url;
    }
  }

  if (output && typeof output === "object" && "video" in output) {
    const video = (output as { video?: unknown }).video;
    if (typeof video === "string") return video;
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase configuration for webhook");
    return new Response(JSON.stringify({ error: "Configuration serveur manquante" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const provider = (url.searchParams.get("provider") as Provider) || "seededance";

  if (!jobId) {
    return new Response(JSON.stringify({ error: "jobId manquant" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedSecret = Deno.env.get("VIDEO_WEBHOOK_SECRET");
  if (expectedSecret) {
    const receivedSecret =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("replicate-webhook-secret") ||
      req.headers.get("webhook-secret");

    if (!receivedSecret || receivedSecret !== expectedSecret) {
      console.warn("⚠️ Invalid webhook secret for job", jobId);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>;
    console.log("📬 [video-webhook] Payload received for job", jobId, JSON.stringify(payload));

    let jobStatus: JobStatus = "running";
    let progress = 50;
    let errorMessage: string | null = null;
    let videoUrl: string | null = null;

    if (provider === "sora") {
      const state = typeof payload["state"] === "string"
        ? (payload["state"] as string)
        : typeof payload["status"] === "string"
          ? (payload["status"] as string)
          : "running";
      if (state === "success") {
        jobStatus = "ready";
        progress = 100;
        videoUrl = extractVideoUrl(payload["result"]);
      } else if (state === "fail") {
        jobStatus = "failed";
        progress = 100;
        const failMsg = payload["failMsg"];
        const error = payload["error"];
        errorMessage = typeof failMsg === "string" ? failMsg : typeof error === "string" ? error : "Generation failed";
      } else {
        jobStatus = "running";
        progress = state === "generating" ? 60 : 30;
      }
    } else {
      const replicateStatus = typeof payload["status"] === "string" ? (payload["status"] as string) : "processing";
      jobStatus = mapReplicateStatus(replicateStatus);
      progress = statusToProgress(replicateStatus);
      videoUrl = extractVideoUrl(payload);
      if (jobStatus === "failed") {
        const err = payload["error"];
        errorMessage = typeof err === "string" ? err : "Generation failed";
      }
    }

    const outputData: Record<string, unknown> = {
      provider,
      payload,
    };

    if (videoUrl) {
      outputData.videoUrl = videoUrl;
    }

    const jobUpdate: Record<string, unknown> = {
      status: jobStatus,
      progress,
      error: errorMessage,
      output_data: outputData,
    };

    if (jobStatus === "ready" || jobStatus === "failed" || jobStatus === "canceled") {
      jobUpdate.completed_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from("jobs")
      .update(jobUpdate)
      .eq("id", jobId);

    const matchValues: string[] = [];
    const escapeForFilter = (value: string) => value.replace(/"/g, '\\"').replace(/,/g, '\\,');

    if (jobId) {
      matchValues.push(`job_id.eq."${escapeForFilter(jobId)}"`);
    }

    const predictionId = typeof payload["id"] === "string" ? payload["id"] : undefined;
    if (predictionId) {
      matchValues.push(`metadata->>predictionId.eq."${escapeForFilter(predictionId)}"`);
    }

    const { data: asset } = matchValues.length > 0
      ? await supabaseAdmin
          .from("media_generations")
          .select("id, metadata")
          .or(matchValues.join(","))
          .maybeSingle()
      : { data: null };

    if (asset) {
      const metadata = (asset.metadata as Record<string, unknown>) || {};
      const updatedMetadata = {
        ...metadata,
        provider,
        predictionId: (typeof payload["id"] === "string" ? payload["id"] : metadata?.predictionId) as string | undefined,
        webhookPayload: payload,
      };

      const assetUpdate: Record<string, unknown> = {
        metadata: updatedMetadata,
      };

      if (videoUrl) {
        assetUpdate.output_url = videoUrl;
      }

      if (jobStatus === "ready") {
        assetUpdate.status = "completed";
        assetUpdate.engine = provider;
        const metrics = payload["metrics"] as Record<string, unknown> | undefined;
        const input = payload["input"] as Record<string, unknown> | undefined;
        const durationSeconds = Math.round(
          (metrics?.predict_time as number | undefined) ??
            (metrics?.duration as number | undefined) ??
            (payload["output_duration"] as number | undefined) ??
            (input?.duration as number | undefined) ??
            0,
        );
        assetUpdate.duration_seconds = durationSeconds;
      }

      if (jobStatus === "failed") {
        assetUpdate.status = "failed";
      }

      await supabaseAdmin
        .from("media_generations")
        .update(assetUpdate)
        .eq("id", asset.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ [video-webhook] Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
