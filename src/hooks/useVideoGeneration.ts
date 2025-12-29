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

export interface VideoGenerationResult {
  success: boolean;
  video?: GeneratedVideo;
  insufficientCredits?: boolean;
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

  const generateVideo = async (prompt: string, aspectRatio: string = "16:9", duration: number = 5): Promise<VideoGenerationResult> => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description for your video.",
        variant: "destructive",
      });
      return { success: false };
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate videos.",
        variant: "destructive",
      });
      return { success: false };
    }

    // Check rate limit
    const { allowed, resetIn } = checkRateLimit();
    if (!allowed) {
      toast({
        title: "Rate limit reached",
        description: `You've used all your video generations. Try again in ${resetIn} seconds.`,
        variant: "destructive",
      });
      return { success: false };
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
      return { success: false };
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
      
      if (data.error) {
        // Check for insufficient credits error
        if (data.error.toLowerCase().includes("insufficient credits") || 
            data.error.toLowerCase().includes("not enough credits")) {
          toast({
            title: "Insufficient credits",
            description: "You need more credits to generate videos.",
            variant: "destructive",
          });
          return { success: false, insufficientCredits: true };
        }
        throw new Error(data.error);
      }

      setProgress("Generating... This takes 1-2 min");

      const newVideo = await pollForCompletion(data.id, prompt, duration, detectedGenre);

      if (newVideo) {
        toast({
          title: "Video generated!",
          description: detectedGenre ? `Genre: ${detectedGenre}` : "Your video is ready.",
        });
        return { success: true, video: newVideo };
      }

      return { success: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
      
      // Check for insufficient credits in error message
      if (errorMessage.toLowerCase().includes("insufficient credits") ||
          errorMessage.toLowerCase().includes("not enough credits")) {
        toast({
          title: "Insufficient credits",
          description: "You need more credits to generate videos.",
          variant: "destructive",
        });
        return { success: false, insufficientCredits: true };
      }
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false };
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
