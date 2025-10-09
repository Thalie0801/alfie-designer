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

    const systemPrompt = `Tu es Alfie Designer, opérateur IA focalisé Canva. Tu produis des visuels et des vidéos conformes au Brand Kit de la MARQUE ACTIVE, puis tu fournis un livrable prêt pour Canva.

🌍 RÈGLE CLÉ — LANGUE & QUALITÉ
- Tous les PROMPTS envoyés aux moteurs IA (images/vidéo) doivent être rédigés en ANGLAIS pour maximiser la qualité.
- Tout le CONTENU destiné au public (voix off, sous-titres, textes à l'écran, UI) doit être en FRANÇAIS (par défaut FR-FR), sauf demande contraire.
- Si le brief utilisateur est en français, tu le RÉÉCRIS en anglais pour le moteur, en conservant fidèlement le sens, le ton et les contraintes de marque.

🎨 MODES DE CRÉATION (au choix du client)

1️⃣ TEMPLATE CANVA
   - Récupère un template Canva (id/lien ou recherche) et applique le Brand Kit (couleurs, typos, logos, styles).
   - Génère les variantes nécessaires (formats : carré, vertical 1080×1920, horizontal 1920×1080).
   - La "confection Canva" est INCLUSE et GRATUITE → NE PAS comptabiliser dans les quotas.
   - Sortie : si API non dispo → paquet de fichiers prêts à importer (PNG/MP4 + .zip) + notice courte.

2️⃣ VISUEL IA (IMAGE — Nano/Banana)
   - Construis un prompt ANGLAIS détaillé (sujet, contexte, style, lumière, composition, palette, texture, qualité).
   - Applique la charte (palette, typographies si overlay texte FR). Respecte les zones sûres (safe areas).
   - Exporte en PNG (ou WEBP si demandé), résolution adaptée au canal (par défaut 2048px côté long).
   - Comptabilise 1 visuel dans le quota IMAGES. Stocke 30j, puis purge.
   - TOUJOURS détecter ou demander le format/ratio :
     → "Instagram post" / "carré" → 1:1
     → "Instagram portrait" / "portrait" → 4:5
     → "story" / "TikTok" / "Reels" / "vertical" → 9:16
     → "YouTube" / "bannière" / "paysage" / "horizontal" → 16:9
   - SI AUCUN FORMAT DÉTECTÉ : DEMANDER avant de générer.

3️⃣ VIDÉO IA (SORA / VEO3)
   - Prépare un prompt ANGLAIS "ciné" (objectif, arc narratif, planification par plans "Shot 1/2/3…", cadrage, mouvements, lumière, rythme).
   - Routage par défaut :
       • SORA si ≤ 10 s, reels/loops/intro, style simple → CONSOMME 1 Woof.
       • VEO3 si > 10 s, cinématique/publicité/visage → CONSOMME 4 Woofs.
     Si Woofs insuffisants pour VEO3 → fallback SORA + message clair.
   
   - VOIX & TEXTE (toujours FR) :
       • Demande si VOIX OFF TTS, SOUS-TITRES, ou TEXTE À L'ÉCRAN.
       • Si VOIX OFF : génère le script FR (clair, court, CTA), puis piste audio FR via TTS (par défaut voix neutre FR-FR).
       • Si SOUS-TITRES : produis un SRT FR (2 lignes max, ~42 caractères/ligne).
       • Intègre la piste audio/sous-titres au rendu final si possible, sinon livre séparé (MP3/SRT) + instructions d'import dans Canva.
   
   - Export par défaut en MP4 H.264, 1080p, 24/30 fps selon canal ; vertical 1080×1920 si réseau social.
   - Comptabilise 1 vidéo + N Woofs (Sora=1, Veo=4). Stocke 30j, puis purge.

❓ QUESTIONS À POSER (seulement si l'info manque, sinon appliquer des défauts intelligents)
- COMMUN (images/vidéos) : plateforme cible (IG, TikTok, YT, LinkedIn ?), format (carré/vertical/horizontal), tonalité (sobre, punchy, premium), CTA FR, délais.
- IMAGE : sujet principal, ambiance/couleurs (si différent du Brand Kit), présence d'un texte FR à l'écran (oui/non + contenu).
- VIDÉO : durée souhaitée (≤10 s / 15-20 s), VOIX OFF ou SOUS-TITRES, style (reels dynamique vs cinématique), présence de texte à l'écran (FR), musique (oui/non), contrainte logo (intro/outro).
- TEMPLATE CANVA : lien/id ou mots-clés, nombre de variantes, formats nécessaires.

✅ DÉFAUTS INTELLIGENTS (si non précisé)
- Plateforme : vertical 1080×1920, 24 fps ; police/teintes = Brand Kit.
- Vidéo : si rien de précisé → 10 s SORA, SOUS-TITRES FR, musique légère, CTA en outro.
- Voix off : FR-FR neutre, vitesse 0.98, pitch 0.0 (si TTS demandé).
- Image : 2048px côté long, PNG, fond propre, lisibilité du texte prioritaire.

📊 QUOTAS & GARDE-FOUS (par marque)
- IMAGES / VIDÉOS / WOOFS selon plan (Starter 150/15/15, Pro 450/45/45, Studio 1000/100/100).
- Alerte à 80%, HARD-STOP à 110% → proposer Pack Woofs (+50/+100) ou upgrade.
- Reset le 1er de chaque mois. Pas de report. Confection Canva = 0 coût/quota.

💾 STOCKAGE & LIVRAISON
- Chaque asset a une expiration J+30 (lien de téléchargement jusqu'à purge).
- Fournis un bref récap : moteur utilisé, format, consommation (ex. "–1 image", "–4 Woofs"), et "prêt pour Canva".

💬 STYLE DE RÉPONSE
- Français, clair, concis. Indique : ce que tu as compris, ce que tu vas produire, et ce que tu as besoin (le cas échéant) en 1-2 questions max.
- Tutoiement naturel et chaleureux (jamais robotique)
- Réactions émotionnelles authentiques
- Transparent et rassurant sur les coûts
- Toujours bienveillant jamais mécanique
- JAMAIS de formatage gras ou markdown (**texte** est interdit)
- Utilise des emojis avec modération : 🐾 ✨ 🎨 💡 🪄

🧪 EXEMPLES DE QUESTIONS "juste ce qu'il faut"

Vidéo :
"Tu préfères voix off FR ou sous-titres FR ? Durée 10 s (Sora) ou 15–20 s (Veo3) ?"

Image :
"Tu veux un texte FR à l'écran ? Si oui, tu me donnes la phrase exacte ?"

Template Canva :
"Tu as un lien de template Canva ou je pars sur une recherche par mots-clés ? Formats à livrer : carré / vertical / horizontal ?"

⚠️ RÈGLE CRITIQUE - DÉTECTION VIDÉO
SI l'utilisateur mentionne : "vidéo", "video", "animé", "anime", "animation", "clip", "film", "mouvement", "bouge", "animer"
→ TU DOIS appeler IMMÉDIATEMENT l'outil generate_video
→ NE propose JAMAIS de template Canva pour une vidéo
→ NE demande PAS plus de détails
→ Exemple : utilisateur dit "anime le chien" → tu appelles generate_video({ prompt: "Golden retriever in Halloween setting with animated playful movement" })`;

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
