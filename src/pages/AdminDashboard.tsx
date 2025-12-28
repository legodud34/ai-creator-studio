import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Shield,
  UserCheck,
  UserX,
  Flag,
  Ban,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Crown,
  ShieldPlus,
  ShieldMinus,
  Clock,
  Users,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_verified?: boolean;
  is_admin?: boolean;
  is_moderator?: boolean;
  is_owner?: boolean;
  is_banned?: boolean;
  is_suspended?: boolean;
  suspended_until?: string | null;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string;
  content_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  genre?: string | null;
  reporter?: { username: string };
  reported_user?: { username: string };
}

interface ModeratorGenreAssignment {
  id: string;
  moderator_user_id: string;
  genre: string;
  assigned_by: string;
  created_at: string;
  moderator?: { username: string };
}

interface ModeratorAdminAssignment {
  id: string;
  moderator_user_id: string;
  admin_user_id: string;
  assigned_by: string;
  created_at: string;
  moderator?: { username: string };
  admin?: { username: string };
}

interface AdminMonthlyReport {
  id: string;
  admin_user_id: string;
  report_month: number;
  report_year: number;
  reports_resolved: number;
  reports_dismissed: number;
  reports_pending: number;
  users_banned: number;
  users_suspended: number;
  notes: string | null;
  created_at: string;
  admin?: { username: string };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [banReason, setBanReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("");

  const [roleUsername, setRoleUsername] = useState("");
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);

