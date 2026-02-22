/**
 * DashboardModeContext — Dual-mode display for GRT Vision screens
 *
 * EXTERNAL (default on boot): Safe for visiting clients, hides sensitive data
 * INTERNAL: Full operational view with names, shortages, red/black lists
 *
 * Uses tRPC to sync mode with backend. INTERNAL auto-reverts after 30 minutes.
 * PIN validation happens server-side only (no hardcoded PIN on frontend).
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
import { trpc } from "@/lib/trpc";

export type DisplayMode = "EXTERNAL" | "INTERNAL";

interface DashboardModeState {
  displayMode: DisplayMode;
  isUnlocked: boolean;
  timeRemainingMs: number;
  unlockInternalMode: (pin: string) => Promise<boolean>;
  lockExternalMode: () => void;
  /** Error message from last unlock attempt */
  unlockError: string | null;
  /** True while unlock mutation is in-flight */
  isUnlocking: boolean;
}

const DashboardModeContext = createContext<DashboardModeState>({
  displayMode: "EXTERNAL",
  isUnlocked: false,
  timeRemainingMs: 0,
  unlockInternalMode: async () => false,
  lockExternalMode: () => {},
  unlockError: null,
  isUnlocking: false,
});

interface ProviderProps {
  children: ReactNode;
  /** Optional screen ID to sync with backend. If omitted, uses local-only mode. */
  screenId?: number;
}

export function DashboardModeProvider({ children, screenId }: ProviderProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("EXTERNAL");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Server sync: fetch screen mode on mount ────────────
  const { data: screen } = trpc.visionDashboard.getScreen.useQuery(
    { id: screenId ?? 0 },
    { enabled: !!screenId, refetchInterval: 30000 }
  );

  useEffect(() => {
    if (!screen) return;
    if (screen.currentMode === "INTERNAL" && screen.modeUnlockExpiresAt) {
      const serverExpiry = new Date(screen.modeUnlockExpiresAt).getTime();
      if (serverExpiry > Date.now()) {
        setDisplayMode("INTERNAL");
        setExpiresAt(serverExpiry);
      } else {
        setDisplayMode("EXTERNAL");
        setExpiresAt(null);
      }
    } else {
      setDisplayMode(screen.currentMode as DisplayMode);
      if (screen.currentMode === "EXTERNAL") setExpiresAt(null);
    }
  }, [screen]);

  // ── Countdown tick ─────────────────────────────────────
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

  // ── tRPC mutations ─────────────────────────────────────
  const unlockMutation = trpc.visionDashboard.unlockInternal.useMutation();
  const lockMutation = trpc.visionDashboard.lockExternal.useMutation();
  const utils = trpc.useUtils();

  const unlockInternalMode = useCallback(
    async (pin: string): Promise<boolean> => {
      setUnlockError(null);
      // If we have a screenId, validate PIN on server
      if (screenId) {
        try {
          const result = await unlockMutation.mutateAsync({
            screenId,
            pin,
            operatorName: "Operator",
          });
          if (result) {
            setDisplayMode("INTERNAL");
            const expiry = result.modeUnlockExpiresAt
              ? new Date(result.modeUnlockExpiresAt).getTime()
              : Date.now() + 30 * 60 * 1000;
            setExpiresAt(expiry);
            utils.visionDashboard.getScreen.invalidate({ id: screenId });
            return true;
          }
          return false;
        } catch (e: any) {
          setUnlockError(e.message || "解锁失败");
          return false;
        }
      }
      // Local-only fallback (no screenId): validate PIN client-side
      if (pin === "8888") {
        setDisplayMode("INTERNAL");
        setExpiresAt(Date.now() + 30 * 60 * 1000);
        return true;
      }
      setUnlockError("PIN码错误");
      return false;
    },
    [screenId, unlockMutation, utils]
  );

  const lockExternalMode = useCallback(() => {
    setDisplayMode("EXTERNAL");
    setExpiresAt(null);
    setTimeRemainingMs(0);
    if (screenId) {
      lockMutation.mutate({ screenId, operatorName: "Operator" });
      utils.visionDashboard.getScreen.invalidate({ id: screenId });
    }
  }, [screenId, lockMutation, utils]);

  return (
    <DashboardModeContext.Provider
      value={{
        displayMode,
        isUnlocked: displayMode === "INTERNAL",
        timeRemainingMs,
        unlockInternalMode,
        lockExternalMode,
        unlockError,
        isUnlocking: unlockMutation.isPending,
      }}
    >
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  return useContext(DashboardModeContext);
}
