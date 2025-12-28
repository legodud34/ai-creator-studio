import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGallery } from "@/contexts/GalleryContext";
import { useAuth } from "@/contexts/AuthContext";

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

  const pollForCompletion = useCallback(async (predictionId: string, prompt: string, durationSeconds: number): Promise<GeneratedVideo | null> => {
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
          
          const savedVideo = await addVideo(videoUrl, prompt, durationSeconds);
          
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

    setIsGenerating(true);
    setProgress("Starting...");

    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { prompt, aspectRatio, duration },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setProgress("Generating... This takes 1-2 min");

      const newVideo = await pollForCompletion(data.id, prompt, duration);

      if (newVideo) {
        toast({
          title: "Video generated!",
          description: "Your video is ready.",
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
