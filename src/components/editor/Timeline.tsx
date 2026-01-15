import { useRef, useCallback, useState, useEffect } from 'react';
import { 
  Trash2, 
  Volume2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  GripVertical,
  Plus,
  Minus,
  Magnet,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AudioClip } from '@/hooks/useEditorState';

interface TimelineProps {
  duration: number;
  currentTime: number;
  audioTracks: AudioClip[];
  selectedClipId: string | null;
  zoom: number;
  isPlaying?: boolean;
  snapping?: boolean;
  onSeek: (time: number) => void;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
  onSnappingChange?: (snapping: boolean) => void;
}

const TRACK_COLORS = {
  voiceover: { bg: 'bg-cyan-500/90', border: 'border-cyan-400', glow: 'shadow-cyan-500/20', gradient: 'from-cyan-600 to-cyan-500' },
  sfx: { bg: 'bg-amber-500/90', border: 'border-amber-400', glow: 'shadow-amber-500/20', gradient: 'from-amber-600 to-amber-500' },
  music: { bg: 'bg-violet-500/90', border: 'border-violet-400', glow: 'shadow-violet-500/20', gradient: 'from-violet-600 to-violet-500' },
};

const TRACK_LABELS = {
  voiceover: { name: 'V1', full: 'Voiceover', icon: '🎙️' },
  sfx: { name: 'A1', full: 'Audio FX', icon: '🔊' },
  music: { name: 'M1', full: 'Music', icon: '🎵' },
};

interface TrackState {
  muted: boolean;
  locked: boolean;
  visible: boolean;
  solo: boolean;
}

