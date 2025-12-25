import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Trash2, Share2, Image, Video } from "lucide-react";
import { useGallery } from "@/contexts/GalleryContext";
import { useToast } from "@/hooks/use-toast";

const Gallery = () => {
  const { images, videos, deleteImage, deleteVideo } = useGallery();
  const { toast } = useToast();
  const totalItems = images.length + videos.length;

  const handleDownloadImage = async (imageUrl: string, id: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `creative-ai-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Downloaded!" });
  };

  const handleDownloadVideo = async (videoUrl: string, id: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `creative-ai-${id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded!" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleShare = async (url: string, prompt: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "AI Creation", text: prompt, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!" });
      }
    } catch {}
  };

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gallery</h1>
            <p className="text-sm text-muted-foreground">{totalItems} creation{totalItems !== 1 ? "s" : ""}</p>
          </div>
        </header>

        {totalItems === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="flex justify-center gap-2 mb-4">
              <Image className="w-8 h-8 opacity-50" />
              <Video className="w-8 h-8 opacity-50" />
            </div>
            <p>No creations yet</p>
            <Link to="/">
              <Button className="mt-4 gradient-primary text-primary-foreground">
                Start Creating
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Images Section */}
            {images.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Images ({images.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="glass rounded-xl overflow-hidden group">
                      <div className="aspect-square relative">
                        <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2 md:p-3 space-y-2">
                        <p className="text-xs text-foreground/70 line-clamp-1">{img.prompt}</p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={() => handleDownloadImage(img.imageUrl, img.id)}>
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={() => handleShare(img.imageUrl, img.prompt)}>
                            <Share2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => deleteImage(img.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Videos Section */}
            {videos.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-accent" />
                  Videos ({videos.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((vid) => (
                    <div key={vid.id} className="glass rounded-xl overflow-hidden">
                      <div className="aspect-video">
                        <video src={vid.videoUrl} controls playsInline className="w-full h-full object-contain bg-muted" />
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-sm text-foreground/70 line-clamp-1">{vid.prompt}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" className="flex-1 h-9" onClick={() => handleDownloadVideo(vid.videoUrl, vid.id)}>
                            <Download className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="secondary" className="flex-1 h-9" onClick={() => handleShare(vid.videoUrl, vid.prompt)}>
                            <Share2 className="w-4 h-4 mr-1" /> Share
                          </Button>
                          <Button size="sm" variant="destructive" className="h-9" onClick={() => deleteVideo(vid.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
