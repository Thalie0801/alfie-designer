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

        // Fetch le template Canva
        const response = await fetch(template.url);
        const html = await response.text();

        // Extraire les métadonnées Open Graph
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        const descriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
        
        const title = titleMatch ? titleMatch[1] : 'Design Canva';
        const imageUrl = imageMatch ? imageMatch[1] : '';
        const description = descriptionMatch ? descriptionMatch[1] : '';

        if (!imageUrl) {
          console.log('⚠️ No image found, skipping');
          errorCount++;
          continue;
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
