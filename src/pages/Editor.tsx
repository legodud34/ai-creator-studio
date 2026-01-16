import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause,
  Download, Film, Mic, Music, Sparkles, Upload, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    updateAudioClip, removeAudioClip, addVideoClip, updateVideoClip, removeVideoClip,
    setCurrentTime, togglePlayPause, getTotalDuration, resetProject,
  } = useEditorState();

  const [audioAssets, setAudioAssets] = useState<AudioClip[]>([]);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [sfxPanelOpen, setSfxPanelOpen] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('my-movie');
  const [dragOver, setDragOver] = useState(false);
  const [importedMedia, setImportedMedia] = useState<Array<{ id: string; url: string; name: string; type: 'video' | 'image' }>>([]);

  const handleVideoUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, '');
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const mediaId = crypto.randomUUID();
    
    // Add to imported media
    setImportedMedia(prev => [...prev, { id: mediaId, url, name, type: type as 'video' | 'image' }]);
    
    // Set as current project video
    setVideoUrl(url);
    setProjectName(name);

    // Add as video clip to timeline
    if (type === 'video') {
      // Get video duration
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        addVideoClip({
          url,
          name,
          startTime: 0,
          duration: tempVideo.duration,
        });
      };
    }
    
    toast.success('Media imported successfully');
  }, [setVideoUrl, setProjectName, addVideoClip]);

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
            // Try removing from both audio and video tracks
            removeAudioClip(selectedClipId);
            removeVideoClip(selectedClipId);
            toast.success('Clip deleted');
          }
          break;
        case 'ArrowLeft': e.preventDefault(); setCurrentTime(Math.max(0, project.currentTime - 1)); break;
        case 'ArrowRight': e.preventDefault(); setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 1)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, selectedClipId, removeAudioClip, removeVideoClip, project.currentTime, getTotalDuration, setCurrentTime]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
        {/* Top Bar - iMovie style */}
        <header className="h-11 bg-gradient-to-b from-[#3d3d3d] to-[#2d2d2d] border-b border-black/60 flex items-center px-3 gap-3 shadow-lg">
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
            className="text-sm font-medium text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-3 py-1 min-w-[200px] text-white"
            placeholder="My Movie"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-lg">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </header>

        {/* Main Content - iMovie 3-column layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Libraries */}
          <div className="w-44 bg-gradient-to-b from-[#2d2d2d] to-[#252525] border-r border-black/40 flex flex-col text-xs">
            <div className="p-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Project Media
            </div>
            <button
              onClick={() => setSidebarSection('my-movie')}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 text-left transition-all',
                sidebarSection === 'my-movie' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-white/5'
              )}
            >
              <Film className="h-4 w-4" />
              My Movie
            </button>

            <div className="p-3 pt-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Libraries
            </div>
            <button
              onClick={() => setSidebarSection('photos')}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 text-left transition-all',
                sidebarSection === 'photos' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-white/5'
              )}
            >
              <Image className="h-4 w-4" />
              Photos
            </button>

            <div className="p-3 pt-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              AI Tools
            </div>
            <button
              onClick={() => setSidebarSection('ai-media')}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 text-left transition-all',
                sidebarSection === 'ai-media' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-white/5'
              )}
            >
              <Sparkles className="h-4 w-4" />
              AI Media
            </button>
          </div>

          {/* Media Browser - Center-left */}
          <div className="w-72 bg-[#1a1a1a] border-r border-black/40 flex flex-col">
            {/* Browser Header */}
            <div className="h-9 bg-gradient-to-b from-[#333] to-[#2a2a2a] border-b border-black/40 flex items-center px-4 gap-2">
              <span className="text-xs font-medium text-gray-300">
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
                        'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
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
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-300 font-medium">Import Media</p>
                      <p className="text-xs text-gray-500 mt-1">Drag & drop or click</p>
                    </div>

                    {/* Imported Media Grid */}
                    {importedMedia.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {importedMedia.map(media => (
                          <button
                            key={media.id}
                            onClick={() => handleSelectMedia(media.url, media.name)}
                            className={cn(
                              'relative aspect-video rounded-lg overflow-hidden border-2 transition-all group',
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
                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-[10px] text-white truncate font-medium">{media.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {sidebarSection === 'photos' && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Image className="h-6 w-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400">Photos Library</p>
                    <p className="text-xs text-gray-600 mt-1">Import photos to use</p>
                  </div>
                )}

                {sidebarSection === 'ai-media' && (
                  <div className="space-y-3">
                    {/* AI Generation Buttons */}
                    <button
                      onClick={() => setVoicePanelOpen(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-cyan-600/5 border border-cyan-500/30 hover:border-cyan-500/50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Mic className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cyan-300">AI Voiceover</p>
                        <p className="text-[10px] text-cyan-400/60">Text to speech</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setSfxPanelOpen(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-600/20 to-amber-600/5 border border-amber-500/30 hover:border-amber-500/50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-300">AI Sound FX</p>
                        <p className="text-[10px] text-amber-400/60">Custom effects</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setMusicPanelOpen(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-violet-600/5 border border-violet-500/30 hover:border-violet-500/50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Music className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-violet-300">AI Music</p>
                        <p className="text-[10px] text-violet-400/60">Background tracks</p>
                      </div>
                    </button>

                    {/* Generated Audio Assets */}
                    {audioAssets.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-gray-800">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Generated</p>
                        {audioAssets.map(asset => (
                          <button
                            key={asset.id}
                            onClick={() => handleAddClipToTimeline(asset)}
                            className={cn(
                              'w-full flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left hover:scale-[1.02]',
                              asset.type === 'voiceover' && 'bg-cyan-900/20 border-cyan-700/30 hover:border-cyan-600',
                              asset.type === 'sfx' && 'bg-amber-900/20 border-amber-700/30 hover:border-amber-600',
                              asset.type === 'music' && 'bg-violet-900/20 border-violet-700/30 hover:border-violet-600',
                            )}
                          >
                            {asset.type === 'voiceover' && <Mic className="h-3.5 w-3.5 text-cyan-400" />}
                            {asset.type === 'sfx' && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                            {asset.type === 'music' && <Music className="h-3.5 w-3.5 text-violet-400" />}
                            <span className="flex-1 text-xs truncate">{asset.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{asset.duration?.toFixed(1)}s</span>
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
          <div className="flex-1 flex flex-col bg-[#0d0d0d]">
            {/* Preview with integrated controls */}
            <div className="flex-1 p-4">
              <PreviewPlayer 
                videoUrl={project.videoUrl} 
                currentTime={project.currentTime}
                duration={getTotalDuration() || 60}
                isPlaying={project.isPlaying}
                onTimeUpdate={setCurrentTime} 
                onDurationChange={setVideoDuration} 
                onPlayPause={togglePlayPause}
                onSeek={setCurrentTime}
                videoRef={videoRef} 
              />
            </div>
          </div>
        </div>

        {/* Timeline - iMovie style at bottom */}
        <div className="h-60 bg-[#1c1c1e] border-t-2 border-black">
          <Timeline 
            duration={getTotalDuration() || 60} 
            currentTime={project.currentTime} 
            audioTracks={project.audioTracks}
            videoTracks={project.videoTracks}
            selectedClipId={selectedClipId} 
            zoom={zoom} 
            isPlaying={project.isPlaying}
            onSeek={setCurrentTime} 
            onSelectClip={setSelectedClipId} 
            onUpdateClip={updateAudioClip}
            onUpdateVideoClip={updateVideoClip}
            onRemoveClip={removeAudioClip}
            onRemoveVideoClip={removeVideoClip}
            onZoomChange={setZoom}
          />
        </div>

        {/* AI Panels */}
        <AIVoicePanel open={voicePanelOpen} onOpenChange={setVoicePanelOpen} onGenerated={(a) => handleAudioGenerated('voiceover', a)} />
        <SFXPanel open={sfxPanelOpen} onOpenChange={setSfxPanelOpen} onGenerated={(a) => handleAudioGenerated('sfx', a)} />
        <MusicPanel open={musicPanelOpen} onOpenChange={setMusicPanelOpen} onGenerated={(a) => handleAudioGenerated('music', a)} />
      </div>
    </TooltipProvider>
  );
}