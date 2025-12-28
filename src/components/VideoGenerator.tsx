import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Loader2, Download, Trash2, Share2, Clock } from "lucide-react";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useToast } from "@/hooks/use-toast";
import { GalleryVideo } from "@/contexts/GalleryContext";

const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [durationValue, setDurationValue] = useState("5");
  const [durationUnit, setDurationUnit] = useState<"seconds" | "minutes">("seconds");
  const { isGenerating, progress, videos, generateVideo, deleteVideo } = useVideoGeneration();
  const { toast } = useToast();

  const handleGenerate = async () => {
    const value = parseInt(durationValue) || 5;
    const durationSeconds = durationUnit === "minutes" ? value * 60 : value;
    
    if (durationSeconds < 5 || durationSeconds > 600) {
      toast({
        title: "Invalid duration",
        description: "Duration must be between 5 seconds and 10 minutes.",
        variant: "destructive",
      });
      return;
    }
    
    await generateVideo(prompt, "16:9", durationSeconds);
    setPrompt("");
  };

  const handleDownload = async (video: GalleryVideo) => {
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const file = new File([blob], `ai-video-${video.id}.mp4`, { type: 'video/mp4' });

      // On mobile, use share API to allow saving to photos/files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Save Video',
        });
        toast({
          title: "Saved!",
          description: "Video saved to your device.",
        });
      } else {
        // Desktop fallback - trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ai-video-${video.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Downloaded!",
          description: "Video saved to your device.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // User cancelled
      }
      toast({
        title: "Save failed",
        description: "Could not save the video.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (video: GalleryVideo) => {
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const file = new File([blob], `ai-video-${video.id}.mp4`, { type: 'video/mp4' });

      // Try sharing as file first (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Check out this AI-generated video!",
          text: video.prompt,
        });
      } else if (navigator.share) {
        // Fallback to URL share
        await navigator.share({
          title: "Check out this AI-generated video!",
          text: video.prompt,
          url: video.url,
        });
      } else {
        // Desktop fallback - copy URL
        await navigator.clipboard.writeText(video.url);
        toast({
          title: "Link copied!",
          description: "Video URL copied to clipboard.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // User cancelled
      }
      toast({
        title: "Share failed",
        description: "Could not share the video.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Input Section */}
      <div className="glass rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Video className="w-5 h-5" />
          <h2 className="text-base md:text-lg font-semibold">Create Video</h2>
        </div>

        <Textarea
          placeholder="Describe the video you want to create... Be descriptive about motion and action!"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] md:min-h-[120px] bg-background/50 border-border/50 focus:border-accent resize-none text-base"
          disabled={isGenerating}
        />

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Duration
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="duration"
              type="number"
              min={durationUnit === "seconds" ? "5" : "1"}
              max={durationUnit === "seconds" ? "600" : "10"}
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              className="flex-1 bg-background/50 border-border/50"
              disabled={isGenerating}
            />
            <div className="flex rounded-lg overflow-hidden border border-border/50">
              <button
                type="button"
                onClick={() => {
                  if (durationUnit === "minutes") {
                    const mins = parseInt(durationValue) || 1;
                    setDurationValue(String(mins * 60));
                  }
                  setDurationUnit("seconds");
                }}
                className={`px-3 py-2 text-sm transition-colors ${
                  durationUnit === "seconds"
                    ? "bg-accent text-accent-foreground"
                    : "bg-background/50 text-muted-foreground hover:bg-muted"
                }`}
                disabled={isGenerating}
              >
                Sec
              </button>
              <button
                type="button"
                onClick={() => {
                  if (durationUnit === "seconds") {
                    const secs = parseInt(durationValue) || 5;
                    setDurationValue(String(Math.max(1, Math.round(secs / 60))));
                  }
                  setDurationUnit("minutes");
                }}
                className={`px-3 py-2 text-sm transition-colors ${
                  durationUnit === "minutes"
                    ? "bg-accent text-accent-foreground"
                    : "bg-background/50 text-muted-foreground hover:bg-muted"
                }`}
                disabled={isGenerating}
              >
                Min
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">5 sec - 10 min</p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full gradient-accent text-accent-foreground font-semibold h-11 md:h-12 glow-accent"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {progress || "Generating..."}
            </>
          ) : (
            <>
              <Video className="w-5 h-5 mr-2" />
              Generate Video
            </>
          )}
        </Button>

        {isGenerating && (
          <p className="text-sm text-muted-foreground text-center">
            Video generation typically takes 1-2 minutes. Please wait...
          </p>
        )}
      </div>

      {/* Gallery Section */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-foreground/80">Your Videos</h3>

          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {videos.map((video) => (
              <div key={video.id} className="glass rounded-2xl overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  <video
                    src={video.url}
                    controls
                    className="w-full h-full object-contain"
                    playsInline
                  />
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-sm text-foreground/80 line-clamp-2">{video.prompt}</p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(video)}
                      className="flex-1 h-10"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleShare(video)}
                      className="flex-1 h-10"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteVideo(video.id)}
                      className="h-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && !isGenerating && (
        <div className="text-center py-8 md:py-12 text-muted-foreground">
          <Video className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm md:text-base">Your generated videos will appear here</p>
          <p className="text-xs mt-2 opacity-70">Powered by Luma AI</p>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
