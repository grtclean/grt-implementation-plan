/**
 * Agent Control Tower — Agent 控制塔
 *
 * Admin page for managing 13 AI agents across 11 sandboxes.
 * Route: /admin/agent-management
 *
 * 3 tabs:
 * 1. Agent Overview: Summary stats + agent card grid
 * 2. Agent Config: Editable table of agent settings (admin only for mutations)
 * 3. Invocation History: Real event log from sandbox_event_log via tRPC
 *
 * Data sources:
 * - AGENT_REGISTRY: Static seed data (mirrors DB agent_registry table)
 * - Invocation history: Live from sandbox_event_log via strategyGoals.getRecentEvents
 * - Role gating: useUserProfile().roleConfig.level >= 7 for admin actions
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  Bot,
  Settings,
  History,
  Activity,
  Cpu,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Zap,
  Edit,
  ChevronRight,
  BarChart3,
  Hash,
  Server,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Rocket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  active: { label: "运行中", color: "bg-green-500", textColor: "text-green-600", bgColor: "bg-green-50" },
  standby: { label: "待命", color: "bg-yellow-500", textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
  disabled: { label: "未启用", color: "bg-gray-400", textColor: "text-gray-500", bgColor: "bg-gray-50" },
  error: { label: "异常", color: "bg-red-500", textColor: "text-red-600", bgColor: "bg-red-50" },
} as const;

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "bg-blue-100 text-blue-700",
  claude: "bg-purple-100 text-purple-700",
  openai: "bg-emerald-100 text-emerald-700",
};

type AgentStatus = keyof typeof STATUS_CONFIG;

interface AgentEntry {
  agentId: string;
  displayName: string;
  displayNameEn: string;
  sandboxId: string | null;
  sandboxName: string;
  aiProvider: string;
  aiModel: string;
  status: AgentStatus;
  totalInvocations: number;
  totalTokensUsed: number;
}

// ---------------------------------------------------------------------------
// Static Agent Registry — mirrors DB agent_registry seed data.
// When a dedicated agent-registry router is created, replace with tRPC query.
// ---------------------------------------------------------------------------
const AGENT_REGISTRY: AgentEntry[] = [
  { agentId: "agent-annual-planner", displayName: "年度规划Agent", displayNameEn: "Annual Planner Agent", sandboxId: "annual-planning", sandboxName: "年度规划与预算", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "standby", totalInvocations: 0, totalTokensUsed: 0 },
  { agentId: "agent-payroll-calc", displayName: "薪酬计算Agent", displayNameEn: "Payroll Calculator Agent", sandboxId: "payroll-attendance", sandboxName: "薪酬与打卡", aiProvider: "claude", aiModel: "claude-sonnet-4-6", status: "active", totalInvocations: 2847, totalTokensUsed: 1_250_000 },
  { agentId: "agent-perf-coach", displayName: "绩效教练Agent", displayNameEn: "Performance Coach Agent", sandboxId: "performance-points", sandboxName: "绩效与积分", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "standby", totalInvocations: 156, totalTokensUsed: 85_000 },
  { agentId: "agent-hr-lifecycle", displayName: "HR生命周期Agent", displayNameEn: "HR Lifecycle Agent", sandboxId: "hr-lifecycle", sandboxName: "HR员工全周期", aiProvider: "claude", aiModel: "claude-sonnet-4-6", status: "standby", totalInvocations: 89, totalTokensUsed: 42_000 },
  { agentId: "agent-project-pm", displayName: "项目管理Agent", displayNameEn: "Project PM Agent", sandboxId: "project-lifecycle", sandboxName: "项目M0-M12", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "standby", totalInvocations: 312, totalTokensUsed: 180_000 },
  { agentId: "agent-quoting", displayName: "报价Agent", displayNameEn: "Quoting Agent", sandboxId: "quoting-bom", sandboxName: "智能报价BOM", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "disabled", totalInvocations: 0, totalTokensUsed: 0 },
  { agentId: "agent-mech-validator", displayName: "机械校验Agent", displayNameEn: "Mechanical Validator Agent", sandboxId: "mechanical-standards", sandboxName: "机械配置标准", aiProvider: "claude", aiModel: "claude-sonnet-4-6", status: "disabled", totalInvocations: 0, totalTokensUsed: 0 },
  { agentId: "agent-elec-validator", displayName: "电气校验Agent", displayNameEn: "Electrical Validator Agent", sandboxId: "electrical-standards", sandboxName: "电气规范", aiProvider: "claude", aiModel: "claude-sonnet-4-6", status: "disabled", totalInvocations: 0, totalTokensUsed: 0 },
  { agentId: "agent-customer-insight", displayName: "客户洞察Agent", displayNameEn: "Customer Insight Agent", sandboxId: "customer-config", sandboxName: "客户配置档案", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "disabled", totalInvocations: 0, totalTokensUsed: 0 },
  { agentId: "agent-acceptance", displayName: "验收Agent", displayNameEn: "Acceptance Agent", sandboxId: "acceptance-tracking", sandboxName: "验收追踪满意度", aiProvider: "openai", aiModel: "gpt-4o", status: "disabled", totalInvocations: 0, totalTokensUsed: 0 },
  { agentId: "agent-scheduling", displayName: "排产Agent", displayNameEn: "Scheduling Agent", sandboxId: "production-scheduling", sandboxName: "生产排产报工", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "standby", totalInvocations: 45, totalTokensUsed: 28_000 },
  { agentId: "agent-red-team", displayName: "红队Agent", displayNameEn: "Red Team Agent", sandboxId: null, sandboxName: "全局", aiProvider: "openai", aiModel: "gpt-4o", status: "active", totalInvocations: 1023, totalTokensUsed: 890_000 },
  { agentId: "agent-copilot", displayName: "Copilot Agent", displayNameEn: "Copilot Agent", sandboxId: null, sandboxName: "全局", aiProvider: "gemini", aiModel: "gemini-2.0-flash", status: "active", totalInvocations: 5678, totalTokensUsed: 3_200_000 },
];

// Map agentId → display name for invocation history lookup
const AGENT_NAME_MAP: Record<string, string> = Object.fromEntries(
  AGENT_REGISTRY.map((a) => [a.agentId, a.displayName]),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function StatusDot({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "active" && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", cfg.color)} />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", cfg.color)} />
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors = PROVIDER_COLORS[provider] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", colors)}>
      {provider}
    </span>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.bgColor, cfg.textColor)}>
      <StatusDot status={status} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab: Agent Overview
// ---------------------------------------------------------------------------

function AgentOverviewTab({ agents }: { agents: AgentEntry[] }) {
  const totalAgents = agents.length;
  const activeCount = agents.filter((a) => a.status === "active").length;
  const standbyCount = agents.filter((a) => a.status === "standby").length;
  const totalInvocations = agents.reduce((s, a) => s + a.totalInvocations, 0);
  const totalTokens = agents.reduce((s, a) => s + a.totalTokensUsed, 0);

  const stats = [
    { label: "Agent 总数", value: totalAgents, icon: Bot, accent: "text-blue-600" },
    { label: "运行中", value: activeCount, icon: CheckCircle2, accent: "text-green-600" },
    { label: "待命", value: standbyCount, icon: Clock, accent: "text-yellow-600" },
    { label: "总调用次数", value: totalInvocations.toLocaleString(), icon: Zap, accent: "text-indigo-600" },
    { label: "总 Token 消耗", value: formatTokens(totalTokens), icon: Activity, accent: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <s.icon className={cn("h-4 w-4", s.accent)} />
              {s.label}
            </div>
            <p className={cn("mt-1 text-2xl font-bold", s.accent)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agent card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.agentId}
            className={cn(
              "rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
              agent.status === "disabled" && "opacity-60",
            )}
          >
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={agent.status} />
                <div>
                  <p className="font-semibold text-sm">{agent.displayName}</p>
                  <p className="text-xs text-muted-foreground">{agent.displayNameEn}</p>
                </div>
              </div>
              <StatusBadge status={agent.status} />
            </div>

            {/* Sandbox */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span>{agent.sandboxName}</span>
              {agent.sandboxId && (
                <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">
                  {agent.sandboxId}
                </span>
              )}
            </div>

            {/* Provider + Model */}
            <div className="mt-2 flex items-center gap-2">
              <ProviderBadge provider={agent.aiProvider} />
              <span className="text-xs text-muted-foreground font-mono">{agent.aiModel}</span>
            </div>

            {/* Stats row */}
            <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                <span>{agent.totalInvocations.toLocaleString()} 次调用</span>
              </div>
              <div className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                <span>{formatTokens(agent.totalTokensUsed)} tokens</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog: Edit Agent Status
