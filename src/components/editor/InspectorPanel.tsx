import { useState } from 'react';
import { 
  Sliders, 
  Volume2, 
  Clock, 
  Layers, 
  Palette,
  Type,
  MoveHorizontal,
  RotateCw,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AudioWaveform
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AudioClip } from '@/hooks/useEditorState';

interface InspectorPanelProps {
  selectedClip: AudioClip | null;
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#3a3a3a]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-500" />
        )}
        {icon}
        <span className="text-xs font-medium text-gray-300">{title}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function SliderControl({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1,
  unit = ''
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</Label>
        <span className="text-[10px] text-gray-400 font-mono">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
    </div>
  );
}

export function InspectorPanel({ selectedClip, onUpdateClip }: InspectorPanelProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  if (!selectedClip) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="h-9 px-3 border-b border-[#3a3a3a] flex items-center bg-[#252525]">
          <Sliders className="h-3.5 w-3.5 text-gray-500 mr-2" />
          <span className="text-xs font-medium text-gray-300">Inspector</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <Layers className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">No clip selected</p>
            <p className="text-[10px] text-gray-700 mt-1">Select a clip to edit properties</p>
          </div>
        </div>
      </div>
    );
  }

  const clipColors = {
    voiceover: 'bg-cyan-500',
    sfx: 'bg-amber-500',
    music: 'bg-violet-500',
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#3a3a3a] flex items-center bg-[#252525]">
        <Sliders className="h-3.5 w-3.5 text-gray-500 mr-2" />
        <span className="text-xs font-medium text-gray-300">Inspector</span>
      </div>

      {/* Clip Info */}
      <div className="px-3 py-3 border-b border-[#3a3a3a] bg-[#222]">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-8 rounded-full', clipColors[selectedClip.type])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{selectedClip.name}</p>
            <p className="text-[10px] text-gray-500 capitalize">{selectedClip.type}</p>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Audio Section */}
        <CollapsibleSection
          title="Audio"
          icon={<Volume2 className="h-3.5 w-3.5 text-gray-500" />}
        >
          <SliderControl
            label="Volume"
            value={selectedClip.volume * 100}
            onChange={(v) => onUpdateClip(selectedClip.id, { volume: v / 100 })}
            unit="%"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Fade In</Label>
              <Input 
                type="text" 
                defaultValue="0.0s" 
                className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Fade Out</Label>
              <Input 
                type="text" 
                defaultValue="0.0s" 
                className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-gray-400">Solo</Label>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-gray-400">Mute</Label>
            <Switch />
          </div>
        </CollapsibleSection>

        {/* Timing Section */}
        <CollapsibleSection
          title="Timing"
          icon={<Clock className="h-3.5 w-3.5 text-gray-500" />}
        >
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Start Time</Label>
              <Input 
                type="text" 
                value={formatTime(selectedClip.startTime)} 
                readOnly
                className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Duration</Label>
              <Input 
                type="text" 
                value={formatTime(selectedClip.duration)} 
                readOnly
                className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">End Time</Label>
              <Input 
                type="text" 
                value={formatTime(selectedClip.startTime + selectedClip.duration)} 
                readOnly
                className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1 font-mono"
              />
            </div>
          </div>

          <SliderControl
            label="Speed"
            value={100}
            onChange={() => {}}
            min={25}
            max={400}
            unit="%"
          />
        </CollapsibleSection>

        {/* Effects Section */}
        <CollapsibleSection
          title="Effects"
          icon={<Sparkles className="h-3.5 w-3.5 text-gray-500" />}
          defaultOpen={false}
        >
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">EQ Preset</Label>
              <Select defaultValue="none">
                <SelectTrigger className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="voice_enhance">Voice Enhance</SelectItem>
                  <SelectItem value="bass_boost">Bass Boost</SelectItem>
                  <SelectItem value="treble_boost">Treble Boost</SelectItem>
                  <SelectItem value="reduce_noise">Reduce Noise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SliderControl
              label="Reverb"
              value={0}
              onChange={() => {}}
              unit="%"
            />
            
            <SliderControl
              label="Pitch"
              value={0}
              onChange={() => {}}
              min={-12}
              max={12}
              step={1}
              unit=" st"
            />
          </div>
        </CollapsibleSection>

        {/* Waveform Section */}
        <CollapsibleSection
          title="Waveform"
          icon={<AudioWaveform className="h-3.5 w-3.5 text-gray-500" />}
          defaultOpen={false}
        >
          <div className="h-16 bg-[#2a2a2a] rounded border border-[#3a3a3a] flex items-center justify-center">
            <svg className="w-full h-10 px-2" preserveAspectRatio="none">
              {Array.from({ length: 60 }, (_, i) => (
                <rect
                  key={i}
                  x={i * 3}
                  y={20 - Math.random() * 15}
                  width="2"
                  height={Math.random() * 30}
                  fill="currentColor"
                  className="text-cyan-500/60"
                />
              ))}
            </svg>
          </div>
        </CollapsibleSection>

        {/* Metadata Section */}
        <CollapsibleSection
          title="Metadata"
          icon={<Type className="h-3.5 w-3.5 text-gray-500" />}
          defaultOpen={false}
        >
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Name</Label>
              <Input 
                type="text" 
                value={selectedClip.name}
                className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1"
                readOnly
              />
            </div>
            {selectedClip.prompt && (
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Prompt</Label>
                <div className="mt-1 p-2 text-[10px] text-gray-400 bg-[#2a2a2a] border border-[#3a3a3a] rounded">
                  {selectedClip.prompt}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
