import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGallery } from "@/contexts/GalleryContext";

export interface EditedVideo {
  id: string;
  prompt: string;
  videoUrl: string;
  sourceUrl: string;
  createdAt: string;
}

export interface VideoEditResult {
  success: boolean;
  video?: EditedVideo;
  insufficientCredits?: boolean;
}

export const useVideoEditor = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const { addVideo, videos, deleteVideo } = useGallery();

  const pollForCompletion = async (
    predictionId: string,
    prompt: string,
    sourceUrl: string
  ): Promise<EditedVideo | null> => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      setProgress(Math.min(90, (attempts / maxAttempts) * 100));

      try {
        const { data, error } = await supabase.functions.invoke("edit-video", {
          body: { predictionId },
        });

        if (error) {
          console.error("Polling error:", error);
          throw error;
        }

        console.log("Poll response:", data.status);

        if (data.status === "succeeded") {
          setProgress(100);
          const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;

          if (videoUrl && user) {
            await addVideo(videoUrl, prompt, 5, null);
          }

          return {
            id: predictionId,
            prompt,
            videoUrl,
            sourceUrl,
            createdAt: new Date().toISOString(),
          };
        }

        if (data.status === "failed" || data.status === "canceled") {
          throw new Error(data.error || "Video editing failed");
        }

        // Wait 5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (err) {
        console.error("Poll error:", err);
        throw err;
      }
    }

    throw new Error("Video editing timed out");
  };

  const editVideo = async (
    sourceVideoUrl: string,
    prompt: string,
    aspectRatio: string = "16:9"
  ): Promise<VideoEditResult> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to edit videos",
        variant: "destructive",
      });
      return { success: false };
    }

    if (!sourceVideoUrl) {
      toast({
        title: "No video selected",
        description: "Please select a video to edit",
        variant: "destructive",
      });
      return { success: false };
    }

    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe how you want to edit the video",
        variant: "destructive",
      });
      return { success: false };
    }

    setIsEditing(true);
    setProgress(5);

    try {
      toast({
        title: "Starting video edit",
        description: "This may take 2-5 minutes...",
      });

      const { data, error } = await supabase.functions.invoke("edit-video", {
        body: {
          videoUrl: sourceVideoUrl,
          prompt,
          aspectRatio,
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("Insufficient credits")) {
          toast({
            title: "Insufficient credits",
            description: "You need 20 credits to edit a video",
            variant: "destructive",
          });
          return { success: false, insufficientCredits: true };
        }
        throw new Error(data.error);
      }

      setProgress(10);
      console.log("Edit started, prediction ID:", data.id);

      const editedVideo = await pollForCompletion(data.id, prompt, sourceVideoUrl);

      if (editedVideo) {
        toast({
          title: "Video edited successfully!",
          description: "Your edited video has been saved to your gallery",
        });
        return { success: true, video: editedVideo };
      }

      return { success: false };
    } catch (error) {
      console.error("Video edit error:", error);
      toast({
        title: "Edit failed",
        description: error instanceof Error ? error.message : "Failed to edit video",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsEditing(false);
      setProgress(0);
    }
  };

  return {
    isEditing,
    progress,
    editVideo,
    videos,
    deleteVideo,
  };
};
