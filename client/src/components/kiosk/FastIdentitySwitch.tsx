import { useState, useRef, useEffect } from "react";
import { User, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { useKioskSessionContext } from "@/hooks/useKioskSession";

interface FastIdentitySwitchProps {
  onIdentified?: () => void;
}

export default function FastIdentitySwitch({ onIdentified }: FastIdentitySwitchProps) {
  const session = useKioskSessionContext();
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Re-focus when not loading
  useEffect(() => {
    if (!loading && !showSuccess) {
      inputRef.current?.focus();
    }
  }, [loading, showSuccess]);

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
      // Brief success display, then transition
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">操作员身份验证</h1>
          <p className="text-muted-foreground mt-2">
            工位 <span className="font-mono text-primary">{session.stationId}</span>
          </p>
        </div>

        {/* Input Form */}
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
