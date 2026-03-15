/**
 * SandboxEventFlowPanel — Cross-sandbox event bus awareness panel
 *
 * Shows incoming/outgoing event connections for any sandbox,
 * providing visibility into the data flow topology from within each sandbox page.
 */
import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDownToLine, ArrowUpFromLine, Zap, Network,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Event topology data (matches SANDBOX_EVENTS in event-bus.ts) ──

interface EventConnection {
  eventType: string;
  label: string;
  peerSandboxId: string;
  peerName: string;
  peerPath: string;
  direction: "in" | "out";
  color: string;
}

const EVENT_TOPOLOGY: Record<string, EventConnection[]> = {
  "annual-planning": [
    { eventType: "planning.budget.approved", label: "预算审批 → 项目", peerSandboxId: "project-lifecycle", peerName: "项目M0-M12", peerPath: "/sandbox/project-lifecycle", direction: "out", color: "#3B82F6" },
    { eventType: "planning.headcount.set", label: "编制确认 → 薪酬", peerSandboxId: "payroll-attendance", peerName: "薪酬与打卡", peerPath: "/sandbox/payroll-attendance", direction: "out", color: "#3B82F6" },
  ],
  "project-lifecycle": [
    { eventType: "planning.budget.approved", label: "预算审批 ← 规划", peerSandboxId: "annual-planning", peerName: "年度规划", peerPath: "/sandbox/annual-planning", direction: "in", color: "#3B82F6" },
    { eventType: "project.gate.passed", label: "M0过门 → 报价", peerSandboxId: "quoting-bom", peerName: "报价与BOM", peerPath: "/sandbox/quoting-bom", direction: "out", color: "#14B8A6" },
    { eventType: "project.resource.request", label: "资源申请 → 排产", peerSandboxId: "production-scheduling", peerName: "生产排产", peerPath: "/sandbox/production-scheduling", direction: "out", color: "#14B8A6" },
    { eventType: "project.milestone.hit", label: "里程碑 → 验收", peerSandboxId: "acceptance-tracking", peerName: "验收追踪", peerPath: "/sandbox/acceptance-tracking", direction: "out", color: "#14B8A6" },
    { eventType: "customer.profile.updated", label: "客户反馈 ← VIP", peerSandboxId: "vip-strategic", peerName: "VIP战略舱", peerPath: "/customer-portal/vip-dashboard", direction: "in", color: "#EAB308" },
  ],
  "quoting-bom": [
    { eventType: "project.gate.passed", label: "M0过门 ← 项目", peerSandboxId: "project-lifecycle", peerName: "项目M0-M12", peerPath: "/sandbox/project-lifecycle", direction: "in", color: "#14B8A6" },
    { eventType: "bom.finalized", label: "BOM锁定 → 机械", peerSandboxId: "mech-elec-standards", peerName: "机械与电气", peerPath: "/sandbox/mechanical-standards", direction: "out", color: "#10B981" },
    { eventType: "quote.approved", label: "报价批准 → VIP", peerSandboxId: "vip-strategic", peerName: "VIP战略舱", peerPath: "/customer-portal/vip-dashboard", direction: "out", color: "#10B981" },
  ],
  "mech-elec-standards": [
    { eventType: "bom.finalized", label: "BOM锁定 ← 报价", peerSandboxId: "quoting-bom", peerName: "报价与BOM", peerPath: "/sandbox/quoting-bom", direction: "in", color: "#10B981" },
    { eventType: "mech.config.validated", label: "配置验证 → AI孪生", peerSandboxId: "ai-process-twin", peerName: "AI工艺孪生", peerPath: "/sandbox/ai-process-twin", direction: "out", color: "#8B5CF6" },
  ],
  "production-scheduling": [
    { eventType: "project.resource.request", label: "资源申请 ← 项目", peerSandboxId: "project-lifecycle", peerName: "项目M0-M12", peerPath: "/sandbox/project-lifecycle", direction: "in", color: "#14B8A6" },
    { eventType: "scheduling.plan.published", label: "排产发布 → 成本", peerSandboxId: "cost-labor", peerName: "成本与报工", peerPath: "/sandbox/cost-labor", direction: "out", color: "#0EA5E9" },
    { eventType: "labor.report.submitted", label: "报工数据 → 薪酬", peerSandboxId: "payroll-attendance", peerName: "薪酬与打卡", peerPath: "/sandbox/payroll-attendance", direction: "out", color: "#0EA5E9" },
  ],
  "ai-process-twin": [
    { eventType: "mech.config.validated", label: "配置验证 ← 机械", peerSandboxId: "mech-elec-standards", peerName: "机械与电气", peerPath: "/sandbox/mechanical-standards", direction: "in", color: "#8B5CF6" },
    { eventType: "labor.cost.rollup.completed", label: "成本卷积 → 成本", peerSandboxId: "cost-labor", peerName: "成本与报工", peerPath: "/sandbox/cost-labor", direction: "out", color: "#F59E0B" },
  ],
  "cost-labor": [
    { eventType: "scheduling.plan.published", label: "排产发布 ← 排产", peerSandboxId: "production-scheduling", peerName: "生产排产", peerPath: "/sandbox/production-scheduling", direction: "in", color: "#0EA5E9" },
    { eventType: "labor.cost.rollup.completed", label: "成本卷积 ← AI孪生", peerSandboxId: "ai-process-twin", peerName: "AI工艺孪生", peerPath: "/sandbox/ai-process-twin", direction: "in", color: "#F59E0B" },
    { eventType: "labor.report.approved", label: "工时审批 → 薪酬", peerSandboxId: "payroll-attendance", peerName: "薪酬与打卡", peerPath: "/sandbox/payroll-attendance", direction: "out", color: "#F43F5E" },
  ],
  "payroll-attendance": [
    { eventType: "planning.headcount.set", label: "编制确认 ← 规划", peerSandboxId: "annual-planning", peerName: "年度规划", peerPath: "/sandbox/annual-planning", direction: "in", color: "#3B82F6" },
    { eventType: "labor.report.submitted", label: "报工数据 ← 排产", peerSandboxId: "production-scheduling", peerName: "生产排产", peerPath: "/sandbox/production-scheduling", direction: "in", color: "#0EA5E9" },
    { eventType: "labor.report.approved", label: "工时审批 ← 成本", peerSandboxId: "cost-labor", peerName: "成本与报工", peerPath: "/sandbox/cost-labor", direction: "in", color: "#F43F5E" },
    { eventType: "perf.score.finalized", label: "绩效定档 ← 绩效", peerSandboxId: "performance-points", peerName: "绩效与积分", peerPath: "/sandbox/performance-points", direction: "in", color: "#EC4899" },
    { eventType: "payroll.cycle.calculated", label: "薪资周期 → 绩效", peerSandboxId: "performance-points", peerName: "绩效与积分", peerPath: "/sandbox/performance-points", direction: "out", color: "#F97316" },
  ],
  "performance-points": [
    { eventType: "payroll.cycle.calculated", label: "薪资周期 ← 薪酬", peerSandboxId: "payroll-attendance", peerName: "薪酬与打卡", peerPath: "/sandbox/payroll-attendance", direction: "in", color: "#F97316" },
    { eventType: "perf.score.finalized", label: "绩效定档 → 薪酬", peerSandboxId: "payroll-attendance", peerName: "薪酬与打卡", peerPath: "/sandbox/payroll-attendance", direction: "out", color: "#EC4899" },
  ],
  "vip-strategic": [
    { eventType: "quote.approved", label: "报价批准 ← 报价", peerSandboxId: "quoting-bom", peerName: "报价与BOM", peerPath: "/sandbox/quoting-bom", direction: "in", color: "#10B981" },
    { eventType: "acceptance.completed", label: "验收完成 ← 验收", peerSandboxId: "acceptance-tracking", peerName: "验收追踪", peerPath: "/sandbox/acceptance-tracking", direction: "in", color: "#A855F7" },
    { eventType: "customer.profile.updated", label: "客户反馈 → 项目", peerSandboxId: "project-lifecycle", peerName: "项目M0-M12", peerPath: "/sandbox/project-lifecycle", direction: "out", color: "#EAB308" },
  ],
  "acceptance-tracking": [
    { eventType: "project.milestone.hit", label: "里程碑 ← 项目", peerSandboxId: "project-lifecycle", peerName: "项目M0-M12", peerPath: "/sandbox/project-lifecycle", direction: "in", color: "#14B8A6" },
    { eventType: "acceptance.completed", label: "验收完成 → VIP", peerSandboxId: "vip-strategic", peerName: "VIP战略舱", peerPath: "/customer-portal/vip-dashboard", direction: "out", color: "#A855F7" },
  ],
};

