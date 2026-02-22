/**
 * 车间总屏 — Shopfloor Master Board
 *
 * Standalone fullscreen display for production floor.
 * EXTERNAL: High-level T1-T15 progress, aggregate FPY, no names.
 * INTERNAL: Red/Black list, material shortages, plan vs actual, employee names.
 */
import { useState, useEffect } from "react";
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

// ─── Demo Data ──────────────────────────────────────────────

interface StationData {
  code: string;
  name: string;
  status: "running" | "idle" | "alarm";
  fpy: number;
  planQty: number;
  actualQty: number;
  operator?: string; // hidden in EXTERNAL
  cycleTime: number; // seconds
}

const STATIONS: StationData[] = [
  { code: "T1", name: "底座组装", status: "running", fpy: 99.2, planQty: 12, actualQty: 12, operator: "张伟", cycleTime: 45 },
  { code: "T2", name: "主轴安装", status: "running", fpy: 98.8, planQty: 12, actualQty: 11, operator: "李强", cycleTime: 62 },
  { code: "T3", name: "液压系统", status: "alarm", fpy: 96.5, planQty: 12, actualQty: 9, operator: "王磊", cycleTime: 78 },
  { code: "T4", name: "电气布线", status: "running", fpy: 99.5, planQty: 10, actualQty: 10, operator: "赵辉", cycleTime: 55 },
  { code: "T5", name: "传感器校准", status: "running", fpy: 100, planQty: 10, actualQty: 10, operator: "刘洋", cycleTime: 32 },
  { code: "T6", name: "密封检测", status: "running", fpy: 99.1, planQty: 10, actualQty: 9, operator: "陈波", cycleTime: 28 },
  { code: "T7", name: "功能测试", status: "idle", fpy: 98.2, planQty: 8, actualQty: 7, operator: "周敏", cycleTime: 90 },
  { code: "T8", name: "清洁度检测", status: "running", fpy: 99.8, planQty: 8, actualQty: 8, operator: "吴芳", cycleTime: 25 },
  { code: "T9", name: "涂装/喷漆", status: "running", fpy: 97.6, planQty: 8, actualQty: 7, operator: "孙涛", cycleTime: 120 },
  { code: "T10", name: "总装配", status: "running", fpy: 99.0, planQty: 6, actualQty: 6, operator: "杨华", cycleTime: 85 },
  { code: "T11", name: "气密测试", status: "running", fpy: 100, planQty: 6, actualQty: 6, operator: "马丽", cycleTime: 40 },
  { code: "T12", name: "耐压测试", status: "running", fpy: 99.4, planQty: 6, actualQty: 5, operator: "胡明", cycleTime: 55 },
  { code: "T13", name: "FAT预检", status: "idle", fpy: 98.0, planQty: 4, actualQty: 3, operator: "林峰", cycleTime: 150 },
  { code: "T14", name: "包装入库", status: "running", fpy: 100, planQty: 4, actualQty: 4, operator: "郑宇", cycleTime: 35 },
  { code: "T15", name: "出库发运", status: "running", fpy: 100, planQty: 3, actualQty: 3, operator: "何杰", cycleTime: 20 },
];

interface RedBlackEntry {
  name: string;
  dept: string;
  type: "red" | "black";
  reason: string;
  count: number;
}

const RED_BLACK_LIST: RedBlackEntry[] = [
  { name: "王磊", dept: "T3液压", type: "red", reason: "连续3次密封不良", count: 3 },
  { name: "孙涛", dept: "T9涂装", type: "red", reason: "喷涂厚度超差", count: 2 },
  { name: "张伟", dept: "T1底座", type: "black", reason: "零缺陷连续30天", count: 30 },
  { name: "刘洋", dept: "T5校准", type: "black", reason: "改善提案8项", count: 8 },
  { name: "马丽", dept: "T11气密", type: "black", reason: "FPY 100% 连续60天", count: 60 },
];

interface ShortageAlert {
  station: string;
  material: string;
  eta: string;
  buyer: string;
  severity: "critical" | "warning";
}

const SHORTAGE_ALERTS: ShortageAlert[] = [
  { station: "T3", material: "高压液压泵 (Rexroth A10VSO)", eta: "延迟3天", buyer: "沈应峰", severity: "critical" },
  { station: "T9", material: "PU底漆 (PPG DELFLEET)", eta: "明天到货", buyer: "李思远", severity: "warning" },
  { station: "T10", material: "O型密封圈 (Parker 2-236)", eta: "延迟1天", buyer: "沈应峰", severity: "warning" },
];

// ─── Unlock Dialog (same pattern) ───────────────────────────

