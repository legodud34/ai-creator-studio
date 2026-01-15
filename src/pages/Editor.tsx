import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Download, RotateCcw, Play, Pause, 
  SkipBack, SkipForward, Scissors, Undo2, Redo2,
  ChevronDown, Keyboard, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditorState, type AudioClip } from '@/hooks/useEditorState';
import { PreviewPlayer } from '@/components/editor/PreviewPlayer';
import { Timeline } from '@/components/editor/Timeline';
import { MediaLibrary } from '@/components/editor/MediaLibrary';
import { AIVoicePanel } from '@/components/editor/AIVoicePanel';
import { SFXPanel } from '@/components/editor/SFXPanel';
import { MusicPanel } from '@/components/editor/MusicPanel';
import { InspectorPanel } from '@/components/editor/InspectorPanel';
import { EffectsBrowser } from '@/components/editor/EffectsBrowser';
import { ColorGrading } from '@/components/editor/ColorGrading';
import { AudioMeter } from '@/components/editor/AudioMeter';
import { ToolPalette, type EditorTool } from '@/components/editor/ToolPalette';
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [snapping, setSnapping] = useState(true);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [rightPanel, setRightPanel] = useState<'inspector' | 'effects' | 'color'>('inspector');

  const selectedClip = project.audioTracks.find(c => c.id === selectedClipId) || null;

  const handleVideoUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setProjectName(file.name.replace(/\.[^/.]+$/, ''));
    toast.success('Video loaded');
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
    toast.success(`Added ${asset.name} to timeline`);
  }, [addAudioClip, project.currentTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlayPause(); break;
        case 'Delete': if (selectedClipId) removeAudioClip(selectedClipId); break;
        case 'ArrowLeft': e.preventDefault(); setCurrentTime(Math.max(0, project.currentTime - 5)); break;
        case 'ArrowRight': e.preventDefault(); setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 5)); break;
        case 'KeyV': setActiveTool('select'); break;
        case 'KeyH': setActiveTool('hand'); break;
        case 'KeyB': setActiveTool('blade'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, selectedClipId, removeAudioClip, project.currentTime, getTotalDuration, setCurrentTime]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-[#161616] text-white overflow-hidden">
        {/* Top Menu Bar */}
        <header className="h-10 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center px-2 gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 px-2 text-xs text-gray-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Exit
          </Button>
          
          <div className="h-4 w-px bg-[#3a3a3a] mx-1" />
          
          {isEditingName ? (
            <Input value={project.name} onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="w-48 h-7 text-xs bg-[#0a0a0a] border-[#3a3a3a]" autoFocus />
          ) : (
            <button onClick={() => setIsEditingName(true)} className="text-xs font-medium text-gray-300 hover:text-white px-2">
              {project.name}<ChevronDown className="h-3 w-3 inline ml-1 opacity-50" />
            </button>
          )}

          <div className="flex-1" />

          {/* Transport Controls */}
          <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg px-3 py-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentTime(Math.max(0, project.currentTime - 5))}>
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", project.isPlaying && "bg-primary/20")} onClick={togglePlayPause}>
              {project.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentTime(Math.min(getTotalDuration(), project.currentTime + 5))}>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-[#3a3a3a] mx-2" />
            <span className="text-[11px] font-mono text-primary min-w-[100px]">{formatTime(project.currentTime)}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { resetProject(); setAudioAssets([]); toast.success('Reset'); }}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-3 text-xs"><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
            <Button size="sm" className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="h-8 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-3 gap-2">
          <div className="flex items-center gap-0.5">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Undo2 className="h-3.5 w-3.5 text-gray-500" /></Button></TooltipTrigger><TooltipContent>Undo</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Redo2 className="h-3.5 w-3.5 text-gray-500" /></Button></TooltipTrigger><TooltipContent>Redo</TooltipContent></Tooltip>
          </div>
          <div className="h-4 w-px bg-[#3a3a3a]" />
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Scissors className="h-3.5 w-3.5 text-gray-500" /></Button></TooltipTrigger><TooltipContent>Split (B)</TooltipContent></Tooltip>
          <div className="flex-1" />
          <span className="text-[9px] text-gray-600">Tool: {activeTool}</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tool Palette */}
          <ToolPalette activeTool={activeTool} onToolChange={setActiveTool} />

          {/* Left Panel - Media & Effects */}
          <div className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
            <Tabs defaultValue="media" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 h-8 bg-[#222] rounded-none border-b border-[#2a2a2a]">
                <TabsTrigger value="media" className="text-[10px] rounded-none data-[state=active]:bg-[#2a2a2a]">Media</TabsTrigger>
                <TabsTrigger value="effects" className="text-[10px] rounded-none data-[state=active]:bg-[#2a2a2a]">Effects</TabsTrigger>
              </TabsList>
              <TabsContent value="media" className="flex-1 m-0">
                <MediaLibrary videoUrl={project.videoUrl} audioAssets={audioAssets} onVideoUpload={handleVideoUpload}
                  onOpenVoicePanel={() => setVoicePanelOpen(true)} onOpenSFXPanel={() => setSfxPanelOpen(true)}
                  onOpenMusicPanel={() => setMusicPanelOpen(true)} onAddClipToTimeline={handleAddClipToTimeline} />
              </TabsContent>
              <TabsContent value="effects" className="flex-1 m-0"><EffectsBrowser /></TabsContent>
            </Tabs>
          </div>

          {/* Center - Preview and Timeline */}
          <div className="flex-1 flex flex-col bg-[#0a0a0a]">
            <div className="flex-1 min-h-0 p-3 flex gap-3">
              {/* Preview */}
              <div className="flex-1"><PreviewPlayer videoUrl={project.videoUrl} currentTime={project.currentTime} isPlaying={project.isPlaying}
                onTimeUpdate={setCurrentTime} onDurationChange={setVideoDuration} onPlayPause={togglePlayPause} videoRef={videoRef} /></div>
              
              {/* Audio Meter */}
              <div className="w-8 bg-[#1a1a1a] rounded-lg p-1">
                <AudioMeter isPlaying={project.isPlaying} volume={1} />
              </div>
            </div>

            {/* Timeline */}
            <div className="h-56 border-t border-[#2a2a2a]">
              <Timeline duration={getTotalDuration() || 60} currentTime={project.currentTime} audioTracks={project.audioTracks}
                selectedClipId={selectedClipId} zoom={zoom} isPlaying={project.isPlaying} snapping={snapping}
                onSeek={setCurrentTime} onSelectClip={setSelectedClipId} onUpdateClip={updateAudioClip}
                onRemoveClip={removeAudioClip} onZoomChange={setZoom} onSnappingChange={setSnapping} />
            </div>
          </div>

          {/* Right Panel - Inspector/Color */}
          <div className="w-64 bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col">
            <Tabs value={rightPanel} onValueChange={(v) => setRightPanel(v as any)} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 h-8 bg-[#222] rounded-none border-b border-[#2a2a2a]">
                <TabsTrigger value="inspector" className="text-[10px] rounded-none data-[state=active]:bg-[#2a2a2a]">Inspector</TabsTrigger>
                <TabsTrigger value="color" className="text-[10px] rounded-none data-[state=active]:bg-[#2a2a2a]">Color</TabsTrigger>
              </TabsList>
              <TabsContent value="inspector" className="flex-1 m-0"><InspectorPanel selectedClip={selectedClip} onUpdateClip={updateAudioClip} /></TabsContent>
              <TabsContent value="color" className="flex-1 m-0"><ColorGrading /></TabsContent>
            </Tabs>
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
