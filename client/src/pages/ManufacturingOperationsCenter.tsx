/**
 * 制造运营中心 — Manufacturing Operations Center
 * 6-Tab command center: 产能规划 | 工时看板 | 成本追踪 | 物流总览 | OEE分析 | 沙盘模拟
 */

import { useState, useMemo } from "react";
import {
  Factory, BarChart3, Clock, DollarSign, Truck, Activity,
  FlaskConical, AlertTriangle, CheckCircle, TrendingUp,
  TrendingDown, Zap, Users, Wrench, ArrowRight,
  BatteryCharging, Package, Warehouse, Target, Settings,
  Calendar, ShieldCheck, Brain, MapPin, Cpu, FileText,
  LayoutGrid, Layers, GitBranch, Database, Shield,
  Bot, Cog, Boxes,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface Station {
  id: string;
  name: string;
  plannedHours: number;
  actualHours: number;
  utilization: number;
  bottleneckScore: number;
}

interface DayForecast {
  day: string;
  planned: number;
  actual: number;
}

interface Employee {
  name: string;
  skills: Record<string, number>;
  avgHours: number;
}

interface CostProject {
  code: string;
  name: string;
  budget: number;
  actual: number;
  variance: number;
  status: "on-track" | "warning" | "critical";
}

interface AGVCard {
  code: string;
  status: "idle" | "transporting" | "charging" | "fault";
  battery: number;
  task: string | null;
}

interface TaskCard {
  code: string;
  from: string;
  to: string;
  status: "active" | "queued";
}

interface DowntimeCause {
  cause: string;
  count: number;
  hours: number;
}

interface SandboxEntry {
  number: number;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  path: string;
}

interface KPIGauge {
  name: string;
  current: string;
  target: string;
  status: "green" | "yellow" | "red";
}

// ═══════════════════════════════════════════════════════════
// Demo Data
// ═══════════════════════════════════════════════════════════

const STATIONS: Station[] = [
  { id: "T1",  name: "下料工位",     plannedHours: 160, actualHours: 148, utilization: 92.5,  bottleneckScore: 3 },
  { id: "T2",  name: "粗加工A",      plannedHours: 200, actualHours: 186, utilization: 93.0,  bottleneckScore: 4 },
  { id: "T3",  name: "粗加工B",      plannedHours: 200, actualHours: 178, utilization: 89.0,  bottleneckScore: 3 },
  { id: "T4",  name: "精加工",       plannedHours: 240, actualHours: 228, utilization: 95.0,  bottleneckScore: 6 },
  { id: "T5",  name: "热处理",       plannedHours: 120, actualHours: 110, utilization: 91.7,  bottleneckScore: 2 },
  { id: "T6",  name: "表面处理",     plannedHours: 100, actualHours: 88,  utilization: 88.0,  bottleneckScore: 2 },
  { id: "T7",  name: "调试工位",     plannedHours: 180, actualHours: 207, utilization: 115.0, bottleneckScore: 10 },
  { id: "T8",  name: "装配A",        plannedHours: 240, actualHours: 220, utilization: 91.7,  bottleneckScore: 5 },
  { id: "T9",  name: "装配B",        plannedHours: 240, actualHours: 215, utilization: 89.6,  bottleneckScore: 4 },
  { id: "T10", name: "电气安装",     plannedHours: 160, actualHours: 145, utilization: 90.6,  bottleneckScore: 3 },
  { id: "T11", name: "清洗",         plannedHours: 80,  actualHours: 72,  utilization: 90.0,  bottleneckScore: 2 },
  { id: "T12", name: "终检/包装",    plannedHours: 120, actualHours: 102, utilization: 85.0,  bottleneckScore: 2 },
];

const FORECAST_14D: DayForecast[] = Array.from({ length: 14 }, (_, i) => ({
  day: `3/${9 + i}`,
  planned: 140 + Math.floor(Math.random() * 40),
  actual: 130 + Math.floor(Math.random() * 50),
}));

const EMPLOYEES: Employee[] = [
  { name: "李明遂",  skills: { "机加工": 5, "装配": 3, "调试": 4, "清洗": 2, "电气": 1 }, avgHours: 11.2 },
  { name: "吴卫成",  skills: { "机加工": 2, "装配": 5, "调试": 3, "清洗": 4, "电气": 2 }, avgHours: 9.5 },
  { name: "李大鹏",  skills: { "机加工": 4, "装配": 4, "调试": 5, "清洗": 3, "电气": 3 }, avgHours: 10.8 },
  { name: "杜显文",  skills: { "机加工": 3, "装配": 2, "调试": 2, "清洗": 5, "电气": 4 }, avgHours: 3.2 },
  { name: "吕雪冬",  skills: { "机加工": 5, "装配": 4, "调试": 4, "清洗": 3, "电气": 5 }, avgHours: 12.1 },
  { name: "曹庆伟",  skills: { "机加工": 1, "装配": 5, "调试": 3, "清洗": 4, "电气": 2 }, avgHours: 8.0 },
  { name: "马林山",  skills: { "机加工": 4, "装配": 3, "调试": 5, "清洗": 2, "电气": 4 }, avgHours: 3.8 },
  { name: "沈龙翔",  skills: { "机加工": 3, "装配": 5, "调试": 2, "清洗": 3, "电气": 3 }, avgHours: 7.5 },
];

const SKILL_DOMAINS = ["机加工", "装配", "调试", "清洗", "电气"];

const COST_PROJECTS: CostProject[] = [
  { code: "P-2026-018", name: "美利信8800T输送线",   budget: 1200000, actual: 1380000, variance: 15.0,  status: "critical" },
  { code: "P-2026-022", name: "宁德时代电池壳体线", budget: 850000,  actual: 935000,  variance: 10.0,  status: "warning" },
  { code: "P-2026-025", name: "比亚迪底盘线",       budget: 600000,  actual: 648000,  variance: 8.0,   status: "warning" },
  { code: "P-2026-031", name: "博世ESP测试台",      budget: 450000,  actual: 477000,  variance: 6.0,   status: "warning" },
  { code: "P-2026-035", name: "华为光模块装配线",   budget: 380000,  actual: 361000,  variance: -5.0,  status: "on-track" },
];

const COST_TREND_30D = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  variance: -2 + Math.sin(i * 0.3) * 5 + (i > 20 ? 3 : 0),
}));

