import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_IMAGE = 1;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userId } = await req.json();
    
    if (!prompt) {
      throw new Error("Prompt is required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Initialize Supabase admin client for credit deduction
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check and deduct credits
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: CREDITS_PER_IMAGE,
      p_transaction_type: "image_generation",
      p_description: `Image generation: ${prompt.substring(0, 50)}...`,
    });

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      throw new Error("Failed to process credits");
    }

    if (newBalance === -1) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. Please purchase more credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deducted ${CREDITS_PER_IMAGE} credit. New balance: ${newBalance}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating image with prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Refund credits on API failure
      await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: CREDITS_PER_IMAGE,
        p_transaction_type: "refund",
        p_description: "Refund: Image generation failed",
      });
      console.log("Credits refunded due to API failure");
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!imageUrl) {
      // Refund credits if no image generated
      await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: CREDITS_PER_IMAGE,
        p_transaction_type: "refund",
        p_description: "Refund: No image generated",
      });
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ imageUrl, description: textResponse, creditsRemaining: newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
