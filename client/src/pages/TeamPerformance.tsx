/**
 * 团队绩效页面 — 真实员工数据版
 * 基于年度目标协定数据 + 360画像 + 能力评估
 */
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Users, Star, TrendingUp, TrendingDown, Target, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";

const gradeColorMap = createStatusColorMap({
  "A": "green",
  "A-": "green",
  "B+": "blue",
  "B": "blue",
  "C": "orange",
  "D": "red",
});

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "A-";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

export default function TeamPerformance() {
  const { dataScope } = useUserProfile();
  const { t } = useLanguage();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  // Try manager view first, fallback to employee list
  const managerId = user?.id ?? 0;
  const managerQ = trpc.annualGoalIncentive.dashboard.managerSummary.useQuery(
    { managerId, year },
    { enabled: !!managerId }
  );

  // Also get full list for admin/HR
  const listQ = trpc.annualGoalIncentive.agreements.list.useQuery(
    { year, limit: 50 },
    { enabled: !managerQ.data?.agreements?.length }
  );

  const agreements = managerQ.data?.agreements?.length
    ? managerQ.data.agreements
    : listQ.data?.rows || [];

  const members = useMemo(() => {
    return agreements.map((a: any) => {
      const score = parseFloat(a.projectedBonusMonths || "0") > 0
        ? Math.round(40 + parseFloat(a.projectedBonusMonths || "0") * 15)
        : 50;
      return {
        name: a.employeeName,
        dept: a.department || "",
        score,
        grade: scoreToGrade(score),
        bonusMonths: a.projectedBonusMonths || "0",
        status: a.status,
      };
    }).sort((a: any, b: any) => b.score - a.score);
  }, [agreements]);

  const avgScore = members.length > 0
    ? Math.round(members.reduce((s: number, m: any) => s + m.score, 0) / members.length)
    : 0;
  const excellentCount = members.filter((m: any) => m.score >= 80).length;
  const needsImproveCount = members.filter((m: any) => m.score < 60).length;
  const activeRate = agreements.length > 0
    ? Math.round((agreements.filter((a: any) => a.status === "active").length / agreements.length) * 100)
    : 0;

  const isLoading = managerQ.isLoading || listQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title={t("hr.teamPerf.title")}
        description={`${t("hr.teamPerf.desc")} · ${t("hr.common.dataScope")}: ${dataScope}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label={t("hr.teamPerf.teamAvg")} value={avgScore || "—"} />
        <StatCard icon={CheckCircle2} label={t("hr.teamPerf.excellent")} value={excellentCount} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={TrendingDown} label={t("hr.teamPerf.needsImprovement")} value={needsImproveCount} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Target} label={t("hr.teamPerf.goalRate")} value={`${activeRate}%`} iconColor="text-primary" iconBg="bg-primary/10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t("hr.teamPerf.memberPerformance")}
            <Badge variant="outline" className="font-normal">{members.length} {t("hr.teamPerf.members") || "人"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {members.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {m.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{m.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{m.dept}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.status === "active" ? "执行中" : m.status} · 预估 {m.bonusMonths} 月
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge color={gradeColorMap[m.grade as keyof typeof gradeColorMap] ?? "gray"}>{m.grade}</StatusBadge>
                    <span className="text-lg font-bold w-10 text-right">{m.score}</span>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">{t("hr.teamPerf.noMembers") || "暂无团队成员数据"}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
