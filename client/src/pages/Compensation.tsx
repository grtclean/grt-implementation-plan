/**
 * 薪酬管理页面
 * 薪资结构、薪酬核算、社保公积金
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Calculator, Lock, FileText, TrendingUp } from "lucide-react";

// TODO: 接入 tRPC 后端接口替换
const SALARY_OVERVIEW = [
  { dept: "研发设计部", headcount: 35, avgSalary: "¥22,500", totalCost: "¥787,500", change: "+3.2%" },
  { dept: "销售部", headcount: 20, avgSalary: "¥18,000", totalCost: "¥360,000", change: "+5.1%" },
  { dept: "生产部", headcount: 45, avgSalary: "¥12,000", totalCost: "¥540,000", change: "+2.0%" },
  { dept: "技术服务部", headcount: 28, avgSalary: "¥16,500", totalCost: "¥462,000", change: "+2.8%" },
];

export default function Compensation() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={DollarSign}
        title="薪酬管理"
        description="薪资核算 · 社保公积金 · 薪酬分析"
        actions={
          <>
            <Button><Calculator className="h-4 w-4 mr-2" />生成薪资单</Button>
            <Button variant="outline"><FileText className="h-4 w-4 mr-2" />导出报表</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="月薪资总额" value="¥2.15M" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Users} label="在职人数" value={140} />
        <StatCard icon={TrendingUp} label="人均薪资" value="¥15,360" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={TrendingUp} label="同比增长" value="+3.1%" iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>部门薪酬概览</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SALARY_OVERVIEW.map((d, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border transition-colors">
                <div className="flex-1">
                  <p className="font-medium">{d.dept}</p>
                  <p className="text-sm text-muted-foreground"><Users className="inline h-3 w-3 mr-1" />{d.headcount}人 · 人均: {d.avgSalary}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{d.totalCost}</p>
                  <Badge variant="secondary">{d.change}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            薪酬数据仅对授权人员可见（HR经理、财务经理、总监）
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
