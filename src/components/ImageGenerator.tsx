import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Download, Trash2, Share2 } from "lucide-react";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useToast } from "@/hooks/use-toast";
import { GalleryImage } from "@/contexts/GalleryContext";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const { isGenerating, images, generateImage, deleteImage } = useImageGeneration();
  const { toast } = useToast();

  const handleGenerate = async () => {
    await generateImage(prompt);
    setPrompt("");
  };

  const handleDownload = async (image: GalleryImage) => {
    try {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `creative-ai-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Downloaded!",
        description: "Image saved to your device.",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "Could not download the image.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (image: GalleryImage) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out this AI-generated image!",
          text: image.prompt,
        });
      } else {
        await navigator.clipboard.writeText(image.url);
        toast({
          title: "Link copied!",
          description: "Image URL copied to clipboard.",
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
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-base md:text-lg font-semibold">Create Image</h2>
        </div>
        
        <Textarea
          placeholder="Describe the image you want to create..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] md:min-h-[120px] bg-background/50 border-border/50 focus:border-primary resize-none text-base"
          disabled={isGenerating}
        />
        
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full gradient-primary text-primary-foreground font-semibold h-11 md:h-12 glow-primary"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Image
            </>
          )}
        </Button>
      </div>

      {/* Latest Image Section */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-foreground/80">Your Creation</h3>
          
          <div className="glass rounded-2xl overflow-hidden">
            <div className="relative aspect-square">
              <img
                src={images[0].url}
                alt={images[0].prompt}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-sm text-foreground/80 line-clamp-2">
                {images[0].prompt}
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(images[0])}
                  className="flex-1 h-10"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleShare(images[0])}
                  className="flex-1 h-10"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteImage(images[0].id)}
                  className="h-10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !isGenerating && (
        <div className="text-center py-8 md:py-12 text-muted-foreground">
          <Sparkles className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm md:text-base">Your generated images will appear here</p>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