export function getSandboxEventConnections(sandboxId: string): EventConnection[] {
  return EVENT_TOPOLOGY[sandboxId] ?? [];
}

interface Props {
  sandboxId: string;
  className?: string;
}

export default function SandboxEventFlowPanel({ sandboxId, className }: Props) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const connections = EVENT_TOPOLOGY[sandboxId] ?? [];
  if (connections.length === 0) return null;

  const inbound = connections.filter(c => c.direction === "in");
  const outbound = connections.filter(c => c.direction === "out");

  return (
    <div className={cn(
      "rounded-lg border border-gray-800 bg-[#0a0d14]/80 backdrop-blur-sm transition-all",
      className,
    )}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800/30 transition-colors rounded-lg"
        onClick={() => setExpanded(e => !e)}
      >
        <Network className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[11px] font-bold text-gray-300">事件总线连接</span>
        <span className="text-[9px] text-gray-500 ml-1">
          {inbound.length}↓ {outbound.length}↑
        </span>
        <div className="ml-auto flex items-center gap-1">
          {connections.slice(0, 3).map((c, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
          ))}
          {expanded ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Inbound */}
          {inbound.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <ArrowDownToLine className="h-3 w-3 text-emerald-400" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase">输入数据流 ({inbound.length})</span>
              </div>
              {inbound.map((conn, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-800/50 transition-colors group"
                  onClick={() => navigate(conn.peerPath)}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: conn.color }} />
                  <span className="text-[10px] text-gray-400 flex-1 truncate">{conn.label}</span>
                  <ExternalLink className="h-2.5 w-2.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Outbound */}
          {outbound.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <ArrowUpFromLine className="h-3 w-3 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-400 uppercase">输出数据流 ({outbound.length})</span>
              </div>
              {outbound.map((conn, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-800/50 transition-colors group"
                  onClick={() => navigate(conn.peerPath)}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: conn.color }} />
                  <span className="text-[10px] text-gray-400 flex-1 truncate">{conn.label}</span>
                  <ExternalLink className="h-2.5 w-2.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Link to topology */}
          <button
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-cyan-500/20 text-[10px] text-cyan-400 hover:bg-cyan-500/5 transition-colors mt-1"
            onClick={() => navigate("/system-topology")}
          >
            <Zap className="h-3 w-3" />
            查看全系统脉络图
          </button>
        </div>
      )}
    </div>
  );
}
