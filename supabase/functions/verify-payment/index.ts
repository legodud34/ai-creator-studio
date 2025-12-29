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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log(`Verifying payment for session ${sessionId}, status: ${session.payment_status}`);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the session belongs to this user
    const sessionUserId = session.metadata?.user_id;
    if (sessionUserId !== user.id) {
      console.error(`User mismatch: session user ${sessionUserId} vs authenticated user ${user.id}`);
      throw new Error("Session does not belong to this user");
    }

    const credits = parseInt(session.metadata?.credits || "0", 10);
    if (!credits) {
      throw new Error("No credits in session metadata");
    }

    // Check if we already processed this session
    const { data: existingTransaction } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingTransaction) {
      console.log(`Session ${sessionId} already processed`);
      
      // Get current balance
      const { data: balanceData } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(JSON.stringify({ 
        success: true, 
        alreadyProcessed: true,
        credits: balanceData?.credits || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Add credits using the database function
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc("add_credits", {
      p_user_id: user.id,
      p_amount: credits,
      p_transaction_type: "purchase",
      p_stripe_session_id: sessionId,
      p_description: `Purchased ${credits} credits`,
    });

    if (creditError) {
      console.error("Error adding credits:", creditError);
      throw new Error("Failed to add credits");
    }

    console.log(`Successfully added ${credits} credits to user ${user.id}. New balance: ${newBalance}`);

    return new Response(JSON.stringify({ 
      success: true, 
      credits: newBalance,
      addedCredits: credits
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
