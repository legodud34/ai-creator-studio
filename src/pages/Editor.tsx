import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorState, type AudioClip } from '@/hooks/useEditorState';
import { PreviewPlayer } from '@/components/editor/PreviewPlayer';
import { Timeline } from '@/components/editor/Timeline';
import { MediaLibrary } from '@/components/editor/MediaLibrary';
import { AIVoicePanel } from '@/components/editor/AIVoicePanel';
import { SFXPanel } from '@/components/editor/SFXPanel';
import { MusicPanel } from '@/components/editor/MusicPanel';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import afterglowLogo from '@/assets/afterglow-logo.png';

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, selectedClipId, removeAudioClip]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <img src={afterglowLogo} alt="Afterglow" className="h-8" />
          
          <div className="h-6 w-px bg-border" />
          
          {isEditingName ? (
            <Input
              value={project.name}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="w-48 h-8"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {project.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Media Library */}
        <div className="w-72 border-r border-border/50 p-3">
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
        <div className="flex-1 flex flex-col p-3 gap-3">
          {/* Preview */}
          <div className="flex-1 min-h-0">
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
          <div className="h-56 flex-shrink-0">
            <Timeline
              duration={getTotalDuration() || 60}
              currentTime={project.currentTime}
              audioTracks={project.audioTracks}
              selectedClipId={selectedClipId}
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
  );
}
