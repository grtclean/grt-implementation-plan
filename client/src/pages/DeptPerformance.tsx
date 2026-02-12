/**
 * 部门绩效页面
 * 部门KPI追踪、跨团队对比、预算执行
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { BarChart3, Users, Target, TrendingUp, DollarSign, Award } from "lucide-react";

const DEPT_KPI = [
  { dept: "技术服务部", headcount: 28, avgScore: 88, budgetUsed: 72, targetRate: 85, grade: "A-" },
  { dept: "研发设计部", headcount: 35, avgScore: 85, budgetUsed: 68, targetRate: 82, grade: "B+" },
  { dept: "销售部", headcount: 20, avgScore: 82, budgetUsed: 81, targetRate: 78, grade: "B+" },
  { dept: "生产部", headcount: 45, avgScore: 80, budgetUsed: 75, targetRate: 90, grade: "B" },
  { dept: "人力资源部", headcount: 12, avgScore: 86, budgetUsed: 55, targetRate: 88, grade: "A-" },
];

export default function DeptPerformance() {
  const { dataScope } = useUserProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />部门绩效</h1>
        <p className="text-muted-foreground mt-1">部门级KPI追踪与预算执行 · 数据范围: {dataScope}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">84.2</p><p className="text-sm text-muted-foreground">公司平均绩效</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">140</p><p className="text-sm text-muted-foreground">总人数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">84%</p><p className="text-sm text-muted-foreground">目标达成率</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">70%</p><p className="text-sm text-muted-foreground">预算执行率</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>部门绩效汇总</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEPT_KPI.map((d, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{d.dept}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{d.headcount}人</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />达成{d.targetRate}%</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />预算{d.budgetUsed}%</span>
                  </div>
                </div>
                <Badge className={d.grade.startsWith("A") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{d.grade}</Badge>
                <span className="text-xl font-bold">{d.avgScore}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
