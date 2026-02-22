/**
 * DashboardModeContext — Dual-mode display for GRT Vision screens
 *
 * EXTERNAL (default on boot): Safe for visiting clients, hides sensitive data
 * INTERNAL: Full operational view with names, shortages, red/black lists
 *
 * INTERNAL auto-reverts to EXTERNAL after 30 minutes.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export type DisplayMode = "EXTERNAL" | "INTERNAL";

interface DashboardModeState {
  displayMode: DisplayMode;
  isUnlocked: boolean;
  timeRemainingMs: number;
  unlockInternalMode: (pin: string) => boolean;
  lockExternalMode: () => void;
}

const UNLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MASTER_PIN = "8888"; // matches server-side

const DashboardModeContext = createContext<DashboardModeState>({
  displayMode: "EXTERNAL",
  isUnlocked: false,
  timeRemainingMs: 0,
  unlockInternalMode: () => false,
  lockExternalMode: () => {},
});

export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("EXTERNAL");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown tick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!expiresAt) {
      setTimeRemainingMs(0);
      return;
    }
    timerRef.current = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setDisplayMode("EXTERNAL");
        setExpiresAt(null);
        setTimeRemainingMs(0);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTimeRemainingMs(remaining);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  const unlockInternalMode = useCallback((pin: string): boolean => {
    if (pin !== MASTER_PIN) return false;
    setDisplayMode("INTERNAL");
    setExpiresAt(Date.now() + UNLOCK_DURATION_MS);
    return true;
  }, []);

  const lockExternalMode = useCallback(() => {
    setDisplayMode("EXTERNAL");
    setExpiresAt(null);
    setTimeRemainingMs(0);
  }, []);

  return (
    <DashboardModeContext.Provider
      value={{
        displayMode,
        isUnlocked: displayMode === "INTERNAL",
        timeRemainingMs,
        unlockInternalMode,
        lockExternalMode,
      }}
    >
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  return useContext(DashboardModeContext);
}
