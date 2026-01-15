import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Maximize, 
  Minimize,
  Volume2, 
  VolumeX,
  Settings,
  Grid3X3,
  Ratio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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

type SafeAreaGuide = 'none' | 'title' | 'action' | 'center';
type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '2.35:1';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuides, setShowGuides] = useState<SafeAreaGuide>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [videoResolution, setVideoResolution] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const video = actualVideoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      onDurationChange(video.duration);
      setVideoResolution({ width: video.videoWidth, height: video.videoHeight });
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

  const toggleMute = () => setIsMuted(!isMuted);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '9:16': 'aspect-[9/16]',
    '2.35:1': 'aspect-[2.35/1]',
  };

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-[#0a0a0a] rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Checkerboard background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #333 25%, transparent 25%),
            linear-gradient(-45deg, #333 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #333 75%),
            linear-gradient(-45deg, transparent 75%, #333 75%)
          `,
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        }}
      />

      {/* Video Container */}
      <div className={cn('relative max-w-full max-h-full', aspectRatioClass[aspectRatio])}>
        {videoUrl ? (
          <>
            <video
              ref={actualVideoRef as React.RefObject<HTMLVideoElement>}
              src={videoUrl}
              className="w-full h-full object-contain"
              onClick={onPlayPause}
            />

            {/* Safe area guides */}
            {showGuides !== 'none' && (
              <div className="absolute inset-0 pointer-events-none">
                {showGuides === 'title' && (
                  <div className="absolute inset-[10%] border border-cyan-500/50 rounded">
                    <span className="absolute -top-5 left-0 text-[9px] text-cyan-500">Title Safe</span>
                  </div>
                )}
                {showGuides === 'action' && (
                  <div className="absolute inset-[5%] border border-amber-500/50 rounded">
                    <span className="absolute -top-5 left-0 text-[9px] text-amber-500">Action Safe</span>
                  </div>
                )}
                {showGuides === 'center' && (
                  <>
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/50 rounded-full" />
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center text-gray-500 gap-6 p-12">
            <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-600 ml-1" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-400">No video loaded</p>
              <p className="text-xs text-gray-600 mt-1">Import a video from the media library</p>
            </div>
          </div>
        )}
      </div>

      {/* Center play button */}
      {videoUrl && !isPlaying && showControls && (
        <button
          onClick={onPlayPause}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Top overlay - Video info */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 z-30 p-3 flex items-center justify-between",
          "bg-gradient-to-b from-black/70 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm">
            <span className="text-[10px] text-gray-300 font-mono">
              {videoResolution.width} × {videoResolution.height}
            </span>
          </div>
          <div className="px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm">
            <span className="text-[10px] text-gray-300 font-mono">30 fps</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Guides dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Safe Area Guides</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowGuides('none')}>
                None {showGuides === 'none' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGuides('title')}>
                Title Safe {showGuides === 'title' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGuides('action')}>
                Action Safe {showGuides === 'action' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGuides('center')}>
                Center Cross {showGuides === 'center' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Aspect ratio dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
              >
                <Ratio className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Aspect Ratio</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['16:9', '4:3', '1:1', '9:16', '2.35:1'] as AspectRatio[]).map(ratio => (
                <DropdownMenuItem key={ratio} onClick={() => setAspectRatio(ratio)}>
                  {ratio} {aspectRatio === ratio && '✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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

          {/* Timecode */}
          <div className="px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm">
            <span className="text-[11px] text-white font-mono">
              {formatTime(currentTime)}
            </span>
          </div>

          <div className="flex-1" />

          {/* Volume */}
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

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            disabled={!videoUrl}
            className="h-8 w-8 text-white hover:bg-white/20"
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
  );
}
