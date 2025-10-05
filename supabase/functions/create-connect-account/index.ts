import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    console.log(`Creating Connect account for user: ${user.email}`);

    // Récupérer l'affilié
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from("affiliates")
      .select("*")
      .eq("id", user.id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("Affiliate not found");
    }

    // Vérifier si le compte Connect existe déjà
    if (affiliate.stripe_connect_account_id) {
      console.log(`Connect account already exists: ${affiliate.stripe_connect_account_id}`);
      return new Response(
        JSON.stringify({ 
          account_id: affiliate.stripe_connect_account_id,
          onboarding_complete: affiliate.stripe_connect_onboarding_complete 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Créer un compte Connect Express
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        affiliate_id: affiliate.id,
      },
    });

    console.log(`Created Connect account: ${account.id}`);

    // Mettre à jour l'affilié avec l'ID du compte Connect
    const { error: updateError } = await supabaseClient
      .from("affiliates")
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_onboarding_complete: false,
        stripe_connect_charges_enabled: false,
        stripe_connect_payouts_enabled: false,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating affiliate:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        account_id: account.id,
        onboarding_complete: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in create-connect-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
