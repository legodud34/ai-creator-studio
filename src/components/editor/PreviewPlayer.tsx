import { useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-black rounded-lg overflow-hidden"
    >
      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {videoUrl ? (
          <video
            ref={actualVideoRef as React.RefObject<HTMLVideoElement>}
            src={videoUrl}
            className="max-w-full max-h-full object-contain"
            onClick={onPlayPause}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center">
              <Play className="w-12 h-12" />
            </div>
            <p className="text-sm">Upload a video to get started</p>
          </div>
        )}

        {/* Play overlay */}
        {videoUrl && !isPlaying && (
          <button
            onClick={onPlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-black ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 bg-card/50 border-t border-border/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            disabled={!videoUrl}
            className="h-8 w-8"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <span className="text-xs text-muted-foreground font-mono min-w-[80px]">
            {formatTime(currentTime)}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            disabled={!videoUrl}
            className="h-8 w-8 ml-auto"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
