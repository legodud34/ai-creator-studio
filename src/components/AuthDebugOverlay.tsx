import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { resetAuthSession } from "@/lib/authSession";

type AuthDebugEvent = {
  t: number;
  type: string;
  detail?: string;
};

const getDebugEnabled = () => {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("debugAuth") === "1";
  } catch {
    return false;
  }
};

const readEvents = (): AuthDebugEvent[] => {
  const w = window as unknown as { __afterglowAuthDebug?: { events?: AuthDebugEvent[] } };
  return w.__afterglowAuthDebug?.events ?? [];
};

const maskToken = (token?: string | null) => {
  if (!token) return "(none)";
  return `${token.slice(0, 8)}…${token.slice(-6)}`;
};

const AuthDebugOverlay = () => {
  const enabled = useMemo(getDebugEnabled, []);
  const { user, session, isLoading } = useAuth();
  const location = useLocation();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 750);
    return () => window.clearInterval(t);
  }, [enabled]);

  if (!enabled) return null;

  const events = readEvents();
  const recent = events.slice(-12);

  return (
    <aside className="fixed bottom-4 left-4 z-50 w-[min(92vw,420px)] rounded-xl border border-border/60 bg-background/70 backdrop-blur-md shadow-lg">
      <div className="p-3 border-b border-border/60 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Auth Debug</p>
          <p className="text-xs text-muted-foreground">?debugAuth=1</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => resetAuthSession()}>
          Reset session
        </Button>
      </div>

      <div className="p-3 space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-muted-foreground">route</div>
          <div className="col-span-2 font-mono break-all">{location.pathname}</div>

          <div className="text-muted-foreground">isLoading</div>
          <div className="col-span-2 font-mono">{String(isLoading)}</div>

          <div className="text-muted-foreground">user</div>
          <div className="col-span-2 font-mono break-all">{user?.id ?? "(null)"}</div>

          <div className="text-muted-foreground">token</div>
          <div className="col-span-2 font-mono break-all">{maskToken(session?.access_token)}</div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <p className="text-muted-foreground mb-1">events (latest)</p>
          <ul className="space-y-1">
            {recent.length === 0 ? (
              <li className="font-mono">(none)</li>
            ) : (
              recent.map((e) => (
                <li key={`${e.t}-${e.type}`} className="font-mono break-all">
                  {new Date(e.t).toLocaleTimeString()} — {e.type}
                  {e.detail ? `: ${e.detail}` : ""}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* keep tick referenced so interval isn't tree-shaken */}
      <span className="hidden">{tick}</span>
    </aside>
  );
};

export default AuthDebugOverlay;
