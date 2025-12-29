import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: ReactNode;
}

const REQUIRE_AUTH_TIMEOUT_MS = 8000;

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const t = window.setTimeout(() => setTimedOut(true), REQUIRE_AUTH_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth init is stuck, fail closed (treat as logged out) instead of infinite loading.
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
