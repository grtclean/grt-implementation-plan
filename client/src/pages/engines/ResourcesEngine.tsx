/**
 * Resources Engine — 资源中枢 (/resources)
 *
 * HR KPI cards, leaderboard top-5, and quick-link navigation.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EngineNavBar from "@/components/Layout/EngineNavBar";
import {
  Briefcase,
  Loader2,
  Users,
  GraduationCap,
  Trophy,
  ArrowRight,
  BarChart3,
  Award,
  Star,
} from "lucide-react";

const QUICK_LINKS = [
  { route: "/employees",           labelZh: "员工管理",   labelEn: "Employees",  icon: Users,         color: "#CA5010" },
  { route: "/training-management", labelZh: "培训管理",   labelEn: "Training",   icon: GraduationCap, color: "#4F6BED" },
  { route: "/competency",          labelZh: "能力矩阵",   labelEn: "Competency", icon: Award,         color: "#008272" },
];

export default function ResourcesEngine() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const isZh = language === "zh";

  const perfQuery = trpc.aiPerformance.dashboard.useQuery();
  const leaderboardQuery = trpc.aiPerformance.leaderboard.useQuery({ limit: 5 });

  const perf = perfQuery.data;
  const leaderboard = leaderboardQuery.data ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <EngineNavBar />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isZh ? "资源中枢" : "Resources Engine"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "人才发展、绩效评估与能力建设" : "Talent, performance & capability building"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {perfQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* HR KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">{perf?.avgMeetingScore ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "综合评分" : "Avg Score"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{perf?.actionItemCompletionRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "完成率" : "Completion"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{perf?.employeesEvaluated ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "已评估" : "Evaluated"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-amber-500" />
                    <p className="text-lg font-bold text-amber-600">{perf?.topPerformer?.name ?? "-"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "最佳员工" : "Top Performer"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard Top 5 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  {isZh ? "绩效排行榜 Top 5" : "Performance Leaderboard Top 5"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboardQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{isZh ? "暂无排行数据" : "No leaderboard data"}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-muted-foreground w-8">#</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "姓名" : "Name"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "部门" : "Dept"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "评分" : "Score"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "广度" : "Breadth"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "深度" : "Depth"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "执行" : "Exec"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "纪律" : "Disc"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry: any, i: number) => (
                          <tr key={entry.userId} className="border-b last:border-0">
                            <td className="py-2">
                              {i < 3 ? (
                                <span className={`text-sm font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-orange-400"}`}>
                                  {i + 1}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{i + 1}</span>
                              )}
                            </td>
                            <td className="py-2 font-medium">{entry.userName}</td>
                            <td className="py-2"><Badge variant="outline" className="text-[10px]">{entry.department}</Badge></td>
                            <td className="py-2 font-bold text-orange-600">{entry.meetingScore}</td>
                            <td className="py-2 text-muted-foreground">{entry.breadth}</td>
                            <td className="py-2 text-muted-foreground">{entry.depth}</td>
                            <td className="py-2 text-muted-foreground">{entry.execution}</td>
                            <td className="py-2 text-muted-foreground">{entry.discipline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Card
                    key={link.route}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(link.route)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: link.color + "15" }}>
                        <Icon className="w-5 h-5" style={{ color: link.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{isZh ? link.labelZh : link.labelEn}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
