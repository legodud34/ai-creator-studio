import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_EDIT = 20;

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

    // Start new video edit
    if (!body.videoUrl) {
      return new Response(
        JSON.stringify({ error: "Video URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Edit prompt is required" }),
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
      p_amount: CREDITS_PER_EDIT,
      p_transaction_type: "video_edit",
      p_description: `Video edit: ${body.prompt.substring(0, 50)}...`,
    });

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      throw new Error("Failed to process credits");
    }

    if (newBalance === -1) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need 20 credits for video editing." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deducted ${CREDITS_PER_EDIT} credits. New balance: ${newBalance}`);
    console.log("Starting video edit with prompt:", body.prompt);
    console.log("Source video:", body.videoUrl);

    // Using Luma Modify Video via Replicate for video-to-video editing
    const prediction = await replicate.predictions.create({
      model: "luma/modify-video",
      input: {
        prompt: body.prompt,
        video_url: body.videoUrl,
        aspect_ratio: body.aspectRatio || "16:9",
        loop: false,
      },
    });

    console.log("Prediction created:", prediction.id);

    return new Response(JSON.stringify({ ...prediction, creditsRemaining: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in edit-video:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Video editing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