const AGV_FLEET: AGVCard[] = [
  { code: "AGV-001", status: "transporting", battery: 78, task: "TASK-043" },
  { code: "AGV-002", status: "transporting", battery: 62, task: "TASK-045" },
  { code: "AGV-003", status: "idle",         battery: 15, task: null },
  { code: "AGV-004", status: "idle",         battery: 91, task: null },
  { code: "AGV-005", status: "charging",     battery: 32, task: null },
  { code: "AGV-006", status: "idle",         battery: 85, task: null },
];

const ACTIVE_TASKS: TaskCard[] = [
  { code: "TASK-043", from: "装配区A", to: "装配区B", status: "active" },
  { code: "TASK-045", from: "测试区",  to: "成品暂存", status: "active" },
  { code: "TASK-047", from: "成品暂存", to: "发货区",  status: "queued" },
  { code: "TASK-048", from: "原料暂存", to: "装配区A", status: "queued" },
  { code: "TASK-049", from: "清洗区",  to: "测试区",   status: "queued" },
];

const WAREHOUSE_BARS = [
  { name: "原料库", pct: 72 },
  { name: "半成品", pct: 45 },
  { name: "成品",   pct: 88 },
  { name: "工具间", pct: 30 },
];

const OEE_30D = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  A: 85 + Math.floor(Math.random() * 12),
  P: 80 + Math.floor(Math.random() * 15),
  Q: 92 + Math.floor(Math.random() * 7),
}));

