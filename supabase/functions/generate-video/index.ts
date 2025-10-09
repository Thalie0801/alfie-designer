import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY');
    if (!KIE_AI_API_KEY) {
      throw new Error('KIE_AI_API_KEY is not set');
    }

    const body = await req.json();

    // Check status of existing generation
    if (body.generationId) {
      console.log("Checking video generation status:", body.generationId);
      
      // Kie AI recordInfo endpoint
      const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${body.generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("Kie AI status check error:", statusResponse.status, errorText);
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      console.log("Kie.ai status:", JSON.stringify(statusData));
      
      // Parse Kie.ai response format
      let finalResponse: any = {
        status: 'processing'
      };

      if (statusData.data?.state === 'success') {
        const resultJson = JSON.parse(statusData.data.resultJson);
        finalResponse = {
          status: 'succeeded',
          output: resultJson.resultUrls?.[0] || null
        };
      } else if (statusData.data?.state === 'fail') {
        console.error("Kie.ai generation failed:", {
          failCode: statusData.data.failCode,
          failMsg: statusData.data.failMsg,
          taskId: body.generationId
        });
        finalResponse = {
          status: 'failed',
          error: statusData.data.failMsg || 'Generation failed'
        };
      } else {
        // waiting, queuing, generating
        finalResponse = {
          status: 'processing',
          progress: statusData.data?.state === 'generating' ? 50 : 10
        };
      }
      
      return new Response(JSON.stringify(finalResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start new video generation
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Starting Sora2 video generation with prompt:", body.prompt);
    
    // Kie AI createTask endpoint for Sora 2
    const aspectRatio = body.aspectRatio === '9:16' ? 'portrait' : 'landscape';
    const payload: any = {
      model: "sora-2-text-to-video",
      input: {
        prompt: body.prompt,
        aspect_ratio: aspectRatio
      }
    };

    // Support image→video (if available in Sora 2)
    if (body.imageUrl) {
      payload.input.image = body.imageUrl;
    }

    console.log("Kie AI createTask payload:", JSON.stringify(payload));
    
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text();
      console.error("Kie AI error:", kieResponse.status, errorText);
      throw new Error(`Kie AI API error: ${errorText}`);
    }

    const generation = await kieResponse.json();
    console.log("Sora2 task created:", generation.data?.taskId);
    
    return new Response(JSON.stringify({ 
      id: generation.data?.taskId,
      status: 'processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-video function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
