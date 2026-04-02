/**
 * ProjectCostSandbox — 项目成本对标与报价沙盘
 * Project Cost Benchmarking & Quotation Sandbox
 *
 * Allows project managers and BU managers to reference historical project costs
 * when preparing new quotations. Three core sections:
 *   1. 历史项目对标库 — filterable table of completed projects
 *   2. 新项目报价试算 — interactive quotation calculator with benchmark reference
 *   3. 工时成本模型 — formula panel with T1-T15 stage breakdown
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  Calculator, Search, Filter, ArrowRight, AlertTriangle,
  CheckCircle2, TrendingUp, TrendingDown, Clock, DollarSign,
  Factory, Users, Package, Target, BarChart3, Info,
  Sliders, ChevronRight, Copy, FileText, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface HistoricalProject {
  id: string;
  name: string;
  equipmentType: string;
  customerIndustry: string;
  scale: string;
  totalRevenue: number;
  totalCost: number;
  grossMarginPct: number;
  durationMonths: number;
  materialRatio: number;
  laborRatio: number;
  procurementRatio: number;
  t1t15Hours: number;
  completedDate: string;
}

interface T1T15Stage {
  stage: string;
  name: string;
  hours: number;
  department: string;
}

// ═══════════════════════════════════════════════════════════
// Demo Data — 5 Historical Cleaning Equipment Projects
// ═══════════════════════════════════════════════════════════

const DEMO_PROJECTS: HistoricalProject[] = [
  {
    id: "P2025-001",
    name: "BOSCH超声波清洗线",
    equipmentType: "超声波清洗设备",
    customerIndustry: "汽车零部件",
    scale: "大型 (12工位)",
    totalRevenue: 3_200_000,
    totalCost: 2_368_000,
    grossMarginPct: 26.0,
    durationMonths: 8,
    materialRatio: 0.35,
    laborRatio: 0.40,
    procurementRatio: 0.25,
    t1t15Hours: 4_200,
    completedDate: "2025-11-15",
  },
  {
    id: "P2025-002",
    name: "美利信喷淋清洗系统",
    equipmentType: "喷淋清洗设备",
    customerIndustry: "压铸件",
    scale: "中型 (6工位)",
    totalRevenue: 1_800_000,
    totalCost: 1_386_000,
    grossMarginPct: 23.0,
    durationMonths: 5,
    materialRatio: 0.30,
    laborRatio: 0.45,
    procurementRatio: 0.25,
    t1t15Hours: 2_800,
    completedDate: "2025-09-20",
  },
  {
    id: "P2025-003",
    name: "蔚来真空干燥清洗机",
    equipmentType: "真空清洗设备",
    customerIndustry: "新能源汽车",
    scale: "中大型 (8工位)",
    totalRevenue: 2_500_000,
    totalCost: 1_825_000,
    grossMarginPct: 27.0,
    durationMonths: 7,
    materialRatio: 0.38,
    laborRatio: 0.37,
    procurementRatio: 0.25,
    t1t15Hours: 3_500,
    completedDate: "2025-12-01",
  },
  {
    id: "P2025-004",
    name: "KUKA机器人清洗岛",
    equipmentType: "机器人清洗设备",
    customerIndustry: "精密制造",
    scale: "大型 (16工位)",
    totalRevenue: 4_500_000,
    totalCost: 3_195_000,
    grossMarginPct: 29.0,
    durationMonths: 10,
    materialRatio: 0.32,
    laborRatio: 0.38,
    procurementRatio: 0.30,
    t1t15Hours: 5_600,
    completedDate: "2026-01-10",
  },
  {
    id: "P2025-005",
    name: "华虹半导体级超净清洗线",
    equipmentType: "半导体级清洗设备",
    customerIndustry: "半导体",
    scale: "特大型 (20工位)",
    totalRevenue: 6_800_000,
    totalCost: 4_624_000,
    grossMarginPct: 32.0,
    durationMonths: 14,
    materialRatio: 0.40,
    laborRatio: 0.33,
    procurementRatio: 0.27,
    t1t15Hours: 7_800,
    completedDate: "2026-02-28",
  },
];

const T1_T15_TEMPLATE: T1T15Stage[] = [
  { stage: "T1", name: "方案设计", hours: 0, department: "设计部" },
  { stage: "T2", name: "结构设计", hours: 0, department: "设计部" },
  { stage: "T3", name: "电气设计", hours: 0, department: "电气部" },
  { stage: "T4", name: "软件开发", hours: 0, department: "软件部" },
  { stage: "T5", name: "零件加工", hours: 0, department: "加工车间" },
  { stage: "T6", name: "外协加工", hours: 0, department: "供应链" },
  { stage: "T7", name: "装配总装", hours: 0, department: "装配车间" },
  { stage: "T8", name: "管路安装", hours: 0, department: "装配车间" },
  { stage: "T9", name: "电气布线", hours: 0, department: "电气部" },
  { stage: "T10", name: "调试联调", hours: 0, department: "调试部" },
  { stage: "T11", name: "清洁度验证", hours: 0, department: "质量部" },
  { stage: "T12", name: "FAT验收", hours: 0, department: "项目部" },
  { stage: "T13", name: "包装发运", hours: 0, department: "物流部" },
  { stage: "T14", name: "现场安装", hours: 0, department: "售后部" },
  { stage: "T15", name: "SAT终验", hours: 0, department: "项目部" },
];

// Stage hour distribution ratios (benchmark-derived)
const STAGE_RATIOS: Record<string, number> = {
  T1: 0.06, T2: 0.10, T3: 0.08, T4: 0.07, T5: 0.10,
  T6: 0.05, T7: 0.15, T8: 0.06, T9: 0.07, T10: 0.10,
  T11: 0.04, T12: 0.03, T13: 0.02, T14: 0.04, T15: 0.03,
};

const EQUIPMENT_TYPES = [
  "超声波清洗设备", "喷淋清洗设备", "真空清洗设备", "机器人清洗设备", "半导体级清洗设备",
];

const INDUSTRIES = [
  "汽车零部件", "压铸件", "新能源汽车", "精密制造", "半导体", "航空航天", "3C电子",
];

// ═══════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════

function fmtCurrency(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function deviationBadge(current: number, benchmark: number): React.ReactNode {
  if (benchmark === 0) return null;
  const deviation = ((current - benchmark) / benchmark) * 100;
  const abs = Math.abs(deviation);
  if (abs <= 10) return null;
  const isOver = abs > 20;
  return (
    <Badge variant={isOver ? "destructive" : "secondary"} className="ml-2 text-xs">
      {deviation > 0 ? "+" : ""}{deviation.toFixed(0)}%
      {isOver && <AlertTriangle className="ml-1 h-3 w-3" />}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function ProjectCostSandbox() {
  // Real-time data from backend (falls back to demo)
  const benchmarksQuery = trpc.financeAdvanced.listBenchmarks.useQuery({ pageSize: 20 }, { retry: false, refetchOnWindowFocus: false });
  const isLive = !!benchmarksQuery.data && !benchmarksQuery.isError;

  // --- Filter state ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");

  // --- Benchmark selection ---
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);

  // --- New project form ---
  const [newEquipType, setNewEquipType] = useState(EQUIPMENT_TYPES[0]);
  const [sellingPrice, setSellingPrice] = useState(2_500_000);
  const [targetMargin, setTargetMargin] = useState(25);

  // --- Cost component adjustments (offset from benchmark, -30 to +30) ---
  const [materialAdj, setMaterialAdj] = useState(0);
  const [laborAdj, setLaborAdj] = useState(0);
  const [procurementAdj, setProcurementAdj] = useState(0);

  // --- Derived ---
  const filteredProjects = useMemo(() => {
    return DEMO_PROJECTS.filter((p) => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.id.includes(searchTerm)) return false;
      if (filterType !== "all" && p.equipmentType !== filterType) return false;
      if (filterIndustry !== "all" && p.customerIndustry !== filterIndustry) return false;
      return true;
    });
  }, [searchTerm, filterType, filterIndustry]);

  const benchmark = useMemo(() => {
    return DEMO_PROJECTS.find((p) => p.id === selectedBenchmarkId) ?? null;
  }, [selectedBenchmarkId]);

  const calculation = useMemo(() => {
    const targetCost = sellingPrice * (1 - targetMargin / 100);
    const bmMaterial = benchmark?.materialRatio ?? 0.35;
    const bmLabor = benchmark?.laborRatio ?? 0.40;
    const bmProcurement = benchmark?.procurementRatio ?? 0.25;

    const adjMaterial = bmMaterial * (1 + materialAdj / 100);
    const adjLabor = bmLabor * (1 + laborAdj / 100);
    const adjProcurement = bmProcurement * (1 + procurementAdj / 100);
    const totalRatio = adjMaterial + adjLabor + adjProcurement;

    // Normalize to 100%
    const normMaterial = adjMaterial / totalRatio;
    const normLabor = adjLabor / totalRatio;
    const normProcurement = adjProcurement / totalRatio;

    const materialBudget = targetCost * normMaterial;
    const laborBudget = targetCost * normLabor;
    const procurementBudget = targetCost * normProcurement;

    const projectedMargin = ((sellingPrice - targetCost) / sellingPrice) * 100;
    const theoreticalProfit = sellingPrice - targetCost;

    // T1-T15 hour budget (assume avg 150 CNY/hour labor rate)
    const laborRate = 150;
    const totalHours = laborBudget / laborRate;

    return {
      targetCost,
      materialBudget,
      laborBudget,
      procurementBudget,
      projectedMargin,
      theoreticalProfit,
      totalHours,
      normMaterial,
      normLabor,
      normProcurement,
    };
  }, [sellingPrice, targetMargin, benchmark, materialAdj, laborAdj, procurementAdj]);

  const t1t15Breakdown = useMemo(() => {
    return T1_T15_TEMPLATE.map((s) => ({
      ...s,
      hours: Math.round(calculation.totalHours * (STAGE_RATIOS[s.stage] ?? 0)),
    }));
  }, [calculation.totalHours]);

  const handleSelectBenchmark = useCallback((id: string) => {
    setSelectedBenchmarkId(id);
    const p = DEMO_PROJECTS.find((x) => x.id === id);
    if (p) {
      setNewEquipType(p.equipmentType);
      setSellingPrice(Math.round(p.totalRevenue * 1.05));
      setTargetMargin(Math.round(p.grossMarginPct));
      setMaterialAdj(0);
      setLaborAdj(0);
      setProcurementAdj(0);
    }
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-full gap-4 p-4 overflow-hidden">
        {/* ── Main Area ── */}
        <div className="flex-1 flex flex-col gap-4 overflow-auto min-w-0">

          {/* Data source indicator */}
          <div className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
            isLive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            {isLive ? '实时数据 · Live Data' : '演示数据 · Demo Mode — 连接后端API后显示实时经营数据'}
          </div>

          {/* ── Header ── */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Calculator className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold">项目成本对标与报价沙盘</h1>
              <p className="text-sm text-muted-foreground">参考历史项目成本结构，快速试算新项目报价</p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
             Section 1: 历史项目对标库
             ════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    历史项目对标库
                  </CardTitle>
                  <CardDescription>已完工项目成本结构参考 ({filteredProjects.length} 条记录)</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索项目..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-48 h-9"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="设备类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      {EQUIPMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="客户行业" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部行业</SelectItem>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[180px]">项目名称</TableHead>
                      <TableHead>设备类型</TableHead>
                      <TableHead>客户行业</TableHead>
                      <TableHead>规模</TableHead>
                      <TableHead className="text-right">总营收</TableHead>
                      <TableHead className="text-right">总成本</TableHead>
                      <TableHead className="text-right">毛利率</TableHead>
                      <TableHead className="text-right">周期</TableHead>
                      <TableHead className="text-center">材料/工时/采购</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedBenchmarkId === p.id && "bg-emerald-50 dark:bg-emerald-950/30"
                        )}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{p.equipmentType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.customerIndustry}</TableCell>
                        <TableCell className="text-sm">{p.scale}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtCurrency(p.totalRevenue)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtCurrency(p.totalCost)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={p.grossMarginPct >= 28 ? "default" : p.grossMarginPct >= 24 ? "secondary" : "outline"}
                            className={cn(
                              "text-xs font-mono",
                              p.grossMarginPct >= 28 && "bg-emerald-500 hover:bg-emerald-600",
                            )}
                          >
                            {fmtPct(p.grossMarginPct)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{p.durationMonths}个月</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <span className="text-orange-600">{(p.materialRatio * 100).toFixed(0)}%</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-blue-600">{(p.laborRatio * 100).toFixed(0)}%</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-purple-600">{(p.procurementRatio * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={selectedBenchmarkId === p.id ? "default" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => handleSelectBenchmark(p.id)}
                          >
                            {selectedBenchmarkId === p.id ? (
                              <><CheckCircle2 className="mr-1 h-3 w-3" /> 已选</>
                            ) : (
                              <><Copy className="mr-1 h-3 w-3" /> 用作参考</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProjects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          无匹配项目
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ════════════════════════════════════════════════════════
             Section 2: 新项目报价试算
             ════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-orange-500" />
                新项目报价试算
                {benchmark && (
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    基准: {benchmark.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {benchmark
                  ? "已选择对标项目，调整参数实时计算报价"
                  : "请先从上方对标库选择一个参考项目"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left: Input Parameters */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Sliders className="h-4 w-4" /> 项目参数
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">设备类型</Label>
                      <Select value={newEquipType} onValueChange={setNewEquipType}>
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">目标毛利率 (%)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={50}
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(Number(e.target.value))}
                        className="h-9 mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">设备售价 (CNY)</Label>
                    <Input
                      type="number"
                      min={100_000}
                      step={50_000}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="h-9 mt-1 font-mono"
                    />
                  </div>

                  {/* Cost Component Sliders */}
                  <div className="space-y-3 pt-2 border-t">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Layers className="h-4 w-4" /> 成本比例调整 (相对基准 {"\u00B1"}30%)
                    </h3>

                    {/* Material */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Package className="h-3 w-3 text-orange-500" /> 材料成本
                        </Label>
                        <span className="text-xs font-mono">
                          {materialAdj > 0 ? "+" : ""}{materialAdj}%
                          {deviationBadge(
                            calculation.materialBudget,
                            benchmark ? benchmark.totalCost * benchmark.materialRatio : 0
                          )}
                        </span>
                      </div>
                      <Slider
                        value={[materialAdj]}
                        min={-30}
                        max={30}
                        step={1}
                        onValueChange={([v]) => setMaterialAdj(v)}
                        className="py-1"
                      />
                    </div>

                    {/* Labor */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-500" /> 工时成本
                        </Label>
                        <span className="text-xs font-mono">
                          {laborAdj > 0 ? "+" : ""}{laborAdj}%
                          {deviationBadge(
                            calculation.laborBudget,
                            benchmark ? benchmark.totalCost * benchmark.laborRatio : 0
                          )}
                        </span>
                      </div>
                      <Slider
                        value={[laborAdj]}
                        min={-30}
                        max={30}
                        step={1}
                        onValueChange={([v]) => setLaborAdj(v)}
                        className="py-1"
                      />
                    </div>

                    {/* Procurement */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Factory className="h-3 w-3 text-purple-500" /> 采购成本
                        </Label>
                        <span className="text-xs font-mono">
                          {procurementAdj > 0 ? "+" : ""}{procurementAdj}%
                          {deviationBadge(
                            calculation.procurementBudget,
                            benchmark ? benchmark.totalCost * benchmark.procurementRatio : 0
                          )}
                        </span>
                      </div>
                      <Slider
                        value={[procurementAdj]}
                        min={-30}
                        max={30}
                        step={1}
                        onValueChange={([v]) => setProcurementAdj(v)}
                        className="py-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Calculation Results */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" /> 试算结果
                  </h3>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="目标成本"
                      value={fmtCurrency(calculation.targetCost)}
                      icon={<DollarSign className="h-4 w-4 text-red-500" />}
                      sub={`= 售价 x (1 - ${targetMargin}%)`}
                    />
                    <MetricCard
                      label="理论利润"
                      value={fmtCurrency(calculation.theoreticalProfit)}
                      icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                      sub={`毛利率 ${fmtPct(calculation.projectedMargin)}`}
                    />
                    <MetricCard
                      label="材料预算"
                      value={fmtCurrency(calculation.materialBudget)}
                      icon={<Package className="h-4 w-4 text-orange-500" />}
                      sub={`占比 ${fmtPct(calculation.normMaterial * 100)}`}
                    />
                    <MetricCard
                      label="工时预算"
                      value={fmtCurrency(calculation.laborBudget)}
                      icon={<Users className="h-4 w-4 text-blue-500" />}
                      sub={`${Math.round(calculation.totalHours)} 工时`}
                    />
                    <MetricCard
                      label="采购预算"
                      value={fmtCurrency(calculation.procurementBudget)}
                      icon={<Factory className="h-4 w-4 text-purple-500" />}
                      sub={`占比 ${fmtPct(calculation.normProcurement * 100)}`}
                    />
                    <MetricCard
                      label="T1-T15 总工时"
                      value={`${Math.round(calculation.totalHours).toLocaleString()} h`}
                      icon={<Clock className="h-4 w-4 text-cyan-500" />}
                      sub="按 150元/时折算"
                    />
                  </div>

                  {/* Benchmark Comparison */}
                  {benchmark && (
                    <div className="rounded-md border p-3 bg-muted/30">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                        <Info className="h-3 w-3" /> 与基准项目对比
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <CompareItem
                          label="营收"
                          current={sellingPrice}
                          benchmark={benchmark.totalRevenue}
                        />
                        <CompareItem
                          label="成本"
                          current={calculation.targetCost}
                          benchmark={benchmark.totalCost}
                        />
                        <CompareItem
                          label="毛利率"
                          current={calculation.projectedMargin}
                          benchmark={benchmark.grossMarginPct}
                          isPct
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ════════════════════════════════════════════════════════
           Section 3: 工时成本模型 (Sidebar Panel)
           ════════════════════════════════════════════════════════ */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-500" />
                工时成本模型
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Formula */}
              <div className="rounded-md border bg-slate-50 dark:bg-slate-900/50 p-3 text-xs space-y-1.5">
                <div className="font-semibold text-sm mb-2">核心公式</div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs">设备售价</Badge>
                  <span>-</span>
                  <Badge variant="outline" className="text-xs text-emerald-600">理论利润</Badge>
                  <span>-</span>
                  <Badge variant="outline" className="text-xs text-purple-600">采购成本</Badge>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span>=</span>
                  <Badge className="bg-blue-500 text-xs">可分配工时目标池</Badge>
                </div>
                <div className="border-t pt-2 mt-2 text-muted-foreground">
                  <p>工时目标池 = {fmtCurrency(calculation.laborBudget)}</p>
                  <p>工时单价 = 150 元/h (加权平均)</p>
                  <p>总可用工时 = {Math.round(calculation.totalHours).toLocaleString()} h</p>
                </div>
              </div>

              {/* T1-T15 Breakdown */}
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  T1-T15 阶段分配
                </h4>
                <div className="space-y-1.5">
                  {t1t15Breakdown.map((s) => (
                    <div key={s.stage} className="flex items-center gap-2 text-xs">
                      <span className="w-7 font-mono font-semibold text-muted-foreground">{s.stage}</span>
                      <span className="w-20 truncate">{s.name}</span>
                      <div className="flex-1">
                        <Progress
                          value={calculation.totalHours > 0 ? (s.hours / calculation.totalHours) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                      <span className="w-12 text-right font-mono">{s.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Allocation */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  部门分配汇总
                </h4>
                <DepartmentSummary stages={t1t15Breakdown} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function MetricCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function CompareItem({
  label,
  current,
  benchmark,
  isPct = false,
}: {
  label: string;
  current: number;
  benchmark: number;
  isPct?: boolean;
}) {
  const diff = current - benchmark;
  const isPositive = diff >= 0;
  return (
    <div className="text-center">
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className="font-mono font-semibold">
        {isPct ? fmtPct(current) : fmtCurrency(current)}
      </div>
      <div className={cn("text-xs font-mono", isPositive ? "text-emerald-600" : "text-red-600")}>
        {isPositive ? "+" : ""}
        {isPct ? `${diff.toFixed(1)}pp` : fmtCurrency(diff)}
      </div>
    </div>
  );
}

function DepartmentSummary({ stages }: { stages: T1T15Stage[] }) {
  const deptMap = new Map<string, number>();
  stages.forEach((s) => {
    deptMap.set(s.department, (deptMap.get(s.department) ?? 0) + s.hours);
  });
  const totalHours = stages.reduce((sum, s) => sum + s.hours, 0);
  const sorted = Array.from(deptMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-1.5">
      {sorted.map(([dept, hours]) => (
        <div key={dept} className="flex items-center gap-2 text-xs">
          <span className="w-16 truncate">{dept}</span>
          <div className="flex-1">
            <Progress
              value={totalHours > 0 ? (hours / totalHours) * 100 : 0}
              className="h-2"
            />
          </div>
          <span className="w-12 text-right font-mono">{hours}h</span>
          <span className="w-10 text-right text-muted-foreground font-mono">
            {totalHours > 0 ? ((hours / totalHours) * 100).toFixed(0) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}
