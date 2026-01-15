import { useState, useRef, useEffect } from 'react';
import { Upload, Film, Mic, Music, Sparkles, Plus, Play, Pause, Clock, Folder, Image, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AudioClip } from '@/hooks/useEditorState';

interface MediaLibraryProps {
  videoUrl?: string;
  audioAssets: AudioClip[];
  onVideoUpload: (file: File) => void;
  onVideoSelect: (url: string, name: string) => void;
  onOpenVoicePanel: () => void;
  onOpenSFXPanel: () => void;
  onOpenMusicPanel: () => void;
  onAddClipToTimeline: (clip: Omit<AudioClip, 'id' | 'startTime'>) => void;
}

interface SavedVideo {
  id: string;
  url: string;
  title: string | null;
  prompt: string;
  created_at: string;
}

interface SavedImage {
  id: string;
  url: string;
  title: string | null;
  prompt: string;
  created_at: string;
}

type TabType = 'media' | 'audio';
type MediaSource = 'upload' | 'library';

export function MediaLibrary({
  videoUrl,
  audioAssets,
  onVideoUpload,
  onVideoSelect,
  onOpenVoicePanel,
  onOpenSFXPanel,
  onOpenMusicPanel,
  onAddClipToTimeline,
}: MediaLibraryProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [mediaSource, setMediaSource] = useState<MediaSource>('upload');
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Fetch user's saved videos and images
  useEffect(() => {
    async function fetchUserMedia() {
      if (!user) return;
      
      setIsLoadingMedia(true);
      try {
        const [videosRes, imagesRes] = await Promise.all([
          supabase
            .from('videos')
            .select('id, url, title, prompt, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('images')
            .select('id, url, title, prompt, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (videosRes.data) setSavedVideos(videosRes.data);
        if (imagesRes.data) setSavedImages(imagesRes.data);
      } catch (error) {
        console.error('Error fetching media:', error);
      } finally {
        setIsLoadingMedia(false);
      }
    }

    fetchUserMedia();
  }, [user]);

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
      {/* Tab Header */}
      <div className="flex border-b border-[#3a3a3c]/50">
        <button
          onClick={() => setActiveTab('media')}
          className={cn(
            'flex-1 py-3 text-xs font-medium transition-colors relative',
            activeTab === 'media' 
              ? 'text-white' 
              : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <Film className="h-4 w-4 mx-auto mb-1" />
          Media
          {activeTab === 'media' && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={cn(
            'flex-1 py-3 text-xs font-medium transition-colors relative',
            activeTab === 'audio' 
              ? 'text-white' 
              : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <Music className="h-4 w-4 mx-auto mb-1" />
          Audio
          {activeTab === 'audio' && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === 'media' && (
            <div className="space-y-4">
              {/* Source Toggle */}
              <div className="flex gap-1 p-1 bg-[#2c2c2e] rounded-lg">
                <button
                  onClick={() => setMediaSource('upload')}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5',
                    mediaSource === 'upload' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button
                  onClick={() => setMediaSource('library')}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5',
                    mediaSource === 'library' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Folder className="h-3.5 w-3.5" />
                  My Library
                </button>
              </div>

              {mediaSource === 'upload' && (
                <>
                  {/* Import Section */}
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
                      dragOver 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-[#3a3a3c] hover:border-[#555] hover:bg-[#2c2c2e]'
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
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3a3a3c] to-[#2c2c2e] flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-300">
                      Import from Device
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Drag & drop or click to browse
                    </p>
                  </div>

                  {/* Current Video Thumbnail */}
                  {videoUrl && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Current Project</h3>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-[#2c2c2e] border-2 border-blue-500">
                        <video src={videoUrl} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-blue-600 rounded text-[10px] text-white font-medium">
                          Active
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mediaSource === 'library' && (
                <div className="space-y-4">
                  {isLoadingMedia ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* My Videos */}
                      {savedVideos.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2">
                            <Video className="h-3 w-3" />
                            My Videos ({savedVideos.length})
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {savedVideos.map(video => (
                              <button
                                key={video.id}
                                onClick={() => onVideoSelect(video.url, video.title || 'Untitled Video')}
                                className={cn(
                                  'relative aspect-video rounded-lg overflow-hidden bg-[#2c2c2e] border transition-all group',
                                  videoUrl === video.url 
                                    ? 'border-blue-500 ring-2 ring-blue-500/30' 
                                    : 'border-[#3a3a3c] hover:border-blue-500/50'
                                )}
                              >
                                <video src={video.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                  <p className="text-[9px] text-white truncate">{video.title || 'Untitled'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* My Images */}
                      {savedImages.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2">
                            <Image className="h-3 w-3" />
                            My Images ({savedImages.length})
                          </h3>
                          <div className="grid grid-cols-3 gap-1.5">
                            {savedImages.slice(0, 12).map(image => (
                              <button
                                key={image.id}
                                onClick={() => onVideoSelect(image.url, image.title || 'Image')}
                                className="relative aspect-square rounded-md overflow-hidden bg-[#2c2c2e] border border-[#3a3a3c] hover:border-blue-500/50 transition-all group"
                              >
                                <img src={image.url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="h-4 w-4 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {savedVideos.length === 0 && savedImages.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-2xl bg-[#2c2c2e] flex items-center justify-center mx-auto mb-3">
                            <Folder className="h-7 w-7 text-gray-600" />
                          </div>
                          <p className="text-sm text-gray-500">No saved media</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {user ? 'Generate videos and images to see them here' : 'Sign in to access your media'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-5">
              {/* AI Generation Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={onOpenVoicePanel}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-cyan-600/20 to-cyan-600/5 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors group"
                >
                  <Mic className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-cyan-400 font-medium">Voice</span>
                </button>
                <button
                  onClick={onOpenSFXPanel}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-500/30 hover:border-amber-500/50 transition-colors group"
                >
                  <Sparkles className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-amber-400 font-medium">SFX</span>
                </button>
                <button
                  onClick={onOpenMusicPanel}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-violet-600/20 to-violet-600/5 border border-violet-500/30 hover:border-violet-500/50 transition-colors group"
                >
                  <Music className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-violet-400 font-medium">Music</span>
                </button>
              </div>

              {/* Voice Assets */}
              {voiceAssets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2">
                    <Mic className="h-3 w-3 text-cyan-400" />
                    Voice
                  </h3>
                  <div className="space-y-1.5">
                    {voiceAssets.map(asset => (
                      <AudioAssetCard key={asset.id} asset={asset} color="cyan" onAdd={() => onAddClipToTimeline(asset)} />
                    ))}
                  </div>
                </div>
              )}

              {/* SFX Assets */}
              {sfxAssets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Sound Effects
                  </h3>
                  <div className="space-y-1.5">
                    {sfxAssets.map(asset => (
                      <AudioAssetCard key={asset.id} asset={asset} color="amber" onAdd={() => onAddClipToTimeline(asset)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Music Assets */}
              {musicAssets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2">
                    <Music className="h-3 w-3 text-violet-400" />
                    Music
                  </h3>
                  <div className="space-y-1.5">
                    {musicAssets.map(asset => (
                      <AudioAssetCard key={asset.id} asset={asset} color="violet" onAdd={() => onAddClipToTimeline(asset)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {audioAssets.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#2c2c2e] flex items-center justify-center mx-auto mb-3">
                    <Music className="h-7 w-7 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-500">No audio clips yet</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Generate AI audio using the buttons above
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function AudioAssetCard({ 
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
    cyan: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
    amber: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
    violet: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
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
        'p-2.5 rounded-lg border transition-all cursor-pointer group',
        colorClasses[color]
      )}
      onClick={onAdd}
    >
      <audio ref={audioRef} src={asset.url} onEnded={() => setIsPlaying(false)} />
      <div className="flex items-center gap-2.5">
        <button
          onClick={togglePlay}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 shadow-md',
            playBtnClasses[color]
          )}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 text-white" />
          ) : (
            <Play className="h-3.5 w-3.5 text-white ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-200 truncate">{asset.name}</p>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(asset.duration)}
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
