import { useState, useCallback } from "react";

const RATE_LIMIT_KEY_PREFIX = "afterglow_rate_limit_";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
}

interface RateLimitState {
  attempts: number;
  windowStart: number;
}

export const useRateLimit = (key: string, config: RateLimitConfig) => {
  const storageKey = `${RATE_LIMIT_KEY_PREFIX}${key}`;

  const getState = useCallback((): RateLimitState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse rate limit state:", e);
    }
    return { attempts: 0, windowStart: Date.now() };
  }, [storageKey]);

  const setState = useCallback((state: RateLimitState) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [storageKey]);

  const checkRateLimit = useCallback((): { allowed: boolean; remainingAttempts: number; resetIn: number } => {
    const state = getState();
    const now = Date.now();
    
    // Check if we're in a new window
    if (now - state.windowStart >= config.windowMs) {
      // Reset the window
      setState({ attempts: 0, windowStart: now });
      return { allowed: true, remainingAttempts: config.maxAttempts, resetIn: 0 };
    }
    
    const remainingAttempts = Math.max(0, config.maxAttempts - state.attempts);
    const resetIn = Math.ceil((config.windowMs - (now - state.windowStart)) / 1000);
    
    return {
      allowed: state.attempts < config.maxAttempts,
      remainingAttempts,
      resetIn,
    };
  }, [config, getState, setState]);

  const recordAttempt = useCallback(() => {
    const state = getState();
    const now = Date.now();
    
    // Check if we're in a new window
    if (now - state.windowStart >= config.windowMs) {
      setState({ attempts: 1, windowStart: now });
    } else {
      setState({ ...state, attempts: state.attempts + 1 });
    }
  }, [config.windowMs, getState, setState]);

  return {
    checkRateLimit,
    recordAttempt,
  };
};

// Preset configurations
export const RATE_LIMITS = {
  imageGeneration: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  videoGeneration: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },  // 5 per hour
} as const;
