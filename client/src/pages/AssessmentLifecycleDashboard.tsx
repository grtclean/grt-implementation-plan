import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Shield, AlertTriangle, CheckCircle2, Clock, Target,
  Play, ChevronRight, XCircle, BarChart3, Users, Workflow,
  BookOpen, Gavel, TrendingDown, ArrowRightLeft,
} from "lucide-react";

const TRIGGER_TYPE_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  onboarding: { zh: "入职", en: "Onboarding", color: "bg-blue-100 text-blue-800" },
  probation_end: { zh: "转正", en: "Regularization", color: "bg-green-100 text-green-800" },
  position_transfer: { zh: "岗位调整", en: "Transfer", color: "bg-purple-100 text-purple-800" },
  skill_upgrade_request: { zh: "技能提升", en: "Skill Upgrade", color: "bg-amber-100 text-amber-800" },
  grade_promotion: { zh: "级别提升", en: "Promotion", color: "bg-orange-100 text-orange-800" },
  points_below_threshold: { zh: "积分不足", en: "Low Points", color: "bg-red-100 text-red-800" },
  points_below_peers: { zh: "低于同岗", en: "Below Peers", color: "bg-red-100 text-red-800" },
  consecutive_low_kpi: { zh: "连续低KPI", en: "Low KPI", color: "bg-red-100 text-red-800" },
  cert_expiry: { zh: "证书到期", en: "Cert Expiry", color: "bg-yellow-100 text-yellow-800" },
  periodic_revalidation: { zh: "定期复评", en: "Revalidation", color: "bg-gray-100 text-gray-800" },
  manual: { zh: "手动触发", en: "Manual", color: "bg-gray-100 text-gray-800" },
};

const ENFORCEMENT_LABELS: Record<string, { zh: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }> }> = {
  revert_six_day_week: { zh: "恢复六天制", icon: Clock },
  revert_skill_level: { zh: "恢复原技能等级", icon: TrendingDown },
  position_penalty: { zh: "原岗处罚", icon: Gavel },
  salary_grade_freeze: { zh: "薪资等级冻结", icon: XCircle },
  benefit_revocation: { zh: "福利撤销", icon: XCircle },
  probation_extension: { zh: "试用期延长", icon: Clock },
  mandatory_training: { zh: "强制培训", icon: BookOpen },
  position_downgrade_warning: { zh: "岗位降级警告", icon: AlertTriangle },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  round_completed: "bg-amber-100 text-amber-700",
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  active: "bg-red-100 text-red-700",
  lifted: "bg-green-100 text-green-700",
};

