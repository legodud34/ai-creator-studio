import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GeneratedVideo {
  id: string;
  prompt: string;
  videoUrl: string;
  createdAt: Date;
}

export const useVideoGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const { toast } = useToast();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const pollForCompletion = useCallback(async (predictionId: string, prompt: string): Promise<GeneratedVideo | null> => {
    const maxAttempts = 120; // 10 minutes max (5s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: { predictionId },
        });

        if (error) throw new Error(error.message);

        console.log("Poll response:", data.status);

        if (data.status === "succeeded") {
          const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
          
          const newVideo: GeneratedVideo = {
            id: predictionId,
            prompt,
            videoUrl,
            createdAt: new Date(),
          };

          return newVideo;
        }

        if (data.status === "failed" || data.status === "canceled") {
          throw new Error(data.error || "Video generation failed");
        }

        setProgress(`Generating video... ${Math.min(Math.round((attempts / 60) * 100), 95)}%`);
        
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error("Polling error:", error);
        throw error;
      }
    }

    throw new Error("Video generation timed out");
  }, []);

  const generateVideo = async (prompt: string, aspectRatio: string = "16:9") => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description for your video.",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    setProgress("Starting video generation...");

    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { prompt, aspectRatio },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const predictionId = data.id;
      console.log("Prediction started:", predictionId);

      setProgress("Video is being generated... This may take 1-2 minutes.");

      const newVideo = await pollForCompletion(predictionId, prompt);

      if (newVideo) {
        setVideos((prev) => [newVideo, ...prev]);
        toast({
          title: "Video generated!",
          description: "Your video is ready to view.",
        });
        return newVideo;
      }

      return null;
    } catch (error) {
      console.error("Error generating video:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate video",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
      setProgress("");
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  };

  const deleteVideo = (id: string) => {
    setVideos((prev) => prev.filter((vid) => vid.id !== id));
  };

  return {
    isGenerating,
    progress,
    videos,
    generateVideo,
    deleteVideo,
  };
};
