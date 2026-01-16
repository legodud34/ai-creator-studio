import { useState } from 'react';
import { Mic, Loader2, Play, Pause, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const VOICES = [
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'Male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Female' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Male' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Male' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'Non-binary' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Male' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Male' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Male' },
];

const CREDITS_COST = 5;

interface AIVoicePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (audio: { url: string; duration: number; name: string; voiceId: string; prompt: string }) => void;
}

export function AIVoicePanel({ open, onOpenChange, onGenerated }: AIVoicePanelProps) {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState(VOICES[14].id); // Brian
  const [stability, setStability] = useState([50]);
  const [speed, setSpeed] = useState([100]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please sign in to generate voiceovers');
      navigate('/auth');
      return;
    }

    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setIsGenerating(true);
    setPreviewUrl(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text,
            voiceId,
            stability: stability[0] / 100,
            speed: speed[0] / 100,
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
        throw new Error(data.error || 'Failed to generate voiceover');
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
      toast.success('Voiceover generated!');
    } catch (error) {
      console.error('TTS error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate voiceover');
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
    const voice = VOICES.find(v => v.id === voiceId);
    onGenerated({
      url: previewUrl,
      duration: previewDuration,
      name: `${voice?.name || 'Voice'}: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`,
      voiceId,
      prompt: text,
    });
    // Reset
    setText('');
    setPreviewUrl(null);
    setPreviewDuration(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#1e1e1e] border-[#3a3a3a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Mic className="h-4 w-4 text-cyan-400" />
            </div>
            AI Voiceover
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
              <Coins className="h-3 w-3" />
              {CREDITS_COST} credits
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-400 text-xs">Script</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to convert to speech..."
              className="mt-1.5 min-h-[100px] bg-[#252525] border-[#3a3a3a] text-white placeholder:text-gray-600 focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs">Voice</Label>
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger className="mt-1.5 bg-[#252525] border-[#3a3a3a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-[#3a3a3a]">
                  {VOICES.map(voice => (
                    <SelectItem 
                      key={voice.id} 
                      value={voice.id}
                      className="text-gray-300 focus:bg-[#3a3a3a] focus:text-white"
                    >
                      {voice.name} ({voice.gender})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-400 text-xs">Speed: {speed[0]}%</Label>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                min={70}
                max={120}
                step={5}
                className="mt-3"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">Stability: {stability[0]}%</Label>
            <Slider
              value={stability}
              onValueChange={setStability}
              min={0}
              max={100}
              step={5}
              className="mt-2"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              Lower = more expressive, Higher = more consistent
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Generate Voiceover ({CREDITS_COST} credits)
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
                  className="h-10 w-10 rounded-full bg-cyan-500 hover:bg-cyan-400 border-0"
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
