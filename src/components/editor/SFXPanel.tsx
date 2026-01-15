import { useState } from 'react';
import { Sparkles, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const SFX_SUGGESTIONS = [
  'Footsteps on gravel',
  'Door creaking open',
  'Thunder rumbling',
  'Glass breaking',
  'Car engine starting',
  'Rain on window',
  'Keyboard typing',
  'Explosion in distance',
  'Birds chirping',
  'Wind howling',
  'Fire crackling',
  'Water splash',
];

interface SFXPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (audio: { url: string; duration: number; name: string; prompt: string }) => void;
}

export function SFXPanel({ open, onOpenChange, onGenerated }: SFXPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([5]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the sound effect');
      return;
    }

    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
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
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate sound effect');
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
      toast.success('Sound effect generated!');
    } catch (error) {
      console.error('SFX error:', error);
      toast.error('Failed to generate sound effect');
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
      name: `SFX: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI Sound Effects
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Describe the sound</Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Thunder rumbling in the distance"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Quick suggestions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SFX_SUGGESTIONS.slice(0, 6).map(suggestion => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Duration: {duration[0]}s</Label>
            <Slider
              value={duration}
              onValueChange={setDuration}
              min={0.5}
              max={22}
              step={0.5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max duration: 22 seconds
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Sound Effect
              </>
            )}
          </Button>

          {previewUrl && (
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div>
                  <p className="text-sm font-medium">Preview</p>
                  <p className="text-xs text-muted-foreground">
                    Duration: {previewDuration.toFixed(1)}s
                  </p>
                </div>
              </div>

              <Button onClick={handleAdd} className="w-full">
                Add to Timeline
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
