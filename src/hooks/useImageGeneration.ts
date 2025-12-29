import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGallery } from "@/contexts/GalleryContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRateLimit, RATE_LIMITS } from "@/hooks/useRateLimit";

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

export interface GenerationResult {
  success: boolean;
  image?: GeneratedImage;
  insufficientCredits?: boolean;
}

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { images, addImage, deleteImage } = useGallery();
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkRateLimit, recordAttempt } = useRateLimit("image", RATE_LIMITS.imageGeneration);

  const generateImage = async (prompt: string): Promise<GenerationResult> => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description for your image.",
        variant: "destructive",
      });
      return { success: false };
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate images.",
        variant: "destructive",
      });
      return { success: false };
    }

    // Check rate limit
    const { allowed, remainingAttempts, resetIn } = checkRateLimit();
    if (!allowed) {
      toast({
        title: "Rate limit reached",
        description: `You've used all your generations. Try again in ${resetIn} seconds.`,
        variant: "destructive",
      });
      return { success: false };
    }

    setIsGenerating(true);
    recordAttempt(); // Record the attempt for rate limiting

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt, userId: user.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        // Check for insufficient credits error
        if (data.error.toLowerCase().includes("insufficient credits") || 
            data.error.toLowerCase().includes("not enough credits")) {
          toast({
            title: "Insufficient credits",
            description: "You need more credits to generate images.",
            variant: "destructive",
          });
          return { success: false, insufficientCredits: true };
        }
        throw new Error(data.error);
      }

      const savedImage = await addImage(data.imageUrl, prompt);

      if (savedImage) {
        toast({
          title: "Image generated!",
          description: "Your image has been created successfully.",
        });

        return {
          success: true,
          image: {
            id: savedImage.id,
            prompt,
            imageUrl: data.imageUrl,
            createdAt: new Date(savedImage.created_at),
          },
        };
      }

      return { success: false };
    } catch (error) {
      console.error("Error generating image:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
      
      // Check for insufficient credits in error message
      if (errorMessage.toLowerCase().includes("insufficient credits") ||
          errorMessage.toLowerCase().includes("not enough credits")) {
        toast({
          title: "Insufficient credits",
          description: "You need more credits to generate images.",
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
    }
  };

  return {
    isGenerating,
    images,
    generateImage,
    deleteImage,
  };
};
