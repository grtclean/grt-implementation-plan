/**
 * SystemTopologyMap — GRT 工业 OS 全系统脉络图与神经网络拓扑
 *
 * Interactive neural-network-style topology showing:
 * - 12 sandbox nodes in 3 value-stream lanes
 * - 26 event-bus edges with animated data flow
 * - Click-to-navigate to each sandbox
 * - Operation guide overlay (场景介入口 + 操作步骤)
 * - Auto-initialization trigger
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Calendar, Wallet, Award, FolderKanban, FileSpreadsheet,
  Cog, ClipboardCheck, Factory, Brain, Star, DollarSign,
  Network, Zap, Play, Pause, ChevronRight, X,
  Rocket, Eye, BookOpen, ArrowRight, Target,
  Shield, Activity, Tv, Info, MapPin, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useToast } from "@/hooks/use-toast";
import type { LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════
// Topology Data Model
// ═══════════════════════════════════════════════════════════

interface TopoNode {
  id: string;
  num: number;
  name: string;
  nameEn: string;
  icon: LucideIcon;
  path: string;
  lane: 1 | 2 | 3;
  color: string;         // hex accent
  /** Grid position within lane (0-based col index) */
  col: number;
  scenarioSteps: string[];
  entryPoint: string;
}

interface TopoEdge {
  id: string;
  from: string;          // node id
  to: string;
  eventType: string;
  label: string;
  color: string;
}

