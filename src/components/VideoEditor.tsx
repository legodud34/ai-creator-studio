import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import { useGallery } from "@/contexts/GalleryContext";
import { useNavigate } from "react-router-dom";
import {
  Wand2,
  Film,
  Sparkles,
  Flame,
  CloudRain,
  Clapperboard,
  Palette,
  Zap,
  X,
  Check,
  Download,
  Share2,
  Loader2,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EffectPreset {
  id: string;
  name: string;
  prompt: string;
  icon: React.ReactNode;
}

const effectPresets: EffectPreset[] = [
  {
    id: "cinematic",
    name: "Cinematic",
    prompt: "Transform into a cinematic Hollywood movie style with dramatic lighting, film grain, and epic color grading",
    icon: <Clapperboard className="w-4 h-4" />,
  },
  {
    id: "anime",
    name: "Anime",
    prompt: "Convert to anime style animation with vibrant colors, cel shading, and Japanese animation aesthetics",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: "explosion",
    name: "CGI Explosion",
    prompt: "Add dramatic CGI explosions, fire, and debris effects in the background with realistic lighting",
    icon: <Flame className="w-4 h-4" />,
  },
  {
    id: "storm",
    name: "Storm Effects",
    prompt: "Add intense rain, lightning, and storm effects with dramatic weather and atmosphere",
    icon: <CloudRain className="w-4 h-4" />,
  },
  {
    id: "neon",
    name: "Neon Cyberpunk",
    prompt: "Transform into cyberpunk style with neon lights, futuristic city vibes, and glowing effects",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "vintage",
    name: "Vintage VHS",
    prompt: "Apply vintage 80s VHS look with scan lines, color bleeding, and retro film effects",
    icon: <Film className="w-4 h-4" />,
  },
  {
    id: "painting",
    name: "Oil Painting",
    prompt: "Transform into a moving oil painting with visible brush strokes and artistic canvas texture",
    icon: <Palette className="w-4 h-4" />,
  },
];

export const VideoEditor = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const { isEditing, progress, editVideo } = useVideoEditor();
  const { videos } = useGallery();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectPreset = (preset: EffectPreset) => {
    setSelectedPreset(preset.id);
    setPrompt(preset.prompt);
  };

  const handleEdit = async () => {
    if (!selectedVideo) {
      toast({
        title: "No video selected",
        description: "Please select a video from your gallery to edit",
        variant: "destructive",
      });
      return;
    }

    const result = await editVideo(selectedVideo, prompt);

    if (result.insufficientCredits) {
      navigate("/credits");
      return;
    }

    if (result.success && result.video) {
      setEditedVideoUrl(result.video.videoUrl);
    }
  };

  const handleDownload = async () => {
    if (!editedVideoUrl) return;

    try {
      const response = await fetch(editedVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the video",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!editedVideoUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out my AI-edited video!",
          url: editedVideoUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(editedVideoUrl);
          toast({ title: "Link copied to clipboard!" });
        }
      }
    } else {
      await navigator.clipboard.writeText(editedVideoUrl);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  const handleClearEdit = () => {
    setEditedVideoUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Source Video Selection */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          Select Video to Edit
        </h3>

        {videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No videos in your gallery yet.</p>
            <p className="text-sm">Generate some videos first, then come back to edit them!</p>
          </div>
        ) : (
          <ScrollArea className="h-32">
            <div className="flex gap-3 pb-2">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => {
                    setSelectedVideo(video.url);
                    setSelectedVideoId(video.id);
                  }}
                  className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedVideoId === video.id
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-transparent hover:border-primary/50"
                  }`}
                >
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  {selectedVideoId === video.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedVideo && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Selected video preview:</p>
            <video
              src={selectedVideo}
              controls
              className="w-full max-w-md rounded-lg mx-auto"
            />
          </div>
        )}
      </div>

      {/* Effect Presets */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Effects & CGI
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {effectPresets.map((preset) => (
            <Button
              key={preset.id}
              variant={selectedPreset === preset.id ? "default" : "outline"}
              className={`h-auto py-3 flex flex-col gap-1 ${
                selectedPreset === preset.id ? "gradient-primary" : ""
              }`}
              onClick={() => handleSelectPreset(preset)}
            >
              {preset.icon}
              <span className="text-xs">{preset.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          Edit Instructions
        </h3>
        <Textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setSelectedPreset(null);
          }}
          placeholder="Describe how you want to transform the video... e.g., 'Add a dragon flying in the background' or 'Make it look like it's underwater'"
          className="min-h-24 bg-background/50"
        />
      </div>

      {/* Progress */}
      {isEditing && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>AI is editing your video... This may take 2-5 minutes</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {progress < 10 && "Initializing..."}
            {progress >= 10 && progress < 50 && "Processing video frames..."}
            {progress >= 50 && progress < 90 && "Applying AI transformations..."}
            {progress >= 90 && "Finalizing..."}
          </p>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleEdit}
        disabled={isEditing || !selectedVideo || !prompt.trim()}
        className="w-full h-14 text-lg gradient-primary"
      >
        {isEditing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Editing Video...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5 mr-2" />
            Apply AI Edit (20 credits)
          </>
        )}
      </Button>

      {/* Edited Result */}
      {editedVideoUrl && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Edited Video
            </h3>
            <Button variant="ghost" size="icon" onClick={handleClearEdit}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <video
            src={editedVideoUrl}
            controls
            autoPlay
            loop
            className="w-full rounded-lg mb-4"
          />

          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleShare} variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