const DOWNTIME_PARETO: DowntimeCause[] = [
  { cause: "计划维护",   count: 18, hours: 45 },
  { cause: "物料缺件",   count: 8,  hours: 12 },
  { cause: "设备故障",   count: 5,  hours: 8 },
  { cause: "换型调整",   count: 12, hours: 6 },
  { cause: "质量停线",   count: 3,  hours: 4 },
  { cause: "工装磨损",   count: 4,  hours: 3.5 },
  { cause: "程序错误",   count: 2,  hours: 2 },
  { cause: "电力中断",   count: 1,  hours: 1.5 },
];

const SANDBOX_ENTRIES: SandboxEntry[] = [
  { number: 1,  name: "报价BOM沙盘",       icon: FileText,     description: "销售报价与BOM联动模拟",         path: "/sandbox/quoting-bom" },
  { number: 2,  name: "采购寻源沙盘",       icon: Package,      description: "供应商比价与寻源策略模拟",     path: "/sandbox/procurement" },
  { number: 3,  name: "智能排产沙盘",       icon: Calendar,     description: "APS排产与瓶颈分析模拟",       path: "/sandbox/scheduling" },
  { number: 4,  name: "质量追溯沙盘",       icon: ShieldCheck,  description: "全流程质量追溯与根因分析",     path: "/sandbox/quality" },
  { number: 5,  name: "成本规划沙盘",       icon: DollarSign,   description: "项目成本规划与预算控制",       path: "/sandbox/cost-planning" },
  { number: 6,  name: "仓储物流沙盘",       icon: Warehouse,    description: "库位优化与物流路径模拟",       path: "/sandbox/warehouse" },
  { number: 7,  name: "供应链沙盘",         icon: GitBranch,    description: "端到端供应链风险推演",         path: "/sandbox/supply-chain" },
  { number: 8,  name: "人力资源沙盘",       icon: Users,        description: "组织编制与技能缺口分析",       path: "/sandbox/hr" },
  { number: 9,  name: "设备维保沙盘",       icon: Wrench,       description: "预防性维护与OEE提升模拟",      path: "/sandbox/maintenance" },
  { number: 10, name: "现场交付沙盘",       icon: MapPin,       description: "FAT/SAT交付联调五大战役",      path: "/sandbox/site-delivery" },
  { number: 11, name: "工时报工沙盘",       icon: Clock,        description: "T1-T15工时归集与劳动力分析",   path: "/sandbox/labor" },
  { number: 12, name: "研发管线沙盘",       icon: FlaskConical, description: "新产品Stage-Gate推演",         path: "/sandbox/rnd-pipeline" },
  { number: 13, name: "Agent治理沙盘",      icon: Bot,          description: "AI Agent安全沙箱与审计",       path: "/sandbox/agent-governance" },
  { number: 14, name: "AGV物流沙盘",        icon: Truck,        description: "AGV路径规划与容量分析",        path: "/agv-logistics-sandbox" },
];

