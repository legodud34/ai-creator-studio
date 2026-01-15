import { useState, useRef } from 'react';
import { Upload, Video, Mic, Music, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AudioClip } from '@/hooks/useEditorState';

interface MediaLibraryProps {
  videoUrl?: string;
  audioAssets: AudioClip[];
  onVideoUpload: (file: File) => void;
  onOpenVoicePanel: () => void;
  onOpenSFXPanel: () => void;
  onOpenMusicPanel: () => void;
  onAddClipToTimeline: (clip: Omit<AudioClip, 'id' | 'startTime'>) => void;
}

export function MediaLibrary({
  videoUrl,
  audioAssets,
  onVideoUpload,
  onOpenVoicePanel,
  onOpenSFXPanel,
  onOpenMusicPanel,
  onAddClipToTimeline,
}: MediaLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  };

  const voiceAssets = audioAssets.filter(a => a.type === 'voiceover');
  const sfxAssets = audioAssets.filter(a => a.type === 'sfx');
  const musicAssets = audioAssets.filter(a => a.type === 'music');

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/50">
        <h2 className="font-semibold text-sm">Media Library</h2>
      </div>

      <Tabs defaultValue="video" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-3 mt-2">
          <TabsTrigger value="video" className="text-xs">
            <Video className="h-3 w-3 mr-1" />
            Video
          </TabsTrigger>
          <TabsTrigger value="voice" className="text-xs">
            <Mic className="h-3 w-3 mr-1" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="sfx" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            SFX
          </TabsTrigger>
          <TabsTrigger value="music" className="text-xs">
            <Music className="h-3 w-3 mr-1" />
            Music
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-3">
          <TabsContent value="video" className="mt-0">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {videoUrl ? 'Replace video' : 'Drop video here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>

            {videoUrl && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Video loaded</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="voice" className="mt-0 space-y-3">
            <Button 
              onClick={onOpenVoicePanel}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Voiceover
            </Button>

            {voiceAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No voiceovers yet. Generate one above!
              </p>
            ) : (
              <div className="space-y-2">
                {voiceAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onAdd={() => onAddClipToTimeline(asset)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sfx" className="mt-0 space-y-3">
            <Button 
              onClick={onOpenSFXPanel}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Sound Effect
            </Button>

            {sfxAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No sound effects yet. Generate one above!
              </p>
            ) : (
              <div className="space-y-2">
                {sfxAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onAdd={() => onAddClipToTimeline(asset)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="music" className="mt-0 space-y-3">
            <Button 
              onClick={onOpenMusicPanel}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Music
            </Button>

            {musicAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No music yet. Generate some above!
              </p>
            ) : (
              <div className="space-y-2">
                {musicAssets.map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onAdd={() => onAddClipToTimeline(asset)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function AssetCard({ 
  asset, 
  onAdd 
}: { 
  asset: AudioClip; 
  onAdd: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <audio
        ref={audioRef}
        src={asset.url}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
        >
          {isPlaying ? (
            <div className="w-2 h-2 bg-primary rounded-sm" />
          ) : (
            <div className="w-0 h-0 border-l-[6px] border-l-primary border-y-[4px] border-y-transparent ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{asset.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatDuration(asset.duration)}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onAdd}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