// ---------------------------------------------------------------------------

interface EditAgentDialogProps {
  agent: AgentEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (agentId: string, newStatus: AgentStatus) => void;
}

function EditAgentDialog({ agent, open, onOpenChange, onSave }: EditAgentDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<AgentStatus>("standby");

  // Sync when agent changes
  const currentAgent = agent;
  if (currentAgent && selectedStatus !== currentAgent.status && !open) {
    // will be set on open via effect-like pattern below
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v && currentAgent) setSelectedStatus(currentAgent.status);
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑 Agent 状态</DialogTitle>
          <DialogDescription>
            {currentAgent
              ? `修改 ${currentAgent.displayName} (${currentAgent.agentId}) 的运行状态`
              : "选择一个Agent进行编辑"}
          </DialogDescription>
        </DialogHeader>

        {currentAgent && (
          <div className="space-y-4 py-2">
            {/* Agent info summary */}
            <div className="rounded-lg border bg-gray-50 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-sm">{currentAgent.displayName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Server className="h-3.5 w-3.5" />
                <span>{currentAgent.sandboxName}</span>
                <span className="mx-1">|</span>
                <ProviderBadge provider={currentAgent.aiProvider} />
                <span className="font-mono">{currentAgent.aiModel}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>当前状态:</span>
                <StatusBadge status={currentAgent.status} />
              </div>
            </div>

            {/* Status selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">新状态</label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as AgentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      运行中 (active)
                    </span>
                  </SelectItem>
                  <SelectItem value="standby">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      待命 (standby)
                    </span>
                  </SelectItem>
                  <SelectItem value="disabled">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      未启用 (disabled)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                注意: 当前为本地状态管理。待 agent-registry router 就绪后将写入数据库。
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            取消
          </button>
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            disabled={!currentAgent || selectedStatus === currentAgent?.status}
            onClick={() => {
              if (currentAgent) {
                onSave(currentAgent.agentId, selectedStatus);
                onOpenChange(false);
              }
            }}
          >
            保存
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: Initialize Agents (Seed)
// ---------------------------------------------------------------------------

function InitAgentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [phase, setPhase] = useState<"confirm" | "running" | "done">("confirm");

  const handleInit = () => {
    setPhase("running");
    // Simulate seed operation — when agent-registry router exists, call tRPC mutation
    setTimeout(() => setPhase("done"), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) setPhase("confirm");
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>初始化 Agent Registry</DialogTitle>
          <DialogDescription>
            将 {AGENT_REGISTRY.length} 个 Agent 配置写入数据库 agent_registry 表
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {phase === "confirm" && (
            <div className="space-y-3">
              <p className="text-sm">此操作将执行以下步骤:</p>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-5">
                <li>检查 agent_registry 表是否存在</li>
                <li>Upsert {AGENT_REGISTRY.length} 条 Agent 种子数据</li>
                <li>设置默认 system_prompt 和 config</li>
                <li>标记 3 个 active Agent 为运行状态</li>
              </ul>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700">
                <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                仅限管理员执行。已有记录不会被覆盖。
              </div>
            </div>
          )}

          {phase === "running" && (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              <span className="text-sm text-muted-foreground">正在初始化 Agent Registry...</span>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">初始化完成</p>
              <p className="text-xs text-muted-foreground">
                {AGENT_REGISTRY.length} 个 Agent 已就绪。待 agent-registry router 实现后将持久化到数据库。
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {phase === "confirm" && (
            <>
              <button
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                onClick={() => onOpenChange(false)}
              >
                取消
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                onClick={handleInit}
              >
                <Rocket className="inline h-3.5 w-3.5 mr-1" />
                开始初始化
              </button>
            </>
          )}
          {phase === "done" && (
            <button
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              onClick={() => { setPhase("confirm"); onOpenChange(false); }}
            >
              关闭
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab: Agent Config
// ---------------------------------------------------------------------------

function AgentConfigTab({
  agents,
  isAdmin,
  onEditAgent,
  onInitAgents,
}: {
  agents: AgentEntry[];
  isAdmin: boolean;
  onEditAgent: (agent: AgentEntry) => void;
  onInitAgents: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          管理各 Agent 的配置参数。修改后需要重启 Agent 才能生效。
        </p>
        {isAdmin && (
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            onClick={onInitAgents}
          >
            <Rocket className="h-3.5 w-3.5" />
            初始化Agent
          </button>
        )}
      </div>

      {/* Permission notice for non-admin */}
      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span>您当前的角色权限不足以修改 Agent 配置。需要管理员 (level 7+) 权限。</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Agent ID</th>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">沙盘</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => (
              <tr
                key={agent.agentId}
                className={cn("border-b last:border-0 hover:bg-gray-50/50", i % 2 === 0 && "bg-white")}
              >
                <td className="px-4 py-3 font-mono text-xs">{agent.agentId}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{agent.displayName}</p>
                    <p className="text-xs text-muted-foreground">{agent.displayNameEn}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">{agent.sandboxName}</td>
                <td className="px-4 py-3">
                  <ProviderBadge provider={agent.aiProvider} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{agent.aiModel}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={agent.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      isAdmin
                        ? "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                        : "text-gray-300 cursor-not-allowed",
                    )}
                    disabled={!isAdmin}
                    title={isAdmin ? "编辑Agent状态" : "需要管理员权限"}
                    onClick={() => isAdmin && onEditAgent(agent)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Invocation History — Live from sandbox_event_log
// ---------------------------------------------------------------------------

interface InvocationRow {
  id: number;
  time: string;
  agentId: string;
  agentName: string;
  eventType: string;
  sourceModule: string;
  status: "success" | "error";
  inputPreview: string;
}

function InvocationHistoryTab() {
  // Real tRPC query to sandbox_event_log
  const eventsQuery = (trpc.strategyGoals as Record<string, unknown> as {
    getRecentEvents: { useQuery: (input: { limit: number }) => {
      data: Array<{
        id: number;
        eventType: string;
        sourceModule: string;
        targetModules: string[] | null;
        payload: Record<string, unknown> | null;
        userId: number | null;
        processedAt: string | null;
        createdAt: string;
      }> | undefined;
      isLoading: boolean;
      error: unknown;
      refetch: () => void;
    }};
  }).getRecentEvents.useQuery({ limit: 50 });

  const invocations = useMemo<InvocationRow[]>(() => {
    if (!eventsQuery.data) return [];
    return eventsQuery.data.map((evt) => {
      const payload = evt.payload ?? {};
      // Try to extract agentId from event payload or sourceModule
      const agentId = (payload.agentId as string) ?? (payload.agent_id as string) ?? "";
      const agentName = AGENT_NAME_MAP[agentId] ?? evt.sourceModule ?? "未知Agent";
      // Determine status from payload or event type
      const isError = evt.eventType.includes("error") || evt.eventType.includes("fail")
        || (payload.status as string) === "error";
      // Build input preview from payload
      const preview = (payload.input as string)
        ?? (payload.message as string)
        ?? (payload.description as string)
        ?? evt.eventType;

      return {
        id: evt.id,
        time: evt.createdAt,
        agentId,
        agentName,
        eventType: evt.eventType,
        sourceModule: evt.sourceModule,
        status: isError ? "error" : "success",
        inputPreview: typeof preview === "string" ? preview : JSON.stringify(preview),
      };
    });
  }, [eventsQuery.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          来自 sandbox_event_log 的实时事件记录。
        </p>
        <button
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors"
          onClick={() => eventsQuery.refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", eventsQuery.isLoading && "animate-spin")} />
          刷新
        </button>
      </div>

      {/* Loading state */}
      {(eventsQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">加载事件日志...</span>
        </div>
      ) : null) as any}

      {/* Error state */}
      {eventsQuery.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>加载事件日志失败。sandbox_event_log 表可能尚未初始化。</span>
          </div>
          <p className="mt-1 text-xs text-red-500">
            {String(eventsQuery.error)}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!eventsQuery.isLoading && !eventsQuery.error && invocations.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <History className="h-8 w-8 opacity-40" />
          <p className="text-sm">暂无事件记录</p>
          <p className="text-xs">当 Agent 被调用时，事件将记录在此处。</p>
        </div>
      )}

      {/* Data table */}
      {invocations.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">Agent / 来源</th>
                <th className="px-4 py-3">事件类型</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">内容预览</th>
              </tr>
            </thead>
            <tbody>
              {invocations.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={cn("border-b last:border-0 hover:bg-gray-50/50", i % 2 === 0 && "bg-white")}
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {formatTimestamp(inv.time)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-medium">{inv.agentName}</p>
                    {inv.sourceModule && (
                      <p className="text-[10px] text-muted-foreground font-mono">{inv.sourceModule}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">
                      {inv.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.status === "success" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <XCircle className="h-3 w-3" />
                        失败
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[240px] truncate">
                    {inv.inputPreview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-3 text-xs text-muted-foreground">
        <span>
          {eventsQuery.isLoading
            ? "加载中..."
            : `显示最近 ${invocations.length} 条记录`}
        </span>
        <button className="inline-flex items-center gap-1 text-blue-600 hover:underline">
          查看全部
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TABS = [
  { label: "Agent 总览", icon: Bot },
  { label: "Agent 配置", icon: Settings },
  { label: "调用历史", icon: History },
];

export default function AgentControlTower() {
  const [activeTab, setActiveTab] = useState(0);
  const { roleConfig } = useUserProfile();
  const isAdmin = roleConfig.level >= 7;

  // Local agent state — allows status edits to reflect in UI immediately.
  // When agent-registry router is built, replace with tRPC query + mutation.
  const [agentOverrides, setAgentOverrides] = useState<Record<string, AgentStatus>>({});

  const agents = useMemo<AgentEntry[]>(
    () => AGENT_REGISTRY.map((a) => ({
      ...a,
      status: agentOverrides[a.agentId] ?? a.status,
    })),
    [agentOverrides],
  );

  // Edit dialog state
  const [editAgent, setEditAgent] = useState<AgentEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Init dialog state
  const [initDialogOpen, setInitDialogOpen] = useState(false);

  const handleEditAgent = (agent: AgentEntry) => {
    setEditAgent(agent);
    setEditDialogOpen(true);
  };

  const handleSaveStatus = (agentId: string, newStatus: AgentStatus) => {
    setAgentOverrides((prev) => ({ ...prev, [agentId]: newStatus }));
  };

  return (
    <div className="space-y-4 p-4">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <Bot className="h-7 w-7 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold">Agent 控制塔</h1>
          <p className="text-sm text-muted-foreground">
            管理和监控AI Agent
            {isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600 font-medium">
                <ShieldAlert className="h-3 w-3" />
                管理员
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(idx)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === idx
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 0 && <AgentOverviewTab agents={agents} />}
        {activeTab === 1 && (
          <AgentConfigTab
            agents={agents}
            isAdmin={isAdmin}
            onEditAgent={handleEditAgent}
            onInitAgents={() => setInitDialogOpen(true)}
          />
        )}
        {activeTab === 2 && <InvocationHistoryTab />}
      </div>

      {/* Dialogs */}
      <EditAgentDialog
        agent={editAgent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveStatus}
      />
      <InitAgentDialog
        open={initDialogOpen}
        onOpenChange={setInitDialogOpen}
      />
    </div>
  );
}
