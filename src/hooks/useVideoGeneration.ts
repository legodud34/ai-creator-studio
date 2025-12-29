import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGallery } from "@/contexts/GalleryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRateLimit, RATE_LIMITS } from "@/hooks/useRateLimit";

export interface GeneratedVideo {
  id: string;
  prompt: string;
  videoUrl: string;
  createdAt: Date;
}

export const useVideoGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const { videos, addVideo, deleteVideo } = useGallery();
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkRateLimit, recordAttempt } = useRateLimit("video", RATE_LIMITS.videoGeneration);

  const detectGenre = async (prompt: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("detect-genre", {
        body: { prompt },
      });
      if (error || !data?.genre) return null;
      return data.genre;
    } catch {
      return null;
    }
  };

  const pollForCompletion = useCallback(async (predictionId: string, prompt: string, durationSeconds: number, genre: string | null): Promise<GeneratedVideo | null> => {
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: { predictionId },
        });

        if (error) throw new Error(error.message);

        if (data.status === "succeeded") {
          const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
          
          const savedVideo = await addVideo(videoUrl, prompt, durationSeconds, genre);
          
          if (savedVideo) {
            return {
              id: savedVideo.id,
              prompt,
              videoUrl,
              createdAt: new Date(savedVideo.created_at),
            };
          }
          return null;
        }

        if (data.status === "failed" || data.status === "canceled") {
          throw new Error(data.error || "Video generation failed");
        }

        setProgress(`Generating... ${Math.min(Math.round((attempts / 60) * 100), 95)}%`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        throw error;
      }
    }

    throw new Error("Video generation timed out");
  }, [addVideo]);

  const moderatePrompt = async (prompt: string): Promise<{ allowed: boolean; reason: string; category: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("moderate-content", {
        body: { prompt, contentType: "video" },
      });
      if (error) {
        console.error("Moderation error:", error);
        return { allowed: true, reason: "", category: "" }; // Allow on error
      }
      return data;
    } catch {
      return { allowed: true, reason: "", category: "" }; // Allow on error
    }
  };

  const generateVideo = async (prompt: string, aspectRatio: string = "16:9", duration: number = 5) => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description for your video.",
        variant: "destructive",
      });
      return null;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate videos.",
        variant: "destructive",
      });
      return null;
    }

    // Check rate limit
    const { allowed, resetIn } = checkRateLimit();
    if (!allowed) {
      toast({
        title: "Rate limit reached",
        description: `You've used all your video generations. Try again in ${resetIn} seconds.`,
        variant: "destructive",
      });
      return null;
    }

    // Moderate prompt before generation
    setProgress("Checking content...");
    const moderation = await moderatePrompt(prompt);
    if (!moderation.allowed) {
      toast({
        title: "Content blocked",
        description: moderation.reason || "This prompt contains inappropriate content.",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    setProgress("Detecting genre...");
    recordAttempt(); // Record the attempt for rate limiting

    try {
      // Auto-detect genre from prompt
      const detectedGenre = await detectGenre(prompt);
      
      setProgress("Starting generation...");
      
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { prompt, aspectRatio, duration, userId: user.id },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setProgress("Generating... This takes 1-2 min");

      const newVideo = await pollForCompletion(data.id, prompt, duration, detectedGenre);

      if (newVideo) {
        toast({
          title: "Video generated!",
          description: detectedGenre ? `Genre: ${detectedGenre}` : "Your video is ready.",
        });
        return newVideo;
      }

      return null;
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate video",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  return {
    isGenerating,
    progress,
    videos,
    generateVideo,
    deleteVideo,
  };
};
