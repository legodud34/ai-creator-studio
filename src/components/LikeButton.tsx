import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  imageId?: string;
  videoId?: string;
}

export const LikeButton = ({ imageId, videoId }: LikeButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLikes = async () => {
      // Get like count
      const query = supabase.from("likes").select("id", { count: "exact" });
      if (imageId) query.eq("image_id", imageId);
      if (videoId) query.eq("video_id", videoId);
      
      const { count } = await query;
      setLikeCount(count || 0);

      // Check if user liked
      if (user) {
        const userQuery = supabase.from("likes").select("id").eq("user_id", user.id);
        if (imageId) userQuery.eq("image_id", imageId);
        if (videoId) userQuery.eq("video_id", videoId);
        
        const { data } = await userQuery.maybeSingle();
        setIsLiked(!!data);
      }
    };

    fetchLikes();
  }, [imageId, videoId, user]);

  const handleToggleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like content.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (isLiked) {
      const query = supabase.from("likes").delete().eq("user_id", user.id);
      if (imageId) query.eq("image_id", imageId);
      if (videoId) query.eq("video_id", videoId);
      
      const { error } = await query;
      if (!error) {
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      }
    } else {
      const insertData: { user_id: string; image_id?: string; video_id?: string } = { user_id: user.id };
      if (imageId) insertData.image_id = imageId;
      if (videoId) insertData.video_id = videoId;
      
      const { error } = await supabase.from("likes").insert(insertData);
      if (!error) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    }

    setIsLoading(false);
  };

  return (
    <button
      onClick={handleToggleLike}
      disabled={isLoading}
      className="flex items-center gap-1 text-sm transition-colors hover:text-primary"
    >
      <Heart
        className={cn(
          "w-5 h-5 transition-all",
          isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
      />
      <span className={cn(isLiked ? "text-red-500" : "text-muted-foreground")}>
        {likeCount}
      </span>
    </button>
  );
};
