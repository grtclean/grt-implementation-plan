/**
 * Operations Engine — 运营中枢 (/operations)
 *
 * Project KPI cards, M0-M12 stage distribution bar chart,
 * upcoming gates table, and quick-link navigation cards.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import EngineNavBar from "@/components/Layout/EngineNavBar";
import {
  Factory,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  FolderKanban,
  Sparkles,
  FlaskConical,
  ArrowRight,
  BarChart3,
  XCircle,
} from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  M0: "#0078D4", M1: "#4F6BED", M2: "#8764B8",
  M3: "#008272", M4: "#107C10", M5: "#498205",
  M6: "#CA5010", M7: "#D83B01", M8: "#A80000",
  M9: "#5C2D91", M10: "#0063B1", M11: "#2D7D9A",
  M12: "#107C10",
};

const QUICK_LINKS = [
  { route: "/project-management", labelZh: "项目管理", labelEn: "Projects",    icon: FolderKanban, color: "#0078D4" },
  { route: "/operations/new-project", labelZh: "新项目向导", labelEn: "New Project", icon: Sparkles,  color: "#4F6BED" },
  { route: "/rd-verification",    labelZh: "研发验证",  labelEn: "R&D Verify",  icon: FlaskConical, color: "#008272" },
];

export default function OperationsEngine() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const isZh = language === "zh";

  // tRPC queries
  const stageQuery = trpc.projectGate.getStageStats.useQuery();
  const gatesQuery = trpc.projectGate.getUpcomingGates.useQuery({ days: 14 });

  const stageStats = stageQuery.data;
  const gates = gatesQuery.data ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <EngineNavBar />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isZh ? "运营中枢" : "Operations Engine"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "项目阶段门控、资源调度与运营洞察" : "Stage gates, scheduling & operational insights"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {stageQuery.isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}><CardContent className="p-4 text-center"><Skeleton className="h-8 w-16 mx-auto mb-1" /><Skeleton className="h-3 w-20 mx-auto" /></CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-5 w-full" />)}</CardContent></Card>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{stageStats?.totalProjects ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "项目总数" : "Total Projects"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-3xl font-bold text-green-600">{stageStats?.byStatus?.onTrack ?? 0}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "正常推进" : "On Track"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-3xl font-bold text-amber-600">{stageStats?.byStatus?.atRisk ?? 0}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "存在风险" : "At Risk"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <p className="text-3xl font-bold text-red-600">{stageStats?.byStatus?.delayed ?? 0}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "已延期" : "Delayed"}</p>
                </CardContent>
              </Card>
            </div>

            {/* M0-M12 Stage Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-500" />
                  {isZh ? "M0-M12 阶段分布" : "M0-M12 Stage Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!stageStats?.byStage || stageStats.byStage.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{isZh ? "暂无阶段数据" : "No stage data"}</p>
                ) : (
                  <div className="space-y-2">
                    {stageStats.byStage.map((s: any) => {
                      const maxCount = Math.max(...stageStats.byStage.map((x: any) => x.count), 1);
                      const pct = Math.round((s.count / maxCount) * 100);
                      return (
                        <div key={s.code} className="flex items-center gap-3">
                          <span className="text-xs font-mono w-8 text-right">{s.code}</span>
                          <div className="flex-1 h-5 bg-muted/30 rounded-sm overflow-hidden">
                            <div
                              className="h-full rounded-sm transition-all"
                              style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[s.code] ?? "#888" }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-8">{s.count}</span>
                          <span className="text-xs text-muted-foreground w-24 truncate">{s.nameZh}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Gates Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  {isZh ? "即将到来的门控评审" : "Upcoming Gate Reviews"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gatesQuery.isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : gates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{isZh ? "近期无门控评审" : "No upcoming gates"}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "项目" : "Project"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "当前" : "Current"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "下阶段" : "Next"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "剩余天数" : "Days"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "完成度" : "Progress"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gates.slice(0, 8).map((g: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 font-medium">{g.projectName}</td>
                            <td className="py-2"><Badge variant="outline">{g.currentStage}</Badge></td>
                            <td className="py-2"><Badge variant="secondary">{g.nextStage}</Badge></td>
                            <td className="py-2">
                              <span className={g.daysRemaining <= 3 ? "text-red-600 font-semibold" : ""}>{g.daysRemaining}d</span>
                            </td>
                            <td className="py-2">{g.completionRate}%</td>
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
