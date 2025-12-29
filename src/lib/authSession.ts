import { supabase } from "@/integrations/supabase/client";

const AUTH_BOOT_TS_KEY = "afterglow_auth_boot_ts";
let inMemoryBootTs: number | null = null;

export const resetAuthSession = async () => {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  try {
    // Clear persisted auth tokens/storage that may be corrupted.
    const keys = Object.keys(window.localStorage);
    keys.forEach((k) => {
      if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) {
        window.localStorage.removeItem(k);
      }
    });
  } catch {
    // ignore
  }

  try {
    window.sessionStorage.removeItem(AUTH_BOOT_TS_KEY);
  } catch {
    // ignore
  }

  inMemoryBootTs = null;
  window.location.href = "/auth";
};

export const getAuthBootTimestamp = () => {
  // Primary: sessionStorage (persists across route changes)
  try {
    const existing = window.sessionStorage.getItem(AUTH_BOOT_TS_KEY);
    if (existing) return Number(existing) || Date.now();

    const now = Date.now();
    window.sessionStorage.setItem(AUTH_BOOT_TS_KEY, String(now));
    return now;
  } catch {
    // Fallback: in-memory (still stable within this page load)
    if (inMemoryBootTs == null) inMemoryBootTs = Date.now();
    return inMemoryBootTs;
  }
};

export const clearAuthBootTimestamp = () => {
  try {
    window.sessionStorage.removeItem(AUTH_BOOT_TS_KEY);
  } catch {
    // ignore
  }
  inMemoryBootTs = null;
};
