import { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, TrendingUp, TrendingDown, Target, CheckCircle2,
  AlertTriangle, Star, Search, BarChart3, ArrowUpDown, MessageSquarePlus,
  ChevronRight, Eye, Calendar, Award, ThumbsDown, FileText, Briefcase,
  Activity, Gauge, ArrowUp, ArrowDown, Minus, UserSearch, Filter,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────
function getCurrentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getGradeColor(grade: string) {
  const m: Record<string, string> = { S: "text-yellow-500", A: "text-green-600", B: "text-blue-600", C: "text-orange-500", D: "text-red-600" };
  return m[grade] ?? "text-gray-500";
}
function getGradeBg(grade: string) {
  const m: Record<string, string> = { S: "bg-yellow-100 text-yellow-800", A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-orange-100 text-orange-800", D: "bg-red-100 text-red-800" };
  return m[grade] ?? "bg-gray-100";
}
function pct(v: string | number | null | undefined): string {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
}
function num(v: string | number | null | undefined): string {
  if (v == null) return "—";
  return String(Number(v).toFixed(1));
}
function trendIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUp className="w-3 h-3 text-green-600 inline" />;
  if (current < previous) return <ArrowDown className="w-3 h-3 text-red-600 inline" />;
  return <Minus className="w-3 h-3 text-gray-400 inline" />;
}

export default function ExecutiveReviewHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [periodType, setPeriodType] = useState("monthly");

  // ── Period Selector (shared) ──
  const periodSelector = (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Select value={periodType} onValueChange={setPeriodType}>
        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">月度</SelectItem>
          <SelectItem value="quarterly">季度</SelectItem>
          <SelectItem value="annual">年度</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="w-28 h-8 text-xs"
        value={period}
        onChange={e => setPeriod(e.target.value)}
        placeholder="2026-03"
      />
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="w-7 h-7 text-primary" />
            高管绩效总览中心
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            横向纵向 KPI 指标 · 任务完成 · 部门/项目/员工 · 多周期对比 · 评价管理
          </p>
        </div>
        {periodSelector}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs"><Building2 className="w-3.5 h-3.5 mr-1" />公司总览</TabsTrigger>
          <TabsTrigger value="department" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" />部门绩效</TabsTrigger>
          <TabsTrigger value="employee" className="text-xs"><UserSearch className="w-3.5 h-3.5 mr-1" />员工明细</TabsTrigger>
          <TabsTrigger value="project" className="text-xs"><Briefcase className="w-3.5 h-3.5 mr-1" />项目/OKR</TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs"><ArrowUpDown className="w-3.5 h-3.5 mr-1" />横向对比</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs"><MessageSquarePlus className="w-3.5 h-3.5 mr-1" />评价管理</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Company Overview ── */}
        <TabsContent value="overview">
          <CompanyOverviewTab period={period} periodType={periodType} onDrillDown={(dept: string) => { setActiveTab("department"); setSelectedDept(dept); }} />
        </TabsContent>

        {/* ── Tab 2: Department Performance ── */}
        <TabsContent value="department">
          <DepartmentTab period={period} periodType={periodType} />
        </TabsContent>

        {/* ── Tab 3: Employee Detail ── */}
        <TabsContent value="employee">
          <EmployeeTab period={period} />
        </TabsContent>

        {/* ── Tab 4: Project/OKR ── */}
        <TabsContent value="project">
          <ProjectTab period={period} />
        </TabsContent>

        {/* ── Tab 5: Horizontal Comparison ── */}
        <TabsContent value="comparison">
          <ComparisonTab period={period} periodType={periodType} />
        </TabsContent>

        {/* ── Tab 6: Reviews ── */}
        <TabsContent value="reviews">
          <ReviewTab period={period} periodType={periodType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 1: Company Overview
// ══════════════════════════════════════════════════════════════════
function CompanyOverviewTab({ period, periodType, onDrillDown }: { period: string; periodType: string; onDrillDown?: (dept: string) => void }) {
  const summary = trpc.executiveReview.dashboard.getSummary.useQuery({ period, periodType });
  const trend = trpc.executiveReview.company.getTrend.useQuery({ scopeType: "company", scopeId: "all", periodType, limit: 6 });

  if (summary.isLoading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  const co = summary.data?.company;
  const depts = summary.data?.departments ?? [];

  return (
    <div className="space-y-4">
      {/* Company KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard icon={<Users className="w-5 h-5" />} label="在岗人数" value={co?.activeEmployees ?? "—"} sub={`/ ${co?.totalEmployees ?? "—"} 总`} />
        <MetricCard icon={<Target className="w-5 h-5" />} label="平均KPI" value={num(co?.avgKpiScore)} sub={`完成率 ${pct(co?.kpiCompletionRate)}`} color={Number(co?.avgKpiScore) >= 80 ? "green" : Number(co?.avgKpiScore) >= 70 ? "blue" : "orange"} />
        <MetricCard icon={<CheckCircle2 className="w-5 h-5" />} label="任务完成率" value={pct(co?.taskCompletionRate)} sub={`${co?.totalTasksCompleted ?? 0}/${co?.totalTasksAssigned ?? 0}`} color={Number(co?.taskCompletionRate) >= 90 ? "green" : "orange"} />
        <MetricCard icon={<Activity className="w-5 h-5" />} label="准时率" value={pct(co?.onTimeRate)} sub={`逾期 ${co?.totalTasksOverdue ?? 0}`} color={Number(co?.onTimeRate) >= 90 ? "green" : "red"} />
        <MetricCard icon={<Award className="w-5 h-5" />} label="表彰" value={String(co?.totalRewards ?? 0)} sub={`处罚 ${co?.totalPenalties ?? 0}`} color="green" />
        <MetricCard icon={<BarChart3 className="w-5 h-5" />} label="OKR进度" value={pct(co?.okrProgressAvg)} sub="公司平均" color={Number(co?.okrProgressAvg) >= 70 ? "green" : "orange"} />
      </div>

      {/* KPI Distribution */}
      {co?.kpiDistribution && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">KPI等级分布</CardTitle></CardHeader>
          <CardContent>
            <KpiDistributionBar dist={co.kpiDistribution as any} />
          </CardContent>
        </Card>
      )}

      {/* Department Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> 各部门绩效概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-2">部门</th>
                  <th className="py-2 px-2 text-right">人数</th>
                  <th className="py-2 px-2 text-right">KPI均分</th>
                  <th className="py-2 px-2 text-right">KPI完成率</th>
                  <th className="py-2 px-2 text-right">任务完成率</th>
                  <th className="py-2 px-2 text-right">准时率</th>
                  <th className="py-2 px-2 text-right">质量分</th>
                  <th className="py-2 px-2 text-right">培训完成</th>
                  <th className="py-2 px-2 text-right">表彰/处罚</th>
                  <th className="py-2 px-2 text-right">OKR</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d: any) => (
                  <tr key={d.scopeId} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => onDrillDown?.(d.scopeId)}>
                    <td className="py-2 px-2 font-medium">{d.scopeName}</td>
                    <td className="py-2 px-2 text-right">{d.activeEmployees}/{d.totalEmployees}</td>
                    <td className="py-2 px-2 text-right font-semibold">{num(d.avgKpiScore)}</td>
                    <td className="py-2 px-2 text-right">{pct(d.kpiCompletionRate)}</td>
                    <td className="py-2 px-2 text-right">{pct(d.taskCompletionRate)}</td>
                    <td className="py-2 px-2 text-right">{pct(d.onTimeRate)}</td>
                    <td className="py-2 px-2 text-right">{num(d.avgTaskQuality)}</td>
                    <td className="py-2 px-2 text-right">{pct(d.trainingCompletionRate)}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-green-600">{d.totalRewards}</span>/<span className="text-red-500">{d.totalPenalties}</span>
                    </td>
                    <td className="py-2 px-2 text-right">{pct(d.okrProgressAvg)}</td>
                    <td className="py-2 px-2"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></td>
                  </tr>
                ))}
                {depts.length === 0 && (
                  <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">暂无数据，请检查周期设置</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart (simple bar representation) */}
      {trend.data && trend.data.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">公司KPI趋势（近6期）</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {[...trend.data].reverse().map((t: any) => {
                const score = Number(t.avgKpiScore) || 0;
                const h = Math.max(8, (score / 100) * 120);
                return (
                  <div key={t.period} className="flex flex-col items-center flex-1">
                    <span className="text-[10px] font-medium mb-1">{num(t.avgKpiScore)}</span>
                    <div className="w-full rounded-t" style={{ height: `${h}px`, background: score >= 80 ? "#22c55e" : score >= 70 ? "#3b82f6" : "#f97316" }} />
                    <span className="text-[10px] text-muted-foreground mt-1">{t.period}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 2: Department Performance
// ══════════════════════════════════════════════════════════════════
function DepartmentTab({ period, periodType }: { period: string; periodType: string }) {
  const [selectedDept, setSelectedDept] = useState("");
  const [subView, setSubView] = useState<"kpi" | "tasks" | "rewards">("kpi");

  const depts = trpc.executiveReview.company.getDepartmentComparison.useQuery({ period, periodType });
  const deptSnapshot = trpc.executiveReview.department.getSnapshot.useQuery(
    { department: selectedDept, period, periodType },
    { enabled: !!selectedDept },
  );
  const empKpis = trpc.executiveReview.department.getEmployeeKpis.useQuery(
    { department: selectedDept, period },
    { enabled: !!selectedDept && subView === "kpi" },
  );
  const empTasks = trpc.executiveReview.department.getTaskMetrics.useQuery(
    { department: selectedDept, period },
    { enabled: !!selectedDept && subView === "tasks" },
  );
  const empRewards = trpc.executiveReview.department.getRewardPenaltySummary.useQuery(
    { department: selectedDept, period },
    { enabled: !!selectedDept && subView === "rewards" },
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Department list (left) */}
      <div className="col-span-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">部门列表</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {(depts.data ?? []).map((d: any) => (
                <div
                  key={d.scopeId}
                  className={`px-3 py-2.5 cursor-pointer border-b hover:bg-muted/50 flex items-center justify-between ${selectedDept === d.scopeId ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  onClick={() => setSelectedDept(d.scopeId)}
                >
                  <div>
                    <div className="text-sm font-medium">{d.scopeName}</div>
                    <div className="text-[10px] text-muted-foreground">{d.activeEmployees}人 · KPI {num(d.avgKpiScore)}</div>
                  </div>
                  <KpiScoreBadge score={Number(d.avgKpiScore)} />
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Department detail (right) */}
      <div className="col-span-9 space-y-4">
        {!selectedDept ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">← 请选择部门查看详情</CardContent></Card>
        ) : (
          <>
            {/* Department summary cards */}
            {deptSnapshot.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard icon={<Target className="w-4 h-4" />} label="KPI均分" value={num(deptSnapshot.data.avgKpiScore)} color={Number(deptSnapshot.data.avgKpiScore) >= 80 ? "green" : "blue"} />
                <MetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="任务完成" value={pct(deptSnapshot.data.taskCompletionRate)} sub={`${deptSnapshot.data.totalTasksCompleted}/${deptSnapshot.data.totalTasksAssigned}`} />
                <MetricCard icon={<Activity className="w-4 h-4" />} label="准时率" value={pct(deptSnapshot.data.onTimeRate)} />
                <MetricCard icon={<Star className="w-4 h-4" />} label="培训完成" value={pct(deptSnapshot.data.trainingCompletionRate)} />
              </div>
            )}

            {/* Sub-view toggle */}
            <div className="flex gap-2">
              <Button size="sm" variant={subView === "kpi" ? "default" : "outline"} onClick={() => setSubView("kpi")}>KPI明细</Button>
              <Button size="sm" variant={subView === "tasks" ? "default" : "outline"} onClick={() => setSubView("tasks")}>任务指标</Button>
              <Button size="sm" variant={subView === "rewards" ? "default" : "outline"} onClick={() => setSubView("rewards")}>表彰处罚</Button>
            </div>

            {/* KPI sub-view */}
            {subView === "kpi" && (
              <Card>
                <CardContent className="pt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-2">员工ID</th>
                      <th className="py-2 px-2 text-right">KPI总分</th>
                      <th className="py-2 px-2 text-right">奖金系数</th>
                      <th className="py-2 px-2 text-right">状态</th>
                    </tr></thead>
                    <tbody>
                      {(empKpis.data ?? []).map((e: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">{e.employeeId}</td>
                          <td className="py-2 px-2 text-right font-semibold">{num(e.overallKpiScore)}</td>
                          <td className="py-2 px-2 text-right">{e.bonusCoefficient ?? "—"}</td>
                          <td className="py-2 px-2 text-right"><Badge variant="outline" className="text-[10px]">{e.status}</Badge></td>
                        </tr>
                      ))}
                      {(empKpis.data ?? []).length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">暂无数据</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Task metrics sub-view */}
            {subView === "tasks" && (
              <Card>
                <CardContent className="pt-4">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-2">员工ID</th>
                      <th className="py-2 px-2 text-right">分配</th>
                      <th className="py-2 px-2 text-right">完成</th>
                      <th className="py-2 px-2 text-right">准时</th>
                      <th className="py-2 px-2 text-right">迟交</th>
                      <th className="py-2 px-2 text-right">逾期</th>
                      <th className="py-2 px-2 text-right">质量分</th>
                      <th className="py-2 px-2 text-right">缺陷</th>
                    </tr></thead>
                    <tbody>
                      {(empTasks.data ?? []).map((e: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">{e.employeeId}</td>
                          <td className="py-2 px-2 text-right">{e.tasksAssigned}</td>
                          <td className="py-2 px-2 text-right">{e.tasksCompleted}</td>
                          <td className="py-2 px-2 text-right text-green-600">{e.tasksOnTime}</td>
                          <td className="py-2 px-2 text-right text-orange-500">{e.tasksLate}</td>
                          <td className="py-2 px-2 text-right text-red-500">{e.tasksOverdue}</td>
                          <td className="py-2 px-2 text-right font-semibold">{num(e.avgQualityScore)}</td>
                          <td className="py-2 px-2 text-right">{e.defectCount}</td>
                        </tr>
                      ))}
                      {(empTasks.data ?? []).length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">暂无数据</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Rewards/Penalties sub-view */}
            {subView === "rewards" && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {(empRewards.data ?? []).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs border-b pb-2">
                      {r.type === "reward" ? <Award className="w-4 h-4 text-green-500" /> : <ThumbsDown className="w-4 h-4 text-red-500" />}
                      <span className="flex-1">{r.employeeId} — {r.title}</span>
                      <Badge variant="outline" className={r.type === "reward" ? "text-green-600" : "text-red-500"}>{r.category}</Badge>
                      {r.amount && <span className="font-medium">¥{r.amount}</span>}
                    </div>
                  ))}
                  {(empRewards.data ?? []).length === 0 && <div className="py-6 text-center text-muted-foreground text-xs">暂无表彰/处罚记录</div>}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 3: Employee Detail
// ══════════════════════════════════════════════════════════════════
function EmployeeTab({ period }: { period: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [reportFilter, setReportFilter] = useState("monthly");

  const searchResults = trpc.executiveReview.employee.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 1 },
  );
  const profile = trpc.executiveReview.employee.getProfile.useQuery(
    { userId: selectedUserId!, period },
    { enabled: !!selectedUserId },
  );
  const kpiTrend = trpc.executiveReview.employee.getKpiTrend.useQuery(
    { userId: selectedUserId!, months: 12 },
    { enabled: !!selectedUserId },
  );
  const taskTrend = trpc.executiveReview.employee.getTaskTrend.useQuery(
    { userId: selectedUserId!, months: 6 },
    { enabled: !!selectedUserId },
  );
  const reports = trpc.executiveReview.employee.getReports.useQuery(
    { userId: selectedUserId!, reportType: reportFilter },
    { enabled: !!selectedUserId },
  );
  const feedback360 = trpc.executiveReview.employee.get360Feedback.useQuery(
    { userId: selectedUserId!, period },
    { enabled: !!selectedUserId },
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Search + employee list */}
      <div className="col-span-4 space-y-3">
        <Card>
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs"
                placeholder="搜索姓名 / 工号 / 部门..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[550px]">
              {(searchResults.data ?? []).map((u: any) => (
                <div
                  key={u.id}
                  className={`px-3 py-2.5 cursor-pointer border-b hover:bg-muted/50 ${selectedUserId === u.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground">{u.employeeId} · {u.department} · {u.position}</div>
                </div>
              ))}
              {searchQuery && (searchResults.data ?? []).length === 0 && (
                <div className="py-6 text-center text-muted-foreground text-xs">未找到匹配员工</div>
              )}
              {!searchQuery && <div className="py-6 text-center text-muted-foreground text-xs">输入姓名或工号开始搜索</div>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Employee detail */}
      <div className="col-span-8 space-y-4">
        {!selectedUserId ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">← 搜索并选择员工查看完整绩效档案</CardContent></Card>
        ) : (
          <>
            {/* Basic info + period KPI */}
            {profile.data && (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">{profile.data.user?.name ?? "—"}</h3>
                        <p className="text-xs text-muted-foreground">{profile.data.user?.employeeId} · {profile.data.user?.department} · {profile.data.user?.position}</p>
                      </div>
                      {profile.data.arenaRank && (
                        <div className="text-center">
                          <span className={`text-2xl font-black ${getGradeColor(profile.data.arenaRank.bonusTier ?? "B")}`}>
                            {profile.data.arenaRank.bonusTier}
                          </span>
                          <div className="text-[10px] text-muted-foreground">战力排名 #{profile.data.arenaRank.rankPosition}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Period snapshot cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard icon={<Target className="w-4 h-4" />} label="KPI总分" value={num(profile.data.kpiReview?.overallKpiScore)} color={Number(profile.data.kpiReview?.overallKpiScore) >= 80 ? "green" : "blue"} />
                  <MetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="任务完成" value={profile.data.taskMetric ? `${profile.data.taskMetric.tasksCompleted}/${profile.data.taskMetric.tasksAssigned}` : "—"} />
                  <MetricCard icon={<Star className="w-4 h-4" />} label="综合评分" value={num(profile.data.compositeScore?.aiCompositeScore)} sub={profile.data.compositeScore?.aiGrade ? `等级: ${profile.data.compositeScore.aiGrade}` : ""} />
                  <MetricCard icon={<Award className="w-4 h-4" />} label="表彰/处罚" value={`${profile.data.rewards.filter((r: any) => r.type === "reward").length}/${profile.data.rewards.filter((r: any) => r.type === "penalty").length}`} />
                </div>
              </>
            )}

            {/* KPI Trend */}
            {kpiTrend.data && kpiTrend.data.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">KPI月度趋势</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1.5 h-24">
                    {[...kpiTrend.data].reverse().map((t: any, i: number) => {
                      const score = Number(t.overallKpiScore) || 0;
                      const h = Math.max(6, (score / 100) * 90);
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 min-w-0">
                          <span className="text-[9px] font-medium">{score > 0 ? score.toFixed(0) : ""}</span>
                          <div className="w-full rounded-t" style={{ height: `${h}px`, background: score >= 80 ? "#22c55e" : score >= 70 ? "#3b82f6" : score > 0 ? "#f97316" : "#e5e7eb" }} />
                          <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">{t.monthDate?.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 360 Feedback */}
            {feedback360.data && feedback360.data.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">360°反馈</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {feedback360.data.map((fb: any) => (
                    <div key={fb.id} className="flex items-center gap-3 text-xs border-b pb-2">
                      <Badge variant="outline">{fb.relationship}</Badge>
                      <span className="font-medium">{fb.overallScore}分</span>
                      <span className="text-muted-foreground flex-1 truncate">{fb.strengths}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Periodic Reports */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">周期性报告</CardTitle>
                  <Select value={reportFilter} onValueChange={setReportFilter}>
                    <SelectTrigger className="w-20 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["daily", "weekly", "monthly", "quarterly", "annual"].map(rt => (
                        <SelectItem key={rt} value={rt}>{rt === "daily" ? "日报" : rt === "weekly" ? "周报" : rt === "monthly" ? "月报" : rt === "quarterly" ? "季报" : "年报"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(reports.data ?? []).slice(0, 10).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 text-xs border-b pb-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{r.period}</span>
                    <span className="text-muted-foreground flex-1 truncate">{r.title || r.reportType}</span>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    {r.kpiOverallScore && <span className="font-semibold">{num(r.kpiOverallScore)}</span>}
                  </div>
                ))}
                {(reports.data ?? []).length === 0 && <div className="py-4 text-center text-muted-foreground text-xs">暂无报告</div>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 4: Project / OKR
// ══════════════════════════════════════════════════════════════════
function ProjectTab({ period }: { period: string }) {
  const year = parseInt(period.split("-")[0]) || 2026;
  const [dept, setDept] = useState("");

  const okr = trpc.executiveReview.project.getOkrStatus.useQuery({ year, department: dept || undefined });
  const perfRecords = trpc.executiveReview.project.getByProject.useQuery({ period, limit: 30 });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input className="w-40 h-8 text-xs" placeholder="按部门筛选OKR..." value={dept} onChange={e => setDept(e.target.value)} />
      </div>

      {/* OKR Objectives */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />OKR目标 ({year})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(okr.data?.objectives ?? []).map((obj: any) => {
            const krs = (okr.data?.keyResults ?? []).filter((kr: any) => kr.objectiveId === obj.id);
            const avgProgress = krs.length > 0 ? krs.reduce((s: number, k: any) => s + (Number(k.progressPercent) || 0), 0) / krs.length : 0;
            return (
              <div key={obj.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold">{obj.code}</span>
                    <span className="text-xs ml-2">{obj.title}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">{obj.ownerDepartment}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{avgProgress.toFixed(0)}%</span>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, avgProgress)}%`, background: avgProgress >= 80 ? "#22c55e" : avgProgress >= 50 ? "#3b82f6" : "#f97316" }} />
                    </div>
                  </div>
                </div>
                {krs.length > 0 && (
                  <div className="pl-4 space-y-1">
                    {krs.map((kr: any) => (
                      <div key={kr.id} className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground w-16">{kr.code}</span>
                        <span className="flex-1">{kr.title}</span>
                        <span className="font-medium">{kr.progressPercent ?? 0}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {(okr.data?.objectives ?? []).length === 0 && <div className="py-6 text-center text-muted-foreground text-xs">暂无OKR目标数据</div>}
        </CardContent>
      </Card>

      {/* Performance Records */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />季度绩效记录</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground text-left">
              <th className="py-2 px-2">年份</th>
              <th className="py-2 px-2">季度</th>
              <th className="py-2 px-2 text-right">KPI</th>
              <th className="py-2 px-2 text-right">收入目标</th>
              <th className="py-2 px-2 text-right">实际收入</th>
              <th className="py-2 px-2 text-right">利润目标</th>
              <th className="py-2 px-2 text-right">实际利润</th>
              <th className="py-2 px-2 text-right">状态</th>
            </tr></thead>
            <tbody>
              {(perfRecords.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2">{r.year}</td>
                  <td className="py-2 px-2">Q{r.quarter}</td>
                  <td className="py-2 px-2 text-right font-semibold">{num(r.kpiScore)}</td>
                  <td className="py-2 px-2 text-right">{r.revenueTarget ? `¥${Number(r.revenueTarget).toLocaleString()}` : "—"}</td>
                  <td className="py-2 px-2 text-right">{r.revenueActual ? `¥${Number(r.revenueActual).toLocaleString()}` : "—"}</td>
                  <td className="py-2 px-2 text-right">{r.profitTarget ? `¥${Number(r.profitTarget).toLocaleString()}` : "—"}</td>
                  <td className="py-2 px-2 text-right">{r.profitActual ? `¥${Number(r.profitActual).toLocaleString()}` : "—"}</td>
                  <td className="py-2 px-2 text-right">
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    {r.isFrozen && <Badge variant="destructive" className="text-[10px] ml-1">冻结</Badge>}
                  </td>
                </tr>
              ))}
              {(perfRecords.data ?? []).length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">暂无记录</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 5: Horizontal Comparison
// ══════════════════════════════════════════════════════════════════
function ComparisonTab({ period, periodType }: { period: string; periodType: string }) {
  const [metric, setMetric] = useState<"avgKpiScore" | "taskCompletionRate" | "onTimeRate" | "avgTaskQuality" | "trainingCompletionRate" | "okrProgressAvg">("avgKpiScore");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const data = trpc.executiveReview.comparison.horizontal.useQuery({ period, periodType, metric, sortOrder });
  const arenaRankings = trpc.executiveReview.comparison.arenaRanking.useQuery({ period, limit: 20 });

  const metricLabels: Record<string, string> = {
    avgKpiScore: "KPI均分",
    taskCompletionRate: "任务完成率",
    onTimeRate: "准时率",
    avgTaskQuality: "质量分",
    trainingCompletionRate: "培训完成率",
    okrProgressAvg: "OKR进度",
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")}>
          <ArrowUpDown className="w-3 h-3 mr-1" />{sortOrder === "desc" ? "降序" : "升序"}
        </Button>
      </div>

      {/* Horizontal bar chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">部门{metricLabels[metric]}横向对比</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.data ?? []).map((d: any, i: number) => {
              const val = Number(d[metric === "avgKpiScore" ? "avgKpiScore" : metric === "taskCompletionRate" ? "taskCompletionRate" : metric === "onTimeRate" ? "onTimeRate" : metric === "avgTaskQuality" ? "avgTaskQuality" : metric === "trainingCompletionRate" ? "trainingCompletionRate" : "okrProgressAvg"]) || 0;
              const max = metric === "avgKpiScore" || metric === "avgTaskQuality" ? 100 : 100;
              const w = Math.min(100, (val / max) * 100);
              return (
                <div key={d.scopeId} className="flex items-center gap-3">
                  <span className="w-4 text-xs text-muted-foreground text-right">{i + 1}</span>
                  <span className="w-20 text-xs font-medium truncate">{d.scopeName}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full relative overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: val >= 85 ? "#22c55e" : val >= 70 ? "#3b82f6" : val >= 50 ? "#f97316" : "#ef4444" }} />
                    <span className="absolute right-2 top-0.5 text-[10px] font-medium">{metric.includes("Rate") || metric.includes("Avg") || metric === "okrProgressAvg" ? pct(val) : num(val)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Arena Rankings */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />战力排行榜</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(arenaRankings.data ?? []).slice(0, 20).map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 text-xs border rounded-lg px-3 py-2">
                <span className="font-bold w-6 text-center">#{r.rankPosition}</span>
                <span className={`text-lg font-black ${getGradeColor(r.bonusTier ?? "B")}`}>{r.bonusTier}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.entityName}</div>
                  <div className="text-[10px] text-muted-foreground">{r.entityType} · {r.department}</div>
                </div>
                <span className="font-bold">{num(r.comprehensiveScore)}</span>
                {r.rankChange != null && r.rankChange !== 0 && (
                  <span className={r.rankChange > 0 ? "text-green-500" : "text-red-500"}>
                    {r.rankChange > 0 ? `↑${r.rankChange}` : `↓${Math.abs(r.rankChange)}`}
                  </span>
                )}
              </div>
            ))}
          </div>
          {(arenaRankings.data ?? []).length === 0 && <div className="py-6 text-center text-muted-foreground text-xs">暂无排行数据</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 6: Review / Comments
// ══════════════════════════════════════════════════════════════════
function ReviewTab({ period, periodType }: { period: string; periodType: string }) {
  const [targetType, setTargetType] = useState<"department" | "employee" | "project" | "bu">("department");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(4);
  const [showForm, setShowForm] = useState(false);

  const myReviews = trpc.executiveReview.review.listByReviewer.useQuery({ limit: 30 });
  const targetReviews = trpc.executiveReview.review.listByTarget.useQuery(
    { targetType, targetId, period },
    { enabled: !!targetId },
  );
  const stats = trpc.executiveReview.review.getStats.useQuery({ period });
  const utils = trpc.useUtils();

  const createMut = trpc.executiveReview.review.create.useMutation({
    onSuccess: () => {
      utils.executiveReview.review.listByReviewer.invalidate();
      if (targetId) utils.executiveReview.review.listByTarget.invalidate();
      setComment("");
      setShowForm(false);
    },
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        {(stats.data ?? []).map((s: any) => (
          <Card key={s.targetType} className="flex-1">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold">{s.count}</div>
              <div className="text-[10px] text-muted-foreground">{s.targetType === "department" ? "部门评价" : s.targetType === "employee" ? "员工评价" : s.targetType === "project" ? "项目评价" : "事业部评价"}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="flex-1 cursor-pointer hover:bg-muted/50" onClick={() => setShowForm(true)}>
          <CardContent className="pt-3 pb-3 text-center">
            <MessageSquarePlus className="w-5 h-5 mx-auto text-primary" />
            <div className="text-[10px] text-muted-foreground mt-1">新增评价</div>
          </CardContent>
        </Card>
      </div>

      {/* New comment form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">新增评价</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">部门</SelectItem>
                  <SelectItem value="employee">员工</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="bu">事业部</SelectItem>
                </SelectContent>
              </Select>
              <Input className="h-8 text-xs" placeholder="目标ID（部门名/工号/项目号）" value={targetId} onChange={e => setTargetId(e.target.value)} />
              <Input className="h-8 text-xs" placeholder="目标名称" value={targetName} onChange={e => setTargetName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">评分:</span>
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-5 h-5 cursor-pointer ${s <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                  onClick={() => setRating(s)}
                />
              ))}
            </div>
            <Textarea className="text-xs" rows={3} placeholder="输入评价内容..." value={comment} onChange={e => setComment(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" disabled={!comment || !targetId || !targetName || createMut.isPending} onClick={() => createMut.mutate({
                targetType, targetId, targetName, period, periodType: periodType as any, rating, comment,
              })}>
                {createMut.isPending ? "提交中..." : "提交评价"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My reviews */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">我的评价记录</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(myReviews.data ?? []).map((r: any) => (
            <div key={r.id} className="flex items-start gap-3 text-xs border-b pb-2">
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating || 0 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{r.targetType}</Badge>
                  <span className="font-medium">{r.targetName}</span>
                  <span className="text-muted-foreground">{r.period}</span>
                </div>
                <p className="text-muted-foreground mt-1">{r.comment}</p>
              </div>
            </div>
          ))}
          {(myReviews.data ?? []).length === 0 && <div className="py-4 text-center text-muted-foreground text-xs">暂无评价记录</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Shared Components
// ══════════════════════════════════════════════════════════════════
function MetricCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  const colorCls = color === "green" ? "text-green-600" : color === "red" ? "text-red-600" : color === "orange" ? "text-orange-500" : color === "blue" ? "text-blue-600" : "";
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-[11px]">{label}</span></div>
        <div className={`text-xl font-bold ${colorCls}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function KpiScoreBadge({ score }: { score: number }) {
  const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
  return <Badge className={`${getGradeBg(grade)} text-[10px]`}>{grade} {score.toFixed(0)}</Badge>;
}

function KpiDistributionBar({ dist }: { dist: { S: number; A: number; B: number; C: number; D: number } }) {
  const total = dist.S + dist.A + dist.B + dist.C + dist.D;
  if (total === 0) return null;
  const segments = [
    { grade: "S", count: dist.S, color: "#eab308" },
    { grade: "A", count: dist.A, color: "#22c55e" },
    { grade: "B", count: dist.B, color: "#3b82f6" },
    { grade: "C", count: dist.C, color: "#f97316" },
    { grade: "D", count: dist.D, color: "#ef4444" },
  ];
  return (
    <div>
      <div className="flex h-6 rounded-lg overflow-hidden">
        {segments.map(s => s.count > 0 ? (
          <div key={s.grade} className="flex items-center justify-center text-white text-[10px] font-bold" style={{ width: `${(s.count / total) * 100}%`, background: s.color }}>
            {s.grade}:{s.count}
          </div>
        ) : null)}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        {segments.map(s => <span key={s.grade}>{s.grade}: {s.count}人 ({(s.count / total * 100).toFixed(0)}%)</span>)}
      </div>
    </div>
  );
}

// Export for unused function reference removal
let setSelectedDept: (d: string) => void = () => {};
