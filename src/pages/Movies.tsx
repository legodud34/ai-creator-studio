import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Film, Heart, MessageCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LikeButton } from "@/components/LikeButton";
import { CommentsSection } from "@/components/CommentsSection";
import { GenreFilter, Genre } from "@/components/GenreFilter";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoWithProfile {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
  duration_seconds: number | null;
  genre: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

const MIN_DURATION = 1800; // 30 minutes
const MAX_DURATION = 5400; // 90 minutes (1.5 hours)

const Movies = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithProfile | null>(null);
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
      .gt("duration_seconds", MIN_DURATION)
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient">Movies</h1>
            <p className="text-muted-foreground text-sm">Videos 30-90 minutes</p>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center py-12">
            <Film className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Loading movies...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No movies available yet</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Videos between 30-90 minutes will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {videos.map((video) => (
              <div
                key={video.id}
                className="glass rounded-2xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative aspect-[21/9] bg-muted">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white text-xl md:text-2xl font-bold line-clamp-2 mb-2">{video.prompt}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 border-2 border-white/30">
                          <AvatarImage src={video.profiles.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {video.profiles.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white/90">{video.profiles.username}</span>
                      </div>
                      {video.duration_seconds && (
                        <span className="text-white/70 text-sm">
                          {formatDuration(video.duration_seconds)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-white/70">
                        <Heart className="w-4 h-4" />
                        {likeCounts[video.id] || 0}
                      </span>
                      <span className="flex items-center gap-1 text-white/70">
                        <MessageCircle className="w-4 h-4" />
                        {commentCounts[video.id] || 0}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-12 h-12 text-white ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Link to={`/profile/${selectedVideo.profiles.username}`}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedVideo.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedVideo.profiles.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link
                      to={`/profile/${selectedVideo.profiles.username}`}
                      className="hover:underline block"
                    >
                      {selectedVideo.profiles.username}
                    </Link>
                    {selectedVideo.duration_seconds && (
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(selectedVideo.duration_seconds)}
                      </span>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <video
                  src={selectedVideo.url}
                  controls
                  autoPlay
                  className="w-full rounded-lg"
                />
                <p className="text-foreground/80 text-lg">{selectedVideo.prompt}</p>
                <div className="flex items-center gap-4">
                  <LikeButton videoId={selectedVideo.id} />
                </div>
                <CommentsSection videoId={selectedVideo.id} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Movies;
