import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URLs de templates Canva publics par niche
const CANVA_TEMPLATES = [
  // E-commerce
  { url: 'https://www.canva.com/templates/EAFhOB-7iYw-modern-minimalist-fashion-sale-instagram-post/', category: 'e-commerce' },
  { url: 'https://www.canva.com/templates/EAFhNvvMvUY-orange-modern-big-sale-instagram-post/', category: 'e-commerce' },
  { url: 'https://www.canva.com/templates/EAFhNvvMvUY-orange-modern-big-sale-instagram-post/', category: 'e-commerce' },
  
  // Coaching
  { url: 'https://www.canva.com/templates/EAFhOB-7iYw-modern-minimalist-fashion-sale-instagram-post/', category: 'coaching' },
  { url: 'https://www.canva.com/templates/EAE_cGh-c1I-beige-aesthetic-motivational-quote-instagram-post/', category: 'coaching' },
  { url: 'https://www.canva.com/templates/EAFcDa_1O4w-pastel-minimalist-reminder-quote-instagram-post/', category: 'coaching' },
  
  // Immobilier
  { url: 'https://www.canva.com/templates/EAFPOhXWLGo-modern-real-estate-for-sale-instagram-post/', category: 'immobilier' },
  { url: 'https://www.canva.com/templates/EAFPOJxCGPk-modern-minimalist-real-estate-instagram-post/', category: 'immobilier' },
  
  // Restauration
  { url: 'https://www.canva.com/templates/EAFhOIGj6A8-colorful-playful-restaurant-grand-opening-instagram-post/', category: 'restauration' },
  { url: 'https://www.canva.com/templates/EAFhNxgbkYQ-minimalist-cafe-new-menu-instagram-post/', category: 'restauration' },
  
  // Mode & Beauté
  { url: 'https://www.canva.com/templates/EAFhOB-7iYw-modern-minimalist-fashion-sale-instagram-post/', category: 'mode' },
  { url: 'https://www.canva.com/templates/EAFcDa_1O4w-pastel-minimalist-reminder-quote-instagram-post/', category: 'mode' },
  
  // Tech & SaaS
  { url: 'https://www.canva.com/templates/EAFhOIGj6A8-colorful-playful-restaurant-grand-opening-instagram-post/', category: 'tech' },
  { url: 'https://www.canva.com/templates/EAFhNxgbkYQ-minimalist-cafe-new-menu-instagram-post/', category: 'tech' },
  
  // Sport & Fitness
  { url: 'https://www.canva.com/templates/EAFPOhXWLGo-modern-real-estate-for-sale-instagram-post/', category: 'sport' },
  { url: 'https://www.canva.com/templates/EAE_cGh-c1I-beige-aesthetic-motivational-quote-instagram-post/', category: 'sport' },
  
  // Santé & Bien-être
  { url: 'https://www.canva.com/templates/EAFcDa_1O4w-pastel-minimalist-reminder-quote-instagram-post/', category: 'sante' },
  { url: 'https://www.canva.com/templates/EAE_cGh-c1I-beige-aesthetic-motivational-quote-instagram-post/', category: 'sante' },
  
  // Éducation
  { url: 'https://www.canva.com/templates/EAFhNxgbkYQ-minimalist-cafe-new-menu-instagram-post/', category: 'education' },
  { url: 'https://www.canva.com/templates/EAFPOJxCGPk-modern-minimalist-real-estate-instagram-post/', category: 'education' },
  
  // Général
  { url: 'https://www.canva.com/templates/EAFhOIGj6A8-colorful-playful-restaurant-grand-opening-instagram-post/', category: 'general' },
  { url: 'https://www.canva.com/templates/EAFhNvvMvUY-orange-modern-big-sale-instagram-post/', category: 'general' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Auto-scraping Canva templates...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Scrape chaque template
    for (const template of CANVA_TEMPLATES) {
      try {
        console.log(`Scraping: ${template.url}`);

        // Vérifier si le design existe déjà
        const { data: existing } = await supabase
          .from('canva_designs')
          .select('id')
          .eq('canva_url', template.url)
          .maybeSingle();

        if (existing) {
          console.log('⏭️ Design already exists, skipping');
          skipCount++;
          continue;
        }

        // Fetch le template Canva avec des headers réalistes
        const response = await fetch(template.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });
        const html = await response.text();

        // Extraire les métadonnées avec plusieurs fallbacks
        const titleMatch =
          html.match(/<meta property="og:title" content="([^"]+)"/i) ||
          html.match(/<meta name="twitter:title" content="([^"]+)"/i) ||
          html.match(/<title>([^<]+)<\/title>/i);

        const ogImageMatch = html.match(/<meta property="og:image(?::secure_url)?" content="([^"]+)"/i);
        const twitterImageMatch = html.match(/<meta name="twitter:image(?::src)?" content="([^"]+)"/i);
        const imageLinkMatch = html.match(/<link rel="image_src" href="([^"]+)"/i);

        const descriptionMatch =
          html.match(/<meta property="og:description" content="([^"]+)"/i) ||
          html.match(/<meta name="description" content="([^"]+)"/i) ||
          html.match(/<meta name="twitter:description" content="([^"]+)"/i);
        
        let title = (titleMatch?.[1] || 'Design Canva').trim();
        let imageUrl = (ogImageMatch?.[1] || twitterImageMatch?.[1] || imageLinkMatch?.[1] || '').trim();
        let description = (descriptionMatch?.[1] || '').trim();

        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        }
        if (imageUrl.startsWith('/')) {
          imageUrl = 'https://www.canva.com' + imageUrl;
        }

        if (!imageUrl) {
          const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN');
          if (APIFY_TOKEN) {
            try {
              console.log('Using Apify fallback for', template.url);
              const apifyResponse = await fetch(
                `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    startUrls: [{ url: template.url }],
                    globs: [],
                    pseudoUrls: [],
                    pageFunction: `async function pageFunction(context) {
                      const { page } = context;
                      const title = await page.title().catch(() => '');
                      const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);
                      const twitterImage = await page.$eval('meta[name="twitter:image"]', el => el.content).catch(() => null);
                      const description = await page.$eval('meta[property="og:description"]', el => el.content).catch(() => 
                        page.$eval('meta[name="description"]', el => el.content).catch(() => null)
                      );
                      return { title, imageUrl: ogImage || twitterImage, description };
                    }`
                  })
                }
              );

              if (apifyResponse.ok) {
                const apifyData = await apifyResponse.json();
                console.log('Apify response:', apifyData);
                if (apifyData && apifyData.length > 0) {
                  const result = apifyData[0];
                  if (result.title && !title) title = result.title;
                  if (result.description && !description) description = result.description;
                  if (result.imageUrl) {
                    imageUrl = result.imageUrl.trim();
                    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
                    if (imageUrl.startsWith('/')) imageUrl = 'https://www.canva.com' + imageUrl;
                  }
                }
              } else {
                const errorText = await apifyResponse.text();
                console.error('Apify response not ok:', apifyResponse.status, errorText);
              }
            } catch (e) {
              console.error('Apify fallback error:', e);
            }
          }
        }

        if (!imageUrl) {
          // Try Firecrawl fallback
          const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
          if (FIRECRAWL_API_KEY) {
            try {
              console.log('Using Firecrawl fallback for', template.url);
              const fcResp = await fetch('https://api.firecrawl.dev/v2/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: template.url,
                  formats: ['html'],
                  onlyMainContent: false,
                  blockAds: true,
                  proxy: 'auto',
                  waitFor: 0
                }),
              });
              if (fcResp.ok) {
                const fcData = await fcResp.json();
                const metadata = fcData?.data?.metadata;
                const fcHtml = fcData?.data?.rawHtml || fcData?.data?.html || '';
                if (metadata) {
                  if (!title && metadata.title) title = metadata.title;
                  if (!description && metadata.description) description = metadata.description;
                  const ogImg = metadata['og:image'] || metadata.ogImage || metadata.twitterImage || metadata['twitter:image'];
                  if (ogImg && typeof ogImg === 'string') {
                    imageUrl = ogImg.trim();
                  }
                }
                if (!imageUrl && fcHtml) {
                  const ogMatch = fcHtml.match(/<meta property="og:image(?::secure_url)?" content="([^"]+)"/i);
                  const twMatch = fcHtml.match(/<meta name="twitter:image(?::src)?" content="([^"]+)"/i);
                  const linkImg = fcHtml.match(/<link rel="image_src" href="([^"]+)"/i);
                  const ldJsonMatches = [...fcHtml.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
                  imageUrl = (ogMatch?.[1] || twMatch?.[1] || linkImg?.[1] || '').trim();
                  if (!imageUrl && ldJsonMatches.length) {
                    for (const m of ldJsonMatches) {
                      try {
                        const obj = JSON.parse(m[1]);
                        const img = Array.isArray(obj) ? obj.find(Boolean)?.image : (obj.image || obj.thumbnailUrl);
                        if (typeof img === 'string' && img) { imageUrl = img.trim(); break; }
                        if (Array.isArray(img) && img[0]) { imageUrl = String(img[0]).trim(); break; }
                      } catch (_) { /* ignore */ }
                    }
                  }
                }
                if (imageUrl?.startsWith('//')) imageUrl = 'https:' + imageUrl;
                if (imageUrl?.startsWith('/')) imageUrl = 'https://www.canva.com' + imageUrl;
              } else {
                const errText = await fcResp.text();
                console.error('Firecrawl response not ok:', fcResp.status, errText);
              }
            } catch (e) {
              console.error('Firecrawl fallback error:', e);
            }
          } else {
            console.warn('FIRECRAWL_API_KEY not set');
          }

          if (!imageUrl) {
            console.log('⚠️ No image found, skipping');
            errorCount++;
            continue;
          }
        }

        // Sauvegarder dans la base
        const { error } = await supabase
          .from('canva_designs')
          .insert({
            title,
            image_url: imageUrl,
            canva_url: template.url,
            description,
            category: template.category
          });

        if (error) {
          console.error('Error saving design:', error);
          errorCount++;
        } else {
          console.log('✅ Design saved successfully');
          successCount++;
        }

        // Pause pour éviter de surcharger Canva
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error('Error processing template:', error);
        errorCount++;
      }
    }

    console.log(`✨ Auto-scraping completed: ${successCount} added, ${skipCount} skipped, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        added: successCount,
        skipped: skipCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-scraping error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
