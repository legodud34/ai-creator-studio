import { useRef, useCallback, useState, useEffect } from 'react';
import { Trash2, Volume2, Plus, Minus, Magnet, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AudioClip, VideoClip, SelectionRange } from '@/hooks/useEditorState';

interface TimelineProps {
  duration: number;
  currentTime: number;
  audioTracks: AudioClip[];
  videoTracks: VideoClip[];
  selectedClipId: string | null;
  zoom: number;
  isPlaying?: boolean;
  selection?: SelectionRange;
  onSeek: (time: number) => void;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onUpdateVideoClip: (id: string, updates: Partial<VideoClip>) => void;
  onRemoveClip: (id: string) => void;
  onRemoveVideoClip: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
}

const TRACK_COLORS = {
  video: { bg: 'bg-blue-500', light: 'bg-blue-400', gradient: 'from-blue-600 to-blue-700' },
  voiceover: { bg: 'bg-cyan-500', light: 'bg-cyan-400', gradient: 'from-cyan-500 to-cyan-600' },
  sfx: { bg: 'bg-amber-500', light: 'bg-amber-400', gradient: 'from-amber-500 to-amber-600' },
  music: { bg: 'bg-violet-500', light: 'bg-violet-400', gradient: 'from-violet-500 to-violet-600' },
};

const TRACK_LABELS = {
  video: { name: 'Video', icon: '🎬' },
  voiceover: { name: 'Voice', icon: '🎙️' },
  sfx: { name: 'SFX', icon: '🔊' },
  music: { name: 'Music', icon: '🎵' },
};

