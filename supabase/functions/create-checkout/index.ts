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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    const { priceId, credits } = await req.json();
    
    if (!priceId || !credits) {
      throw new Error("Missing priceId or credits");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://afterglow.lovable.app";

    // Create checkout session - guest mode only, no saved cards or Stripe Link
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"], // Only card payment, disables Stripe Link
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/credit-shop?success=true&credits=${credits}`,
      cancel_url: `${origin}/credit-shop?canceled=true`,
      metadata: {
        user_id: user.id,
        credits: credits.toString(),
      },
    });

    console.log(`Checkout session created: ${session.id} for user ${user.id}, credits: ${credits}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
