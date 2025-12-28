import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { GeneratedImage } from "@/hooks/useImageGeneration";
import { GeneratedVideo } from "@/hooks/useVideoGeneration";

const IMAGES_STORAGE_KEY = "afterglow_images";
const VIDEOS_STORAGE_KEY = "afterglow_videos";

interface GalleryContextType {
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  addImage: (image: GeneratedImage) => void;
  addVideo: (video: GeneratedVideo) => void;
  deleteImage: (id: string) => void;
  deleteVideo: (id: string) => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

const loadFromStorage = <T,>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));
    }
  } catch (error) {
    console.error(`Failed to load ${key} from storage:`, error);
  }
  return [];
};

const saveToStorage = <T,>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} to storage:`, error);
  }
};

export const GalleryProvider = ({ children }: { children: ReactNode }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setImages(loadFromStorage<GeneratedImage>(IMAGES_STORAGE_KEY));
    setVideos(loadFromStorage<GeneratedVideo>(VIDEOS_STORAGE_KEY));
    setIsLoaded(true);
  }, []);

  // Save images to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(IMAGES_STORAGE_KEY, images);
    }
  }, [images, isLoaded]);

  // Save videos to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(VIDEOS_STORAGE_KEY, videos);
    }
  }, [videos, isLoaded]);

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
