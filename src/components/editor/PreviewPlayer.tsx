import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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
    if (actualVideoRef.current) {
      actualVideoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, actualVideoRef]);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-[#0a0a0a] rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Checkerboard background for transparency */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #333 25%, transparent 25%),
            linear-gradient(-45deg, #333 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #333 75%),
            linear-gradient(-45deg, transparent 75%, #333 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      />
      
      {/* Video */}
      {videoUrl ? (
        <video
          ref={actualVideoRef as React.RefObject<HTMLVideoElement>}
          src={videoUrl}
          className="relative z-10 max-w-full max-h-full object-contain"
          onClick={onPlayPause}
        />
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center text-gray-500 gap-6">
          <div className="w-24 h-24 rounded-2xl bg-[#252525] border border-[#3a3a3a] flex items-center justify-center">
            <Play className="w-10 h-10 text-gray-600 ml-1" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-400">No video loaded</p>
            <p className="text-xs text-gray-600 mt-1">Upload a video from the media library</p>
          </div>
        </div>
      )}

      {/* Center play button overlay */}
      {videoUrl && !isPlaying && (
        <button
          onClick={onPlayPause}
          className={cn(
            "absolute inset-0 z-20 flex items-center justify-center",
            "bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          )}
        >
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Bottom controls */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 z-30 p-3",
          "bg-gradient-to-t from-black/80 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            disabled={!videoUrl}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={([val]) => {
                setVolume(val / 100);
                if (val > 0) setIsMuted(false);
              }}
              max={100}
              step={1}
              className="w-20"
            />
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            disabled={!videoUrl}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video info overlay */}
      {videoUrl && (
        <div className="absolute top-3 left-3 z-20">
          <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
            <span className="text-[10px] text-gray-300 font-mono">1920 × 1080</span>
          </div>
        </div>
      )}
    </div>
  );
}
