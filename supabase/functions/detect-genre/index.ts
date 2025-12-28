import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENRES = [
  "Action",
  "Comedy", 
  "Drama",
  "Horror",
  "Sci-Fi",
  "Nature",
  "Travel",
  "Sports",
  "Tech",
  "Art"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Detecting genre for prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a genre classifier. Given a video prompt, classify it into exactly ONE of these genres: ${GENRES.join(", ")}. 
            
Rules:
- Action: explosions, fights, chases, stunts, intense movement
- Comedy: humor, funny situations, jokes, slapstick
- Drama: emotional, relationships, serious storytelling
- Horror: scary, creepy, dark, monsters, suspense
- Sci-Fi: space, robots, future technology, aliens
- Nature: animals, landscapes, forests, oceans, wildlife
- Travel: cities, landmarks, exploring places, tourism
- Sports: athletics, games, competitions, fitness
- Tech: gadgets, computers, software, digital
- Art: painting, music, dance, creative expression

Respond with ONLY the genre name, nothing else.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", genre: null }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "AI gateway error", genre: null }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const detectedGenre = data.choices?.[0]?.message?.content?.trim();

    // Validate that the detected genre is in our list
    const validGenre = GENRES.find(g => g.toLowerCase() === detectedGenre?.toLowerCase());
    
    console.log("Detected genre:", validGenre || "Unknown");

    return new Response(
      JSON.stringify({ genre: validGenre || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in detect-genre:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Genre detection failed", genre: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
