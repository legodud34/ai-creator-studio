import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  MessageCircle,
  Users,
  TrendingUp,
  Video,
  Image,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface ProfileAnalyticsProps {
  userId: string;
}

interface AnalyticsData {
  totalVideos: number;
  totalImages: number;
  totalLikes: number;
  totalComments: number;
  followers: number;
  following: number;
  likesOverTime: { date: string; likes: number }[];
  topContent: { id: string; prompt: string; likes: number; type: string }[];
}

export const ProfileAnalytics = ({ userId }: ProfileAnalyticsProps) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [videosRes, imagesRes, followersRes, followingRes] = await Promise.all([
          supabase.from("videos").select("id, prompt").eq("user_id", userId),
          supabase.from("images").select("id, prompt").eq("user_id", userId),
          supabase.from("follows").select("id").eq("following_id", userId),
          supabase.from("follows").select("id").eq("follower_id", userId),
        ]);

        const videoIds = videosRes.data?.map((v) => v.id) || [];
        const imageIds = imagesRes.data?.map((i) => i.id) || [];

        const [videoLikesRes, imageLikesRes, videoCommentsRes, imageCommentsRes] =
          await Promise.all([
            videoIds.length > 0
              ? supabase.from("likes").select("id, created_at, video_id").in("video_id", videoIds)
              : { data: [] },
            imageIds.length > 0
              ? supabase.from("likes").select("id, created_at, image_id").in("image_id", imageIds)
              : { data: [] },
            videoIds.length > 0
              ? supabase.from("comments").select("id").in("video_id", videoIds)
              : { data: [] },
            imageIds.length > 0
              ? supabase.from("comments").select("id").in("image_id", imageIds)
              : { data: [] },
          ]);

        const allLikes = [...(videoLikesRes.data || []), ...(imageLikesRes.data || [])];
        const allComments = [...(videoCommentsRes.data || []), ...(imageCommentsRes.data || [])];

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = startOfDay(subDays(new Date(), 6 - i));
          return {
            date: format(date, "MMM d"),
            likes: allLikes.filter((like) => {
              const likeDate = startOfDay(new Date(like.created_at));
              return likeDate.getTime() === date.getTime();
            }).length,
          };
        });

        const videoLikeCounts = new Map<string, number>();
        (videoLikesRes.data || []).forEach((like) => {
          if (like.video_id) {
            videoLikeCounts.set(like.video_id, (videoLikeCounts.get(like.video_id) || 0) + 1);
          }
        });

        const imageLikeCounts = new Map<string, number>();
        (imageLikesRes.data || []).forEach((like) => {
          if (like.image_id) {
            imageLikeCounts.set(like.image_id, (imageLikeCounts.get(like.image_id) || 0) + 1);
          }
        });

        const topVideos =
          videosRes.data?.map((v) => ({
            id: v.id,
            prompt: v.prompt,
            likes: videoLikeCounts.get(v.id) || 0,
            type: "video",
          })) || [];

        const topImages =
          imagesRes.data?.map((i) => ({
            id: i.id,
            prompt: i.prompt,
            likes: imageLikeCounts.get(i.id) || 0,
            type: "image",
          })) || [];

        const topContent = [...topVideos, ...topImages]
          .sort((a, b) => b.likes - a.likes)
          .slice(0, 5);

        setData({
          totalVideos: videosRes.data?.length || 0,
          totalImages: imagesRes.data?.length || 0,
          totalLikes: allLikes.length,
          totalComments: allComments.length,
          followers: followersRes.data?.length || 0,
          following: followingRes.data?.length || 0,
          likesOverTime: last7Days,
          topContent,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="mb-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Analytics
      </h3>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/20">
                <Video className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.totalVideos}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Image className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.totalImages}</p>
                <p className="text-xs text-muted-foreground">Images</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/20">
                <Heart className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.totalLikes}</p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <MessageCircle className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.totalComments}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Likes Chart */}
      <Card className="glass border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Likes (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.likesOverTime}>
                <defs>
                  <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="likes"
                  stroke="hsl(var(--primary))"
                  fill="url(#likesGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Content */}
      {data.topContent.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topContent.map((content, index) => (
                <div
                  key={content.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{content.prompt}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {content.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart className="w-3 h-3" />
                    <span className="text-xs font-medium">{content.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};
