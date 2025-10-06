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

    // Fetch the Canva page
    const response = await fetch(url);
    const html = await response.text();

    // Extract Open Graph metadata
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const descriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    
    const title = titleMatch ? titleMatch[1] : 'Untitled Design';
    const imageUrl = imageMatch ? imageMatch[1] : '';
    const description = descriptionMatch ? descriptionMatch[1] : '';

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Could not extract design preview' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
