import { useState, useCallback, useRef } from 'react';

export interface AudioClip {
  id: string;
  type: 'voiceover' | 'sfx' | 'music';
  name: string;
  url: string;
  startTime: number;
  duration: number;
  volume: number;
  prompt?: string;
  voiceId?: string;
}

export interface VideoClip {
  id: string;
  url: string;
  startTime: number;
  duration: number;
  name: string;
  thumbnails?: string[]; // Filmstrip thumbnails
}

export interface SelectionRange {
  inPoint: number | null;
  outPoint: number | null;
}

export interface EditorProject {
  id?: string;
  name: string;
  videoUrl?: string;
  videoDuration: number;
  audioTracks: AudioClip[];
  videoTracks: VideoClip[];
  currentTime: number;
  isPlaying: boolean;
  selection: SelectionRange;
}

const initialProject: EditorProject = {
  name: 'Untitled Project',
  videoUrl: undefined,
  videoDuration: 0,
  audioTracks: [],
  videoTracks: [],
  currentTime: 0,
  isPlaying: false,
  selection: { inPoint: null, outPoint: null },
};

export function useEditorState() {
  const [project, setProject] = useState<EditorProject>(initialProject);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const setVideoUrl = useCallback((url: string) => {
    setProject(prev => ({ ...prev, videoUrl: url }));
  }, []);

  const setVideoDuration = useCallback((duration: number) => {
    setProject(prev => ({ ...prev, videoDuration: duration }));
  }, []);

  const setProjectName = useCallback((name: string) => {
    setProject(prev => ({ ...prev, name }));
  }, []);

  // Selection controls
  const setInPoint = useCallback((time: number | null) => {
    setProject(prev => ({
      ...prev,
      selection: { ...prev.selection, inPoint: time },
    }));
  }, []);

  const setOutPoint = useCallback((time: number | null) => {
    setProject(prev => ({
      ...prev,
      selection: { ...prev.selection, outPoint: time },
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setProject(prev => ({
      ...prev,
      selection: { inPoint: null, outPoint: null },
    }));
  }, []);

  const getSelectionDuration = useCallback(() => {
    const { inPoint, outPoint } = project.selection;
    if (inPoint !== null && outPoint !== null) {
      return Math.abs(outPoint - inPoint);
    }
    return 0;
  }, [project.selection]);

  const addAudioClip = useCallback((clip: Omit<AudioClip, 'id'>) => {
    const id = crypto.randomUUID();
    const newClip: AudioClip = { ...clip, id };
    setProject(prev => ({
      ...prev,
      audioTracks: [...prev.audioTracks, newClip],
    }));
    return id;
  }, []);

  const updateAudioClip = useCallback((id: string, updates: Partial<AudioClip>) => {
    setProject(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.map(clip =>
        clip.id === id ? { ...clip, ...updates } : clip
      ),
    }));
  }, []);

  const removeAudioClip = useCallback((id: string) => {
    // Clean up audio element
    const audioEl = audioRefs.current.get(id);
    if (audioEl) {
      audioEl.pause();
      audioEl.src = '';
      audioRefs.current.delete(id);
    }
    
    setProject(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.filter(clip => clip.id !== id),
    }));
    
    if (selectedClipId === id) {
      setSelectedClipId(null);
    }
  }, [selectedClipId]);

  const addVideoClip = useCallback((clip: Omit<VideoClip, 'id'>) => {
    const id = crypto.randomUUID();
    const newClip: VideoClip = { ...clip, id };
    setProject(prev => ({
      ...prev,
      videoTracks: [...prev.videoTracks, newClip],
    }));
    return id;
  }, []);

  const updateVideoClip = useCallback((id: string, updates: Partial<VideoClip>) => {
    setProject(prev => ({
      ...prev,
      videoTracks: prev.videoTracks.map(clip =>
        clip.id === id ? { ...clip, ...updates } : clip
      ),
    }));
  }, []);

  const removeVideoClip = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      videoTracks: prev.videoTracks.filter(clip => clip.id !== id),
    }));
    
    if (selectedClipId === id) {
      setSelectedClipId(null);
    }
  }, [selectedClipId]);

  // Split clip at playhead
  const splitVideoClipAtPlayhead = useCallback(() => {
    const { currentTime, videoTracks } = project;
    
    // Find clip under playhead
    const clipToSplit = videoTracks.find(clip => 
      currentTime > clip.startTime && currentTime < clip.startTime + clip.duration
    );
    
    if (!clipToSplit) return false;

    const splitPoint = currentTime - clipToSplit.startTime;
    
    // Update original clip to end at split point
    setProject(prev => ({
      ...prev,
      videoTracks: [
        ...prev.videoTracks.filter(c => c.id !== clipToSplit.id),
        {
          ...clipToSplit,
          duration: splitPoint,
        },
        {
          id: crypto.randomUUID(),
          url: clipToSplit.url,
          name: `${clipToSplit.name} (2)`,
          startTime: currentTime,
          duration: clipToSplit.duration - splitPoint,
          thumbnails: clipToSplit.thumbnails,
        },
      ].sort((a, b) => a.startTime - b.startTime),
    }));
    
    return true;
  }, [project]);

  const setCurrentTime = useCallback((time: number) => {
    setProject(prev => ({ ...prev, currentTime: time }));
    
    // Sync video
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const play = useCallback(() => {
    setProject(prev => ({ ...prev, isPlaying: true }));
    
    // Play video
    if (videoRef.current) {
      videoRef.current.play();
    }
    
    // Play audio clips that should be playing at current time
    project.audioTracks.forEach(clip => {
      const audioEl = audioRefs.current.get(clip.id);
      if (audioEl && project.currentTime >= clip.startTime && 
          project.currentTime < clip.startTime + clip.duration) {
        audioEl.currentTime = project.currentTime - clip.startTime;
        audioEl.volume = clip.volume;
        audioEl.play();
      }
    });
  }, [project.audioTracks, project.currentTime]);

  const pause = useCallback(() => {
    setProject(prev => ({ ...prev, isPlaying: false }));
    
    // Pause video
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    // Pause all audio
    audioRefs.current.forEach(audioEl => {
      audioEl.pause();
    });
  }, []);

  const togglePlayPause = useCallback(() => {
    if (project.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [project.isPlaying, play, pause]);

  const registerAudioElement = useCallback((id: string, element: HTMLAudioElement) => {
    audioRefs.current.set(id, element);
  }, []);

  const unregisterAudioElement = useCallback((id: string) => {
    audioRefs.current.delete(id);
  }, []);

  const getTotalDuration = useCallback(() => {
    let maxDuration = project.videoDuration;
    project.audioTracks.forEach(clip => {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd;
      }
    });
    project.videoTracks.forEach(clip => {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd;
      }
    });
    return maxDuration;
  }, [project.videoDuration, project.audioTracks, project.videoTracks]);

  const resetProject = useCallback(() => {
    // Clean up all audio elements
    audioRefs.current.forEach(audioEl => {
      audioEl.pause();
      audioEl.src = '';
    });
    audioRefs.current.clear();
    
    setProject(initialProject);
    setSelectedClipId(null);
  }, []);

  return {
    project,
    selectedClipId,
    setSelectedClipId,
    videoRef,
    audioRefs,
    setVideoUrl,
    setVideoDuration,
    setProjectName,
    setInPoint,
    setOutPoint,
    clearSelection,
    getSelectionDuration,
    addAudioClip,
    updateAudioClip,
    removeAudioClip,
    addVideoClip,
    updateVideoClip,
    removeVideoClip,
    splitVideoClipAtPlayhead,
    setCurrentTime,
    play,
    pause,
    togglePlayPause,
    registerAudioElement,
    unregisterAudioElement,
    getTotalDuration,
    resetProject,
  };
}
