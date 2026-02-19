import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface OperatorInfo {
  id: number;
  name: string;
  role: string;
  qualifications: { name: string; expiresAt: string | null; isValid: boolean }[];
}

export interface KioskSession {
  stationId: string;
  departmentCode: string;
  operator: OperatorInfo | null;
  isIdentified: boolean;
  idleSeconds: number;
  qualificationWarning: string | null;
  identify: (employeeId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const IDLE_TIMEOUT = 60; // seconds

export function useKioskSession(stationId: string, departmentCode: string): KioskSession {
  const [operator, setOperator] = useState<OperatorInfo | null>(null);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [qualificationWarning, setQualificationWarning] = useState<string | null>(null);
  const idleRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(() => {
    setOperator(null);
    setIdleSeconds(0);
    setQualificationWarning(null);
    idleRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset idle counter on user activity
  const resetIdle = useCallback(() => {
    idleRef.current = 0;
    setIdleSeconds(0);
  }, []);

  // Start idle timer when operator is identified
  useEffect(() => {
    if (!operator) return;

    const handleActivity = () => resetIdle();
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    intervalRef.current = setInterval(() => {
      idleRef.current += 1;
      setIdleSeconds(idleRef.current);
      if (idleRef.current >= IDLE_TIMEOUT) {
        logout();
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [operator, logout, resetIdle]);

  const identify = useCallback(async (employeeId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/trpc/kiosk.identifyOperator?input=" + encodeURIComponent(JSON.stringify({ employeeId })), {
        credentials: "include",
      });
      const json = await res.json();
      const data = json?.result?.data;

      if (!data?.operator) {
        return { success: false, error: "工号未找到" };
      }

      setOperator(data.operator);
      idleRef.current = 0;
      setIdleSeconds(0);

      // Check operator qualification (VDA 6.3 P6.3)
      if (data.qualificationStatus === "expired") {
        setQualificationWarning("资质已过期，请联系主管");
        return { success: false, error: "资质已过期，请联系主管" };
      }
      if (data.qualificationStatus === "warning") {
        setQualificationWarning("资质即将过期，请及时更新");
      } else {
        setQualificationWarning(null);
      }

      return { success: true };
    } catch (err) {
      console.error("[Kiosk] identifyOperator failed:", err);
      return { success: false, error: "网络错误，请重试" };
    }
  }, []);

  return {
    stationId,
    departmentCode,
    operator,
    isIdentified: operator !== null,
    idleSeconds,
    qualificationWarning,
    identify,
    logout,
  };
}

// Context for sharing kiosk session across components
export const KioskSessionContext = createContext<KioskSession | null>(null);

export function useKioskSessionContext(): KioskSession {
  const ctx = useContext(KioskSessionContext);
  if (!ctx) {
    throw new Error("useKioskSessionContext must be used within KioskSessionContext.Provider");
  }
  return ctx;
}
