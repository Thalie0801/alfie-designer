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
    const { payout_id } = await req.json();
    
    if (!payout_id) {
      throw new Error("payout_id is required");
    }

    console.log(`Processing payout: ${payout_id}`);

    // Récupérer le payout
    const { data: payout, error: payoutError } = await supabaseClient
      .from("affiliate_payouts")
      .select("*, affiliates(*)")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "pending") {
      throw new Error(`Payout is already ${payout.status}`);
    }

    const affiliate = payout.affiliates;
    
    if (!affiliate.stripe_connect_account_id) {
      throw new Error("Affiliate has no Connect account");
    }

    if (!affiliate.stripe_connect_payouts_enabled) {
      throw new Error("Payouts not enabled for this affiliate");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Créer un transfer vers le compte Connect
    // Montant en centimes
    const amountInCents = Math.round(payout.amount * 100);
    
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: "eur",
      destination: affiliate.stripe_connect_account_id,
      description: `Commission payout for period ${payout.period}`,
      metadata: {
        payout_id: payout.id,
        affiliate_id: affiliate.id,
      },
    });

    console.log(`Transfer created: ${transfer.id}`);

    // Mettre à jour le payout
    const { error: updateError } = await supabaseClient
      .from("affiliate_payouts")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payout_id);

    if (updateError) {
      console.error("Error updating payout:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transfer_id: transfer.id,
        amount: payout.amount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in process-affiliate-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