export default function AssessmentLifecycleDashboard() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("overview");

  const statsQuery = trpc.assessmentLifecycle.dashboard.stats.useQuery();
  const rulesQuery = trpc.assessmentLifecycle.rules.list.useQuery({});
  const workflowsQuery = trpc.assessmentLifecycle.workflows.list.useQuery({});
  const enforcementsQuery = trpc.assessmentLifecycle.enforcements.list.useQuery({ status: "active" });
  const benchmarksQuery = trpc.assessmentLifecycle.benchmarks.list.useQuery({});
  const logsQuery = trpc.assessmentLifecycle.triggers.listLogs.useQuery({ limit: 20 });

  const stats = statsQuery.data;
  const rules = rulesQuery.data ?? [];
  const workflows = workflowsQuery.data ?? [];
  const enforcements = enforcementsQuery.data ?? [];
  const benchmarks = benchmarksQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            {isZh ? "测评生命周期管理" : "Assessment Lifecycle Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isZh
              ? "触发规则 · 多轮测评工作流 · 后果执行 · 岗位基准管理"
              : "Trigger Rules · Multi-Round Workflows · Enforcement · Benchmarks"}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="overview">{isZh ? "概览" : "Overview"}</TabsTrigger>
          <TabsTrigger value="rules">{isZh ? "触发规则" : "Rules"}</TabsTrigger>
          <TabsTrigger value="workflows">{isZh ? "测评工作流" : "Workflows"}</TabsTrigger>
          <TabsTrigger value="enforcements">{isZh ? "后果执行" : "Enforcements"}</TabsTrigger>
          <TabsTrigger value="benchmarks">{isZh ? "岗位基准" : "Benchmarks"}</TabsTrigger>
          <TabsTrigger value="logs">{isZh ? "触发记录" : "Trigger Logs"}</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{isZh ? "启用规则" : "Active Rules"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats?.activeRules ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{isZh ? "测评工作流" : "Total Workflows"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats?.totalWorkflows ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{isZh ? "进行中工作流" : "In Progress"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {(stats?.workflowsByStatus as any[])?.find((s: any) => s.status === "in_progress")?.count ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{isZh ? "执行中处罚" : "Active Enforcements"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats?.activeEnforcements ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent triggers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{isZh ? "最近触发事件" : "Recent Trigger Events"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "员工" : "Employee"}</TableHead>
                    <TableHead>{isZh ? "触发类型" : "Trigger Type"}</TableHead>
                    <TableHead>{isZh ? "规则" : "Rule"}</TableHead>
                    <TableHead>{isZh ? "结果" : "Outcome"}</TableHead>
                    <TableHead>{isZh ? "时间" : "Time"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((stats?.recentTriggers ?? []) as any[]).slice(0, 8).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>#{t.employeeId}</TableCell>
                      <TableCell>
                        <Badge className={TRIGGER_TYPE_LABELS[t.triggerType]?.color ?? ""}>
                          {TRIGGER_TYPE_LABELS[t.triggerType]?.[isZh ? "zh" : "en"] ?? t.triggerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.ruleCode}</TableCell>
                      <TableCell>
                        <Badge variant={t.outcome === "passed" ? "default" : "secondary"}>
                          {t.outcome ?? "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {((stats?.recentTriggers ?? []) as any[]).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {isZh ? "暂无触发记录" : "No trigger events yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Scoring rules summary */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {isZh ? "考试评分规则" : "Scoring Rules"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold">{isZh ? "单轮测评" : "Single-Round"}</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• L1 {isZh ? "入门" : "Entry"}: ≥60{isZh ? "分通过" : " to pass"}</li>
                    <li>• L2 {isZh ? "熟练" : "Proficient"}: ≥70{isZh ? "分通过" : " to pass"}</li>
                    <li>• L3 {isZh ? "精通" : "Advanced"}: ≥80{isZh ? "分通过" : " to pass"}</li>
                    <li>• L4 {isZh ? "专家" : "Expert"}: ≥85{isZh ? "分通过" : " to pass"}</li>
                    <li>• L5 {isZh ? "大师" : "Master"}: ≥90{isZh ? "分通过" : " to pass"}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">{isZh ? "多轮测评 (提升/转岗)" : "Multi-Round (Upgrade/Transfer)"}</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {isZh ? "第1轮 笔试" : "Round 1 Written"}: 40% {isZh ? "权重" : "weight"}, ≥70{isZh ? "分" : ""}</li>
                    <li>• {isZh ? "第2轮 实操" : "Round 2 Practical"}: 30% {isZh ? "权重" : "weight"}, ≥70{isZh ? "分" : ""}</li>
                    <li>• {isZh ? "第3轮 面试评审" : "Round 3 Interview"}: 30% {isZh ? "权重" : "weight"}, ≥70{isZh ? "分" : ""}</li>
                    <li>• {isZh ? "综合分 = 加权平均" : "Overall = weighted average"}</li>
                    <li>• {isZh ? "任一必修轮未通过 → 整体不通过" : "Any mandatory round fail → overall fail"}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">{isZh ? "时间轴" : "Timeline"}</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {isZh ? "入职测评: 入职30天内" : "Onboarding: within 30 days"}</li>
                    <li>• {isZh ? "转正测评: 试用期满前14天" : "Regularization: 14 days before probation end"}</li>
                    <li>• {isZh ? "提升测评: 申请后30天内" : "Upgrade: within 30 days of request"}</li>
                    <li>• {isZh ? "复评: 触发后7-14天内" : "Remedial: 7-14 days after trigger"}</li>
                    <li>• {isZh ? "重考冷却: 30-90天" : "Retry cooldown: 30-90 days"}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">{isZh ? "面试评审标准" : "Interview Criteria"}</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {isZh ? "专业知识深度" : "Domain Knowledge"}: 30%</li>
                    <li>• {isZh ? "问题解决能力" : "Problem Solving"}: 25%</li>
                    <li>• {isZh ? "沟通表达能力" : "Communication"}: 20%</li>
                    <li>• {isZh ? "团队协作意识" : "Teamwork"}: 15%</li>
                    <li>• {isZh ? "职业素养" : "Professionalism"}: 10%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Rules ── */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? "测评触发规则" : "Assessment Trigger Rules"}</CardTitle>
              <CardDescription>
                {isZh ? "配置各类测评触发条件、后果和重试策略" : "Configure trigger conditions, consequences, and retry policies"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "规则代码" : "Code"}</TableHead>
                    <TableHead>{isZh ? "规则名称" : "Name"}</TableHead>
                    <TableHead>{isZh ? "触发类型" : "Type"}</TableHead>
                    <TableHead>{isZh ? "多轮" : "Multi"}</TableHead>
                    <TableHead>{isZh ? "重试次数" : "Retries"}</TableHead>
                    <TableHead>{isZh ? "冷却天数" : "Cooldown"}</TableHead>
                    <TableHead>{isZh ? "宽限期" : "Grace"}</TableHead>
                    <TableHead>{isZh ? "后果数" : "Consequences"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.ruleCode}</TableCell>
                      <TableCell className="font-medium">{r.ruleName}</TableCell>
                      <TableCell>
                        <Badge className={TRIGGER_TYPE_LABELS[r.triggerType]?.color ?? ""}>
                          {TRIGGER_TYPE_LABELS[r.triggerType]?.[isZh ? "zh" : "en"] ?? r.triggerType}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.isMultiRound ? "✓" : "—"}</TableCell>
                      <TableCell>{r.maxRetries}</TableCell>
                      <TableCell>{r.retryCooldownDays}{isZh ? "天" : "d"}</TableCell>
                      <TableCell>{r.gracePeriodDays}{isZh ? "天" : "d"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {((r.failureConsequences ?? []) as any[]).length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.isActive ? "default" : "secondary"}>
                          {r.isActive ? (isZh ? "启用" : "Active") : (isZh ? "禁用" : "Disabled")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Workflows ── */}
        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5" />
                {isZh ? "多轮测评工作流" : "Multi-Round Assessment Workflows"}
              </CardTitle>
              <CardDescription>
                {isZh ? "笔试→实操→面试评审，各轮进度跟踪" : "Written → Practical → Interview, per-round progress tracking"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{isZh ? "员工" : "Employee"}</TableHead>
                    <TableHead>{isZh ? "岗位" : "Position"}</TableHead>
                    <TableHead>{isZh ? "目标等级" : "Target"}</TableHead>
                    <TableHead>{isZh ? "目的" : "Purpose"}</TableHead>
                    <TableHead>{isZh ? "进度" : "Progress"}</TableHead>
                    <TableHead>{isZh ? "综合分" : "Score"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                    <TableHead>{isZh ? "截止日期" : "Deadline"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono">{w.id}</TableCell>
                      <TableCell>#{w.employeeId}</TableCell>
                      <TableCell>{w.positionKey}</TableCell>
                      <TableCell><Badge>{w.targetLevel}</Badge></TableCell>
                      <TableCell className="text-xs">{w.purpose}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {w.currentRound}/{w.totalRounds}
                        </span>
                      </TableCell>
                      <TableCell>{w.overallScore ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[w.status] ?? ""}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{w.deadline ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {workflows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        {isZh ? "暂无工作流" : "No workflows yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Enforcements ── */}
        <TabsContent value="enforcements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-red-600" />
                {isZh ? "后果执行记录" : "Enforcement Actions"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? "测评未通过后的处罚执行：恢复六天制、降级技能等级、原岗处罚等"
                  : "Consequences after assessment failure: schedule revert, skill downgrade, penalties"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{isZh ? "员工" : "Employee"}</TableHead>
                    <TableHead>{isZh ? "处罚类型" : "Type"}</TableHead>
                    <TableHead>{isZh ? "描述" : "Description"}</TableHead>
                    <TableHead>{isZh ? "开始日期" : "Start"}</TableHead>
                    <TableHead>{isZh ? "结束日期" : "End"}</TableHead>
                    <TableHead>{isZh ? "状态" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enforcements.map((e: any) => {
                    const label = ENFORCEMENT_LABELS[e.enforcementType];
                    const Icon = label?.icon ?? AlertTriangle;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono">{e.id}</TableCell>
                        <TableCell>#{e.employeeId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Icon className="w-4 h-4 text-red-500" />
                            <span className="text-sm">{label?.zh ?? e.enforcementType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{e.description}</TableCell>
                        <TableCell className="text-xs">{e.startDate}</TableCell>
                        <TableCell className="text-xs">{e.endDate ?? "—"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[e.status] ?? ""}>
                            {e.status === "active" ? (isZh ? "执行中" : "Active") : e.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {enforcements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {isZh ? "无执行中处罚" : "No active enforcements"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Benchmarks ── */}
        <TabsContent value="benchmarks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {isZh ? "岗位基准分配置" : "Position Benchmark Scores"}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? "各岗位积分/KPI基准值，用于触发「积分低于阈值」和「低于同岗10%」规则"
                  : "Per-position point/KPI benchmarks for threshold and peer-comparison triggers"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isZh ? "岗位" : "Position"}</TableHead>
                    <TableHead>{isZh ? "期间" : "Period"}</TableHead>
                    <TableHead>{isZh ? "平均积分" : "Avg Points"}</TableHead>
                    <TableHead>{isZh ? "平均KPI" : "Avg KPI"}</TableHead>
                    <TableHead>{isZh ? "最低积分阈值" : "Min Points"}</TableHead>
                    <TableHead>{isZh ? "10%同岗阈值" : "10% Peer"}</TableHead>
                    <TableHead>{isZh ? "人数" : "Count"}</TableHead>
                    <TableHead>{isZh ? "手动" : "Manual"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.positionKey}</TableCell>
                      <TableCell>{b.period}</TableCell>
                      <TableCell>{b.avgPoints ?? "—"}</TableCell>
                      <TableCell>{b.avgKpiScore ?? "—"}</TableCell>
                      <TableCell className="text-red-600 font-semibold">{b.minAcceptablePoints ?? "—"}</TableCell>
                      <TableCell className="text-amber-600">{b.peerThreshold10Pct ?? "—"}</TableCell>
                      <TableCell>{b.employeeCount}</TableCell>
                      <TableCell>{b.isManualOverride ? "✓" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trigger Logs ── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? "触发事件记录" : "Trigger Event Logs"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{isZh ? "员工" : "Employee"}</TableHead>
                    <TableHead>{isZh ? "触发类型" : "Type"}</TableHead>
                    <TableHead>{isZh ? "规则" : "Rule"}</TableHead>
                    <TableHead>{isZh ? "岗位" : "Position"}</TableHead>
                    <TableHead>{isZh ? "目标等级" : "Target"}</TableHead>
                    <TableHead>{isZh ? "截止日期" : "Due"}</TableHead>
                    <TableHead>{isZh ? "结果" : "Outcome"}</TableHead>
                    <TableHead>{isZh ? "处罚" : "Enforced"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono">{l.id}</TableCell>
                      <TableCell>#{l.employeeId}</TableCell>
                      <TableCell>
                        <Badge className={TRIGGER_TYPE_LABELS[l.triggerType]?.color ?? ""}>
                          {TRIGGER_TYPE_LABELS[l.triggerType]?.[isZh ? "zh" : "en"] ?? l.triggerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.ruleCode}</TableCell>
                      <TableCell>{l.positionKey ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.targetLevel ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{l.dueDate ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[l.outcome] ?? "bg-gray-100"}>
                          {l.outcome ?? "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {l.enforcementApplied ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        {isZh ? "暂无触发记录" : "No trigger logs"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
