import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Play, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingVideo {
  id: string;
  url: string;
  prompt: string;
  like_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const TrendingSection = () => {
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      // Get videos with like counts from the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: videosData, error } = await supabase
        .from("videos")
        .select(`
          id,
          url,
          prompt,
          profiles!videos_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq("is_public", true)
        .gte("created_at", oneWeekAgo.toISOString())
        .limit(10);

      if (error) {
        console.error("Error fetching trending:", error);
        setIsLoading(false);
        return;
      }

      // Get like counts for these videos
      const videoIds = videosData?.map(v => v.id) || [];
      
      if (videoIds.length === 0) {
        setVideos([]);
        setIsLoading(false);
        return;
      }

      const { data: likeCounts } = await supabase
        .from("likes")
        .select("video_id")
        .in("video_id", videoIds);

      // Count likes per video
      const likeMap = new Map<string, number>();
      likeCounts?.forEach(like => {
        if (like.video_id) {
          likeMap.set(like.video_id, (likeMap.get(like.video_id) || 0) + 1);
        }
      });

      // Sort by like count
      const sortedVideos = videosData
        ?.map(v => ({
          ...v,
          like_count: likeMap.get(v.id) || 0,
          profiles: v.profiles as { username: string; avatar_url: string | null }
        }))
        .sort((a, b) => b.like_count - a.like_count)
        .slice(0, 6) || [];

      setVideos(sortedVideos);
      setIsLoading(false);
    };

    fetchTrending();
  }, []);

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Trending</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Trending This Week</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {videos.map((video, index) => (
          <Link 
            key={video.id} 
            to="/shorts"
            className="group relative aspect-video rounded-lg overflow-hidden glass border border-border/50 hover:border-primary/50 transition-all"
          >
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Rank badge */}
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center text-xs font-bold text-primary-foreground">
              {index + 1}
            </div>

            {/* Play icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-10 h-10 text-white fill-white" />
            </div>

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{video.prompt}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/80 text-xs">@{video.profiles.username}</span>
                <div className="flex items-center gap-1 text-white/80">
                  <Heart className="w-3 h-3" />
                  <span className="text-xs">{video.like_count}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;
