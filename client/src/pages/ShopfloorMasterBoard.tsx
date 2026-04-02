/**
 * 车间总屏 — Shopfloor Master Board
 *
 * Standalone fullscreen display for production floor.
 * EXTERNAL: High-level T1-T15 progress, aggregate FPY, no names.
 * INTERNAL: Red/Black list, material shortages, plan vs actual, employee names.
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import FloatingNav from '@/components/FloatingNav';
import {
  DashboardModeProvider,
  useDashboardMode,
} from "@/contexts/DashboardModeContext";
import {
  Lock,
  Unlock,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Package,
  Gauge,
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  Wrench,
  Factory,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface StationData {
  code: string;
  name: string;
  status: "running" | "idle" | "alarm";
  fpy: number;
  planQty: number;
  actualQty: number;
  operator?: string | null;
  cycleTime: number;
}

interface RedBlackEntry {
  name: string;
  dept: string;
  type: "red" | "black";
  reason: string;
  count: number;
}

interface ShortageAlert {
  station: string;
  material: string;
  eta: string;
  buyer: string;
  severity: "critical" | "warning";
}

// ─── Unlock Dialog (same pattern) ───────────────────────────

function UnlockDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { unlockInternalMode, unlockError, isUnlocking } = useDashboardMode();
  const [pin, setPin] = useState("");
  const [localError, setLocalError] = useState(false);

  async function handleSubmit() {
    const ok = await unlockInternalMode(pin);
    if (ok) {
      onClose();
    } else {
      setLocalError(true);
      setPin("");
      setTimeout(() => setLocalError(false), 2000);
    }
  }

  const hasError = localError || !!unlockError;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-8 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-cyan-400" />
          <h3 className="text-white text-lg font-bold">{t("manufacturing.shopfloor.switchInternal")}</h3>
        </div>
        <p className="text-white/50 text-sm mb-4">{t("manufacturing.shopfloor.pinHint")}</p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isUnlocking && handleSubmit()}
          placeholder={t("manufacturing.shopfloor.pinPlaceholder")}
          maxLength={8}
          className={`w-full bg-gray-800 border ${hasError ? "border-red-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-cyan-500`}
          autoFocus
        />
        {hasError && <p className="text-red-400 text-sm mt-2 text-center">{unlockError || t("manufacturing.shopfloor.pinError")}</p>}
        <button onClick={handleSubmit} disabled={isUnlocking} className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors">
          {isUnlocking ? t("manufacturing.shopfloor.verifying") : t("manufacturing.shopfloor.unlock")}
        </button>
      </div>
    </div>
  );
}

// ─── Mode Badge ─────────────────────────────────────────────

function ModeBadge() {
  const { t } = useLanguage();
  const { displayMode, timeRemainingMs, lockExternalMode } = useDashboardMode();
  const [showUnlock, setShowUnlock] = useState(false);
  const mins = Math.ceil(timeRemainingMs / 60000);

  return (
    <>
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {displayMode === "INTERNAL" && (
          <>
            <span className="text-amber-400 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />{mins} {t("manufacturing.shopfloor.minutes")}
            </span>
            <button onClick={lockExternalMode} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 text-xs transition-colors">
              <Lock className="w-3 h-3" />{t("manufacturing.shopfloor.lock")}
            </button>
          </>
        )}
        <button
          onClick={() => displayMode === "EXTERNAL" && setShowUnlock(true)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border transition-colors ${
            displayMode === "INTERNAL" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/5 hover:bg-white/10 border-white/10 text-white/50"
          }`}
        >
          {displayMode === "INTERNAL" ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {displayMode === "INTERNAL" ? t("manufacturing.shopfloor.internalOps") : t("manufacturing.shopfloor.displayMode")}
        </button>
      </div>
      {showUnlock && <UnlockDialog onClose={() => setShowUnlock(false)} />}
    </>
  );
}

// ─── Station Card ───────────────────────────────────────────

function StationCard({ station, isInternal }: { station: StationData; isInternal: boolean }) {
  const { t } = useLanguage();
  const deviation = station.actualQty - station.planQty;
  const statusColor = station.status === "running" ? "#10b981" : station.status === "alarm" ? "#ef4444" : "#6b7280";
  const statusLabel = station.status === "running" ? t("manufacturing.shopfloor.running") : station.status === "alarm" ? t("manufacturing.shopfloor.alarm") : t("manufacturing.shopfloor.idle");
  const fpyColor = station.fpy >= 99 ? "#10b981" : station.fpy >= 97 ? "#f59e0b" : "#ef4444";

  return (
    <div className={`bg-white/5 backdrop-blur-sm border rounded-xl p-3 transition-all ${
      station.status === "alarm" ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "border-white/10"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: statusColor }} />
          <span className="text-white font-bold text-sm">{station.code}</span>
          <span className="text-white/50 text-xs">{station.name}</span>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: statusColor, background: `${statusColor}20` }}>
          {statusLabel}
        </span>
      </div>

      {/* FPY */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-white/40">FPY</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${station.fpy}%`, background: fpyColor }} />
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: fpyColor }}>{station.fpy}%</span>
      </div>

      {/* INTERNAL: Plan vs Actual + Operator */}
      {isInternal ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{t("manufacturing.shopfloor.planActual")}</span>
            <span className={`font-mono font-bold ${deviation >= 0 ? "text-green-400" : "text-red-400"}`}>
              {station.planQty}/{station.actualQty}
              {deviation !== 0 && (
                <span className="ml-1">
                  {deviation > 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                  {Math.abs(deviation)}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{t("manufacturing.shopfloor.operator")}</span>
            <span className="text-cyan-300">{station.operator}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{t("manufacturing.shopfloor.cycleTime")}</span>
            <span className="text-white/70 font-mono">{station.cycleTime}s</span>
          </div>
        </div>
      ) : (
        /* EXTERNAL: Just a green check or progress */
        <div className="flex items-center gap-2 text-xs">
          {station.status === "alarm" ? (
            <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t("manufacturing.shopfloor.processing")}</span>
          ) : (
            <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{t("manufacturing.shopfloor.normal")}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Main Content
// ═══════════════════════════════════════════════════════════

function ShopfloorContent() {
  const { t } = useLanguage();
  const { displayMode } = useDashboardMode();
  const isInternal = displayMode === "INTERNAL";
  const [time, setTime] = useState(new Date());

  // ── Real-time data from server ──────────────────────────
  const { data: stationsRaw = [] } = trpc.visionDashboard.shopfloorStations.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );
  const { data: redBlackData = [] } = trpc.visionDashboard.shopfloorRedBlackList.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );
  const { data: shortageData = [] } = trpc.visionDashboard.shopfloorShortageAlerts.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  const stationsData = stationsRaw as StationData[];

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Aggregate metrics from real data
  const totalPlan = stationsData.reduce((s, st) => s + st.planQty, 0);
  const totalActual = stationsData.reduce((s, st) => s + st.actualQty, 0);
  const avgFpy = stationsData.length > 0
    ? (stationsData.reduce((s, st) => s + st.fpy, 0) / stationsData.length).toFixed(1)
    : "—";
  const alarmCount = stationsData.filter((s) => s.status === "alarm").length;
  const runningCount = stationsData.filter((s) => s.status === "running").length;
  const completionRate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : "—";

  return (
    <div className="relative w-full h-screen overflow-hidden select-none" style={{ background: "#0a0e1a" }}>
      <ModeBadge />

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Factory className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white">{t("manufacturing.shopfloor.title")}</h1>
            <p className="text-white/30 text-xs">Shopfloor Master Board · T1-T15 Production Line</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Headline stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-300 font-mono">{avgFpy}{avgFpy !== "—" && "%"}</p>
              <p className="text-white/30 text-[10px]">{t("manufacturing.shopfloor.overallFPY")}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400 font-mono">{completionRate}{completionRate !== "—" && "%"}</p>
              <p className="text-white/30 text-[10px]">{t("manufacturing.shopfloor.completionRate")}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold font-mono" style={{ color: alarmCount > 0 ? "#ef4444" : "#10b981" }}>{alarmCount}</p>
              <p className="text-white/30 text-[10px]">{t("manufacturing.shopfloor.alarmStations")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-cyan-300 text-2xl font-mono font-bold tabular-nums">
              {time.toLocaleTimeString("zh-CN", { hour12: false })}
            </p>
            <p className="text-white/30 text-xs">{time.toLocaleDateString("zh-CN")}</p>
          </div>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────── */}
      <div className={`flex h-[calc(100vh-60px)] ${isInternal ? "" : ""}`}>
        {/* Left: Station grid */}
        <div className={`flex-1 p-4 overflow-y-auto scrollbar-hide ${isInternal ? "" : ""}`}>
          {stationsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Factory className="w-16 h-16 text-white/10 mb-4" />
              <p className="text-white/30 text-lg">{t("manufacturing.shopfloor.noStationData")}</p>
              <p className="text-white/20 text-sm mt-1">{t("manufacturing.shopfloor.configureStations")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-5 gap-3">
              {stationsData.map((st) => (
                <StationCard key={st.code} station={st} isInternal={isInternal} />
              ))}
            </div>
          )}

          {/* EXTERNAL: Large aggregate banner */}
          {!isInternal && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {[
                { label: t("manufacturing.shopfloor.onlineStations"), value: `${runningCount}/${stationsData.length}`, icon: Zap, color: "#10b981" },
                { label: t("manufacturing.shopfloor.todayOutput"), value: `${totalActual}`, icon: Package, color: "#06b6d4" },
                { label: t("manufacturing.shopfloor.qualityCert"), value: "IATF 16949", icon: ShieldCheck, color: "#8b5cf6" },
                { label: t("manufacturing.shopfloor.safetyDays"), value: "326", icon: Star, color: "#f59e0b" },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: kpi.color }} />
                    </div>
                    <div>
                      <p className="text-white text-2xl font-bold">{kpi.value}</p>
                      <p className="text-white/40 text-xs">{kpi.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar: INTERNAL only — Red/Black list + Material Shortages */}
        {isInternal && (
          <div className="w-[380px] border-l border-white/10 p-4 space-y-4 overflow-y-auto scrollbar-hide">
            {/* Red/Black List */}
            <div>
              <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                {t("manufacturing.shopfloor.redBlackList")}
              </h3>
              <div className="space-y-2">
                {redBlackData.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 border ${
                      entry.type === "red"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {entry.type === "red" ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Star className="w-4 h-4 text-amber-400" />
                        )}
                        <span className={`font-bold text-sm ${entry.type === "red" ? "text-red-300" : "text-emerald-300"}`}>
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-white/40 text-xs">{entry.dept}</span>
                    </div>
                    <p className={`text-xs ${entry.type === "red" ? "text-red-400/80" : "text-emerald-400/80"}`}>
                      {entry.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Material Shortage Alerts */}
            <div>
              <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                {t("manufacturing.shopfloor.materialShortage")}
              </h3>
              <div className="space-y-2">
                {shortageData.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 border ${
                      alert.severity === "critical"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold text-xs">[{alert.station}] {alert.material}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={alert.severity === "critical" ? "text-red-400" : "text-amber-400"}>
                        {alert.eta}
                      </span>
                      <span className="text-white/40">{t("manufacturing.shopfloor.buyer")}: {alert.buyer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan vs Actual Summary */}
            <div>
              <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                {t("manufacturing.shopfloor.planAnalysis")}
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs">{t("manufacturing.shopfloor.totalPlan")}</span>
                  <span className="text-white font-mono font-bold">{totalPlan}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs">{t("manufacturing.shopfloor.totalCompleted")}</span>
                  <span className="text-cyan-300 font-mono font-bold">{totalActual}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/50 text-xs">{t("manufacturing.shopfloor.achievementRate")}</span>
                  <span className={`font-mono font-bold ${Number(completionRate) >= 95 ? "text-green-400" : "text-red-400"}`}>
                    {completionRate}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(Number(completionRate), 100)}%`,
                      background: Number(completionRate) >= 95
                        ? "linear-gradient(to right, #10b981, #06b6d4)"
                        : "linear-gradient(to right, #ef4444, #f59e0b)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Export with Provider
// ═══════════════════════════════════════════════════════════

export default function ShopfloorMasterBoard() {
  return (
    <DashboardModeProvider>
      <ShopfloorContent />
      <FloatingNav />
    </DashboardModeProvider>
  );
}
