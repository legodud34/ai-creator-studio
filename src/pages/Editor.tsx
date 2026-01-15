import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize, Share2, Settings,
  Film, Mic, Music, Sparkles, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorState, type AudioClip } from '@/hooks/useEditorState';
import { PreviewPlayer } from '@/components/editor/PreviewPlayer';
import { Timeline } from '@/components/editor/Timeline';
import { MediaLibrary } from '@/components/editor/MediaLibrary';
import { AIVoicePanel } from '@/components/editor/AIVoicePanel';
import { SFXPanel } from '@/components/editor/SFXPanel';
import { MusicPanel } from '@/components/editor/MusicPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Editor() {
  const navigate = useNavigate();
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

  const handleVideoUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    toast.success('Video imported successfully');
  }, [setVideoUrl, setProjectName]);

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
      <div className="h-screen flex flex-col bg-gradient-to-b from-[#1c1c1e] to-[#000000] text-white overflow-hidden">
        {/* Top Bar - iMovie style with gradient */}
        <header className="h-12 bg-gradient-to-b from-[#3a3a3c] to-[#2c2c2e] border-b border-black/50 flex items-center px-4 gap-3 shadow-lg">
          {/* Left - Back button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')} 
            className="h-8 px-3 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Projects
          </Button>

          <div className="flex-1" />

          {/* Center - Project name */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <input
              value={project.name}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-sm font-medium text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-3 py-1 min-w-[200px] text-white"
              placeholder="Untitled Project"
            />
          </div>

          <div className="flex-1" />

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            
            <Button 
              size="sm" 
              className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-600/25"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Media Browser */}
          <div className="w-72 bg-[#1c1c1e] border-r border-[#3a3a3c]/50 flex flex-col">
            <MediaLibrary 
              videoUrl={project.videoUrl} 
              audioAssets={audioAssets} 
              onVideoUpload={handleVideoUpload}
              onOpenVoicePanel={() => setVoicePanelOpen(true)} 
              onOpenSFXPanel={() => setSfxPanelOpen(true)}
              onOpenMusicPanel={() => setMusicPanelOpen(true)} 
              onAddClipToTimeline={handleAddClipToTimeline} 
            />
          </div>

          {/* Center - Preview */}
          <div className="flex-1 flex flex-col bg-black">
            {/* Preview Area */}
            <div className="flex-1 relative flex items-center justify-center p-6">
              <div className="w-full max-w-4xl aspect-video">
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

            {/* Playback Controls - iMovie style centered */}
            <div className="h-16 bg-gradient-to-t from-[#1c1c1e] to-transparent flex items-center justify-center gap-4 px-6">
              {/* Time display */}
              <div className="text-sm font-mono text-gray-400 min-w-[60px] text-right">
                {formatTime(project.currentTime)}
              </div>

              {/* Transport controls */}
              <div className="flex items-center gap-1 bg-[#2c2c2e] rounded-full p-1 shadow-xl">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full text-gray-300 hover:text-white hover:bg-white/10"
                      onClick={() => setCurrentTime(Math.max(0, project.currentTime - 10))}
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rewind</TooltipContent>
                </Tooltip>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-12 w-12 rounded-full transition-all",
                    project.isPlaying 
                      ? "bg-white text-black hover:bg-gray-200" 
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  )}
                  onClick={togglePlayPause}
                >
                  {project.isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full text-gray-300 hover:text-white hover:bg-white/10"
                      onClick={() => setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 10))}
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Forward</TooltipContent>
                </Tooltip>
              </div>

              {/* Duration */}
              <div className="text-sm font-mono text-gray-400 min-w-[60px]">
                {formatTime(getTotalDuration())}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 ml-8">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={([val]) => {
                    setVolume(val / 100);
                    if (val > 0) setIsMuted(false);
                  }}
                  max={100}
                  step={1}
                  className="w-24"
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Quick Actions */}
          <div className="w-16 bg-[#1c1c1e] border-l border-[#3a3a3c]/50 flex flex-col items-center py-4 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVoicePanelOpen(true)}
                  className="h-12 w-12 rounded-xl bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 hover:text-cyan-300"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">AI Voice</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSfxPanelOpen(true)}
                  className="h-12 w-12 rounded-xl bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 hover:text-amber-300"
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">AI Sound FX</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMusicPanelOpen(true)}
                  className="h-12 w-12 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 hover:text-violet-300"
                >
                  <Music className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">AI Music</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 hover:text-purple-300"
                >
                  <Wand2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Magic Tools</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Timeline - iMovie style at bottom */}
        <div className="h-48 bg-[#1c1c1e] border-t border-[#3a3a3c]/50">
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

        {/* AI Panels */}
        <AIVoicePanel open={voicePanelOpen} onOpenChange={setVoicePanelOpen} onGenerated={(a) => handleAudioGenerated('voiceover', a)} />
        <SFXPanel open={sfxPanelOpen} onOpenChange={setSfxPanelOpen} onGenerated={(a) => handleAudioGenerated('sfx', a)} />
        <MusicPanel open={musicPanelOpen} onOpenChange={setMusicPanelOpen} onGenerated={(a) => handleAudioGenerated('music', a)} />
      </div>
    </TooltipProvider>
  );
}
