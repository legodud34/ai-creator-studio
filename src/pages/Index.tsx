import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Image, Mic, Video, LayoutGrid, Compass, LogIn, Zap, PlayCircle, Clock, Film } from "lucide-react";
import ImageGenerator from "@/components/ImageGenerator";
import VideoGenerator from "@/components/VideoGenerator";
import VoiceChat from "@/components/VoiceChat";
import { useGallery } from "@/contexts/GalleryContext";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [activeTab, setActiveTab] = useState("images");
  const { images, videos } = useGallery();
  const { user, profile } = useAuth();
  const totalItems = images.length + videos.length;

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6 md:py-8">
        <header className="mb-8 md:mb-12">
          <div className="flex justify-end gap-2 mb-4">
            <Link to="/explore">
              <Button variant="outline" size="sm" className="glass border-border/50 h-9">
                <Compass className="w-4 h-4 mr-1" />
                Explore
              </Button>
            </Link>
            {user ? (
              <>
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
                <Link to={`/profile/${profile?.username}`}>
                  <Avatar className="w-9 h-9 border border-primary/50 hover:border-primary transition-colors cursor-pointer">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {profile?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="glass border-border/50 h-9">
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Video Category Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <Link to="/shorts">
              <Button variant="ghost" size="sm" className="glass border border-accent/30 hover:border-accent/60 text-accent">
                <Zap className="w-4 h-4 mr-1" />
                Shorts
              </Button>
            </Link>
            <Link to="/short-videos">
              <Button variant="ghost" size="sm" className="glass border border-primary/30 hover:border-primary/60 text-primary">
                <PlayCircle className="w-4 h-4 mr-1" />
                Short Videos
              </Button>
            </Link>
            <Link to="/long-videos">
              <Button variant="ghost" size="sm" className="glass border border-accent/30 hover:border-accent/60 text-accent">
                <Clock className="w-4 h-4 mr-1" />
                Long Videos
              </Button>
            </Link>
            <Link to="/movies">
              <Button variant="ghost" size="sm" className="glass border border-primary/30 hover:border-primary/60 text-primary">
                <Film className="w-4 h-4 mr-1" />
                Movies
              </Button>
            </Link>
          </div>

          <div className="text-center space-y-4">
            <h1 className={`text-5xl md:text-7xl font-bold py-2 px-4 transition-all duration-500 ${
              activeTab === "images" 
                ? "text-afterglow" 
                : activeTab === "videos" 
                  ? "text-afterglow-accent" 
                  : "text-afterglow-voice"
            }`}>
              Afterglow AI
            </h1>

            <h1 className="text-3xl md:text-5xl font-bold">
              <span className={`transition-all duration-500 ${
                activeTab === "images" 
                  ? "text-gradient" 
                  : activeTab === "videos" 
                    ? "text-gradient-accent" 
                    : "text-gradient-voice"
              }`}>Build</span>{" "}
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
              className="h-full text-xs md:text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-400 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_hsl(140,70%,50%/0.5)] rounded-lg transition-all"
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
