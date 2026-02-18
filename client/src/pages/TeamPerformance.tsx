/**
 * 团队绩效页面
 * 团队成员绩效对比、团队目标追踪
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Users, Star, TrendingUp, TrendingDown, Target, CheckCircle2 } from "lucide-react";

const gradeColorMap = createStatusColorMap({
  "A": "green",
  "A-": "green",
  "B+": "blue",
  "B": "orange",
  "C": "red",
});

// TODO: 接入 tRPC 后端接口替换
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
      <PageHeader
        icon={Users}
        title="团队绩效"
        description={`团队成员绩效对比 · 数据范围: ${dataScope}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label="团队平均分" value="86.4" />
        <StatCard icon={CheckCircle2} label="优秀 (A/A-)" value={3} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={TrendingDown} label="待改进" value={1} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Target} label="目标达成率" value="80%" iconColor="text-primary" iconBg="bg-primary/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>团队成员绩效</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TEAM_MEMBERS.map((m, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border transition-colors">
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
                  <StatusBadge color={gradeColorMap[m.grade as keyof typeof gradeColorMap] ?? "gray"}>{m.grade}</StatusBadge>
                  <span className="text-lg font-bold w-10 text-right">{m.score}</span>
                </div>
              </div>
            ))}
            {TEAM_MEMBERS.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无团队成员</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