export function Timeline({
  duration,
  currentTime,
  audioTracks,
  videoTracks,
  selectedClipId,
  zoom,
  isPlaying = false,
  selection,
  onSeek,
  onSelectClip,
  onUpdateClip,
  onUpdateVideoClip,
  onRemoveClip,
  onRemoveVideoClip,
  onZoomChange,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = 80 * zoom;
  const [snapping, setSnapping] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragClipType, setDragClipType] = useState<'audio' | 'video'>('audio');
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  // Auto-scroll to playhead
  useEffect(() => {
    if (isPlaying && timelineRef.current) {
      const container = timelineRef.current;
      const playheadPosition = currentTime * pixelsPerSecond;
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;

      if (playheadPosition > scrollLeft + containerWidth - 150) {
        container.scrollLeft = playheadPosition - 150;
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

  const handleClipDragStart = (e: React.MouseEvent, clipId: string, startTime: number, clipType: 'audio' | 'video') => {
    e.preventDefault();
    setIsDragging(true);
    setDragClipId(clipId);
    setDragClipType(clipType);
    setDragStartX(e.clientX);
    setDragStartTime(startTime);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragClipId) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerSecond;
    let newStartTime = Math.max(0, dragStartTime + deltaTime);
    
    if (snapping) {
      const snapThreshold = 10 / pixelsPerSecond;
      // Snap to audio clips
      audioTracks.forEach(clip => {
        if (clip.id === dragClipId) return;
        const clipEnd = clip.startTime + clip.duration;
        
        if (Math.abs(newStartTime - clip.startTime) < snapThreshold) {
          newStartTime = clip.startTime;
        } else if (Math.abs(newStartTime - clipEnd) < snapThreshold) {
          newStartTime = clipEnd;
        }
      });
      // Snap to video clips
      videoTracks.forEach(clip => {
        if (clip.id === dragClipId) return;
        const clipEnd = clip.startTime + clip.duration;
        
        if (Math.abs(newStartTime - clip.startTime) < snapThreshold) {
          newStartTime = clip.startTime;
        } else if (Math.abs(newStartTime - clipEnd) < snapThreshold) {
          newStartTime = clipEnd;
        }
      });
      // Snap to selection points
      if (selection?.inPoint !== null) {
        if (Math.abs(newStartTime - selection.inPoint) < snapThreshold) {
          newStartTime = selection.inPoint;
        }
      }
      if (selection?.outPoint !== null) {
        if (Math.abs(newStartTime - selection.outPoint) < snapThreshold) {
          newStartTime = selection.outPoint;
        }
      }
    }
    
    if (dragClipType === 'video') {
      onUpdateVideoClip(dragClipId, { startTime: newStartTime });
    } else {
      onUpdateClip(dragClipId, { startTime: newStartTime });
    }
  }, [isDragging, dragClipId, dragClipType, dragStartX, dragStartTime, pixelsPerSecond, snapping, audioTracks, videoTracks, selection, onUpdateClip, onUpdateVideoClip]);

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

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);
  const playheadPosition = currentTime * pixelsPerSecond;

  const audioTrackTypes: Array<'voiceover' | 'sfx' | 'music'> = ['voiceover', 'sfx', 'music'];

  // Time markers
  const markerInterval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : 10;
  const markers: number[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += markerInterval) {
    markers.push(i);
  }

  // Selection overlay calculations
  const hasSelection = selection?.inPoint !== null && selection?.outPoint !== null;
  const selectionStart = hasSelection ? Math.min(selection!.inPoint!, selection!.outPoint!) : 0;
  const selectionEnd = hasSelection ? Math.max(selection!.inPoint!, selection!.outPoint!) : 0;
  const selectionLeft = selectionStart * pixelsPerSecond;
  const selectionWidth = (selectionEnd - selectionStart) * pixelsPerSecond;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full overflow-hidden bg-[#1c1c1e]">
        {/* Timeline Header */}
        <div className="h-10 px-4 border-b border-[#3a3a3c]/50 bg-[#2c2c2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">Timeline</span>
            {hasSelection && (
              <span className="text-[10px] text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                Selection: {(selectionEnd - selectionStart).toFixed(1)}s
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Snapping */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSnapping(!snapping)}
                  className={cn(
                    'h-7 px-2 rounded-lg text-xs',
                    snapping ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-white'
                  )}
                >
                  <Magnet className="h-3.5 w-3.5 mr-1" />
                  Snap
                </Button>
              </TooltipTrigger>
              <TooltipContent>Magnetic snapping</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-[#3a3a3c]" />

            {/* Zoom */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoomChange?.(Math.max(0.25, zoom - 0.25))}
              className="h-7 w-7 text-gray-400 hover:text-white rounded-lg"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] text-gray-500 w-8 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoomChange?.(Math.min(4, zoom + 0.25))}
              className="h-7 w-7 text-gray-400 hover:text-white rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Track Labels */}
          <div className="w-24 flex-shrink-0 border-r border-[#3a3a3c]/50 bg-[#252527]">
            {/* Ruler spacer */}
            <div className="h-6 border-b border-[#3a3a3c]/50" />
            
            {/* Video Track Label */}
            <div className="h-16 flex items-center px-3 border-b border-[#3a3a3c]/30 bg-[#1f1f22]">
              <div className={cn('w-1 h-8 rounded-full mr-2', TRACK_COLORS.video.bg)} />
              <span className="text-[11px] text-gray-400">
                {TRACK_LABELS.video.icon} {TRACK_LABELS.video.name}
              </span>
            </div>
            
            {audioTrackTypes.map(type => (
              <div
                key={type}
                className="h-12 flex items-center px-3 border-b border-[#3a3a3c]/30"
              >
                <div className={cn('w-1 h-6 rounded-full mr-2', TRACK_COLORS[type].bg)} />
                <span className="text-[11px] text-gray-400">
                  {TRACK_LABELS[type].icon} {TRACK_LABELS[type].name}
                </span>
              </div>
            ))}
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
              {/* Selection Overlay - Behind everything */}
              {hasSelection && (
                <div
                  className="absolute top-0 bottom-0 bg-purple-500/20 border-l-2 border-r-2 border-purple-500 pointer-events-none z-5"
                  style={{
                    left: selectionLeft,
                    width: selectionWidth,
                  }}
                >
                  {/* IN marker */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500" />
                  <div className="absolute left-0 top-0 px-1 py-0.5 bg-purple-600 text-[8px] text-white font-bold rounded-br">
                    IN
                  </div>
                  {/* OUT marker */}
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-purple-500" />
                  <div className="absolute right-0 top-0 px-1 py-0.5 bg-purple-600 text-[8px] text-white font-bold rounded-bl">
                    OUT
                  </div>
                </div>
              )}

              {/* Time Ruler */}
              <div className="h-6 border-b border-[#3a3a3c]/50 relative bg-[#2c2c2e] sticky top-0 z-10">
                {markers.map(time => (
                  <div
                    key={time}
                    className="absolute top-0 h-full flex flex-col justify-end"
                    style={{ left: time * pixelsPerSecond }}
                  >
                    <div className="h-2.5 w-px bg-[#555]" />
                    <span className="text-[9px] text-gray-500 ml-1 font-mono">
                      {formatTimeShort(time)}
                    </span>
                  </div>
                ))}
                
                {/* Selection markers on ruler */}
                {selection?.inPoint !== null && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-purple-500"
                    style={{ left: selection.inPoint * pixelsPerSecond }}
                  />
                )}
                {selection?.outPoint !== null && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-purple-500"
                    style={{ left: selection.outPoint * pixelsPerSecond }}
                  />
                )}
              </div>

              {/* Video Track - Filmstrip style */}
              <div className="h-16 border-b border-[#3a3a3c]/40 relative bg-[#1a1a1c]">
                {/* Track background pattern */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 79px, #333 79px, #333 80px)',
                  }}
                />

                {videoTracks.map(clip => (
                  <div
                    key={clip.id}
                    data-clip
                    className={cn(
                      'absolute top-1 h-14 rounded-lg cursor-pointer transition-all overflow-hidden',
                      'bg-gradient-to-b shadow-lg border-2',
                      TRACK_COLORS.video.gradient,
                      selectedClipId === clip.id 
                        ? 'border-white shadow-xl scale-[1.02]' 
                        : 'border-blue-700/50 hover:brightness-110',
                      dragClipId === clip.id && 'opacity-80 scale-105'
                    )}
                    style={{
                      left: clip.startTime * pixelsPerSecond,
                      width: Math.max(clip.duration * pixelsPerSecond, 80),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id);
                    }}
                    onMouseDown={(e) => handleClipDragStart(e, clip.id, clip.startTime, 'video')}
                  >
                    {/* Filmstrip visualization */}
                    <div className="absolute inset-0 flex">
                      {clip.thumbnails && clip.thumbnails.length > 0 ? (
                        clip.thumbnails.map((thumb, i) => (
                          <div
                            key={i}
                            className="h-full flex-shrink-0 border-r border-black/30"
                            style={{ 
                              width: `${100 / clip.thumbnails!.length}%`,
                              backgroundImage: `url(${thumb})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                        ))
                      ) : (
                        // Placeholder filmstrip pattern
                        Array.from({ length: Math.max(4, Math.floor(clip.duration / 2)) }, (_, i) => (
                          <div
                            key={i}
                            className="h-full flex-shrink-0 bg-blue-800/40 border-r border-black/30 flex items-center justify-center"
                            style={{ width: `${100 / Math.max(4, Math.floor(clip.duration / 2))}%` }}
                          >
                            <Film className="h-4 w-4 text-blue-400/40" />
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Overlay with clip info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-white truncate drop-shadow-md">
                        {clip.name}
                      </span>
                      <span className="text-[9px] text-white/70 font-mono">
                        {formatTimeShort(clip.duration)}
                      </span>
                    </div>
                    
                    {/* Resize handles */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-l-lg" />
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-r-lg" />

                    {/* Delete button on selection */}
                    {selectedClipId === clip.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveVideoClip(clip.id);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Audio Tracks */}
              {audioTrackTypes.map(type => {
                const clips = audioTracks.filter(c => c.type === type);
                const colors = TRACK_COLORS[type];
                
                return (
                  <div
                    key={type}
                    className="h-12 border-b border-[#3a3a3c]/30 relative bg-[#1c1c1e]"
                  >
                    {/* Track background pattern */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 79px, #333 79px, #333 80px)',
                      }}
                    />

                    {clips.map(clip => (
                      <div
                        key={clip.id}
                        data-clip
                        className={cn(
                          'absolute top-1 h-10 rounded-lg cursor-pointer transition-all overflow-hidden',
                          'bg-gradient-to-b shadow-lg',
                          colors.gradient,
                          selectedClipId === clip.id 
                            ? 'ring-2 ring-white shadow-xl scale-[1.02]' 
                            : 'hover:brightness-110',
                          dragClipId === clip.id && 'opacity-80 scale-105'
                        )}
                        style={{
                          left: clip.startTime * pixelsPerSecond,
                          width: Math.max(clip.duration * pixelsPerSecond, 50),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onMouseDown={(e) => handleClipDragStart(e, clip.id, clip.startTime, 'audio')}
                      >
                        {/* Waveform */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                          <svg className="w-full h-8" preserveAspectRatio="none">
                            {Array.from({ length: Math.max(20, Math.floor(clip.duration * 8)) }, (_, i) => {
                              const x = (i / Math.max(20, clip.duration * 8)) * 100;
                              const height = 30 + Math.sin(i * 0.6) * 20 + Math.random() * 15;
                              return (
                                <rect
                                  key={i}
                                  x={`${x}%`}
                                  y={`${50 - height/2}%`}
                                  width="2"
                                  height={`${height}%`}
                                  fill="currentColor"
                                  className="text-white/60"
                                />
                              );
                            })}
                          </svg>
                        </div>

                        {/* Clip info */}
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-[10px] font-medium text-white truncate drop-shadow-md">
                            {clip.name}
                          </span>
                        </div>

                        {/* Resize handles */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-l-lg" />
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-r-lg" />

                        {/* Delete button */}
                        {selectedClipId === clip.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveClip(clip.id);
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-400 transition-colors z-10"
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                style={{ left: playheadPosition }}
              >
                {/* Playhead top marker */}
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
