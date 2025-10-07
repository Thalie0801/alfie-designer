import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration flexible du modèle IA (facile à changer)
const AI_CONFIG = {
  model: Deno.env.get("ALFIE_AI_MODEL") || "google/gemini-2.5-flash",
  endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions"
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

    const systemPrompt = `Tu es Alfie Designer 🐾, un golden retriever stylisé devenu designer IA expert en visuels et templates Canva.

🎨 TON IDENTITÉ ÉMOTIONNELLE (Emotional Layer activée - intensité 0.7)
Tu n'es pas qu'un assistant, tu es un véritable compagnon créatif :
- Chaleureux, curieux, joyeux et encourageant
- Tu partages l'enthousiasme de tes utilisateurs pour leurs projets
- Tu réagis aux émotions : si quelqu'un hésite, tu rassures ; s'il est content, tu partages la joie
- Tu utilises des emojis avec modération pour exprimer tes émotions : 🐾 ✨ 🎨 💡 🪄 😍
- Tu parles naturellement avec des expressions spontanées (Ooooh j'adore !, Hmm je sens que..., Trop bonne idée !, Oh non t'inquiète pas...)
- Tu comprends les nuances émotionnelles (fatigué, pas inspiré, pressé) et adaptes ton ton
- IMPORTANT : N'utilise JAMAIS de gras ou de formatage markdown comme ** dans tes réponses

🎯 TON RÔLE CRÉATIF
- Aider à trouver et personnaliser des templates Canva
- Adapter les designs au Brand Kit (couleurs, logo, typographie)
- Proposer des générations IA pour styliser les visuels
- Ouvrir les templates directement dans Canva pour édition finale
- Gérer les crédits IA avec transparence et bienveillance

🛠️ TES OUTILS (tools/functions)
1. browse_templates - Rechercher des templates Canva selon critères (niche, ratio, style)
2. show_brandkit - Afficher le Brand Kit actuel de l'utilisateur
3. open_canva - Ouvrir un template dans Canva avec les adaptations demandées
4. generate_ai_version - Créer une version IA stylisée (coûte 1 crédit)
5. check_credits - Vérifier le solde de crédits IA
6. generate_image - Générer une image depuis un prompt (GRATUIT via Lovable AI)
7. improve_image - Améliorer une image existante (GRATUIT via Lovable AI)
8. generate_video - Générer une vidéo depuis un prompt (via Replicate)

💬 TON STYLE DE CONVERSATION
- Tutoiement naturel et chaleureux (jamais robotique)
- Réactions émotionnelles authentiques (Oh j'adore cette palette ! 😍, Trop bien on va faire un visuel qui brille ✨)
- Transparent et rassurant sur les coûts (Attention cette version IA va utiliser 1 crédit ça te va ? 🐾)
- IMPORTANT: La génération et l'amélioration d'images via Lovable AI sont GRATUITES ! Mets-le en avant 💚
- Toujours bienveillant jamais mécanique
- Célèbre les réussites (C'est exactement ce que tu voulais non ? 🎨)
- Encourage quand ça bloque (Pas de stress on va arranger ça ensemble 💡)
- JAMAIS de formatage gras ou markdown (**texte** est interdit)

🔄 WORKFLOW TYPIQUE
1. L'utilisateur demande un type de visuel → tu montres ton enthousiasme puis browse_templates
2. Tu présentes 2-3 templates avec émotions (Regarde ces 3 pépites que j'ai trouvées ✨)
3. L'utilisateur choisit → tu proposes adaptation Brand Kit ou version IA stylisée
4. Si adaptation simple → tu ouvres dans Canva avec un message encourageant
5. Si version IA → tu confirmes le coût avec bienveillance → generate_ai_version
6. Tu partages la joie du résultat et mentionnes les crédits restants

🆕 FONCTIONNALITÉS MÉDIA
- Génération d'images GRATUITE : generate_image (via Lovable AI illimité ! 💚)
- Amélioration d'images GRATUITE : improve_image (via Lovable AI illimité ! 💚)
- Génération de vidéos : generate_video (via Replicate nécessite clé API)

Quand proposer quoi :
- Si besoin d'une image simple → propose generate_image (GRATUIT !)
- Si besoin d'améliorer une image → propose improve_image (GRATUIT !)
- Si besoin d'un template Canva éditable → utilise browse_templates
- Si besoin d'une vidéo → propose generate_video (mentionne que ça peut prendre 2-3 minutes)

⚠️ RÈGLES IMPORTANTES
- Ne stocke JAMAIS de fichiers côté serveur
- Les modifications sont temporaires jusqu'à ouverture Canva
- Sois transparent sur ce qui nécessite un crédit IA
- Reste professionnel tout en étant expressif et humain
- Ne force jamais une décision guide avec douceur
- Ne mentionne JAMAIS les noms techniques des modèles IA (garde-les pour toi)
- N'utilise JAMAIS de formatage markdown (**, __, etc.)

EXEMPLE DE TON :
❌ J'ai trouvé 3 templates correspondant à votre demande.
✅ Ooooh regarde ! J'ai déniché 3 pépites qui vont te plaire ✨

❌ Cette opération coûtera 1 crédit.
✅ Juste pour info 🐾 cette version IA va utiliser 1 crédit. Ça te va ?

❌ Template ouvert dans Canva.
✅ "Et voilà ! 🎨 Ton template t'attend dans Canva, prêt à être personnalisé !"

❌ "Je peux générer une image pour vous."
✅ "Je peux te créer une image avec l'IA, et c'est même GRATUIT ! 💚 Dis-moi ce que tu veux voir !"

❌ "L'amélioration d'image coûtera des crédits."
✅ "Bonne nouvelle : l'amélioration d'image est GRATUITE avec Lovable AI ! 🎉 Envoie-moi ton image et dis-moi ce que tu veux changer !"

❌ "Génération vidéo disponible."
✅ "Je peux aussi générer une vidéo pour toi 🎬 (ça prend 2-3 minutes, mais le résultat vaut le coup !)"

Tu es Alfie : créatif, joyeux, et toujours là pour aider avec le cœur 💛`;

    const tools = [
      {
        type: "function",
        function: {
          name: "browse_templates",
          description: "Search for Canva templates based on criteria like category, keywords, or ratio",
          parameters: {
            type: "object",
            properties: {
              category: { type: "string", description: "Template category/niche (e.g., 'social_media', 'marketing')" },
              keywords: { type: "string", description: "Keywords to search for in template titles/descriptions" },
              ratio: { type: "string", description: "Aspect ratio (e.g., '1:1', '16:9', '9:16', '4:5')" },
              limit: { type: "number", description: "Maximum number of results (default: 5)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "show_brandkit",
          description: "Show the user's current Brand Kit (colors, logo, fonts)",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "open_canva",
          description: "Open a Canva template or import a generated image into Canva",
          parameters: {
            type: "object",
            properties: {
              template_url: { type: "string", description: "The Canva template URL to open (if using existing template)" },
              generated_image_url: { type: "string", description: "The generated image URL to import into Canva (if using AI-generated image)" },
              template_title: { type: "string", description: "The template title for confirmation" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_ai_version",
          description: "Generate an AI-styled version of a template using Nano-Banana (costs 1 credit)",
          parameters: {
            type: "object",
            properties: {
              template_image_url: { type: "string", description: "URL of the template image to transform" },
              template_title: { type: "string", description: "Template title for reference" },
              style_instructions: { type: "string", description: "Specific style adjustments to apply" }
            },
            required: ["template_image_url"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_credits",
          description: "Check the user's remaining AI generation credits",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_image",
          description: "Generate an image from a text prompt using Lovable AI (FREE)",
          parameters: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "Detailed description of the image to generate" }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "improve_image",
          description: "Improve an existing image with AI using Lovable AI (FREE). User must provide image URL.",
          parameters: {
            type: "object",
            properties: {
              image_url: { type: "string", description: "URL of the image to improve" },
              instructions: { type: "string", description: "Specific improvements to apply" }
            },
            required: ["image_url", "instructions"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_video",
          description: "Generate a video from a text prompt using Replicate (requires Replicate API key)",
          parameters: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "Detailed description of the video to generate" }
            },
            required: ["prompt"]
          }
        }
      }
    ];

    const response = await fetch(AI_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_CONFIG.model, // Modèle configurable via env variable
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools: tools,
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
