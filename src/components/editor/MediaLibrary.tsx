import { useState, useRef } from 'react';
import { Upload, Video, Mic, Music, Sparkles, Plus, FolderOpen, Check } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#3a3a3a] flex items-center bg-[#252525]">
        <FolderOpen className="h-3.5 w-3.5 text-gray-500 mr-2" />
        <span className="text-xs font-medium text-gray-300">Media</span>
      </div>

      <Tabs defaultValue="video" className="flex-1 flex flex-col">
        <div className="px-2 pt-2 bg-[#1e1e1e]">
          <TabsList className="grid grid-cols-4 h-8 bg-[#2a2a2a] p-0.5">
            <TabsTrigger 
              value="video" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white rounded"
            >
              <Video className="h-3 w-3 mr-1" />
              Video
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white rounded"
            >
              <Mic className="h-3 w-3 mr-1" />
              Voice
            </TabsTrigger>
            <TabsTrigger 
              value="sfx" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white rounded"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              SFX
            </TabsTrigger>
            <TabsTrigger 
              value="music" 
              className="text-[10px] h-7 data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white rounded"
            >
              <Music className="h-3 w-3 mr-1" />
              Music
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3">
            <TabsContent value="video" className="mt-0">
              <div
                className={cn(
                  'border border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
                  dragOver 
                    ? 'border-primary bg-primary/10' 
                    : 'border-[#3a3a3a] hover:border-[#4a4a4a] hover:bg-[#252525]'
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
                <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-gray-500" />
                </div>
                <p className="text-xs font-medium text-gray-400">
                  {videoUrl ? 'Replace video' : 'Import Video'}
                </p>
                <p className="text-[10px] text-gray-600 mt-1">
                  Drop file or click to browse
                </p>
              </div>

              {videoUrl && (
                <div className="mt-3 p-3 bg-[#252525] rounded-lg border border-[#3a3a3a]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-300 block">Video loaded</span>
                      <span className="text-[10px] text-gray-600">Ready for editing</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="voice" className="mt-0 space-y-3">
              <Button 
                onClick={onOpenVoicePanel}
                className="w-full h-10 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                AI Voiceover
              </Button>

              {voiceAssets.length === 0 ? (
                <div className="text-center py-8">
                  <Mic className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">No voiceovers yet</p>
                  <p className="text-[10px] text-gray-700 mt-1">Generate AI voices above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {voiceAssets.map(asset => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      color="cyan"
                      onAdd={() => onAddClipToTimeline(asset)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sfx" className="mt-0 space-y-3">
              <Button 
                onClick={onOpenSFXPanel}
                className="w-full h-10 bg-amber-600 hover:bg-amber-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                AI Sound Effect
              </Button>

              {sfxAssets.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">No sound effects yet</p>
                  <p className="text-[10px] text-gray-700 mt-1">Generate AI sounds above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sfxAssets.map(asset => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      color="amber"
                      onAdd={() => onAddClipToTimeline(asset)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="music" className="mt-0 space-y-3">
              <Button 
                onClick={onOpenMusicPanel}
                className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                AI Music
              </Button>

              {musicAssets.length === 0 ? (
                <div className="text-center py-8">
                  <Music className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">No music yet</p>
                  <p className="text-[10px] text-gray-700 mt-1">Generate AI music above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {musicAssets.map(asset => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      color="violet"
                      onAdd={() => onAddClipToTimeline(asset)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function AssetCard({ 
  asset, 
  color,
  onAdd 
}: { 
  asset: AudioClip; 
  color: 'cyan' | 'amber' | 'violet';
  onAdd: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const colorClasses = {
    cyan: 'bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-500/50',
    amber: 'bg-amber-500/20 border-amber-500/30 hover:border-amber-500/50',
    violet: 'bg-violet-500/20 border-violet-500/30 hover:border-violet-500/50',
  };

  const playBtnClasses = {
    cyan: 'bg-cyan-500 hover:bg-cyan-400',
    amber: 'bg-amber-500 hover:bg-amber-400',
    violet: 'bg-violet-500 hover:bg-violet-400',
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div 
      className={cn(
        'p-2.5 rounded-lg border transition-all cursor-pointer',
        colorClasses[color]
      )}
      onClick={onAdd}
    >
      <audio
        ref={audioRef}
        src={asset.url}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-2.5">
        <button
          onClick={togglePlay}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
            playBtnClasses[color]
          )}
        >
          {isPlaying ? (
            <div className="w-2 h-2 bg-white rounded-sm" />
          ) : (
            <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-300 truncate">{asset.name}</p>
          <p className="text-[10px] text-gray-600 font-mono">
            {formatDuration(asset.duration)}
          </p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-1">
          <Plus className="h-3 w-3" />
          Add
        </div>
      </div>
    </div>
  );
}
