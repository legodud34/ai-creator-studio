import { useState } from 'react';
import { Music, Loader2, Play, Pause, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MUSIC_SUGGESTIONS = [
  'Upbeat electronic',
  'Calm ambient piano',
  'Epic cinematic',
  'Lo-fi hip hop',
  'Dramatic suspense',
  'Happy acoustic',
  'Dark synthwave',
  'Peaceful nature',
  'Energetic rock',
  'Romantic strings',
  'Futuristic sci-fi',
  'Jazzy cafe',
];

const CREDITS_COST = 10;

interface MusicPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (audio: { url: string; duration: number; name: string; prompt: string }) => void;
}

export function MusicPanel({ open, onOpenChange, onGenerated }: MusicPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([30]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please sign in to generate music');
      navigate('/auth');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please describe the music');
      return;
    }

    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt,
            duration: duration[0],
            userId: user.id,
          }),
        }
      );

      if (response.status === 402) {
        const data = await response.json();
        toast.error(data.error || 'Insufficient credits');
        navigate('/credits');
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate music');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      // Get duration
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          setPreviewDuration(audio.duration);
          resolve();
        });
      });
      
      setPreviewUrl(url);
      setAudioElement(audio);
      toast.success('Music generated!');
    } catch (error) {
      console.error('Music error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioElement) return;
    if (isPlaying) {
      audioElement.pause();
      audioElement.currentTime = 0;
    } else {
      audioElement.play();
      audioElement.onended = () => setIsPlaying(false);
    }
    setIsPlaying(!isPlaying);
  };

  const handleAdd = () => {
    if (!previewUrl) return;
    onGenerated({
      url: previewUrl,
      duration: previewDuration,
      name: `Music: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`,
      prompt,
    });
    // Reset
    setPrompt('');
    setPreviewUrl(null);
    setPreviewDuration(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#1e1e1e] border-[#3a3a3a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Music className="h-4 w-4 text-violet-400" />
            </div>
            AI Music Generator
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-violet-400 bg-violet-500/10 px-2 py-1 rounded">
              <Coins className="h-3 w-3" />
              {CREDITS_COST} credits
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-400 text-xs">Describe the music</Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Upbeat electronic dance music with synths"
              className="mt-1.5 bg-[#252525] border-[#3a3a3a] text-white placeholder:text-gray-600 focus:border-violet-500"
            />
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Genre suggestions</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {MUSIC_SUGGESTIONS.slice(0, 8).map(suggestion => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(suggestion)}
                  className="text-[10px] h-7 bg-[#252525] border-[#3a3a3a] text-gray-400 hover:text-white hover:border-violet-500/50"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Duration: {duration[0]}s</Label>
            <Slider
              value={duration}
              onValueChange={setDuration}
              min={10}
              max={120}
              step={5}
              className="mt-2"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating... (may take a minute)
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Generate Music ({CREDITS_COST} credits)
              </>
            )}
          </Button>

          {previewUrl && (
            <div className="p-4 bg-[#252525] border border-[#3a3a3a] rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-violet-500 hover:bg-violet-400 border-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
                </Button>
                <div>
                  <p className="text-sm font-medium text-gray-300">Preview</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {previewDuration.toFixed(1)}s
                  </p>
                </div>
              </div>

              <Button onClick={handleAdd} className="w-full bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white">
                Add to Media Library
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
