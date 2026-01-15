import { useState } from 'react';
import { 
  Wand2, 
  Film, 
  Palette, 
  Type, 
  Sparkles,
  Layers,
  Image,
  Search,
  Star,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Effect {
  id: string;
  name: string;
  category: string;
  icon: string;
  isPro?: boolean;
}

const VIDEO_EFFECTS: Effect[] = [
  { id: 'blur', name: 'Gaussian Blur', category: 'Blur', icon: '🌀' },
  { id: 'sharpen', name: 'Sharpen', category: 'Sharpen', icon: '✨' },
  { id: 'vignette', name: 'Vignette', category: 'Stylize', icon: '⭕' },
  { id: 'glow', name: 'Glow', category: 'Stylize', icon: '💫' },
  { id: 'chromatic', name: 'Chromatic Aberration', category: 'Distort', icon: '🌈' },
  { id: 'film_grain', name: 'Film Grain', category: 'Stylize', icon: '📽️' },
  { id: 'letterbox', name: 'Letterbox', category: 'Stylize', icon: '🎬' },
  { id: 'glitch', name: 'Glitch', category: 'Distort', icon: '📺' },
];

const COLOR_EFFECTS: Effect[] = [
  { id: 'lut_cinematic', name: 'Cinematic LUT', category: 'Color', icon: '🎥' },
  { id: 'lut_vintage', name: 'Vintage', category: 'Color', icon: '📷' },
  { id: 'lut_noir', name: 'Film Noir', category: 'Color', icon: '🖤' },
  { id: 'lut_teal_orange', name: 'Teal & Orange', category: 'Color', icon: '🔶' },
  { id: 'lut_warm', name: 'Warm Tone', category: 'Color', icon: '🌅' },
  { id: 'lut_cool', name: 'Cool Tone', category: 'Color', icon: '❄️' },
  { id: 'bw', name: 'Black & White', category: 'Color', icon: '⬛' },
  { id: 'sepia', name: 'Sepia', category: 'Color', icon: '🟤' },
];

const TRANSITIONS: Effect[] = [
  { id: 'cross_dissolve', name: 'Cross Dissolve', category: 'Dissolve', icon: '🔀' },
  { id: 'fade_black', name: 'Fade to Black', category: 'Fade', icon: '⬛' },
  { id: 'fade_white', name: 'Fade to White', category: 'Fade', icon: '⬜' },
  { id: 'wipe_left', name: 'Wipe Left', category: 'Wipe', icon: '➡️' },
  { id: 'wipe_right', name: 'Wipe Right', category: 'Wipe', icon: '⬅️' },
  { id: 'zoom_in', name: 'Zoom In', category: 'Movement', icon: '🔍' },
  { id: 'zoom_out', name: 'Zoom Out', category: 'Movement', icon: '🔎' },
  { id: 'spin', name: 'Spin', category: 'Movement', icon: '🔄' },
];

const TITLES: Effect[] = [
  { id: 'basic_title', name: 'Basic Title', category: 'Standard', icon: '📝' },
  { id: 'lower_third', name: 'Lower Third', category: 'Standard', icon: '📋' },
  { id: 'centered', name: 'Centered', category: 'Standard', icon: '🎯' },
  { id: 'scrolling', name: 'Scrolling', category: 'Animated', icon: '📜' },
  { id: 'typewriter', name: 'Typewriter', category: 'Animated', icon: '⌨️' },
  { id: 'reveal', name: 'Reveal', category: 'Animated', icon: '✨' },
];

interface EffectsBrowserProps {
  onSelectEffect?: (effect: Effect) => void;
}

export function EffectsBrowser({ onSelectEffect }: EffectsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  const filterEffects = (effects: Effect[]) => {
    if (!searchQuery) return effects;
    return effects.filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const toggleFavorite = (effectId: string) => {
    setFavorites(prev => 
      prev.includes(effectId) 
        ? prev.filter(id => id !== effectId)
        : [...prev, effectId]
    );
  };

  const EffectCard = ({ effect }: { effect: Effect }) => (
    <div
      className={cn(
        'group relative p-3 rounded-lg border border-[#3a3a3a] bg-[#252525] cursor-pointer transition-all',
        'hover:border-primary/50 hover:bg-[#2a2a2a]'
      )}
      onClick={() => onSelectEffect?.(effect)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(effect.id);
        }}
        className={cn(
          'absolute top-1.5 right-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          favorites.includes(effect.id) && 'opacity-100'
        )}
      >
        <Star 
          className={cn(
            'h-3 w-3',
            favorites.includes(effect.id) 
              ? 'text-yellow-500 fill-yellow-500' 
              : 'text-gray-500'
          )} 
        />
      </button>
      
      <div className="text-2xl mb-2">{effect.icon}</div>
      <p className="text-[10px] font-medium text-gray-300 truncate">{effect.name}</p>
      <p className="text-[9px] text-gray-600">{effect.category}</p>
      
      {effect.isPro && (
        <span className="absolute top-1.5 left-1.5 px-1 py-0.5 text-[8px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded">
          PRO
        </span>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#3a3a3a] flex items-center bg-[#252525]">
        <Wand2 className="h-3.5 w-3.5 text-gray-500 mr-2" />
        <span className="text-xs font-medium text-gray-300">Effects</span>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#3a3a3a]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <Input
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs bg-[#2a2a2a] border-[#3a3a3a] pl-8"
          />
        </div>
      </div>

      <Tabs defaultValue="video" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-2 pt-2 bg-[#1e1e1e]">
          <TabsList className="grid grid-cols-4 h-8 bg-[#2a2a2a] p-0.5">
            <TabsTrigger 
              value="video" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] rounded"
            >
              <Film className="h-3 w-3 mr-1" />
              Video
            </TabsTrigger>
            <TabsTrigger 
              value="color" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] rounded"
            >
              <Palette className="h-3 w-3 mr-1" />
              Color
            </TabsTrigger>
            <TabsTrigger 
              value="transitions" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] rounded"
            >
              <Layers className="h-3 w-3 mr-1" />
              Trans
            </TabsTrigger>
            <TabsTrigger 
              value="titles" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] rounded"
            >
              <Type className="h-3 w-3 mr-1" />
              Titles
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3">
            <TabsContent value="video" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                {filterEffects(VIDEO_EFFECTS).map(effect => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="color" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                {filterEffects(COLOR_EFFECTS).map(effect => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transitions" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                {filterEffects(TRANSITIONS).map(effect => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="titles" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                {filterEffects(TITLES).map(effect => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Recent */}
      <div className="border-t border-[#3a3a3a] p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="h-3 w-3 text-gray-500" />
          <span className="text-[10px] text-gray-500 font-medium">Recent</span>
        </div>
        <div className="flex gap-1.5">
          {VIDEO_EFFECTS.slice(0, 4).map(effect => (
            <div
              key={effect.id}
              className="w-8 h-8 rounded bg-[#252525] border border-[#3a3a3a] flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors"
              onClick={() => onSelectEffect?.(effect)}
            >
              <span className="text-sm">{effect.icon}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
