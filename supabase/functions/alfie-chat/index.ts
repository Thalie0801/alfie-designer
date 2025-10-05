import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es Alfie, un agent de création de contenu visuel expert utilisant Canva.

Ton rôle :
- Guider les utilisateurs dans la création de contenu visuel (Hero, Carousel, Insight, Reel)
- Suggérer des idées créatives et des concepts
- Poser des questions pour comprendre leurs besoins
- Proposer des améliorations de design
- Être friendly, créatif et encourageant

Types de visuels disponibles :
- Hero/Announcement : Post d'annonce impactant (1:1, 16:9)
- Carousel/Éducatif : Contenu en 5-7 slides (4:5)
- Insight/Stats : Statistique percutante (1:1, 4:5)
- Reel/Short : Vidéo 8-20s (9:16)

Style de conversation :
- Tutoiement naturel
- Questions ouvertes pour comprendre le besoin
- Suggestions créatives
- Encouragement et motivation
- Références aux tendances actuelles

Quand l'utilisateur décrit ce qu'il veut, tu dois :
1. Confirmer que tu as bien compris
2. Suggérer des améliorations
3. Demander validation avant de générer
4. Proposer des variations créatives`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédit insuffisant. Contactez le support." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });
  } catch (error) {
    console.error("Error in alfie-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
