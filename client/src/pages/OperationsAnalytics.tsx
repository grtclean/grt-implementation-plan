/**
 * 运营分析仪表盘
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Truck, Clock, DollarSign, Shield, Users, Star,
  AlertTriangle, TrendingUp, Sparkles,
} from "lucide-react";

// KPI data
const KPIS = [
  { label: "项目交付率", value: "94.2%", trend: "+2.1%", icon: <Truck className="h-5 w-5" />, color: "text-green-400" },
  { label: "平均交期", value: "128天", trend: "-5天", icon: <Clock className="h-5 w-5" />, color: "text-blue-400" },
  { label: "成本偏差率", value: "3.8%", trend: "-0.6%", icon: <DollarSign className="h-5 w-5" />, color: "text-amber-400" },
  { label: "质量合格率", value: "97.6%", trend: "+0.8%", icon: <Shield className="h-5 w-5" />, color: "text-emerald-400" },
  { label: "客户满意度", value: "4.7/5", trend: "+0.2", icon: <Star className="h-5 w-5" />, color: "text-purple-400" },
  { label: "资源利用率", value: "86.3%", trend: "+3.5%", icon: <Users className="h-5 w-5" />, color: "text-cyan-400" },
];

// Funnel data
const FUNNEL = [
  { stage: "M0 商机识别", count: 48, color: "bg-slate-500" },
  { stage: "M1 需求确认", count: 42, color: "bg-slate-600" },
  { stage: "M2 方案设计", count: 36, color: "bg-indigo-500" },
  { stage: "M3 立项评审", count: 30, color: "bg-blue-500" },
  { stage: "M4 方案冻结", count: 27, color: "bg-blue-600" },
  { stage: "M5 详细设计", count: 24, color: "bg-cyan-500" },
  { stage: "M6 采购制造", count: 21, color: "bg-green-500" },
  { stage: "M7 装配调试", count: 18, color: "bg-green-600" },
  { stage: "M8 FAT验收", count: 15, color: "bg-emerald-500" },
  { stage: "M9 发货安装", count: 12, color: "bg-orange-500" },
  { stage: "M10 现场调试", count: 9, color: "bg-orange-600" },
  { stage: "M11 SAT验收", count: 7, color: "bg-amber-500" },
  { stage: "M12 项目结项", count: 5, color: "bg-purple-500" },
];

// Monthly revenue data
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const REVENUE = [1200, 980, 1450, 1680, 1520, 1890, 2100, 1950, 2300, 2150, 1800, 2450];
const MARGIN = [22, 19, 24, 26, 23, 28, 30, 27, 31, 29, 25, 32];

// BU performance
const BU_DATA = [
  { bu: "BU1", revenue: "¥28.5M", delivery: "96%", costVar: "2.1%", quality: "98.5%", satisfaction: "4.8" },
  { bu: "BU2", revenue: "¥22.3M", delivery: "93%", costVar: "4.2%", quality: "97.1%", satisfaction: "4.6" },
  { bu: "BU3", revenue: "¥35.8M", delivery: "95%", costVar: "3.0%", quality: "98.0%", satisfaction: "4.7" },
  { bu: "BU4", revenue: "¥18.6M", delivery: "91%", costVar: "5.8%", quality: "96.3%", satisfaction: "4.4" },
  { bu: "BU5", revenue: "¥15.2M", delivery: "89%", costVar: "6.5%", quality: "95.8%", satisfaction: "4.3" },
];

// Risk warnings
const WARNINGS = [
  { id: 1, project: "PRJ-2026-012", issue: "M6采购物料交期延迟14天，影响装配节点", level: "critical", time: "2小时前" },
  { id: 2, project: "PRJ-2026-018", issue: "BOM成本偏差超过8%预警线", level: "high", time: "5小时前" },
  { id: 3, project: "PRJ-2026-005", issue: "关键技术人员离职风险，影响M5设计进度", level: "high", time: "1天前" },
  { id: 4, project: "PRJ-2026-022", issue: "客户变更需求范围，需重新评估交期", level: "medium", time: "1天前" },
  { id: 5, project: "PRJ-2026-031", issue: "质检发现焊接工艺缺陷率上升至2.3%", level: "medium", time: "2天前" },
];

function warnColor(level: string) {
  if (level === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (level === "high") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
}

export default function OperationsAnalytics() {
  const [tab, setTab] = useState("overview");
  const maxRev = Math.max(...REVENUE);

  return (
      <div className="space-y-6">
        <PageHeader
          icon={BarChart3}
          title="运营分析"
          description="全局运营指标 · AI驱动洞察"
          actions={<Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />实时数据</Badge>}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {KPIS.map(k => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3">
                <div className={"flex items-center gap-2 mb-2 " + k.color}>{k.icon}<span className="text-xs text-muted-foreground">{k.label}</span></div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" />{k.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">项目管线</TabsTrigger>
            <TabsTrigger value="trend">月度趋势</TabsTrigger>
            <TabsTrigger value="bu">部门绩效</TabsTrigger>
            <TabsTrigger value="risk">预警摘要</TabsTrigger>
          </TabsList>

          {/* Funnel */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader><CardTitle>项目管线漏斗 (M0 → M12)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {FUNNEL.map(f => {
                    const pct = (f.count / FUNNEL[0].count) * 100;
                    return (
                      <div key={f.stage} className="flex items-center gap-3">
                        <span className="w-32 text-sm truncate">{f.stage}</span>
                        <div className="flex-1 h-8 bg-muted rounded relative overflow-hidden">
                          <div className={f.color + " h-full rounded transition-all"} style={{ width: `${pct}%` }} />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{f.count}个项目</span>
                        </div>
                        <span className="w-12 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly trend */}
          <TabsContent value="trend" className="mt-4">
            <Card>
              <CardHeader><CardTitle>月度营收与毛利趋势 (2025)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-48">
                  {MONTHS.map((m, i) => (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{MARGIN[i]}%</span>
                      <div className="w-full flex flex-col items-center relative" style={{ height: "140px" }}>
                        <div className="w-full bg-primary/80 rounded-t absolute bottom-0" style={{ height: `${(REVENUE[i] / maxRev) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-6 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/80" />营收(万)</span>
                  <span>年累计: ¥{(REVENUE.reduce((a, b) => a + b, 0) / 100).toFixed(1)}M</span>
                  <span>平均毛利: {(MARGIN.reduce((a, b) => a + b, 0) / 12).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BU Comparison */}
          <TabsContent value="bu" className="mt-4">
            <Card>
              <CardHeader><CardTitle>部门绩效对比</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">事业部</th>
                        <th className="text-right py-3 px-2">营收</th>
                        <th className="text-right py-3 px-2">交付率</th>
                        <th className="text-right py-3 px-2">成本偏差</th>
                        <th className="text-right py-3 px-2">质量合格率</th>
                        <th className="text-right py-3 px-2">客户满意度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BU_DATA.map(b => (
                        <tr key={b.bu} className="border-b hover:bg-accent/50">
                          <td className="py-3 px-2 font-bold">{b.bu}</td>
                          <td className="py-3 px-2 text-right">{b.revenue}</td>
                          <td className="py-3 px-2 text-right">
                            <Badge variant={parseInt(b.delivery) >= 95 ? "default" : parseInt(b.delivery) >= 90 ? "secondary" : "destructive"}>{b.delivery}</Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className={parseFloat(b.costVar) > 5 ? "text-red-400" : "text-green-400"}>{b.costVar}</span>
                          </td>
                          <td className="py-3 px-2 text-right">{b.quality}</td>
                          <td className="py-3 px-2 text-right">{b.satisfaction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk warnings */}
          <TabsContent value="risk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />AI预警摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {WARNINGS.map(w => (
                    <div key={w.id} className={"flex items-start gap-3 p-4 rounded-lg border " + warnColor(w.level)}>
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">{w.project}</span>
                          <Badge variant={w.level === "critical" ? "destructive" : "secondary"}>{w.level === "critical" ? "严重" : w.level === "high" ? "高危" : "中等"}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{w.time}</span>
                        </div>
                        <p className="text-sm mt-1">{w.issue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
