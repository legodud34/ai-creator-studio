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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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

const MIN_DURATION = 300; // 5 minutes
const MAX_DURATION = 600; // 10 minutes

const ShortVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithProfile | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [selectedGenre, setSelectedGenre] = useState<Genre>("All");

  useEffect(() => {
    fetchVideos();
  }, [selectedGenre]);

  const fetchVideos = async () => {
    setIsLoading(true);
    let query = supabase
      .from("videos")
      .select(`
        id, url, prompt, created_at, duration_seconds, genre,
        profiles!videos_user_id_fkey (id, username, avatar_url)
      `)
      .eq("is_public", true)
      .gt("duration_seconds", MIN_DURATION)
      .lte("duration_seconds", MAX_DURATION)
      .order("created_at", { ascending: false });

    if (selectedGenre !== "All") {
      query = query.eq("genre", selectedGenre);
    }

    const { data, error } = await query;

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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient">Short Videos</h1>
            <p className="text-muted-foreground text-sm">Videos 5-10 minutes</p>
          </div>
        </header>

        <div className="mb-6">
          <GenreFilter selectedGenre={selectedGenre} onGenreChange={setSelectedGenre} />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {selectedGenre === "All" 
                ? "No short videos available yet" 
                : `No ${selectedGenre} videos found`}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">Videos between 5-10 minutes will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="glass rounded-xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all"
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
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm line-clamp-2">{video.prompt}</p>
                  </div>
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                    {video.genre && (
                      <Badge variant="secondary" className="bg-black/60 text-white border-none">
                        {video.genre}
                      </Badge>
                    )}
                    {video.duration_seconds && (
                      <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded ml-auto">
                        {formatDuration(video.duration_seconds)}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={video.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {video.profiles.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground/80">
                        {video.profiles.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  {selectedVideo.genre && (
                    <Badge variant="outline" className="ml-2">
                      {selectedVideo.genre}
                    </Badge>
                  )}
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

export default ShortVideos;
