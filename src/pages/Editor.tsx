import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  RotateCcw, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  Scissors,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Settings,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorState, type AudioClip } from '@/hooks/useEditorState';
import { PreviewPlayer } from '@/components/editor/PreviewPlayer';
import { Timeline } from '@/components/editor/Timeline';
import { MediaLibrary } from '@/components/editor/MediaLibrary';
import { AIVoicePanel } from '@/components/editor/AIVoicePanel';
import { SFXPanel } from '@/components/editor/SFXPanel';
import { MusicPanel } from '@/components/editor/MusicPanel';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Editor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    project,
    selectedClipId,
    setSelectedClipId,
    videoRef,
    setVideoUrl,
    setVideoDuration,
    setProjectName,
    addAudioClip,
    updateAudioClip,
    removeAudioClip,
    setCurrentTime,
    togglePlayPause,
    getTotalDuration,
    resetProject,
  } = useEditorState();

  const [audioAssets, setAudioAssets] = useState<AudioClip[]>([]);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [sfxPanelOpen, setSfxPanelOpen] = useState(false);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleVideoUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    toast.success('Video loaded');
  }, [setVideoUrl, setProjectName]);

  const handleVoiceGenerated = useCallback((audio: { 
    url: string; 
    duration: number; 
    name: string; 
    voiceId: string; 
    prompt: string;
  }) => {
    const newAsset: AudioClip = {
      id: crypto.randomUUID(),
      type: 'voiceover',
      name: audio.name,
      url: audio.url,
      startTime: 0,
      duration: audio.duration,
      volume: 1,
      voiceId: audio.voiceId,
      prompt: audio.prompt,
    };
    setAudioAssets(prev => [...prev, newAsset]);
  }, []);

  const handleSFXGenerated = useCallback((audio: { 
    url: string; 
    duration: number; 
    name: string; 
    prompt: string;
  }) => {
    const newAsset: AudioClip = {
      id: crypto.randomUUID(),
      type: 'sfx',
      name: audio.name,
      url: audio.url,
      startTime: 0,
      duration: audio.duration,
      volume: 1,
      prompt: audio.prompt,
    };
    setAudioAssets(prev => [...prev, newAsset]);
  }, []);

  const handleMusicGenerated = useCallback((audio: { 
    url: string; 
    duration: number; 
    name: string; 
    prompt: string;
  }) => {
    const newAsset: AudioClip = {
      id: crypto.randomUUID(),
      type: 'music',
      name: audio.name,
      url: audio.url,
      startTime: 0,
      duration: audio.duration,
      volume: 0.7,
      prompt: audio.prompt,
    };
    setAudioAssets(prev => [...prev, newAsset]);
  }, []);

  const handleAddClipToTimeline = useCallback((asset: Omit<AudioClip, 'id' | 'startTime'>) => {
    addAudioClip({
      ...asset,
      startTime: project.currentTime,
    });
    toast.success(`Added ${asset.name} to timeline`);
  }, [addAudioClip, project.currentTime]);

  const handleReset = useCallback(() => {
    resetProject();
    setAudioAssets([]);
    toast.success('Project reset');
  }, [resetProject]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const skipBack = () => setCurrentTime(Math.max(0, project.currentTime - 5));
  const skipForward = () => setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 5));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.code === 'Delete' && selectedClipId) {
        removeAudioClip(selectedClipId);
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBack();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, selectedClipId, removeAudioClip]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
        {/* Top Menu Bar */}
        <header className="h-10 bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center px-2 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-7 px-2 text-xs text-gray-300 hover:text-white hover:bg-[#3a3a3a]"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Exit
          </Button>
          
          <div className="h-4 w-px bg-[#3a3a3a] mx-1" />
          
          {isEditingName ? (
            <Input
              value={project.name}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="w-48 h-7 text-xs bg-[#1a1a1a] border-[#4a4a4a]"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xs font-medium text-gray-300 hover:text-white transition-colors px-2"
            >
              {project.name}
              <ChevronDown className="h-3 w-3 inline ml-1 opacity-50" />
            </button>
          )}

          <div className="flex-1" />

          {/* Center - Transport Controls */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] rounded px-2 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-[#3a3a3a]" onClick={skipBack}>
                  <SkipBack className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Skip Back (←)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-7 w-7 rounded-full",
                    project.isPlaying ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-[#3a3a3a]"
                  )}
                  onClick={togglePlayPause}
                >
                  {project.isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play/Pause (Space)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-[#3a3a3a]" onClick={skipForward}>
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Skip Forward (→)</TooltipContent>
            </Tooltip>
            
            <div className="h-4 w-px bg-[#3a3a3a] mx-1" />
            
            <span className="text-[10px] font-mono text-gray-400 min-w-[90px]">
              {formatTime(project.currentTime)}
            </span>
          </div>

          <div className="flex-1" />

          {/* Right - Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#3a3a3a]" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Project</TooltipContent>
            </Tooltip>
            
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-3 text-xs hover:bg-[#3a3a3a]"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
            
            <Button 
              size="sm"
              className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="h-9 bg-[#252525] border-b border-[#3a3a3a] flex items-center px-3 gap-2">
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#3a3a3a]">
                  <Undo2 className="h-3.5 w-3.5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#3a3a3a]">
                  <Redo2 className="h-3.5 w-3.5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>
          
          <div className="h-5 w-px bg-[#3a3a3a]" />
          
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#3a3a3a]">
                  <Scissors className="h-3.5 w-3.5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split Clip</TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 hover:bg-[#3a3a3a]"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                >
                  <ZoomOut className="h-3.5 w-3.5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <span className="text-[10px] text-gray-500 min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 hover:bg-[#3a3a3a]"
                  onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                >
                  <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Media Library */}
          <div className="w-72 bg-[#1e1e1e] border-r border-[#3a3a3a] flex flex-col">
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

          {/* Center - Preview and Timeline */}
          <div className="flex-1 flex flex-col bg-[#1a1a1a]">
            {/* Preview */}
            <div className="flex-1 min-h-0 p-4">
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

            {/* Timeline */}
            <div className="h-64 border-t border-[#3a3a3a]">
              <Timeline
                duration={getTotalDuration() || 60}
                currentTime={project.currentTime}
                audioTracks={project.audioTracks}
                selectedClipId={selectedClipId}
                zoom={zoom}
                onSeek={setCurrentTime}
                onSelectClip={setSelectedClipId}
                onUpdateClip={updateAudioClip}
                onRemoveClip={removeAudioClip}
              />
            </div>
          </div>
        </div>

        {/* AI Panels */}
        <AIVoicePanel
          open={voicePanelOpen}
          onOpenChange={setVoicePanelOpen}
          onGenerated={handleVoiceGenerated}
        />
        <SFXPanel
          open={sfxPanelOpen}
          onOpenChange={setSfxPanelOpen}
          onGenerated={handleSFXGenerated}
        />
        <MusicPanel
          open={musicPanelOpen}
          onOpenChange={setMusicPanelOpen}
          onGenerated={handleMusicGenerated}
        />
      </div>
    </TooltipProvider>
  );
}
