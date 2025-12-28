import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, Grid, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShortsPlayer } from "@/components/ShortsPlayer";

interface VideoWithProfile {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  duration_seconds: number | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const MAX_DURATION = 300; // 5 minutes in seconds

const Shorts = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"player" | "grid">("player");
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select(`
        id, url, prompt, created_at, duration_seconds,
        profiles!videos_user_id_fkey (id, username, avatar_url)
      `)
      .eq("is_public", true)
      .lte("duration_seconds", MAX_DURATION)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formattedData = data.map((v: any) => ({
        ...v,
        profiles: v.profiles,
      }));
      setVideos(formattedData);
      fetchEngagementCounts(formattedData.map((v: any) => v.id));
    }
    setIsLoading(false);
  };

  const fetchEngagementCounts = async (videoIds: string[]) => {
    if (videoIds.length === 0) return;
    const [likesResult, commentsResult] = await Promise.all([
      supabase.from("likes").select("video_id").in("video_id", videoIds),
      supabase.from("comments").select("video_id").in("video_id", videoIds),
    ]);

    const likes: Record<string, number> = {};
    const comments: Record<string, number> = {};

    likesResult.data?.forEach((l) => {
      if (l.video_id) likes[l.video_id] = (likes[l.video_id] || 0) + 1;
    });
    commentsResult.data?.forEach((c) => {
      if (c.video_id) comments[c.video_id] = (comments[c.video_id] || 0) + 1;
    });

    setLikeCounts(likes);
    setCommentCounts(comments);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse text-white" />
          <p className="text-white/70">Loading shorts...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50 text-white" />
          <p className="text-white/70">No shorts available yet</p>
          <p className="text-sm text-white/50 mt-2">Be the first to create one!</p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (viewMode === "player") {
    return (
      <>
        {/* Back button overlay */}
        <div className="fixed top-4 left-4 z-50">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        
        {/* View mode toggle */}
        <div className="fixed top-4 right-4 z-50">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-5 h-5" />
          </Button>
        </div>

        <ShortsPlayer 
          videos={videos} 
          likeCounts={likeCounts} 
          commentCounts={commentCounts} 
        />
      </>
    );
  }

  // Grid view
  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gradient-accent">Shorts</h1>
              <p className="text-muted-foreground text-sm">Videos up to 5 minutes</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full"
            onClick={() => setViewMode("player")}
          >
            <Layers className="w-5 h-5" />
          </Button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="glass rounded-xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-accent/50 transition-all"
              onClick={() => setViewMode("player")}
            >
              <div className="relative aspect-[9/16] bg-muted">
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs line-clamp-2">{video.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Shorts;
