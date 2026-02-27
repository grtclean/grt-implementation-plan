/**
 * useIdleTimeout — Forces re-authentication after inactivity
 *
 * Monitors mouse, keyboard, touch, and scroll events. If no user
 * activity is detected within `timeoutMs` (default: 30 minutes),
 * shows a re-auth prompt. On mobile/PWA, also listens for
 * visibilitychange so backgrounded tabs still trigger timeout.
 */

import { useEffect, useRef, useCallback, useState } from "react";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "pointerdown",
] as const;

const STORAGE_KEY = "grt-last-activity";

interface UseIdleTimeoutOptions {
  timeoutMs?: number;
  onTimeout: () => void;
}

export function useIdleTimeout({
  timeoutMs = 30 * 60 * 1000, // 30 minutes
  onTimeout,
}: UseIdleTimeoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setShowWarning(false);

    // Persist last activity timestamp for cross-tab awareness
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* quota exceeded — ignore */ }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Show warning 2 minutes before timeout
    const warningAt = Math.max(0, timeoutMs - 2 * 60 * 1000);
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, warningAt);

    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Check if we were already idle before this mount (e.g., page refresh)
    try {
      const last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      if (last > 0 && Date.now() - last > timeoutMs) {
        onTimeoutRef.current();
        return;
      }
    } catch { /* ignore */ }

    resetTimer();

    const throttledReset = throttle(resetTimer, 5000);

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, throttledReset, { passive: true });
    }

    // Also reset on visibility change (mobile tab foreground)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Check elapsed time since last activity
        try {
          const last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
          if (last > 0 && Date.now() - last > timeoutMs) {
            onTimeoutRef.current();
            return;
          }
        } catch { /* ignore */ }
        resetTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, throttledReset);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [resetTimer, timeoutMs]);

  return { showWarning, resetTimer };
}

// Simple throttle to avoid firing timer reset on every pixel of mouse move
function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}
