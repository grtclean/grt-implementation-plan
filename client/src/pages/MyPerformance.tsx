/**
 * 我的绩效页面
 * 个人绩效仪表盘、目标追踪、自评
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Star, Target, TrendingUp, Award, CheckCircle2, Calendar } from "lucide-react";

const goalStatusColorMap = createStatusColorMap({
  "超额完成": "green",
  "进行中": "blue",
  "未达标": "red",
});

// TODO: 接入 tRPC 后端接口替换
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
      <PageHeader
        icon={Star}
        title="我的绩效"
        description={`个人绩效追踪 · ${roleConfig.label}`}
        actions={<Button>提交自评</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Award} label="当前评级" value="B+" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Target} label="综合得分" value={87} />
        <StatCard icon={CheckCircle2} label="目标达成" value="3/4" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Calendar} label="当前周期" value="Q1" iconColor="text-orange-500" iconBg="bg-orange-500/10" />
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
                    <StatusBadge color={goalStatusColorMap[g.status as keyof typeof goalStatusColorMap] ?? "gray"}>{g.status}</StatusBadge>
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
