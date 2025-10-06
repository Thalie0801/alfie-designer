import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, category } = await req.json();
    
    if (!url || !url.includes('canva.com')) {
      return new Response(
        JSON.stringify({ error: 'Valid Canva URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping Canva URL:', url);

    // Fetch the Canva page with realistic headers (improves success rate)
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      },
    });
    const html = await response.text();

    // Extract metadata with multiple fallbacks
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

    let title = titleMatch ? titleMatch[1] : 'Untitled Design';
    let imageUrl = (ogImageMatch?.[1] || twitterImageMatch?.[1] || imageLinkMatch?.[1] || '').trim();
    let description = (descriptionMatch?.[1] || '').trim();

    // Normalize protocol-relative and root-relative URLs
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
          console.log('Using Apify fallback for', url);
          const apifyResponse = await fetch(
            `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                startUrls: [{ url }],
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
      } else {
        console.warn('APIFY_TOKEN not set');
      }

      if (!imageUrl) {
        // Try Firecrawl fallback if configured
        const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
        if (FIRECRAWL_API_KEY) {
          try {
            console.log('Using Firecrawl fallback for', url);
            const fcResp = await fetch('https://api.firecrawl.dev/v2/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url,
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
          return new Response(
            JSON.stringify({ error: 'Could not extract design preview' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('canva_designs')
      .insert({
        title,
        image_url: imageUrl,
        canva_url: url,
        description,
        category: category || null
      })
      .select()
      .single();

    if (error) {
      // If duplicate URL, return existing design
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('canva_designs')
          .select()
          .eq('canva_url', url)
          .single();
        
        return new Response(
          JSON.stringify({ success: true, data: existing }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Design saved:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
