/**
 * 部门绩效页面
 * 部门KPI追踪、跨团队对比、预算执行
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { BarChart3, Users, Target, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const gradeColorMap = createStatusColorMap({
  "A": "green",
  "A-": "green",
  "B+": "blue",
  "B": "orange",
});

// TODO: 接入 tRPC 后端接口替换
const DEPT_KPI = [
  { dept: "技术服务部", headcount: 28, avgScore: 88, budgetUsed: 72, targetRate: 85, grade: "A-" },
  { dept: "研发设计部", headcount: 35, avgScore: 85, budgetUsed: 68, targetRate: 82, grade: "B+" },
  { dept: "销售部", headcount: 20, avgScore: 82, budgetUsed: 81, targetRate: 78, grade: "B+" },
  { dept: "生产部", headcount: 45, avgScore: 80, budgetUsed: 75, targetRate: 90, grade: "B" },
  { dept: "人力资源部", headcount: 12, avgScore: 86, budgetUsed: 55, targetRate: 88, grade: "A-" },
];

export default function DeptPerformance() {
  const { dataScope } = useUserProfile();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title={t("hr.deptPerf.title")}
        description={`${t("hr.deptPerf.desc")} · ${t("hr.common.dataScope")}: ${dataScope}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label={t("hr.deptPerf.companyAvg")} value="84.2" />
        <StatCard icon={Users} label={t("hr.deptPerf.totalHeadcount")} value={140} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Target} label={t("hr.deptPerf.goalRate")} value="84%" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={DollarSign} label={t("hr.deptPerf.budgetRate")} value="70%" iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("hr.deptPerf.summary")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEPT_KPI.map((d, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border transition-colors">
                <div className="flex-1">
                  <p className="font-medium">{d.dept}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{d.headcount}{t("hr.common.people")}</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{t("hr.deptPerf.achieved")}{d.targetRate}%</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{t("hr.deptPerf.budget")}{d.budgetUsed}%</span>
                  </div>
                </div>
                <StatusBadge color={gradeColorMap[d.grade as keyof typeof gradeColorMap] ?? "gray"}>{d.grade}</StatusBadge>
                <span className="text-xl font-bold">{d.avgScore}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
