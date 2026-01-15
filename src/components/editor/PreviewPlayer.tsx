import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PreviewPlayerProps {
  videoUrl?: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayPause: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function PreviewPlayer({
  videoUrl,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  videoRef,
}: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const actualVideoRef = videoRef || localVideoRef;
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = actualVideoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      onDurationChange(video.duration);
    };

    const handleEnded = () => {
      onPlayPause();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [actualVideoRef, onTimeUpdate, onDurationChange, onPlayPause]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-black rounded-xl overflow-hidden group shadow-2xl"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {videoUrl ? (
        <>
          <video
            ref={actualVideoRef as React.RefObject<HTMLVideoElement>}
            src={videoUrl}
            className="w-full h-full object-contain"
            onClick={onPlayPause}
          />

          {/* Center play button on pause */}
          {!isPlaying && showControls && (
            <button
              onClick={onPlayPause}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 transition-opacity"
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 shadow-2xl">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </button>
          )}

          {/* Fullscreen button */}
          <div 
            className={cn(
              "absolute bottom-4 right-4 transition-opacity",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-10 w-10 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-lg"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Subtle vignette effect */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-black/10 rounded-xl" />
        </>
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center text-gray-500 gap-6 p-12">
          {/* Empty state - iMovie style */}
          <div className="relative">
            <div className="w-32 h-20 rounded-xl bg-gradient-to-br from-[#2c2c2e] to-[#1c1c1e] border border-[#3a3a3c] flex items-center justify-center shadow-xl">
              <div className="w-16 h-10 rounded bg-[#3a3a3c]/50 flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-600 ml-0.5" />
              </div>
            </div>
            {/* Film strip decorations */}
            <div className="absolute -left-2 top-0 bottom-0 w-1.5 flex flex-col justify-around">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-2 w-1.5 bg-[#3a3a3c] rounded-sm" />
              ))}
            </div>
            <div className="absolute -right-2 top-0 bottom-0 w-1.5 flex flex-col justify-around">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-2 w-1.5 bg-[#3a3a3c] rounded-sm" />
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-gray-400">No Media</p>
            <p className="text-sm text-gray-600 mt-1">
              Import video from the media browser
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
