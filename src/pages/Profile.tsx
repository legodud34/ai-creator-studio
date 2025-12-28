import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Loader2, Image, Video, Lock, Globe, Edit2, Check, X, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";
import { CommentsSection } from "@/components/CommentsSection";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ReportButton } from "@/components/ReportButton";
import { ProfileAnalytics } from "@/components/ProfileAnalytics";

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface ContentItem {
  id: string;
  url: string;
  prompt: string;
  is_public: boolean;
  created_at: string;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, updateProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [images, setImages] = useState<ContentItem[]>([]);
  const [videos, setVideos] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<ContentItem | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ContentItem | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwnerRole, setIsOwnerRole] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isOwnProfile = user && profileData && user.id === profileData.id;

  const fetchFollowCounts = async (profileId: string) => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
    ]);
    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!username) return;
      
      setIsLoading(true);
      
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error || !profile) {
        toast({
          title: "User not found",
          description: "This profile doesn't exist.",
          variant: "destructive",
        });
        navigate("/explore");
        return;
      }

      setProfileData(profile);
      setEditBio(profile.bio || "");
      fetchFollowCounts(profile.id);

      // Check if user is verified and/or admin/owner
      const [{ data: verifiedData }, { data: rolesData }] = await Promise.all([
        supabase
          .from("verified_users")
          .select("id")
          .eq("user_id", profile.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
      ]);
      
      setIsVerified(!!verifiedData);
      const roles = rolesData?.map(r => r.role) || [];
      setIsAdmin(roles.includes("admin"));
      setIsOwnerRole(roles.includes("owner"));

      const isOwner = user?.id === profile.id;
      
      const imageQuery = supabase
        .from("images")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      
      if (!isOwner) {
        imageQuery.eq("is_public", true);
      }
      
      const { data: userImages } = await imageQuery;
      setImages(userImages || []);

      const videoQuery = supabase
        .from("videos")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      
      if (!isOwner) {
        videoQuery.eq("is_public", true);
      }
      
      const { data: userVideos } = await videoQuery;
      setVideos(userVideos || []);

      setIsLoading(false);
    };

    fetchProfileData();
  }, [username, user, navigate, toast]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: publicUrl });
      await refreshProfile();
      
      setProfileData(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

      toast({ title: "Avatar updated!" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveBio = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({ bio: editBio });
    
    if (error) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfileData(prev => prev ? { ...prev, bio: editBio } : null);
      setIsEditing(false);
      toast({ title: "Profile updated!" });
    }
    
    setIsSaving(false);
  };

  const toggleVisibility = async (type: "image" | "video", id: string, currentValue: boolean) => {
    const table = type === "image" ? "images" : "videos";
    
    const { error } = await supabase
      .from(table)
      .update({ is_public: !currentValue })
      .eq("id", id);

    if (error) {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (type === "image") {
      setImages(prev => prev.map(img => img.id === id ? { ...img, is_public: !currentValue } : img));
    } else {
      setVideos(prev => prev.map(vid => vid.id === id ? { ...vid, is_public: !currentValue } : vid));
    }

    toast({ title: `Made ${!currentValue ? "public" : "private"}` });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileData) return null;

  const publicImageCount = images.filter(i => i.is_public).length;
  const publicVideoCount = videos.filter(v => v.is_public).length;

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-8">
          <Link to="/explore">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Profile</h1>
        </header>

        {/* Profile Header */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-primary/50">
                <AvatarImage src={profileData.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                  {profileData.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-bold">@{profileData.username}</h2>
                  {(isOwnerRole || isVerified || isAdmin) && (
                    <VerifiedBadge 
                      size="lg" 
                      type={
                        isOwnerRole ? "owner" : 
                        isVerified && isAdmin ? "both" : 
                        isAdmin ? "admin" : "verified"
                      } 
                    />
                  )}
                </div>
                {!isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <FollowButton
                      targetUserId={profileData.id}
                      onFollowChange={() => fetchFollowCounts(profileData.id)}
                    />
                    <ReportButton
                      reportedUserId={profileData.id}
                      contentType="profile"
                    />
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    className="bg-secondary/50 border-border/50 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveBio}
                      disabled={isSaving}
                      className="gradient-primary text-primary-foreground"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span className="ml-1">Save</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditBio(profileData.bio || "");
                      }}
                    >
                      <X className="w-4 h-4" />
                      <span className="ml-1">Cancel</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-muted-foreground">
                    {profileData.bio || (isOwnProfile ? "No bio yet" : "")}
                  </p>
                  {isOwnProfile && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      className="mt-2"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit bio
                    </Button>
                  )}
                </div>
              )}

              <div className="flex justify-center sm:justify-start gap-6 mt-4 text-sm">
                <div>
                  <span className="font-bold text-foreground">{followersCount}</span>
                  <span className="text-muted-foreground ml-1">followers</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">following</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">{isOwnProfile ? images.length : publicImageCount}</span>
                  <span className="text-muted-foreground ml-1">images</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">{isOwnProfile ? videos.length : publicVideoCount}</span>
                  <span className="text-muted-foreground ml-1">videos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section - Only for own profile */}
        {isOwnProfile && profileData && (
          <ProfileAnalytics userId={profileData.id} />
        )}

        {/* Images Section */}
        {images.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Images
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="glass rounded-xl overflow-hidden group relative">
                  <div className="aspect-square relative">
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(img)}
                    />
                    {isOwnProfile && (
                      <button
                        onClick={() => toggleVisibility("image", img.id, img.is_public)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                        title={img.is_public ? "Make private" : "Make public"}
                      >
                        {img.is_public ? (
                          <Globe className="w-4 h-4 text-accent" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="p-2 space-y-2">
                    <p className="text-xs text-foreground/70 line-clamp-1">{img.prompt}</p>
                    <div className="flex items-center gap-3">
                      <LikeButton imageId={img.id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Videos Section */}
        {videos.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-accent" />
              Videos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((vid) => (
                <div key={vid.id} className="glass rounded-xl overflow-hidden relative">
                  <div className="aspect-video relative">
                    <video
                      src={vid.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-muted"
                    />
                    {isOwnProfile && (
                      <button
                        onClick={() => toggleVisibility("video", vid.id, vid.is_public)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
                        title={vid.is_public ? "Make private" : "Make public"}
                      >
                        {vid.is_public ? (
                          <Globe className="w-4 h-4 text-accent" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-3">
                    <p className="text-sm text-foreground/70 line-clamp-1">{vid.prompt}</p>
                    <div className="flex items-center gap-3">
                      <LikeButton videoId={vid.id} />
                      <button
                        onClick={() => setSelectedVideo(vid)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        View comments
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {images.length === 0 && videos.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>{isOwnProfile ? "You haven't created anything yet" : "No public creations"}</p>
            {isOwnProfile && (
              <Link to="/">
                <Button className="mt-4 gradient-primary text-primary-foreground">
                  Start Creating
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.prompt}
                className="w-full h-full object-contain bg-muted"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
              <p className="text-sm text-foreground/80">{selectedImage.prompt}</p>
              <div className="flex items-center gap-3">
                <LikeButton imageId={selectedImage.id} />
              </div>
              <CommentsSection imageId={selectedImage.id} isExpanded />
            </div>
          </div>
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video relative">
              <video
                src={selectedVideo.url}
                controls
                playsInline
                autoPlay
                className="w-full h-full object-contain bg-muted"
              />
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
              <p className="text-sm text-foreground/80">{selectedVideo.prompt}</p>
              <div className="flex items-center gap-3">
                <LikeButton videoId={selectedVideo.id} />
              </div>
              <CommentsSection videoId={selectedVideo.id} isExpanded />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
