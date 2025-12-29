import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, we'll parse the event directly since webhook secret may not be set
    // In production, you should verify the signature with STRIPE_WEBHOOK_SECRET
    let event: Stripe.Event;
    
    try {
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } else {
        // Fallback: parse without verification (not recommended for production)
        event = JSON.parse(body) as Stripe.Event;
        console.warn("STRIPE_WEBHOOK_SECRET not set - webhook signature not verified");
      }
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Received Stripe event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits || "0", 10);
      
      if (!userId || !credits) {
        console.error("Missing user_id or credits in session metadata:", session.metadata);
        return new Response(JSON.stringify({ error: "Missing metadata" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Adding ${credits} credits to user ${userId}`);

      // Use the add_credits function
      const { data, error } = await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits,
        p_transaction_type: "purchase",
        p_stripe_session_id: session.id,
        p_description: `Purchased ${credits} credits`,
      });

      if (error) {
        console.error("Error adding credits:", error);
        return new Response(JSON.stringify({ error: "Failed to add credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully added ${credits} credits. New balance: ${data}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
