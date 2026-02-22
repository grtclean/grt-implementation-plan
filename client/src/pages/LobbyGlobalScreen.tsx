/**
 * 大厅全球运营主屏 — Lobby Global Operations Screen
 *
 * Standalone fullscreen display for lobby/reception.
 * EXTERNAL: 3D globe with equipment locations, headline KPIs, partner logos.
 * INTERNAL: + revenue detail, pipeline risks, regional P&L.
 *
 * CSS/SVG globe animation — no WebGL dependency for prototype.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  DashboardModeProvider,
  useDashboardMode,
  type DisplayMode,
} from "@/contexts/DashboardModeContext";
import {
  Globe,
  Lock,
  Unlock,
  MapPin,
  TrendingUp,
  Package,
  Users,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Clock,
} from "lucide-react";

// ─── KPI Icon/Color Mapping ────────────────────────────────

const KPI_CONFIG: Record<string, { icon: typeof Package; color: string }> = {
  equipment: { icon: Package, color: "#00d4aa" },
  stations: { icon: Globe, color: "#0078d4" },
  projects: { icon: TrendingUp, color: "#ff8c00" },
  cert: { icon: ShieldCheck, color: "#10b981" },
  todayOutput: { icon: DollarSign, color: "#f59e0b" },
  activeStations: { icon: BarChart3, color: "#06b6d4" },
};

// ─── Globe Component (CSS/SVG) ──────────────────────────────

interface LocationPin {
  id: number;
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  revenue: string | null;
}

function AnimatedGlobe({ locations, showRevenue }: { locations: LocationPin[]; showRevenue: boolean }) {
  const [activePin, setActivePin] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setRotation((r) => (r + 0.3) % 360), 50);
    return () => clearInterval(timer);
  }, []);

  // Auto-cycle through pins
  useEffect(() => {
    if (locations.length === 0) return;
    let idx = 0;
    const timer = setInterval(() => {
      setActivePin(locations[idx % locations.length].id);
      idx++;
    }, 3000);
    return () => clearInterval(timer);
  }, [locations]);

  // Convert lat/lng to approximate position on a flat projected globe
  // When lat/lng are 0 (DB locations without geo data), distribute evenly
  const toPosition = (lat: number, lng: number, idx: number) => {
    if (lat === 0 && lng === 0 && locations.length > 0) {
      const angle = (idx / locations.length) * Math.PI * 2;
      const r = 25;
      return { x: `${50 + Math.cos(angle) * r}%`, y: `${50 + Math.sin(angle) * r}%` };
    }
    const x = 50 + (lng / 180) * 40;
    const y = 50 - (lat / 90) * 35;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Globe background sphere */}
      <div
        className="absolute w-[min(70vh,70vw)] h-[min(70vh,70vw)] rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 35%, #0a3d6b 0%, #001a33 50%, #000d1a 100%)",
          boxShadow: "0 0 120px rgba(0,120,212,0.3), inset 0 0 60px rgba(0,180,220,0.1)",
        }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
          {/* Latitude lines */}
          {[20, 35, 50, 65, 80].map((y) => (
            <ellipse key={`lat-${y}`} cx="50" cy={y} rx={40 - Math.abs(y - 50) * 0.5} ry="2" fill="none" stroke="#0af" strokeWidth="0.3" />
          ))}
          {/* Longitude lines */}
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <ellipse
              key={`lng-${deg}`}
              cx="50"
              cy="50"
              rx={Math.cos((deg * Math.PI) / 180) * 35}
              ry="40"
              fill="none"
              stroke="#0af"
              strokeWidth="0.3"
              style={{ transform: `rotate(${rotation * 0.1}deg)`, transformOrigin: "center" }}
            />
          ))}
        </svg>

        {/* Continent silhouettes (simplified) */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Europe */}
            <path d="M100,25 Q105,22 110,25 L112,30 Q108,35 100,33Z" fill="#0af" />
            {/* Asia */}
            <path d="M115,20 Q130,18 140,25 L145,35 Q135,40 120,38 L115,30Z" fill="#0af" />
            {/* North America */}
            <path d="M55,20 Q65,15 75,22 L78,30 Q70,35 58,32Z" fill="#0af" />
            {/* South America */}
            <path d="M70,50 Q75,48 78,55 L76,65 Q72,68 68,60Z" fill="#0af" />
          </svg>
        </div>
      </div>

      {/* Equipment location pins */}
      {locations.map((loc, locIdx) => {
        const pos = toPosition(loc.lat, loc.lng, locIdx);
        const isActive = activePin === loc.id;
        return (
          <div
            key={loc.id}
            className="absolute transition-all duration-700 z-10"
            style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
          >
            {/* Ping animation */}
            <div
              className={`absolute -inset-3 rounded-full ${isActive ? "animate-ping" : ""}`}
              style={{ background: "rgba(0,212,170,0.3)" }}
            />
            {/* Dot */}
            <div
              className={`relative w-3 h-3 rounded-full border-2 border-cyan-300 transition-all duration-500 ${
                isActive ? "scale-150 bg-cyan-400" : "bg-cyan-500/70"
              }`}
            />
            {/* Label */}
            {isActive && (
              <div className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg px-3 py-2 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-500 z-20">
                <p className="text-cyan-300 text-sm font-bold">{loc.city}, {loc.country}</p>
                <p className="text-white/70 text-xs">{loc.count} 台设备运行中</p>
                {showRevenue && (
                  <p className="text-amber-400 text-xs font-medium mt-0.5">营收 {loc.revenue}</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* GRT Logo center */}
      <div className="absolute z-20 flex flex-col items-center gap-1 pointer-events-none">
        <span
          className="text-5xl font-black tracking-wider"
          style={{
            background: "linear-gradient(135deg, #00d4aa, #0078d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          GRT
        </span>
        <span className="text-white/40 text-xs tracking-[0.3em]">GLOBAL OPERATIONS</span>
      </div>
    </div>
  );
}

// ─── Unlock Dialog ──────────────────────────────────────────

function UnlockDialog({ onClose }: { onClose: () => void }) {
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
          <h3 className="text-white text-lg font-bold">切换内部模式</h3>
        </div>
        <p className="text-white/50 text-sm mb-4">输入管理PIN码以解锁内部运营视图（30分钟后自动恢复）</p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isUnlocking && handleSubmit()}
          placeholder="输入PIN码"
          maxLength={8}
          className={`w-full bg-gray-800 border ${hasError ? "border-red-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-cyan-500`}
          autoFocus
        />
        {hasError && <p className="text-red-400 text-sm mt-2 text-center">{unlockError || "PIN码错误"}</p>}
        <button
          onClick={handleSubmit}
          disabled={isUnlocking}
          className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors"
        >
          {isUnlocking ? "验证中..." : "解锁"}
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
              <Clock className="w-3 h-3" />
              {mins}分钟后自动锁定
            </span>
            <button
              onClick={lockExternalMode}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 text-xs transition-colors"
            >
              <Lock className="w-3 h-3" />
              锁定
            </button>
          </>
        )}
        <button
          onClick={() => displayMode === "EXTERNAL" ? setShowUnlock(true) : undefined}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border transition-colors ${
            displayMode === "INTERNAL"
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-white/5 hover:bg-white/10 border-white/10 text-white/50"
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

// ═══════════════════════════════════════════════════════════
//  Main Screen Content
// ═══════════════════════════════════════════════════════════

function LobbyContent() {
  const { displayMode } = useDashboardMode();
  const [time, setTime] = useState(new Date());

  // ── Real-time data from server ──────────────────────────
  const { data: lobbyData } = trpc.visionDashboard.lobbyData.useQuery(
    { mode: displayMode },
    { refetchInterval: 30000 }
  );

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Map server KPI data to display format with icons
  const mapKpis = (items: Array<{ key: string; label: string; value: string; unit: string }>) =>
    items.map((kpi) => ({
      ...kpi,
      icon: KPI_CONFIG[kpi.key]?.icon || Package,
      color: KPI_CONFIG[kpi.key]?.color || "#0078d4",
    }));

  const externalKpis = mapKpis(lobbyData?.externalKpis || []);
  const internalKpis = mapKpis(lobbyData?.internalKpis || []);
  const kpis = displayMode === "EXTERNAL" ? externalKpis : [...externalKpis, ...internalKpis];

  // Equipment locations from server
  const locations = (lobbyData?.locations || []).map((loc, idx) => ({
    id: loc.id,
    city: loc.city,
    country: "",
    lat: 0,
    lng: 0,
    count: loc.count,
    revenue: null as string | null,
  }));

  return (
    <div className="relative w-full h-screen overflow-hidden select-none" style={{ background: "#000d1a" }}>
      <ModeBadge />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            GRT 全球运营中心
          </h1>
          <p className="text-white/40 text-sm">Global Operations Command Center</p>
        </div>
        <div className="text-right">
          <p className="text-cyan-300 text-3xl font-mono font-bold tabular-nums">
            {time.toLocaleTimeString("zh-CN", { hour12: false })}
          </p>
          <p className="text-white/40 text-sm">
            {time.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
      </div>

      {/* Globe area */}
      <div className="absolute inset-0">
        <AnimatedGlobe locations={locations} showRevenue={displayMode === "INTERNAL"} />
      </div>

      {/* Bottom KPI strip */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-6 px-8">
        <div className={`grid gap-4 ${kpis.length <= 4 ? "grid-cols-4" : "grid-cols-4 lg:grid-cols-8"}`}>
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${kpi.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xl font-bold leading-tight">
                    {kpi.value}
                    {kpi.unit && <span className="text-sm text-white/50 ml-1">{kpi.unit}</span>}
                  </p>
                  <p className="text-white/40 text-xs truncate">{kpi.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Internal-only: dynamic status strip */}
        {displayMode === "INTERNAL" && (
          <div className="mt-4 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {(lobbyData?.externalKpis || []).length > 0 ? (
              <>
                <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-2 whitespace-nowrap">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300 text-sm">内部运营模式已激活 · 显示完整数据</span>
                </div>
                {internalKpis.map((kpi, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 whitespace-nowrap">
                    <kpi.icon className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300 text-sm">{kpi.label}: {kpi.value} {kpi.unit}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 whitespace-nowrap">
                <span className="text-white/30 text-sm">暂无运营数据</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decorative scan line */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <div
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
          style={{ animation: "scanline 4s linear infinite" }}
        />
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Export with Provider
// ═══════════════════════════════════════════════════════════

export default function LobbyGlobalScreen() {
  return (
    <DashboardModeProvider>
      <LobbyContent />
    </DashboardModeProvider>
  );
}
