/**
 * GRTS3DemoPortal — GRT System 3.0 客户演示门户
 *
 * Standalone dark sci-fi themed demo page for visiting customers.
 * Role-based content: CEO / CTO / Commercial / Quality / Production.
 * Route: /grts3-demo/:role (or /grts3-demo for role selector)
 */
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRoute, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Cpu,
  Briefcase,
  Shield,
  Factory,
  ChevronRight,
  ArrowUp,
  ArrowLeft,
  LayoutDashboard,
  Home,
  Target,
  BarChart3,
  Calendar,
  Award,
  Brain,
  Layers,
  Workflow,
  Bot,
  Mic,
  Star,
  Users,
  ShoppingCart,
  Gift,
  FileText,
  Headphones,
  ClipboardCheck,
  Eye,
  AlertTriangle,
  TrendingUp,
  Cog,
  Wrench,
  Package,
  type LucideIcon,
} from "lucide-react";

// ── Types ──

type DemoRole = "ceo" | "cto" | "commercial" | "quality" | "production";

interface RoleCard {
  role: DemoRole;
  title: string;
  icon: LucideIcon;
  color: string;
  accent: string;
  border: string;
  description: string;
}

interface SectionDef {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
  link?: { label: string; href: string };
  extra?: ReactNode;
}

// ── Constants ──

const ROLE_CARDS: RoleCard[] = [
  {
    role: "ceo",
    title: "CEO/董事长",
    icon: Crown,
    color: "text-amber-400",
    accent: "from-amber-500/20 to-amber-900/10",
    border: "border-amber-500/30 hover:border-amber-400/60",
    description: "战略OKR · 经营分析 · 智能决策",
  },
  {
    role: "cto",
    title: "CTO/技术总监",
    icon: Cpu,
    color: "text-cyan-400",
    accent: "from-cyan-500/20 to-cyan-900/10",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
    description: "EPLAN集成 · M0-M12 · 多沙盘 · 数字孪生",
  },
  {
    role: "commercial",
    title: "商务/销售",
    icon: Briefcase,
    color: "text-green-400",
    accent: "from-green-500/20 to-green-900/10",
    border: "border-green-500/30 hover:border-green-400/60",
    description: "Showcase展厅 · CRM · 客户积分 · 报价管理",
  },
  {
    role: "quality",
    title: "质量总监",
    icon: Shield,
    color: "text-purple-400",
    accent: "from-purple-500/20 to-purple-900/10",
    border: "border-purple-500/30 hover:border-purple-400/60",
    description: "IATF 16949 · VDA 19.1 · 8D · 质量闭环",
  },
  {
    role: "production",
    title: "生产/运营",
    icon: Factory,
    color: "text-orange-400",
    accent: "from-orange-500/20 to-orange-900/10",
    border: "border-orange-500/30 hover:border-orange-400/60",
    description: "智能排产 · 设备管理 · 工序管控 · MES集成",
  },
];

