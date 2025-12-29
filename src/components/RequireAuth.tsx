import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthBootTimestamp, resetAuthSession } from "@/lib/authSession";

interface RequireAuthProps {
  children: ReactNode;
}

const REQUIRE_AUTH_TIMEOUT_MS = 8000;

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Force a re-render when the timeout should flip the UI.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isLoading) return;

    const bootTs = getAuthBootTimestamp();
    const remaining = Math.max(0, REQUIRE_AUTH_TIMEOUT_MS - (Date.now() - bootTs));
    const t = window.setTimeout(() => setNow(Date.now()), remaining + 10);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  const bootTs = getAuthBootTimestamp();
  const deadlineReached = isLoading && now - bootTs > REQUIRE_AUTH_TIMEOUT_MS;

  if (isLoading && !deadlineReached) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth init is stuck, fail closed (treat as logged out) instead of infinite loading.
  if (!user) {
    if (deadlineReached) {
      return (
        <main className="min-h-screen gradient-surface flex items-center justify-center p-6">
          <section className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
            <header className="space-y-1">
              <h1 className="text-lg font-semibold">Still loading…</h1>
              <p className="text-sm text-muted-foreground">
                Your session didn’t finish initializing. You can go to login or reset the saved session.
              </p>
            </header>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="w-full" onClick={() => (window.location.href = "/auth")}> 
                Go to login
              </Button>
              <Button className="w-full" variant="outline" onClick={() => resetAuthSession()}>
                Reset session
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: add <span className="font-mono">?debugAuth=1</span> to the URL to see auth diagnostics.
            </p>

            <p className="text-xs text-muted-foreground">
              Debug: <span className="font-mono">from={location.pathname}</span>
            </p>
          </section>
        </main>
      );
    }

    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;

