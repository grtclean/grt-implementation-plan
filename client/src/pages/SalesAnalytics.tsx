/**
 * 销售分析页面
 * 销售漏斗、业绩趋势、BU对比、预测
 */
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { BarChart3, TrendingUp, DollarSign, Target, Building2 } from "lucide-react";

// TODO: 接入 tRPC 后端接口替换
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
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="销售分析"
        description={`销售业绩分析与预测 · 数据范围: ${dataScope}`}
        actions={currentBU ? <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge> : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="总营收" value="¥65.2M" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Target} label="目标达成" value="86%" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={TrendingUp} label="成交订单" value={63} />
        <StatCard icon={BarChart3} label="销售管线" value="¥99.5M" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
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
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无销售数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
