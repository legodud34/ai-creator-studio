import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_VIDEO = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const body = await req.json();

    // Check prediction status (no credit deduction for status checks)
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Status:", prediction.status);
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start new video generation
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase admin client for credit deduction
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check and deduct credits
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc("deduct_credits", {
      p_user_id: body.userId,
      p_amount: CREDITS_PER_VIDEO,
      p_transaction_type: "video_generation",
      p_description: `Video generation: ${body.prompt.substring(0, 50)}...`,
    });

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      throw new Error("Failed to process credits");
    }

    if (newBalance === -1) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need 10 credits for video generation." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deducted ${CREDITS_PER_VIDEO} credits. New balance: ${newBalance}`);
    console.log("Starting video generation with prompt:", body.prompt, "duration:", body.duration);

    // Using Luma Ray via Replicate
    const prediction = await replicate.predictions.create({
      model: "luma/ray",
      input: {
        prompt: body.prompt,
        aspect_ratio: body.aspectRatio || "16:9",
        loop: false,
        duration: body.duration || 5,
      },
    });

    console.log("Prediction created:", prediction.id);

    return new Response(JSON.stringify({ ...prediction, creditsRemaining: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-video:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Video generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
