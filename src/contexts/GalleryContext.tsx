import { createContext, useContext, useState, ReactNode } from "react";
import { GeneratedImage } from "@/hooks/useImageGeneration";
import { GeneratedVideo } from "@/hooks/useVideoGeneration";

interface GalleryContextType {
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  addImage: (image: GeneratedImage) => void;
  addVideo: (video: GeneratedVideo) => void;
  deleteImage: (id: string) => void;
  deleteVideo: (id: string) => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);

  const addImage = (image: GeneratedImage) => {
    setImages((prev) => [image, ...prev]);
  };

  const addVideo = (video: GeneratedVideo) => {
    setVideos((prev) => [video, ...prev]);
  };

  const deleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const deleteVideo = (id: string) => {
    setVideos((prev) => prev.filter((vid) => vid.id !== id));
  };

  return (
    <GalleryContext.Provider value={{ images, videos, addImage, addVideo, deleteImage, deleteVideo }}>
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
