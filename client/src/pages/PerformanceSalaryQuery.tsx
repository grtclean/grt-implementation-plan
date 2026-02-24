/**
 * 绩效薪资查询页面
 * 员工自助查看绩效指标与薪资明细
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, User, DollarSign, Award, BarChart3, Lock, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

function money(v: string | number | null | undefined) {
  if (v == null) return "-";
  return `¥${Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
}

function formatDate(d: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN");
}

function marketBadge(mc: string | null | undefined) {
  if (!mc) return null;
  const map: Record<string, { label: string; cls: string }> = {
    above: { label: "高于市场", cls: "bg-green-100 text-green-700" },
    at: { label: "持平市场", cls: "bg-blue-100 text-blue-700" },
    below: { label: "低于市场", cls: "bg-orange-100 text-orange-700" },
  };
  const m = map[mc];
  return m ? <Badge className={m.cls}>{m.label}</Badge> : <Badge variant="secondary">{mc}</Badge>;
}

export default function PerformanceSalaryQuery() {
  const { t } = useLanguage();
  const [detailId, setDetailId] = useState<number | null>(null);

  const profile = trpc.perfSalary.myProfile.useQuery();
  const grades = trpc.perfSalary.performanceGrades.useQuery();
  const records = trpc.perfSalary.mySalaryRecords.useQuery();
  const trend = trpc.perfSalary.performanceTrend.useQuery({ periods: 12 });
  const detail = trpc.perfSalary.salaryDetail.useQuery(
    { calculationId: detailId! },
    { enabled: detailId != null },
  );

  const p = profile.data;
  const latestRecord = records.data?.[0];

  return (
      <div className="space-y-6">
        <PageHeader
          icon={TrendingUp}
          title={t("hr.perfSalary.title")}
          description={t("hr.perfSalary.description")}
        />

        {/* 员工信息卡 */}
        <Card>
          <CardContent className="pt-6">
            {profile.isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !p ? (
              <p className="text-muted-foreground text-center py-4">{t("hr.perfSalary.profileNotFound")}</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">{t("hr.perfSalary.name")}</span><p className="font-medium">{p.name}</p></div>
                  <div><span className="text-muted-foreground">{t("hr.perfSalary.department")}</span><p className="font-medium">{p.department}</p></div>
                  <div><span className="text-muted-foreground">{t("hr.perfSalary.position")}</span><p className="font-medium">{p.position}</p></div>
                  <div><span className="text-muted-foreground">{t("hr.perfSalary.level")}</span><p className="font-medium">{p.level || "-"}</p></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="salary">
          <TabsList>
            <TabsTrigger value="salary">{t("hr.perfSalary.tab.salary")}</TabsTrigger>
            <TabsTrigger value="grades">{t("hr.perfSalary.tab.grades")}</TabsTrigger>
            <TabsTrigger value="trend">{t("hr.perfSalary.tab.trend")}</TabsTrigger>
          </TabsList>

          {/* ---- 薪资详情 ---- */}
          <TabsContent value="salary" className="space-y-4">
            {/* 当前薪资摘要 */}
            {latestRecord && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("hr.perfSalary.currentOverview")}</CardTitle>
                  <CardDescription>{t("hr.perfSalary.latestCalc")} · {formatDate(latestRecord.createdAt)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <SummaryItem icon={DollarSign} label={t("hr.perfSalary.baseSalary")} value={money(latestRecord.baseSalary)} />
                    <SummaryItem icon={Award} label={t("hr.perfSalary.performanceSalary")} value={money(latestRecord.performanceSalary)} />
                    <SummaryItem icon={DollarSign} label={t("hr.perfSalary.bonus")} value={money(latestRecord.bonus)} />
                    <SummaryItem icon={DollarSign} label={t("hr.perfSalary.benefits")} value={money(latestRecord.benefits)} />
                    <SummaryItem icon={TrendingUp} label={t("hr.perfSalary.monthlyTotal")} value={money(latestRecord.monthlyTotal)} highlight />
                    <SummaryItem icon={BarChart3} label={t("hr.perfSalary.annualTotal")} value={money(latestRecord.annualTotal)} />
                  </div>
                  {latestRecord.marketComparison && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("hr.perfSalary.marketBenchmark")}:</span>
                      {marketBadge(latestRecord.marketComparison)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 薪资历史 */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t("hr.perfSalary.salaryHistory")}</CardTitle></CardHeader>
              <CardContent>
                {records.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !records.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">{t("hr.perfSalary.noSalaryRecords")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("hr.perfSalary.calcCode")}</TableHead>
                        <TableHead>{t("hr.perfSalary.type")}</TableHead>
                        <TableHead>{t("hr.perfSalary.level")}</TableHead>
                        <TableHead>{t("hr.perfSalary.baseSalary")}</TableHead>
                        <TableHead>{t("hr.perfSalary.performanceSalary")}</TableHead>
                        <TableHead>{t("hr.perfSalary.monthlyTotal")}</TableHead>
                        <TableHead>{t("hr.perfSalary.date")}</TableHead>
                        <TableHead>{t("hr.perfSalary.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.data.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.calculationCode}</TableCell>
                          <TableCell>{r.calculationType}</TableCell>
                          <TableCell>{r.positionGrade || "-"}</TableCell>
                          <TableCell>{money(r.baseSalary)}</TableCell>
                          <TableCell>{money(r.performanceSalary)}</TableCell>
                          <TableCell className="font-medium">{money(r.monthlyTotal)}</TableCell>
                          <TableCell>{formatDate(r.createdAt)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id)}>
                              <Eye className="h-4 w-4 mr-1" />{t("hr.perfSalary.detail")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- 绩效等级 ---- */}
          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("hr.perfSalary.gradeStandard")}</CardTitle>
                <CardDescription>{t("hr.perfSalary.gradeStandardDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {grades.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !grades.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">{t("hr.perfSalary.noGradeData")}</p>
                ) : (
                  <div className="grid gap-3">
                    {grades.data.map((g: any) => {
                      const isCurrentGrade = latestRecord?.positionGrade === g.gradeCode;
                      return (
                        <div
                          key={g.gradeCode}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                            isCurrentGrade ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {g.gradeCode}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{g.gradeName}</span>
                              {isCurrentGrade && <Badge>{t("hr.perfSalary.currentGrade")}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{g.description || "-"}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{t("hr.perfSalary.scoreRange")}</p>
                            <p className="font-medium">{g.scoreMin} ~ {g.scoreMax}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{t("hr.perfSalary.coefficient")}</p>
                            <p className="font-medium">{g.coefficient}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- 趋势分析 ---- */}
          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("hr.perfSalary.salaryTrend")}</CardTitle>
                <CardDescription>{t("hr.perfSalary.recentPeriods")} {trend.data?.length ?? 0}</CardDescription>
              </CardHeader>
              <CardContent>
                {trend.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !trend.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">{t("hr.perfSalary.noTrendData")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("hr.perfSalary.date")}</TableHead>
                        <TableHead>{t("hr.perfSalary.type")}</TableHead>
                        <TableHead>{t("hr.perfSalary.level")}</TableHead>
                        <TableHead>{t("hr.perfSalary.baseSalary")}</TableHead>
                        <TableHead>{t("hr.perfSalary.performanceSalary")}</TableHead>
                        <TableHead>{t("hr.perfSalary.bonus")}</TableHead>
                        <TableHead>{t("hr.perfSalary.monthlyTotal")}</TableHead>
                        <TableHead>{t("hr.perfSalary.annualTotal")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trend.data.map((tr: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(tr.createdAt)}</TableCell>
                          <TableCell>{tr.calculationType}</TableCell>
                          <TableCell>{tr.positionGrade || "-"}</TableCell>
                          <TableCell>{money(tr.baseSalary)}</TableCell>
                          <TableCell>{money(tr.performanceSalary)}</TableCell>
                          <TableCell>{money(tr.bonus)}</TableCell>
                          <TableCell className="font-medium">{money(tr.monthlyTotal)}</TableCell>
                          <TableCell>{money(tr.annualTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 隐私提示 */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Lock className="h-3 w-3" />
          {t("hr.perfSalary.privacyNotice")}
        </div>

        {/* 薪资详情对话框 */}
        <Dialog open={detailId != null} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{t("hr.perfSalary.salaryDetail")}</DialogTitle>
            </DialogHeader>
            {detail.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !detail.data ? (
              <p className="text-muted-foreground text-center py-8">{t("hr.perfSalary.recordNotFound")}</p>
            ) : (
              <div className="space-y-3 text-sm">
                <DetailRow label={t("hr.perfSalary.calcCode")} value={detail.data.calculationCode} />
                <DetailRow label={t("hr.perfSalary.department")} value={detail.data.department} />
                <DetailRow label={t("hr.perfSalary.level")} value={detail.data.positionGrade || "-"} />
                <DetailRow label={t("hr.perfSalary.type")} value={detail.data.calculationType} />
                <DetailRow label={t("hr.perfSalary.baseSalary")} value={money(detail.data.baseSalary)} />
                <DetailRow label={t("hr.perfSalary.performanceSalary")} value={money(detail.data.performanceSalary)} />
                <DetailRow label={t("hr.perfSalary.bonus")} value={money(detail.data.bonus)} />
                <DetailRow label={t("hr.perfSalary.benefits")} value={money(detail.data.benefits)} />
                <DetailRow label={t("hr.perfSalary.monthlyTotal")} value={money(detail.data.monthlyTotal)} bold />
                <DetailRow label={t("hr.perfSalary.annualTotal")} value={money(detail.data.annualTotal)} bold />
                {detail.data.marketComparison && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">{t("hr.perfSalary.marketBenchmark")}</span>
                    {marketBadge(detail.data.marketComparison)}
                  </div>
                )}
                {detail.data.remarks && <DetailRow label={t("hr.perfSalary.remarks")} value={detail.data.remarks} />}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}

function SummaryItem({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
