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
  Pencil,
  ArrowUpRight,
  Eye,
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
  moderator_id?: string | null;
  escalation_notes?: string | null;
  escalated_at?: string | null;
  escalated_to?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reporter?: { username: string };
  reported_user?: { username: string };
  moderator?: { username: string };
  reviewed_by_user?: { username: string };
  escalated_to_user?: { username: string };
}

interface AdminGenreAssignment {
  id: string;
  admin_user_id: string;
  genre: string;
  assigned_by: string;
  created_at: string;
  admin?: { username: string };
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

interface BanRecord {
  id: string;
  user_id: string;
  reason: string;
  banned_at: string;
  expires_at: string | null;
  banned_by: string | null;
  user?: { username: string };
  banned_by_user?: { username: string };
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

  // Admin and moderator assignment states
  const [adminGenreAssignments, setAdminGenreAssignments] = useState<AdminGenreAssignment[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<ModeratorAdminAssignment[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<AdminMonthlyReport[]>([]);
  const [assignAdminForGenre, setAssignAdminForGenre] = useState("");
  const [assignGenre, setAssignGenre] = useState("");
  const [assignModUsername, setAssignModUsername] = useState("");
  const [assignAdminUsername, setAssignAdminUsername] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [banRecords, setBanRecords] = useState<BanRecord[]>([]);
  const [escalationNotes, setEscalationNotes] = useState("");
  const [reportBanReason, setReportBanReason] = useState("");
  const [reportSuspendReason, setReportSuspendReason] = useState("");
  const [reportSuspendDays, setReportSuspendDays] = useState("");
  // Monthly report form states (for admins)
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportResolved, setReportResolved] = useState("");
  const [reportDismissed, setReportDismissed] = useState("");
  const [reportPending, setReportPending] = useState("");
  const [reportBanned, setReportBanned] = useState("");
  const [reportSuspended, setReportSuspended] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Edit report states
  const [editingReport, setEditingReport] = useState<AdminMonthlyReport | null>(null);
  const [editResolved, setEditResolved] = useState("");
  const [editDismissed, setEditDismissed] = useState("");
  const [editPending, setEditPending] = useState("");
  const [editBanned, setEditBanned] = useState("");
  const [editSuspended, setEditSuspended] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isEditingReport, setIsEditingReport] = useState(false);

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
      // Get usernames for reports - include moderator, reviewed_by, escalated_to
      const userIds = [
        ...new Set([
          ...reportsData.map((r) => r.reporter_id).filter(Boolean),
          ...reportsData.map((r) => r.reported_user_id),
          ...reportsData.map((r) => r.moderator_id).filter(Boolean),
          ...reportsData.map((r) => r.reviewed_by).filter(Boolean),
          ...reportsData.map((r) => r.escalated_to).filter(Boolean),
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
        moderator: r.moderator_id ? profileMap.get(r.moderator_id) : undefined,
        reviewed_by_user: r.reviewed_by ? profileMap.get(r.reviewed_by) : undefined,
        escalated_to_user: r.escalated_to ? profileMap.get(r.escalated_to) : undefined,
      }));

      setReports(enrichedReports);
    }