const ROLE_META: Record<DemoRole, { header: string; accent: string; badgeClass: string }> = {
  ceo: { header: "GRTS3.0 — CEO战略驾驶舱", accent: "text-amber-400", badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  cto: { header: "GRTS3.0 — CTO技术驾驶舱", accent: "text-cyan-400", badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  commercial: { header: "GRTS3.0 — 商务销售驾驶舱", accent: "text-green-400", badgeClass: "bg-green-500/20 text-green-300 border-green-500/40" },
  quality: { header: "GRTS3.0 — 质量管理驾驶舱", accent: "text-purple-400", badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  production: { header: "GRTS3.0 — 生产运营驾驶舱", accent: "text-orange-400", badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
};

// ── Section Data by Role ──

function getCeoSections(): SectionDef[] {
  return [
    {
      icon: Target,
      title: "年度OKR战略分解",
      description: "公司OKR → 事业部OKR → 部门OKR → 个人OKR，四级战略穿透，实时进度追踪。",
      extra: (
        <div className="mt-4 space-y-3">
          {[
            { obj: "O1: 年营收突破3亿", progress: 78 },
            { obj: "O2: 客户满意度≥95分", progress: 92 },
            { obj: "O3: 新能源业务占比20%", progress: 65 },
          ].map((o) => (
            <div key={o.obj}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-300">{o.obj}</span>
                <span className="text-amber-400">{o.progress}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all" style={{ width: `${o.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      ),
      link: { label: "进入OKR系统 →", href: "/strategy/okr-matrix" },
    },
    {
      icon: BarChart3,
      title: "智能经营分析",
      description: "AI自动生成月度经营报告，识别经营风险并预警。",
      extra: (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { label: "年度营收", value: "¥2.8亿", sub: "目标¥3亿" },
            { label: "订单交付率", value: "94%", sub: "环比+2.1%" },
            { label: "客户满意度", value: "92分", sub: "行业Top10%" },
            { label: "人均效能", value: "¥156万", sub: "同比+18%" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
              <div className="text-xs text-neutral-500">{k.label}</div>
              <div className="text-xl font-bold text-amber-300 mt-1">{k.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      ),
      link: { label: "经营分析 →", href: "/ceo/strategy-2026" },
    },
    {
      icon: Calendar,
      title: "管理节奏闭环",
      description: "52周全年373场会议自动排程，Outlook日历同步，AI会议纪要。",
      features: ["战略分解", "会议计划", "会议执行", "行动跟踪", "效能复盘"],
      link: { label: "会议日历 →", href: "/meeting-calendar" },
    },
    {
      icon: Award,
      title: "智能绩效红黑榜",
      description: "四维评分体系（执行力/学习力/协作力/创新力），S/A/B/C四档绩效等级，AI自动识别高潜人才与待改善员工。",
      link: { label: "绩效系统 →", href: "/employee-performance" },
    },
    {
      icon: TrendingUp,
      title: "BI商业智能",
      description: "多维数据穿透分析，AI自动生成BI报告，支持自定义看板与报表订阅。",
      link: { label: "BI中心 →", href: "/bi-report" },
    },
  ];
}

function getCtoSections(): SectionDef[] {
  return [
    {
      icon: Layers,
      title: "EPLAN电气设计集成",
      description: "EPLAN P8图纸自动导入 → BOM自动提取 → PDM版本管理 → 图纸变更ECR/ECO流程。",
      extra: (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {["EPLAN导入", "BOM提取", "PDM管理", "ECR/ECO"].map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">{s}</span>
              {i < 3 && <ChevronRight className="w-3 h-3 text-cyan-500/50" />}
            </span>
          ))}
        </div>
      ),
      link: { label: "PDM系统 →", href: "/pdm" },
    },
    {
      icon: Workflow,
      title: "M0-M12项目全生命周期",
      description: "13个里程碑节点覆盖项目全生命周期，从询价到质保期结束。",
      extra: (
        <div className="flex flex-wrap gap-2 mt-4">
          {["M0询价", "M1评审", "M2合同", "M3设计", "M4采购", "M5试产", "M6验证", "M7量产", "M8交付", "M9回款", "M10结项", "M11归档", "M12质保"].map((m) => (
            <span key={m} className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]">{m}</span>
          ))}
        </div>
      ),
      link: { label: "项目管理 →", href: "/projects" },
    },
    {
      icon: Brain,
      title: "多沙盘协同",
      description: "11个业务沙盘同时运行，模拟不同场景。",
      features: ["报价BOM沙盘", "供应链沙盘", "工艺路线沙盘", "成本沙盘", "产能沙盘"],
      link: { label: "沙盘总览 →", href: "/sandbox" },
    },
    {
      icon: Bot,
      title: "数字孪生 + AI Agent",
      description: "25个AI Agent协同工作，L1-L4安全沙箱，覆盖采购、质量、财务、HR等领域。",
      features: ["L1-只读Agent", "L2-写入Agent", "L3-审批Agent", "L4-决策Agent"],
      link: { label: "Agent控制塔 →", href: "/admin/agent-management" },
    },
    {
      icon: Mic,
      title: "智能会议系统",
      description: "AI实时转录 → 议题追踪 → 行动项自动分配 → 绩效联动。",
      link: { label: "智慧会议 →", href: "/smart-meeting" },
    },
  ];
}

function getCommercialSections(): SectionDef[] {
  return [
    {
      icon: Star,
      title: "数字展厅Showcase",
      description: "一键生成客户专属展厅，token安全访问，行业定制。",
      features: ["技术路线图", "专利墙", "成功案例", "ESG报告", "设备健康监控"],
      link: { label: "展示中枢 →", href: "/showcase-hub" },
    },
    {
      icon: Users,
      title: "CRM客户管理",
      description: "M0-M3漏斗看板，客户拜访记录，商机追踪，AI赢率预测。",
      link: { label: "销售教练 →", href: "/sales-coach" },
    },
    {
      icon: Gift,
      title: "客户积分激励",
      description: "Bronze→Silver→Gold→Platinum→Diamond 5级会员体系，12种积分规则，推荐奖励机制。",
      link: { label: "积分门户 →", href: "/loyalty/demo" },
    },
    {
      icon: FileText,
      title: "智能报价",
      description: "AI辅助报价，BOM自动提取，竞品对标分析，历史报价智能推荐。",
      link: { label: "报价管理 →", href: "/quotation-management" },
    },
    {
      icon: Headphones,
      title: "售后服务",
      description: "设备健康监控，在线工单，SLA仪表板，客户回访自动化。",
      link: { label: "售后工作台 →", href: "/after-sales-workbench" },
    },
  ];
}

function getQualitySections(): SectionDef[] {
  return [
    {
      icon: ClipboardCheck,
      title: "IATF 16949合规",
      description: "从设计DFMEA到过程PFMEA，全链路质量控制，审核计划自动生成，NC闭环追踪。",
      link: { label: "质量管理 →", href: "/qc-management" },
    },
    {
      icon: Eye,
      title: "VDA 19.1清洁度",
      description: "AI视觉在线检测，替代人工Millipore测试，自动分级报告生成，趋势分析与预警。",
      link: { label: "清洁度报告 →", href: "/qc-management" },
    },
    {
      icon: AlertTriangle,
      title: "8D问题解决",
      description: "AI辅助根因分析，纠正措施闭环跟踪，D0-D8全流程数字化，自动关联相似问题。",
      link: { label: "NCR管理 →", href: "/qc-management" },
    },
    {
      icon: ShoppingCart,
      title: "供应商质量",
      description: "IQC智能评分，供应商风险雷达，来料检验自动化，供应商绩效排名。",
      link: { label: "供应商风险 →", href: "/supply-chain/risk-radar" },
    },
  ];
}

function getProductionSections(): SectionDef[] {
  return [
    {
      icon: Cog,
      title: "智能排产",
      description: "AI辅助生产计划，产能负荷分析，订单优先级智能排序，瓶颈工序识别。",
      link: { label: "生产管理 →", href: "/production" },
    },
    {
      icon: Workflow,
      title: "工序管控",
      description: "工艺路线管理，SOP数字化，工时统计，工序质量检验联动。",
      link: { label: "工序管理 →", href: "/process-management" },
    },
    {
      icon: Wrench,
      title: "设备管理",
      description: "设备OEE监控，预防性维护计划，备件管理，设备生命周期追踪。",
      link: { label: "设备管理 →", href: "/production" },
    },
    {
      icon: Package,
      title: "仓储物流",
      description: "条码管理，出入库扫码，库存预警，安全库存智能计算。",
      link: { label: "仓库管理 →", href: "/warehouse-management" },
    },
  ];
}

function getSections(role: DemoRole): SectionDef[] {
  switch (role) {
    case "ceo": return getCeoSections();
    case "cto": return getCtoSections();
    case "commercial": return getCommercialSections();
    case "quality": return getQualitySections();
    case "production": return getProductionSections();
  }
}

// ── Sub-Components ──

function GlassPanel({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-6 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionCard({ section, accentColor, index }: { section: SectionDef; accentColor: string; index: number }) {
  const Icon = section.icon;
  return (
    <GlassPanel delay={index * 100}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-white/[0.05] ${accentColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-2">{section.title}</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">{section.description}</p>
          {section.features && (
            <div className="flex flex-wrap gap-2 mt-3">
              {section.features.map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-neutral-300 text-xs">{f}</span>
              ))}
            </div>
          )}
          {section.extra}
          {section.link && (
            <a href={section.link.href} className={`inline-flex items-center gap-1 mt-4 text-sm font-medium ${accentColor} hover:underline`}>
              {section.link.label} <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

function BottomNav() {
  const [, navigate] = useLocation();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-neutral-950/90 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-2">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-white transition-colors px-4 py-1">
          <ArrowUp className="w-5 h-5" />
          <span className="text-[10px]">返回顶部</span>
        </button>
        <button onClick={() => navigate("/grts3-demo")} className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-white transition-colors px-4 py-1">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px]">返回</span>
        </button>
        <button onClick={() => navigate("/showcase-hub")} className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-white transition-colors px-4 py-1">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">展示中枢</span>
        </button>
        <button onClick={() => navigate("/")} className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-white transition-colors px-4 py-1">
          <Home className="w-5 h-5" />
          <span className="text-[10px]">主界面</span>
        </button>
      </div>
    </div>
  );
}

// ── Role Selector Screen ──

function RoleSelector() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08)_0%,transparent_60%)] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-lg">G</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">GRT SYSTEM 3.0</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent mb-3">
            GRTS3.0 — 先进制造业数智管理平台
          </h1>
          <p className="text-neutral-500 text-sm">请选择您的角色，体验定制化功能演示</p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.role}
                onClick={() => navigate(`/grts3-demo/${card.role}`)}
                className={`group rounded-2xl border ${card.border} bg-gradient-to-br ${card.accent} backdrop-blur-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20`}
              >
                <Icon className={`w-8 h-8 ${card.color} mb-3`} />
                <h2 className="text-lg font-semibold text-white mb-1">{card.title}</h2>
                <p className="text-sm text-neutral-400">{card.description}</p>
                <div className={`mt-4 flex items-center gap-1 text-xs ${card.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  进入演示 <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-neutral-600 text-xs">
          <p>GRT Group — Advanced Industrial Cleaning &middot; GRTS3.0</p>
        </div>
      </div>
    </div>
  );
}

// ── Role View Screen ──

function RoleView({ role }: { role: DemoRole }) {
  const [, navigate] = useLocation();
  const meta = ROLE_META[role];
  const sections = getSections(role);
  const roleCard = ROLE_CARDS.find((c) => c.role === role)!;

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.06)_0%,transparent_60%)] pointer-events-none" />

      {/* Fixed Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-neutral-950/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <span className="font-semibold text-sm text-white">GRTS3.0</span>
            <Badge variant="outline" className={meta.badgeClass}>
              {roleCard.title}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-white"
            onClick={() => navigate("/grts3-demo")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            切换角色
          </Button>
        </div>
      </header>

      {/* Hero Header */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-12 pb-8">
        <GlassPanel>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl bg-white/[0.05] ${meta.accent}`}>
              <roleCard.icon className="w-10 h-10" />
            </div>
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${meta.accent}`}>{meta.header}</h1>
              <p className="text-neutral-500 text-sm mt-1">{roleCard.description}</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Sections */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 space-y-4">
        {sections.map((section, i) => (
          <SectionCard key={section.title} section={section} accentColor={meta.accent} index={i} />
        ))}
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

// ── Main Component ──

export default function GRTS3DemoPortal() {
  const [matched, params] = useRoute("/grts3-demo/:role");
  const role = matched ? (params.role as string) : null;

  const validRoles: DemoRole[] = ["ceo", "cto", "commercial", "quality", "production"];
  const isValidRole = role && validRoles.includes(role as DemoRole);

  if (isValidRole) {
    return <RoleView role={role as DemoRole} />;
  }

  return <RoleSelector />;
}
