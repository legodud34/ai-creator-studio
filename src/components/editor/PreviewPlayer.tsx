import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Maximize, Minimize, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface PreviewPlayerProps {
  videoUrl?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function PreviewPlayer({
  videoUrl,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  onSeek,
  videoRef,
}: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const actualVideoRef = videoRef || localVideoRef;
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

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
    const video = actualVideoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, actualVideoRef]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleScrubberChange = (values: number[]) => {
    const newTime = (values[0] / 100) * duration;
    onSeek(newTime);
  };

  const scrubberValue = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full flex flex-col bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(true)}
    >
      {/* Video Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {videoUrl ? (
          <>
            <video
              ref={actualVideoRef as React.RefObject<HTMLVideoElement>}
              src={videoUrl}
              className="w-full h-full object-contain"
              onClick={onPlayPause}
            />

            {/* Center play button when paused */}
            {!isPlaying && (
              <button
                onClick={onPlayPause}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 transition-opacity hover:bg-black/20"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 shadow-2xl">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </button>
            )}

            {/* Vignette effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-black/10" />
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

      {/* Transport Controls Bar - iMovie style */}
      <div className={cn(
        'h-14 bg-gradient-to-t from-[#1a1a1a] to-[#252525] border-t border-black/50 flex flex-col justify-center px-4 transition-opacity',
        showControls ? 'opacity-100' : 'opacity-0'
      )}>
        {/* Scrubber */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-mono text-gray-400 w-16">{formatTime(currentTime)}</span>
          <Slider
            value={[scrubberValue]}
            onValueChange={handleScrubberChange}
            max={100}
            step={0.1}
            className="flex-1"
            disabled={!videoUrl}
          />
          <span className="text-[10px] font-mono text-gray-400 w-16 text-right">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left: Volume */}
          <div className="flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="h-7 w-7 text-gray-400 hover:text-white"
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
              className="w-20"
            />
          </div>

          {/* Center: Transport */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-white hover:text-white bg-white/10 hover:bg-white/20 rounded-full"
              onClick={onPlayPause}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Fullscreen */}
          <div className="flex items-center gap-2 w-32 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-7 w-7 text-gray-400 hover:text-white"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}