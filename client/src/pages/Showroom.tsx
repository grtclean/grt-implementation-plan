/**
 * Showroom — Customer-facing demo page for 闭环自适应清洗系统.
 *
 * Standalone dark-theme page (no sidebar/auth) with real-time charts,
 * adaptive control animation, torque monitoring, and performance bridge.
 */
import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import FloatingNav from '@/components/FloatingNav';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Droplets,
  Gauge,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
  LayoutDashboard,
  Home,
  Phone,
  FileText,
  Activity,
  Zap,
  Target,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Glass Card Component ──
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

// ── KPI Card ──
function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color = "cyan",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit: string;
  trend?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
  };
  const cls = colorMap[color] ?? colorMap.cyan;

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 ${cls}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" />
        <span className="text-sm text-neutral-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-sm text-neutral-400">{unit}</span>
      </div>
      {trend && <span className="text-xs text-emerald-400 mt-1 block">{trend}</span>}
    </div>
  );
}

// ── Adaptive Loop Diagram ──
function AdaptiveLoopDiagram({ history }: { history: any[] }) {
  const latest = history[history.length - 1];
  const passCount = history.filter((h) => h.verdict === "PASS").length;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Circular flow */}
      <div className="relative w-64 h-64">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Outer ring */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(6,182,212,0.2)" strokeWidth="2" />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(6,182,212,0.8)"
            strokeWidth="3"
            strokeDasharray={`${(passCount / Math.max(history.length, 1)) * 565} 565`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            className="transition-all duration-1000"
          />
          {/* Center text */}
          <text x="100" y="85" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold">
            {history.length}
          </text>
          <text x="100" y="110" textAnchor="middle" fill="rgba(6,182,212,0.8)" fontSize="12">
            iterations
          </text>
          <text x="100" y="130" textAnchor="middle" fill="#4ade80" fontSize="14">
            {passCount}/{history.length} PASS
          </text>
        </svg>
      </div>

      {/* Step labels */}
      <div className="flex items-center gap-2 text-sm flex-wrap justify-center">
        {["Spray", "Measure", "Analyze", "Adjust"].map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">{step}</span>
            {i < 3 && <ArrowRight className="w-4 h-4 text-neutral-500" />}
          </div>
        ))}
      </div>

      {/* Latest iteration details */}
      {latest && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-sm">
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <span className="text-neutral-400">Pressure</span>
            <span className="block text-white font-mono text-lg">{latest.pressure} bar</span>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <span className="text-neutral-400">Angle</span>
            <span className="block text-white font-mono text-lg">{latest.angle}°</span>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <span className="text-neutral-400">Before</span>
            <span className="block text-amber-400 font-mono text-lg">{latest.cleanlinessBefore} mg</span>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <span className="text-neutral-400">After</span>
            <span className={`block font-mono text-lg ${latest.verdict === "PASS" ? "text-emerald-400" : "text-red-400"}`}>
              {latest.cleanlinessAfter} mg
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PIE COLORS ──
const PIE_COLORS = ["#06b6d4", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function Showroom() {
  const { t } = useLanguage();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch demo data (3s refetch for real-time feel)
  const curves = trpc.robotCleaning.showroom.getParameterCurves.useQuery(undefined, { refetchInterval: 3000 });
  const adaptive = trpc.robotCleaning.showroom.getAdaptiveHistory.useQuery(undefined, { refetchInterval: 5000 });
  const demo = trpc.robotCleaning.showroom.getDemoData.useQuery(undefined, { refetchInterval: 5000 });
  const kpiOverview = trpc.robotCleaning.showroom.getKpiOverview.useQuery(undefined, { refetchInterval: 5000 });

  const curveData = curves.data?.curves ?? [];
  const adaptiveHistory = adaptive.data?.history ?? [];
  const torqueData = useMemo(() => {
    if (demo.data?.source === "live") return [];
    return (demo.data?.torqueRecords ?? []) as Array<{
      index: number;
      actual: number;
      target: number;
      upperLimit: number;
      applicationPoint: string;
    }>;
  }, [demo.data]);

  const kpi = kpiOverview.data;
  const perfEntries = (kpi?.entries ?? []) as Array<{
    entryType: string;
    cycleTimeSeconds: string;
    standardCycleTimeSeconds: string;
    cycleEfficiency: string;
    qualityPass: boolean;
    performancePoints: string;
  }>;

  // Performance distribution for pie chart
  const typeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    perfEntries.forEach((e) => {
      map.set(e.entryType, (map.get(e.entryType) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [perfEntries]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      {/* ── Top Navigation Bar ── */}
      <div className="sticky top-0 z-50 h-11 flex items-center justify-between px-5 border-b border-white/[0.06] backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.88)" }}>
        <div className="flex items-center gap-2">
          <img src="/GRTlogo.gif" alt="GRT" className="w-6 h-6 rounded" />
          <span className="text-[11px] font-mono text-neutral-500">GRT Showroom</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = "/"; }} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-600/30 text-neutral-400 bg-neutral-500/10 text-[10px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowLeft className="w-3 h-3" /> 返回
          </button>
          <button type="button" onClick={() => { window.location.href = "/customer/portal"; }} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[10px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <Gauge className="w-3 h-3" /> 客户门户
          </button>
          <button type="button" onClick={() => { window.location.href = "/showcase-hub"; }} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <LayoutDashboard className="w-3 h-3" /> 展示中枢
          </button>
          <button type="button" onClick={() => { window.location.href = "/"; }} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <Home className="w-3 h-3" /> 首页
          </button>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-neutral-950 to-neutral-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px]" />

        <div className={`relative z-10 transition-all duration-1000 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 mb-6 text-sm px-4 py-1">
            GRT Intelligent Manufacturing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            闭环自适应清洗系统
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-2">
            Closed-Loop Adaptive Cleaning Control System
          </p>
          <p className="text-neutral-500 max-w-xl mx-auto">
            Real-time pressure/angle adjustment based on cleanliness feedback, oiling torque monitoring with auto-alert,
            and seamless cycle time → performance accounting integration.
          </p>
        </div>
      </section>

      {/* ── Real-Time Dashboard ── */}
      <section className={`px-6 pb-16 max-w-7xl mx-auto transition-all duration-1000 delay-200 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-cyan-400" />
          Real-Time Monitoring Dashboard
        </h2>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={Gauge}
            label="Current Pressure"
            value={curveData.length > 0 ? curveData[curveData.length - 1].pressure.toFixed(1) : "—"}
            unit="bar"
            color="cyan"
            trend="+0.3 adaptive"
          />
          <KpiCard
            icon={Droplets}
            label="Cleanliness"
            value={curveData.length > 0 ? curveData[curveData.length - 1].cleanliness.toFixed(1) : "—"}
            unit="mg"
            color="blue"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Pass Rate"
            value={kpi ? (kpi.passRate * 100).toFixed(1) : "94.0"}
            unit="%"
            color="green"
            trend="last 100 cycles"
          />
          <KpiCard
            icon={Zap}
            label="Total Entries"
            value={kpi?.totalEntries ?? 248}
            unit="records"
            color="amber"
          />
        </div>

        {/* Line Chart: Pressure + Cleanliness over 50 cycles */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-medium mb-4 text-neutral-300">Pressure & Cleanliness Over 50 Cycles</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={curveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="cycle" stroke="#666" fontSize={12} />
              <YAxis yAxisId="left" stroke="#06b6d4" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "rgba(23,23,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "#ccc" }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="pressure" stroke="#06b6d4" strokeWidth={2} dot={false} name="Pressure (bar)" />
              <Line yAxisId="right" type="monotone" dataKey="cleanliness" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cleanliness (mg)" />
              <ReferenceLine yAxisId="right" y={5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "5mg limit", fill: "#ef4444", fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </section>

      {/* ── Adaptive Control Loop ── */}
      <section className={`px-6 pb-16 max-w-7xl mx-auto transition-all duration-1000 delay-400 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-cyan-400" />
          Adaptive Control Loop
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <GlassCard className="p-6">
            <h3 className="text-lg font-medium mb-4 text-neutral-300">Closed-Loop Iteration</h3>
            <AdaptiveLoopDiagram history={adaptiveHistory} />
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-medium mb-4 text-neutral-300">Before / After Comparison</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={adaptiveHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="iteration" stroke="#666" fontSize={12} label={{ value: "Iteration", position: "insideBottom", offset: -5, fill: "#999" }} />
                <YAxis stroke="#666" fontSize={12} label={{ value: "mg", angle: -90, position: "insideLeft", fill: "#999" }} />
                <Tooltip
                  contentStyle={{ background: "rgba(23,23,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="cleanlinessBefore" fill="#f59e0b" name="Before (mg)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cleanlinessAfter" fill="#06b6d4" name="After (mg)" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="5 5" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      </section>

      {/* ── Torque Monitoring ── */}
      <section className={`px-6 pb-16 max-w-7xl mx-auto transition-all duration-1000 delay-500 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          Oiling Torque Monitoring
        </h2>

        <GlassCard className="p-6">
          <h3 className="text-lg font-medium mb-4 text-neutral-300">
            Torque Values with 15Nm Threshold
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={torqueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="applicationPoint" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={12} domain={[0, 22]} />
              <Tooltip
                contentStyle={{ background: "rgba(23,23,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                formatter={(value: number) => [`${value.toFixed(1)} Nm`]}
              />
              <ReferenceLine y={15} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: "15Nm Limit", fill: "#ef4444", fontSize: 12 }} />
              <Bar dataKey="actual" name="Actual Torque (Nm)" radius={[4, 4, 0, 0]}>
                {torqueData.map((entry, i) => (
                  <Cell key={i} fill={entry.actual > 15 ? "#ef4444" : "#06b6d4"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </section>

      {/* ── Performance Bridge ── */}
      <section className={`px-6 pb-16 max-w-7xl mx-auto transition-all duration-1000 delay-700 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Cycle → Performance Bridge
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Table */}
          <GlassCard className="p-6 md:col-span-2 overflow-x-auto">
            <h3 className="text-lg font-medium mb-4 text-neutral-300">Recent Performance Entries</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400 border-b border-white/10">
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Cycle (s)</th>
                  <th className="text-right py-2 px-3">Standard (s)</th>
                  <th className="text-right py-2 px-3">Efficiency</th>
                  <th className="text-center py-2 px-3">Quality</th>
                  <th className="text-right py-2 px-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {perfEntries.slice(0, 10).map((e, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                        {e.entryType}
                      </Badge>
                    </td>
                    <td className="text-right py-2 px-3 font-mono">{Number(e.cycleTimeSeconds).toFixed(1)}</td>
                    <td className="text-right py-2 px-3 font-mono text-neutral-400">{Number(e.standardCycleTimeSeconds).toFixed(0)}</td>
                    <td className="text-right py-2 px-3 font-mono">{(Number(e.cycleEfficiency) * 100).toFixed(1)}%</td>
                    <td className="text-center py-2 px-3">
                      {e.qualityPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-amber-300">{Number(e.performancePoints).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          {/* Pie Chart */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-medium mb-4 text-neutral-300">Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" nameKey="name" label>
                  {typeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(23,23,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {typeDistribution.map((d, i) => (
                <Badge key={d.name} variant="outline" className="text-xs" style={{ borderColor: PIE_COLORS[i % PIE_COLORS.length], color: PIE_COLORS[i % PIE_COLORS.length] }}>
                  {d.name}: {d.value}
                </Badge>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-6 pb-20 max-w-4xl mx-auto text-center">
        <GlassCard className="p-10 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 border-cyan-500/20">
          <Target className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-3">Ready to Transform Your Cleaning Process?</h2>
          <p className="text-neutral-400 mb-8 max-w-lg mx-auto">
            Our adaptive cleaning system delivers 94%+ first-pass yield with automatic parameter optimization.
            Contact us for a live demonstration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
              <Phone className="w-4 h-4" />
              Schedule Demo
            </Button>
            <Button size="lg" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 gap-2">
              <FileText className="w-4 h-4" />
              Request Spec Sheet
            </Button>
          </div>
          <p className="text-neutral-500 text-sm mt-6">
            Contact: sales@grt-group.com | +86 510 834 83999
          </p>
          <a
            href="/supplier-governance"
            className="inline-flex items-center gap-1.5 mt-4 text-xs text-green-400/60 hover:text-green-400 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            供应商合作请进入供应商治理平台 →
          </a>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-neutral-600 text-sm">
        &copy; {new Date().getFullYear()} GRT Group — Intelligent Manufacturing Division
      </footer>

      {/* ─── Fixed Bottom Navigation ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 border-t border-white/[0.05] backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.92)" }}>
        <span className="text-[10px] font-mono text-neutral-600">GRT Showroom</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { document.documentElement.scrollTo({ top: 0, behavior: "smooth" }); document.body.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowUp className="w-3.5 h-3.5" /> 返回顶部
          </button>
          <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = "/showcase-hub"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-600/30 text-neutral-400 bg-neutral-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> 返回
          </button>
          <button type="button" onClick={() => { window.location.href = "/showcase-hub"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 text-purple-400 bg-purple-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <LayoutDashboard className="w-3.5 h-3.5" /> 展示中枢
          </button>
          <button type="button" onClick={() => { window.location.href = "/me"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <Home className="w-3.5 h-3.5" /> 主界面
          </button>
        </div>
      </div>
      <div className="h-12" />
      <FloatingNav />
    </div>
  );
}
