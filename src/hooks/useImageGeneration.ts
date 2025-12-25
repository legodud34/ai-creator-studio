import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGallery } from "@/contexts/GalleryContext";

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { images, addImage, deleteImage } = useGallery();
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

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        prompt,
        imageUrl: data.imageUrl,
        createdAt: new Date(),
      };

      addImage(newImage);

      toast({
        title: "Image generated!",
        description: "Your image has been created successfully.",
      });

      return newImage;
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
