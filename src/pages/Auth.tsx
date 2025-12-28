import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { z } from "zod";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  agreedToTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the Terms of Service and Privacy Policy" }) }),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const newPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthMode = "signin" | "signup" | "forgot" | "reset";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from location state, default to "/"
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  // Check for password reset token in URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setMode("reset");
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && mode !== "reset") {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from, mode]);

  const validateForm = () => {
    setErrors({});
    
    try {
      if (mode === "signup") {
        signUpSchema.parse({ username, email, password, agreedToTerms });
      } else if (mode === "signin") {
        signInSchema.parse({ email, password });
      } else if (mode === "forgot") {
        resetSchema.parse({ email });
      } else if (mode === "reset") {
        newPasswordSchema.parse({ password });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: "Check your email",
          description: "We sent you a password reset link.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been reset successfully.",
        });
        // Clear the hash and redirect
        window.location.hash = "";
        navigate("/", { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "forgot") {
      return handleForgotPassword();
    }
    
    if (mode === "reset") {
      return handleResetPassword();
    }
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, username);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Try signing in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome to Afterglow!",
            description: "Your account has been created.",
          });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "Successfully signed in.",
          });
          navigate(from, { replace: true });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setAgreedToTerms(false);
    setResetEmailSent(false);
    setPassword("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case "signup": return "Create your account";
      case "forgot": return "Reset your password";
      case "reset": return "Set new password";
      default: return "Welcome back";
    }
  };

  return (
    <div className="min-h-screen gradient-surface flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-afterglow mb-2">
            Afterglow AI
          </h1>
          <p className="text-muted-foreground">{getTitle()}</p>
        </div>

        <div className="glass rounded-2xl p-6 md:p-8">
          {/* Back button for forgot/reset modes */}
          {(mode === "forgot" || mode === "reset") && (
            <button
              onClick={() => switchMode("signin")}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to sign in
            </button>
          )}

          {mode === "forgot" && resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Check your email</h3>
              <p className="text-muted-foreground text-sm">
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <Button
                variant="ghost"
                onClick={() => switchMode("signin")}
                className="mt-4"
              >
                Return to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="coolcreator"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-secondary/50 border-border/50"
                    disabled={isLoading}
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username}</p>
                  )}
                </div>
              )}

              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary/50 border-border/50"
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              )}

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {mode === "reset" ? "New Password" : "Password"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-secondary/50 border-border/50 pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                  {(mode === "signup" || mode === "reset") && (
                    <PasswordStrengthIndicator password={password} />
                  )}
                </div>
              )}

              {mode === "signup" && (
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      disabled={isLoading}
                      className="mt-1"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  {errors.agreedToTerms && (
                    <p className="text-xs text-destructive">{errors.agreedToTerms}</p>
                  )}
                </div>
              )}

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "signup" ? (
                  "Create Account"
                ) : mode === "forgot" ? (
                  "Send Reset Link"
                ) : mode === "reset" ? (
                  "Update Password"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          )}

          {(mode === "signin" || mode === "signup") && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "Don't have an account?"}
              </span>{" "}
              <button
                onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
                className="text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                {mode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
