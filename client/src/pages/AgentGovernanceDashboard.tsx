/**
 * Agent Governance Dashboard — 数字员工HR部
 *
 * System admins manage all 13 agents here: status, risk level, category filter,
 * KPI overview, and lifecycle actions (edit/pause/publish/logs).
 *
 * Route: /admin/agent-governance
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  Activity,
  CheckCircle2,
  PauseCircle,
  FileEdit,
  Rocket,
  ScrollText,
  Zap,
  CircleDot,
  Filter,
  Search,
  TrendingUp,
  Cpu,
  Coins,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──
type AgentEnv = "sandbox" | "production";
type AgentStatus = "active" | "paused" | "draft";
type RiskLevel = "low" | "medium" | "high";
type AgentCategory =
  | "business"
  | "hr"
  | "finance"
  | "project"
  | "compliance"
  | "training"
  | "meeting"
  | "customer_portal"
  | "audit";

interface AgentRecord {
  id: string;
  name: string;
  slug: string;
  category: AgentCategory;
  categoryLabel: string;
  env: AgentEnv;
  status: AgentStatus;
  risk: RiskLevel;
  successRate: number;
  lastRun: string;
  version: string;
  dailyRuns: number;
  tokensToday: number;
}

// ── Demo data — 13 agents matching the existing fleet ──
const AGENTS: AgentRecord[] = [
  { id: "a1", name: "报价辅助Agent", slug: "quotation_assistant", category: "business", categoryLabel: "业务", env: "production", status: "active", risk: "low", successRate: 97.1, lastRun: "2分钟前", version: "v2.3.1", dailyRuns: 42, tokensToday: 1820 },
  { id: "a2", name: "财务审核Agent", slug: "finance_auditor", category: "finance", categoryLabel: "财务", env: "production", status: "active", risk: "medium", successRate: 93.5, lastRun: "8分钟前", version: "v1.7.0", dailyRuns: 31, tokensToday: 2140 },
  { id: "a3", name: "薪酬计算Agent", slug: "payroll_calculator", category: "hr", categoryLabel: "HR", env: "production", status: "active", risk: "high", successRate: 99.2, lastRun: "1小时前", version: "v3.0.2", dailyRuns: 8, tokensToday: 640 },
  { id: "a4", name: "项目进度Agent", slug: "project_tracker", category: "project", categoryLabel: "项目", env: "production", status: "active", risk: "low", successRate: 95.8, lastRun: "5分钟前", version: "v2.1.0", dailyRuns: 38, tokensToday: 1560 },
  { id: "a5", name: "规范检查Agent", slug: "compliance_checker", category: "compliance", categoryLabel: "规范", env: "production", status: "active", risk: "medium", successRate: 91.3, lastRun: "12分钟前", version: "v1.5.4", dailyRuns: 27, tokensToday: 980 },
  { id: "a6", name: "培训推荐Agent", slug: "training_recommender", category: "training", categoryLabel: "培训", env: "sandbox", status: "draft", risk: "low", successRate: 88.0, lastRun: "昨天 18:30", version: "v0.9.0", dailyRuns: 3, tokensToday: 120 },
  { id: "a7", name: "SOP生成Agent", slug: "sop_generator", category: "business", categoryLabel: "业务", env: "sandbox", status: "draft", risk: "medium", successRate: 85.6, lastRun: "昨天 14:20", version: "v0.8.2", dailyRuns: 5, tokensToday: 340 },
  { id: "a8", name: "故障诊断Agent", slug: "fault_diagnosis", category: "business", categoryLabel: "业务", env: "production", status: "active", risk: "medium", successRate: 92.7, lastRun: "20分钟前", version: "v2.0.1", dailyRuns: 19, tokensToday: 870 },
  { id: "a9", name: "会议纪要Agent", slug: "meeting_summarizer", category: "meeting", categoryLabel: "会议", env: "production", status: "active", risk: "low", successRate: 96.4, lastRun: "30分钟前", version: "v1.9.3", dailyRuns: 22, tokensToday: 1100 },
  { id: "a10", name: "客户门户Agent", slug: "customer_portal", category: "customer_portal", categoryLabel: "客户门户", env: "production", status: "active", risk: "low", successRate: 98.1, lastRun: "3分钟前", version: "v2.2.0", dailyRuns: 35, tokensToday: 1450 },
  { id: "a11", name: "预警扫描Agent", slug: "alert_scanner", category: "audit", categoryLabel: "审计", env: "production", status: "active", risk: "medium", successRate: 94.0, lastRun: "15分钟前", version: "v1.6.1", dailyRuns: 12, tokensToday: 520 },
  { id: "a12", name: "工时预测Agent", slug: "labor_forecast", category: "project", categoryLabel: "项目", env: "sandbox", status: "draft", risk: "medium", successRate: 82.3, lastRun: "昨天 10:00", version: "v0.7.0", dailyRuns: 2, tokensToday: 80 },
  { id: "a13", name: "供应商比价Agent", slug: "supplier_compare", category: "business", categoryLabel: "业务", env: "production", status: "paused", risk: "medium", successRate: 90.5, lastRun: "3天前", version: "v1.4.0", dailyRuns: 0, tokensToday: 0 },
];

const ALL_CATEGORIES: { key: AgentCategory | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "business", label: "业务" },
  { key: "hr", label: "HR" },
  { key: "finance", label: "财务" },
  { key: "project", label: "项目" },
  { key: "compliance", label: "规范" },
  { key: "training", label: "培训" },
  { key: "meeting", label: "会议" },
  { key: "customer_portal", label: "客户门户" },
  { key: "audit", label: "审计" },
];

// ── Helpers ──
const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "运行中", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  paused: { label: "已暂停", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: PauseCircle },
  draft: { label: "草稿", color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", icon: FileEdit },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: "低", color: "bg-emerald-500/10 text-emerald-600" },
  medium: { label: "中", color: "bg-amber-500/10 text-amber-600" },
  high: { label: "高", color: "bg-red-500/10 text-red-600" },
};

const ENV_CONFIG: Record<AgentEnv, { label: string; color: string }> = {
  production: { label: "生产", color: "bg-blue-500/10 text-blue-600" },
  sandbox: { label: "沙盘", color: "bg-purple-500/10 text-purple-600" },
};

function SuccessRateBar({ rate }: { rate: number }) {
  const color = rate >= 95 ? "bg-emerald-500" : rate >= 90 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-mono tabular-nums">{rate.toFixed(1)}%</span>
    </div>
  );
}

// ── Component ──
export default function AgentGovernanceDashboard() {
  // Real-time data from backend (falls back to demo)
  const agentsQuery = trpc.agentGovernance.listAgents.useQuery({ pageSize: 50 }, { retry: false, refetchOnWindowFocus: false });
  const isLive = !!agentsQuery.data && !agentsQuery.isError;

  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return AGENTS.filter((a) => {
      if (selectedCategory !== "all" && a.category !== selectedCategory) return false;
      if (search && !a.name.includes(search) && !a.slug.includes(search)) return false;
      return true;
    });
  }, [selectedCategory, search]);

  const totalActive = AGENTS.filter((a) => a.status === "active").length;
  const totalSandbox = AGENTS.filter((a) => a.env === "sandbox").length;
  const totalPaused = AGENTS.filter((a) => a.status === "paused").length;
  const dailyTotal = AGENTS.reduce((s, a) => s + a.dailyRuns, 0);
  const avgSuccess = AGENTS.reduce((s, a) => s + a.successRate, 0) / AGENTS.length;
  const tokensTotal = AGENTS.reduce((s, a) => s + a.tokensToday, 0);

  return (
    <div className="flex h-full">
      {/* ── Categories Sidebar ── */}
      <aside className="w-48 shrink-0 border-r bg-muted/30 p-3 space-y-1 hidden lg:block">
        <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          类别筛选
        </div>
        {ALL_CATEGORIES.map((c) => {
          const count = c.key === "all" ? AGENTS.length : AGENTS.filter((a) => a.category === c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => setSelectedCategory(c.key)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                selectedCategory === c.key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{c.label}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{count}</Badge>
            </button>
          );
        })}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Data source indicator */}
        <div className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
          isLive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          {isLive ? '实时数据 · Live Data' : '演示数据 · Demo Mode — 连接后端API后显示实时经营数据'}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              Agent 治理中心
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">数字员工HR部 — 全局Agent生命周期管理</p>
          </div>
        </div>

        {/* ── Top KPI Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                总Agent数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{AGENTS.length}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalActive} active / {totalSandbox} sandbox / {totalPaused} paused
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                日执行次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyTotal}</div>
              <p className="text-xs text-muted-foreground mt-0.5">今日累计</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                平均成功率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSuccess.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-0.5">across all agents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                Token消耗(今日)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(tokensTotal / 1000).toFixed(1)}K</div>
              <p className="text-xs text-muted-foreground mt-0.5">GPT-4o token usage</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Search ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索Agent名称或slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            {ALL_CATEGORIES.slice(0, 5).map((c) => (
              <Button
                key={c.key}
                variant={selectedCategory === c.key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="ml-auto text-xs">
            {filtered.length} / {AGENTS.length} agents
          </Badge>
        </div>

        {/* ── Agent Table ── */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Agent名称</TableHead>
                  <TableHead>类别</TableHead>
                  <TableHead>环境</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>风险等级</TableHead>
                  <TableHead>成功率</TableHead>
                  <TableHead>最近执行</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((agent) => {
                  const statusCfg = STATUS_CONFIG[agent.status];
                  const riskCfg = RISK_CONFIG[agent.risk];
                  const envCfg = ENV_CONFIG[agent.env];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CircleDot className={`w-3.5 h-3.5 ${agent.status === "active" ? "text-emerald-500" : agent.status === "paused" ? "text-amber-500" : "text-zinc-400"}`} />
                          <div>
                            <div className="font-medium text-sm">{agent.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{agent.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">{agent.categoryLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${envCfg.color} border-0`}>{envCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] border-0 ${riskCfg.color}`}>{riskCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <SuccessRateBar rate={agent.successRate} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{agent.lastRun}</TableCell>
                      <TableCell className="text-xs font-mono">{agent.version}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <FileEdit className="w-3 h-3 mr-1" />
                            编辑
                          </Button>
                          {agent.status === "active" ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-amber-600">
                              <PauseCircle className="w-3 h-3 mr-1" />
                              暂停
                            </Button>
                          ) : agent.status === "draft" ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600">
                              <Rocket className="w-3 h-3 mr-1" />
                              发布
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              恢复
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <ScrollText className="w-3 h-3 mr-1" />
                            日志
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      没有匹配的Agent
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
