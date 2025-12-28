import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GalleryImage {
  id: string;
  prompt: string;
  url: string;
  is_public: boolean;
  created_at: string;
}

export interface GalleryVideo {
  id: string;
  prompt: string;
  url: string;
  is_public: boolean;
  created_at: string;
  duration_seconds?: number | null;
}

interface GalleryContextType {
  images: GalleryImage[];
  videos: GalleryVideo[];
  isLoading: boolean;
  addImage: (url: string, prompt: string) => Promise<GalleryImage | null>;
  addVideo: (url: string, prompt: string, durationSeconds?: number) => Promise<GalleryVideo | null>;
  deleteImage: (id: string) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  toggleImageVisibility: (id: string) => Promise<void>;
  toggleVideoVisibility: (id: string) => Promise<void>;
  refreshGallery: () => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGallery = async () => {
    if (!user) {
      setImages([]);
      setVideos([]);
      return;
    }

    setIsLoading(true);

    const [imagesResult, videosResult] = await Promise.all([
      supabase
        .from("images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("videos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    setImages(imagesResult.data || []);
    setVideos(videosResult.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGallery();
  }, [user]);

  const refreshGallery = async () => {
    await fetchGallery();
  };

  const addImage = async (url: string, prompt: string): Promise<GalleryImage | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("images")
      .insert({
        user_id: user.id,
        url,
        prompt,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding image:", error);
      return null;
    }

    setImages((prev) => [data, ...prev]);
    return data;
  };

  const addVideo = async (url: string, prompt: string, durationSeconds?: number): Promise<GalleryVideo | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        url,
        prompt,
        is_public: false,
        duration_seconds: durationSeconds || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding video:", error);
      return null;
    }

    setVideos((prev) => [data, ...prev]);
    return data;
  };

  const deleteImage = async (id: string) => {
    const { error } = await supabase.from("images").delete().eq("id", id);

    if (!error) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const deleteVideo = async (id: string) => {
    const { error } = await supabase.from("videos").delete().eq("id", id);

    if (!error) {
      setVideos((prev) => prev.filter((vid) => vid.id !== id));
    }
  };

  const toggleImageVisibility = async (id: string) => {
    const image = images.find((img) => img.id === id);
    if (!image) return;

    const { error } = await supabase
      .from("images")
      .update({ is_public: !image.is_public })
      .eq("id", id);

    if (!error) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, is_public: !img.is_public } : img
        )
      );
    }
  };

  const toggleVideoVisibility = async (id: string) => {
    const video = videos.find((vid) => vid.id === id);
    if (!video) return;

    const { error } = await supabase
      .from("videos")
      .update({ is_public: !video.is_public })
      .eq("id", id);

    if (!error) {
      setVideos((prev) =>
        prev.map((vid) =>
          vid.id === id ? { ...vid, is_public: !vid.is_public } : vid
        )
      );
    }
  };

  return (
    <GalleryContext.Provider
      value={{
        images,
        videos,
        isLoading,
        addImage,
        addVideo,
        deleteImage,
        deleteVideo,
        toggleImageVisibility,
        toggleVideoVisibility,
        refreshGallery,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error("useGallery must be used within a GalleryProvider");
  }
  return context;
};