  // Moderator assignment states
  const [genreAssignments, setGenreAssignments] = useState<ModeratorGenreAssignment[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<ModeratorAdminAssignment[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<AdminMonthlyReport[]>([]);
  const [assignModUsername, setAssignModUsername] = useState("");
  const [assignGenre, setAssignGenre] = useState("");
  const [assignAdminUsername, setAssignAdminUsername] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const AVAILABLE_GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Documentary", "Animation", "Music", "Gaming", "Other"];

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin or owner
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = roleData?.map(r => r.role) || [];
      const hasAdminAccess = roles.includes("admin") || roles.includes("owner") || roles.includes("moderator");
      
      if (!hasAdminAccess) {
        toast({
          title: "Access denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(roles.includes("admin"));
      setIsModerator(roles.includes("moderator"));
      setIsOwner(roles.includes("owner"));
      await fetchData();
      setIsLoading(false);
    };

    checkAdminAndFetchData();
  }, [user, navigate, toast]);

  const fetchData = async () => {
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles) {
      // Fetch verification and ban status for each user
      const [{ data: verifiedUsers }, { data: adminUsers }, { data: moderatorUsers }, { data: ownerUsers }, { data: bannedUsers }] =
        await Promise.all([
          supabase.from("verified_users").select("user_id"),
          supabase.from("user_roles").select("user_id").eq("role", "admin"),
          supabase.from("user_roles").select("user_id").eq("role", "moderator"),
          supabase.from("user_roles").select("user_id").eq("role", "owner"),
          supabase.from("banned_users").select("user_id, expires_at"),
        ]);

      const verifiedIds = new Set(verifiedUsers?.map((v) => v.user_id) || []);
      const adminIds = new Set(adminUsers?.map((a) => a.user_id) || []);
      const moderatorIds = new Set(moderatorUsers?.map((m) => m.user_id) || []);
      const ownerIds = new Set(ownerUsers?.map((o) => o.user_id) || []);
      
      // Create maps for banned/suspended users
      const bannedMap = new Map<string, { expires_at: string | null }>();
      bannedUsers?.forEach((b) => bannedMap.set(b.user_id, { expires_at: b.expires_at }));

      const enrichedProfiles = profiles.map((p) => {
        const isOwner = ownerIds.has(p.id);
        const banInfo = bannedMap.get(p.id);
        const now = new Date();
        
        // Check if suspended (has expires_at in the future) vs banned (no expires_at or expired)
        const isSuspended = banInfo && banInfo.expires_at && new Date(banInfo.expires_at) > now;
        const isBanned = banInfo && (!banInfo.expires_at || new Date(banInfo.expires_at) <= now);
        
        return {
          ...p,
          is_verified: isOwner || verifiedIds.has(p.id),
          is_admin: adminIds.has(p.id),
          is_moderator: moderatorIds.has(p.id),
          is_owner: isOwner,
          is_banned: isBanned && !banInfo.expires_at, // Only permanent bans
          is_suspended: isSuspended,
          suspended_until: isSuspended ? banInfo.expires_at : null,
        };
      });

      setUsers(enrichedProfiles);
    }

    // Fetch pending reports
    const { data: reportsData } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (reportsData) {
      // Get usernames for reports
      const userIds = [
        ...new Set([
          ...reportsData.map((r) => r.reporter_id).filter(Boolean),
          ...reportsData.map((r) => r.reported_user_id),
        ]),
      ];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const enrichedReports = reportsData.map((r) => ({
        ...r,
        reporter: profileMap.get(r.reporter_id),
        reported_user: profileMap.get(r.reported_user_id),
      }));

      setReports(enrichedReports);
    }

    // Fetch moderator genre assignments
    const { data: genreAssignData } = await supabase
      .from("moderator_genre_assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (genreAssignData) {
      const modIds = [...new Set(genreAssignData.map(g => g.moderator_user_id))];
      const { data: modProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", modIds);
      const profileMap = new Map(modProfiles?.map(p => [p.id, p]) || []);
      
      setGenreAssignments(genreAssignData.map(g => ({
        ...g,
        moderator: profileMap.get(g.moderator_user_id),
      })));
    }

    // Fetch moderator-admin assignments (only for owner)
    const { data: adminAssignData } = await supabase
      .from("moderator_admin_assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (adminAssignData) {
      const allIds = [...new Set([
        ...adminAssignData.map(a => a.moderator_user_id),
        ...adminAssignData.map(a => a.admin_user_id),
      ])];
      const { data: assignProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", allIds);
      const profileMap = new Map(assignProfiles?.map(p => [p.id, p]) || []);
      
      setAdminAssignments(adminAssignData.map(a => ({
        ...a,
        moderator: profileMap.get(a.moderator_user_id),
        admin: profileMap.get(a.admin_user_id),
      })));
    }

    // Fetch monthly reports (only for owner)
    const { data: monthlyReportsData } = await supabase
      .from("admin_monthly_reports")
      .select("*")
      .order("report_year", { ascending: false })
      .order("report_month", { ascending: false });

    if (monthlyReportsData) {
      const adminIds = [...new Set(monthlyReportsData.map(r => r.admin_user_id))];
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", adminIds);
      const profileMap = new Map(adminProfiles?.map(p => [p.id, p]) || []);
      
      setMonthlyReports(monthlyReportsData.map(r => ({
        ...r,
        admin: profileMap.get(r.admin_user_id),
      })));
    }
  };

  const handleVerifyUser = async (userId: string) => {
    const { error } = await supabase.from("verified_users").insert({
      user_id: userId,
      verified_by: user?.id,
    });

    if (error) {
      toast({ title: "Failed to verify user", variant: "destructive" });
    } else {
      toast({ title: "User verified" });
      fetchData();
    }
  };

  const handleUnverifyUser = async (userId: string) => {
    const { error } = await supabase
      .from("verified_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Failed to unverify user", variant: "destructive" });
    } else {
      toast({ title: "User unverified" });
      fetchData();
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!banReason.trim()) {
      toast({ title: "Please provide a ban reason", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("banned_users").insert({
      user_id: userId,
      reason: banReason,
      banned_by: user?.id,
    });

    if (error) {
      toast({ title: "Failed to ban user", variant: "destructive" });
    } else {
      toast({ title: "User banned" });
      setBanReason("");
      fetchData();
    }
  };

  const handleUnbanUser = async (userId: string) => {
    const { error } = await supabase
      .from("banned_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Failed to unban user", variant: "destructive" });
    } else {
      toast({ title: "User unbanned" });
      fetchData();
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!suspendReason.trim()) {
      toast({ title: "Please provide a suspension reason", variant: "destructive" });
      return;
    }
    
    const days = parseInt(suspendDays, 10);
    if (isNaN(days) || days < 1) {
      toast({ title: "Please enter a valid number of days", variant: "destructive" });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error } = await supabase.from("banned_users").insert({
      user_id: userId,
      reason: suspendReason,
      banned_by: user?.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast({ title: "Failed to suspend user", variant: "destructive" });
    } else {
      toast({ title: `User suspended for ${days} day${days > 1 ? 's' : ''}` });
      setSuspendReason("");
      setSuspendDays("");
      fetchData();
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    const { error } = await supabase
      .from("banned_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Failed to unsuspend user", variant: "destructive" });
    } else {
      toast({ title: "User unsuspended" });
      fetchData();
    }
  };

  const handleGrantRole = async (userId: string, role: "admin" | "owner" | "moderator") => {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: `User already has ${role} role`, variant: "destructive" });
      } else {
        toast({ title: `Failed to grant ${role} role`, variant: "destructive" });
      }
    } else {
      toast({ title: `${role.charAt(0).toUpperCase() + role.slice(1)} role granted` });
      fetchData();
    }
  };

  const handleRevokeRole = async (userId: string, role: "admin" | "owner" | "moderator") => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      toast({ title: `Failed to revoke ${role} role`, variant: "destructive" });
    } else {
      toast({ title: `${role.charAt(0).toUpperCase() + role.slice(1)} role revoked` });
      fetchData();
    }
  };

  const handleResolveReport = async (reportId: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      toast({ title: "Failed to update report", variant: "destructive" });
    } else {
      toast({ title: `Report ${status}` });
      fetchData();
    }
  };

  const getUserIdByUsername = async (username: string) => {
    const normalized = username.trim().replace(/^@/, "");
    if (!normalized) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();

    if (error) {
      toast({ title: "Couldn't look up user", variant: "destructive" });
      return null;
    }

    return data?.id ?? null;
  };

  const handleGrantAdminByUsername = async () => {
    if (!isOwner) return;
    setIsRoleUpdating(true);
    try {
      const targetId = await getUserIdByUsername(roleUsername);
      if (!targetId) {
        toast({ title: "User not found", description: "Check the username and try again.", variant: "destructive" });
        return;
      }
      if (targetId === user?.id) {
        toast({ title: "You're already the owner", description: "Owner access is higher than admin.", variant: "destructive" });
        return;
      }
      await handleGrantRole(targetId, "admin");
      setRoleUsername("");
    } finally {
      setIsRoleUpdating(false);
    }
  };

  const handleRevokeAdminByUsername = async () => {
    if (!isOwner) return;
    setIsRoleUpdating(true);
    try {
      const targetId = await getUserIdByUsername(roleUsername);
      if (!targetId) {
        toast({ title: "User not found", description: "Check the username and try again.", variant: "destructive" });
        return;
      }
      await handleRevokeRole(targetId, "admin");
      setRoleUsername("");
    } finally {
      setIsRoleUpdating(false);
    }
  };

  const handleGrantModByUsername = async () => {
    if (!isOwner) return;
    setIsRoleUpdating(true);
    try {
      const targetId = await getUserIdByUsername(roleUsername);
      if (!targetId) {
        toast({ title: "User not found", description: "Check the username and try again.", variant: "destructive" });
        return;
      }
      await handleGrantRole(targetId, "moderator");
      setRoleUsername("");
    } finally {
      setIsRoleUpdating(false);
    }
  };

  const handleRevokeModByUsername = async () => {
    if (!isOwner) return;
    setIsRoleUpdating(true);
    try {
      const targetId = await getUserIdByUsername(roleUsername);
      if (!targetId) {
        toast({ title: "User not found", description: "Check the username and try again.", variant: "destructive" });
        return;
      }
      await handleRevokeRole(targetId, "moderator");
      setRoleUsername("");
    } finally {
      setIsRoleUpdating(false);
    }
  };

  // Moderator assignment handlers
  const handleAssignModToGenre = async () => {
    if (!assignModUsername.trim() || !assignGenre) return;
    setIsAssigning(true);
    try {
      const modId = await getUserIdByUsername(assignModUsername);
      if (!modId) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("moderator_genre_assignments").insert({
        moderator_user_id: modId,
        genre: assignGenre,
        assigned_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already assigned", description: "This mod is already assigned to this genre.", variant: "destructive" });
        } else {
          toast({ title: "Failed to assign", variant: "destructive" });
        }
      } else {
        toast({ title: "Moderator assigned to genre" });
        setAssignModUsername("");
        setAssignGenre("");
        fetchData();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveGenreAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from("moderator_genre_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast({ title: "Failed to remove assignment", variant: "destructive" });
    } else {
      toast({ title: "Assignment removed" });
      fetchData();
    }
  };

  const handleAssignModToAdmin = async () => {
    if (!assignModUsername.trim() || !assignAdminUsername.trim()) return;
    setIsAssigning(true);
    try {
      const modId = await getUserIdByUsername(assignModUsername);
      const adminId = await getUserIdByUsername(assignAdminUsername);
      
      if (!modId || !adminId) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("moderator_admin_assignments").insert({
        moderator_user_id: modId,
        admin_user_id: adminId,
        assigned_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already assigned", description: "This mod is already assigned to this admin.", variant: "destructive" });
        } else {
          toast({ title: "Failed to assign", variant: "destructive" });
        }
      } else {
        toast({ title: "Moderator assigned to admin" });
        setAssignModUsername("");
        setAssignAdminUsername("");
        fetchData();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAdminAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from("moderator_admin_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast({ title: "Failed to remove assignment", variant: "destructive" });
    } else {
      toast({ title: "Assignment removed" });
      fetchData();
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingReports = reports.filter((r) => r.status === "pending");

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isOwner) return null;

  return (
    <div className="min-h-screen gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
        </header>

        <Tabs defaultValue={isModerator && !isAdmin && !isOwner ? "reports" : "users"} className="space-y-6">
          <TabsList className="glass flex-wrap">
            {(isOwner || isAdmin) && (
              <TabsTrigger value="users" className="gap-2">
                <UserCheck className="w-4 h-4" />
                Users
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />
              Reports
              {pendingReports.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingReports.length}
                </Badge>
              )}
            </TabsTrigger>
            {(isOwner || isAdmin) && (
              <TabsTrigger value="assignments" className="gap-2">
                <Users className="w-4 h-4" />
                Assignments
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="monthly-reports" className="gap-2">
                <FileText className="w-4 h-4" />
                Monthly Reports
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {isOwner && (
              <section className="glass rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-3">Manage Roles</h2>
                <div className="flex flex-col gap-3">
                  <Input
                    value={roleUsername}
                    onChange={(e) => setRoleUsername(e.target.value)}
                    placeholder="Username (e.g. @jane)"
                    className="glass"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGrantAdminByUsername}
                      disabled={isRoleUpdating || !roleUsername.trim()}
                      className="gap-2"
                    >
                      {isRoleUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldPlus className="w-4 h-4" />}
                      Make Admin
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRevokeAdminByUsername}
                      disabled={isRoleUpdating || !roleUsername.trim()}
                      className="gap-2"
                    >
                      {isRoleUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldMinus className="w-4 h-4" />}
                      Remove Admin
                    </Button>
                    <Button
                      type="button"
                      onClick={handleGrantModByUsername}
                      disabled={isRoleUpdating || !roleUsername.trim()}
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isRoleUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldPlus className="w-4 h-4" />}
                      Make Mod
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRevokeModByUsername}
                      disabled={isRoleUpdating || !roleUsername.trim()}
                      className="gap-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                      {isRoleUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldMinus className="w-4 h-4" />}
                      Remove Mod
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Enter a username to add or remove admin/moderator roles.
                </p>
              </section>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass"
              />
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>
                              {u.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">@{u.username}</span>
                            {(u.is_owner || u.is_verified || u.is_admin) && (
                              <VerifiedBadge
                                size="sm"
                                type={
                                  u.is_owner
                                    ? "owner"
                                    : u.is_verified && u.is_admin
                                    ? "both"
                                    : u.is_admin
                                    ? "admin"
                                    : "verified"
                                }
                              />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.is_banned && (
                            <Badge variant="destructive">Banned</Badge>
                          )}
                          {u.is_suspended && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                              Suspended until {new Date(u.suspended_until!).toLocaleDateString()}
                            </Badge>
                          )}
                          {u.is_owner && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              Owner
                            </Badge>
                          )}
                          {u.is_admin && <Badge variant="secondary">Admin</Badge>}
                          {u.is_moderator && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Moderator
                            </Badge>
                          )}
                          {u.is_verified && (
                            <Badge className="bg-blue-500/20 text-blue-400">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {/* Verification - Only for admins and owners */}
                          {(isOwner || isAdmin) && (
                            <>
                              {u.is_verified ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnverifyUser(u.id)}
                                  className="text-muted-foreground"
                                  disabled={u.is_owner}
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Unverify
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerifyUser(u.id)}
                                  className="text-blue-500"
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Verify
                                </Button>
                              )}
                            </>
                          )}

                          {/* Admin Role Management - Only for owners */}
                          {isOwner && !u.is_owner && (
                            <>
                              {u.is_admin ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeRole(u.id, "admin")}
                                  className="text-purple-400"
                                >
                                  <ShieldMinus className="w-4 h-4 mr-1" />
                                  Remove Admin
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGrantRole(u.id, "admin")}
                                  className="text-purple-500"
                                >
                                  <ShieldPlus className="w-4 h-4 mr-1" />
                                  Make Admin
                                </Button>
                              )}
                            </>
                          )}

                          {/* Moderator Role Management - Only for owners */}
                          {isOwner && !u.is_owner && !u.is_admin && (
                            <>
                              {u.is_moderator ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeRole(u.id, "moderator")}
                                  className="text-green-400"
                                >
                                  <ShieldMinus className="w-4 h-4 mr-1" />
                                  Remove Mod
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGrantRole(u.id, "moderator")}
                                  className="text-green-500"
                                >
                                  <ShieldPlus className="w-4 h-4 mr-1" />
                                  Make Mod
                                </Button>
                              )}
                            </>
                          )}

                          {/* Suspend/Unsuspend - Only for admins and owners */}
                          {(isOwner || isAdmin) && !u.is_banned && !u.is_owner && (
                            <>
                              {u.is_suspended ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnsuspendUser(u.id)}
                                  className="text-orange-400"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Unsuspend
                                </Button>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-orange-500"
                                      disabled={u.id === user?.id}
                                    >
                                      <Clock className="w-4 h-4 mr-1" />
                                      Suspend
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Suspend @{u.username}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will temporarily prevent the user from accessing the platform.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-3 mt-2">
                                      <Input
                                        type="number"
                                        min="1"
                                        placeholder="Number of days..."
                                        value={suspendDays}
                                        onChange={(e) => setSuspendDays(e.target.value)}
                                      />
                                      <Textarea
                                        placeholder="Reason for suspension..."
                                        value={suspendReason}
                                        onChange={(e) => setSuspendReason(e.target.value)}
                                      />
                                    </div>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel
                                        onClick={() => {
                                          setSuspendReason("");
                                          setSuspendDays("");
                                        }}
                                      >
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleSuspendUser(u.id)}
                                        className="bg-orange-600 text-white hover:bg-orange-700"
                                      >
                                        Suspend User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}

                          {/* Ban/Unban - Only for admins and owners */}
                          {(isOwner || isAdmin) && !u.is_suspended && (
                            <>
                              {u.is_banned ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnbanUser(u.id)}
                                  className="text-green-500"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Unban
                                </Button>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      disabled={u.id === user?.id || u.is_owner}
                                    >
                                      <Ban className="w-4 h-4 mr-1" />
                                      Ban
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Ban @{u.username}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently prevent the user from accessing the platform.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Textarea
                                      placeholder="Reason for ban..."
                                      value={banReason}
                                      onChange={(e) => setBanReason(e.target.value)}
                                      className="mt-2"
                                    />
                                    <AlertDialogFooter>
                                      <AlertDialogCancel
                                        onClick={() => setBanReason("")}
                                      >
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleBanUser(u.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Ban User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reported User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No reports yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          @{r.reporter?.username || "Unknown"}
                        </TableCell>
                        <TableCell className="font-medium">
                          @{r.reported_user?.username || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.content_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{r.reason}</p>
                            {r.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {r.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "pending"
                                ? "destructive"
                                : r.status === "resolved"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleResolveReport(r.id, "resolved")
                                }
                                className="text-green-500"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleResolveReport(r.id, "dismissed")
                                }
                                className="text-muted-foreground"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            {/* Assign Mod to Genre */}
            <section className="glass rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Assign Moderator to Genre
              </h2>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <Input
                  value={assignModUsername}
                  onChange={(e) => setAssignModUsername(e.target.value)}
                  placeholder="Moderator username"
                  className="glass flex-1"
                />
                <select
                  value={assignGenre}
                  onChange={(e) => setAssignGenre(e.target.value)}
                  className="glass rounded-md border border-border/50 bg-secondary/50 px-3 py-2 text-sm"
                >
                  <option value="">Select Genre</option>
                  {AVAILABLE_GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <Button
                  onClick={handleAssignModToGenre}
                  disabled={isAssigning || !assignModUsername.trim() || !assignGenre}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Assign
                </Button>
              </div>

              {/* Current genre assignments */}
              {genreAssignments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Current Assignments</h3>
                  <div className="flex flex-wrap gap-2">
                    {genreAssignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                        <span className="text-sm">@{a.moderator?.username || "Unknown"}</span>
                        <span className="text-xs text-green-400">→ {a.genre}</span>
                        <button
                          onClick={() => handleRemoveGenreAssignment(a.id)}
                          className="p-0.5 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Assign Mod to Admin (Owner only) */}
            {isOwner && (
              <section className="glass rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShieldPlus className="w-5 h-5 text-purple-500" />
                  Assign Moderator to Admin (Reporting Hierarchy)
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Assign moderators to report to specific admins. Admins will oversee their assigned mods.
                </p>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <Input
                    value={assignModUsername}
                    onChange={(e) => setAssignModUsername(e.target.value)}
                    placeholder="Moderator username"
                    className="glass flex-1"
                  />
                  <Input
                    value={assignAdminUsername}
                    onChange={(e) => setAssignAdminUsername(e.target.value)}
                    placeholder="Admin username"
                    className="glass flex-1"
                  />
                  <Button
                    onClick={handleAssignModToAdmin}
                    disabled={isAssigning || !assignModUsername.trim() || !assignAdminUsername.trim()}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Assign
                  </Button>
                </div>

                {/* Current admin assignments */}
                {adminAssignments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Current Hierarchy</h3>
                    <div className="flex flex-wrap gap-2">
                      {adminAssignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-1.5">
                          <span className="text-sm">@{a.moderator?.username || "Unknown"}</span>
                          <span className="text-xs text-purple-400">reports to</span>
                          <span className="text-sm font-medium">@{a.admin?.username || "Unknown"}</span>
                          <button
                            onClick={() => handleRemoveAdminAssignment(a.id)}
                            className="p-0.5 hover:bg-red-500/20 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </TabsContent>

          {/* Monthly Reports Tab (Owner only) */}
          {isOwner && (
            <TabsContent value="monthly-reports" className="space-y-4">
              <section className="glass rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Admin Monthly Reports
                </h2>
                
                {monthlyReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No monthly reports submitted yet. Admins can submit their reports here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {monthlyReports.map((report) => (
                      <div key={report.id} className="border border-border/50 rounded-lg p-4 bg-secondary/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">@{report.admin?.username || "Unknown"}</span>
                            <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                              {getMonthName(report.report_month)} {report.report_year}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Submitted {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="bg-green-500/10 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-400">{report.reports_resolved}</p>
                            <p className="text-xs text-muted-foreground">Resolved</p>
                          </div>
                          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-400">{report.reports_dismissed}</p>
                            <p className="text-xs text-muted-foreground">Dismissed</p>
                          </div>
                          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-orange-400">{report.reports_pending}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-400">{report.users_banned}</p>
                            <p className="text-xs text-muted-foreground">Banned</p>
                          </div>
                          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-400">{report.users_suspended}</p>
                            <p className="text-xs text-muted-foreground">Suspended</p>
                          </div>
                        </div>
                        {report.notes && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                            <p className="text-sm">{report.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
