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
  is_owner?: boolean;
  is_banned?: boolean;
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
  reporter?: { username: string };
  reported_user?: { username: string };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [banReason, setBanReason] = useState("");

  const [roleUsername, setRoleUsername] = useState("");
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);

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
      const hasAdminAccess = roles.includes("admin") || roles.includes("owner");
      
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
      const [{ data: verifiedUsers }, { data: adminUsers }, { data: ownerUsers }, { data: bannedUsers }] =
        await Promise.all([
          supabase.from("verified_users").select("user_id"),
          supabase.from("user_roles").select("user_id").eq("role", "admin"),
          supabase.from("user_roles").select("user_id").eq("role", "owner"),
          supabase.from("banned_users").select("user_id"),
        ]);

      const verifiedIds = new Set(verifiedUsers?.map((v) => v.user_id) || []);
      const adminIds = new Set(adminUsers?.map((a) => a.user_id) || []);
      const ownerIds = new Set(ownerUsers?.map((o) => o.user_id) || []);
      const bannedIds = new Set(bannedUsers?.map((b) => b.user_id) || []);

      const enrichedProfiles = profiles.map((p) => {
        const isOwner = ownerIds.has(p.id);
        return {
          ...p,
          is_verified: isOwner || verifiedIds.has(p.id), // Owners are always verified
          is_admin: adminIds.has(p.id),
          is_owner: isOwner,
          is_banned: bannedIds.has(p.id),
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

  const handleGrantRole = async (userId: string, role: "admin" | "owner") => {
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

  const handleRevokeRole = async (userId: string, role: "admin" | "owner") => {
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

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="users" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />
              Reports
              {pendingReports.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingReports.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {isOwner && (
              <section className="glass rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-3">Add / Remove Admin</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={roleUsername}
                    onChange={(e) => setRoleUsername(e.target.value)}
                    placeholder="Username (e.g. @jane)"
                    className="glass"
                  />
                  <div className="flex gap-2">
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
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Row buttons only show for non-owner users; this box lets you manage roles even if the user list only contains you.
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
                          {u.is_owner && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              Owner
                            </Badge>
                          )}
                          {u.is_admin && <Badge variant="secondary">Admin</Badge>}
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
                          {/* Verification */}
                          {u.is_verified ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnverifyUser(u.id)}
                              className="text-muted-foreground"
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

                          {/* Role Management - Only for owners */}
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

                          {/* Ban/Unban */}
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
                                    This will prevent the user from accessing the
                                    platform.
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
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
