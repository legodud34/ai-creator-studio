import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface BanStatus {
  isBanned: boolean;
  isSuspended: boolean;
  reason: string | null;
  expiresAt: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  banStatus: BanStatus | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  const checkBanStatus = async (userId: string): Promise<BanStatus | null> => {
    const { data, error } = await supabase
      .from("banned_users")
      .select("reason, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const now = new Date();
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

    // If there's an expiry date and it's in the future, user is suspended
    if (expiresAt && expiresAt > now) {
      return {
        isBanned: false,
        isSuspended: true,
        reason: data.reason,
        expiresAt: data.expires_at,
      };
    }

    // If there's no expiry date, user is permanently banned
    if (!expiresAt) {
      return {
        isBanned: true,
        isSuspended: false,
        reason: data.reason,
        expiresAt: null,
      };
    }

    // If expiry date has passed, remove the ban record (suspension expired)
    if (expiresAt <= now) {
      await supabase
        .from("banned_users")
        .delete()
        .eq("user_id", userId);
      return null;
    }

    return null;
  };

  const handleBannedUser = async (status: BanStatus) => {
    setBanStatus(status);
    
    if (status.isBanned) {
      toast({
        title: "Account Banned",
        description: `Your account has been permanently banned. Reason: ${status.reason || "No reason provided"}`,
        variant: "destructive",
      });
    } else if (status.isSuspended) {
      const expiryDate = new Date(status.expiresAt!).toLocaleDateString();
      toast({
        title: "Account Suspended",
        description: `Your account is suspended until ${expiryDate}. Reason: ${status.reason || "No reason provided"}`,
        variant: "destructive",
      });
    }

    // Sign out the banned/suspended user
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            // Check ban status first
            const status = await checkBanStatus(session.user.id);
            if (status && (status.isBanned || status.isSuspended)) {
              await handleBannedUser(status);
              return;
            }
            setBanStatus(null);
            await fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setBanStatus(null);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check ban status first
        const status = await checkBanStatus(session.user.id);
        if (status && (status.isBanned || status.isSuspended)) {
          await handleBannedUser(status);
          setIsLoading(false);
          return;
        }
        setBanStatus(null);
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
        },
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    // Check if user is banned/suspended after successful sign in
    if (data.user) {
      const status = await checkBanStatus(data.user.id);
      if (status && (status.isBanned || status.isSuspended)) {
        await handleBannedUser(status);
        
        if (status.isBanned) {
          return { error: new Error(`Your account has been banned. Reason: ${status.reason || "No reason provided"}`) };
        } else {
          const expiryDate = new Date(status.expiresAt!).toLocaleDateString();
          return { error: new Error(`Your account is suspended until ${expiryDate}. Reason: ${status.reason || "No reason provided"}`) };
        }
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setBanStatus(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error("Not authenticated") };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (!error) {
      await fetchProfile(user.id);
    }

    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        banStatus,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