const NODES: TopoNode[] = [
  // Lane 1: Strategy & R&D
  { id: "annual-planning", num: 1, name: "年度规划与预算", nameEn: "Annual Planning", icon: Calendar, path: "/sandbox/annual-planning", lane: 1, color: "#3B82F6", col: 0,
    scenarioSteps: ["1. 选择年度 → 录入KPI", "2. 上传战略文档 → AI解读", "3. 组织结构调整 → 确认", "4. 变更执行追踪"],
    entryPoint: "CTO/总监录入年度战略KPI，触发预算分配" },
  { id: "project-lifecycle", num: 5, name: "项目M0-M12", nameEn: "Project Lifecycle", icon: FolderKanban, path: "/sandbox/project-lifecycle", lane: 1, color: "#14B8A6", col: 1,
    scenarioSteps: ["1. 创建新项目 → 填写基本信息", "2. M0门径评审 → 过门/退回", "3. 各里程碑任务分解", "4. 资源申请 → 自动通知HR"],
    entryPoint: "销售/项目经理创建新项目，启动M0-M12流程" },
  { id: "quoting-bom", num: 6, name: "智能报价与BOM", nameEn: "Quoting & BOM", icon: FileSpreadsheet, path: "/sandbox/quoting-bom", lane: 1, color: "#10B981", col: 2,
    scenarioSteps: ["1. 选择客户 → 配置设备型号", "2. BOM自动拉取 → 成本穿透", "3. 利润率校验 → AI降本建议", "4. 提交审批 → 客户报价单"],
    entryPoint: "销售工程师基于客户需求创建报价，BOM联动成本" },
  { id: "mech-elec-standards", num: 7, name: "机械与电气标准", nameEn: "Mech & Elec Standards", icon: Cog, path: "/sandbox/mechanical-standards", lane: 1, color: "#8B5CF6", col: 3,
    scenarioSteps: ["1. 选择项目 → 加载配置基线", "2. 添加/修改配置项 → 合规检查", "3. ECO工程变更 → 版本管理", "4. 图纸发布 → 下推至工艺"],
    entryPoint: "机械/电气工程师维护标准配置，ECO变更触发下游" },

  // Lane 2: Manufacturing Twin
  { id: "production-scheduling", num: 11, name: "生产排产控制台", nameEn: "Production Scheduling", icon: Factory, path: "/sandbox/production-scheduling", lane: 2, color: "#0EA5E9", col: 0,
    scenarioSteps: ["1. 查看甘特图 → 识别瓶颈", "2. 创建工单 → 分配班组", "3. 报工提交 → 工时自动汇总", "4. 异常告警 → 调度调整"],
    entryPoint: "生产班组长创建工单，工时报工触发成本回传" },
  { id: "ai-process-twin", num: 12, name: "AI工艺孪生大脑", nameEn: "AI Process Twin", icon: Brain, path: "/sandbox/ai-process-twin", lane: 2, color: "#F59E0B", col: 1,
    scenarioSteps: ["1. 选择工序 → 加载FMEA历史", "2. AI切片生成防呆SOP", "3. 推送至车间TV终端", "4. 执行反馈 → 良率追踪"],
    entryPoint: "工艺工程师启动AI编排，生成防呆SOP推送终端" },
  { id: "cost-labor", num: 8, name: "成本与报工追踪", nameEn: "Cost & Labor", icon: DollarSign, path: "/sandbox/cost-labor", lane: 2, color: "#F43F5E", col: 2,
    scenarioSteps: ["1. 查看项目成本汇总", "2. 分类工时统计 → 偏差分析", "3. 报工审批 → 驳回/通过", "4. 成本卷积 → 财务对账"],
    entryPoint: "财务/PMO查看实时成本，报工数据自动聚合" },

  // Lane 3: Resources & Ecosystem
  { id: "payroll-attendance", num: 2, name: "薪酬与打卡异常", nameEn: "Payroll & Attendance", icon: Wallet, path: "/sandbox/payroll-attendance", lane: 3, color: "#F97316", col: 0,
    scenarioSteps: ["1. 导入考勤数据 → 异常检测", "2. 三档绩效工资计算", "3. 薪资试算 → 对比上月", "4. 审批确认 → 发放"],
    entryPoint: "HR薪酬专员导入考勤，系统自动算薪" },
  { id: "performance-points", num: 3, name: "绩效与积分奖惩", nameEn: "Performance & Points", icon: Award, path: "/sandbox/performance-points", lane: 3, color: "#EC4899", col: 1,
    scenarioSteps: ["1. 员工提交证据 → 4D评分", "2. 校准会议 → 等级调整", "3. 积分账户 → 兑换/排行", "4. 红蓝对抗 → 团队激励"],
    entryPoint: "直线经理发起评分，员工提交佐证材料" },
  { id: "vip-strategic", num: 9, name: "VIP战略舱", nameEn: "VIP Strategic", icon: Star, path: "/customer-portal/vip-dashboard", lane: 3, color: "#EAB308", col: 2,
    scenarioSteps: ["1. 客户登录 → 专属看板", "2. 项目进度 → 里程碑追踪", "3. 质量指标 → SPC图表", "4. 10%降本进度 → 信任构建"],
    entryPoint: "VIP客户(美利信)登录专属战略舱查看进度" },
  { id: "acceptance-tracking", num: 10, name: "验收与满意度", nameEn: "Acceptance", icon: ClipboardCheck, path: "/sandbox/acceptance-tracking", lane: 3, color: "#A855F7", col: 3,
    scenarioSteps: ["1. FAT出厂检验 → 清单勾选", "2. SAT现场验收 → 问题记录", "3. 客户满意度评分", "4. 闭环确认 → 项目结案"],
    entryPoint: "调试工程师启动FAT/SAT验收流程" },
];

