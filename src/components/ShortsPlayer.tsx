import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, ChevronUp, ChevronDown, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LikeButton } from "@/components/LikeButton";
import { CommentsSection } from "@/components/CommentsSection";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface VideoWithProfile {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  duration_seconds: number | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface ShortsPlayerProps {
  videos: VideoWithProfile[];
  likeCounts: Record<string, number>;
  commentCounts: Record<string, number>;
}

export const ShortsPlayer = ({ videos, likeCounts, commentCounts }: ShortsPlayerProps) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentVideo = videos[currentIndex];

  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [currentIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        goToNext();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        goToPrev();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m") {
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  // Handle scroll/swipe navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let endY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      endY = e.changedTouches[0].clientY;
      const diff = startY - endY;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 50) {
        if (e.deltaY > 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [goToNext, goToPrev]);

  // Auto-play when video changes
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented
        setIsPlaying(false);
      });
    }
  }, [currentIndex, isPlaying]);

  if (!currentVideo) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black flex items-center justify-center"
    >
      {/* Video Container */}
      <div className="relative h-full w-full max-w-[480px] mx-auto">
        <video
          ref={videoRef}
          key={currentVideo.id}
          src={currentVideo.url}
          className="h-full w-full object-cover"
          loop
          playsInline
          muted={isMuted}
          autoPlay
          onClick={togglePlay}
        />

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
            onClick={togglePlay}
          >
            <Play className="w-20 h-20 text-white/80" />
          </div>
        )}

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Bottom gradient with info */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Video info */}
        <div className="absolute bottom-20 left-4 right-16 text-white">
          <Link 
            to={`/profile/${currentVideo.profiles.username}`}
            className="flex items-center gap-2 mb-3"
          >
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={currentVideo.profiles.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentVideo.profiles.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">@{currentVideo.profiles.username}</span>
          </Link>
          <p className="text-sm line-clamp-3 leading-relaxed">{currentVideo.prompt}</p>
        </div>

        {/* Right side actions */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <LikeButton videoId={currentVideo.id} />
            <span className="text-white text-xs">{likeCounts[currentVideo.id] || 0}</span>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">{commentCounts[currentVideo.id] || 0}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle>Comments</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto h-full pb-8">
                <CommentsSection videoId={currentVideo.id} />
              </div>
            </SheetContent>
          </Sheet>

          <button 
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Navigation arrows */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 ${
              currentIndex === 0 ? "opacity-30 pointer-events-none" : ""
            }`}
            onClick={goToPrev}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 ${
              currentIndex === videos.length - 1 ? "opacity-30 pointer-events-none" : ""
            }`}
            onClick={goToNext}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="absolute top-4 left-4 right-4 flex gap-1">
          {videos.map((_, idx) => (
            <div
              key={idx}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                idx === currentIndex ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Video counter */}
        <div className="absolute top-10 left-4 text-white/70 text-sm">
          {currentIndex + 1} / {videos.length}
        </div>
      </div>
    </div>
  );
};
