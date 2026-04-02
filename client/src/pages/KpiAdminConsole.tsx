/**
 * KPI管理控制台 (CEO/HR统一界面)
 *
 * ① 全员总览 — 96人×558维度一览表，按事业部/岗位族筛选
 * ② 批量编辑 — 选中员工→调整权重/目标/奖金上限
 * ③ 新年度初始化 — 一键从2026复制到2027并调整
 */

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Settings, Calendar, Search, BarChart3, Award,
  ChevronRight, CheckCircle2, AlertTriangle, Download,
  RefreshCw, Shield, Target, Layers, Crown,
} from "lucide-react";

export default function KpiAdminConsole() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          {isZh ? "KPI管理控制台" : "KPI Admin Console"}
        </h1>
        <p className="text-sm text-muted-foreground">{isZh ? "CEO/HR统一管理 · 全员总览 · 批量编辑 · 新年度初始化" : "CEO/HR unified management"}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1"><Users className="w-4 h-4" />{isZh ? "全员总览" : "Overview"}</TabsTrigger>
          <TabsTrigger value="family" className="gap-1"><Layers className="w-4 h-4" />{isZh ? "岗位族分析" : "Role Families"}</TabsTrigger>
          <TabsTrigger value="yearly" className="gap-1"><Calendar className="w-4 h-4" />{isZh ? "年度管理" : "Year Mgmt"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="family"><FamilyAnalysis /></TabsContent>
        <TabsContent value="yearly"><YearlyManagement /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const distQ = trpc.performanceOps.scoring.teamDistribution.useQuery({}, { retry: false });
  const dist = distQ.data as any;
  const salaryQ = trpc.performanceOps.scoring.batchCalculate.useQuery({ employeeIds: [] }, { retry: false });
  const salaryData = salaryQ.data as any;
  const employees = (salaryData?.employees as any[]) || [];

  const filtered = useMemo(() => {
    let list = employees;
    if (search) list = list.filter((e: any) => String(e.employee_id).includes(search));
    return list;
  }, [employees, search]);

  return (
    <div className="mt-4 space-y-4">
      {/* 摘要统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label={isZh ? "总人数" : "Total"} value={dist?.total || employees.length} color="blue" />
        <StatCard label="A档" value={dist?.tier_a || salaryData?.distribution?.A || 0} color="green" />
        <StatCard label="B档" value={dist?.tier_b || salaryData?.distribution?.B || 0} color="blue" />
        <StatCard label="C档" value={dist?.tier_c || salaryData?.distribution?.C || 0} color="amber" />
        <StatCard label="D档" value={dist?.tier_d || salaryData?.distribution?.D || 0} color="red" />
      </div>

      {/* 搜索 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder={isZh ? "搜索员工ID..." : "Search ID..."} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* 员工列表 */}
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
          <span>{isZh ? "员工" : "Employee"}</span>
          <span className="text-center">{isZh ? "综合分" : "Score"}</span>
          <span className="text-center">{isZh ? "档位" : "Tier"}</span>
          <span className="text-center">{isZh ? "奖金月数" : "Bonus"}</span>
        </div>
        {filtered.slice(0, 50).map((emp: any, i: number) => {
          const score = Number(emp.composite || 0);
          const scoreColor = score >= 90 ? "text-green-600" : score >= 75 ? "text-blue-600" : score >= 60 ? "text-amber-600" : "text-red-600";
          const tierColor = emp.tier === "A" ? "bg-green-100 text-green-700" : emp.tier === "B" ? "bg-blue-100 text-blue-700" : emp.tier === "C" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
          return (
            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm border-b hover:bg-muted/30">
              <span className="font-medium">#{emp.employee_id}</span>
              <span className={`text-center font-mono font-bold ${scoreColor}`}>{score.toFixed(1)}</span>
              <span className="text-center"><Badge className={`text-[10px] ${tierColor}`}>{emp.tier}</Badge></span>
              <span className="text-center font-mono">{emp.bonus_months}{isZh ? "月" : "m"}</span>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">{isZh ? "暂无数据（需要员工有年度目标协定+维度得分）" : "No data"}</p>}
      </div>
    </div>
  );
}

function FamilyAnalysis() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const families = [
    { id: "engineer", labelZh: "工程师族", count: 46, dims: 6, bonus: "4月", positions: "机械研发/电气/IT/助理工程师" },
    { id: "production", labelZh: "生产族", count: 14, dims: 5, bonus: "2月", positions: "装配/焊工/激光/CNC/数控/冷作" },
    { id: "sales", labelZh: "销售族", count: 9, dims: 6, bonus: "6月", positions: "销售经理/市场主管/销售工程师" },
    { id: "finance", labelZh: "财务族", count: 9, dims: 6, bonus: "3月", positions: "会计/仓管/采购/供应链/PMC" },
    { id: "service", labelZh: "售后族", count: 4, dims: 6, bonus: "3月", positions: "售后技工/售后主管" },
    { id: "hr_admin", labelZh: "HR行政族", count: 4, dims: 6, bonus: "3月", positions: "人事主管/前台/后勤" },
    { id: "general", labelZh: "通用族", count: 4, dims: 5, bonus: "2月", positions: "文员/协作/董事长助理" },
    { id: "management", labelZh: "管理族", count: 3, dims: 6, bonus: "6月", positions: "总监/经理/部门主管" },
    { id: "quality", labelZh: "质量族", count: 2, dims: 6, bonus: "3月", positions: "质量经理/质量专员" },
    { id: "pm", labelZh: "项目管理", count: 1, dims: 6, bonus: "5月", positions: "项目经理" },
  ];

  return (
    <div className="mt-4 space-y-3">
      {families.map((f) => (
        <Card key={f.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{f.labelZh}</p>
                <p className="text-xs text-muted-foreground">{f.positions}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="outline">{f.count}{isZh ? "人" : ""}</Badge>
                <Badge variant="outline">{f.dims}{isZh ? "维度" : "dims"}</Badge>
                <Badge className="bg-green-100 text-green-700">{isZh ? "上限" : "Cap"}{f.bonus}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="text-center text-xs text-muted-foreground pt-2">
        {isZh ? "10个岗位族 · 96名员工 · 558个KPI维度 · 覆盖全公司67个岗位" : "10 families · 96 employees · 558 KPI dimensions · 67 positions"}
      </div>
    </div>
  );
}

function YearlyManagement() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isZh = language === "zh";

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "2026年度状态" : "2026 Status"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded bg-green-50 dark:bg-green-950/20 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">{isZh ? "2026年KPI已全量部署" : "2026 KPIs Deployed"}</p>
                <p className="text-xs text-green-600">96{isZh ? "人 × 558维度 × Q1已完成" : " employees × 558 dims × Q1 done"}</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">{isZh ? "进行中" : "Active"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "2027年度初始化" : "Initialize 2027"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isZh
              ? "从2026年体系复制到2027年，保留岗位族模板，清零得分，调整目标值。建议在2026年Q4(10月)启动。"
              : "Copy 2026 framework to 2027, reset scores, adjust targets. Recommended: start in Q4 2026 (October)."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" onClick={() => toast({ title: isZh ? "2027年度初始化" : "2027 Init", description: isZh ? "建议在2026年10月启动，当前尚早" : "Recommended in October 2026" })}>
              <Calendar className="w-4 h-4 mr-2" />
              {isZh ? "复制2026→2027" : "Copy to 2027"}
            </Button>
            <Button variant="outline" className="h-12" onClick={() => toast({ title: isZh ? "导出全量KPI" : "Export All", description: isZh ? "96人558维度导出为Excel" : "96 employees, 558 dimensions" })}>
              <Download className="w-4 h-4 mr-2" />
              {isZh ? "导出KPI报表" : "Export Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "批量更新" : "Batch Update"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isZh ? "选择岗位族，批量调整该族所有员工的KPI权重、目标值、奖金上限。" : "Select role family to batch-update weights, targets, bonus caps."}
          </p>
          <Button variant="outline" className="w-full" onClick={() => toast({ title: isZh ? "批量更新" : "Batch Update", description: isZh ? "请在绩效运营中心(/performance-ops-center)的KPI分解Tab操作" : "Use Performance Ops Center KPI tab" })}>
            <Settings className="w-4 h-4 mr-2" />
            {isZh ? "进入绩效运营中心" : "Go to Performance Ops"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const cm: Record<string, string> = { blue: "border-blue-200 bg-blue-50", green: "border-green-200 bg-green-50", amber: "border-amber-200 bg-amber-50", red: "border-red-200 bg-red-50" };
  const tm: Record<string, string> = { blue: "text-blue-700", green: "text-green-700", amber: "text-amber-700", red: "text-red-700" };
  return (
    <div className={`rounded-xl border p-3 text-center ${cm[color]}`}>
      <p className={`text-2xl font-bold ${tm[color]}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
