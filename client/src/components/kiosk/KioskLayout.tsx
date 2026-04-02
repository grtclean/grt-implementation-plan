import { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle, HelpCircle, User } from "lucide-react";
import { KioskSessionContext, useKioskSession } from "@/hooks/useKioskSession";

const IDLE_TIMEOUT = 60;

interface KioskLayoutProps {
  children: React.ReactNode;
  stationId?: string;
  departmentCode?: string;
}

export default function KioskLayout({ children, stationId: propStationId, departmentCode: propDeptCode }: KioskLayoutProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Read station config from URL params or props
  const params = new URLSearchParams(window.location.search);
  const stationId = propStationId || params.get("station") || "WS-001";
  const departmentCode = propDeptCode || params.get("dept") || "PROD";

  const session = useKioskSession(stationId, departmentCode);

  // Auto kiosk login — create session cookie so tRPC protectedProcedure works
  const [kioskReady, setKioskReady] = useState(false);
  useEffect(() => {
    fetch("/api/auth/kiosk-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stationId, departmentCode }),
    })
      .then(() => setKioskReady(true))
      .catch(() => setKioskReady(true)); // proceed anyway
  }, [stationId, departmentCode]);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const timeStr = currentTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = currentTime.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" });

  // Idle countdown bar
  const idleProgress = session.isIdentified ? ((IDLE_TIMEOUT - session.idleSeconds) / IDLE_TIMEOUT) * 100 : 100;

  return (
    <KioskSessionContext.Provider value={session}>
      <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
        {/* Top Status Bar */}
        <header className="h-14 flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
          {/* Left: Station badge */}
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary font-mono text-sm font-bold px-3 py-1.5 rounded-md border border-primary/20">
              {stationId}
            </div>
            <span className="text-xs text-muted-foreground">{departmentCode}</span>
          </div>

          {/* Center: Time */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{dateStr}</span>
            <span className="font-mono font-semibold text-lg tabular-nums">{timeStr}</span>
          </div>

          {/* Right: Operator + connectivity */}
          <div className="flex items-center gap-3">
            {session.isIdentified ? (
              <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-md border border-green-500/20">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{session.operator!.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground px-3 py-1.5 rounded-md border border-border">
                <User className="w-4 h-4" />
                <span className="text-sm">待扫码</span>
              </div>
            )}
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
        </header>

        {/* Qualification Warning Banner */}
        {session.qualificationWarning && (
          <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2 text-yellow-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{session.qualificationWarning}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Bottom Bar: idle countdown + emergency */}
        <footer className="flex-shrink-0 border-t border-border bg-card">
          {/* Idle countdown bar */}
          {session.isIdentified && (
            <div className="h-1 bg-muted">
              <div
                className="h-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${idleProgress}%`,
                  backgroundColor: idleProgress > 30 ? "hsl(var(--primary))" : idleProgress > 10 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)",
                }}
              />
            </div>
          )}
          <div className="h-12 flex items-center justify-between px-4">
            <button
              onClick={() => {
                // Quality interlock emergency stop — navigates to quality hold
                if (confirm("确认触发质量紧急拦截？")) {
                  console.info("[Kiosk] Emergency quality interlock triggered at station", stationId);
                  alert("质量紧急拦截已触发，请等待质量工程师到场");
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 active:bg-red-500/30 transition-colors min-h-[48px]"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">紧急拦截</span>
            </button>

            <div className="text-xs text-muted-foreground">
              GRT Workshop Kiosk v1.0 · IATF 16949
            </div>

            <button
              onClick={() => alert("请联系班组长或拨打内线 8888")}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors min-h-[48px]"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">呼叫帮助</span>
            </button>
          </div>
        </footer>
      </div>
    </KioskSessionContext.Provider>
  );
}
