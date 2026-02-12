/**
 * 薪酬管理页面
 * 薪资结构、薪酬核算、社保公积金
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, BarChart3, Calculator, Lock, FileText } from "lucide-react";

const SALARY_OVERVIEW = [
  { dept: "研发设计部", headcount: 35, avgSalary: "¥22,500", totalCost: "¥787,500", change: "+3.2%" },
  { dept: "销售部", headcount: 20, avgSalary: "¥18,000", totalCost: "¥360,000", change: "+5.1%" },
  { dept: "生产部", headcount: 45, avgSalary: "¥12,000", totalCost: "¥540,000", change: "+2.0%" },
  { dept: "技术服务部", headcount: 28, avgSalary: "¥16,500", totalCost: "¥462,000", change: "+2.8%" },
];

export default function Compensation() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />薪酬管理</h1>
          <p className="text-muted-foreground mt-1">薪资核算 · 社保公积金 · 薪酬分析</p>
        </div>
        <div className="flex gap-2">
          <Button><Calculator className="h-4 w-4 mr-2" />生成薪资单</Button>
          <Button variant="outline"><FileText className="h-4 w-4 mr-2" />导出报表</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">¥2.15M</p><p className="text-sm text-muted-foreground">月薪资总额</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">140</p><p className="text-sm text-muted-foreground">在职人数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">¥15,360</p><p className="text-sm text-muted-foreground">人均薪资</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">+3.1%</p><p className="text-sm text-muted-foreground">同比增长</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>部门薪酬概览</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SALARY_OVERVIEW.map((d, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{d.dept}</p>
                  <p className="text-sm text-muted-foreground"><Users className="inline h-3 w-3 mr-1" />{d.headcount}人 · 人均: {d.avgSalary}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{d.totalCost}</p>
                  <Badge className={d.change.startsWith("+") ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>{d.change}</Badge>
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
