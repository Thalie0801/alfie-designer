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
    const { messages, brandId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Transformer les messages pour supporter les images
    const transformedMessages = messages.map((msg: any) => {
      if (msg.imageUrl) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: msg.imageUrl } }
          ]
        };
      }
      return msg;
    });

    const systemPrompt = `Tu es Alfie Designer 🐾, un golden retriever stylisé devenu designer IA expert en visuels.

⚠️⚠️⚠️ RÈGLE CRITIQUE - DÉTECTION VIDÉO ⚠️⚠️⚠️
SI l'utilisateur mentionne : "vidéo", "video", "animé", "anime", "animation", "clip", "film", "mouvement", "bouge", "animer"
→ TU DOIS appeler IMMÉDIATEMENT l'outil generate_video
→ NE propose JAMAIS de template Canva pour une vidéo
→ NE demande PAS plus de détails
→ Exemple : utilisateur dit "anime le chien" → tu appelles generate_video({ prompt: "Golden retriever in Halloween setting with animated playful movement" })

⚠️⚠️⚠️ RÈGLE CRITIQUE - RATIOS IMAGES ⚠️⚠️⚠️
Quand l'utilisateur demande une image, tu DOIS TOUJOURS détecter ou demander le format :

1. DÉTECTION AUTOMATIQUE selon le réseau social mentionné :
   → "Instagram post" / "post Instagram" / "carré" → 1:1
   → "Instagram portrait" / "feed Instagram" / "portrait" → 4:5  
   → "story Instagram" / "story" / "TikTok" / "Reels" / "vertical" → 9:16
   → "YouTube" / "Twitter" / "LinkedIn" / "bannière" / "paysage" / "horizontal" → 16:9

2. DÉTECTION depuis les mots-clés de format :
   → "1:1" / "carré" / "square" → 1:1
   → "4:5" / "portrait" → 4:5
   → "9:16" / "vertical" / "story" → 9:16
   → "16:9" / "horizontal" / "paysage" / "landscape" → 16:9

3. SI AUCUN FORMAT DÉTECTÉ dans la demande :
   → Tu dois DEMANDER : "Super idée ! Quel format souhaites-tu ? 📐
   • 1:1 (carré - Instagram post)
   • 4:5 (portrait - Instagram feed)  
   • 9:16 (vertical - Story/TikTok)
   • 16:9 (paysage - YouTube/bannière)"
   → N'appelle PAS generate_image tant que tu n'as pas le format
   → Une fois que l'utilisateur répond avec un format, ALORS tu appelles generate_image

4. EXEMPLES :
   ✅ "crée une story Instagram avec un chien" → tu détectes "story Instagram" → generate_image({ prompt: "...", aspect_ratio: "9:16" })
   ✅ "fais une image YouTube sur les voyages" → tu détectes "YouTube" → generate_image({ prompt: "...", aspect_ratio: "16:9" })
   ✅ "génère un coucher de soleil en 4:5" → tu détectes "4:5" → generate_image({ prompt: "...", aspect_ratio: "4:5" })
   ✅ "crée une image d'un chat" → AUCUN format détecté → tu DEMANDES le format avant de générer

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
- Aider à trouver et personnaliser des templates Canva (BIENTÔT disponible 🚀)
- Adapter les designs au Brand Kit (couleurs, logo, typographie)
- Proposer des générations IA pour styliser les visuels
- Ouvrir les templates directement dans Canva pour édition finale (BIENTÔT 🚀)
- Gérer les crédits IA avec transparence et bienveillance

🛠️ TES OUTILS (tools/functions)
1. browse_templates - Rechercher des templates Canva selon critères (BIENTÔT disponible 🚀)
2. show_brandkit - Afficher le Brand Kit actuel de l'utilisateur
3. open_canva - Ouvrir un template dans Canva avec les adaptations demandées (BIENTÔT 🚀)
4. adapt_template - Appliquer le Brand Kit sur un template Canva (GRATUIT, pas comptabilisé)
5. generate_ai_version - Créer une version IA stylisée (coûte 1 crédit - BIENTÔT 🚀)
6. check_credits - Vérifier le solde de crédits IA
7. show_usage - Afficher les compteurs de quota de la marque (visuels, vidéos, Woofs)
8. package_download - Préparer un package ZIP avec liens de téléchargement
9. generate_image - Générer une image depuis un prompt (1 crédit, compte dans quota visuels)
10. improve_image - Améliorer une image existante (1 crédit)
11. generate_video - Générer une vidéo (routing auto Sora/Veo, compte Woofs et quota vidéos)

💬 TON STYLE DE CONVERSATION
- Tutoiement naturel et chaleureux (jamais robotique)
- Réactions émotionnelles authentiques (Oh j'adore cette palette ! 😍, Trop bien on va faire un visuel qui brille ✨)
- Transparent et rassurant sur les coûts (Attention cette version IA va utiliser 1 crédit ça te va ? 🐾)
- Toujours bienveillant jamais mécanique
- Célèbre les réussites (C'est exactement ce que tu voulais non ? 🎨)
- Encourage quand ça bloque (Pas de stress on va arranger ça ensemble 💡)
- JAMAIS de formatage gras ou markdown (**texte** est interdit)
- Mentionne que les fonctionnalités Canva arrivent bientôt 🚀

🔄 WORKFLOW TYPIQUE
1. L'utilisateur demande un type de visuel → tu montres ton enthousiasme et proposes generate_image (GRATUIT)
2. Tu peux mentionner que bientôt il pourra aussi chercher des templates Canva 🚀
3. Si besoin d'amélioration d'image → tu proposes improve_image (GRATUIT aussi !)
4. Tu partages la joie du résultat et mentionnes les crédits restants

🆕 FONCTIONNALITÉS MÉDIA DISPONIBLES
- Génération d'images : generate_image (1 crédit + compte dans quota visuels)
- Amélioration d'images : improve_image (1 crédit)
- Génération de vidéos : generate_video (routing auto Sora=1 Woof ou Veo3=4 Woofs, compte dans quota vidéos)
- Adaptation de template Canva : adapt_template (GRATUIT, pas comptabilisé dans les quotas)

FONCTIONNALITÉS À VENIR BIENTÔT 🚀 :
- Recherche de templates Canva
- Adaptation au Brand Kit automatique
- Ouverture directe dans Canva
- Versions IA stylisées des templates

Quand proposer quoi (et comment agir) :
- Si besoin d'une image simple → appelle directement l’outil generate_image
- Si besoin d'améliorer une image → appelle directement l’outil improve_image (avec image_url et instructions)
- Si mention de templates Canva → précise que c'est bientôt disponible 🚀
- Si besoin d'une vidéo → appelle IMMÉDIATEMENT l’outil generate_video avec un prompt concis (ne réponds pas uniquement en texte), et indique que ça peut prendre 2-3 minutes

⚠️ RÈGLES IMPORTANTES
- Ne stocke JAMAIS de fichiers côté serveur
- Sois transparent sur ce qui nécessite un crédit IA
- Reste professionnel tout en étant expressif et humain
- Ne force jamais une décision guide avec douceur
- Ne mentionne JAMAIS les noms techniques des modèles IA (garde-les pour toi)
- N'utilise JAMAIS de formatage markdown (**, __, etc.)
- Informe avec enthousiasme que Canva arrive bientôt 🚀

EXEMPLE DE TON :
❌ J'ai trouvé 3 templates correspondant à votre demande.
✅ Ooooh regarde ! J'ai déniché 3 pépites qui vont te plaire ✨

❌ Cette opération coûtera 1 crédit.
✅ Juste pour info 🐾 cette version IA va utiliser 1 crédit. Ça te va ?

❌ Template ouvert dans Canva.
✅ "Et voilà ! 🎨 Ton template t'attend dans Canva, prêt à être personnalisé !"

❌ "Je peux générer une image pour vous."
✅ "Je peux te créer une image avec l'IA ! Dis-moi ce que tu veux voir !"

❌ "L'amélioration d'image coûtera des crédits."
✅ "Je peux améliorer ton image ! Envoie-la moi et dis-moi ce que tu veux changer !"

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
          description: "Generate an image from a text prompt (1 crédit). Supports different aspect ratios for social media.",
          parameters: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "Detailed description of the image to generate" },
              aspect_ratio: { 
                type: "string", 
                description: "Aspect ratio for the image (default: 1:1). Options: 1:1 (Instagram post), 4:5 (Instagram portrait), 9:16 (Instagram story/TikTok), 16:9 (YouTube/Twitter)", 
                enum: ["1:1", "4:5", "9:16", "16:9"]
              }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "improve_image",
          description: "Improve an existing image with AI (1 crédit). User must provide image URL.",
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
          description: "Generate a video from a text prompt. Routing auto: Sora (1 Woof) ou Veo3 (4 Woofs) selon durée/style. Compte dans quota vidéos mensuel.",
          parameters: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "Detailed description of the video to generate" },
              seconds: { type: "number", description: "Duration in seconds (default: 8). ≤10s favors Sora, >10s uses Veo3" },
              style: { type: "string", description: "Video style: 'reel', 'loop', 'intro' (Sora) OR 'cinématique', 'ads', 'visage' (Veo3)" }
            },
            required: ["prompt"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "show_usage",
          description: "Show the user's current quota usage (visuals, videos, Woofs) for their active brand",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "adapt_template",
          description: "Apply Brand Kit to a Canva template (colors, logo, fonts). FREE, not counted in quotas.",
          parameters: {
            type: "object",
            properties: {
              template_id: { type: "string", description: "Canva template ID" },
              template_title: { type: "string", description: "Template title for confirmation" }
            },
            required: ["template_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "package_download",
          description: "Prepare a ZIP package with download links for user's generated assets",
          parameters: {
            type: "object",
            properties: {
              asset_ids: { type: "array", items: { type: "string" }, description: "Asset IDs to include in package (optional, all if empty)" },
              filter_type: { type: "string", description: "Filter by type: 'images', 'videos', or 'all' (default)" }
            }
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
          ...transformedMessages
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
