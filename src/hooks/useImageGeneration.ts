import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGallery } from "@/contexts/GalleryContext";
import { useAuth } from "@/contexts/AuthContext";

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { images, addImage, deleteImage } = useGallery();
  const { user } = useAuth();
  const { toast } = useToast();

  const generateImage = async (prompt: string) => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description for your image.",
        variant: "destructive",
      });
      return null;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate images.",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const savedImage = await addImage(data.imageUrl, prompt);

      if (savedImage) {
        toast({
          title: "Image generated!",
          description: "Your image has been created successfully.",
        });

        return {
          id: savedImage.id,
          prompt,
          imageUrl: data.imageUrl,
          createdAt: new Date(savedImage.created_at),
        };
      }

      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
      return null;
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
