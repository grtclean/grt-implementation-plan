/**
 * SandboxOverview — GRT 工业 OS | 全局沙盘管理中心 (Sandbox Command Center)
 *
 * 12 大核心沙盘 · Value Stream 三层泳道布局
 * 暗黑工业科技风 · SVG 动态数据流连线 · 悬停数字主线高亮
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Calendar, Wallet, Award, FolderKanban, FileSpreadsheet,
  Cog, Zap, ClipboardCheck, Factory, Brain, Tv,
  ArrowRight, Settings, DollarSign, Star, Monitor,
  Activity, Users, Target, Shield,
  ArrowDownToLine, ArrowUpFromLine, Wrench, Upload, Mail,
  MessageSquare, KanbanSquare, BookOpen, Cloud, Database, NotebookPen,
  Plug, Keyboard, Bot, Rocket, Gauge, Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Button } from "@/components/ui/button";
import SandboxScenarioLauncher from "./SandboxScenarioLauncher";
import { getSandboxIOConfig, M365_SERVICE_LABELS, type M365Service } from "./sandboxIOConfig";

// ═══════════════════════════════════════════════════════════
// Types & Data
// ═══════════════════════════════════════════════════════════

interface SandboxCard {
  id: string;
  num: number;
  name: string;
  nameEn: string;
  icon: LucideIcon;
  path: string;
  accent: string;       // tailwind color key (cyan, amber, etc.)
  accentHex: string;    // for SVG glow
  status: "active" | "beta" | "planned";
  desc?: string;
  lane: 1 | 2 | 3;
  /** IDs in the "digital thread" highlight group for ⑫ hover */
  inDigitalThread?: boolean;
}

const SANDBOXES: SandboxCard[] = [
  // ── Lane 1: Strategy & R&D ──
  { id: "annual-planning", num: 1, name: "年度规划与预算", nameEn: "Annual Planning", icon: Calendar, path: "/sandbox/annual-planning", accent: "blue", accentHex: "#3B82F6", status: "beta", lane: 1, desc: "战略预算 · 资源配置 · 目标分解" },
  { id: "project-lifecycle", num: 5, name: "项目 M0-M12 生命周期", nameEn: "Project Lifecycle", icon: FolderKanban, path: "/sandbox/project-lifecycle", accent: "teal", accentHex: "#14B8A6", status: "beta", lane: 1, desc: "门径管控 · 里程碑 · 资源与风险" },
  { id: "quoting-bom", num: 6, name: "智能报价与 BOM 梳理", nameEn: "Quoting & BOM", icon: FileSpreadsheet, path: "/sandbox/quoting-bom", accent: "emerald", accentHex: "#10B981", status: "beta", lane: 1, desc: "美利信 10% 降本核算处 · 成本穿透", inDigitalThread: true },
  { id: "mech-elec-standards", num: 7, name: "机械与电气标准治理", nameEn: "Mech & Elec Standards", icon: Cog, path: "/sandbox/mechanical-standards", accent: "violet", accentHex: "#8B5CF6", status: "beta", lane: 1, desc: "研发图纸 · 配置基线 · ECO 工程变更", inDigitalThread: true },

  // ── Lane 2: Manufacturing Twin ──
  { id: "production-scheduling", num: 11, name: "生产排产控制台", nameEn: "Production Scheduling", icon: Factory, path: "/sandbox/production-scheduling", accent: "sky", accentHex: "#0EA5E9", status: "beta", lane: 2, desc: "智慧排产 · BOM 工时分解 · 资源排程" },
  { id: "ai-process-twin", num: 12, name: "AI 工艺编排与孪生沙盘", nameEn: "AI Process Orchestration & Digital Twin", icon: Brain, path: "/sandbox/ai-process-twin", accent: "amber", accentHex: "#F59E0B", status: "active", lane: 2, desc: "杰瑞德工业大脑。融合 FMEA 历史雷区，Agent 一键切片生成防呆 SOP。", inDigitalThread: true },
  { id: "cost-labor", num: 8, name: "成本动态汇总与报工追踪", nameEn: "Cost Rollup & Labor", icon: DollarSign, path: "/sandbox/cost-labor", accent: "rose", accentHex: "#F43F5E", status: "beta", lane: 2, desc: "分类工时 · 项目成本核算 · 报工审批", inDigitalThread: true },

  // ── Lane 3: Resources & Ecosystem ──
  { id: "payroll-attendance", num: 2, name: "薪酬与打卡异常", nameEn: "Payroll & Attendance", icon: Wallet, path: "/sandbox/payroll-attendance", accent: "orange", accentHex: "#F97316", status: "active", lane: 3, desc: "对接车间视觉报工 · 三档绩效工资", inDigitalThread: true },
  { id: "performance-points", num: 3, name: "绩效与积分奖惩", nameEn: "Performance & Points", icon: Award, path: "/sandbox/performance-points", accent: "pink", accentHex: "#EC4899", status: "beta", lane: 3, desc: "4D 评分 · 积分账户 · 红蓝对抗" },
  { id: "vip-strategic", num: 9, name: "美利信 VIP 专属战略舱", nameEn: "VIP Strategic Dashboard", icon: Star, path: "/customer-portal/vip-dashboard", accent: "yellow", accentHex: "#EAB308", status: "active", lane: 3, desc: "投产即稳产 · 10% 降本 · 客户信任构建" },
  { id: "acceptance-tracking", num: 10, name: "验收追踪与满意度", nameEn: "Acceptance & Satisfaction", icon: ClipboardCheck, path: "/sandbox/acceptance-tracking", accent: "purple", accentHex: "#A855F7", status: "beta", lane: 3, desc: "FAT/SAT 验收 · 客户满意度闭环" },
];