// Event bus edges — derived from SANDBOX_EVENTS
const EDGES: TopoEdge[] = [
  // Planning → downstream
  { id: "e1", from: "annual-planning", to: "project-lifecycle", eventType: "planning.budget.approved", label: "预算审批", color: "#3B82F6" },
  { id: "e2", from: "annual-planning", to: "payroll-attendance", eventType: "planning.headcount.set", label: "编制确认", color: "#3B82F6" },
  // Project → downstream
  { id: "e3", from: "project-lifecycle", to: "quoting-bom", eventType: "project.gate.passed", label: "M0过门", color: "#14B8A6" },
  { id: "e4", from: "project-lifecycle", to: "production-scheduling", eventType: "project.resource.request", label: "资源申请", color: "#14B8A6" },
  { id: "e5", from: "project-lifecycle", to: "acceptance-tracking", eventType: "project.milestone.hit", label: "里程碑", color: "#14B8A6" },
  // Quoting → downstream
  { id: "e6", from: "quoting-bom", to: "mech-elec-standards", eventType: "bom.finalized", label: "BOM锁定", color: "#10B981" },
  { id: "e7", from: "quoting-bom", to: "vip-strategic", eventType: "quote.approved", label: "报价批准", color: "#10B981" },
  // Mechanical → manufacturing
  { id: "e8", from: "mech-elec-standards", to: "ai-process-twin", eventType: "mech.config.validated", label: "配置验证", color: "#8B5CF6" },
  // Production → cost/payroll
  { id: "e9", from: "production-scheduling", to: "cost-labor", eventType: "scheduling.plan.published", label: "排产发布", color: "#0EA5E9" },
  { id: "e10", from: "production-scheduling", to: "payroll-attendance", eventType: "labor.report.submitted", label: "报工数据", color: "#0EA5E9" },
  // AI Twin → TV + cost
  { id: "e11", from: "ai-process-twin", to: "cost-labor", eventType: "labor.cost.rollup.completed", label: "成本卷积", color: "#F59E0B" },
  // Cost → payroll
  { id: "e12", from: "cost-labor", to: "payroll-attendance", eventType: "labor.report.approved", label: "工时审批", color: "#F43F5E" },
  // Payroll → performance
  { id: "e13", from: "payroll-attendance", to: "performance-points", eventType: "payroll.cycle.calculated", label: "薪资周期", color: "#F97316" },
  // Performance → payroll (feedback)
  { id: "e14", from: "performance-points", to: "payroll-attendance", eventType: "perf.score.finalized", label: "绩效定档", color: "#EC4899" },
  // Acceptance → VIP
  { id: "e15", from: "acceptance-tracking", to: "vip-strategic", eventType: "acceptance.completed", label: "验收完成", color: "#A855F7" },
  // Customer → project
  { id: "e16", from: "vip-strategic", to: "project-lifecycle", eventType: "customer.profile.updated", label: "客户反馈", color: "#EAB308" },
];

const LANE_META: Record<number, { label: string; labelEn: string; color: string; bgGrad: string }> = {
  1: { label: "顶层战略与项目源头", labelEn: "Strategy & R&D", color: "#3B82F6", bgGrad: "from-blue-500/5 to-transparent" },
  2: { label: "核心孪生制造中枢", labelEn: "Manufacturing Twin", color: "#F59E0B", bgGrad: "from-amber-500/8 to-transparent" },
  3: { label: "组织底座与生态反哺", labelEn: "Resources & Ecosystem", color: "#10B981", bgGrad: "from-emerald-500/5 to-transparent" },
};

// ═══════════════════════════════════════════════════════════
// Layout Geometry
// ═══════════════════════════════════════════════════════════

const SVG_W = 1200;
const SVG_H = 900;
const LANE_Y: Record<number, number> = { 1: 140, 2: 420, 3: 680 };
const LANE_H = 200;
const NODE_R = 42;

function nodePos(node: TopoNode): { x: number; y: number } {
  const laneNodes = NODES.filter(n => n.lane === node.lane);
  const count = laneNodes.length;
  const spacing = SVG_W / (count + 1);
  return { x: spacing * (node.col + 1), y: LANE_Y[node.lane] + LANE_H / 2 };
}

// ═══════════════════════════════════════════════════════════
// Keyframes
// ═══════════════════════════════════════════════════════════

const TOPO_STYLE_ID = "topo-map-keyframes";
const TOPO_KEYFRAMES = `
@keyframes topoNodePulse {
  0%, 100% { filter: drop-shadow(0 0 6px var(--node-color)); }
  50% { filter: drop-shadow(0 0 18px var(--node-color)); }
}
@keyframes topoEdgeFlow {
  0% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}
@keyframes topoNodeHover {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes topoPing {
  0% { r: ${NODE_R}; opacity: 0.6; }
  100% { r: ${NODE_R + 20}; opacity: 0; }
}
`;

