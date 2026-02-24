import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Loader2, AlertCircle, Monitor } from "lucide-react";

/**
 * KioskQrConfirm — Mobile page opened after scanning kiosk QR code.
 * Runs in WeChat's in-app browser. No sidebar, no auth required.
 *
 * URL: /kiosk/qr-confirm?s={sessionId}
 */
export default function KioskQrConfirm() {
  const { t } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("s") || "";

  const [stationId, setStationId] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch session info on mount
  useEffect(() => {
    if (!sessionId) {
      setSessionValid(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          "/api/trpc/kiosk.getQrSessionInfo?input=" + encodeURIComponent(JSON.stringify({ sessionId }))
        );
        const json = await res.json();
        const data = json?.result?.data;
        if (data?.found) {
          setSessionValid(true);
          setStationId(data.stationId);
        } else {
          setSessionValid(false);
        }
      } catch {
        setSessionValid(false);
      }
    })();
  }, [sessionId]);

  // Auto-focus input
  useEffect(() => {
    if (sessionValid && !success) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [sessionValid, success]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = employeeId.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trpc/kiosk.confirmQrSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, employeeId: trimmed }),
      });
      const json = await res.json();
      const data = json?.result?.data;

      if (data?.success) {
        setSuccess(true);
        setOperatorName(data.operatorName || trimmed);
      } else {
        setError(data?.error || t("manufacturing.kiosk.qr.verifyFailed"));
        setEmployeeId("");
        inputRef.current?.focus();
      }
    } catch {
      setError(t("manufacturing.kiosk.qr.networkError"));
    } finally {
      setLoading(false);
    }
  };

  // ─── No session ID in URL ───
  if (!sessionId || sessionValid === false) {
    return (
      <MobileShell>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-red-400">{t("manufacturing.kiosk.qr.expired")}</h1>
          <p className="text-sm text-gray-400">{t("manufacturing.kiosk.qr.regenerate")}</p>
        </div>
      </MobileShell>
    );
  }

  // ─── Loading session info ───
  if (sessionValid === null) {
    return (
      <MobileShell>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </MobileShell>
    );
  }

  // ─── Success state ───
  if (success) {
    return (
      <MobileShell>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-green-400">{t("manufacturing.kiosk.qr.loginSuccess")}</h1>
          <p className="text-lg font-medium text-white">{operatorName}</p>
          <p className="text-sm text-gray-400">{t("manufacturing.kiosk.qr.returnToTerminal")}</p>
        </div>
      </MobileShell>
    );
  }

  // ─── Confirm form ───
  return (
    <MobileShell>
      <div className="space-y-6">
        {/* Station info */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
            <Monitor className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">{t("manufacturing.kiosk.qr.loginConfirm")}</h1>
          {stationId && (
            <p className="text-sm text-gray-400">
              {t("manufacturing.kiosk.qr.loginToStation")} <span className="font-mono text-blue-400">{stationId}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t("manufacturing.kiosk.qr.enterEmployeeId")}</label>
            <input
              ref={inputRef}
              type="text"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setError(null);
              }}
              placeholder={t("manufacturing.kiosk.qr.idPlaceholder")}
              className="w-full h-14 text-xl text-center font-mono bg-gray-800 border-2 border-gray-600 rounded-xl px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-500"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !employeeId.trim()}
            className="w-full h-14 text-lg font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("manufacturing.kiosk.qr.verifying")}
              </>
            ) : (
              t("manufacturing.kiosk.qr.confirmLogin")
            )}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}

/** Minimal mobile-friendly shell (dark theme, centered card) */
function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800/50 border border-gray-700 rounded-2xl p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
