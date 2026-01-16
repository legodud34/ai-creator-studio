import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDITS_PER_VOICEOVER = 5;

// Top ElevenLabs voices
const VOICES = {
  roger: "CwhRBWXzGAHq8TQ4Fs17",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  laura: "FGY2WhTYpPnrIDTdsKH5",
  charlie: "IKne3meq5aSn9XLyUdCD",
  george: "JBFqnCBsd6RMkjVDRZzb",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  river: "SAz9YHcvj6GT2YYXdXww",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  will: "bIHbv24MWmeRgasZH58o",
  jessica: "cgSgspJ2msm6clMCkdW9",
  eric: "cjVigY5qzO86Huf0OWal",
  chris: "iP95p4xoKVk53GoZ742B",
  brian: "nPczCjzI2devNBz1zQrb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  bill: "pqHfZKP75CvOlQylNhV4",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const { text, voiceId, stability, similarityBoost, style, speed, userId } = await req.json();

    if (!text) {
      throw new Error('Text is required');
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
      p_amount: CREDITS_PER_VOICEOVER,
      p_transaction_type: "voiceover",
      p_description: `AI Voiceover: ${text.substring(0, 50)}...`,
    });

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      throw new Error("Failed to process credits");
    }

    if (newBalance === -1) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. You need ${CREDITS_PER_VOICEOVER} credits for AI voiceover.` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deducted ${CREDITS_PER_VOICEOVER} credits for voiceover. New balance: ${newBalance}`);

    const selectedVoiceId = voiceId || VOICES.brian;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: similarityBoost ?? 0.75,
            style: style ?? 0.5,
            use_speaker_boost: true,
            speed: speed ?? 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', errorText);
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
    console.error('TTS Error:', error);
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
