import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Download, Trash2, Share2 } from "lucide-react";
import { useImageGeneration, GeneratedImage } from "@/hooks/useImageGeneration";
import { useToast } from "@/hooks/use-toast";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const { isGenerating, images, generateImage, deleteImage } = useImageGeneration();
  const { toast } = useToast();

  const handleGenerate = async () => {
    await generateImage(prompt);
    setPrompt("");
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const link = document.createElement("a");
      link.href = image.imageUrl;
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

  const handleShare = async (image: GeneratedImage) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out this AI-generated image!",
          text: image.prompt,
          url: image.imageUrl,
        });
      } else {
        await navigator.clipboard.writeText(image.imageUrl);
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
    <div className="space-y-8">
      {/* Input Section */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Create Image</h2>
        </div>
        
        <Textarea
          placeholder="Describe the image you want to create... Be creative and detailed!"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] bg-background/50 border-border/50 focus:border-primary resize-none"
          disabled={isGenerating}
        />
        
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full gradient-primary text-primary-foreground font-semibold h-12 glow-primary"
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

      {/* Gallery Section */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground/80">Your Creations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="glass rounded-2xl overflow-hidden group"
              >
                <div className="relative aspect-square">
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {image.prompt}
                      </p>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(image)}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleShare(image)}
                          className="flex-1"
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteImage(image.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !isGenerating && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Your generated images will appear here</p>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
