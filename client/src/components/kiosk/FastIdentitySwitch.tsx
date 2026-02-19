import { useState, useRef, useEffect, useCallback } from "react";
import { User, Loader2, AlertCircle, ShieldAlert, QrCode, Keyboard } from "lucide-react";
import { useKioskSessionContext } from "@/hooks/useKioskSession";
import QRCode from "qrcode";

interface FastIdentitySwitchProps {
  onIdentified?: () => void;
}

type Tab = "manual" | "qr";

export default function FastIdentitySwitch({ onIdentified }: FastIdentitySwitchProps) {
  const session = useKioskSessionContext();
  const [activeTab, setActiveTab] = useState<Tab>("manual");

  // ─── Manual input state ───
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── QR state ───
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingRef = useRef(false); // guard against concurrent createQrSession

  // Stable refs for callbacks used inside intervals (avoids stale closures & effect churn)
  const identifyRef = useRef(session.identify);
  identifyRef.current = session.identify;
  const onIdentifiedRef = useRef(onIdentified);
  onIdentifiedRef.current = onIdentified;

  // Auto-focus on mount / tab switch
  useEffect(() => {
    if (activeTab === "manual") {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Re-focus when not loading
  useEffect(() => {
    if (activeTab === "manual" && !loading && !showSuccess) {
      inputRef.current?.focus();
    }
  }, [activeTab, loading, showSuccess]);

  // ─── QR session creation (with ref guard to prevent concurrent calls) ───
  const createQrSession = useCallback(async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setQrLoading(true);
    setQrDataUrl(null);
    try {
      const res = await fetch("/api/trpc/kiosk.createQrSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId: session.stationId, departmentCode: session.departmentCode }),
      });
      const json = await res.json();
      const sid = json?.result?.data?.sessionId;
      if (!sid) throw new Error("No sessionId");

      setQrSessionId(sid);
      const url = `${window.location.origin}/kiosk/qr-confirm?s=${sid}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("[Kiosk] createQrSession failed:", err);
    } finally {
      setQrLoading(false);
      creatingRef.current = false;
    }
  }, [session.stationId, session.departmentCode]);

  // ─── Poll for QR confirmation ───
  // Only depends on activeTab and qrSessionId — callbacks accessed via refs
  useEffect(() => {
    if (activeTab !== "qr" || !qrSessionId) return;

    const sid = qrSessionId; // capture for closure stability

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          "/api/trpc/kiosk.pollQrSession?input=" + encodeURIComponent(JSON.stringify({ sessionId: sid })),
          { credentials: "include" }
        );
        const json = await res.json();
        const data = json?.result?.data;

        if (data?.status === "confirmed" && data.operator) {
          // Stop polling FIRST to prevent duplicate identify calls
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          const result = await identifyRef.current(data.operator.name);
          if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
              setShowSuccess(false);
              onIdentifiedRef.current?.();
            }, 1000);
          }
        } else if (data?.status === "expired") {
          // Session expired on server, stop polling — refresh effect will detect stale session
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          // Create a fresh session
          setQrSessionId(null);
        }
      } catch {
        // Network error, keep polling
      }
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeTab, qrSessionId]);

  // ─── Auto-refresh QR before TTL expires (4.5 min) ───
  useEffect(() => {
    if (activeTab !== "qr" || !qrSessionId) return;

    refreshRef.current = setTimeout(() => {
      // Invalidate current session so init effect triggers a new one
      setQrSessionId(null);
    }, 4.5 * 60 * 1000);

    return () => {
      if (refreshRef.current) {
        clearTimeout(refreshRef.current);
        refreshRef.current = null;
      }
    };
  }, [activeTab, qrSessionId]);

  // ─── Init QR when tab is active but no session exists ───
  useEffect(() => {
    if (activeTab === "qr" && !qrSessionId && !creatingRef.current) {
      createQrSession();
    }
  }, [activeTab, qrSessionId, createQrSession]);

  // ─── Reset QR state when switching away from QR tab ───
  const handleTabSwitch = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    if (activeTab === "qr") {
      // Reset QR state so a fresh session is created on re-entry
      setQrSessionId(null);
      setQrDataUrl(null);
    }
    setActiveTab(tab);
  }, [activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (refreshRef.current) clearTimeout(refreshRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = employeeId.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    const result = await session.identify(trimmed);

    setLoading(false);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setEmployeeId("");
        onIdentified?.();
      }, 1000);
    } else {
      setError(result.error || "识别失败");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setEmployeeId("");
      inputRef.current?.focus();
    }
  };

  // Success state — brief green flash
  if (showSuccess && session.operator) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-card border border-green-500/30 rounded-2xl p-12 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-green-400">{session.operator.name}</h2>
          <p className="text-muted-foreground mt-2">身份验证成功</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className={`bg-card border border-border rounded-2xl p-8 w-full max-w-lg ${shake ? "animate-shake" : ""}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">操作员身份验证</h1>
          <p className="text-muted-foreground mt-2">
            工位 <span className="font-mono text-primary">{session.stationId}</span>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border border-border rounded-lg mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => handleTabSwitch("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "manual"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            输入工号
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("qr")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === "qr"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="w-4 h-4" />
            微信扫码
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "manual" ? (
          <>
            {/* Manual Input Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    setError(null);
                  }}
                  placeholder="请扫描工牌或输入工号"
                  className="w-full h-16 text-2xl text-center font-mono bg-background border-2 border-border rounded-xl px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 placeholder:text-lg"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={loading}
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error.includes("资质") ? (
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !employeeId.trim()}
                className="w-full h-14 text-lg font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    验证中...
                  </>
                ) : (
                  "确认身份"
                )}
              </button>
            </form>

            {/* Hint */}
            <p className="text-xs text-muted-foreground text-center mt-6">
              使用条码扫描枪扫描工牌即可自动提交 · VDA 6.3 P6.3
            </p>
          </>
        ) : (
          <>
            {/* QR Code Display */}
            <div className="flex flex-col items-center space-y-4 py-4">
              {qrLoading ? (
                <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted/20 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : qrDataUrl ? (
                <div className="p-3 bg-white rounded-xl">
                  <img src={qrDataUrl} alt="QR Code" className="w-[256px] h-[256px]" />
                </div>
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted/20 rounded-xl">
                  <p className="text-muted-foreground text-sm">QR 生成失败</p>
                </div>
              )}

              <p className="text-muted-foreground text-center text-sm">
                请使用微信扫描二维码
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                等待扫码确认...
              </div>
            </div>
          </>
        )}
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
