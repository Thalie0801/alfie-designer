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
      const statusResponse = await fetch(`https://api.kie.ai/api/v1/veo/generate/${body.generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      console.log("Video status:", statusData);
      return new Response(JSON.stringify(statusData), {
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
    
    const kieResponse = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: body.prompt,
        model: 'sora2',
        aspectRatio: body.aspectRatio || '16:9',
      }),
    });

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text();
      console.error("Kie AI error:", kieResponse.status, errorText);
      throw new Error(`Kie AI API error: ${errorText}`);
    }

    const generation = await kieResponse.json();
    console.log("Sora2 video generation started:", generation.id);
    return new Response(JSON.stringify(generation), {
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
