import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Calculator,
  Wallet,
  ArrowRight,
  Filter,
  Play,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

// ---- Types ----

interface TStageRow {
  stage: string;
  label: string;
  budget: number;
  actual: number;
}

interface TimeEntry {
  id: number;
  employee: string;
  wo: string;
  station: string;
  tStage: string;
  hours: number;
  source: "manual" | "uwb" | "kiosk";
  validated: boolean;
}

interface CostAlert {
  id: number;
  project: string;
  tStage: string;
  variance: number;
  severity: "critical" | "warning" | "info";
  rootCause: string;
  action: string;
}

interface AgingBucket {
  label: string;
  ap: number;
  ar: number;
}

// ---- Demo data ----

const projects = [
  { id: "GRT-2603-海外大众", name: "GRT-2603-海外大众" },
  { id: "GRT-2604-比亚迪", name: "GRT-2604-比亚迪" },
  { id: "GRT-2605-宁德时代", name: "GRT-2605-宁德时代" },
  { id: "GRT-2606-博世中国", name: "GRT-2606-博世中国" },
  { id: "GRT-2607-三一重工", name: "GRT-2607-三一重工" },
  { id: "GRT-2608-特斯拉供应链", name: "GRT-2608-特斯拉供应链" },
];

function makeTStages(seed: number): TStageRow[] {
  const labels = [
    "T01-下料", "T02-粗车", "T03-精车", "T04-装配", "T05-热处理",
    "T06-磨削", "T07-调试", "T08-组装", "T09-包装", "T10-终检",
    "T11-入库", "T12-发运", "T13-售后", "T14-工装", "T15-管理",
  ];
  return labels.map((label, i) => {
    const budget = 40000 + ((seed * 7 + i * 3000) % 60000);
    const variance = [-12, 5, -3, 15, 8, -6, 32, 2, -1, 10, -4, 7, 20, -8, 3][i];
    const actual = Math.round(budget * (1 + variance / 100));
    return { stage: `T${String(i + 1).padStart(2, "0")}`, label, budget, actual };
  });
}

const timeEntries: TimeEntry[] = [
  { id: 1, employee: "强兵兵", wo: "WO-2603-101", station: "WS-T01", tStage: "T01-下料", hours: 7.5, source: "uwb", validated: true },
  { id: 2, employee: "李明遂", wo: "WO-2603-101", station: "WS-T02", tStage: "T02-粗车", hours: 8.0, source: "kiosk", validated: true },
  { id: 3, employee: "张飞", wo: "WO-2603-102", station: "WS-T03", tStage: "T03-精车", hours: 9.5, source: "uwb", validated: false },
  { id: 4, employee: "吴卫成", wo: "WO-2603-102", station: "WS-T04", tStage: "T04-装配", hours: 6.0, source: "manual", validated: true },
  { id: 5, employee: "曹庆伟", wo: "WO-2603-103", station: "WS-T05", tStage: "T05-热处理", hours: 8.5, source: "uwb", validated: true },
  { id: 6, employee: "侯德朋", wo: "WO-2603-103", station: "WS-T06", tStage: "T06-磨削", hours: 7.0, source: "kiosk", validated: true },
  { id: 7, employee: "杜显文", wo: "WO-2604-201", station: "WS-T07", tStage: "T07-调试", hours: 11.0, source: "manual", validated: false },
  { id: 8, employee: "马林山", wo: "WO-2604-201", station: "WS-T08", tStage: "T08-组装", hours: 8.0, source: "uwb", validated: true },
  { id: 9, employee: "王金涛", wo: "WO-2604-202", station: "WS-T09", tStage: "T09-包装", hours: 5.5, source: "kiosk", validated: true },
  { id: 10, employee: "金晓锋", wo: "WO-2604-202", station: "WS-T10", tStage: "T10-终检", hours: 7.0, source: "uwb", validated: true },
  { id: 11, employee: "杨勇", wo: "WO-2605-301", station: "WS-T11", tStage: "T11-入库", hours: 4.0, source: "manual", validated: true },
  { id: 12, employee: "匡凯旋", wo: "WO-2605-301", station: "WS-T12", tStage: "T12-发运", hours: 6.5, source: "kiosk", validated: false },
  { id: 13, employee: "强兵兵", wo: "WO-2606-401", station: "WS-T01", tStage: "T13-售后", hours: 3.0, source: "manual", validated: true },
  { id: 14, employee: "李明遂", wo: "WO-2606-401", station: "WS-T02", tStage: "T14-工装", hours: 8.0, source: "uwb", validated: true },
  { id: 15, employee: "张飞", wo: "WO-2607-501", station: "WS-T03", tStage: "T15-管理", hours: 7.5, source: "kiosk", validated: true },
];

