import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Video, Loader2, Download, Trash2, Share2 } from "lucide-react";
import { useVideoGeneration, GeneratedVideo } from "@/hooks/useVideoGeneration";
import { useToast } from "@/hooks/use-toast";

const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const { isGenerating, progress, videos, generateVideo, deleteVideo } = useVideoGeneration();
  const { toast } = useToast();

  const handleGenerate = async () => {
    await generateVideo(prompt);
    setPrompt("");
  };

  const handleDownload = async (video: GeneratedVideo) => {
    try {
      const response = await fetch(video.videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `creative-ai-${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Video saved to your device.",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "Could not download the video.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (video: GeneratedVideo) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out this AI-generated video!",
          text: video.prompt,
          url: video.videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(video.videoUrl);
        toast({
          title: "Link copied!",
          description: "Video URL copied to clipboard.",
        });
      }
    } catch {
      // User cancelled share
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
                    src={video.videoUrl}
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