// ═══════════════════════════════════════════════════════════
// Node Detail Panel (operation guide)
// ═══════════════════════════════════════════════════════════

function NodeDetailPanel({ node, onClose, onNavigate }: {
  node: TopoNode;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const Icon = node.icon;
  const inEdges = EDGES.filter(e => e.to === node.id);
  const outEdges = EDGES.filter(e => e.from === node.id);

  return (
    <div className="absolute right-0 top-0 h-full w-[380px] bg-[#0a0d14]/98 border-l border-gray-800 backdrop-blur-xl z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: `${node.color}15`, borderColor: `${node.color}40` }}>
              <Icon className="h-6 w-6" style={{ color: node.color }} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-100">{node.name}</h3>
              <p className="text-xs text-gray-500">{node.nameEn} · 沙盘 #{node.num < 10 ? `0${node.num}` : node.num}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Entry Point */}
        <div className="mb-6 p-3 rounded-lg border" style={{ borderColor: `${node.color}30`, backgroundColor: `${node.color}08` }}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" style={{ color: node.color }} />
            <span className="text-xs font-bold" style={{ color: node.color }}>场景介入口</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{node.entryPoint}</p>
        </div>

        {/* Operation Steps */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400">操作步骤</span>
          </div>
          <div className="space-y-2">
            {node.scenarioSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-900/50 border border-gray-800">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">{step.replace(/^\d+\.\s*/, "")}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Flow — Inputs */}
        {inEdges.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-3 w-3 text-emerald-400 rotate-180" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase">数据输入 ({inEdges.length})</span>
            </div>
            <div className="space-y-1">
              {inEdges.map(e => {
                const src = NODES.find(n => n.id === e.from);
                return (
                  <div key={e.id} className="flex items-center gap-2 text-[11px] text-gray-400 px-2 py-1 rounded bg-gray-900/30">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-gray-500">{src?.name}</span>
                    <span className="text-gray-600">→</span>
                    <span className="font-medium text-gray-300">{e.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Flow — Outputs */}
        {outEdges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 uppercase">数据输出 ({outEdges.length})</span>
            </div>
            <div className="space-y-1">
              {outEdges.map(e => {
                const tgt = NODES.find(n => n.id === e.to);
                return (
                  <div key={e.id} className="flex items-center gap-2 text-[11px] text-gray-400 px-2 py-1 rounded bg-gray-900/30">
                    <span className="font-medium text-gray-300">{e.label}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-500">{tgt?.name}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigate button */}
        <Button
          className="w-full gap-2"
          style={{ backgroundColor: node.color, color: "#fff" }}
          onClick={() => onNavigate(node.path)}
        >
          <Rocket className="h-4 w-4" />
          进入沙盘
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function SystemTopologyMap() {
  const [, navigate] = useLocation();
  const { level } = useUserProfile();
  const { toast } = useToast();
  const canManage = level >= 7;

  const [selectedNode, setSelectedNode] = useState<TopoNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [animating, setAnimating] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scenario init status
  const { data: scenarioStatus, refetch: refetchStatus } = trpc.scenarioInit.getStatus.useQuery(undefined, {
    staleTime: 30_000,
  });
  const initializedSet = useMemo(() => new Set(scenarioStatus?.initialized ?? []), [scenarioStatus]);

  // Auto-init mutations
  const batch1 = trpc.scenarioInit.launchBatch1.useMutation();
  const batch2 = trpc.scenarioInit.launchBatch2.useMutation();
  const batch3 = trpc.scenarioInit.launchBatch3.useMutation();
  const [autoInitRunning, setAutoInitRunning] = useState(false);

  const handleAutoInit = useCallback(async () => {
    if (!canManage) return;
    setAutoInitRunning(true);
    try {
      await batch1.mutateAsync();
      await batch2.mutateAsync();
      await batch3.mutateAsync();
      refetchStatus();
      toast({ title: "全系统场景数据注入完成", description: "13个沙盘全部初始化" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "初始化失败", description: msg, variant: "destructive" });
    } finally {
      setAutoInitRunning(false);
    }
  }, [canManage, batch1, batch2, batch3, refetchStatus, toast]);

  // Inject keyframes
  useEffect(() => {
    if (document.getElementById(TOPO_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = TOPO_STYLE_ID;
    style.textContent = TOPO_KEYFRAMES;
    document.head.appendChild(style);
  }, []);

  // Highlighted edges when hovering a node
  const activeEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    return new Set(EDGES.filter(e => e.from === hoveredNode || e.to === hoveredNode).map(e => e.id));
  }, [hoveredNode]);

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const set = new Set<string>();
    set.add(hoveredNode);
    EDGES.forEach(e => {
      if (e.from === hoveredNode) set.add(e.to);
      if (e.to === hoveredNode) set.add(e.from);
    });
    return set;
  }, [hoveredNode]);

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(f => !f);
  }, [fullscreen]);

  return (
    <div ref={containerRef} className={cn("h-full overflow-hidden bg-[#060810] text-gray-200 flex flex-col", fullscreen && "fixed inset-0 z-[9999]")}>

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-[#0a0d14]/80 backdrop-blur px-6 py-3">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Network className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                <span className="text-gray-100">GRT 工业 OS</span>
                <span className="text-gray-600 mx-2">|</span>
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  全系统神经网络拓扑
                </span>
              </h1>
              <p className="text-[10px] text-gray-500">
                System Neural Topology — 12 Nodes · 16 Edges · 26 Event Types · Real-Time Data Flow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats */}
            <div className="flex items-center gap-4 mr-4 text-[10px]">
              <span className="text-gray-600">节点: <span className="text-cyan-400 font-bold font-mono">{NODES.length}</span></span>
              <span className="text-gray-600">连接: <span className="text-purple-400 font-bold font-mono">{EDGES.length}</span></span>
              <span className="text-gray-600">已注入: <span className="text-emerald-400 font-bold font-mono">{initializedSet.size}/13</span></span>
            </div>

            {/* Auto-init */}
            {canManage && initializedSet.size < 13 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleAutoInit}
                disabled={autoInitRunning}
              >
                <Rocket className="h-3 w-3" />
                {autoInitRunning ? "注入中..." : "一键注入全部场景"}
              </Button>
            )}

            {/* Animation toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-300"
              onClick={() => setAnimating(a => !a)}
              title={animating ? "暂停动画" : "恢复动画"}
            >
              {animating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-300"
              onClick={toggleFullscreen}
            >
              {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>

            {/* Back to sandbox overview */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1 border-gray-700 text-gray-400"
              onClick={() => navigate("/sandbox")}
            >
              <Eye className="h-3 w-3" />
              沙盘总览
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main SVG Topology ── */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glow filter */}
            <filter id="topo-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="topo-glow-strong">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Arrow marker */}
            {EDGES.map(e => (
              <marker key={`marker-${e.id}`} id={`arrow-${e.id}`} markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
                <path d="M0,0 L10,4 L0,8 Z" fill={e.color} opacity={activeEdges.has(e.id) ? 0.9 : 0.5} />
              </marker>
            ))}
          </defs>

          {/* ── Lane Backgrounds ── */}
          {([1, 2, 3] as const).map(lane => {
            const meta = LANE_META[lane];
            return (
              <g key={`lane-${lane}`}>
                <rect
                  x={40} y={LANE_Y[lane]} width={SVG_W - 80} height={LANE_H}
                  rx={16} fill={`${meta.color}08`} stroke={`${meta.color}15`} strokeWidth={1}
                />
                {/* Lane label */}
                <text x={60} y={LANE_Y[lane] + 24} fill={meta.color} fontSize={12} fontWeight="bold" opacity={0.7}>
                  泳道 {lane === 1 ? "I" : lane === 2 ? "II" : "III"} — {meta.label}
                </text>
                <text x={60} y={LANE_Y[lane] + 40} fill={meta.color} fontSize={9} opacity={0.4}>
                  {meta.labelEn}
                </text>
              </g>
            );
          })}

          {/* ── TV Terminal between lane 2 & 3 ── */}
          <g>
            <rect x={SVG_W / 2 - 60} y={LANE_Y[2] + LANE_H + 15} width={120} height={36} rx={8}
              fill="#06B6D410" stroke="#06B6D430" strokeWidth={1} />
            <text x={SVG_W / 2} y={LANE_Y[2] + LANE_H + 38} textAnchor="middle" fill="#06B6D4" fontSize={10} fontWeight="bold">
              车间TV终端
            </text>
          </g>

          {/* ── Inter-lane flow arrows ── */}
          {/* Lane 1 → 2 */}
          <line x1={SVG_W / 2} y1={LANE_Y[1] + LANE_H + 5} x2={SVG_W / 2} y2={LANE_Y[2] - 5}
            stroke="#3B82F630" strokeWidth={2} strokeDasharray="6,4"
            style={animating ? { animation: "topoEdgeFlow 1s linear infinite" } : undefined} />
          {/* Lane 2 → TV */}
          <line x1={SVG_W / 2} y1={LANE_Y[2] + LANE_H + 2} x2={SVG_W / 2} y2={LANE_Y[2] + LANE_H + 15}
            stroke="#06B6D440" strokeWidth={2} strokeDasharray="4,3"
            style={animating ? { animation: "topoEdgeFlow 0.8s linear infinite" } : undefined} />
          {/* TV → Lane 3 */}
          <line x1={SVG_W / 2} y1={LANE_Y[2] + LANE_H + 51} x2={SVG_W / 2} y2={LANE_Y[3] - 5}
            stroke="#10B98130" strokeWidth={2} strokeDasharray="6,4"
            style={animating ? { animation: "topoEdgeFlow 1.2s linear infinite" } : undefined} />

          {/* ── Edges ── */}
          {EDGES.map(edge => {
            const fromPos = nodePos(NODES.find(n => n.id === edge.from)!);
            const toPos = nodePos(NODES.find(n => n.id === edge.to)!);
            const isActive = activeEdges.has(edge.id);
            const isDimmed = hoveredNode && !isActive;

            // Curved path using quadratic bezier
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            // Curve control point offset perpendicular to the line
            const dist = Math.sqrt(dx * dx + dy * dy);
            const curvature = Math.min(dist * 0.3, 80);
            const nx = -dy / dist * curvature;
            const ny = dx / dist * curvature;
            const cx = midX + nx * 0.5;
            const cy = midY + ny * 0.5;

            return (
              <g key={edge.id}>
                <path
                  d={`M${fromPos.x},${fromPos.y} Q${cx},${cy} ${toPos.x},${toPos.y}`}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={isActive ? 3 : 1.5}
                  strokeDasharray={isActive ? "none" : "6,4"}
                  opacity={isDimmed ? 0.08 : isActive ? 0.9 : 0.25}
                  markerEnd={`url(#arrow-${edge.id})`}
                  filter={isActive ? "url(#topo-glow)" : undefined}
                  style={animating && !isActive ? { animation: "topoEdgeFlow 2s linear infinite" } : undefined}
                />
                {/* Edge label on hover */}
                {isActive && (
                  <text x={cx} y={cy - 8} textAnchor="middle" fill={edge.color} fontSize={10} fontWeight="bold">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {NODES.map(node => {
            const pos = nodePos(node);
            const Icon = node.icon;
            const isHovered = hoveredNode === node.id;
            const isConnected = connectedNodes.has(node.id);
            const isDimmed = hoveredNode && !isConnected;
            const isInit = initializedSet.has(node.id);

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ transition: "opacity 0.3s" }}
                opacity={isDimmed ? 0.15 : 1}
              >
                {/* Ping animation on hover */}
                {isHovered && animating && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R} fill="none" stroke={node.color} strokeWidth={2} opacity={0.3}>
                    <animate attributeName="r" from={NODE_R} to={NODE_R + 20} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Node circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={NODE_R}
                  fill={`${node.color}15`}
                  stroke={node.color}
                  strokeWidth={isHovered ? 3 : 1.5}
                  filter={isHovered ? "url(#topo-glow-strong)" : undefined}
                  style={animating && !hoveredNode ? { animation: `topoNodePulse 3s ease-in-out infinite ${node.col * 0.3}s` } as React.CSSProperties : undefined}
                />

                {/* Initialized indicator */}
                {isInit && (
                  <circle cx={pos.x + NODE_R - 8} cy={pos.y - NODE_R + 8} r={6} fill="#10B981" stroke="#0a0d14" strokeWidth={2} />
                )}

                {/* Number badge */}
                <text x={pos.x} y={pos.y - 12} textAnchor="middle" fill={node.color} fontSize={11} fontWeight="900" fontFamily="monospace">
                  {node.num < 10 ? `0${node.num}` : node.num}
                </text>

                {/* Name */}
                <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="#e5e7eb" fontSize={10} fontWeight="bold">
                  {node.name.length > 8 ? node.name.slice(0, 8) : node.name}
                </text>
                {node.name.length > 8 && (
                  <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill="#9ca3af" fontSize={9}>
                    {node.name.slice(8)}
                  </text>
                )}

                {/* Hover tooltip: nameEn */}
                {isHovered && (
                  <text x={pos.x} y={pos.y + NODE_R + 16} textAnchor="middle" fill={node.color} fontSize={9} opacity={0.8}>
                    {node.nameEn} — 点击查看详情
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Title watermark ── */}
          <text x={SVG_W / 2} y={SVG_H - 20} textAnchor="middle" fill="#ffffff08" fontSize={14} fontWeight="bold" letterSpacing={4}>
            GRT INDUSTRIAL OS · NEURAL TOPOLOGY v5.1
          </text>
        </svg>

        {/* ── Node Detail Panel (side drawer) ── */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onNavigate={navigate}
          />
        )}

        {/* ── Legend (bottom-left) ── */}
        <div className="absolute bottom-4 left-4 rounded-xl border border-gray-800 bg-[#0a0d14]/90 backdrop-blur-sm p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-3 w-3 text-gray-500" />
            <span className="text-[10px] font-bold text-gray-400">图例 Legend</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#3B82F6", backgroundColor: "#3B82F615" }} />
              <span className="text-gray-500">泳道I 战略</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#F59E0B", backgroundColor: "#F59E0B15" }} />
              <span className="text-gray-500">泳道II 制造</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#10B981", backgroundColor: "#10B98115" }} />
              <span className="text-gray-500">泳道III 资源</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-500">已初始化</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: "#3B82F660" }} />
              <span className="text-gray-500">事件总线连接 (悬停节点高亮关联)</span>
            </div>
          </div>
          <p className="text-[8px] text-gray-600 mt-2">点击节点查看场景介入口与操作步骤</p>
        </div>

        {/* ── Quick stats (bottom-right) ── */}
        <div className="absolute bottom-4 right-4 rounded-xl border border-gray-800 bg-[#0a0d14]/90 backdrop-blur-sm p-3">
          <div className="flex items-center gap-4 text-[10px]">
            {([1, 2, 3] as const).map(lane => {
              const meta = LANE_META[lane];
              const laneNodes = NODES.filter(n => n.lane === lane);
              const initCount = laneNodes.filter(n => initializedSet.has(n.id)).length;
              return (
                <div key={lane} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className="text-gray-500">{meta.labelEn}:</span>
                  <span className="font-bold font-mono" style={{ color: meta.color }}>{initCount}/{laneNodes.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
