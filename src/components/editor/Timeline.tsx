import { useRef, useCallback } from 'react';
import { Trash2, Volume2, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { AudioClip } from '@/hooks/useEditorState';

interface TimelineProps {
  duration: number;
  currentTime: number;
  audioTracks: AudioClip[];
  selectedClipId: string | null;
  zoom: number;
  onSeek: (time: number) => void;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
}

const TRACK_COLORS = {
  voiceover: { bg: 'bg-cyan-500/90', border: 'border-cyan-400', glow: 'shadow-cyan-500/20' },
  sfx: { bg: 'bg-amber-500/90', border: 'border-amber-400', glow: 'shadow-amber-500/20' },
  music: { bg: 'bg-violet-500/90', border: 'border-violet-400', glow: 'shadow-violet-500/20' },
};

const TRACK_LABELS = {
  voiceover: { name: 'V1', full: 'Voiceover' },
  sfx: { name: 'A1', full: 'Sound Effects' },
  music: { name: 'M1', full: 'Music' },
};

const TRACK_ICONS = {
  voiceover: '🎙️',
  sfx: '🔊',
  music: '🎵',
};

export function Timeline({
  duration,
  currentTime,
  audioTracks,
  selectedClipId,
  zoom,
  onSeek,
  onSelectClip,
  onUpdateClip,
  onRemoveClip,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = 50 * zoom;

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-clip]')) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, duration)));
    onSelectClip(null);
  }, [duration, onSeek, pixelsPerSecond, onSelectClip]);

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

  // Generate time markers - more granular based on zoom
  const markerInterval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : 10;
  const markers: number[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += markerInterval) {
    markers.push(i);
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div className="w-32 flex-shrink-0 border-r border-[#3a3a3a] bg-[#252525]">
          {/* Time ruler spacer */}
          <div className="h-7 border-b border-[#3a3a3a] flex items-center px-2">
            <span className="text-[10px] text-gray-500 font-medium">TRACKS</span>
          </div>
          
          {trackTypes.map(type => (
            <div
              key={type}
              className="h-16 flex items-center px-2 border-b border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm">{TRACK_ICONS[type]}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-300 block">
                    {TRACK_LABELS[type].name}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {TRACK_LABELS[type].full}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 hover:bg-[#3a3a3a] rounded">
                  <Eye className="h-3 w-3 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-[#3a3a3a] rounded">
                  <Unlock className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
          onClick={handleTimelineClick}
        >
          <div style={{ width: timelineWidth, minWidth: '100%' }} className="relative">
            {/* Time Ruler */}
            <div className="h-7 border-b border-[#3a3a3a] relative bg-[#222]">
              {markers.map(time => (
                <div
                  key={time}
                  className="absolute top-0 h-full flex flex-col justify-end"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <div className="h-2 w-px bg-[#4a4a4a]" />
                  <span className="text-[9px] text-gray-600 ml-0.5 font-mono">
                    {formatTimeShort(time)}
                  </span>
                </div>
              ))}
              
              {/* Sub-markers */}
              {zoom >= 1 && markers.map(time => (
                Array.from({ length: markerInterval - 1 }, (_, i) => (
                  <div
                    key={`${time}-${i}`}
                    className="absolute top-0 h-full flex flex-col justify-end"
                    style={{ left: (time + i + 1) * pixelsPerSecond }}
                  >
                    <div className="h-1 w-px bg-[#3a3a3a]" />
                  </div>
                ))
              ))}
            </div>

            {/* Audio Tracks */}
            {trackTypes.map(type => {
              const clips = audioTracks.filter(c => c.type === type);
              const colors = TRACK_COLORS[type];
              
              return (
                <div
                  key={type}
                  className="h-16 border-b border-[#2a2a2a] relative bg-[#1a1a1a]"
                >
                  {/* Track background pattern */}
                  <div 
                    className="absolute inset-0 opacity-5"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 49px, #444 49px, #444 50px)',
                    }}
                  />
                  
                  {clips.map(clip => (
                    <div
                      key={clip.id}
                      data-clip
                      className={cn(
                        'absolute top-1.5 h-[52px] rounded cursor-pointer transition-all',
                        colors.bg,
                        'border-l-2',
                        colors.border,
                        selectedClipId === clip.id 
                          ? `ring-1 ring-white shadow-lg ${colors.glow}` 
                          : 'hover:brightness-110'
                      )}
                      style={{
                        left: clip.startTime * pixelsPerSecond,
                        width: Math.max(clip.duration * pixelsPerSecond, 30),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                    >
                      {/* Waveform effect */}
                      <div className="absolute inset-0 overflow-hidden rounded-r opacity-30">
                        <svg className="w-full h-full" preserveAspectRatio="none">
                          <defs>
                            <pattern id={`wave-${clip.id}`} patternUnits="userSpaceOnUse" width="4" height="100%">
                              <rect x="1" y="20%" width="2" height="60%" fill="white" rx="1" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#wave-${clip.id})`} />
                        </svg>
                      </div>
                      
                      <div className="relative px-2 py-1.5 h-full flex flex-col justify-between overflow-hidden">
                        <span className="text-[10px] font-semibold text-white truncate drop-shadow-sm">
                          {clip.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Volume2 className="h-2.5 w-2.5 text-white/60" />
                          <span className="text-[9px] text-white/60 font-mono">
                            {formatTimeShort(clip.duration)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Resize handles */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30 rounded-l" />
                      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30 rounded-r" />
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ 
                left: playheadPosition,
                height: '100%',
              }}
            >
              {/* Playhead handle */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Clip Controls */}
      {selectedClipId && (
        <div className="h-12 px-4 border-t border-[#3a3a3a] bg-[#252525] flex items-center">
          {(() => {
            const clip = audioTracks.find(c => c.id === selectedClipId);
            if (!clip) return null;
            const colors = TRACK_COLORS[clip.type];
            
            return (
              <div className="flex items-center gap-4 w-full">
                <div className={cn('w-1 h-6 rounded-full', colors.bg)} />
                <span className="text-xs font-medium text-gray-300 truncate max-w-[200px]">
                  {clip.name}
                </span>
                
                <div className="h-4 w-px bg-[#3a3a3a]" />
                
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-gray-500" />
                  <Slider
                    value={[clip.volume * 100]}
                    onValueChange={([value]) => onUpdateClip(clip.id, { volume: value / 100 })}
                    max={100}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-[10px] text-gray-500 w-8 font-mono">
                    {Math.round(clip.volume * 100)}%
                  </span>
                </div>
                
                <div className="h-4 w-px bg-[#3a3a3a]" />
                
                <span className="text-[10px] text-gray-500 font-mono">
                  Start: {formatTimeShort(clip.startTime)}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Duration: {formatTimeShort(clip.duration)}
                </span>
                
                <div className="flex-1" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveClip(clip.id)}
                  className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
