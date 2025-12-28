import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentsSectionProps {
  imageId?: string;
  videoId?: string;
  isExpanded?: boolean;
}

export const CommentsSection = ({ imageId, videoId, isExpanded = false }: CommentsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(isExpanded);

  useEffect(() => {
    fetchComments();
  }, [imageId, videoId]);

  const fetchComments = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        user_id,
        profile:profiles!user_id(username, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (imageId) query = query.eq("image_id", imageId);
    if (videoId) query = query.eq("video_id", videoId);

    const { data, error } = await query;

    if (!error && data) {
      const formattedComments = data.map((c: any) => ({
        ...c,
        profile: Array.isArray(c.profile) ? c.profile[0] : c.profile
      }));
      setComments(formattedComments);
    }
    
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmitting(true);

    const insertData: { user_id: string; content: string; image_id?: string; video_id?: string } = {
      user_id: user.id,
      content: newComment.trim(),
    };
    if (imageId) insertData.image_id = imageId;
    if (videoId) insertData.video_id = videoId;

    const { error } = await supabase.from("comments").insert(insertData);

    if (error) {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } else {
      setNewComment("");
      fetchComments();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const displayedComments = showAll ? comments : comments.slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircle className="w-4 h-4" />
        <span>{comments.length} comments</span>
      </div>

      {user && (
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="bg-secondary/50 border-border/50 resize-none min-h-[60px]"
            rows={2}
            maxLength={500}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
            className="shrink-0 gradient-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {displayedComments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Link to={`/profile/${comment.profile?.username}`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {comment.profile?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${comment.profile?.username}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    @{comment.profile?.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                  {user?.id === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 break-words">{comment.content}</p>
              </div>
            </div>
          ))}

          {comments.length > 2 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-primary hover:underline"
            >
              View all {comments.length} comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};