const standardHours: Record<string, number> = {
  "T01": 7.5, "T02": 8.0, "T03": 8.0, "T04": 7.0, "T05": 8.0,
  "T06": 7.5, "T07": 8.0, "T08": 8.0, "T09": 6.0, "T10": 7.0,
  "T11": 5.0, "T12": 6.0, "T13": 4.0, "T14": 8.0, "T15": 7.0,
};

const employees = ["强兵兵", "李明遂", "张飞", "吴卫成", "曹庆伟", "侯德朋"];
const days = ["周一", "周二", "周三", "周四", "周五"];
const heatmapData: number[][] = [
  [7.5, 8.0, 6.5, 8.0, 7.0],
  [8.0, 9.5, 8.0, 7.5, 8.0],
  [9.5, 10.5, 8.0, 11.0, 7.0],
  [6.0, 5.5, 7.0, 6.5, 4.0],
  [8.5, 8.0, 8.0, 8.5, 8.0],
  [7.0, 3.5, 8.0, 7.5, 12.5],
];

const costAlerts: CostAlert[] = [
  { id: 1, project: "GRT-2604-比亚迪", tStage: "T07-调试", variance: 32, severity: "critical", rootCause: "返工2次, 超声探头校准失败", action: "增加调试前预检, 更换备用探头" },
  { id: 2, project: "GRT-2603-海外大众", tStage: "T04-装配", variance: 15, severity: "warning", rootCause: "新员工效率低, 工艺不熟练", action: "导师带教, 增加SOP培训" },
  { id: 3, project: "GRT-2605-宁德时代", tStage: "T13-售后", variance: 20, severity: "warning", rootCause: "客户变更需求导致返修", action: "加强售前需求确认" },
  { id: 4, project: "GRT-2606-博世中国", tStage: "T03-精车", variance: -12, severity: "info", rootCause: "新刀具效率提升", action: "推广至其他工位" },
  { id: 5, project: "GRT-2608-特斯拉供应链", tStage: "T05-热处理", variance: 28, severity: "critical", rootCause: "炉温控制异常, 重新热处理", action: "检修设备, 增加温控传感器" },
];

const monthlyMargins = [
  { month: "2025-10", margin: 25.2 },
  { month: "2025-11", margin: 26.8 },
  { month: "2025-12", margin: 27.1 },
  { month: "2026-01", margin: 28.0 },
  { month: "2026-02", margin: 27.5 },
  { month: "2026-03", margin: 28.5 },
];

const agingBuckets: AgingBucket[] = [
  { label: "0-30天", ap: 520000, ar: 680000 },
  { label: "31-60天", ap: 380000, ar: 450000 },
  { label: "61-90天", ap: 210000, ar: 320000 },
  { label: "91-120天", ap: 90000, ar: 250000 },
  { label: "120+天", ap: 45000, ar: 100000 },
];

// ---- Helpers ----

function fmt(n: number): string {
  if (n >= 10000) return `\u00a5${(n / 10000).toFixed(1)}万`;
  return `\u00a5${n.toLocaleString()}`;
}

function varianceColor(pct: number): string {
  const abs = Math.abs(pct);
  if (pct <= 0) return "bg-green-500";
  if (abs <= 10) return "bg-blue-500";
  if (abs <= 25) return "bg-yellow-500";
  return "bg-red-500";
}

function heatColor(h: number): string {
  if (h > 12) return "bg-red-600 text-white";
  if (h > 10) return "bg-yellow-600 text-white";
  if (h >= 6) return "bg-green-600 text-white";
  if (h >= 4) return "bg-yellow-600/70 text-white";
  return "bg-gray-600 text-gray-300";
}

function severityIcon(s: CostAlert["severity"]) {
  if (s === "critical") return <XCircle className="h-4 w-4 text-red-400" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  return <Info className="h-4 w-4 text-blue-400" />;
}

function severityBorder(s: CostAlert["severity"]): string {
  if (s === "critical") return "border-red-500/50 bg-red-950/20";
  if (s === "warning") return "border-yellow-500/50 bg-yellow-950/20";
  return "border-blue-500/30 bg-blue-950/10";
}

