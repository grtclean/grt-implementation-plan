/**
 * CEO 6数 + CTO 5线 — 统一指挥中心
 *
 * CEO视角：营收·交付·客户·人效·现金·质量
 * CTO视角：数据一致性·系统可用性·安全合规·AI治理·架构演进
 *
 * P0-P3全部能力聚合：项目设备关联·OKR级联·客户健康·成本归集·供应商可靠度
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Truck, Heart, Users, DollarSign, Shield,
  Database, Server, Bot, GitBranch, Target, CheckCircle2,
  AlertTriangle, BarChart3, Crown, Cpu, RefreshCw, Layers,
  Factory, Award, Landmark,
} from "lucide-react";

export default function CeoCtoCommandCenter() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("ceo");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">{isZh ? "战略指挥中心" : "Strategic Command Center"}</h1>
        <p className="text-sm text-muted-foreground">{isZh ? "CEO 6个核心数字 · CTO 5条管控线 · P0-P3能力总览" : "CEO 6 Numbers · CTO 5 Lines · P0-P3 Capabilities"}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ceo" className="gap-1.5"><Crown className="w-4 h-4" />{isZh ? "CEO 6数" : "CEO 6 Numbers"}</TabsTrigger>
          <TabsTrigger value="cto" className="gap-1.5"><Cpu className="w-4 h-4" />{isZh ? "CTO 5线" : "CTO 5 Lines"}</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5"><Heart className="w-4 h-4" />{isZh ? "客户健康" : "Customer Health"}</TabsTrigger>
          <TabsTrigger value="cascade" className="gap-1.5"><Target className="w-4 h-4" />{isZh ? "OKR级联" : "OKR Cascade"}</TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5"><DollarSign className="w-4 h-4" />{isZh ? "成本归集" : "Cost Rollup"}</TabsTrigger>
          <TabsTrigger value="supplier" className="gap-1.5"><Truck className="w-4 h-4" />{isZh ? "供应商" : "Suppliers"}</TabsTrigger>
        </TabsList>

        <TabsContent value="ceo"><CeoSixNumbers /></TabsContent>
        <TabsContent value="cto"><CtoFiveLines /></TabsContent>
        <TabsContent value="health"><CustomerHealthTab /></TabsContent>
        <TabsContent value="cascade"><OkrCascadeTab /></TabsContent>
        <TabsContent value="cost"><ProjectCostTab /></TabsContent>
        <TabsContent value="supplier"><SupplierTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ CEO 6个核心数字 ═══
function CeoSixNumbers() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.systemOptimization.ceo.sixNumbers.useQuery(undefined, { retry: false });
  const d = q.data as any;

  const cards = [
    { key: "revenueRate", labelZh: "营收完成率", labelEn: "Revenue", icon: TrendingUp, suffix: "%", color: "#2563eb", desc: isZh ? "OKR目标 vs 实际" : "OKR target vs actual" },
    { key: "deliveryOnTime", labelZh: "交付准时率", labelEn: "On-Time Delivery", icon: Truck, suffix: "%", color: "#16a34a", desc: isZh ? "M0-M12按计划完成" : "M0-M12 per plan" },
    { key: "customerHealth", labelZh: "客户健康度", labelEn: "Customer Health", icon: Heart, suffix: "", color: "#dc2626", desc: isZh ? "设备健康+工单+付款" : "Equipment+tickets+payment" },
    { key: "perCapita", labelZh: "人均效能", labelEn: "Per Capita", icon: Users, suffix: "", color: "#9333ea", desc: isZh ? "产值/人数" : "Output / headcount", format: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { key: "cashPosition", labelZh: "现金头寸", labelEn: "Cash Position", icon: Landmark, suffix: "", color: "#ea580c", desc: isZh ? "金蝶银行存款余额" : "K/3 bank deposits", format: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { key: "qualityFpy", labelZh: "质量FPY", labelEn: "Quality FPY", icon: Shield, suffix: "%", color: "#0891b2", desc: isZh ? "首次通过率" : "First pass yield" },
  ];

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const val = d?.[c.key] ?? "—";
          const display = c.format ? c.format(Number(val) || 0) : `${val}${c.suffix}`;
          const numVal = Number(val) || 0;
          const statusColor = numVal >= 80 ? "text-green-600" : numVal >= 60 ? "text-amber-600" : "text-red-600";
          return (
            <Card key={c.key} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.color + "15", color: c.color }}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">{isZh ? c.labelZh : c.labelEn}</span>
                </div>
                <p className={`text-3xl font-bold tabular-nums ${c.key === "cashPosition" || c.key === "perCapita" ? "" : statusColor}`}>
                  {q.isLoading ? "..." : display}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{c.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══ CTO 5条管控线 ═══
function CtoFiveLines() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.systemOptimization.cto.fiveLines.useQuery(undefined, { retry: false });
  const lines = (q.data as any[]) || [];

  const icons = [Database, Server, Shield, Bot, GitBranch];
  const statusColors: Record<string, string> = { GREEN: "bg-green-500", AMBER: "bg-amber-500", RED: "bg-red-500" };

  return (
    <div className="mt-4 space-y-3">
      {lines.map((line: any, i: number) => {
        const Icon = icons[i] || Database;
        return (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: line.status === "GREEN" ? "#16a34a" : line.status === "AMBER" ? "#f59e0b" : "#dc2626" }} />
              <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{line.line}</p>
                <p className="text-xs text-muted-foreground">{line.metric}</p>
              </div>
              <Badge variant={line.status === "GREEN" ? "default" : line.status === "AMBER" ? "secondary" : "destructive"} className="text-[10px]">
                {line.status}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
      {lines.length === 0 && !q.isLoading && <p className="text-center text-muted-foreground py-8">{isZh ? "加载中..." : "Loading..."}</p>}
    </div>
  );
}

// ═══ 客户健康排行 ═══
function CustomerHealthTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.systemOptimization.customerHealth.ranking.useQuery(undefined, { retry: false });
  const rows = (q.data as any[]) || [];

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-3">{isZh ? "客户健康度排行（低→高）" : "Customer Health Ranking (low→high)"}</h3>
      {rows.length === 0 && !q.isLoading && <p className="text-center text-muted-foreground py-8">{isZh ? "暂无客户设备数据" : "No customer equipment data"}</p>}
      <div className="space-y-2">
        {rows.map((r: any, i: number) => {
          const health = Math.round(Number(r.avg_health || 0));
          const color = health >= 90 ? "text-green-600" : health >= 70 ? "text-amber-600" : "text-red-600";
          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.customerCompany || `客户#${r.customerId}`}</p>
                <p className="text-[10px] text-muted-foreground">{r.equipment_count}{isZh ? "台设备" : " devices"} · {r.fault_count}{isZh ? "故障" : " faults"}</p>
              </div>
              <span className={`text-xl font-bold tabular-nums ${color}`}>{health}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ OKR级联健康 ═══
function OkrCascadeTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.systemOptimization.okrCascade.getCascadeHealth.useQuery(undefined, { retry: false });
  const checks = (q.data as any[]) || [];

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold">{isZh ? "OKR→KPI级联完整度" : "OKR→KPI Cascade Health"}</h3>
      {checks.map((c: any, i: number) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold text-sm">{c.level}</p>
                <p className="text-xs text-muted-foreground">{c.count}{isZh ? " 条记录" : " records"}</p>
              </div>
            </div>
            <Badge variant={c.status === "OK" ? "default" : c.status === "WARN" ? "secondary" : "destructive"}>{c.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══ 项目成本归集 ═══
function ProjectCostTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.systemOptimization.projectCost.rollup.useQuery({}, { retry: false });
  const d = q.data as any;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{isZh ? "采购总额" : "Purchase Total"}</p>
            <p className="text-2xl font-bold text-blue-600">¥{((d?.purchaseTotal || 0) / 10000).toFixed(0)}{isZh ? "万" : "W"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{isZh ? "BOM物料成本" : "BOM Material"}</p>
            <p className="text-2xl font-bold text-purple-600">¥{((d?.bomMaterialTotal || 0) / 10000).toFixed(0)}{isZh ? "万" : "W"}</p>
          </CardContent>
        </Card>
      </div>
      <h3 className="text-sm font-semibold">{isZh ? "在执行项目" : "Active Projects"}</h3>
      {(d?.activeProjects || []).map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="text-sm font-medium">{p.projectCode} {p.name}</p>
            <p className="text-[10px] text-muted-foreground">{isZh ? "预算" : "Budget"}: ¥{Number(p.budget || 0).toLocaleString()} | {isZh ? "实际" : "Actual"}: ¥{Number(p.actualCost || 0).toLocaleString()}</p>
          </div>
          <Badge variant={Number(p.burn_rate || 0) > 90 ? "destructive" : "outline"} className="text-[10px]">{p.burn_rate || 0}%</Badge>
        </div>
      ))}
    </div>
  );
}

// ═══ 供应商可靠度 ═══
function SupplierTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const q = trpc.systemOptimization.supplierReliability.ranking.useQuery(undefined, { retry: false });
  const rows = (q.data as any[]) || [];

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-3">{isZh ? "供应商交付可靠度排行" : "Supplier Reliability Ranking"}</h3>
      {rows.length === 0 && <p className="text-center text-muted-foreground py-8">{isZh ? "暂无数据" : "No data"}</p>}
      <div className="space-y-2">
        {rows.slice(0, 15).map((r: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.supplierName || r.supplierCode}</p>
              <p className="text-[10px] text-muted-foreground">{r.total_orders}{isZh ? "单" : " orders"} · {isZh ? "均" : "avg "}¥{Number(r.avg_amount || 0).toLocaleString()}</p>
            </div>
            <span className={`font-bold tabular-nums ${Number(r.completion_rate) >= 80 ? "text-green-600" : "text-amber-600"}`}>{r.completion_rate}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
