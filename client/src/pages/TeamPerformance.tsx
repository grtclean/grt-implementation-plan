/**
 * 团队绩效页面
 * 团队成员绩效对比、团队目标追踪
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Users, Star, TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "王工", role: "机械工程师", score: 92, grade: "A", trend: "up", goals: "4/4" },
  { name: "李工", role: "电气工程师", score: 87, grade: "B+", trend: "up", goals: "3/4" },
  { name: "张工", role: "项目经理", score: 85, grade: "B+", trend: "stable", goals: "3/4" },
  { name: "赵工", role: "销售工程师", score: 78, grade: "B", trend: "down", goals: "2/4" },
  { name: "陈工", role: "客服工程师", score: 90, grade: "A-", trend: "up", goals: "4/5" },
];

export default function TeamPerformance() {
  const { dataScope } = useUserProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />团队绩效</h1>
        <p className="text-muted-foreground mt-1">团队成员绩效对比 · 数据范围: {dataScope}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">86.4</p><p className="text-sm text-muted-foreground">团队平均分</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">3</p><p className="text-sm text-muted-foreground">优秀 (A/A-)</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">1</p><p className="text-sm text-muted-foreground">待改进</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">80%</p><p className="text-sm text-muted-foreground">目标达成率</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>团队成员绩效</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TEAM_MEMBERS.map((m, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{m.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <Badge variant="outline">{m.role}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">目标完成: {m.goals}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.trend === "up" ? <TrendingUp className="h-4 w-4 text-green-500" /> : m.trend === "down" ? <TrendingDown className="h-4 w-4 text-red-500" /> : <span className="text-muted-foreground">—</span>}
                  <Badge className={m.grade.startsWith("A") ? "bg-green-100 text-green-700" : m.grade.startsWith("B+") ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{m.grade}</Badge>
                  <span className="text-lg font-bold w-10 text-right">{m.score}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
