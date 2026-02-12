/**
 * 我的绩效页面
 * 个人绩效仪表盘、目标追踪、自评
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Star, Target, TrendingUp, Award, Clock, CheckCircle2, BarChart3 } from "lucide-react";

const MY_GOALS = [
  { id: 1, name: "Q1项目交付率", target: "90%", actual: "85%", progress: 94, status: "进行中" },
  { id: 2, name: "客户满意度评分", target: "4.5", actual: "4.7", progress: 104, status: "超额完成" },
  { id: 3, name: "技术能力认证", target: "3项", actual: "2项", progress: 67, status: "进行中" },
  { id: 4, name: "培训课时完成", target: "40h", actual: "32h", progress: 80, status: "进行中" },
];

export default function MyPerformance() {
  const { roleConfig } = useUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-primary" />我的绩效</h1>
          <p className="text-muted-foreground mt-1">个人绩效追踪 · {roleConfig.label}</p>
        </div>
        <Button>提交自评</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-primary">B+</p><p className="text-sm text-muted-foreground">当前评级</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">87</p><p className="text-sm text-muted-foreground">综合得分</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-600">3/4</p><p className="text-sm text-muted-foreground">目标达成</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-600">Q1</p><p className="text-sm text-muted-foreground">当前周期</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />我的目标</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MY_GOALS.map(g => (
              <div key={g.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{g.name}</span>
                    <Badge className={g.status === "超额完成" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>{g.status}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">目标: {g.target} · 实际: {g.actual}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${g.progress >= 100 ? "bg-green-500" : g.progress >= 80 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${Math.min(100, g.progress)}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{g.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
