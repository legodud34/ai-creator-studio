import { useRef, useCallback, useEffect } from 'react';
import { Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { AudioClip } from '@/hooks/useEditorState';

interface TimelineProps {
  duration: number;
  currentTime: number;
  audioTracks: AudioClip[];
  selectedClipId: string | null;
  onSeek: (time: number) => void;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
}

const TRACK_COLORS = {
  voiceover: 'bg-blue-500/80',
  sfx: 'bg-orange-500/80',
  music: 'bg-purple-500/80',
};

const TRACK_LABELS = {
  voiceover: 'Voice',
  sfx: 'SFX',
  music: 'Music',
};

export function Timeline({
  duration,
  currentTime,
  audioTracks,
  selectedClipId,
  onSeek,
  onSelectClip,
  onUpdateClip,
  onRemoveClip,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = 50;

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, duration)));
  }, [duration, onSeek, pixelsPerSecond]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timelineWidth = Math.max(duration * pixelsPerSecond, 800);
  const playheadPosition = currentTime * pixelsPerSecond;

  // Group clips by type
  const trackTypes: Array<'voiceover' | 'sfx' | 'music'> = ['voiceover', 'sfx', 'music'];

  // Generate time markers
  const markers: number[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += 5) {
    markers.push(i);
  }

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-lg overflow-hidden border border-border/50">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <span className="text-sm font-medium">Timeline</span>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div className="w-20 flex-shrink-0 border-r border-border/50 bg-muted/20">
          <div className="h-8 border-b border-border/30" /> {/* Time ruler spacer */}
          {trackTypes.map(type => (
            <div
              key={type}
              className="h-14 flex items-center px-3 border-b border-border/30"
            >
              <span className="text-xs text-muted-foreground font-medium">
                {TRACK_LABELS[type]}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onClick={handleTimelineClick}
        >
          <div style={{ width: timelineWidth, minWidth: '100%' }}>
            {/* Time Ruler */}
            <div className="h-8 border-b border-border/30 relative bg-muted/10">
              {markers.map(time => (
                <div
                  key={time}
                  className="absolute top-0 h-full flex flex-col justify-end"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <div className="h-2 w-px bg-border" />
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {formatTime(time)}
                  </span>
                </div>
              ))}
            </div>

            {/* Audio Tracks */}
            {trackTypes.map(type => {
              const clips = audioTracks.filter(c => c.type === type);
              return (
                <div
                  key={type}
                  className="h-14 border-b border-border/30 relative"
                >
                  {clips.map(clip => (
                    <div
                      key={clip.id}
                      className={cn(
                        'absolute top-1 h-12 rounded cursor-pointer transition-all',
                        TRACK_COLORS[type],
                        selectedClipId === clip.id 
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-background' 
                          : 'hover:brightness-110'
                      )}
                      style={{
                        left: clip.startTime * pixelsPerSecond,
                        width: clip.duration * pixelsPerSecond,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                    >
                      <div className="px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
                        <span className="text-xs font-medium text-white truncate">
                          {clip.name}
                        </span>
                        <span className="text-[10px] text-white/70 truncate">
                          {formatTime(clip.duration)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ 
                left: playheadPosition,
                height: 'calc(100% + 8px)',
                marginTop: '-8px'
              }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Clip Controls */}
      {selectedClipId && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          {(() => {
            const clip = audioTracks.find(c => c.id === selectedClipId);
            if (!clip) return null;
            return (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {clip.name}
                </span>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[clip.volume * 100]}
                    onValueChange={([value]) => onUpdateClip(clip.id, { volume: value / 100 })}
                    max={100}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {Math.round(clip.volume * 100)}%
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveClip(clip.id)}
                  className="ml-auto text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
