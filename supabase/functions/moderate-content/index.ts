import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a content moderation AI. Your job is to analyze text prompts and determine if they contain inappropriate content that should be blocked.

BLOCK the following content types:
- Extreme violence, gore, torture, mutilation
- Sexual or explicit adult content (nudity, pornography, sexual acts)
- Hate speech, discrimination, slurs targeting protected groups
- Child exploitation or abuse
- Self-harm or suicide encouragement
- Terrorism or extremist content
- Illegal activities (drug manufacturing, weapons creation)

ALLOW the following:
- Light violence (action scenes, mild fighting, superhero battles)
- Minor blood or injury (sports injuries, small cuts, bruises)
- Historical or educational violence context
- Fantasy/sci-fi combat
- Medical or first aid scenarios

Respond with a JSON object:
{
  "allowed": boolean,
  "reason": string (brief explanation if blocked, empty if allowed),
  "category": string (the violation category if blocked, empty if allowed)
}

Be strict on truly harmful content but reasonable for creative/entertainment purposes.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, contentType = 'video' } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Moderation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Moderating ${contentType} prompt: "${prompt.substring(0, 100)}..."`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this ${contentType} prompt for inappropriate content:\n\n"${prompt}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderation_result",
              description: "Return the moderation decision",
              parameters: {
                type: "object",
                properties: {
                  allowed: { type: "boolean", description: "Whether the content is allowed" },
                  reason: { type: "string", description: "Explanation if blocked, empty if allowed" },
                  category: { type: "string", description: "Violation category if blocked, empty if allowed" }
                },
                required: ["allowed", "reason", "category"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "moderation_result" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limited by AI gateway');
        return new Response(
          JSON.stringify({ error: 'Moderation service busy, please try again' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('AI credits exhausted');
        return new Response(
          JSON.stringify({ error: 'Moderation service unavailable' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to analyze content');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in response:', JSON.stringify(data));
      // Default to allowing if AI response is malformed
      return new Response(
        JSON.stringify({ allowed: true, reason: '', category: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Moderation result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in moderate-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Moderation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
