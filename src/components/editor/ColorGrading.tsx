import { useState } from 'react';
import { 
  Palette, 
  Sun, 
  Contrast, 
  Droplets,
  ThermometerSun,
  CircleDot,
  ChevronDown,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ColorSettings {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  temperature: number;
  tint: number;
  vibrance: number;
}

const defaultSettings: ColorSettings = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
};

interface ColorGradingProps {
  onSettingsChange?: (settings: ColorSettings) => void;
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

function ColorSlider({ 
  label, 
  value, 
  onChange, 
  min = -100, 
  max = 100,
  centerZero = true
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  centerZero?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</Label>
        <span className="text-[10px] text-gray-400 font-mono w-8 text-right">
          {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={1}
          className="py-1"
        />
        {centerZero && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-2 bg-gray-600 pointer-events-none" />
        )}
      </div>
    </div>
  );
}

export function ColorGrading({ onSettingsChange }: ColorGradingProps) {
  const [settings, setSettings] = useState<ColorSettings>(defaultSettings);
  const [preset, setPreset] = useState('none');

  const updateSetting = (key: keyof ColorSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const resetAll = () => {
    setSettings(defaultSettings);
    setPreset('none');
    onSettingsChange?.(defaultSettings);
  };

  const applyPreset = (presetId: string) => {
    setPreset(presetId);
    
    const presets: Record<string, ColorSettings> = {
      none: defaultSettings,
      cinematic: { ...defaultSettings, contrast: 20, saturation: -10, temperature: -5 },
      vibrant: { ...defaultSettings, saturation: 30, vibrance: 20, contrast: 10 },
      vintage: { ...defaultSettings, saturation: -20, temperature: 15, contrast: -10 },
      noir: { ...defaultSettings, saturation: -100, contrast: 40 },
      warm: { ...defaultSettings, temperature: 25, tint: 5 },
      cool: { ...defaultSettings, temperature: -20, tint: -5 },
    };

    const newSettings = presets[presetId] || defaultSettings;
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#3a3a3a] flex items-center justify-between bg-[#252525]">
        <div className="flex items-center">
          <Palette className="h-3.5 w-3.5 text-gray-500 mr-2" />
          <span className="text-xs font-medium text-gray-300">Color</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          className="h-6 px-2 text-[10px] text-gray-500 hover:text-white"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Preset Selector */}
      <div className="px-3 py-2 border-b border-[#3a3a3a]">
        <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Preset</Label>
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="cinematic">Cinematic</SelectItem>
            <SelectItem value="vibrant">Vibrant</SelectItem>
            <SelectItem value="vintage">Vintage</SelectItem>
            <SelectItem value="noir">Film Noir</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cool">Cool</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Wheels Preview */}
      <div className="px-3 py-3 border-b border-[#3a3a3a]">
        <div className="flex justify-between gap-2">
          {['Shadows', 'Midtones', 'Highlights'].map((label) => (
            <div key={label} className="flex-1 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
              </div>
              <span className="text-[9px] text-gray-600 mt-1 block">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Adjustment Sliders */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <CollapsibleSection
          title="Exposure"
          icon={<Sun className="h-3.5 w-3.5 text-gray-500" />}
        >
          <ColorSlider
            label="Exposure"
            value={settings.exposure}
            onChange={(v) => updateSetting('exposure', v)}
          />
          <ColorSlider
            label="Highlights"
            value={settings.highlights}
            onChange={(v) => updateSetting('highlights', v)}
          />
          <ColorSlider
            label="Shadows"
            value={settings.shadows}
            onChange={(v) => updateSetting('shadows', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Color"
          icon={<Droplets className="h-3.5 w-3.5 text-gray-500" />}
        >
          <ColorSlider
            label="Saturation"
            value={settings.saturation}
            onChange={(v) => updateSetting('saturation', v)}
          />
          <ColorSlider
            label="Vibrance"
            value={settings.vibrance}
            onChange={(v) => updateSetting('vibrance', v)}
          />
          <ColorSlider
            label="Contrast"
            value={settings.contrast}
            onChange={(v) => updateSetting('contrast', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Temperature"
          icon={<ThermometerSun className="h-3.5 w-3.5 text-gray-500" />}
        >
          <ColorSlider
            label="Temperature"
            value={settings.temperature}
            onChange={(v) => updateSetting('temperature', v)}
          />
          <ColorSlider
            label="Tint"
            value={settings.tint}
            onChange={(v) => updateSetting('tint', v)}
          />
        </CollapsibleSection>
      </div>

      {/* Histogram */}
      <div className="p-3 border-t border-[#3a3a3a]">
        <div className="text-[9px] text-gray-600 mb-1">Histogram</div>
        <div className="h-12 bg-[#1a1a1a] rounded border border-[#2a2a2a] relative overflow-hidden">
          {/* Simulated histogram */}
          <svg className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="histGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="100%" stopColor="white" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 48 ${Array.from({ length: 100 }, (_, i) => {
                const x = i * 2.56;
                const y = 48 - Math.sin(i * 0.15) * 20 - Math.random() * 15;
                return `L ${x} ${y}`;
              }).join(' ')} L 256 48 Z`}
              fill="url(#histGradient)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
