import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: () => void;
}

export const FollowButton = ({ targetUserId, onFollowChange }: FollowButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      setIsFollowing(!!data);
      setIsLoading(false);
    };

    checkFollowStatus();
  }, [user, targetUserId]);

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) {
        toast({ title: "Failed to unfollow", variant: "destructive" });
      } else {
        setIsFollowing(false);
        onFollowChange?.();
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) {
        toast({ title: "Failed to follow", variant: "destructive" });
      } else {
        setIsFollowing(true);
        onFollowChange?.();
      }
    }

    setIsLoading(false);
  };

  if (!user || user.id === targetUserId) return null;

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={isFollowing ? "" : "gradient-primary text-primary-foreground"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
};