const sourceBadge: Record<string, { label: string; cls: string }> = {
  manual: { label: "手动", cls: "bg-gray-600" },
  uwb: { label: "UWB", cls: "bg-blue-600" },
  kiosk: { label: "Kiosk", cls: "bg-purple-600" },
};

// ---- Component ----

export default function CostPlanningWorkbench() {
  const [selectedProject, setSelectedProject] = useState(projects[0].id);
  const [alertFilter, setAlertFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  // Simulation sliders
  const [laborRate, setLaborRate] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [materialRate, setMaterialRate] = useState(0);
  const [simulated, setSimulated] = useState(false);

  const projectSeed = projects.findIndex((p) => p.id === selectedProject);
  const tStages = useMemo(() => makeTStages(projectSeed), [projectSeed]);

  const totalBudget = tStages.reduce((s, t) => s + t.budget, 0);
  const totalActual = tStages.reduce((s, t) => s + t.actual, 0);
  const variancePct = ((totalActual - totalBudget) / totalBudget) * 100;
  const grossMarginPct = 28.5;

  const costStatus =
    variancePct <= 0 ? { label: "可控", cls: "bg-green-600" } :
    variancePct <= 10 ? { label: "可控", cls: "bg-green-600" } :
    variancePct <= 20 ? { label: "预警", cls: "bg-yellow-600" } :
    { label: "超支", cls: "bg-red-600" };

  const filteredAlerts = costAlerts.filter(
    (a) => alertFilter === "all" || a.severity === alertFilter
  );

  const critCount = costAlerts.filter((a) => a.severity === "critical").length;
  const warnCount = costAlerts.filter((a) => a.severity === "warning").length;
  const infoCount = costAlerts.filter((a) => a.severity === "info").length;

  // Simulation data
  const simStages = useMemo(() => {
    return tStages.slice(0, 5).map((t) => {
      const laborDelta = t.actual * 0.6 * (laborRate / 100);
      const matDelta = t.actual * 0.3 * (materialRate / 100);
      const delayPenalty = delayDays * 1500;
      const simCost = Math.round(t.actual + laborDelta + matDelta + delayPenalty);
      return { ...t, simCost, diff: simCost - t.actual };
    });
  }, [tStages, laborRate, materialRate, delayDays]);

  const totalSimImpact = simStages.reduce((s, t) => s + t.diff, 0);

  const maxBarBudget = Math.max(...tStages.map((t) => Math.max(t.budget, t.actual)));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-7 w-7" /> 工时成本规划工作台
        </h1>
        <p className="text-muted-foreground">
          Labor Cost Planning Workbench — T1-T15 全流程成本控制
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> 项目成本总览
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> 工时分析
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> 成本预警
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-1.5">
            <Calculator className="h-4 w-4" /> 多场景模拟
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> 财务仪表盘
          </TabsTrigger>
        </TabsList>

        {/* ======== Tab 1: Project Cost Overview ======== */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Project selector + summary cards */}
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="选择项目" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className={`${costStatus.cls} text-white`}>
              项目成本: {costStatus.label}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">总预算</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(totalBudget)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">实际成本</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(totalActual)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">偏差率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-1 ${variancePct > 0 ? "text-red-500" : "text-green-500"}`}>
                  {variancePct > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {variancePct > 0 ? "+" : ""}{variancePct.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">毛利率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{grossMarginPct}%</div>
              </CardContent>
            </Card>
          </div>

          {/* T1-T15 budget vs actual bars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">T1-T15 预算 vs 实际</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tStages.map((t) => {
                const pct = ((t.actual - t.budget) / t.budget) * 100;
                return (
                  <div key={t.stage} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-xs text-muted-foreground truncate">{t.label}</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-sm"
                          style={{ width: `${(t.budget / maxBarBudget) * 100}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{fmt(t.budget)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-2.5 rounded-sm ${varianceColor(pct)}`}
                          style={{ width: `${(t.actual / maxBarBudget) * 100}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{fmt(t.actual)}</span>
                      </div>
                    </div>
                    <span className={`w-12 text-xs text-right font-mono ${pct > 0 ? "text-red-500" : "text-green-500"}`}>
                      {pct > 0 ? "+" : ""}{pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== Tab 2: Hours Analysis ======== */}
        <TabsContent value="hours" className="space-y-4 mt-4">
          {/* Time entry table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">工时记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[360px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left">
                      <th className="py-2 px-2 font-medium">员工</th>
                      <th className="py-2 px-2 font-medium">工单</th>
                      <th className="py-2 px-2 font-medium">工位</th>
                      <th className="py-2 px-2 font-medium">T阶段</th>
                      <th className="py-2 px-2 font-medium text-right">工时(h)</th>
                      <th className="py-2 px-2 font-medium">来源</th>
                      <th className="py-2 px-2 font-medium text-center">已验证</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.map((e) => {
                      const sb = sourceBadge[e.source];
                      return (
                        <tr key={e.id} className="border-b hover:bg-muted/40">
                          <td className="py-1.5 px-2">{e.employee}</td>
                          <td className="py-1.5 px-2 font-mono text-xs">{e.wo}</td>
                          <td className="py-1.5 px-2">{e.station}</td>
                          <td className="py-1.5 px-2 text-xs">{e.tStage}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{e.hours.toFixed(1)}</td>
                          <td className="py-1.5 px-2">
                            <span className={`text-[10px] text-white px-1.5 py-0.5 rounded ${sb.cls}`}>
                              {sb.label}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {e.validated ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400 inline" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Standard vs Actual bars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">标准工时 vs 实际工时</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {Object.entries(standardHours).map(([key, std]) => {
                const entry = timeEntries.find((e) => e.tStage.startsWith(key));
                const actual = entry?.hours ?? std;
                const pct = Math.round((actual / std) * 100);
                const maxH = 12;
                const barColor = pct > 110 ? "bg-red-500" : pct > 100 ? "bg-yellow-500" : "bg-green-500";
                return (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="w-10 text-xs text-muted-foreground font-mono">{key}</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2 bg-gray-300 dark:bg-gray-600 rounded-sm"
                          style={{ width: `${(std / maxH) * 100}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{std}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-2 rounded-sm ${barColor}`}
                          style={{ width: `${(actual / maxH) * 100}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{actual}h</span>
                      </div>
                    </div>
                    <span className={`w-10 text-xs text-right font-mono ${pct > 100 ? "text-red-500" : "text-green-500"}`}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Utilization heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">员工利用率热力图</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th className="py-1 px-3 text-left font-medium text-muted-foreground">员工</th>
                      {days.map((d) => (
                        <th key={d} className="py-1 px-3 text-center font-medium text-muted-foreground">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, ei) => (
                      <tr key={emp}>
                        <td className="py-1 px-3 text-xs">{emp}</td>
                        {heatmapData[ei].map((h, di) => (
                          <td key={di} className="py-1 px-1">
                            <div className={`rounded text-center text-xs font-mono py-1 px-2 ${heatColor(h)}`}>
                              {h.toFixed(1)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600 inline-block" /> &lt;4h</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-600/70 inline-block" /> 4-6h</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> 6-8h</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-600 inline-block" /> &gt;10h</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block" /> &gt;12h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== Tab 3: Cost Alerts ======== */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          {/* Filter + counts */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["all", "critical", "warning", "info"] as const).map((f) => {
              const count = f === "all" ? costAlerts.length : f === "critical" ? critCount : f === "warning" ? warnCount : infoCount;
              const labels: Record<string, string> = { all: "全部", critical: "严重", warning: "警告", info: "信息" };
              return (
                <Button
                  key={f}
                  variant={alertFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAlertFilter(f)}
                >
                  {labels[f]} ({count})
                </Button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-red-500/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-500">{critCount}</div>
                  <div className="text-xs text-muted-foreground">严重预警</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{warnCount}</div>
                  <div className="text-xs text-muted-foreground">一般预警</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <Info className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-500">{infoCount}</div>
                  <div className="text-xs text-muted-foreground">信息提示</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert cards */}
          <div className="space-y-3">
            {filteredAlerts.map((a) => (
              <Card key={a.id} className={`border ${severityBorder(a.severity)}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {severityIcon(a.severity)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.project}</span>
                        <Badge variant="outline" className="text-xs">{a.tStage}</Badge>
                        <span className={`text-sm font-bold ${a.variance > 25 ? "text-red-500" : a.variance > 10 ? "text-yellow-500" : "text-blue-500"}`}>
                          超支{a.variance}%
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">原因:</span> {a.rootCause}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">建议:</span> {a.action}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======== Tab 4: Scenario Simulation ======== */}
        <TabsContent value="simulation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">参数调节</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Labor rate slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>人工费率变化</span>
                  <span className="font-mono font-bold">{laborRate > 0 ? "+" : ""}{laborRate}%</span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  value={laborRate}
                  onChange={(e) => { setLaborRate(Number(e.target.value)); setSimulated(false); }}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-20%</span><span>0</span><span>+20%</span>
                </div>
              </div>

              {/* Delay slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>工期延误</span>
                  <span className="font-mono font-bold">{delayDays} 天</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={delayDays}
                  onChange={(e) => { setDelayDays(Number(e.target.value)); setSimulated(false); }}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0天</span><span>15天</span><span>30天</span>
                </div>
              </div>

              {/* Material slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>材料成本变化</span>
                  <span className="font-mono font-bold">{materialRate > 0 ? "+" : ""}{materialRate}%</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  value={materialRate}
                  onChange={(e) => { setMaterialRate(Number(e.target.value)); setSimulated(false); }}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-30%</span><span>0</span><span>+30%</span>
                </div>
              </div>

              <Button onClick={() => setSimulated(true)} className="gap-2">
                <Play className="h-4 w-4" /> 运行模拟
              </Button>
            </CardContent>
          </Card>

          {simulated && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">模拟对比 (前5个T阶段)</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-2 font-medium">项目</th>
                        <th className="py-2 px-2 font-medium">T阶段</th>
                        <th className="py-2 px-2 font-medium text-right">原始成本</th>
                        <th className="py-2 px-2 font-medium text-right">模拟成本</th>
                        <th className="py-2 px-2 font-medium text-right">差异</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simStages.map((t) => (
                        <tr key={t.stage} className="border-b">
                          <td className="py-1.5 px-2 text-xs">{selectedProject}</td>
                          <td className="py-1.5 px-2 text-xs">{t.label}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{fmt(t.actual)}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{fmt(t.simCost)}</td>
                          <td className={`py-1.5 px-2 text-right font-mono ${t.diff > 0 ? "text-red-500" : t.diff < 0 ? "text-green-500" : ""}`}>
                            {t.diff > 0 ? "+" : ""}{fmt(t.diff)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className={totalSimImpact > 0 ? "border-yellow-500/40" : "border-green-500/40"}>
                <CardContent className="pt-4">
                  <div className="text-sm">
                    <span className="font-medium">模拟结果: </span>
                    {laborRate !== 0 && <span>人工费率{laborRate > 0 ? "+" : ""}{laborRate}%</span>}
                    {delayDays > 0 && <span>{laborRate !== 0 ? " + " : ""}工期延误{delayDays}天</span>}
                    {materialRate !== 0 && <span>{(laborRate !== 0 || delayDays > 0) ? " + " : ""}材料成本{materialRate > 0 ? "+" : ""}{materialRate}%</span>}
                    <span> 将导致总成本</span>
                    <span className={`font-bold ${totalSimImpact > 0 ? "text-red-500" : "text-green-500"}`}>
                      {totalSimImpact > 0 ? "增加" : "减少"} {fmt(Math.abs(totalSimImpact))}
                    </span>
                    <span> ({((totalSimImpact / totalActual) * 100).toFixed(1)}%)</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ======== Tab 5: Finance Dashboard ======== */}
        <TabsContent value="finance" className="space-y-4 mt-4">
          {/* 3 KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">毛利率 Gross Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">28.5%</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" /> 较上月 +1.0pp
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">现金头寸 Cash Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">\u00a52.3M</div>
                <div className="text-xs text-muted-foreground mt-1">可用流动资金</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">应收余额 Outstanding AR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">\u00a51.8M</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" /> 超期 \u00a5350K
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Margin trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">毛利趋势 (近6个月)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {monthlyMargins.map((m) => (
                <div key={m.month} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-xs text-muted-foreground font-mono">{m.month}</span>
                  <div className="flex-1 h-4 bg-muted rounded-sm relative">
                    <div
                      className="h-full bg-green-500/80 rounded-sm transition-all"
                      style={{ width: `${(m.margin / 35) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-xs">{m.margin}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AP / AR Aging */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">应付/应收账龄 AP/AR Aging</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2 font-medium">账龄</th>
                    {agingBuckets.map((b) => (
                      <th key={b.label} className="py-2 px-2 font-medium text-center">{b.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2 font-medium text-sm">应付 AP</td>
                    {agingBuckets.map((b) => (
                      <td key={b.label} className="py-2 px-2 text-center font-mono text-xs">{fmt(b.ap)}</td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 font-medium text-sm">应收 AR</td>
                    {agingBuckets.map((b) => (
                      <td key={b.label} className="py-2 px-2 text-center font-mono text-xs">{fmt(b.ar)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> 项目财务详情
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> 应收账龄
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> 应付账龄
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
