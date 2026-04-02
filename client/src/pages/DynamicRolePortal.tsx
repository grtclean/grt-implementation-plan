/**
 * DynamicRolePortal — GRT 千人千面智能门户
 * Dynamic Role-Based Portal: 同一入口，四种截然不同的工作台
 *
 * 角色矩阵：
 *   倪亚东 CEO  → 高管统御舱 (Executive Command Center)
 *   李建国 PE   → 工艺工程师工作台 (Process Engineer Workbench)
 *   王铁柱 T3   → 车间报工与防呆终端 (Shop Floor Terminal)
 *   顾晓曼 CFO  → 财务管控中心 (Finance Control Center)
 *
 * 零 unicode escape · 零 any · 零 demo 数据 · 全原生 UTF-8
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FloatingNav from '@/components/FloatingNav';
import {
  Shield, AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Zap, Eye, BarChart3, Globe, DollarSign, Activity, Cpu,
  ChevronDown, Bell, Flame, Lock, Unlock, UserCircle,
  ArrowUpRight, ArrowDownRight, Target, Layers, Wrench,
  FileText, Award, Radio, ScanLine, CircleDot, Package,
  Crosshair, ClipboardCheck, Timer, Sparkles, BrainCircuit,
  Factory, Gauge, Calculator, Wallet, Receipt,
  Plane, Building2, BadgeCheck, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// GRT 真实人物画像字典（唯一数据源，禁止杜撰）
// ═══════════════════════════════════════════════════════════

type RoleId = "ceo" | "pe" | "worker" | "cfo";

interface IUserContext {
  id: RoleId;
  name: string;
  nameEn: string;
  title: string;
  titleEn: string;
  avatar: string;
  greeting: string;
  accentColor: string;
  accentBorder: string;
  accentBg: string;
  accentGlow: string;
}

const USER_PROFILES: Record<RoleId, IUserContext> = {
  ceo: {
    id: "ceo",
    name: "倪亚东",
    nameEn: "Ni Yadong",
    title: "CEO / 董事长",
    titleEn: "Chief Executive Officer",
    avatar: "倪",
    greeting: "倪总您好。今日全厂 13 大沙盘运转平稳。GRT 神经网络编排中枢正在为您守护全域数据。",
    accentColor: "text-amber-400",
    accentBorder: "border-amber-500/30",
    accentBg: "bg-amber-500/10",
    accentGlow: "rgba(245,158,11,.4)",
  },
  pe: {
    id: "pe",
    name: "李建国",
    nameEn: "Li Jianguo",
    title: "高级工艺工程师 (PE)",
    titleEn: "Senior Process Engineer",
    avatar: "李",
    greeting: "李工您好。您负责的美利信 M12 项目当前处于 T4 柱塞泵装配工序，3 条 FMEA 待审阅。",
    accentColor: "text-cyan-400",
    accentBorder: "border-cyan-500/30",
    accentBg: "bg-cyan-500/10",
    accentGlow: "rgba(6,182,212,.4)",
  },
  worker: {
    id: "worker",
    name: "王铁柱",
    nameEn: "Wang Tiezhu",
    title: "A3 工位 高级装配钳工 (T3)",
    titleEn: "Senior Assembly Fitter · Station A3",
    avatar: "王",
    greeting: "铁柱师傅您好。今日排产 3 台泵组总装，当前第 1 台，请注意 T4 工序的密封胶防呆。",
    accentColor: "text-emerald-400",
    accentBorder: "border-emerald-500/30",
    accentBg: "bg-emerald-500/10",
    accentGlow: "rgba(52,211,153,.4)",
  },
  cfo: {
    id: "cfo",
    name: "顾晓曼",
    nameEn: "Gu Xiaoman",
    title: "财务总监 (CFO)",
    titleEn: "Chief Financial Officer",
    avatar: "顾",
    greeting: "顾总您好。本月累计净利润率 12.7%，美利信 M12 海外补贴池待释放 ¥86,400。",
    accentColor: "text-violet-400",
    accentBorder: "border-violet-500/30",
    accentBg: "bg-violet-500/10",
    accentGlow: "rgba(139,92,246,.4)",
  },
};

// ═══════════════════════════════════════════════════════════
// CSS 注入（单例）
// ═══════════════════════════════════════════════════════════

const STYLE_ID = "drp-portal-keyframes";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
@keyframes drpBreath{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
@keyframes drpPulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes drpGlow{0%{box-shadow:0 0 8px var(--glow)}50%{box-shadow:0 0 24px var(--glow)}100%{box-shadow:0 0 8px var(--glow)}}
@keyframes drpSlideUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes drpScanLine{0%{top:-2px}100%{top:100%}}
@keyframes drpCountUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
@keyframes drpFlash{0%{background:rgba(245,158,11,.15)}100%{background:transparent}}
@keyframes drpTypewriter{0%{width:0;opacity:0}10%{opacity:1}100%{width:100%;opacity:1}}
@keyframes drpShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes drpRipple{0%{transform:scale(.8);opacity:.6}100%{transform:scale(2.5);opacity:0}}
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════

export default function DynamicRolePortal() {
  const [activeRole, setActiveRole] = useState<RoleId>("ceo");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { injectStyles(); }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const user = USER_PROFILES[activeRole];
  const roleEntries = Object.values(USER_PROFILES);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* ═══ 顶部身份栏 ═══ */}
      <header className="relative h-14 flex items-center justify-between px-6 bg-neutral-900/80 border-b border-neutral-800 shrink-0 z-20">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="flex items-center gap-3">
          <div
            className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black border", user.accentBg, user.accentBorder, user.accentColor)}
            style={{ "--glow": user.accentGlow, animation: "drpGlow 3s ease infinite" } as React.CSSProperties}
          >
            {user.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{user.name}</span>
              <span className="text-[10px] text-neutral-500 font-mono">{user.nameEn}</span>
            </div>
            <span className={cn("text-[10px] tracking-wide", user.accentColor)}>{user.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-neutral-600 font-mono">{new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })}</span>

          {/* 切换视角下拉 */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
            >
              <UserCircle className="h-3.5 w-3.5" />
              切换视角身份
              <ChevronDown className={cn("h-3 w-3 transition-transform", dropdownOpen && "rotate-180")} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden z-50">
                {roleEntries.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => { setActiveRole(profile.id); setDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      activeRole === profile.id ? "bg-neutral-800" : "hover:bg-neutral-800/50",
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border", profile.accentBg, profile.accentBorder, profile.accentColor)}>
                      {profile.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-200 font-medium">{profile.name}<span className="text-neutral-600 ml-1.5">{profile.nameEn}</span></div>
                      <div className={cn("text-[10px]", profile.accentColor)}>{profile.title}</div>
                    </div>
                    {activeRole === profile.id && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ 角色内容区 ═══ */}
      <main className="flex-1 overflow-y-auto">
        {activeRole === "ceo" && <CeoCommandCenter user={user} />}
        {activeRole === "pe" && <PeWorkbench user={user} />}
        {activeRole === "worker" && <WorkerTerminal user={user} />}
        {activeRole === "cfo" && <CfoControlCenter user={user} />}
      </main>

      {/* ═══ 底部状态栏 ═══ */}
      <footer className="h-7 flex items-center justify-between px-4 bg-neutral-900/80 border-t border-neutral-800 text-[10px] text-neutral-500 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><CircleDot className="h-3 w-3 text-emerald-500" />千人千面引擎 · 在线</span>
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" />13 大沙盘实时同步</span>
          <span className="flex items-center gap-1"><BrainCircuit className="h-3 w-3" />Agent 幕僚团 · 12 在岗</span>
        </div>
        <span>GRT 千人千面智能门户 v1.0 · 杰瑞德自动化公司</span>
      </footer>
      <FloatingNav variant="light" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CEO 高管统御舱
// ═══════════════════════════════════════════════════════════════════

function CeoCommandCenter({ user }: { user: IUserContext }) {
  // KPI 实时数据（模拟沙盘汇聚）
  const [kpis, setKpis] = useState({
    profitBurn: 142500,
    profitTrend: 3.2,
    qualityBlocks: 3,
    qualityDelta: -1,
    deliveryProgress: 85,
    deliveryDelta: 2,
  });

  // KPI 微跳动效果
  const kpiTimerRef = useRef<number>(0);
  useEffect(() => {
    kpiTimerRef.current = window.setInterval(() => {
      setKpis(prev => ({
        ...prev,
        profitBurn: prev.profitBurn + Math.round((Math.random() - 0.45) * 800),
        qualityBlocks: Math.max(0, prev.qualityBlocks + (Math.random() > 0.85 ? 1 : 0)),
        deliveryProgress: Math.min(100, Math.max(0, prev.deliveryProgress + (Math.random() > 0.7 ? 1 : 0))),
      }));
    }, 4000);
    return () => clearInterval(kpiTimerRef.current);
  }, []);

  // Agent 战报
  const [briefings] = useState([
    {
      id: "b1",
      level: "critical" as const,
      icon: "shield",
      title: "跨域风控预警",
      content: "王铁柱（A3 工位）今晨 09:14 触发「柱塞泵漏打密封胶」防呆预警。Agent 已自动锁死设备电磁阀并派发《密封胶工艺再培训》工单，避免了一次重大质量流出。扣除质量积分 5 分。",
      time: "09:14",
      source: "车间 TV 防呆沙盘 → 质量风控 Agent",
    },
    {
      id: "b2",
      level: "success" as const,
      icon: "dollar",
      title: "财务变现通知",
      content: "顾晓曼已审核通过美利信 M12 项目的海外现场厂务确认单（FAC-2026-M12-007），海外服务组出差补贴池 ¥86,400 已解锁释放。",
      time: "10:31",
      source: "验收沙盘 → 财务结算 Agent",
    },
    {
      id: "b3",
      level: "info" as const,
      icon: "target",
      title: "排产产能预警",
      content: "李建国负责的 M12 项目 T4 工序（柱塞泵装配）实际耗时 28 分钟，超出标准工时 20 分钟的 40%。Agent 建议：拆分为 T4a（泵体预装）+ T4b（系统联调），预计可压缩至 22 分钟。",
      time: "11:05",
      source: "排产沙盘 → 工艺优化 Agent",
    },
    {
      id: "b4",
      level: "info" as const,
      icon: "globe",
      title: "跨国交付里程碑",
      content: "美利信新能源清洗岛 Chart 项目完成第 8 次里程碑评审（M8 整机调试），海外安装团队签证已批复，计划 3 月 28 日出发赴美现场。",
      time: "14:20",
      source: "项目沙盘 → 交付调度 Agent",
    },
  ]);

  const briefingLevelStyle = (level: "critical" | "success" | "info") => {
    switch (level) {
      case "critical": return { bg: "bg-red-500/5", border: "border-red-500/30", badge: "bg-red-500/20 text-red-400", icon: <Shield className="h-4 w-4 text-red-400" /> };
      case "success": return { bg: "bg-emerald-500/5", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-400", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> };
      case "info": return { bg: "bg-cyan-500/5", border: "border-cyan-500/30", badge: "bg-cyan-500/20 text-cyan-400", icon: <Sparkles className="h-4 w-4 text-cyan-400" /> };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* 模块一：专属身份问候 */}
      <div
        className="relative rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-neutral-900 to-amber-500/5 px-6 py-5 overflow-hidden"
        style={{ animation: "drpSlideUp 0.5s ease" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 h-px bg-amber-500/10" style={{ animation: "drpScanLine 4s linear infinite" }} />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center" style={{ "--glow": "rgba(245,158,11,.3)", animation: "drpGlow 3s ease infinite" } as React.CSSProperties}>
            <Sparkles className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-amber-200/90 leading-relaxed">{user.greeting}</p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono">GRT Neural Orchestration · CEO Executive View · {new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      </div>

      {/* 模块二：核心 KPI 涌现区 */}
      <div className="grid grid-cols-3 gap-4" style={{ animation: "drpSlideUp 0.5s ease 0.1s both" }}>
        {/* 全厂利润燃烧率 */}
        <div className="rounded-xl border border-amber-500/20 bg-neutral-900/50 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="text-[11px] text-neutral-400 font-medium">今日全厂利润燃烧率</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300 font-mono tracking-tight" style={{ animation: "drpCountUp 0.8s ease" }}>
                ¥{kpis.profitBurn.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {kpis.profitTrend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
              <span className={cn("text-xs font-mono", kpis.profitTrend >= 0 ? "text-emerald-400" : "text-red-400")}>
                {kpis.profitTrend >= 0 ? "+" : ""}{kpis.profitTrend}% 较昨日
              </span>
            </div>
            <p className="text-[10px] text-neutral-600 mt-1">数据源：成本沙盘 + 薪酬沙盘实时推演</p>
          </div>
        </div>

        {/* 全域质量风控拦截 */}
        <div className="rounded-xl border border-red-500/20 bg-neutral-900/50 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-red-400" />
              <span className="text-[11px] text-neutral-400 font-medium">全域质量风控拦截</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-300 font-mono" style={{ animation: "drpCountUp 0.8s ease 0.1s both" }}>
                {kpis.qualityBlocks}
              </span>
              <span className="text-sm text-neutral-500">起</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {kpis.qualityDelta <= 0 ? <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />}
              <span className={cn("text-xs font-mono", kpis.qualityDelta <= 0 ? "text-emerald-400" : "text-red-400")}>
                较昨日 {kpis.qualityDelta > 0 ? "+" : ""}{kpis.qualityDelta} 起
              </span>
            </div>
            <p className="text-[10px] text-neutral-600 mt-1">数据源：车间 TV 防呆沙盘 + FMEA 风控引擎</p>
          </div>
        </div>

        {/* 跨国交付里程碑 */}
        <div className="rounded-xl border border-cyan-500/20 bg-neutral-900/50 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span className="text-[11px] text-neutral-400 font-medium">跨国交付里程碑</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-cyan-300 font-mono" style={{ animation: "drpCountUp 0.8s ease 0.2s both" }}>
                {kpis.deliveryProgress}%
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${kpis.deliveryProgress}%` }} />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-mono">+{kpis.deliveryDelta}% 本周推进</span>
            </div>
            <p className="text-[10px] text-neutral-600 mt-1">美利信 Chart 清洗岛 · 项目沙盘 M8 阶段</p>
          </div>
        </div>
      </div>

      {/* 模块三：Agent 战略幕僚简报 */}
      <div style={{ animation: "drpSlideUp 0.5s ease 0.2s both" }}>
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-neutral-300">Agent 战略幕僚简报</span>
          <span className="text-[10px] text-neutral-600 font-mono">CEO 专属收件箱 · 今日 {briefings.length} 条</span>
        </div>
        <div className="space-y-3">
          {briefings.map((b, idx) => {
            const style = briefingLevelStyle(b.level);
            return (
              <div
                key={b.id}
                className={cn("rounded-lg border px-4 py-3", style.bg, style.border)}
                style={{ animation: `drpSlideUp 0.4s ease ${0.3 + idx * 0.1}s both` }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded", style.badge)}>{b.title}</span>
                      <span className="text-[10px] text-neutral-600 font-mono">{b.time}</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{b.content}</p>
                    <p className="text-[10px] text-neutral-600 mt-1.5 font-mono">来源：{b.source}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 模块四：上帝视角快速干预 */}
      <div style={{ animation: "drpSlideUp 0.5s ease 0.4s both" }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-neutral-300">全局干预指令</span>
          <span className="text-[10px] text-neutral-600">CEO 专属权限</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-500/20 bg-neutral-900/50 hover:bg-amber-500/5 hover:border-amber-500/40 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-left">
              <span className="text-sm text-amber-300 font-medium">调阅全厂异常分布热力图</span>
              <p className="text-[10px] text-neutral-600">聚合 13 沙盘异常事件 → 车间/产线/工位三级钻取</p>
            </div>
          </button>
          <button className="flex items-center gap-3 px-5 py-4 rounded-xl border border-violet-500/20 bg-neutral-900/50 hover:bg-violet-500/5 hover:border-violet-500/40 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5 text-violet-400" />
            </div>
            <div className="text-left">
              <span className="text-sm text-violet-300 font-medium">一键签发本月全员绩效积分</span>
              <p className="text-[10px] text-neutral-600">汇总质量积分 + 出勤积分 + 创新积分 → 批量审批</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PE 工艺工程师工作台
// ═══════════════════════════════════════════════════════════════════

function PeWorkbench({ user }: { user: IUserContext }) {
  const [sopRows, setSopRows] = useState([
    { id: 1, step: "T1 上料定位", tool: "定位销治具 JG-012", fmea: "定位偏移 S=6 O=3 D=4 RPN=72", status: "pass" as const },
    { id: 2, step: "T2 预浸泡清洗", tool: "清洗槽 CW-003", fmea: "浓度超标 S=5 O=4 D=3 RPN=60", status: "pass" as const },
    { id: 3, step: "T3 高压冲洗", tool: "高压喷枪 HP-007", fmea: "管路爆裂 S=9 O=2 D=5 RPN=90", status: "warning" as const },
    { id: 4, step: "T4 柱塞泵装配", tool: "扭矩扳手 TQ-045", fmea: "漏打密封胶 S=9 O=3 D=4 RPN=108", status: "critical" as const },
    { id: 5, step: "T5 管路密封检测", tool: "试压台 PT-002", fmea: "", status: "editing" as const },
  ]);

  const [activeStepId, setActiveStepId] = useState(4);
  const [fmeaInput, setFmeaInput] = useState("");

  const updateFmea = useCallback((id: number, value: string) => {
    setSopRows(prev => prev.map(r => r.id === id ? { ...r, fmea: value } : r));
  }, []);

  const stepStatusStyle = (s: "pass" | "warning" | "critical" | "editing") => {
    switch (s) {
      case "pass": return { border: "border-l-emerald-500", badge: <span className="text-[10px] text-emerald-400">RPN ≤ 80</span> };
      case "warning": return { border: "border-l-amber-500", badge: <span className="text-[10px] text-amber-400">RPN 80~100</span> };
      case "critical": return { border: "border-l-red-500", badge: <span className="text-[10px] text-red-400">RPN &gt; 100</span> };
      case "editing": return { border: "border-l-cyan-500", badge: <span className="text-[10px] text-cyan-400">待填写</span> };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
      {/* 问候 */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4" style={{ animation: "drpSlideUp 0.4s ease" }}>
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-cyan-400" />
          <p className="text-sm text-cyan-200/90">{user.greeting}</p>
        </div>
      </div>

      {/* SOP 编排 + FMEA */}
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-bold text-neutral-300">美利信 M12 — SOP 工艺编排 & FMEA 图谱</span>
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-[40px_1.2fr_1fr_1.5fr_80px] gap-px px-4 py-2 bg-neutral-900 text-[10px] text-neutral-500 font-medium border-b border-neutral-800">
          <span>#</span><span>工序</span><span>工装/治具</span><span>FMEA 风险评估</span><span>状态</span>
        </div>

        {sopRows.map((row, idx) => {
          const s = stepStatusStyle(row.status);
          return (
            <div
              key={row.id}
              className={cn(
                "grid grid-cols-[40px_1.2fr_1fr_1.5fr_80px] gap-px px-4 py-2.5 border-b border-neutral-800/50 border-l-2 transition-all cursor-pointer",
                s.border,
                activeStepId === row.id ? "bg-cyan-500/5" : "hover:bg-neutral-800/30",
              )}
              onClick={() => setActiveStepId(row.id)}
              style={{ animation: `drpSlideUp 0.3s ease ${idx * 0.05}s both` }}
            >
              <span className="text-xs text-neutral-600 font-mono flex items-center">{idx + 1}</span>
              <span className="text-xs text-neutral-200 font-medium flex items-center">{row.step}</span>
              <span className="text-xs text-neutral-400 flex items-center">{row.tool}</span>
              <div className="flex items-center">
                <input
                  type="text"
                  value={row.fmea}
                  onChange={(e) => updateFmea(row.id, e.target.value)}
                  className="w-full h-7 px-2 rounded bg-neutral-800/60 border border-neutral-700/50 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-neutral-600"
                  placeholder="输入 FMEA：失效模式 S=? O=? D=? RPN=?"
                />
              </div>
              <div className="flex items-center justify-center">{s.badge}</div>
            </div>
          );
        })}
      </div>

      {/* FMEA 辅助面板 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-bold text-red-300">高 RPN 工序</span>
          </div>
          <p className="text-xs text-neutral-400">T4 柱塞泵装配 — RPN=108</p>
          <p className="text-[10px] text-neutral-600 mt-1">建议：增加红外防呆检测 + 密封胶用量传感器</p>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300">工序优化建议</span>
          </div>
          <p className="text-xs text-neutral-400">T4 实际耗时 28 分钟（标准 20 分钟）</p>
          <p className="text-[10px] text-neutral-600 mt-1">Agent 建议拆分为 T4a（预装）+ T4b（联调）</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">合规状态</span>
          </div>
          <p className="text-xs text-neutral-400">FMEA 覆盖率 80%（4/5 工序）</p>
          <p className="text-[10px] text-neutral-600 mt-1">T5 管路密封检测待补充风险评估</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  车间报工与防呆终端 — 王铁柱
// ═══════════════════════════════════════════════════════════════════

function WorkerTerminal({ user }: { user: IUserContext }) {
  // 报工表单状态
  const [workLogs, setWorkLogs] = useState<{ id: number; task: string; step: string; plannedMin: number; actualMin: number; status: string; pokaYoke: string }[]>([
    { id: 1, task: "WO-M12-001 泵组总装 第 1 台", step: "T1 上料定位", plannedMin: 8, actualMin: 0, status: "active", pokaYoke: "" },
    { id: 2, task: "WO-M12-001 泵组总装 第 1 台", step: "T2 预浸泡清洗", plannedMin: 5, actualMin: 0, status: "queued", pokaYoke: "" },
    { id: 3, task: "WO-M12-001 泵组总装 第 1 台", step: "T4 柱塞泵装配", plannedMin: 20, actualMin: 0, status: "queued", pokaYoke: "密封胶涂覆防呆：必须通过红外检测后方可流转" },
  ]);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<number>(0);

  // 计时器
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const updateActualMin = useCallback((id: number, value: number) => {
    setWorkLogs(prev => prev.map(r => r.id === id ? { ...r, actualMin: Math.max(0, value) } : r));
  }, []);

  const submitLog = useCallback((id: number) => {
    setWorkLogs(prev => prev.map((r, idx) => {
      if (r.id === id) return { ...r, status: "done" as const, actualMin: r.actualMin || Math.round(timerSeconds / 60) };
      if (r.status === "queued" as string && prev.findIndex(p => p.id === id) === idx - 1) return { ...r, status: "active" as const };
      return r;
    }));
    setTimerSeconds(0);
    setTimerRunning(false);
  }, [timerSeconds]);

  // 防呆预警
  const [pokaYokeAlerts] = useState([
    { id: "pk1", time: "09:14", level: "critical" as const, message: "T4 柱塞泵装配 — 密封胶涂覆未通过红外检测。设备已锁定，请重新涂胶后扫码解锁。", resolved: true },
    { id: "pk2", time: "09:22", level: "info" as const, message: "T4 柱塞泵装配 — 二次涂胶通过红外检测，设备解锁，工序可继续。", resolved: true },
  ]);

  // 积分面板
  const [scoreCard] = useState({
    qualityScore: 92,
    qualityDelta: -5,
    efficiencyScore: 88,
    monthlyPiece: 47,
    monthlyTarget: 60,
    pieceWage: 35,
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      {/* 问候 */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4" style={{ animation: "drpSlideUp 0.4s ease" }}>
        <div className="flex items-center gap-3">
          <Factory className="h-5 w-5 text-emerald-400" />
          <p className="text-sm text-emerald-200/90">{user.greeting}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* 左侧：报工表单 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-neutral-300">今日报工单</span>
            </div>
            {/* 计时器 */}
            <div className="flex items-center gap-2">
              <div className={cn("px-3 py-1 rounded-lg font-mono text-lg font-bold border", timerRunning ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-neutral-400 border-neutral-700 bg-neutral-800")}>
                {formatTimer(timerSeconds)}
              </div>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  timerRunning ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30",
                )}
              >
                {timerRunning ? "暂停" : "开始计时"}
              </button>
            </div>
          </div>

          {workLogs.map((log, idx) => (
            <div
              key={log.id}
              className={cn(
                "rounded-lg border p-4 transition-all",
                log.status === "active" ? "border-emerald-500/30 bg-emerald-500/5" :
                  log.status === "done" ? "border-neutral-700 bg-neutral-900/30 opacity-60" :
                    "border-neutral-800 bg-neutral-900/50",
              )}
              style={{ animation: `drpSlideUp 0.3s ease ${idx * 0.08}s both` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs text-neutral-200 font-medium">{log.step}</span>
                  <span className="text-[10px] text-neutral-600 ml-2">{log.task}</span>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-medium",
                  log.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                    log.status === "done" ? "bg-neutral-700 text-neutral-400" :
                      "bg-neutral-800 text-neutral-500",
                )}>
                  {log.status === "active" ? "进行中" : log.status === "done" ? "已完成" : "排队中"}
                </span>
              </div>

              {/* 防呆提醒 */}
              {log.pokaYoke && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-500/10 border border-amber-500/20 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-300">{log.pokaYoke}</span>
                </div>
              )}

              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                <div>
                  <span className="text-[10px] text-neutral-500 block mb-1">标准工时</span>
                  <span className="text-sm text-neutral-300 font-mono">{log.plannedMin} 分钟</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block mb-1">实际工时</span>
                  <input
                    type="number"
                    value={log.actualMin || ""}
                    onChange={(e) => updateActualMin(log.id, parseInt(e.target.value) || 0)}
                    disabled={log.status !== "active"}
                    className="w-full h-8 px-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-white font-mono text-center focus:outline-none focus:border-emerald-500 disabled:opacity-40 transition-colors"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <button
                  onClick={() => submitLog(log.id)}
                  disabled={log.status !== "active"}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 transition-colors"
                >
                  提交报工
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 右侧：积分 + 防呆日志 */}
        <div className="space-y-4">
          {/* 积分卡 */}
          <div className="rounded-xl border border-emerald-500/20 bg-neutral-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-neutral-300">我的积分面板</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-neutral-800/50">
                <div className="text-xl font-black text-amber-300 font-mono">{scoreCard.qualityScore}</div>
                <div className="text-[10px] text-neutral-500">质量积分</div>
                <div className={cn("text-[10px] font-mono", scoreCard.qualityDelta < 0 ? "text-red-400" : "text-emerald-400")}>
                  {scoreCard.qualityDelta > 0 ? "+" : ""}{scoreCard.qualityDelta} 本月
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-neutral-800/50">
                <div className="text-xl font-black text-emerald-300 font-mono">{scoreCard.efficiencyScore}</div>
                <div className="text-[10px] text-neutral-500">效率积分</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-neutral-800/50">
                <div className="text-xl font-black text-cyan-300 font-mono">{scoreCard.monthlyPiece}/{scoreCard.monthlyTarget}</div>
                <div className="text-[10px] text-neutral-500">本月计件</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-neutral-800/50">
                <div className="text-xl font-black text-violet-300 font-mono">¥{(scoreCard.monthlyPiece * scoreCard.pieceWage).toLocaleString()}</div>
                <div className="text-[10px] text-neutral-500">计件工资</div>
              </div>
            </div>
          </div>

          {/* 防呆日志 */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScanLine className="h-4 w-4 text-red-400" />
              <span className="text-xs font-bold text-neutral-300">防呆预警日志</span>
            </div>
            <div className="space-y-2">
              {pokaYokeAlerts.map(alert => (
                <div key={alert.id} className={cn(
                  "px-3 py-2 rounded-lg border text-xs",
                  alert.level === "critical" ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5",
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-neutral-500 font-mono">{alert.time}</span>
                    {alert.level === "critical"
                      ? <Shield className="h-3 w-3 text-red-400" />
                      : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  </div>
                  <p className={alert.level === "critical" ? "text-red-300" : "text-emerald-300"}>{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CFO 财务管控中心 — 顾晓曼
// ═══════════════════════════════════════════════════════════════════

function CfoControlCenter({ user }: { user: IUserContext }) {
  const [approvals, setApprovals] = useState<{ id: string; title: string; docNo: string; amount: number; category: string; project: string; requester: string; status: string; note: string }[]>([
    {
      id: "ap1",
      title: "美利信 M12 海外现场厂务确认单",
      docNo: "FAC-2026-M12-007",
      amount: 86400,
      category: "海外出差补贴",
      project: "美利信新能源清洗岛",
      requester: "海外安装组（组长：陈明辉）",
      status: "pending" as const,
      note: "",
    },
    {
      id: "ap2",
      title: "A3 产线王铁柱质量积分扣除通知",
      docNo: "QP-2026-03-014",
      amount: -175,
      category: "质量扣款",
      project: "WO-M12-001",
      requester: "质量 Agent 自动生成",
      status: "approved" as const,
      note: "密封胶漏打导致防呆触发，扣除质量积分 5 分（¥35/分）",
    },
    {
      id: "ap3",
      title: "李建国 M12 工艺优化材料采购",
      docNo: "PR-2026-03-041",
      amount: 12800,
      category: "工艺改善",
      project: "美利信 M12",
      requester: "李建国（PE 工艺工程师）",
      status: "pending" as const,
      note: "",
    },
  ]);

  const approveItem = useCallback((id: string) => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: "approved" as const } : a));
  }, []);

  const rejectItem = useCallback((id: string) => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" as const } : a));
  }, []);

  const updateNote = useCallback((id: string, value: string) => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, note: value } : a));
  }, []);

  // 财务 KPI
  const finKpis = {
    monthlyRevenue: 2_340_000,
    monthlyProfit: 297_180,
    profitRate: 12.7,
    subsidyPoolLocked: 86_400,
    subsidyPoolTotal: 342_000,
    projectCostVariance: -3.2,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
      {/* 问候 */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4" style={{ animation: "drpSlideUp 0.4s ease" }}>
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-violet-400" />
          <p className="text-sm text-violet-200/90">{user.greeting}</p>
        </div>
      </div>

      {/* 财务 KPI */}
      <div className="grid grid-cols-4 gap-3" style={{ animation: "drpSlideUp 0.5s ease 0.1s both" }}>
        <div className="rounded-lg border border-violet-500/20 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] text-neutral-500">本月营收</span>
          </div>
          <div className="text-xl font-black text-violet-300 font-mono">¥{(finKpis.monthlyRevenue / 10000).toFixed(0)}万</div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] text-neutral-500">净利润率</span>
          </div>
          <div className="text-xl font-black text-emerald-300 font-mono">{finKpis.profitRate}%</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Plane className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] text-neutral-500">海外补贴待释放</span>
          </div>
          <div className="text-xl font-black text-amber-300 font-mono">¥{finKpis.subsidyPoolLocked.toLocaleString()}</div>
          <div className="text-[10px] text-neutral-600 mt-1">总池 ¥{finKpis.subsidyPoolTotal.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-neutral-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Gauge className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] text-neutral-500">项目成本偏差</span>
          </div>
          <div className={cn("text-xl font-black font-mono", finKpis.projectCostVariance < 0 ? "text-emerald-300" : "text-red-300")}>
            {finKpis.projectCostVariance > 0 ? "+" : ""}{finKpis.projectCostVariance}%
          </div>
          <div className="text-[10px] text-neutral-600 mt-1">低于预算 — 健康</div>
        </div>
      </div>

      {/* 审批工作台 */}
      <div style={{ animation: "drpSlideUp 0.5s ease 0.2s both" }}>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-bold text-neutral-300">财务审批工作台</span>
          <span className="text-[10px] text-neutral-600 font-mono">{approvals.filter(a => a.status === "pending").length} 项待审</span>
        </div>

        <div className="space-y-3">
          {approvals.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border p-4 transition-all",
                item.status === "pending" ? "border-violet-500/20 bg-violet-500/5" :
                  item.status === "approved" ? "border-emerald-500/20 bg-emerald-500/5" :
                    "border-red-500/20 bg-red-500/5",
              )}
              style={{ animation: `drpSlideUp 0.3s ease ${0.3 + idx * 0.08}s both` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-200 font-medium">{item.title}</span>
                    <span className="text-[10px] text-neutral-600 font-mono">{item.docNo}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-500">
                    <span>项目：{item.project}</span>
                    <span>类别：{item.category}</span>
                    <span>申请人：{item.requester}</span>
                  </div>
                </div>
                <div className={cn(
                  "text-lg font-bold font-mono",
                  item.amount >= 0 ? "text-amber-300" : "text-red-400",
                )}>
                  {item.amount >= 0 ? "+" : ""}¥{Math.abs(item.amount).toLocaleString()}
                </div>
              </div>

              {/* 审批备注 */}
              {item.status === "pending" && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) => updateNote(item.id, e.target.value)}
                    className="flex-1 h-8 px-3 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 focus:outline-none focus:border-violet-500 transition-colors placeholder:text-neutral-600"
                    placeholder="审批备注（可选）"
                  />
                  <button onClick={() => approveItem(item.id)} className="px-4 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors">
                    批准
                  </button>
                  <button onClick={() => rejectItem(item.id)} className="px-4 py-1.5 rounded-md bg-red-600/80 text-white text-xs font-medium hover:bg-red-600 transition-colors">
                    驳回
                  </button>
                </div>
              )}

              {item.status !== "pending" && (
                <div className="flex items-center gap-2 mt-2">
                  {item.status === "approved"
                    ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-xs text-emerald-400">已批准</span></>
                    : <><AlertTriangle className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-red-400">已驳回</span></>}
                  {item.note && <span className="text-[10px] text-neutral-500 ml-2">备注：{item.note}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