const KPI_GAUGES: KPIGauge[] = [
  { name: "OEE综合效率",     current: "87.3%",    target: "85%",      status: "green" },
  { name: "交付准时率",       current: "92.1%",    target: "95%",      status: "yellow" },
  { name: "项目成本偏差",     current: "+4.8%",    target: "<5%",      status: "green" },
  { name: "一次合格率",       current: "96.7%",    target: "95%",      status: "green" },
  { name: "人均产出工时",     current: "7.2h/d",   target: "8h/d",     status: "yellow" },
  { name: "库存周转天数",     current: "38天",     target: "30天",     status: "red" },
  { name: "设备故障率",       current: "2.1%",     target: "<3%",      status: "green" },
  { name: "AGV利用率",        current: "73.5%",    target: "75%",      status: "yellow" },
  { name: "BOM准确率",        current: "99.2%",    target: "99%",      status: "green" },
  { name: "供应商交期达成",   current: "88.4%",    target: "90%",      status: "yellow" },
  { name: "安全零事故天数",   current: "127天",    target: "持续",     status: "green" },
  { name: "客户满意度",       current: "4.6/5",    target: "4.5/5",    status: "green" },
];

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function utilColor(pct: number): string {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

function utilBg(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function agvStatusBadge(s: AGVCard["status"]): { label: string; cls: string } {
  switch (s) {
    case "idle":         return { label: "空闲",   cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
    case "transporting": return { label: "运输中", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
    case "charging":     return { label: "充电中", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" };
    case "fault":        return { label: "故障",   cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  }
}

function statusDot(s: KPIGauge["status"]): string {
  switch (s) {
    case "green":  return "bg-green-500";
    case "yellow": return "bg-yellow-500";
    case "red":    return "bg-red-500";
  }
}

function skillCellBg(level: number): string {
  switch (level) {
    case 5: return "bg-green-600 text-white";
    case 4: return "bg-green-400 text-white";
    case 3: return "bg-yellow-400 text-gray-900";
    case 2: return "bg-orange-300 text-gray-900";
    case 1: return "bg-red-300 text-gray-900";
    default: return "bg-gray-200 text-gray-600";
  }
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function ManufacturingOperationsCenter() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "产能规划", icon: BarChart3 },
    { label: "工时看板", icon: Clock },
    { label: "成本追踪", icon: DollarSign },
    { label: "物流总览", icon: Truck },
    { label: "OEE分析",  icon: Activity },
    { label: "沙盘模拟", icon: FlaskConical },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Factory className="h-7 w-7" /> 制造运营中心
        </h1>
        <p className="text-muted-foreground">Manufacturing Operations Center — 产能 &middot; 工时 &middot; 成本 &middot; 物流 &middot; OEE &middot; 沙盘</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <CapacityPlanningTab />}
      {activeTab === 1 && <LaborDashboardTab />}
      {activeTab === 2 && <CostTrackingTab />}
      {activeTab === 3 && <LogisticsOverviewTab />}
      {activeTab === 4 && <OEEAnalysisTab />}
      {activeTab === 5 && <SandboxHubTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 1: 产能规划
// ═══════════════════════════════════════════════════════════

function CapacityPlanningTab() {
  const maxBottleneck = Math.max(...STATIONS.map((s) => s.bottleneckScore));
  const bottleneckStation = STATIONS.find((s) => s.bottleneckScore === maxBottleneck)!;

  return (
    <div className="space-y-4">
      {/* Station load table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">工位负荷总览 (T1-T12)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">工位</th>
                  <th className="py-2 pr-3">名称</th>
                  <th className="py-2 pr-3 text-right">计划工时</th>
                  <th className="py-2 pr-3 text-right">实际工时</th>
                  <th className="py-2 pr-3 text-right">利用率%</th>
                  <th className="py-2 text-right">瓶颈评分</th>
                </tr>
              </thead>
              <tbody>
                {STATIONS.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-mono font-medium">{s.id}</td>
                    <td className="py-2 pr-3">{s.name}</td>
                    <td className="py-2 pr-3 text-right">{s.plannedHours}h</td>
                    <td className="py-2 pr-3 text-right">{s.actualHours}h</td>
                    <td className={`py-2 pr-3 text-right font-bold ${utilColor(s.utilization > 100 ? 100 : s.utilization)}`}>
                      {s.utilization.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right">
                      <span className={`font-bold ${s.bottleneckScore === maxBottleneck ? "text-red-600" : "text-muted-foreground"}`}>
                        {s.bottleneckScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 14-day forecast */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">14天产能预测</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-40">
            {FORECAST_14D.map((d, i) => {
              const maxH = 200;
              const pH = (d.planned / maxH) * 100;
              const aH = (d.actual / maxH) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: 120 }}>
                    <div className="flex-1 bg-blue-400/60 rounded-t" style={{ height: `${pH}%` }} title={`计划: ${d.planned}h`} />
                    <div className="flex-1 bg-green-400/60 rounded-t" style={{ height: `${aH}%` }} title={`实际: ${d.actual}h`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-400/60" /> 计划</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400/60" /> 实际</span>
          </div>
        </CardContent>
      </Card>

      {/* Bottleneck highlight */}
      <Card className="border-red-300 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
            <div>
              <div className="font-bold text-red-600">当前瓶颈: {bottleneckStation.id} {bottleneckStation.name}</div>
              <div className="text-sm text-muted-foreground">
                利用率: {bottleneckStation.utilization}%, 建议: 增加夜班或分流至相邻工位
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2: 工时看板
// ═══════════════════════════════════════════════════════════

function LaborDashboardTab() {
  // T1-T15 budget vs actual (simplified)
  const laborData = Array.from({ length: 15 }, (_, i) => ({
    stage: `T${i + 1}`,
    budget: 100 + Math.floor(Math.random() * 100),
    actual: 80 + Math.floor(Math.random() * 120),
  }));

  const overloaded = EMPLOYEES.filter((e) => e.avgHours > 10);
  const underutilized = EMPLOYEES.filter((e) => e.avgHours < 4);

  return (
    <div className="space-y-4">
      {/* T1-T15 horizontal bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">T1-T15 工时预算 vs 实际</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {laborData.map((d) => {
              const maxVal = Math.max(d.budget, d.actual, 1);
              return (
                <div key={d.stage} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-8 text-muted-foreground">{d.stage}</span>
                  <div className="flex-1 space-y-0.5">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(d.budget / 220) * 100}%` }} />
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.actual > d.budget ? "bg-red-500" : "bg-green-500"}`}
                        style={{ width: `${(d.actual / 220) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs w-20 text-right text-muted-foreground">{d.budget}/{d.actual}h</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /> 预算</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500" /> 实际(达标)</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> 实际(超标)</span>
          </div>
        </CardContent>
      </Card>

      {/* Skill matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">技能矩阵 (8员工 x 5领域)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left text-muted-foreground">员工</th>
                  {SKILL_DOMAINS.map((d) => (
                    <th key={d} className="py-2 px-2 text-center text-muted-foreground">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((e) => (
                  <tr key={e.name} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{e.name}</td>
                    {SKILL_DOMAINS.map((d) => (
                      <td key={d} className="py-2 px-2 text-center">
                        <span className={`inline-block w-7 h-7 leading-7 rounded text-xs font-bold ${skillCellBg(e.skills[d] || 0)}`}>
                          {e.skills[d] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TOP 5 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-red-300 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> 超负荷员工 ({">"}10h/day)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overloaded.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">无超负荷员工</div>
            ) : (
              <div className="space-y-2">
                {overloaded.map((e) => (
                  <div key={e.name} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-red-600 font-bold">{e.avgHours}h/day</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-gray-300 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-500 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> 低利用员工 ({"<"}4h/day)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {underutilized.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">无低利用员工</div>
            ) : (
              <div className="space-y-2">
                {underutilized.map((e) => (
                  <div key={e.name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-gray-500 font-bold">{e.avgHours}h/day</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 3: 成本追踪
// ═══════════════════════════════════════════════════════════

function CostTrackingTab() {
  const onTrack = COST_PROJECTS.filter((p) => p.status === "on-track").length;
  const warning = COST_PROJECTS.filter((p) => p.status === "warning").length;
  const critical = COST_PROJECTS.filter((p) => p.status === "critical").length;

  return (
    <div className="space-y-4">
      {/* 3 KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-300 dark:border-green-800">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-green-600">{onTrack}</div>
            <div className="text-sm text-muted-foreground">Projects On Track</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-300 dark:border-yellow-800">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-yellow-600">{warning}</div>
            <div className="text-sm text-muted-foreground">Warning</div>
          </CardContent>
        </Card>
        <Card className="border-red-300 dark:border-red-800">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-red-600">{critical}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Cost variance trend (30-day) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">成本偏差趋势 (30天)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0.5 h-24">
            {COST_TREND_30D.map((d, i) => {
              const baseline = 50; // 50% is zero line
              const h = Math.abs(d.variance) * 4;
              const isOver = d.variance > 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-center relative" style={{ height: 96 }}>
                  {isOver ? (
                    <div
                      className="w-full bg-red-400 rounded-t"
                      style={{ height: h, position: "absolute", bottom: 48 }}
                    />
                  ) : (
                    <div
                      className="w-full bg-green-400 rounded-b"
                      style={{ height: h, position: "absolute", top: 48 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-dashed border-gray-400 mt-0" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Day 1</span>
            <span className="text-center">--- 零偏差线 ---</span>
            <span>Day 30</span>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 overrun projects */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 5 超支项目</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">项目编号</th>
                  <th className="py-2 pr-3">项目名称</th>
                  <th className="py-2 pr-3 text-right">预算</th>
                  <th className="py-2 pr-3 text-right">实际</th>
                  <th className="py-2 pr-3 text-right">偏差%</th>
                  <th className="py-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {COST_PROJECTS.map((p) => (
                  <tr key={p.code} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-mono">{p.code}</td>
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3 text-right">{(p.budget / 10000).toFixed(1)}万</td>
                    <td className="py-2 pr-3 text-right">{(p.actual / 10000).toFixed(1)}万</td>
                    <td className={`py-2 pr-3 text-right font-bold ${p.variance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {p.variance > 0 ? "+" : ""}{p.variance.toFixed(1)}%
                    </td>
                    <td className="py-2">
                      <Badge
                        variant="outline"
                        className={
                          p.status === "on-track" ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" :
                          p.status === "warning"  ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700" :
                                                    "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
                        }
                      >
                        {p.status === "on-track" ? "正常" : p.status === "warning" ? "预警" : "严重"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 4: 物流总览
// ═══════════════════════════════════════════════════════════

function LogisticsOverviewTab() {
  return (
    <div className="space-y-4">
      {/* AGV fleet status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> AGV 车队状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {AGV_FLEET.map((a) => {
              const sb = agvStatusBadge(a.status);
              const batColor = a.battery > 50 ? "bg-green-500" : a.battery > 20 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={a.code} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm">{a.code}</span>
                    <Badge variant="outline" className={`text-xs ${sb.cls}`}>{sb.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${batColor}`} style={{ width: `${a.battery}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{a.battery}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{a.task || "待命"}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">活跃任务</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {ACTIVE_TASKS.map((t) => (
              <div key={t.code} className={`p-3 border rounded-lg ${t.status === "active" ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                <div className="font-mono font-medium text-sm mb-1">{t.code}</div>
                <div className="text-xs flex items-center gap-1">
                  <span>{t.from}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span>{t.to}</span>
                </div>
                <Badge variant="outline" className={`mt-2 text-xs ${t.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : ""}`}>
                  {t.status === "active" ? "进行中" : "排队中"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warehouse occupancy */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Warehouse className="h-4 w-4" /> 仓库占用率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {WAREHOUSE_BARS.map((w) => {
              const barColor = w.pct > 80 ? "bg-red-500" : w.pct > 60 ? "bg-yellow-500" : "bg-green-500";
              return (
                <div key={w.name} className="flex items-center gap-3">
                  <span className="text-sm w-16">{w.name}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${w.pct}%` }} />
                  </div>
                  <span className="text-sm font-mono w-12 text-right">{w.pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Material flow mini Sankey */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">物料流向</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2">
            {[
              { name: "原料库", count: 15 },
              { name: "装配区", count: 12 },
              { name: "清洗区", count: 10 },
              { name: "测试区", count: 8 },
              { name: "成品库", count: 9 },
            ].map((node, i, arr) => (
              <div key={node.name} className="flex items-center">
                <div className="bg-muted border rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-muted-foreground">{node.name}</div>
                  <div className="text-lg font-bold text-blue-600">{node.count}</div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-blue-400 mx-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 5: OEE分析
// ═══════════════════════════════════════════════════════════

function OEEAnalysisTab() {
  const currentMonth = useMemo(() => {
    const days: Array<{ day: number; oee: number }> = [];
    for (let d = 1; d <= 31; d++) {
      if (d <= 22) {
        const entry = OEE_30D[d - 1];
        const oee = entry ? Math.round((entry.A / 100) * (entry.P / 100) * (entry.Q / 100) * 100) : 0;
        days.push({ day: d, oee });
      } else {
        days.push({ day: d, oee: -1 }); // no data
      }
    }
    return days;
  }, []);

  return (
    <div className="space-y-4">
      {/* OEE trend: 30 days */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">OEE 三因子趋势 (30天) — A(可用率) / P(性能率) / Q(合格率)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-36">
            {OEE_30D.map((d, i) => (
              <div key={i} className="flex-1 flex gap-0.5 items-end" style={{ height: "100%" }}>
                <div className="flex-1 bg-blue-400 rounded-t" style={{ height: `${d.A - 40}%` }} title={`A: ${d.A}%`} />
                <div className="flex-1 bg-green-400 rounded-t" style={{ height: `${d.P - 40}%` }} title={`P: ${d.P}%`} />
                <div className="flex-1 bg-purple-400 rounded-t" style={{ height: `${d.Q - 40}%` }} title={`Q: ${d.Q}%`} />
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-400" /> A 可用率</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /> P 性能率</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-purple-400" /> Q 合格率</span>
          </div>
        </CardContent>
      </Card>

      {/* Downtime Pareto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">停机原因帕累托 (Top 8)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DOWNTIME_PARETO.map((d) => {
              const maxH = DOWNTIME_PARETO[0].hours;
              const pct = (d.hours / maxH) * 100;
              return (
                <div key={d.cause} className="flex items-center gap-3">
                  <span className="text-sm w-24 truncate">{d.cause}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">{d.count}次 / {d.hours}h</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Availability calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> 本月 OEE 日历 (3月)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
            ))}
            {/* Padding for March 2026 which starts on Sunday (offset 6) */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {currentMonth.map((d) => {
              let bg = "bg-gray-100 dark:bg-gray-800 text-muted-foreground";
              if (d.oee >= 85) bg = "bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300";
              else if (d.oee >= 70) bg = "bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300";
              else if (d.oee >= 0) bg = "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300";
              return (
                <div key={d.day} className={`text-center text-xs py-2 rounded ${bg}`} title={d.oee >= 0 ? `OEE: ${d.oee}%` : "无数据"}>
                  <div className="font-medium">{d.day}</div>
                  {d.oee >= 0 && <div className="text-[10px]">{d.oee}%</div>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50" /> &ge;85%</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/50" /> &ge;70%</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50" /> &lt;70%</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" /> 无数据</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 6: 沙盘模拟
// ═══════════════════════════════════════════════════════════

function SandboxHubTab() {
  return (
    <div className="space-y-6">
      {/* 14 sandbox entry cards */}
      <div>
        <h3 className="text-lg font-bold mb-3">沙盘场景入口</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {SANDBOX_ENTRIES.map((sb) => {
            const Icon = sb.icon;
            const circled = String.fromCodePoint(0x2460 + sb.number - 1); // ①②③...
            return (
              <Card key={sb.number} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-primary">{circled}</span>
                        <span className="text-sm font-bold truncate">{sb.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sb.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
                    进入
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 12 KPI Dashboard */}
      <div>
        <h3 className="text-lg font-bold mb-3">12 KPI 仪表盘</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {KPI_GAUGES.map((kpi) => (
            <Card key={kpi.name}>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusDot(kpi.status)}`} />
                  <span className="text-xs text-muted-foreground truncate">{kpi.name}</span>
                </div>
                <div className="text-xl font-bold">{kpi.current}</div>
                <div className="text-[10px] text-muted-foreground mt-1">目标: {kpi.target}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
