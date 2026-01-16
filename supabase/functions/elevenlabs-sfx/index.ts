import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDITS_PER_SFX = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const { prompt, duration, userId } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase admin client for credit deduction
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Deduct credits
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: CREDITS_PER_SFX,
      p_transaction_type: "sfx",
      p_description: `AI Sound Effect: ${prompt.substring(0, 50)}...`,
    });

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      throw new Error("Failed to process credits");
    }

    if (newBalance === -1) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. You need ${CREDITS_PER_SFX} credits for AI sound effects.` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deducted ${CREDITS_PER_SFX} credits for SFX. New balance: ${newBalance}`);

    // Duration must be between 0.5 and 22 seconds
    const validDuration = Math.min(22, Math.max(0.5, duration || 5));

    const response = await fetch(
      'https://api.elevenlabs.io/v1/sound-generation',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: validDuration,
          prompt_influence: 0.3,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs SFX error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'X-Credits-Remaining': String(newBalance),
      },
    });
  } catch (error) {
    console.error('SFX Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
