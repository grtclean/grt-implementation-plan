/**
 * OKR Matrix Page — OKR矩阵 (/strategy/okr-matrix)
 *
 * KPI summary cards, level breakdown, and OKR objective list table.
 */
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Loader2,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building2,
  Layers,
  Users,
  User,
} from "lucide-react";

const LEVEL_CONFIG = [
  { key: "companyLevel", labelZh: "公司级", labelEn: "Company", icon: Building2, color: "#0078D4" },
  { key: "buLevel",      labelZh: "BU级",   labelEn: "BU",      icon: Layers,    color: "#4F6BED" },
  { key: "deptLevel",    labelZh: "部门级", labelEn: "Dept",    icon: Users,     color: "#008272" },
  { key: "teamLevel",    labelZh: "团队级", labelEn: "Team",    icon: User,      color: "#CA5010" },
] as const;

export default function OKRMatrixPage() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const dashboardQuery = trpc.okr.dashboard.useQuery();
  const listQuery = trpc.okr.list.useQuery({ limit: 50, offset: 0 });

  const dash = dashboardQuery.data;
  const items = (listQuery.data as any)?.items ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isZh ? "OKR 矩阵" : "OKR Matrix"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "目标与关键成果对齐矩阵" : "Objectives & Key Results alignment matrix"}</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex-1 p-6 space-y-6">
        {dashboardQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{dash?.totalObjectives ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "总目标数" : "Total OKRs"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{dash?.avgProgress ?? 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "平均进度" : "Avg Progress"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-3xl font-bold text-green-600">{dash?.onTrack ?? 0}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "正常" : "On Track"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-3xl font-bold text-amber-600">{dash?.atRisk ?? 0}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "有风险" : "At Risk"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <p className="text-3xl font-bold text-red-600">{dash?.behind ?? 0}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{isZh ? "落后" : "Behind"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Level Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  {isZh ? "层级分布" : "Level Breakdown"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {LEVEL_CONFIG.map((lv) => {
                    const Icon = lv.icon;
                    const count = (dash as any)?.[lv.key] ?? 0;
                    return (
                      <div key={lv.key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: lv.color + "15" }}>
                          <Icon className="w-4 h-4" style={{ color: lv.color }} />
                        </div>
                        <div>
                          <p className="text-lg font-bold" style={{ color: lv.color }}>{count}</p>
                          <p className="text-xs text-muted-foreground">{isZh ? lv.labelZh : lv.labelEn}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* OKR Table or Empty State */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  {isZh ? "目标列表" : "Objectives"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {listQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">{isZh ? "暂无 OKR 目标" : "No OKR objectives yet"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isZh ? "可通过 OKR 管理页面创建目标" : "Create objectives via OKR management"}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "目标" : "Objective"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "层级" : "Level"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "进度" : "Progress"}</th>
                          <th className="pb-2 font-medium text-muted-foreground">{isZh ? "状态" : "Status"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((obj: any) => (
                          <tr key={obj.id} className="border-b last:border-0">
                            <td className="py-2 font-medium">{obj.title ?? obj.name ?? "-"}</td>
                            <td className="py-2"><Badge variant="outline">{obj.level ?? "-"}</Badge></td>
                            <td className="py-2 w-32">
                              <Progress value={obj.progress ?? 0} className="h-1.5" />
                              <span className="text-xs text-muted-foreground">{obj.progress ?? 0}%</span>
                            </td>
                            <td className="py-2"><Badge variant="secondary">{obj.status ?? "-"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