function UnlockDialog({ onClose }: { onClose: () => void }) {
  const { unlockInternalMode } = useDashboardMode();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit() {
    if (unlockInternalMode(pin)) {
      onClose();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-8 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-cyan-400" />
          <h3 className="text-white text-lg font-bold">切换内部模式</h3>
        </div>
        <p className="text-white/50 text-sm mb-4">输入管理PIN码解锁运营视图（30分钟自动恢复）</p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="PIN码"
          maxLength={8}
          className={`w-full bg-gray-800 border ${error ? "border-red-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-cyan-500`}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mt-2 text-center">PIN码错误</p>}
        <button onClick={handleSubmit} className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg py-3 font-medium transition-colors">
          解锁
        </button>
      </div>
    </div>
  );
}

// ─── Mode Badge ─────────────────────────────────────────────

function ModeBadge() {
  const { displayMode, timeRemainingMs, lockExternalMode } = useDashboardMode();
  const [showUnlock, setShowUnlock] = useState(false);
  const mins = Math.ceil(timeRemainingMs / 60000);

  return (
    <>
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {displayMode === "INTERNAL" && (
          <>
            <span className="text-amber-400 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />{mins}分钟
            </span>
            <button onClick={lockExternalMode} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 text-xs transition-colors">
              <Lock className="w-3 h-3" />锁定
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
          {displayMode === "INTERNAL" ? "内部运营" : "展示模式"}
        </button>
      </div>
      {showUnlock && <UnlockDialog onClose={() => setShowUnlock(false)} />}
    </>
  );
}

// ─── Station Card ───────────────────────────────────────────

function StationCard({ station, isInternal }: { station: StationData; isInternal: boolean }) {
  const deviation = station.actualQty - station.planQty;
  const statusColor = station.status === "running" ? "#10b981" : station.status === "alarm" ? "#ef4444" : "#6b7280";
  const statusLabel = station.status === "running" ? "运行中" : station.status === "alarm" ? "异常" : "待机";
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
            <span className="text-white/40">计划/实际</span>
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
            <span className="text-white/40">操作员</span>
            <span className="text-cyan-300">{station.operator}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">节拍</span>
            <span className="text-white/70 font-mono">{station.cycleTime}s</span>
          </div>
        </div>
      ) : (
        /* EXTERNAL: Just a green check or progress */
        <div className="flex items-center gap-2 text-xs">
          {station.status === "alarm" ? (
            <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />处理中</span>
          ) : (
            <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />正常</span>
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
  const { displayMode } = useDashboardMode();
  const isInternal = displayMode === "INTERNAL";
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Aggregate metrics
  const totalPlan = STATIONS.reduce((s, st) => s + st.planQty, 0);
  const totalActual = STATIONS.reduce((s, st) => s + st.actualQty, 0);
  const avgFpy = (STATIONS.reduce((s, st) => s + st.fpy, 0) / STATIONS.length).toFixed(1);
  const alarmCount = STATIONS.filter((s) => s.status === "alarm").length;
  const runningCount = STATIONS.filter((s) => s.status === "running").length;
  const completionRate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : "0";

  return (
    <div className="relative w-full h-screen overflow-hidden select-none" style={{ background: "#0a0e1a" }}>
      <ModeBadge />

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Factory className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white">GRT 车间生产总屏</h1>
            <p className="text-white/30 text-xs">Shopfloor Master Board · T1-T15 Production Line</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Headline stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-300 font-mono">{avgFpy}%</p>
              <p className="text-white/30 text-[10px]">综合FPY</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400 font-mono">{completionRate}%</p>
              <p className="text-white/30 text-[10px]">完工率</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold font-mono" style={{ color: alarmCount > 0 ? "#ef4444" : "#10b981" }}>{alarmCount}</p>
              <p className="text-white/30 text-[10px]">异常工位</p>
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
          <div className="grid grid-cols-3 xl:grid-cols-5 gap-3">
            {STATIONS.map((st) => (
              <StationCard key={st.code} station={st} isInternal={isInternal} />
            ))}
          </div>

          {/* EXTERNAL: Large aggregate banner */}
          {!isInternal && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {[
                { label: "在线工位", value: `${runningCount}/${STATIONS.length}`, icon: Zap, color: "#10b981" },
                { label: "今日产出", value: `${totalActual}台`, icon: Package, color: "#06b6d4" },
                { label: "质量认证", value: "IATF 16949", icon: ShieldCheck, color: "#8b5cf6" },
                { label: "安全生产", value: "326天", icon: Star, color: "#f59e0b" },
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
                红黑榜 (Red / Black List)
              </h3>
              <div className="space-y-2">
                {RED_BLACK_LIST.map((entry, idx) => (
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
                物料短缺预警
              </h3>
              <div className="space-y-2">
                {SHORTAGE_ALERTS.map((alert, idx) => (
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
                      <span className="text-white/40">采购: {alert.buyer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan vs Actual Summary */}
            <div>
              <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                计划达成分析
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs">总计划</span>
                  <span className="text-white font-mono font-bold">{totalPlan} 台</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs">总完成</span>
                  <span className="text-cyan-300 font-mono font-bold">{totalActual} 台</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/50 text-xs">达成率</span>
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
    </DashboardModeProvider>
  );
}
