import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 🔍 DEBUG: Log immédiat pour confirmer que la fonction est appelée
  console.log('🎬 [generate-video] Function called at:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY');
    if (!KIE_AI_API_KEY) {
      console.error('❌ KIE_AI_API_KEY is not set');
      throw new Error('KIE_AI_API_KEY is not set');
    }

    const body = await req.json();
    console.log('📥 [generate-video] Request body:', JSON.stringify(body));

    // 🔧 MODE DIAGNOSTIC: Retourne l'IP sortante du backend pour whitelist Kie.ai
    if (body.diagnose === true) {
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        console.log('🌐 [Diagnostic] Outbound IP:', ipData.ip);
        return new Response(JSON.stringify({ 
          diagnostic: true,
          outboundIp: ipData.ip,
          message: 'Ajoute cette IP à la whitelist Kie.ai: https://kie.ai/settings'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (diagError) {
        console.error('❌ [Diagnostic] Failed to get IP:', diagError);
        return new Response(JSON.stringify({ error: 'Failed to retrieve IP' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

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
      console.error("❌ [Kie AI] HTTP error:", kieResponse.status, errorText);
      
      // Tenter de parser l'erreur JSON
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { msg: errorText };
      }
      
      // 🚨 Détection spécifique de l'erreur IP whitelist
      if (kieResponse.status === 401 && errorData.msg?.includes('Illegal IP')) {
        console.error('🚨 [Kie.ai] IP NOT WHITELISTED - Backend IP needs to be added to Kie.ai whitelist');
        return new Response(JSON.stringify({
          error: 'PROVIDER_IP_WHITELIST',
          message: 'L\'IP sortante du backend n\'est pas whitelistée chez Kie.ai',
          details: errorData.msg,
          help: 'Appelle generate-video avec { diagnose: true } pour obtenir l\'IP à whitelister'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
      
      throw new Error(`Kie AI API error: ${errorText}`);
    }

    const generation = await kieResponse.json();
    console.log("✅ [Kie.ai] Full response:", JSON.stringify(generation));
    console.log("🔑 [Kie.ai] Task ID extracted:", generation.data?.taskId);
    
    // Vérification critique: s'assurer que taskId existe
    if (!generation.data?.taskId) {
      console.error('❌ [Kie.ai] No taskId in response:', generation);
      return new Response(JSON.stringify({ 
        error: 'NO_TASK_ID',
        message: 'Kie.ai n\'a pas retourné de taskId',
        kieResponse: generation
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    console.log("✨ Sora2 task created successfully with ID:", generation.data.taskId);
    
    return new Response(JSON.stringify({ 
      id: generation.data.taskId,
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
