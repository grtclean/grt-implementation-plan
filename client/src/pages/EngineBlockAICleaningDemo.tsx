/**
 * Engine Block AI Cleaning Demo
 *
 * Customer-facing showroom page showcasing GRT's AI-powered CNC cleaning
 * capability for automotive engine blocks (Selletis & similar).
 *
 * Route: /showroom/engine-block-demo  (standalone, no sidebar)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ScanLine, Brain, Route as RouteIcon, Droplets, ClipboardCheck,
  RefreshCw, Play, Pause, ChevronDown, Award, Clock, Zap, Target,
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, Cpu, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────

interface PipelineStep {
  step: number; label: string; labelZh: string; description: string; aiRole: string;
}
interface Waypoint {
  waypointId: number; x: number; y: number; pressure: number; angle: number;
  flowRate: number; distance: number; targetFeature: string;
}
interface QCData {
  totalResidualMass: number; maxParticleSize: number; verdict: string; standard: string;
  sizeDistribution: { bin: string; before: number; after: number }[];
  zoneMap: { zoneId: number; zoneName: string; residualMg: number; maxParticleUm: number; status: string }[];
  before: { totalMass: number; maxParticle: number; particleCount: number };
  after: { totalMass: number; maxParticle: number; particleCount: number };
  improvement: { massReduction: number; particleReduction: number; maxParticleReduction: number };
}
interface AIData {
  featuresDetected: { type: string; typeZh: string; count: number; confidence: number; strategy: string }[];
  reasoning: { timestamp: string; event: string }[];
  caseMatches: { projectId: string; customer: string; blockType: string; similarity: number; cycleTime: number; verdict: string }[];
  adaptiveIterations: { iteration: number; pressure: number; angle: number; residualMg: number; maxParticleUm: number; verdict: string }[];
  totalHistoricalCycles: number; aiModelVersion: string; aiConfidence: number;
  cycleTimeAchieved: number; firstPassYield: number;
}

// ─── Shared Components ───────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, unit, color = "cyan" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; unit?: string; color?: "cyan" | "green" | "amber" | "blue";
}) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-900/10 border-cyan-500/30",
    green: "from-emerald-500/20 to-emerald-900/10 border-emerald-500/30",
    amber: "from-amber-500/20 to-amber-900/10 border-amber-500/30",
    blue: "from-blue-500/20 to-blue-900/10 border-blue-500/30",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-neutral-400" />
        <span className="text-xs text-neutral-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-neutral-400">{unit}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">{title}</h2>
      <p className="text-neutral-400 text-lg">{subtitle}</p>
    </div>
  );
}

// ─── Section 1: AI Cleaning Pipeline ─────────────────────────────────

const PIPELINE_ICONS = [ScanLine, Brain, RouteIcon, Droplets, ClipboardCheck, RefreshCw];

function PipelineSection({ pipeline }: { pipeline: { step: number; label: string; labelZh: string; description: string; aiRole: string }[] }) {
  const { language, t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setActiveStep(s => (s + 1) % pipeline.length), 3000);
    return () => clearInterval(iv);
  }, [pipeline.length]);

  return (
    <section className="min-h-screen flex flex-col justify-center px-8 py-16">
      <SectionTitle
        title={language === "zh" ? "AI清洗流水线总览" : "AI Cleaning Pipeline Overview"}
        subtitle={language === "zh" ? "六步闭环智能清洗流程" : "Six-step closed-loop intelligent cleaning process"}
      />
      <div className="flex flex-wrap justify-center items-start gap-4 max-w-7xl mx-auto">
        {pipeline.map((step, i) => {
          const Icon = PIPELINE_ICONS[i] ?? Cpu;
          const isActive = i === activeStep;
          return (
            <div key={step.step} className="flex items-center">
              <div
                className={`relative w-52 rounded-xl border p-5 transition-all duration-500 cursor-pointer ${
                  isActive
                    ? "border-cyan-400/60 bg-cyan-950/40 shadow-lg shadow-cyan-500/20 scale-105"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
                onClick={() => setActiveStep(i)}
              >
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                )}
                <Icon className={`w-8 h-8 mb-3 ${isActive ? "text-cyan-400" : "text-neutral-500"}`} />
                <div className="text-sm font-semibold text-white mb-1">
                  {language === "zh" ? step.labelZh : step.label}
                </div>
                <div className="text-xs text-neutral-400 mb-2 line-clamp-2">{step.description}</div>
                <div className={`text-xs ${isActive ? "text-cyan-300" : "text-neutral-500"} line-clamp-2`}>
                  AI: {step.aiRole}
                </div>
              </div>
              {i < pipeline.length - 1 && (
                <ArrowRight className="w-5 h-5 text-cyan-500/40 mx-1 flex-shrink-0 hidden lg:block" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section 2: Horizontal Dedicated Orientation Flush ───────────────

function HorizontalFlushSection() {
  const { language } = useLanguage();
  const flushMethods = [
    { name: language === "zh" ? "顶部向下冲洗" : "Top-Down Flush", color: "#06b6d4", angle: 0 },
    { name: language === "zh" ? "底部向上冲洗" : "Bottom-Up Flush", color: "#10b981", angle: 180 },
    { name: language === "zh" ? "交叉通道冲洗" : "Cross-Channel Flush", color: "#f59e0b", angle: 90 },
    { name: language === "zh" ? "逆向回流冲洗" : "Reverse-Flow Flush", color: "#8b5cf6", angle: 270 },
  ];

  return (
    <section className="min-h-screen flex flex-col justify-center px-8 py-16">
      <SectionTitle
        title={language === "zh" ? "水平定向冲洗技术" : "Horizontal Dedicated Orientation Flush"}
        subtitle={language === "zh" ? "GRT专利：重力辅助颗粒排出方法" : "GRT Proprietary: Gravity-assisted particle exit method"}
      />
      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
        {/* Left: Engine Block Cross-Section SVG */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-medium text-cyan-400 mb-4">
            {language === "zh" ? "发动机缸体截面（水平装夹）" : "Engine Block Cross-Section (Horizontal Mount)"}
          </h3>
          <svg viewBox="0 0 400 250" className="w-full">
            {/* CNC fixture base */}
            <rect x="10" y="200" width="380" height="20" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="200" y="215" textAnchor="middle" fill="#64748b" fontSize="9">CNC FIXTURE — 12° TILT</text>
            {/* Engine block outline */}
            <rect x="40" y="40" width="320" height="155" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            {/* 4 cylinder bores */}
            {[0, 1, 2, 3].map(i => (
              <g key={i}>
                <circle cx={110 + i * 60} cy={100} r="28" fill="none" stroke="#475569" strokeWidth="1.5" />
                <circle cx={110 + i * 60} cy={100} r="20" fill="#0c1222" stroke="#334155" strokeWidth="1" />
                <text x={110 + i * 60} y={104} textAnchor="middle" fill="#64748b" fontSize="8">CYL {i + 1}</text>
              </g>
            ))}
            {/* Oil galleries (horizontal lines) */}
            <line x1="50" y1="60" x2="350" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
            <text x="355" y="63" fill="#f59e0b" fontSize="7" opacity="0.8">OIL GALLERY</text>
            {/* Coolant channels */}
            <line x1="50" y1="155" x2="350" y2="155" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
            <text x="355" y="158" fill="#06b6d4" fontSize="7" opacity="0.8">COOLANT</text>
            {/* Blind holes */}
            {[85, 155, 225, 295].map((x, i) => (
              <rect key={i} x={x} y="165" width="10" height="22" rx="2" fill="#1e293b" stroke="#6366f1" strokeWidth="1" opacity="0.7" />
            ))}
            {/* Gravity arrow */}
            <line x1="20" y1="50" x2="20" y2="180" stroke="#ef4444" strokeWidth="1" markerEnd="url(#arrowRed)" opacity="0.5" />
            <text x="25" y="120" fill="#ef4444" fontSize="7" opacity="0.6" transform="rotate(-90 25 120)">GRAVITY</text>
            <defs>
              <marker id="arrowRed" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#ef4444" opacity="0.5" />
              </marker>
            </defs>
          </svg>
        </GlassCard>

        {/* Right: Flush Directions */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-sm font-medium text-cyan-400 mb-4">
              {language === "zh" ? "四向自适应冲洗方向" : "4-Directional Adaptive Flush"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {flushMethods.map(m => (
                <div key={m.name} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-sm font-medium text-white">{m.name}</span>
                  </div>
                  <div className="w-full h-2 rounded bg-white/10 mt-2">
                    <div className="h-full rounded transition-all duration-1000" style={{ width: `${60 + Math.random() * 40}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Comparison */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-medium text-neutral-400 mb-3">
              {language === "zh" ? "方法对比" : "Method Comparison"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3">
                <div className="flex items-center gap-1 mb-1">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-medium text-red-300">
                    {language === "zh" ? "传统垂直喷淋" : "Generic Vertical Spray"}
                  </span>
                </div>
                <p className="text-xs text-red-400/70">
                  {language === "zh" ? "颗粒因重力回落沉积" : "Particles settle back due to gravity"}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-300">
                    {language === "zh" ? "GRT水平定向冲洗" : "GRT Horizontal Flush"}
                  </span>
                </div>
                <p className="text-xs text-emerald-400/70">
                  {language === "zh" ? "重力辅助颗粒自然排出" : "Gravity-assisted particle exit"}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Real-time CNC Simulation ─────────────────────────────

function useSimulation(waypoints: { waypointId: number; x: number; y: number; pressure: number; angle: number; flowRate: number; distance: number; targetFeature: string }[]) {
  const [currentWp, setCurrentWp] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "analyzing" | "cleaning" | "verifying" | "complete">("scanning");
  const [cleaned, setCleaned] = useState<Set<number>>(new Set());
  const rafRef = useRef<number | null>(null);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || waypoints.length === 0) return;
    let step = currentWp;
    let phaseTimer = 0;

    const tick = () => {
      phaseTimer++;
      if (phase === "scanning" && phaseTimer > 60) {
        setPhase("analyzing");
        phaseTimer = 0;
      } else if (phase === "analyzing" && phaseTimer > 40) {
        setPhase("cleaning");
        phaseTimer = 0;
      } else if (phase === "cleaning") {
        if (phaseTimer % 20 === 0) {
          step = (step + 1) % waypoints.length;
          setCurrentWp(step);
          setCleaned(prev => new Set([...prev, step]));
        }
        if (step === waypoints.length - 1 && phaseTimer > 20) {
          setPhase("verifying");
          phaseTimer = 0;
        }
      } else if (phase === "verifying" && phaseTimer > 60) {
        setPhase("complete");
        phaseTimer = 0;
      } else if (phase === "complete" && phaseTimer > 80) {
        // Reset
        setPhase("scanning");
        setCurrentWp(0);
        setCleaned(new Set());
        step = 0;
        phaseTimer = 0;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning, waypoints.length, phase]);

  return { currentWp, phase, cleaned, isRunning, setIsRunning };
}

function CNCSimulationSection({ trajectory }: {
  trajectory: { waypointId: number; x: number; y: number; pressure: number; angle: number; flowRate: number; distance: number; targetFeature: string }[];
}) {
  const { language } = useLanguage();
  const { currentWp, phase, cleaned, isRunning, setIsRunning } = useSimulation(trajectory);
  const [selectedWp, setSelectedWp] = useState<number | null>(null);
  const activeWp = selectedWp !== null ? trajectory[selectedWp] : trajectory[currentWp];

  const phaseLabels: Record<string, string> = {
    scanning: language === "zh" ? "扫描中" : "Scanning",
    analyzing: language === "zh" ? "分析中" : "Analyzing",
    cleaning: language === "zh" ? "清洗中" : "Cleaning",
    verifying: language === "zh" ? "验证中" : "Verifying",
    complete: language === "zh" ? "完成" : "Complete",
  };
  const phaseColors: Record<string, string> = {
    scanning: "text-blue-400", analyzing: "text-amber-400",
    cleaning: "text-cyan-400", verifying: "text-purple-400", complete: "text-emerald-400",
  };

  return (
    <section className="min-h-screen flex flex-col justify-center px-8 py-16">
      <SectionTitle
        title={language === "zh" ? "实时CNC清洗模拟" : "Real-time CNC Cleaning Simulation"}
        subtitle={language === "zh" ? "自适应喷嘴轨迹 × 在线颗粒清除" : "Adaptive nozzle trajectory × inline particle removal"}
      />
      <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* SVG simulation area */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${phase === "cleaning" ? "bg-cyan-400 animate-pulse" : "bg-neutral-600"}`} />
              <span className={`text-sm font-medium ${phaseColors[phase]}`}>{phaseLabels[phase]}</span>
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isRunning ? "Pause" : "Play"}
            </button>
          </div>
          <svg viewBox="0 0 460 280" className="w-full">
            {/* Engine block outline */}
            <rect x="20" y="15" width="420" height="250" rx="8" fill="#0c1222" stroke="#1e293b" strokeWidth="1.5" />
            {/* Waypoint channels */}
            {trajectory.map((wp, i) => {
              const isCleaned = cleaned.has(i);
              const isCurrent = i === currentWp && phase === "cleaning";
              return (
                <g key={wp.waypointId} onClick={() => setSelectedWp(i)} className="cursor-pointer">
                  <circle
                    cx={wp.x} cy={wp.y} r={isCurrent ? 12 : 9}
                    fill={isCleaned ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}
                    stroke={isCurrent ? "#06b6d4" : isCleaned ? "#10b981" : "#ef4444"}
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                  />
                  <text x={wp.x} y={wp.y + 3} textAnchor="middle" fill={isCleaned ? "#10b981" : "#ef4444"} fontSize="7" fontWeight="bold">
                    {wp.waypointId}
                  </text>
                  {isCurrent && (
                    <circle cx={wp.x} cy={wp.y} r="16" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4">
                      <animate attributeName="r" from="12" to="20" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
            {/* Nozzle position indicator */}
            {phase === "cleaning" && trajectory[currentWp] && (
              <g>
                <line
                  x1={trajectory[currentWp].x} y1={trajectory[currentWp].y - 16}
                  x2={trajectory[currentWp].x} y2={trajectory[currentWp].y - 28}
                  stroke="#06b6d4" strokeWidth="2"
                />
                <polygon
                  points={`${trajectory[currentWp].x - 4},${trajectory[currentWp].y - 28} ${trajectory[currentWp].x + 4},${trajectory[currentWp].y - 28} ${trajectory[currentWp].x},${trajectory[currentWp].y - 18}`}
                  fill="#06b6d4"
                />
              </g>
            )}
          </svg>
        </GlassCard>

        {/* Right: Live Gauges */}
        <div className="space-y-3">
          <GlassCard className="p-4">
            <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-3">
              {language === "zh" ? "实时参数" : "Live Parameters"}
            </h4>
            {activeWp && (
              <div className="space-y-3">
                {[
                  { label: language === "zh" ? "压力" : "Pressure", value: `${activeWp.pressure} bar`, pct: (activeWp.pressure / 5) * 100, color: "bg-cyan-500" },
                  { label: language === "zh" ? "流量" : "Flow Rate", value: `${activeWp.flowRate} L/min`, pct: (activeWp.flowRate / 12) * 100, color: "bg-blue-500" },
                  { label: language === "zh" ? "喷嘴角度" : "Nozzle Angle", value: `${activeWp.angle}°`, pct: (activeWp.angle / 90) * 100, color: "bg-amber-500" },
                  { label: language === "zh" ? "距离" : "Distance", value: `${activeWp.distance} mm`, pct: (activeWp.distance / 25) * 100, color: "bg-purple-500" },
                ].map(g => (
                  <div key={g.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-400">{g.label}</span>
                      <span className="text-white font-medium">{g.value}</span>
                    </div>
                    <div className="h-1.5 rounded bg-white/10">
                      <div className={`h-full rounded transition-all duration-300 ${g.color}`} style={{ width: `${Math.min(100, g.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
          <GlassCard className="p-4">
            <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              {language === "zh" ? "目标特征" : "Target Feature"}
            </h4>
            <span className="text-sm text-cyan-300 font-medium">{activeWp?.targetFeature?.replace(/_/g, " ") ?? "—"}</span>
          </GlassCard>
          <GlassCard className="p-4">
            <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              {language === "zh" ? "清洗进度" : "Progress"}
            </h4>
            <div className="text-2xl font-bold text-white">{cleaned.size}<span className="text-sm text-neutral-400">/{trajectory.length}</span></div>
            <div className="h-2 rounded bg-white/10 mt-2">
              <div className="h-full rounded bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all" style={{ width: `${(cleaned.size / Math.max(1, trajectory.length)) * 100}%` }} />
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: Inline Cleanliness Verification ──────────────────────

function InlineQCSection({ qcData }: { qcData: QCData }) {
  const { language } = useLanguage();
  const chartData = qcData.sizeDistribution.map(d => ({
    bin: d.bin,
    before: d.before,
    after: d.after,
  }));

  return (
    <section className="min-h-screen flex flex-col justify-center px-8 py-16">
      <SectionTitle
        title={language === "zh" ? "在线清洁度验证" : "Inline Cleanliness Verification"}
        subtitle={language === "zh" ? "ISO 16232 / VDA 19 实时颗粒检测" : "ISO 16232 / VDA 19 real-time particle detection"}
      />
      <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Left: Big number + verdict */}
        <GlassCard className="p-6 flex flex-col items-center justify-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
            {language === "zh" ? "总残留质量" : "Total Residual Mass"}
          </div>
          <div className="text-5xl font-bold text-white mb-1">{qcData.totalResidualMass}</div>
          <div className="text-lg text-neutral-400 mb-4">mg</div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
            qcData.verdict === "PASS"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-red-500/20 text-red-400 border border-red-500/40"
          }`}>
            {qcData.verdict} — {qcData.standard}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-neutral-500">{language === "zh" ? "质量降低" : "Mass ↓"}</div>
              <div className="text-lg font-bold text-emerald-400">{qcData.improvement.massReduction}%</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">{language === "zh" ? "颗粒降低" : "Particles ↓"}</div>
              <div className="text-lg font-bold text-emerald-400">{qcData.improvement.particleReduction}%</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">{language === "zh" ? "最大粒径降低" : "Max Size ↓"}</div>
              <div className="text-lg font-bold text-emerald-400">{qcData.improvement.maxParticleReduction}%</div>
            </div>
          </div>
        </GlassCard>

        {/* Center: BarChart particle distribution */}
        <GlassCard className="p-6">
          <h3 className="text-sm text-neutral-400 mb-4">
            {language === "zh" ? "颗粒尺寸分布" : "Particle Size Distribution"}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="bin" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "rgba(23,23,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Bar dataKey="before" name={language === "zh" ? "清洗前" : "Before"} fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="after" name={language === "zh" ? "清洗后" : "After"} fill="#06b6d4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Right: Zone Heatmap */}
        <GlassCard className="p-6">
          <h3 className="text-sm text-neutral-400 mb-4">
            {language === "zh" ? "通道清洁度热力图（20区域）" : "Channel Cleanliness Heatmap (20 zones)"}
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {qcData.zoneMap.map(z => (
              <div
                key={z.zoneId}
                className={`aspect-square rounded flex flex-col items-center justify-center text-[9px] font-medium border ${
                  z.status === "pass"
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/20 border-amber-500/30 text-amber-300"
                }`}
                title={`${z.zoneName}: ${z.residualMg}mg, max ${z.maxParticleUm}μm`}
              >
                <span>{z.zoneName}</span>
                <span>{z.residualMg}mg</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/30" /> Pass</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/30" /> Warning</span>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

// ─── Section 5: AI Decision Intelligence Panel ───────────────────────

function AIDecisionSection({ aiData }: { aiData: AIData }) {
  const { language } = useLanguage();
  const [showReasoning, setShowReasoning] = useState(3);

  // Typewriter effect for reasoning log
  useEffect(() => {
    if (showReasoning < aiData.reasoning.length) {
      const t = setTimeout(() => setShowReasoning(s => s + 1), 2000);
      return () => clearTimeout(t);
    }
  }, [showReasoning, aiData.reasoning.length]);

  return (
    <section className="min-h-screen flex flex-col justify-center px-8 py-16">
      <SectionTitle
        title={language === "zh" ? "AI决策智能面板" : "AI Decision Intelligence Panel"}
        subtitle={language === "zh" ? "深度学习 × 历史案例匹配 × 自适应收敛" : "Deep learning × historical case matching × adaptive convergence"}
      />
      <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto w-full">
        {/* A: Feature Recognition */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-cyan-400 mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {language === "zh" ? "特征识别" : "Feature Recognition"}
          </h3>
          <div className="space-y-3">
            {aiData.featuresDetected.map(f => (
              <div key={f.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-300">{language === "zh" ? f.typeZh : f.type} ({f.count})</span>
                  <span className="text-cyan-400 font-medium">{(f.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 rounded bg-white/10">
                  <div className="h-full rounded bg-cyan-500 transition-all" style={{ width: `${f.confidence * 100}%` }} />
                </div>
                <div className="text-xs text-neutral-500 mt-1">{f.strategy}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* B: Parameter Optimization Reasoning */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-amber-400 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {language === "zh" ? "参数优化推理" : "Parameter Optimization Reasoning"}
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {aiData.reasoning.slice(0, showReasoning).map((r, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-cyan-500 flex-shrink-0">{r.timestamp}</span>
                <span className="text-neutral-300">{r.event}</span>
              </div>
            ))}
            {showReasoning < aiData.reasoning.length && (
              <div className="flex items-center gap-1 text-neutral-600">
                <span className="animate-pulse">▋</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* C: Historical Case Matching */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-blue-400 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            {language === "zh" ? "历史案例匹配" : "Historical Case Matching"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-neutral-500 border-b border-white/10">
                  <th className="text-left py-2">{language === "zh" ? "项目" : "Project"}</th>
                  <th className="text-left py-2">{language === "zh" ? "客户" : "Customer"}</th>
                  <th className="text-right py-2">{language === "zh" ? "相似度" : "Similarity"}</th>
                  <th className="text-right py-2">{language === "zh" ? "周期" : "Cycle"}</th>
                </tr>
              </thead>
              <tbody>
                {aiData.caseMatches.map(c => (
                  <tr key={c.projectId} className="border-b border-white/5 text-neutral-300">
                    <td className="py-2 text-cyan-300">{c.projectId}</td>
                    <td className="py-2">{c.customer}</td>
                    <td className="py-2 text-right font-medium text-emerald-400">{c.similarity}%</td>
                    <td className="py-2 text-right">{c.cycleTime}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* D: Adaptive Adjustment Log */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-purple-400 mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {language === "zh" ? "自适应调整日志" : "Adaptive Adjustment Log"}
          </h3>
          <div className="space-y-3">
            {aiData.adaptiveIterations.map((it, i) => (
              <div key={it.iteration} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  it.verdict === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  #{it.iteration}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">{it.pressure}bar / {it.angle}°</span>
                    <span className={it.verdict === "PASS" ? "text-emerald-400" : "text-red-400"}>{it.residualMg}mg → {it.verdict}</span>
                  </div>
                  <div className="h-1 rounded bg-white/10 mt-1">
                    <div
                      className={`h-full rounded ${it.verdict === "PASS" ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${Math.max(10, 100 - (it.residualMg / 10) * 100)}%` }}
                    />
                  </div>
                </div>
                {i < aiData.adaptiveIterations.length - 1 && (
                  <ChevronDown className="w-4 h-4 text-neutral-600" />
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

// ─── Section 6: Results & Certification ──────────────────────────────

function ResultsSection({ qcData, aiData }: { qcData: QCData; aiData: AIData }) {
  const { language } = useLanguage();
  const confidencePct = Math.round(aiData.aiConfidence * 100);
  const radialData = [{ name: "confidence", value: confidencePct, fill: "#06b6d4" }];

  return (
    <section className="min-h-screen flex flex-col justify-center px-8 py-16">
      <SectionTitle
        title={language === "zh" ? "检测报告 & 认证" : "Results & Certification"}
        subtitle={language === "zh" ? "一站式清洁度报告与AI信心指数" : "One-stop cleanliness report & AI confidence index"}
      />
      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
        {/* Cleanliness Report */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-emerald-400">{language === "zh" ? "清洁度" : "Cleanliness"}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{language === "zh" ? "清洗前" : "Before"}</span>
              <span className="text-red-400">{qcData.before.totalMass} mg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{language === "zh" ? "清洗后" : "After"}</span>
              <span className="text-emerald-400">{qcData.after.totalMass} mg</span>
            </div>
            <hr className="border-white/10" />
            <div className="flex gap-2 flex-wrap">
              {["VDA 19.1", "ISO 16232"].map(badge => (
                <span key={badge} className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Performance */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-medium text-amber-400">{language === "zh" ? "性能指标" : "Performance"}</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{language === "zh" ? "周期时间" : "Cycle Time"}</span>
              <span className="text-white font-medium">{aiData.cycleTimeAchieved}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{language === "zh" ? "首次通过率" : "First-Pass Yield"}</span>
              <span className="text-white font-medium">{(aiData.firstPassYield * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{language === "zh" ? "历史清洗次数" : "Historical Cycles"}</span>
              <span className="text-white font-medium">{aiData.totalHistoricalCycles.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{language === "zh" ? "AI模型" : "AI Model"}</span>
              <span className="text-cyan-300 text-xs">{aiData.aiModelVersion}</span>
            </div>
          </div>
        </GlassCard>

        {/* AI Confidence Radial */}
        <GlassCard className="p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-medium text-cyan-400">{language === "zh" ? "AI信心指数" : "AI Confidence"}</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={radialData} barSize={12}>
              <RadialBar background={{ fill: "rgba(255,255,255,0.05)" }} dataKey="value" cornerRadius={6}>
                <Cell fill="#06b6d4" />
              </RadialBar>
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="-mt-8 text-center">
            <div className="text-3xl font-bold text-cyan-400">{confidencePct}%</div>
            <div className="text-xs text-neutral-500">{language === "zh" ? "综合AI信心评分" : "Composite AI Confidence Score"}</div>
          </div>
        </GlassCard>
      </div>

      {/* CTA Footer */}
      <div className="flex flex-wrap justify-center gap-4 mt-12">
        <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25">
          {language === "zh" ? "预约演示" : "Schedule Demo"}
        </button>
        <button className="px-8 py-3 rounded-xl border border-white/20 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all">
          {language === "zh" ? "索取规格书" : "Request Spec Sheet"}
        </button>
      </div>
    </section>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────

export default function EngineBlockAICleaningDemo() {
  const { language } = useLanguage();
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pipeline = trpc.robotCleaning.showroom.getDemoCleaningPipeline.useQuery(undefined, { refetchInterval: false });
  const qcData = trpc.robotCleaning.showroom.getDemoInlineQC.useQuery(undefined, { refetchInterval: false });
  const aiData = trpc.robotCleaning.showroom.getDemoAIDecisions.useQuery(undefined, { refetchInterval: false });

  // Auto-play kiosk mode
  const scrollToSection = useCallback((idx: number) => {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: "smooth" });
    setCurrentSection(idx);
  }, []);

  useEffect(() => {
    if (autoPlay) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSection(s => {
          const next = (s + 1) % 6;
          sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
          return next;
        });
      }, 8000);
    } else if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [autoPlay]);

  // Pause auto-play on user interaction
  useEffect(() => {
    if (!autoPlay) return;
    const pause = () => setAutoPlay(false);
    window.addEventListener("wheel", pause, { once: true });
    window.addEventListener("touchstart", pause, { once: true });
    return () => {
      window.removeEventListener("wheel", pause);
      window.removeEventListener("touchstart", pause);
    };
  }, [autoPlay]);

  const isLoading = pipeline.isLoading || qcData.isLoading || aiData.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-neutral-400 text-sm">Loading Engine Block AI Cleaning Demo...</span>
        </div>
      </div>
    );
  }

  if (!pipeline.data || !qcData.data || !aiData.data) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <div className="text-red-400">Failed to load demo data</div>
      </div>
    );
  }

  const pData = pipeline.data as { pipeline: PipelineStep[]; cncTrajectory: Waypoint[]; workpieceSpec: Record<string, unknown> };
  const qData = qcData.data as unknown as QCData;
  const aData = aiData.data as unknown as AIData;

  return (
    <div className="min-h-screen bg-[#050d1a] text-white overflow-y-auto scroll-smooth">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050d1a]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <span className="text-sm font-bold text-white tracking-wide">
              {language === "zh" ? "GRT 发动机缸体 AI 清洗演示" : "GRT Engine Block AI Cleaning Demo"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Section nav dots */}
            <div className="hidden md:flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => scrollToSection(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSection === i ? "bg-cyan-400 w-6" : "bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            {/* Auto-play toggle */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                autoPlay
                  ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-300"
                  : "border-white/20 bg-white/5 text-neutral-400 hover:text-white"
              }`}
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {autoPlay ? "Auto" : "Kiosk"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-20 pb-8 px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          {language === "zh" ? "AI驱动的发动机缸体清洗系统" : "AI-Powered Engine Block Cleaning System"}
        </h1>
        <p className="text-lg text-neutral-400 max-w-3xl mx-auto">
          {language === "zh"
            ? "水平定向冲洗 × CNC自适应控制 × 在线清洁度检测 × 闭环AI优化"
            : "Horizontal Orientation Flush × CNC Adaptive Control × Inline Cleanliness QC × Closed-Loop AI Optimization"}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <KpiCard icon={Target} label={language === "zh" ? "标准" : "Standard"} value="VDA 19.1" color="cyan" />
          <KpiCard icon={Award} label={language === "zh" ? "材质" : "Material"} value="ADC12" color="blue" />
          <KpiCard icon={Clock} label={language === "zh" ? "周期" : "Cycle"} value="38" unit="s" color="green" />
          <KpiCard icon={Zap} label={language === "zh" ? "AI信心" : "AI Conf."} value="94.2" unit="%" color="amber" />
        </div>
      </div>

      {/* 6 Sections */}
      <div ref={el => { sectionRefs.current[0] = el; }}>
        <PipelineSection pipeline={pData.pipeline} />
      </div>
      <div ref={el => { sectionRefs.current[1] = el; }}>
        <HorizontalFlushSection />
      </div>
      <div ref={el => { sectionRefs.current[2] = el; }}>
        <CNCSimulationSection trajectory={pData.cncTrajectory} />
      </div>
      <div ref={el => { sectionRefs.current[3] = el; }}>
        <InlineQCSection qcData={qData} />
      </div>
      <div ref={el => { sectionRefs.current[4] = el; }}>
        <AIDecisionSection aiData={aData} />
      </div>
      <div ref={el => { sectionRefs.current[5] = el; }}>
        <ResultsSection qcData={qData} aiData={aData} />
      </div>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-white/5">
        <p className="text-xs text-neutral-600">
          © 2026 GRT — Intelligent Cleaning Solutions for Automotive & Industrial Applications
        </p>
      </footer>
    </div>
  );
}
