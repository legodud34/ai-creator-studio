import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Image, Mic, Video, LayoutGrid } from "lucide-react";
import ImageGenerator from "@/components/ImageGenerator";
import VideoGenerator from "@/components/VideoGenerator";
import VoiceChat from "@/components/VoiceChat";
import { useGallery } from "@/contexts/GalleryContext";
import afterglowLogo from "@/assets/afterglow-logo.png";

const Index = () => {
  const [activeTab, setActiveTab] = useState("images");
  const { images, videos } = useGallery();
  const totalItems = images.length + videos.length;

  return (
    <div className="min-h-screen gradient-surface">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-8 md:mb-12">
          <div className="flex justify-end mb-4">
            <Link to="/gallery">
              <Button variant="outline" size="sm" className="glass border-border/50 h-9">
                <LayoutGrid className="w-4 h-4 mr-1" />
                Gallery
                {totalItems > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>

          <div className="text-center space-y-4">
            <img 
              src={afterglowLogo} 
              alt="Afterglow AI" 
              className="h-12 md:h-16 mx-auto"
            />

            <h1 className="text-3xl md:text-5xl font-bold">
              <span className="text-gradient">Build</span>{" "}
              <span className="text-foreground">the future</span>
              <br />
              <span className="text-foreground">of entertainment</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto px-4">
              Generate images, videos, and have creative voice conversations.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-12 md:h-14 p-1 glass">
            <TabsTrigger
              value="images"
              className="h-full text-xs md:text-sm font-medium data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <Image className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Images</span>
              <span className="sm:hidden">Img</span>
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="h-full text-xs md:text-sm font-medium data-[state=active]:gradient-accent data-[state=active]:text-accent-foreground rounded-lg transition-all"
            >
              <Video className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Videos</span>
              <span className="sm:hidden">Vid</span>
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="h-full text-xs md:text-sm font-medium data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground rounded-lg transition-all"
            >
              <Mic className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Voice</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-6 md:mt-8">
            <ImageGenerator />
          </TabsContent>

          <TabsContent value="videos" className="mt-6 md:mt-8">
            <VideoGenerator />
          </TabsContent>

          <TabsContent value="voice" className="mt-6 md:mt-8">
            <VoiceChat />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 md:mt-16 text-center text-xs md:text-sm text-muted-foreground pb-6">
          <p>Powered by AI</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
