/**
 * 美利信 VIP 客户门户 — 战略合作伙伴专属看板
 *
 * 场景：CEO 在余亚军董事长主持的300人供应商峰会上展示
 * 风格：高端深色 + 美利信品牌色（金色+深蓝）
 * Route: /client-portal/meilixin-vip (STANDALONE)
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield, MapPin, CheckCircle2, Activity, Globe, Zap, TrendingUp,
  Clock, Award, Phone, Mail, ExternalLink, ChevronRight, Lock,
  Microscope, Cpu, Wifi, AlertTriangle, ArrowRight,
} from "lucide-react";

// ── Animated number counter ──
function AnimatedNumber({ target, duration = 2000, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{value}{suffix}</>;
}

// ── Pulse dot ──
function PulseDot({ color = "bg-emerald-400" }: { color?: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

// ── Project milestone data ──
const PROJECT_MILESTONES = [
  { code: "M0", name: "需求确认", nameEn: "Requirements", status: "done", date: "2025-08" },
  { code: "M1", name: "方案评审", nameEn: "Design Review", status: "done", date: "2025-09" },
  { code: "M2", name: "设计冻结", nameEn: "Design Freeze", status: "done", date: "2025-11" },
  { code: "M3", name: "采购完成", nameEn: "Procurement", status: "done", date: "2026-01" },
  { code: "M5", name: "机械装配", nameEn: "Mech Assembly", status: "active", date: "2026-03", progress: 92 },
  { code: "M6", name: "电气装配", nameEn: "Elec Assembly", status: "upcoming", date: "2026-04" },
  { code: "M7", name: "内部调试", nameEn: "Commissioning", status: "upcoming", date: "2026-05" },
  { code: "M9", name: "出厂验收", nameEn: "FAT", status: "upcoming", date: "2026-06" },
  { code: "M12", name: "终验交付", nameEn: "SAT/Handover", status: "upcoming", date: "2026-08" },
];

const QUALITY_DATA = [
  { batch: "B2026-037", date: "03-24", result: 0.012, pass: true },
  { batch: "B2026-036", date: "03-21", result: 0.018, pass: true },
  { batch: "B2026-035", date: "03-18", result: 0.014, pass: true },
  { batch: "B2026-034", date: "03-15", result: 0.022, pass: true },
  { batch: "B2026-033", date: "03-12", result: 0.009, pass: true },
  { batch: "B2026-032", date: "03-09", result: 0.016, pass: true },
  { batch: "B2026-031", date: "03-06", result: 0.011, pass: true },
  { batch: "B2026-030", date: "03-03", result: 0.019, pass: true },
];

export default function MeilixinVipPortal() {
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => { setLoaded(true); }, []);
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRequestAccess = useCallback(() => {
    setRequestSent(true);
    // In production: trigger notification to CRM
    fetch("/api/trpc/targetedShowcase.supportTicket.create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { subject: "美利信VIP门户 — 余亚军董事长请求完整访问权限", priority: "high", description: "供应商峰会现场请求" } }),
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#040810] text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-amber-500/[0.03]" style={{ filter: "blur(200px)" }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04]" style={{ filter: "blur(180px)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full bg-blue-600/[0.02]" style={{ filter: "blur(160px)" }} />
      </div>

      {/* ═══ Top Navigation Bar ═══ */}
      <nav className="relative z-10 border-b border-amber-500/10 bg-[#040810]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/GRTlogo.gif" alt="GRT" className="h-10 w-10" />
            <div className="h-8 w-px bg-amber-500/20" />
            <div>
              <div className="text-sm font-bold text-amber-200 tracking-wide">GRT SYSTEM</div>
              <div className="text-[10px] text-amber-400/60 tracking-widest">STRATEGIC PARTNER PORTAL</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <PulseDot />
              <span className="text-xs text-emerald-300 font-medium">System Online</span>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              {currentTime.toLocaleTimeString("zh-CN", { hour12: false })}
            </div>
            <div className="flex gap-1">
              <button onClick={() => window.history.back()} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 transition-colors border border-white/10">← 返回</button>
              <button onClick={() => { window.location.href = "/"; }} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 transition-colors border border-white/10">⌂ 首页</button>
              <button onClick={() => { window.location.href = "/showcase-hub"; }} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 transition-colors border border-white/10">展示中枢</button>
              <button onClick={() => { window.location.href = "/showroom"; }} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 transition-colors border border-white/10">展厅</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ Hero Section ═══ */}
      <section className={`relative z-10 py-16 px-6 transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-7xl mx-auto text-center">
          {/* VIP Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-400/30 bg-amber-500/10 mb-8">
            <Award className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300 tracking-wider">V-VIP STRATEGIC PARTNER</span>
            <Lock className="h-3.5 w-3.5 text-amber-500/60" />
          </div>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            <span className="text-white">Welcome,</span>{" "}
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(245,158,11,0.3)]">
              Meilixin Group
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-2">美利信集团 · 战略合作伙伴专属看板</p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Real-time project visibility · Quality transparency · Global service connectivity
          </p>

          {/* Partnership Stats */}
          <div className="flex justify-center gap-8 mt-12">
            {[
              { value: 3, suffix: "", label: "Active Projects", labelZh: "在执行项目", icon: Zap, color: "text-cyan-400" },
              { value: 15, suffix: "+", label: "Years Partnership", labelZh: "年合作历史", icon: Award, color: "text-amber-400" },
              { value: 99.2, suffix: "%", label: "On-Time Delivery", labelZh: "准时交付率", icon: TrendingUp, color: "text-emerald-400" },
              { value: 100, suffix: "%", label: "Quality Pass Rate", labelZh: "质量合格率", icon: Shield, color: "text-blue-400" },
            ].map((s, i) => (
              <div key={i} className={`text-center transition-all duration-700 delay-${i * 150}`} style={{ transitionDelay: `${i * 150}ms` }}>
                <div className={`text-3xl md:text-4xl font-black ${s.color}`}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{s.labelZh}</div>
                <div className="text-[10px] text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Module 1: Live Project Tracking ═══ */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Live Project Tracking</h2>
              <p className="text-sm text-gray-400">项目实时追踪 · Project Alpha — 压铸件清洗线</p>
            </div>
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <PulseDot color="bg-cyan-400" />
              <span className="text-xs text-cyan-300">LIVE</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#0a0f1a] rounded-2xl border border-gray-700/40 p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Project Alpha — Die Casting Washer Line</h3>
                <p className="text-sm text-gray-400">美利信·压铸件高洁净度清洗系统 · 合同号 GRT-2026-MLX-001</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-cyan-300">
                  <AnimatedNumber target={92} suffix="%" />
                </div>
                <div className="text-xs text-gray-500">Overall Progress</div>
              </div>
            </div>

            {/* Milestone Timeline */}
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-800 rounded-full">
                <div className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all duration-1000" style={{ width: "55%" }} />
              </div>

              <div className="flex justify-between relative z-10">
                {PROJECT_MILESTONES.map((m, i) => (
                  <div key={m.code} className="flex flex-col items-center" style={{ width: `${100 / PROJECT_MILESTONES.length}%` }}>
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      m.status === "done" ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]" :
                      m.status === "active" ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse" :
                      "bg-gray-800 border-gray-600 text-gray-500"
                    }`}>
                      {m.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : m.code}
                    </div>
                    <div className={`mt-2 text-center ${m.status === "active" ? "text-amber-300" : m.status === "done" ? "text-gray-300" : "text-gray-600"}`}>
                      <div className="text-[11px] font-bold">{m.code}</div>
                      <div className="text-[10px]">{m.name}</div>
                      <div className="text-[9px] text-gray-600">{m.date}</div>
                    </div>
                    {m.status === "active" && m.progress && (
                      <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20">
                        <span className="text-[10px] text-amber-300 font-bold">{m.progress}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current status detail */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: "当前阶段", value: "M5 机械装配", icon: Cpu, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                { label: "预计交付", value: "2026年8月", icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
                { label: "质量评级", value: "A+ (IATF 16949)", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border ${item.bg} p-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-xs text-gray-400">{item.label}</span>
                  </div>
                  <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Module 2: Quality Transparency ═══ */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Microscope className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Quality Transparency</h2>
              <p className="text-sm text-gray-400">质量透明 · Millipore 颗粒度实时检测</p>
            </div>
            <div className="ml-auto px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-sm font-bold text-emerald-300">ALL PASSED</div>
                  <div className="text-[10px] text-emerald-400/70">Latest 8 batches · ISO 16232</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0f1a] rounded-2xl border border-gray-700/40 p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            {/* Chart header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Millipore Test Results — Recent Batches</h3>
                <p className="text-sm text-gray-500">VDA 19.1 · Spec Limit: ≤ 0.030 mg/part · Target: ≤ 0.020 mg/part</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-300">
                  Avg <AnimatedNumber target={0.015} duration={1500} /> mg
                </div>
                <div className="text-xs text-emerald-500">Well below spec limit</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-3 h-48 mb-4">
              {QUALITY_DATA.map((d, i) => {
                const height = (d.result / 0.035) * 100;
                const specHeight = (0.030 / 0.035) * 100;
                const targetHeight = (0.020 / 0.035) * 100;
                return (
                  <div key={i} className="flex-1 relative flex flex-col items-center justify-end h-full">
                    {/* Spec limit line */}
                    {i === 0 && (
                      <>
                        <div className="absolute w-[calc(800%+7*0.75rem)] left-0 border-t border-dashed border-red-500/40" style={{ bottom: `${specHeight}%` }}>
                          <span className="absolute -top-4 right-0 text-[9px] text-red-400">Spec ≤0.030</span>
                        </div>
                        <div className="absolute w-[calc(800%+7*0.75rem)] left-0 border-t border-dashed border-amber-500/30" style={{ bottom: `${targetHeight}%` }}>
                          <span className="absolute -top-4 right-0 text-[9px] text-amber-400">Target ≤0.020</span>
                        </div>
                      </>
                    )}
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-700"
                      style={{ height: `${height}%`, transitionDelay: `${i * 100}ms` }}
                    />
                    <div className="text-[10px] text-gray-500 mt-2">{d.date}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">{d.result}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Module 3: Global Remote Service ═══ */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Global Remote Service</h2>
              <p className="text-sm text-gray-400">全球远程服务 · Secure VPN Tunnel Active</p>
            </div>
          </div>

          <div className="bg-[#0a0f1a] rounded-2xl border border-gray-700/40 p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="grid grid-cols-3 gap-6">
              {/* Connection nodes */}
              {[
                { city: "无锡总部", cityEn: "Wuxi HQ", country: "China", status: "active", role: "Engineering Center", ping: "2ms", icon: Cpu },
                { city: "美利信工厂", cityEn: "Meilixin Plant", country: "Chongqing", status: "active", role: "Production Site", ping: "18ms", icon: Wifi },
                { city: "底特律服务中心", cityEn: "Detroit SC", country: "USA", status: "standby", role: "North America Support", ping: "145ms", icon: Globe },
              ].map((node, i) => (
                <div key={i} className={`relative rounded-xl border p-6 transition-all ${
                  node.status === "active"
                    ? "bg-blue-500/5 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                    : "bg-gray-800/20 border-gray-700/30"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                      node.status === "active" ? "bg-blue-500/15 border-blue-500/30" : "bg-gray-800 border-gray-700"
                    }`}>
                      <node.icon className={`h-5 w-5 ${node.status === "active" ? "text-blue-400" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-white">{node.city}</div>
                      <div className="text-xs text-gray-400">{node.cityEn} · {node.country}</div>
                    </div>
                    {node.status === "active" ? <PulseDot color="bg-blue-400" /> : <span className="h-3 w-3 rounded-full bg-gray-600" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Role</span>
                      <span className="text-gray-200">{node.role}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Latency</span>
                      <span className={node.status === "active" ? "text-emerald-400 font-mono" : "text-gray-500"}>{node.ping}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-semibold ${node.status === "active" ? "text-emerald-400" : "text-gray-500"}`}>
                        {node.status === "active" ? "● Connected" : "○ Standby"}
                      </span>
                    </div>
                  </div>
                  <div className={`mt-4 px-3 py-1.5 rounded-lg text-center text-xs font-medium ${
                    node.status === "active"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                      : "bg-gray-800/50 border border-gray-700/30 text-gray-500"
                  }`}>
                    {node.status === "active" ? "🔒 Secure Tunnel Active" : "Ready on Demand"}
                  </div>
                </div>
              ))}
            </div>

            {/* System health bar */}
            <div className="mt-6 flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">All Systems Healthy</span>
                <span className="text-xs text-gray-500">|</span>
                <span className="text-xs text-gray-400">Uptime 99.97% (365 days)</span>
              </div>
              <div className="text-xs text-gray-500 font-mono">
                Last check: {currentTime.toLocaleTimeString("zh-CN", { hour12: false })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Standards & Competency ═══ */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Award className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">行业标准 · 主要起草单位</h2>
              <p className="text-sm text-gray-400">Industry Standards Body · Lead Drafting Organization</p>
            </div>
          </div>
          <div className="bg-[#0a0f1a] rounded-2xl border border-cyan-500/20 p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-6">
              <img
                src="/conference-assets/grt-standards-plaque.jpg"
                alt="GRT 团体标准主要起草单位证书"
                className="w-56 h-40 object-cover rounded-xl border-2 border-cyan-500/30 shadow-[0_0_25px_rgba(34,211,238,0.15)] hover:scale-105 transition-transform cursor-pointer shrink-0"
                onClick={() => window.open("/conference-assets/grt-standards-plaque.jpg", "_blank")}
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-3">
                  T/CAEE 005-2025《新能源汽车用铝压铸件 清洁度技术要求》
                </h3>
                <p className="text-base text-gray-300 mb-4">
                  GRT（无锡杰瑞德）被<span className="text-cyan-300 font-semibold">中国电子装备技术开发协会</span>认定为该团体标准的
                  <span className="text-amber-300 font-bold">主要起草单位</span>，为新能源铝压铸行业的清洁度技术规范提供核心技术支撑。
                </p>
                <div className="flex gap-3">
                  {["VDA 19.1 认证实验室", "ISO 16232 全流程", "IATF 16949 体系", "Millipore 在线检测"].map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs text-cyan-300">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Service & Support ═══ */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Phone className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">客户服务 · 报修与反馈</h2>
              <p className="text-sm text-gray-400">Customer Service · Repair Request & Feedback</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-[#0a0f1a] rounded-2xl border border-orange-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Activity className="h-5 w-5 text-orange-400" />设备报修通道</h3>
              <p className="text-sm text-gray-300 mb-4">7×24小时全球响应 · 远程诊断优先 · 现场服务48h到达</p>
              <div className="space-y-2 mb-4">
                {["远程诊断 — VPN安全隧道 · < 2h响应", "现场服务 — 国内48h · 海外72h", "预防性维护 — IoT数据驱动 · 季度巡检"].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10 text-sm text-gray-200">
                    <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />{s}
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 font-semibold text-sm hover:bg-orange-500/25 transition-colors">提交报修工单</button>
            </div>
            <div className="bg-[#0a0f1a] rounded-2xl border border-emerald-500/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Mail className="h-5 w-5 text-emerald-400" />客户反馈中心</h3>
              <p className="text-sm text-gray-300 mb-4">您的反馈直达CEO · 48h内闭环回复</p>
              <div className="space-y-2 mb-4">
                {[{ l: "设备性能", s: 9.2 }, { l: "服务响应", s: 9.5 }, { l: "技术支持", s: 9.0 }, { l: "总体满意", s: 9.4 }].map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 w-20">{r.l}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${r.s / 10 * 100}%` }} /></div>
                    <span className="text-sm font-bold text-emerald-400 w-10 text-right">{r.s}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/25 transition-colors">提交反馈建议</button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAT Digital Twin ═══ */}
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">FAT 数字孪生验收系统</h2>
              <p className="text-sm text-gray-400">Factory Acceptance Test · Digital Twin (参照大众集团标准)</p>
            </div>
            <button onClick={() => window.open("/customer-digital-twin", "_blank")}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-sm hover:bg-purple-500/25 transition-colors">
              <Cpu className="h-4 w-4" />进入数字孪生系统<ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="bg-[#0a0f1a] rounded-2xl border border-purple-500/20 p-6 grid grid-cols-4 gap-4">
            {[
              { icon: Microscope, name: "颗粒度检测", desc: "VDA 19.1 · ≤0.030mg/part" },
              { icon: Zap, name: "功能性测试", desc: "压力/流量/温度/节拍全验证" },
              { icon: Shield, name: "安全认证", desc: "CE/UL · 急停/门锁/光栅" },
              { icon: Activity, name: "72h连续运行", desc: "OEE ≥ 95% · 零故障" },
            ].map((item, i) => (
              <div key={i} className="bg-purple-500/5 rounded-xl border border-purple-500/15 p-4">
                <item.icon className="h-6 w-6 text-purple-400 mb-2" />
                <h4 className="text-sm font-bold text-white">{item.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Handover Badge + Request Access ═══ */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Ni Weiwei handover badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-400/20 mb-8 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Award className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-left">
              <div className="text-sm text-amber-200 font-medium">Collaboratively Managed by</div>
              <div className="text-xs text-amber-400/70">倪微薇 Ni Weiwei · Next-Gen Representative · AI数智&人事行政部经理</div>
            </div>
          </div>

          <h2 className="text-3xl font-black text-white mb-3">
            Experience the Future of <span className="text-amber-300">Digital Transparency</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            This portal provides real-time visibility into your projects, quality metrics, and service status.
            Request full access to unlock detailed reports, historical data, and AI-powered insights.
          </p>

          {/* CTA Button */}
          {!requestSent ? (
            <button
              onClick={handleRequestAccess}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-lg shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-105"
            >
              <Lock className="h-5 w-5" />
              Request Full Access
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400/30 text-emerald-300 font-bold text-lg">
              <CheckCircle2 className="h-5 w-5" />
              Access Request Sent · Our team will contact you shortly
            </div>
          )}

          {/* Contact info */}
          <div className="flex justify-center gap-6 mt-8 text-sm text-gray-500">
            <a href="mailto:info@grt-group.com" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
              <Mail className="h-3.5 w-3.5" /> info@grt-group.com
            </a>
            <a href="tel:+8651083483999" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
              <Phone className="h-3.5 w-3.5" /> +86 510 834 83999
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> 无锡 · 斯图加特 · 底特律
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span>© 2026 GRT · Global Robot Technology · 杰瑞德自动化</span>
          <span className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Encrypted · TISAX AL3 Compliant · ISO 27001
          </span>
        </div>
      </footer>
    </div>
  );
}
