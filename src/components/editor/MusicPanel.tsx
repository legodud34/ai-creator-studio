import { useState } from 'react';
import { Music, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const MUSIC_SUGGESTIONS = [
  'Upbeat electronic dance music',
  'Calm ambient piano',
  'Epic cinematic orchestral',
  'Lo-fi hip hop beats',
  'Dramatic suspense music',
  'Happy acoustic guitar',
  'Dark synthwave',
  'Peaceful nature sounds with soft melody',
  'Energetic rock drums',
  'Romantic string quartet',
  'Futuristic sci-fi atmosphere',
  'Jazzy cafe background',
];

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

  const handleGenerate = async () => {
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
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate music');
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
      toast.error('Failed to generate music');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-500" />
            AI Music Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Describe the music</Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Upbeat electronic dance music with synths"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Genre suggestions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MUSIC_SUGGESTIONS.slice(0, 6).map(suggestion => (
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
              min={10}
              max={120}
              step={5}
              className="mt-2"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating... (this may take a minute)
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Generate Music
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