const LANE_META: Record<number, { label: string; labelEn: string; gradient: string; borderColor: string }> = {
  1: { label: "顶层战略与项目源头", labelEn: "Strategy & R&D", gradient: "from-blue-500/5 via-transparent to-transparent", borderColor: "border-blue-500/20" },
  2: { label: "核心孪生制造中枢", labelEn: "Manufacturing Twin", gradient: "from-amber-500/8 via-transparent to-transparent", borderColor: "border-amber-500/30" },
  3: { label: "组织底座与生态反哺", labelEn: "Resources & Ecosystem", gradient: "from-emerald-500/5 via-transparent to-transparent", borderColor: "border-emerald-500/20" },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500 shadow-green-500/50",
  beta: "bg-yellow-400 shadow-yellow-400/50",
  planned: "bg-red-400 shadow-red-400/50",
};

// ═══════════════════════════════════════════════════════════
// Keyframe styles (injected once)
// ═══════════════════════════════════════════════════════════

const STYLE_ID = "sandbox-overview-keyframes";
const KEYFRAMES = `
@keyframes goldPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(245,158,11,0.3), 0 0 40px rgba(245,158,11,0.1), inset 0 0 15px rgba(245,158,11,0.05); }
  50% { box-shadow: 0 0 25px rgba(245,158,11,0.5), 0 0 60px rgba(245,158,11,0.2), inset 0 0 25px rgba(245,158,11,0.1); }
}
@keyframes dataFlowDown {
  0% { stroke-dashoffset: 16; }
  100% { stroke-dashoffset: 0; }
}
@keyframes dataFlowUp {
  0% { stroke-dashoffset: -16; }
  100% { stroke-dashoffset: 0; }
}
@keyframes scanLine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes tvPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
`;

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

