import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Image, Video, Users, Loader2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface PublicImage {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface PublicVideo {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

const Explore = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("images");
  const [isLoading, setIsLoading] = useState(true);
  
  const [images, setImages] = useState<PublicImage[]>([]);
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);

      const [imagesResult, videosResult, usersResult] = await Promise.all([
        supabase
          .from("images")
          .select("*, profiles(username, avatar_url)")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("videos")
          .select("*, profiles(username, avatar_url)")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setImages((imagesResult.data || []) as PublicImage[]);
      setVideos((videosResult.data || []) as PublicVideo[]);
      setUsers(usersResult.data || []);
      setIsLoading(false);
    };

    fetchContent();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredImages = images.filter((img) =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVideos = videos.filter((vid) =>
    vid.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vid.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Explore</h1>
          </div>
          
          {user && profile && (
            <Link to={`/profile/${profile.username}`}>
              <Avatar className="w-10 h-10 border border-primary/50 hover:border-primary transition-colors cursor-pointer">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search users, images, videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-12"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-12 p-1 glass mb-6">
            <TabsTrigger
              value="images"
              className="h-full text-sm data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Image className="w-4 h-4 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="h-full text-sm data-[state=active]:gradient-accent data-[state=active]:text-accent-foreground rounded-lg"
            >
              <Video className="w-4 h-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="h-full text-sm data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="images">
                {filteredImages.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No public images yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredImages.map((img) => (
                      <Link
                        key={img.id}
                        to={`/profile/${img.profiles.username}`}
                        className="glass rounded-xl overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all"
                      >
                        <div className="aspect-square">
                          <img
                            src={img.url}
                            alt={img.prompt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={img.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/20">
                                {img.profiles.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              @{img.profiles.username}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/70 line-clamp-1 mt-1">
                            {img.prompt}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="videos">
                {filteredVideos.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No public videos yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredVideos.map((vid) => (
                      <div key={vid.id} className="glass rounded-xl overflow-hidden">
                        <div className="aspect-video">
                          <video
                            src={vid.url}
                            controls
                            playsInline
                            className="w-full h-full object-contain bg-muted"
                          />
                        </div>
                        <div className="p-3">
                          <Link
                            to={`/profile/${vid.profiles.username}`}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={vid.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/20">
                                {vid.profiles.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">
                              @{vid.profiles.username}
                            </span>
                          </Link>
                          <p className="text-sm text-foreground/70 line-clamp-1 mt-2">
                            {vid.prompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((u) => (
                      <Link
                        key={u.id}
                        to={`/profile/${u.username}`}
                        className="flex items-center gap-4 p-4 glass rounded-xl hover:ring-2 hover:ring-primary/50 transition-all"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {u.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">@{u.username}</p>
                          {u.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {u.bio}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Explore;
