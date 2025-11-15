import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_FN_SECRET = Deno.env.get("INTERNAL_FN_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (!INTERNAL_FN_SECRET) {
  throw new Error("Missing INTERNAL_FN_SECRET");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudioGenerateRequest {
  type: "image" | "carousel" | "video";
  prompt: string;
  brandId: string;
  aspectRatio: string;
  quantity?: number;
  duration?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as StudioGenerateRequest;

    if (!body.brandId || !body.prompt || !body.type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, prompt, brandId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[studio-generate] ${body.type} request from user ${user.id}`);

    // Route to appropriate generation function based on type
    let resourceId: string | null = null;
    let resourceType: "media" | "order" = "media";

    if (body.type === "image") {
      // Call alfie-render-image directly
      const resolution = body.aspectRatio === "1:1" ? "1080x1080" : 
                        body.aspectRatio === "9:16" ? "1080x1920" : "1080x1350";

      const response = await fetch(`${SUPABASE_URL}/functions/v1/alfie-render-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_FN_SECRET,
        },
        body: JSON.stringify({
          userId: user.id,
          brand_id: body.brandId,
          prompt: body.prompt,
          resolution,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[studio-generate] alfie-render-image failed:", errorText);
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Insufficient AI credits" }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded" }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        throw new Error(`alfie-render-image failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const mediaId =
        typeof result.mediaId === "string"
          ? result.mediaId
          : typeof result.id === "string"
            ? result.id
            : null;

      if (!mediaId) {
        throw new Error("alfie-render-image did not return a media identifier");
      }

      resourceId = mediaId;
      resourceType = "media";
    } else if (body.type === "carousel") {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-media`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: body.type,
          prompt: body.prompt,
          brandId: body.brandId,
          aspectRatio: body.aspectRatio,
          quantity: body.quantity,
          durationSec: body.duration,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[studio-generate] generate-media failed:", errorText);
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Insufficient quota or credits" }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        throw new Error(`generate-media failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const orderId = typeof result.orderId === "string" ? result.orderId : null;

      if (!orderId) {
        throw new Error("generate-media did not return an orderId");
      }

      resourceId = orderId;
      resourceType = "order";
    } else if (body.type === "video") {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/alfie-orchestrator`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: body.prompt,
          user_message: body.prompt,
          brandId: body.brandId,
          forceTool: "generate_video",
          aspectRatio: body.aspectRatio,
          durationSec: body.duration,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[studio-generate] alfie-orchestrator failed:", errorText);

        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Insufficient quota or credits" }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        throw new Error(`alfie-orchestrator failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const orderId = typeof result.orderId === "string" ? result.orderId : null;

      if (!orderId) {
        throw new Error("alfie-orchestrator did not return an orderId");
      }

      resourceId = orderId;
      resourceType = "order";
    } else {
      throw new Error(`Unsupported type: ${body.type}`);
    }

    if (!resourceId) {
      throw new Error("Missing resourceId from generation response");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        resourceId,
        type: resourceType,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[studio-generate] Error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        code: "GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
