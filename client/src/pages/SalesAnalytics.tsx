/**
 * 销售分析页面
 * 销售漏斗、业绩趋势、BU对比、预测
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { BarChart3, TrendingUp, DollarSign, Users, Target, Building2 } from "lucide-react";

const BU_SALES = [
  { bu: "BU1 海外", revenue: "€5.2M", target: "€6M", rate: 87, deals: 12, pipeline: "€8.5M" },
  { bu: "BU2 商用车", revenue: "¥18M", target: "¥20M", rate: 90, deals: 18, pipeline: "¥25M" },
  { bu: "BU3 乘用车", revenue: "¥22M", target: "¥25M", rate: 88, deals: 15, pipeline: "¥32M" },
  { bu: "BU4 半导体", revenue: "¥12M", target: "¥15M", rate: 80, deals: 8, pipeline: "¥20M" },
  { bu: "BU5 工业通用", revenue: "¥8M", target: "¥10M", rate: 80, deals: 10, pipeline: "¥14M" },
];

export default function SalesAnalytics() {
  const { currentBU, dataScope } = useUserProfile();
  const filtered = BU_SALES.filter(s => !currentBU || s.bu.includes(currentBU));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />销售分析</h1>
          <p className="text-muted-foreground mt-1">销售业绩分析与预测 · 数据范围: {dataScope}</p>
        </div>
        {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">¥65.2M</p><p className="text-sm text-muted-foreground">总营收</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">86%</p><p className="text-sm text-muted-foreground">目标达成</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">63</p><p className="text-sm text-muted-foreground">成交订单</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">¥99.5M</p><p className="text-sm text-muted-foreground">销售管线</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>事业部销售对比</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filtered.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.bu}</span>
                  <span className="text-sm text-muted-foreground">营收: {s.revenue} / 目标: {s.target} · {s.deals}单 · 管线: {s.pipeline}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.rate >= 90 ? "bg-green-500" : s.rate >= 80 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${s.rate}%` }} />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{s.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
