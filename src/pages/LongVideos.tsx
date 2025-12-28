import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Video, Heart, MessageCircle, Play } from "lucide-react";
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

const MIN_DURATION = 600; // 10 minutes
const MAX_DURATION = 1800; // 30 minutes

const LongVideos = () => {
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
      
      // Sort by trending (like count) first
      const videoIds = formattedData.map((v: any) => v.id);
      if (videoIds.length > 0) {
        const { data: likesData } = await supabase
          .from("likes")
          .select("video_id")
          .in("video_id", videoIds);
        
        const likeMap = new Map<string, number>();
        likesData?.forEach((like) => {
          if (like.video_id) {
            likeMap.set(like.video_id, (likeMap.get(like.video_id) || 0) + 1);
          }
        });
        
        // Sort by likes (trending first)
        formattedData.sort((a: any, b: any) => {
          const aLikes = likeMap.get(a.id) || 0;
          const bLikes = likeMap.get(b.id) || 0;
          return bLikes - aLikes;
        });
        
        setVideos(formattedData);
        fetchEngagementCounts(videoIds);
      } else {
        setVideos(formattedData);
      }
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-accent">Long Videos</h1>
            <p className="text-muted-foreground text-sm">Videos 10-30 minutes</p>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No long videos available yet</p>
            <p className="text-sm text-muted-foreground/70 mt-2">Videos between 10-30 minutes will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="glass rounded-xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-accent/50 transition-all"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative aspect-video bg-muted">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-base font-medium line-clamp-2">{video.prompt}</p>
                  </div>
                  {video.duration_seconds && (
                    <span className="absolute top-3 right-3 text-sm bg-black/60 text-white px-2 py-1 rounded">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-20 h-20 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={video.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {video.profiles.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground/80">
                        {video.profiles.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {likeCounts[video.id] || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {commentCounts[video.id] || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Link to={`/profile/${selectedVideo.profiles.username}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedVideo.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedVideo.profiles.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link
                    to={`/profile/${selectedVideo.profiles.username}`}
                    className="hover:underline"
                  >
                    {selectedVideo.profiles.username}
                  </Link>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <video
                  src={selectedVideo.url}
                  controls
                  autoPlay
                  className="w-full rounded-lg"
                />
                <p className="text-foreground/80">{selectedVideo.prompt}</p>
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

export default LongVideos;