/** Single sandbox card */
function SandboxCardUI({
  card, dimmed, highlighted, isInitialized, onHover, onLeave, onNavigate,
}: {
  card: SandboxCard;
  dimmed: boolean;
  highlighted: boolean;
  isInitialized: boolean;
  onHover: () => void;
  onLeave: () => void;
  onNavigate: (path: string) => void;
}) {
  const Icon = card.icon;
  const isCPosition = card.num === 12;

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "group relative flex flex-col rounded-2xl border-2 p-5 transition-all duration-500 cursor-default",
        isCPosition
          ? "bg-gradient-to-br from-amber-500/15 via-[#0d1117] to-amber-900/15 border-amber-400/50 min-w-[300px] shadow-[0_0_40px_rgba(245,158,11,0.15)]"
          : "bg-[#0a0e17] border-gray-600/60 hover:border-gray-400 min-w-[220px] shadow-lg shadow-black/50",
        dimmed && "opacity-20 scale-[0.97] blur-[0.5px]",
        highlighted && !isCPosition && "!opacity-100 !scale-100 !blur-0 ring-1 ring-cyan-500/40 border-cyan-500/30",
        isCPosition && "z-10",
      )}
      style={isCPosition ? { animation: "goldPulse 3s ease-in-out infinite" } : undefined}
    >
      {/* Scan line effect for C-position */}
      {isCPosition && (
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent"
            style={{ animation: "scanLine 4s linear infinite" }}
          />
        </div>
      )}

      {/* Top: Number badge + Status — venue-grade */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl border-2 text-sm font-black font-mono",
          isCPosition
            ? "bg-amber-500/25 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            : `bg-${card.accent}-500/15 border-${card.accent}-500/40 text-${card.accent}-300`,
        )} style={!isCPosition ? { backgroundColor: `${card.accentHex}20`, borderColor: `${card.accentHex}50`, color: card.accentHex, boxShadow: `0 0 12px ${card.accentHex}30` } : undefined}>
          {card.num < 10 ? `0${card.num}` : card.num}
        </div>
        <div className="flex items-center gap-2">
          {isInitialized && (
            <span className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">已注入</span>
          )}
          <span className={cn("h-3 w-3 rounded-full shadow-md", STATUS_DOT[card.status])} />
          <span className="text-xs text-gray-300 uppercase tracking-wider font-medium">{card.status}</span>
        </div>
      </div>

      {/* Icon + Name — venue-grade sizing */}
      <div className="flex items-center gap-3 mb-1.5 relative z-10">
        <Icon className={cn("h-6 w-6 shrink-0", isCPosition ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-gray-300 group-hover:text-white")} style={!isCPosition ? { color: highlighted ? card.accentHex : undefined } : undefined} />
        <h3 className={cn("text-lg font-black leading-snug", isCPosition ? "text-amber-100" : "text-white")}>
          {isCPosition && <span className="text-amber-300 mr-1">{"\u{1F31F}"}</span>}
          {card.name}
        </h3>
      </div>
      <p className="text-sm text-gray-300 mb-2 relative z-10 tracking-wide">{card.nameEn}</p>

      {/* Description */}
      {card.desc && (
        <p className={cn(
          "text-sm leading-relaxed mb-3 relative z-10",
          isCPosition ? "text-amber-200/80" : "text-gray-300",
        )}>
          {card.desc}
        </p>
      )}

      {/* ── Mini 3×3 九宫格 Grid Preview ── */}
      {(() => {
        const ioConfig = getSandboxIOConfig(card.id);
        if (!ioConfig) return null;
        const m365Icons: Record<M365Service, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
          outlook: Mail, teams: MessageSquare, planner: KanbanSquare,
          onenote: BookOpen, onedrive: Cloud, sharepoint: Database,
        };
        const uniqueServices = Array.from(new Set(ioConfig.m365.map(m => m.service)));
        type MiniCell = { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string; color: string };
        const miniCells: MiniCell[] = [
          { icon: Plug, label: "I/O", value: `${ioConfig.io.inputs.length}↓${ioConfig.io.outputs.length}↑`, color: "#3B82F6" },
          { icon: Mail, label: "M365", value: `${uniqueServices.length}`, color: "#0078D4" },
          { icon: Wrench, label: "工具", value: `${ioConfig.tools.length}`, color: "#F59E0B" },
          { icon: Upload, label: "导入", value: `${ioConfig.fileImports.length}`, color: "#22C55E" },
          { icon: Keyboard, label: "快捷", value: `${ioConfig.shortcuts.length}`, color: "#8B5CF6" },
          { icon: NotebookPen, label: "笔记", value: "ON", color: "#A855F7" },
          { icon: Bot, label: "AI", value: "ON", color: "#EC4899" },
          { icon: Rocket, label: "场景", value: isInitialized ? "✓" : "—", color: isInitialized ? "#10B981" : "#6B7280" },
          { icon: Gauge, label: "舱", value: "9格", color: card.accentHex },
        ];
        return (
          <div className="grid grid-cols-3 gap-[3px] mb-2 relative z-10">
            {miniCells.map((cell, i) => {
              const CellIcon = cell.icon;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-md px-1 py-1 border transition-colors hover:bg-gray-800/60"
                  style={{ borderColor: `${cell.color}18`, backgroundColor: `${cell.color}06` }}
                >
                  <CellIcon className="h-2.5 w-2.5 mb-0.5" style={{ color: cell.color }} />
                  <span className="text-[8px] font-bold font-mono leading-none" style={{ color: cell.color }}>{cell.value}</span>
                  <span className="text-[7px] text-gray-500 leading-none mt-0.5">{cell.label}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Enter button */}
      <div className="mt-auto pt-2 relative z-10">
        <button
          onClick={() => onNavigate(card.path)}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-all",
            isCPosition
              ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
              : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-800/50",
          )}
        >
          <Settings className="h-3 w-3" />
          进入沙盘
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** TV Terminal node between lane 2 and 3 */
function TvTerminalNode({ highlighted }: { highlighted: boolean }) {
  return (
    <div className={cn(
      "relative flex items-center gap-4 mx-auto px-6 py-4 rounded-2xl border-2 transition-all duration-500",
      highlighted
        ? "bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
        : "bg-[#080b12] border-gray-600/50",
    )}>
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all",
        highlighted
          ? "bg-cyan-500/25 border-cyan-400/50"
          : "bg-gray-800 border-gray-600",
      )}>
        <Tv className={cn("h-7 w-7", highlighted ? "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "text-gray-400")} style={highlighted ? { animation: "tvPulse 2s ease-in-out infinite" } : undefined} />
      </div>
      <div>
        <p className={cn("text-base font-bold", highlighted ? "text-cyan-200" : "text-gray-300")}>
          {"\u{1F4FA}"} 车间 A3 工位局域网防呆大屏
        </p>
        <p className={cn("text-sm", highlighted ? "text-cyan-300/80" : "text-gray-400")}>
          {highlighted ? "正在执行指令..." : "接收 AI 工艺切片 · 强制防呆显示"}
        </p>
      </div>
      {highlighted && (
        <div className="absolute -right-1.5 -top-1.5 w-4 h-4 rounded-full bg-cyan-400 animate-ping shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
      )}
    </div>
  );
}

/** SVG flow connector lines */
function FlowConnectors({ hoveringTwin }: { hoveringTwin: boolean }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Lane 1 → Lane 2 arrow (blue dashed) */}
        <marker id="arrowDown" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#3B82F6" opacity="0.5" />
        </marker>
        {/* Lane 2 → TV (cyan thick) */}
        <marker id="arrowCyan" markerWidth="10" markerHeight="8" refX="5" refY="4" orient="auto">
          <path d="M0,0 L10,4 L0,8 Z" fill="#06B6D4" opacity="0.8" />
        </marker>
        {/* TV → Lane 3 feedback (green) */}
        <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#10B981" opacity="0.6" />
        </marker>
        {/* Glow filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Lane 1 → Lane 2 : vertical dashed arrows */}
      {[
        { x: "18%", label: "战略→排产" },
        { x: "40%", label: "项目→制造" },
        { x: "62%", label: "BOM→工艺" },
        { x: "82%", label: "图纸→基线" },
      ].map((line, i) => (
        <g key={i}>
          <line
            x1={line.x} y1="24.5%" x2={line.x} y2="32.5%"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeDasharray="8,5"
            opacity={hoveringTwin && (i === 2 || i === 3) ? 1 : 0.5}
            markerEnd="url(#arrowDown)"
            style={{ animation: "dataFlowDown 1s linear infinite" }}
          />
        </g>
      ))}

      {/* Lane 2 ⑫ → TV: thick cyan beam */}
      <line
        x1="50%" y1="58%" x2="50%" y2="65%"
        stroke="#06B6D4"
        strokeWidth={hoveringTwin ? 4 : 2}
        strokeDasharray="8,4"
        opacity={hoveringTwin ? 0.9 : 0.3}
        markerEnd="url(#arrowCyan)"
        filter={hoveringTwin ? "url(#glow)" : undefined}
        style={{ animation: "dataFlowDown 0.8s linear infinite", transition: "all 0.5s" }}
      />

      {/* TV → Lane 3: green feedback lines to ⑧ cost and ② payroll */}
      {[
        { x1: "42%", y1: "72%", x2: "30%", y2: "77%", label: "→ 成本汇总" },
        { x1: "58%", y1: "72%", x2: "70%", y2: "77%", label: "→ 薪酬打卡" },
      ].map((line, i) => (
        <g key={`fb-${i}`}>
          <line
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke="#10B981"
            strokeWidth={hoveringTwin ? 2.5 : 1.5}
            strokeDasharray="6,4"
            opacity={hoveringTwin ? 0.8 : 0.2}
            markerEnd="url(#arrowGreen)"
            filter={hoveringTwin ? "url(#glow)" : undefined}
            style={{ animation: "dataFlowUp 1.2s linear infinite", transition: "all 0.5s" }}
          />
          {hoveringTwin && (
            <text
              x={i === 0 ? "32%" : "64%"} y="74.5%"
              fill="#10B981"
              fontSize="9"
              opacity="0.7"
              textAnchor="middle"
            >
              工时与良率自动回传计算
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function SandboxOverview() {
  const [, navigate] = useLocation();
  const { level } = useUserProfile();
  const [hoveringTwin, setHoveringTwin] = useState(false);

  // Scenario initialization status
  const { data: scenarioStatus } = trpc.scenarioInit.getStatus.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const initializedSet = new Set(scenarioStatus?.initialized ?? []);

  // Inject keyframes once
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
  }, []);

  const lane1 = SANDBOXES.filter(s => s.lane === 1);
  const lane2 = SANDBOXES.filter(s => s.lane === 2);
  const lane3 = SANDBOXES.filter(s => s.lane === 3);

  const handleHover = useCallback((card: SandboxCard) => {
    if (card.num === 12) setHoveringTwin(true);
  }, []);
  const handleLeave = useCallback((card: SandboxCard) => {
    if (card.num === 12) setHoveringTwin(false);
  }, []);

  const renderLane = (laneNum: 1 | 2 | 3, cards: SandboxCard[]) => {
    const meta = LANE_META[laneNum];
    const isCenterLane = laneNum === 2;
    return (
      <div className={cn(
        "relative rounded-2xl border-2 p-6 transition-all duration-500",
        `bg-gradient-to-r ${meta.gradient}`,
        meta.borderColor,
        isCenterLane && "py-8",
      )}>
        {/* Lane header — venue-grade */}
        <div className="flex items-center gap-4 mb-5">
          <div className={cn(
            "px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-widest border-2",
            isCenterLane
              ? "bg-amber-500/15 border-amber-400/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              : laneNum === 1
                ? "bg-blue-500/15 border-blue-400/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                : "bg-emerald-500/15 border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
          )}>
            泳道 {laneNum === 1 ? "I" : laneNum === 2 ? "II" : "III"}
          </div>
          <div>
            <h2 className={cn(
              "text-xl font-black",
              isCenterLane ? "text-amber-100" : "text-white",
            )}>
              {meta.label}
            </h2>
            <p className="text-sm text-gray-300">{meta.labelEn}</p>
          </div>
          {isCenterLane && (
            <div className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border-2 border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Activity className="h-4 w-4 text-amber-300" />
              <span className="text-sm text-amber-300 font-bold">C 位中枢 · 极度高亮</span>
            </div>
          )}
          {laneNum === 1 && (
            <div className="ml-auto flex items-center gap-1.5 text-sm text-blue-300/80 font-medium">
              <span>数据流</span>
              <span className="text-blue-300 text-lg">\u2193</span>
              <span>向下穿透至制造中枢</span>
            </div>
          )}
          {laneNum === 3 && (
            <div className="ml-auto flex items-center gap-1.5 text-sm text-emerald-300/80 font-medium">
              <span className="text-emerald-300 text-lg">\u2191</span>
              <span>车间实时数据反哺</span>
            </div>
          )}
        </div>

        {/* Cards grid */}
        <div className={cn(
          "flex gap-4",
          isCenterLane ? "items-stretch justify-center" : "items-stretch",
        )}>
          {cards.map(card => (
            <div key={card.id} className={cn("flex-1", card.num === 12 && "flex-[1.4]")}>
              <SandboxCardUI
                card={card}
                dimmed={hoveringTwin && !card.inDigitalThread && card.num !== 12}
                highlighted={hoveringTwin && !!card.inDigitalThread}
                isInitialized={initializedSet.has(card.id)}
                onHover={() => handleHover(card)}
                onLeave={() => handleLeave(card)}
                onNavigate={navigate}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-black text-gray-100">
      <div className="relative max-w-[1600px] mx-auto px-8 py-10">

        {/* ── Page Header — venue-grade ── */}
        <div className="mb-10">
          <div className="flex items-center gap-5 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)]">
              <Shield className="h-8 w-8 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">
                <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">GRT 工业 OS</span>
                <span className="text-gray-500 mx-3">|</span>
                <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                  全局沙盘管理中心
                </span>
              </h1>
              <p className="text-base text-gray-300 mt-1 tracking-wide">
                Sandbox Command Center — 12 Core Sandboxes · Value Stream Topology · Data Flows In Real-Time
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs"
                onClick={() => navigate("/system-topology")}
              >
                <Network className="h-3.5 w-3.5" />
                系统脉络图
                <ArrowRight className="h-3 w-3" />
              </Button>
              <div className="text-right">
                <p className="text-[10px] text-gray-600">杰瑞德自动化 Jieruide Automation</p>
                <p className="text-[10px] text-gray-700">数据同源 · 万物互联</p>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 text-[10px] flex-wrap">
            {[
              { label: "核心沙盘", value: "12", color: "text-cyan-400" },
              { label: "Active", value: SANDBOXES.filter(s => s.status === "active").length, color: "text-green-400" },
              { label: "Beta", value: SANDBOXES.filter(s => s.status === "beta").length, color: "text-yellow-400" },
              { label: "已注入", value: `${initializedSet.size}/13`, color: "text-emerald-400" },
              { label: "事件总线", value: "26 events", color: "text-purple-400" },
              { label: "AI Agents", value: "13", color: "text-amber-400" },
              { label: "M365集成", value: "6 services", color: "text-blue-400" },
              { label: "工具", value: "52+", color: "text-amber-300" },
              { label: "快捷键", value: "39+", color: "text-violet-400" },
              { label: "文件导入", value: "26+", color: "text-green-400" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-gray-600">{stat.label}:</span>
                <span className={cn("font-bold font-mono", stat.color)}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scenario Launcher ── */}
        <SandboxScenarioLauncher />

        {/* ── Value Stream Swim Lanes ── */}
        <div className="relative space-y-3">

          {/* SVG Connectors layer (behind lanes) */}
          <FlowConnectors hoveringTwin={hoveringTwin} />

          {/* Lane I: Strategy & R&D */}
          <div className="relative z-10">
            {renderLane(1, lane1)}
          </div>

          {/* Down-flow indicator between Lane 1 and 2 */}
          <div className="flex items-center justify-center gap-2 py-1 relative z-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/20">
              <span className="text-[10px] text-blue-400 font-mono">\u2193\u2193\u2193</span>
              <span className="text-[9px] text-gray-500">BOM / 图纸 / 编码基线 穿透下沉</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          </div>

          {/* Lane II: Manufacturing Twin (C-position) */}
          <div className="relative z-10">
            {renderLane(2, lane2)}
          </div>

          {/* Down-flow: ⑫ → TV Terminal */}
          <div className="flex items-center justify-center gap-2 py-1 relative z-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            <div className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full border transition-all duration-500",
              hoveringTwin
                ? "bg-cyan-500/10 border-cyan-500/30"
                : "bg-cyan-500/5 border-gray-700/30",
            )}>
              <span className={cn("text-[10px] font-mono", hoveringTwin ? "text-cyan-400" : "text-gray-500")}>
                \u2B07\uFE0F
              </span>
              <span className={cn("text-[9px]", hoveringTwin ? "text-cyan-400" : "text-gray-600")}>
                AI 工艺切片指令 · SOP 防呆数据包 推送至车间终端
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </div>

          {/* TV Terminal Node */}
          <div className="relative z-10 py-2">
            <TvTerminalNode highlighted={hoveringTwin} />
          </div>

          {/* Up-flow: TV → Lane 3 feedback */}
          <div className="flex items-center justify-center gap-2 py-1 relative z-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <div className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full border transition-all duration-500",
              hoveringTwin
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-emerald-500/5 border-gray-700/30",
            )}>
              <span className={cn("text-[10px] font-mono", hoveringTwin ? "text-emerald-400" : "text-gray-500")}>
                \u2B06\uFE0F
              </span>
              <span className={cn("text-[9px]", hoveringTwin ? "text-emerald-400" : "text-gray-600")}>
                工时与良率自动回传计算 · 视觉报工数据反哺
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </div>

          {/* Lane III: Resources & Ecosystem */}
          <div className="relative z-10">
            {renderLane(3, lane3)}
          </div>
        </div>

        {/* ── Digital Thread Legend ── */}
        <div className="mt-8 rounded-xl border border-gray-800 bg-[#0a0d14] p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-gray-300">数字主线 Digital Thread</span>
              <span className="text-[10px] text-gray-600">(悬停 ⑫ 触发高亮)</span>
            </div>
            <div className="h-4 w-px bg-gray-800" />
            {[
              { label: "⑦ 研发图纸", color: "bg-violet-500" },
              { label: "⑥ BOM 降本", color: "bg-emerald-500" },
              { label: "\u{1F31F} ⑫ 工艺大脑排雷", color: "bg-amber-500" },
              { label: "\u{1F4FA} 车间 TV 防呆", color: "bg-cyan-500" },
              { label: "⑧ 财务成本核算", color: "bg-rose-500" },
              { label: "② 薪酬回传", color: "bg-orange-500" },
            ].map((node, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", node.color)} />
                  <span className="text-[10px] text-gray-400">{node.label}</span>
                </div>
                {i < 5 && <span className="text-[10px] text-gray-700">\u2192</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-700">
            GRT Industrial OS v5.1 \u00B7 12 Sandboxes \u00B7 26 Events \u00B7 13 AI Agents \u00B7 6 M365 Services \u00B7 52+ Tools \u00B7 I/O Data Flow Topology
          </p>
        </div>
      </div>
    </div>
  );
}
