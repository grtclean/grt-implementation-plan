/**
 * AI预设准确度反馈面板 (AI Accuracy Feedback Dashboard)
 * 
 * 功能：
 * 1. AI预设的采纳率统计（直接采纳、修改后采纳、拒绝）
 * 2. 按工序和项目维度的准确度分析
 * 3. 月度趋势图
 * 4. 修改幅度分析（哪些字段被修改最多）
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import {
  Brain, BarChart3, TrendingUp, CheckCircle2, XCircle,
  Edit, Loader2, Target, Sparkles, AlertTriangle,
  PieChart, Activity, Zap
} from "lucide-react";
import { useState, useMemo } from "react";

export default function AiAccuracyDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<number | undefined>(undefined);

  const accuracyQuery = trpc.processSteps.getAiAccuracyDashboard.useQuery(
    { projectId },
    { enabled: true }
  );

  const data = accuracyQuery.data as any;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Brain}
        title={t("ai.accuracy.title")}
        description={t("ai.accuracy.description")}
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t("ai.accuracy.filterProject")}</Label>
            <Input
              type="number"
              placeholder={t("ai.accuracy.allProjects")}
              className="w-32"
              value={projectId || ""}
              onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        }
      />

      {accuracyQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-muted-foreground">{t("ai.accuracy.loading")}</span>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* 总体统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={Target} label={t("ai.accuracy.totalAdoption")} value={`${data.overall.adoptionRate.toFixed(1)}%`} iconColor="text-purple-600" iconBg="bg-purple-100" />
            <StatCard icon={CheckCircle2} label={t("ai.accuracy.directAdoption")} value={`${data.overall.directAdoptionRate.toFixed(1)}%`} subtitle={`${data.overall.confirmedCount}`} iconColor="text-green-600" iconBg="bg-green-100" />
            <StatCard icon={Edit} label={t("ai.accuracy.modifiedAdoption")} value={`${data.overall.modificationRate.toFixed(1)}%`} subtitle={`${data.overall.modifiedCount}`} iconColor="text-blue-600" iconBg="bg-blue-100" />
            <StatCard icon={XCircle} label={t("ai.accuracy.rejectionRate")} value={`${data.overall.rejectionRate.toFixed(1)}%`} subtitle={`${data.overall.rejectedCount}`} iconColor="text-red-600" iconBg="bg-red-100" />
            <StatCard icon={Activity} label={t("ai.accuracy.totalPresets")} value={data.overall.totalPresets} subtitle={`${data.overall.pendingCount}`} iconColor="text-amber-600" iconBg="bg-amber-100" />
          </div>

          {/* 采纳率可视化条 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("ai.accuracy.adoptionDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {data.overall.confirmedCount > 0 && (
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${data.overall.directAdoptionRate}%` }}
                  >
                    {data.overall.directAdoptionRate > 10 ? `${t("ai.accuracy.direct")} ${data.overall.directAdoptionRate.toFixed(0)}%` : ""}
                  </div>
                )}
                {data.overall.modifiedCount > 0 && (
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${data.overall.modificationRate}%` }}
                  >
                    {data.overall.modificationRate > 10 ? `${t("ai.accuracy.modified")} ${data.overall.modificationRate.toFixed(0)}%` : ""}
                  </div>
                )}
                {data.overall.rejectedCount > 0 && (
                  <div
                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${data.overall.rejectionRate}%` }}
                  >
                    {data.overall.rejectionRate > 10 ? `${t("ai.accuracy.rejected")} ${data.overall.rejectionRate.toFixed(0)}%` : ""}
                  </div>
                )}
                {data.overall.pendingCount > 0 && (
                  <div
                    className="bg-amber-300 flex items-center justify-center text-amber-800 text-xs font-medium"
                    style={{ width: `${(data.overall.pendingCount / data.overall.totalPresets * 100)}%` }}
                  >
                    {(data.overall.pendingCount / data.overall.totalPresets * 100) > 10 ? t("ai.accuracy.pendingLabel") : ""}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500" /> {t("ai.accuracy.directLabel")}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /> {t("ai.accuracy.modifiedLabel")}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> {t("ai.accuracy.rejectedLabel")}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300" /> {t("ai.accuracy.pendingLabel")}</div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="process" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="process">{t("ai.accuracy.byProcess")}</TabsTrigger>
              <TabsTrigger value="project">{t("ai.accuracy.byProject")}</TabsTrigger>
              <TabsTrigger value="trend">{t("ai.accuracy.monthlyTrend")}</TabsTrigger>
              <TabsTrigger value="modification">{t("ai.accuracy.modificationAnalysis")}</TabsTrigger>
            </TabsList>

            {/* 按工序维度 */}
            <TabsContent value="process" className="space-y-3 mt-3">
              {data.byProcess.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">{t("ai.accuracy.noProcessData")}</CardContent>
                </Card>
              ) : (
                data.byProcess.map((proc: any) => (
                  <Card key={proc.processCode}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{proc.processCode}</Badge>
                          <span className="font-medium">{proc.processName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-purple-600">{proc.stats.adoptionRate.toFixed(0)}%</span>
                          <span className="text-xs text-muted-foreground">{t("ai.accuracy.adoptionRate")}</span>
                        </div>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                        <div className="bg-green-500" style={{ width: `${proc.stats.directAdoptionRate}%` }} />
                        <div className="bg-blue-500" style={{ width: `${proc.stats.modificationRate}%` }} />
                        <div className="bg-red-500" style={{ width: `${proc.stats.rejectionRate}%` }} />
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{t("ai.accuracy.direct")}: {proc.stats.confirmedCount}</span>
                        <span>{t("ai.accuracy.modified")}: {proc.stats.modifiedCount}</span>
                        <span>{t("ai.accuracy.rejected")}: {proc.stats.rejectedCount}</span>
                        <span>{t("ai.accuracy.total")}: {proc.stats.totalPresets}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 按项目维度 */}
            <TabsContent value="project" className="space-y-3 mt-3">
              {data.byProject.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">{t("ai.accuracy.noProjectData")}</CardContent>
                </Card>
              ) : (
                data.byProject.map((proj: any) => (
                  <Card key={proj.projectId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{proj.projectName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-purple-600">{proj.stats.adoptionRate.toFixed(0)}%</span>
                          <span className="text-xs text-muted-foreground">({proj.stats.totalPresets}项)</span>
                        </div>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                        <div className="bg-green-500" style={{ width: `${proj.stats.directAdoptionRate}%` }} />
                        <div className="bg-blue-500" style={{ width: `${proj.stats.modificationRate}%` }} />
                        <div className="bg-red-500" style={{ width: `${proj.stats.rejectionRate}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 月度趋势 */}
            <TabsContent value="trend" className="space-y-3 mt-3">
              {data.trend.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">{t("ai.accuracy.noTrendData")}</CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      {t("ai.accuracy.monthlyTrendTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.trend.map((item: any) => (
                        <div key={item.period} className="flex items-center gap-3">
                          <span className="text-sm font-mono w-20 text-muted-foreground">{item.period}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Progress value={item.adoptionRate} className="h-4 flex-1" />
                              <span className="text-sm font-bold w-14 text-right">{item.adoptionRate.toFixed(0)}%</span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">{item.totalPresets}项</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 修改分析 */}
            <TabsContent value="modification" className="space-y-3 mt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit className="w-4 h-4 text-blue-600" />
                    {t("ai.accuracy.modificationTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("ai.accuracy.modificationDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">{t("ai.accuracy.avgFieldsModified")}</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {data.modificationAnalysis.avgFieldsModified.toFixed(1)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">{t("ai.accuracy.mostModifiedFields")}</div>
                    {data.modificationAnalysis.mostModifiedFields.map((field: any) => {
                      const maxCount = Math.max(...data.modificationAnalysis.mostModifiedFields.map((f: any) => f.count), 1);
                      return (
                        <div key={field.field} className="flex items-center gap-3">
                          <span className="text-sm w-20">{field.field}</span>
                          <div className="flex-1">
                            <div className="h-6 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${(field.count / maxCount) * 100}%`, minWidth: field.count > 0 ? '2rem' : '0' }}
                              >
                                <span className="text-xs text-white font-medium">{field.count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <div className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span className="font-medium text-purple-700 dark:text-purple-300">{t("ai.accuracy.aiOptimizationSuggestion")}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {data.overall.rejectionRate > 30 && (
                        <li>拒绝率较高({data.overall.rejectionRate.toFixed(0)}%)，建议优化历史项目匹配算法</li>
                      )}
                      {data.modificationAnalysis.mostModifiedFields[0]?.count > 0 && (
                        <li>"{data.modificationAnalysis.mostModifiedFields[0].field}"被修改最多，建议加强该字段的AI预测模型</li>
                      )}
                      {data.overall.adoptionRate > 70 && (
                        <li>采纳率良好({data.overall.adoptionRate.toFixed(0)}%)，AI推荐质量持续提升</li>
                      )}
                      {data.overall.pendingCount > 10 && (
                        <li>有{data.overall.pendingCount}项待处理预设，建议提醒工程师及时确认</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">{t("ai.accuracy.noPresetData")}</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">{t("ai.accuracy.usePresetFirst")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