    // Fetch admin genre assignments
    const { data: adminGenreData } = await supabase
      .from("admin_genre_assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (adminGenreData) {
      const adminIds = [...new Set(adminGenreData.map(g => g.admin_user_id))];
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", adminIds);
      const profileMap = new Map(adminProfiles?.map(p => [p.id, p]) || []);
      
      setAdminGenreAssignments(adminGenreData.map(g => ({
        ...g,
        admin: profileMap.get(g.admin_user_id),
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

    // Fetch all ban records with usernames
    const { data: bansData } = await supabase
      .from("banned_users")
      .select("*")
      .order("banned_at", { ascending: false });

    if (bansData) {
      const allUserIds = [...new Set([
        ...bansData.map(b => b.user_id),
        ...bansData.map(b => b.banned_by).filter(Boolean),
      ])] as string[];
      
      const { data: banProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", allUserIds);
      
      const profileMap = new Map(banProfiles?.map(p => [p.id, p]) || []);
      
      setBanRecords(bansData.map(b => ({
        ...b,
        user: profileMap.get(b.user_id),
        banned_by_user: b.banned_by ? profileMap.get(b.banned_by) : undefined,
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

  // Moderator marks a report as reviewed (initial review before escalation)
  const handleModeratorReview = async (reportId: string) => {
    const { error } = await supabase
      .from("reports")
      .update({
        moderator_id: user?.id,
      })
      .eq("id", reportId);

    if (error) {
      toast({ title: "Failed to mark as reviewed", variant: "destructive" });
    } else {
      toast({ title: "Report marked as reviewed by you" });
      fetchData();
    }
  };

  // Moderator escalates report to their admin
  const handleEscalateReport = async (reportId: string, adminId: string) => {
    if (!escalationNotes.trim()) {
      toast({ title: "Please add escalation notes", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("reports")
      .update({
        moderator_id: user?.id,
        escalation_notes: escalationNotes,
        escalated_at: new Date().toISOString(),
        escalated_to: adminId,
      })
      .eq("id", reportId);

    if (error) {
      toast({ title: "Failed to escalate report", variant: "destructive" });
    } else {
      toast({ title: "Report escalated to admin" });
      setEscalationNotes("");
      fetchData();
    }
  };

  // Admin bans user directly from report
  const handleBanFromReport = async (reportId: string, userId: string) => {
    if (!reportBanReason.trim()) {
      toast({ title: "Please provide a ban reason", variant: "destructive" });
      return;
    }

    const { error: banError } = await supabase.from("banned_users").insert({
      user_id: userId,
      reason: reportBanReason,
      banned_by: user?.id,
    });

    if (banError) {
      toast({ title: "Failed to ban user", variant: "destructive" });
      return;
    }

    // Also resolve the report
    await supabase
      .from("reports")
      .update({
        status: "resolved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    toast({ title: "User banned and report resolved" });
    setReportBanReason("");
    fetchData();
  };

  // Admin suspends user directly from report
  const handleSuspendFromReport = async (reportId: string, userId: string) => {
    if (!reportSuspendReason.trim()) {
      toast({ title: "Please provide a suspension reason", variant: "destructive" });
      return;
    }
    
    const days = parseInt(reportSuspendDays, 10);
    if (isNaN(days) || days < 1) {
      toast({ title: "Please enter a valid number of days", variant: "destructive" });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error: suspendError } = await supabase.from("banned_users").insert({
      user_id: userId,
      reason: reportSuspendReason,
      banned_by: user?.id,
      expires_at: expiresAt.toISOString(),
    });

    if (suspendError) {
      toast({ title: "Failed to suspend user", variant: "destructive" });
      return;
    }

    // Also resolve the report
    await supabase
      .from("reports")
      .update({
        status: "resolved",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    toast({ title: `User suspended for ${days} days and report resolved` });
    setReportSuspendReason("");
    setReportSuspendDays("");
    fetchData();
  };

  // Get the admin assigned to current moderator and their genre
  const getMyAdmin = () => {
    if (!user) return null;
    const assignment = adminAssignments.find(a => a.moderator_user_id === user.id);
    if (!assignment) return null;
    
    // Find the genre this admin is assigned to
    const adminGenre = adminGenreAssignments.find(g => g.admin_user_id === assignment.admin_user_id);
    return { 
      id: assignment.admin_user_id, 
      username: assignment.admin?.username,
      genre: adminGenre?.genre 
    };
  };

  // Get the genres the current mod can access (through their admin)
  const getMyModeratorGenres = () => {
    if (!user) return [];
    const myAdminInfo = getMyAdmin();
    if (!myAdminInfo?.genre) return [];
    return [myAdminInfo.genre];
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

  // Admin genre assignment handlers
  const handleAssignAdminToGenre = async () => {
    if (!assignAdminForGenre.trim() || !assignGenre) return;
    setIsAssigning(true);
    try {
      const adminId = await getUserIdByUsername(assignAdminForGenre);
      if (!adminId) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("admin_genre_assignments").insert({
        admin_user_id: adminId,
        genre: assignGenre,
        assigned_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already assigned", description: "This admin is already assigned to this genre.", variant: "destructive" });
        } else {
          toast({ title: "Failed to assign", variant: "destructive" });
        }
      } else {
        toast({ title: "Admin assigned to genre" });
        setAssignAdminForGenre("");
        setAssignGenre("");
        fetchData();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAdminGenreAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from("admin_genre_assignments")
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

  const handleSubmitMonthlyReport = async () => {
    if (!user) return;

    setIsSubmittingReport(true);
    
    const { error } = await supabase.from("admin_monthly_reports").insert({
      admin_user_id: user.id,
      report_month: reportMonth,
      report_year: reportYear,
      reports_resolved: parseInt(reportResolved) || 0,
      reports_dismissed: parseInt(reportDismissed) || 0,
      reports_pending: parseInt(reportPending) || 0,
      users_banned: parseInt(reportBanned) || 0,
      users_suspended: parseInt(reportSuspended) || 0,
      notes: reportNotes.trim() || null,
    });

    setIsSubmittingReport(false);

    if (error) {
      toast({ title: "Failed to submit report", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Monthly report submitted successfully" });
      setReportResolved("");
      setReportDismissed("");
      setReportPending("");
      setReportBanned("");
      setReportSuspended("");
      setReportNotes("");
      fetchData();
    }
  };

  const handleDeleteMonthlyReport = async (reportId: string) => {
    const { error } = await supabase
      .from("admin_monthly_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      toast({ title: "Failed to delete report", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Monthly report deleted" });
      fetchData();
    }
  };

  const openEditReport = (report: AdminMonthlyReport) => {
    setEditingReport(report);
    setEditResolved(report.reports_resolved.toString());
    setEditDismissed(report.reports_dismissed.toString());
    setEditPending(report.reports_pending.toString());
    setEditBanned(report.users_banned.toString());
    setEditSuspended(report.users_suspended.toString());
    setEditNotes(report.notes || "");
  };

  const handleUpdateMonthlyReport = async () => {
    if (!editingReport) return;

    setIsEditingReport(true);

    const { error } = await supabase
      .from("admin_monthly_reports")
      .update({
        reports_resolved: parseInt(editResolved) || 0,
        reports_dismissed: parseInt(editDismissed) || 0,
        reports_pending: parseInt(editPending) || 0,
        users_banned: parseInt(editBanned) || 0,
        users_suspended: parseInt(editSuspended) || 0,
        notes: editNotes.trim() || null,
      })
      .eq("id", editingReport.id);

    setIsEditingReport(false);

    if (error) {
      toast({ title: "Failed to update report", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Monthly report updated" });
      setEditingReport(null);
      fetchData();
    }
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

  if (!isAdmin && !isOwner && !isModerator) return null;

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
            {isAdmin && !isOwner && (
              <TabsTrigger value="submit-report" className="gap-2">
                <FileText className="w-4 h-4" />
                Submit Report
              </TabsTrigger>
            )}
            {(isOwner || isAdmin) && (
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
            {/* Moderator info banner */}
            {isModerator && !isAdmin && !isOwner && (
              <div className="glass rounded-xl p-4 border border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-green-400">Moderator View</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getMyAdmin() ? (
                    <>
                      You handle <span className="text-purple-400 font-medium">{getMyAdmin()?.genre || "unassigned"}</span> reports under admin <span className="text-primary font-medium">@{getMyAdmin()?.username}</span>.
                    </>
                  ) : (
                    "You are not assigned to an admin yet. Contact the owner to get assigned."
                  )}
                </p>
              </div>
            )}

            <div className="glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reported User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Handled By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Filter reports based on role - mods get genre through their admin
                    const modGenres = getMyModeratorGenres();
                    const visibleReports = isModerator && !isAdmin && !isOwner
                      ? reports.filter(r => r.genre && modGenres.includes(r.genre))
                      : reports;

                    return visibleReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {isModerator && !isAdmin && !isOwner 
                            ? "No reports in your assigned genres" 
                            : "No reports yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleReports.map((r) => (
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
                            {r.genre ? (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                {r.genre}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.reason}</p>
                              {r.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {r.description}
                                </p>
                              )}
                              {r.escalation_notes && (
                                <p className="text-xs text-orange-400 mt-1">
                                  Escalation: {r.escalation_notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
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
                              {r.escalated_at && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                                  Escalated
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {r.moderator?.username && (
                                <p className="text-green-400">
                                  Mod: @{r.moderator.username}
                                </p>
                              )}
                              {r.escalated_to_user?.username && (
                                <p className="text-orange-400">
                                  → @{r.escalated_to_user.username}
                                </p>
                              )}
                              {r.reviewed_by_user?.username && (
                                <p className="text-blue-400">
                                  Final: @{r.reviewed_by_user.username}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col gap-2 items-end">
                              {/* Moderator actions */}
                              {isModerator && !isAdmin && !isOwner && r.status === "pending" && (
                                <>
                                  {!r.moderator_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleModeratorReview(r.id)}
                                      className="text-green-500"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Mark Reviewed
                                    </Button>
                                  )}
                                  {getMyAdmin() && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-orange-500"
                                        >
                                          <ArrowUpRight className="w-4 h-4 mr-1" />
                                          Escalate
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Escalate to @{getMyAdmin()?.username}
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Add notes about why this needs admin attention.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <Textarea
                                          placeholder="Escalation notes (e.g., severity, recommended action)..."
                                          value={escalationNotes}
                                          onChange={(e) => setEscalationNotes(e.target.value)}
                                          className="mt-2"
                                        />
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setEscalationNotes("")}>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleEscalateReport(r.id, getMyAdmin()!.id)}
                                            className="bg-orange-600 hover:bg-orange-700"
                                          >
                                            Escalate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </>
                              )}

                              {/* Admin/Owner actions */}
                              {(isOwner || isAdmin) && r.status === "pending" && (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResolveReport(r.id, "resolved")}
                                    className="text-green-500"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Resolve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResolveReport(r.id, "dismissed")}
                                    className="text-muted-foreground"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Dismiss
                                  </Button>
                                  
                                  {/* Ban from report */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500"
                                      >
                                        <Ban className="w-4 h-4 mr-1" />
                                        Ban
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Ban @{r.reported_user?.username}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently ban the user and resolve this report.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <Textarea
                                        placeholder="Reason for ban..."
                                        value={reportBanReason}
                                        onChange={(e) => setReportBanReason(e.target.value)}
                                        className="mt-2"
                                      />
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setReportBanReason("")}>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleBanFromReport(r.id, r.reported_user_id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Ban User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  {/* Suspend from report */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-orange-500"
                                      >
                                        <Clock className="w-4 h-4 mr-1" />
                                        Suspend
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Suspend @{r.reported_user?.username}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Temporarily suspend this user and resolve the report.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <div className="space-y-3 mt-2">
                                        <Input
                                          type="number"
                                          min="1"
                                          placeholder="Number of days..."
                                          value={reportSuspendDays}
                                          onChange={(e) => setReportSuspendDays(e.target.value)}
                                        />
                                        <Textarea
                                          placeholder="Reason for suspension..."
                                          value={reportSuspendReason}
                                          onChange={(e) => setReportSuspendReason(e.target.value)}
                                        />
                                      </div>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => {
                                          setReportSuspendReason("");
                                          setReportSuspendDays("");
                                        }}>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleSuspendFromReport(r.id, r.reported_user_id)}
                                          className="bg-orange-600 hover:bg-orange-700"
                                        >
                                          Suspend User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            {/* Assign Admin to Genre */}
            <section className="glass rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                Assign Admin to Genre
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Each admin manages one genre. Mods assigned to that admin will handle reports for that genre.
              </p>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <Input
                  value={assignAdminForGenre}
                  onChange={(e) => setAssignAdminForGenre(e.target.value)}
                  placeholder="Admin username"
                  className="glass flex-1"
                />
                <select
                  value={assignGenre}
                  onChange={(e) => setAssignGenre(e.target.value)}
                  className="glass rounded-md border border-border/50 bg-secondary/50 px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select Genre</option>
                  {AVAILABLE_GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <Button
                  onClick={handleAssignAdminToGenre}
                  disabled={isAssigning || !assignAdminForGenre.trim() || !assignGenre}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Assign
                </Button>
              </div>

              {/* Current admin genre assignments */}
              {adminGenreAssignments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Current Admin → Genre Assignments</h3>
                  <div className="flex flex-wrap gap-2">
                    {adminGenreAssignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-1.5">
                        <span className="text-sm">@{a.admin?.username || "Unknown"}</span>
                        <span className="text-xs text-purple-400">→ {a.genre}</span>
                        <button
                          onClick={() => handleRemoveAdminGenreAssignment(a.id)}
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

          {/* Submit Monthly Report Tab (Admins only) */}
          {isAdmin && !isOwner && (
            <TabsContent value="submit-report" className="space-y-4">
              <section className="glass rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Submit Monthly Report
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Submit your monthly activity report to the owner. Include your moderation statistics for the selected month.
                </p>

                <div className="grid gap-4 max-w-2xl">
                  {/* Month/Year Selection */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Month</label>
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(parseInt(e.target.value))}
                        className="w-full glass rounded-md border border-border/50 bg-secondary/50 px-3 py-2 text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>{getMonthName(m)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Year</label>
                      <select
                        value={reportYear}
                        onChange={(e) => setReportYear(parseInt(e.target.value))}
                        className="w-full glass rounded-md border border-border/50 bg-secondary/50 px-3 py-2 text-sm"
                      >
                        {[2024, 2025, 2026].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block text-green-400">Reports Resolved</label>
                      <Input
                        type="number"
                        min="0"
                        value={reportResolved}
                        onChange={(e) => setReportResolved(e.target.value)}
                        placeholder="0"
                        className="glass"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block text-yellow-400">Reports Dismissed</label>
                      <Input
                        type="number"
                        min="0"
                        value={reportDismissed}
                        onChange={(e) => setReportDismissed(e.target.value)}
                        placeholder="0"
                        className="glass"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block text-orange-400">Reports Pending</label>
                      <Input
                        type="number"
                        min="0"
                        value={reportPending}
                        onChange={(e) => setReportPending(e.target.value)}
                        placeholder="0"
                        className="glass"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block text-red-400">Users Banned</label>
                      <Input
                        type="number"
                        min="0"
                        value={reportBanned}
                        onChange={(e) => setReportBanned(e.target.value)}
                        placeholder="0"
                        className="glass"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block text-purple-400">Users Suspended</label>
                      <Input
                        type="number"
                        min="0"
                        value={reportSuspended}
                        onChange={(e) => setReportSuspended(e.target.value)}
                        placeholder="0"
                        className="glass"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                    <Textarea
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      placeholder="Any additional notes about your moderation activities this month..."
                      className="glass min-h-[100px]"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitMonthlyReport}
                    disabled={isSubmittingReport}
                    className="w-full md:w-auto gap-2 bg-amber-600 hover:bg-amber-700"
                  >
                    {isSubmittingReport ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    Submit Report
                  </Button>
                </div>
              </section>
            </TabsContent>
          )}

          {/* Monthly Reports Tab (Owner and Admin) */}
          {(isOwner || isAdmin) && (
            <TabsContent value="monthly-reports" className="space-y-4">
              <section className="glass rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  {isOwner ? "Admin Monthly Reports" : "My Monthly Reports"}
                </h2>
                
                {(() => {
                  const visibleReports = isOwner 
                    ? monthlyReports 
                    : monthlyReports.filter(r => r.admin_user_id === user?.id);
                  
                  return visibleReports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {isOwner 
                        ? "No monthly reports submitted yet. Admins can submit their reports here."
                        : "You haven't submitted any monthly reports yet. Use the Submit Report tab to create one."}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {visibleReports.map((report) => (
                        <div key={report.id} className="border border-border/50 rounded-lg p-4 bg-secondary/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">@{report.admin?.username || "Unknown"}</span>
                              <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                                {getMonthName(report.report_month)} {report.report_year}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Submitted {new Date(report.created_at).toLocaleDateString()}
                              </span>
                              {(isOwner || report.admin_user_id === user?.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditReport(report)}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              {isOwner && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Monthly Report</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this report from @{report.admin?.username} for {getMonthName(report.report_month)} {report.report_year}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteMonthlyReport(report.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
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
                  );
                })()}
              </section>
            </TabsContent>
          )}

          {/* Edit Report Dialog */}
          <AlertDialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Edit Monthly Report</AlertDialogTitle>
                <AlertDialogDescription>
                  {editingReport && (
                    <>Update report for {getMonthName(editingReport.report_month)} {editingReport.report_year}</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-green-400">Reports Resolved</label>
                    <Input
                      type="number"
                      min="0"
                      value={editResolved}
                      onChange={(e) => setEditResolved(e.target.value)}
                      className="glass"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-yellow-400">Reports Dismissed</label>
                    <Input
                      type="number"
                      min="0"
                      value={editDismissed}
                      onChange={(e) => setEditDismissed(e.target.value)}
                      className="glass"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-orange-400">Pending</label>
                    <Input
                      type="number"
                      min="0"
                      value={editPending}
                      onChange={(e) => setEditPending(e.target.value)}
                      className="glass"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-red-400">Banned</label>
                    <Input
                      type="number"
                      min="0"
                      value={editBanned}
                      onChange={(e) => setEditBanned(e.target.value)}
                      className="glass"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-purple-400">Suspended</label>
                    <Input
                      type="number"
                      min="0"
                      value={editSuspended}
                      onChange={(e) => setEditSuspended(e.target.value)}
                      className="glass"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Additional notes..."
                    className="glass min-h-[80px]"
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUpdateMonthlyReport}
                  disabled={isEditingReport}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isEditingReport ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