export function Timeline({
  duration,
  currentTime,
  audioTracks,
  selectedClipId,
  zoom,
  isPlaying = false,
  snapping = true,
  onSeek,
  onSelectClip,
  onUpdateClip,
  onRemoveClip,
  onZoomChange,
  onSnappingChange,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = 60 * zoom;
  
  const [trackStates, setTrackStates] = useState<Record<string, TrackState>>({
    voiceover: { muted: false, locked: false, visible: true, solo: false },
    sfx: { muted: false, locked: false, visible: true, solo: false },
    music: { muted: false, locked: false, visible: true, solo: false },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  // Auto-scroll to playhead during playback
  useEffect(() => {
    if (isPlaying && timelineRef.current) {
      const container = timelineRef.current;
      const playheadPosition = currentTime * pixelsPerSecond;
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;

      if (playheadPosition > scrollLeft + containerWidth - 100) {
        container.scrollLeft = playheadPosition - 100;
      }
    }
  }, [currentTime, isPlaying, pixelsPerSecond]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-clip]')) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, duration)));
    onSelectClip(null);
  }, [duration, onSeek, pixelsPerSecond, onSelectClip, isDragging]);

  const handleClipDragStart = (e: React.MouseEvent, clip: AudioClip) => {
    if (trackStates[clip.type]?.locked) return;
    e.preventDefault();
    setIsDragging(true);
    setDragClipId(clip.id);
    setDragStartX(e.clientX);
    setDragStartTime(clip.startTime);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragClipId) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerSecond;
    let newStartTime = Math.max(0, dragStartTime + deltaTime);
    
    // Snap to other clips or markers
    if (snapping) {
      const snapThreshold = 10 / pixelsPerSecond;
      audioTracks.forEach(clip => {
        if (clip.id === dragClipId) return;
        const clipEnd = clip.startTime + clip.duration;
        
        if (Math.abs(newStartTime - clip.startTime) < snapThreshold) {
          newStartTime = clip.startTime;
        } else if (Math.abs(newStartTime - clipEnd) < snapThreshold) {
          newStartTime = clipEnd;
        }
      });
    }
    
    onUpdateClip(dragClipId, { startTime: newStartTime });
  }, [isDragging, dragClipId, dragStartX, dragStartTime, pixelsPerSecond, snapping, audioTracks, onUpdateClip]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragClipId(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleTrackState = (type: string, key: keyof TrackState) => {
    setTrackStates(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: !prev[type][key] }
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);
  const playheadPosition = currentTime * pixelsPerSecond;

  const trackTypes: Array<'voiceover' | 'sfx' | 'music'> = ['voiceover', 'sfx', 'music'];

  // Generate time markers
  const markerInterval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : 10;
  const subMarkerCount = zoom >= 2 ? 10 : 5;
  const markers: number[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += markerInterval) {
    markers.push(i);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full bg-[#1a1a1a] overflow-hidden">
        {/* Timeline Header */}
        <div className="h-8 px-2 border-b border-[#3a3a3a] bg-[#222] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[10px] font-medium text-gray-400">Timeline</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Snapping toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSnappingChange?.(!snapping)}
                  className={cn(
                    'h-6 w-6',
                    snapping ? 'bg-primary/20 text-primary' : 'text-gray-500'
                  )}
                >
                  <Magnet className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snapping {snapping ? 'On' : 'Off'}</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-[#3a3a3a] mx-1" />

            {/* Zoom controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoomChange?.(Math.max(0.25, zoom - 0.25))}
              className="h-6 w-6 text-gray-500 hover:text-white"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-[9px] text-gray-500 w-8 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoomChange?.(Math.min(4, zoom + 0.25))}
              className="h-6 w-6 text-gray-500 hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Track Labels */}
          <div className="w-36 flex-shrink-0 border-r border-[#3a3a3a] bg-[#1e1e1e]">
            {/* Time ruler spacer */}
            <div className="h-6 border-b border-[#3a3a3a] bg-[#222]" />
            
            {trackTypes.map(type => {
              const state = trackStates[type];
              const colors = TRACK_COLORS[type];
              
              return (
                <div
                  key={type}
                  className={cn(
                    'h-14 flex items-center px-2 border-b border-[#2a2a2a] hover:bg-[#252525] transition-colors group',
                    state.muted && 'opacity-50'
                  )}
                >
                  <GripVertical className="h-3 w-3 text-gray-700 mr-1 opacity-0 group-hover:opacity-100 cursor-grab" />
                  
                  <div className={cn('w-1.5 h-8 rounded-full mr-2', colors.bg)} />
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-gray-200 block">
                      {TRACK_LABELS[type].icon} {TRACK_LABELS[type].name}
                    </span>
                    <span className="text-[9px] text-gray-600">
                      {TRACK_LABELS[type].full}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => toggleTrackState(type, 'muted')}
                          className={cn(
                            'p-1 rounded transition-colors',
                            state.muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-[#3a3a3a] text-gray-600'
                          )}
                        >
                          {state.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Mute</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => toggleTrackState(type, 'locked')}
                          className={cn(
                            'p-1 rounded transition-colors',
                            state.locked ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-[#3a3a3a] text-gray-600'
                          )}
                        >
                          {state.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Lock</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable Timeline */}
          <div 
            ref={timelineRef}
            className={cn(
              'flex-1 overflow-x-auto overflow-y-hidden relative',
              isDragging && 'cursor-grabbing'
            )}
            onClick={handleTimelineClick}
          >
            <div style={{ width: timelineWidth, minWidth: '100%' }} className="relative">
              {/* Time Ruler */}
              <div className="h-6 border-b border-[#3a3a3a] relative bg-[#1e1e1e] sticky top-0 z-10">
                {markers.map(time => (
                  <div
                    key={time}
                    className="absolute top-0 h-full flex flex-col justify-end"
                    style={{ left: time * pixelsPerSecond }}
                  >
                    <div className="h-3 w-px bg-[#555]" />
                    <span className="text-[9px] text-gray-500 ml-1 font-mono">
                      {formatTimeShort(time)}
                    </span>
                  </div>
                ))}
                
                {/* Sub-markers */}
                {markers.map(time => (
                  Array.from({ length: subMarkerCount - 1 }, (_, i) => {
                    const subTime = time + ((i + 1) * markerInterval / subMarkerCount);
                    if (subTime > duration) return null;
                    return (
                      <div
                        key={`${time}-${i}`}
                        className="absolute top-0 h-full flex flex-col justify-end"
                        style={{ left: subTime * pixelsPerSecond }}
                      >
                        <div className="h-1.5 w-px bg-[#3a3a3a]" />
                      </div>
                    );
                  })
                ))}
              </div>

              {/* Audio Tracks */}
              {trackTypes.map(type => {
                const clips = audioTracks.filter(c => c.type === type);
                const colors = TRACK_COLORS[type];
                const state = trackStates[type];
                
                return (
                  <div
                    key={type}
                    className={cn(
                      'h-14 border-b border-[#2a2a2a] relative',
                      state.locked && 'pointer-events-none opacity-70'
                    )}
                    style={{
                      background: 'repeating-linear-gradient(90deg, #1a1a1a, #1a1a1a 59px, #222 59px, #222 60px)',
                    }}
                  >
                    {clips.map(clip => (
                      <div
                        key={clip.id}
                        data-clip
                        className={cn(
                          'absolute top-1 h-12 rounded-md cursor-pointer transition-all',
                          'bg-gradient-to-b',
                          colors.gradient,
                          'border border-white/10',
                          selectedClipId === clip.id 
                            ? 'ring-2 ring-white/80 shadow-lg' 
                            : 'hover:brightness-110',
                          dragClipId === clip.id && 'opacity-80'
                        )}
                        style={{
                          left: clip.startTime * pixelsPerSecond,
                          width: Math.max(clip.duration * pixelsPerSecond, 40),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onMouseDown={(e) => handleClipDragStart(e, clip)}
                      >
                        {/* Waveform visualization */}
                        <div className="absolute inset-0 overflow-hidden rounded-md opacity-40">
                          <svg className="w-full h-full" preserveAspectRatio="none">
                            {Array.from({ length: Math.max(30, Math.floor(clip.duration * 10)) }, (_, i) => {
                              const x = (i / Math.max(30, clip.duration * 10)) * 100;
                              const height = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
                              return (
                                <rect
                                  key={i}
                                  x={`${x}%`}
                                  y={`${50 - height / 2}%`}
                                  width="2"
                                  height={`${height}%`}
                                  fill="white"
                                  rx="1"
                                />
                              );
                            })}
                          </svg>
                        </div>
                        
                        <div className="relative px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
                          <span className="text-[10px] font-semibold text-white truncate drop-shadow-md">
                            {clip.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Volume2 className="h-2.5 w-2.5 text-white/70" />
                            <span className="text-[9px] text-white/70 font-mono">
                              {formatTimeShort(clip.duration)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Resize handles */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-l-md group">
                          <div className="absolute inset-y-2 left-0.5 w-0.5 bg-white/0 group-hover:bg-white/50 rounded" />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-r-md group">
                          <div className="absolute inset-y-2 right-0.5 w-0.5 bg-white/0 group-hover:bg-white/50 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 w-0.5 bg-red-500 z-20 pointer-events-none shadow-lg shadow-red-500/30"
                style={{ 
                  left: playheadPosition,
                  height: '100%',
                }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-red-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Clip Info Bar */}
        {selectedClipId && (
          <div className="h-10 px-3 border-t border-[#3a3a3a] bg-[#222] flex items-center">
            {(() => {
              const clip = audioTracks.find(c => c.id === selectedClipId);
              if (!clip) return null;
              const colors = TRACK_COLORS[clip.type];
              
              return (
                <div className="flex items-center gap-3 w-full">
                  <div className={cn('w-1.5 h-5 rounded-full', colors.bg)} />
                  <span className="text-[11px] font-medium text-gray-200 truncate max-w-[150px]">
                    {clip.name}
                  </span>
                  
                  <div className="h-4 w-px bg-[#3a3a3a]" />
                  
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3 w-3 text-gray-500" />
                    <Slider
                      value={[clip.volume * 100]}
                      onValueChange={([value]) => onUpdateClip(clip.id, { volume: value / 100 })}
                      max={100}
                      step={1}
                      className="w-20"
                    />
                    <span className="text-[9px] text-gray-500 w-6 font-mono">
                      {Math.round(clip.volume * 100)}%
                    </span>
                  </div>
                  
                  <div className="h-4 w-px bg-[#3a3a3a]" />
                  
                  <span className="text-[9px] text-gray-500 font-mono">
                    In: {formatTime(clip.startTime)}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">
                    Out: {formatTime(clip.startTime + clip.duration)}
                  </span>
                  
                  <div className="flex-1" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveClip(clip.id)}
                    className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Missing icon
function VolumeX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
