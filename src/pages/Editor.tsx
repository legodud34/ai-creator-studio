import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize, Settings, Download,
  Film, Mic, Music, Sparkles, Wand2, Upload, Folder, Image, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorState, type AudioClip } from '@/hooks/useEditorState';
import { PreviewPlayer } from '@/components/editor/PreviewPlayer';
import { Timeline } from '@/components/editor/Timeline';
import { AIVoicePanel } from '@/components/editor/AIVoicePanel';
import { SFXPanel } from '@/components/editor/SFXPanel';
import { MusicPanel } from '@/components/editor/MusicPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SidebarSection = 'my-movie' | 'photos' | 'ai-media';

export default function Editor() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    project, selectedClipId, setSelectedClipId, videoRef,
    setVideoUrl, setVideoDuration, setProjectName, addAudioClip,
    updateAudioClip, removeAudioClip, setCurrentTime, togglePlayPause,
    getTotalDuration, resetProject,
  } = useEditorState();

  const [audioAssets, setAudioAssets] = useState<AudioClip[]>([]);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [sfxPanelOpen, setSfxPanelOpen] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('my-movie');
  const [dragOver, setDragOver] = useState(false);
  const [importedMedia, setImportedMedia] = useState<Array<{ id: string; url: string; name: string; type: 'video' | 'image' }>>([]);

  const handleVideoUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, '');
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    
    // Add to imported media
    setImportedMedia(prev => [...prev, { id: crypto.randomUUID(), url, name, type: type as 'video' | 'image' }]);
    
    // Set as current project video
    setVideoUrl(url);
    setProjectName(name);
    toast.success('Media imported successfully');
  }, [setVideoUrl, setProjectName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
      handleVideoUpload(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
      handleVideoUpload(file);
    }
  };

  const handleSelectMedia = (url: string, name: string) => {
    setVideoUrl(url);
    setProjectName(name);
    toast.success('Media loaded');
  };

  const handleAudioGenerated = useCallback((type: 'voiceover' | 'sfx' | 'music', audio: any) => {
    const newAsset: AudioClip = {
      id: crypto.randomUUID(),
      type,
      name: audio.name,
      url: audio.url,
      startTime: 0,
      duration: audio.duration,
      volume: type === 'music' ? 0.7 : 1,
      voiceId: audio.voiceId,
      prompt: audio.prompt,
    };
    setAudioAssets(prev => [...prev, newAsset]);
  }, []);

  const handleAddClipToTimeline = useCallback((asset: Omit<AudioClip, 'id' | 'startTime'>) => {
    addAudioClip({ ...asset, startTime: project.currentTime });
    toast.success(`Added to timeline`);
  }, [addAudioClip, project.currentTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlayPause(); break;
        case 'Delete':
        case 'Backspace': 
          if (selectedClipId) {
            removeAudioClip(selectedClipId);
            toast.success('Clip deleted');
          }
          break;
        case 'ArrowLeft': e.preventDefault(); setCurrentTime(Math.max(0, project.currentTime - 1)); break;
        case 'ArrowRight': e.preventDefault(); setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 1)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, selectedClipId, removeAudioClip, project.currentTime, getTotalDuration, setCurrentTime]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
        {/* Top Bar - iMovie style */}
        <header className="h-10 bg-[#323232] border-b border-black/60 flex items-center px-3 gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')} 
            className="h-7 px-2 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Projects
          </Button>

          <div className="flex-1" />

          <input
            value={project.name}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-xs font-medium text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 min-w-[150px] text-white"
            placeholder="My Movie"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10 rounded">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </header>

        {/* Main Content - iMovie 3-column layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Libraries */}
          <div className="w-40 bg-[#2d2d2d] border-r border-black/40 flex flex-col text-xs">
            <div className="p-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Project Media
            </div>
            <button
              onClick={() => setSidebarSection('my-movie')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                sidebarSection === 'my-movie' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-white/5'
              )}
            >
              <Film className="h-3.5 w-3.5" />
              My Movie
            </button>

            <div className="p-2 pt-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Libraries
            </div>
            <button
              onClick={() => setSidebarSection('photos')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                sidebarSection === 'photos' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-white/5'
              )}
            >
              <Image className="h-3.5 w-3.5" />
              Photos
            </button>

            <div className="p-2 pt-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              AI Tools
            </div>
            <button
              onClick={() => setSidebarSection('ai-media')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                sidebarSection === 'ai-media' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-white/5'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Media
            </button>
          </div>

          {/* Media Browser - Center-left */}
          <div className="w-80 bg-[#1a1a1a] border-r border-black/40 flex flex-col">
            {/* Browser Header */}
            <div className="h-8 bg-[#2d2d2d] border-b border-black/40 flex items-center px-3 gap-2">
              <span className="text-xs text-gray-400">
                {sidebarSection === 'my-movie' && 'My Movie'}
                {sidebarSection === 'photos' && 'Photos Library'}
                {sidebarSection === 'ai-media' && 'AI Media'}
              </span>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4">
                {sidebarSection === 'my-movie' && (
                  <div className="space-y-4">
                    {/* Import Media Button */}
                    <div
                      className={cn(
                        'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
                        dragOver 
                          ? 'border-blue-500 bg-blue-500/20' 
                          : 'border-gray-600 hover:border-gray-500 hover:bg-white/5'
                      )}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="w-16 h-16 rounded-xl border-2 border-gray-500 flex items-center justify-center mx-auto mb-3">
                        <Upload className="h-7 w-7 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-300 font-medium">Import Media</p>
                      <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                    </div>

                    {/* Imported Media Grid */}
                    {importedMedia.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {importedMedia.map(media => (
                          <button
                            key={media.id}
                            onClick={() => handleSelectMedia(media.url, media.name)}
                            className={cn(
                              'relative aspect-video rounded overflow-hidden border transition-all group',
                              project.videoUrl === media.url 
                                ? 'border-blue-500 ring-2 ring-blue-500/30' 
                                : 'border-gray-700 hover:border-gray-500'
                            )}
                          >
                            {media.type === 'video' ? (
                              <video src={media.url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={media.url} alt="" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-[9px] text-white truncate">{media.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {sidebarSection === 'photos' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <Image className="h-7 w-7 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500">Photos Library</p>
                    <p className="text-xs text-gray-600 mt-1">Import photos to use in your project</p>
                  </div>
                )}

                {sidebarSection === 'ai-media' && (
                  <div className="space-y-4">
                    {/* AI Generation Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setVoicePanelOpen(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-cyan-600/20 to-cyan-600/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-cyan-600/30 flex items-center justify-center">
                          <Mic className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-cyan-300">AI Voiceover</p>
                          <p className="text-xs text-cyan-400/60">Generate speech from text</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setSfxPanelOpen(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-600/20 to-amber-600/10 border border-amber-500/30 hover:border-amber-500/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-600/30 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-300">AI Sound Effects</p>
                          <p className="text-xs text-amber-400/60">Create custom sound effects</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setMusicPanelOpen(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-violet-600/20 to-violet-600/10 border border-violet-500/30 hover:border-violet-500/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-violet-600/30 flex items-center justify-center">
                          <Music className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-violet-300">AI Music</p>
                          <p className="text-xs text-violet-400/60">Generate background music</p>
                        </div>
                      </button>
                    </div>

                    {/* Generated Audio Assets */}
                    {audioAssets.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Generated Audio</p>
                        {audioAssets.map(asset => (
                          <button
                            key={asset.id}
                            onClick={() => handleAddClipToTimeline(asset)}
                            className={cn(
                              'w-full flex items-center gap-2 p-2 rounded border transition-all text-left',
                              asset.type === 'voiceover' && 'bg-cyan-900/20 border-cyan-700/30 hover:border-cyan-600',
                              asset.type === 'sfx' && 'bg-amber-900/20 border-amber-700/30 hover:border-amber-600',
                              asset.type === 'music' && 'bg-violet-900/20 border-violet-700/30 hover:border-violet-600',
                            )}
                          >
                            {asset.type === 'voiceover' && <Mic className="h-3.5 w-3.5 text-cyan-400" />}
                            {asset.type === 'sfx' && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                            {asset.type === 'music' && <Music className="h-3.5 w-3.5 text-violet-400" />}
                            <span className="flex-1 text-xs truncate">{asset.name}</span>
                            <span className="text-[10px] text-gray-500">{asset.duration?.toFixed(1)}s</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Area - Right */}
          <div className="flex-1 flex flex-col bg-black">
            {/* Preview */}
            <div className="flex-1 relative flex items-center justify-center p-4">
              <div className="w-full max-w-3xl aspect-video">
                <PreviewPlayer 
                  videoUrl={project.videoUrl} 
                  currentTime={project.currentTime} 
                  isPlaying={project.isPlaying}
                  onTimeUpdate={setCurrentTime} 
                  onDurationChange={setVideoDuration} 
                  onPlayPause={togglePlayPause} 
                  videoRef={videoRef} 
                />
              </div>
            </div>

            {/* Playback Controls - iMovie style */}
            <div className="h-12 bg-[#1a1a1a] border-t border-black/40 flex items-center justify-center gap-4 px-4">
              {/* Mic indicator */}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white">
                <Mic className="h-4 w-4" />
              </Button>

              <div className="flex-1" />

              {/* Transport controls */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-400 hover:text-white"
                  onClick={() => setCurrentTime(Math.max(0, project.currentTime - 10))}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-white hover:text-white"
                  onClick={togglePlayPause}
                >
                  {project.isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-gray-400 hover:text-white"
                  onClick={() => setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 10))}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1" />

              {/* Fullscreen */}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline - iMovie style at bottom */}
        <div className="h-56 bg-[#2d2d2d] border-t border-black/40">
          {/* Timeline Header */}
          <div className="h-8 bg-[#323232] border-b border-black/40 flex items-center px-4">
            <span className="text-xs text-gray-400 font-mono">
              / {formatTime(project.currentTime)}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Slider
                value={[zoom * 50]}
                onValueChange={([val]) => setZoom(val / 50)}
                max={100}
                min={10}
                className="w-24"
              />
              <span className="text-xs text-gray-500">Settings</span>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="h-[calc(100%-2rem)]">
            <Timeline 
              duration={getTotalDuration() || 60} 
              currentTime={project.currentTime} 
              audioTracks={project.audioTracks}
              selectedClipId={selectedClipId} 
              zoom={zoom} 
              isPlaying={project.isPlaying}
              onSeek={setCurrentTime} 
              onSelectClip={setSelectedClipId} 
              onUpdateClip={updateAudioClip}
              onRemoveClip={removeAudioClip} 
              onZoomChange={setZoom}
            />
          </div>
        </div>

        {/* AI Panels */}
        <AIVoicePanel open={voicePanelOpen} onOpenChange={setVoicePanelOpen} onGenerated={(a) => handleAudioGenerated('voiceover', a)} />
        <SFXPanel open={sfxPanelOpen} onOpenChange={setSfxPanelOpen} onGenerated={(a) => handleAudioGenerated('sfx', a)} />
        <MusicPanel open={musicPanelOpen} onOpenChange={setMusicPanelOpen} onGenerated={(a) => handleAudioGenerated('music', a)} />
      </div>
    </TooltipProvider>
  );
}
