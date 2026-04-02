/**
 * IncentiveProjection — 激励试算
 *
 * Tab1: 实时试算 (What-if 模拟器)
 * Tab2: 团队总览 (主管视角)
 * Tab3: 组织分析 (HR视角)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Calculator, Users, BarChart3, TrendingUp,
  ArrowRight, Sparkles, Loader2, Award,
} from "lucide-react";
import { useState } from "react";

export default function IncentiveProjection() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("calculator");

  const year = new Date().getFullYear();
  const employeeId = user?.id ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{isZh ? "激励试算" : "Incentive Projection"}</h1>
          <p className="text-sm text-muted-foreground">{isZh ? "模拟不同场景下的奖金与薪资变化" : "Simulate bonus & salary under different scenarios"}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calculator" className="gap-1.5"><Calculator className="h-3.5 w-3.5" />{isZh ? "试算器" : "Calculator"}</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" />{isZh ? "团队总览" : "Team View"}</TabsTrigger>
          <TabsTrigger value="org" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{isZh ? "组织分析" : "Org Analytics"}</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-4">
          <SimulatorPanel employeeId={employeeId} year={year} isZh={isZh} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamOverview managerId={employeeId} year={year} isZh={isZh} />
        </TabsContent>

        <TabsContent value="org" className="mt-4">
          <OrgAnalytics year={year} isZh={isZh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SimulatorPanel({ employeeId, year, isZh }: { employeeId: number; year: number; isZh: boolean }) {
  const agreementQ = trpc.annualGoalIncentive.agreements.getByEmployee.useQuery({ employeeId, year });
  const agreementId = agreementQ.data?.id;

  const [acceptCareer, setAcceptCareer] = useState(false);
  const simQ = trpc.annualGoalIncentive.incentiveCalc.simulateCareerPath.useQuery(
    { agreementId: agreementId!, acceptCareer },
    { enabled: !!agreementId }
  );
  const historyQ = trpc.annualGoalIncentive.incentiveCalc.getProjectionHistory.useQuery(
    { agreementId: agreementId! },
    { enabled: !!agreementId }
  );

  if (!agreementId) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">{isZh ? "暂无协定" : "No agreement"}</CardContent></Card>;
  }

  const sim = simQ.data;
  const history = historyQ.data || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simulator */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />{isZh ? "What-If 模拟" : "What-If Simulator"}
        </CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptCareer} onChange={e => setAcceptCareer(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-sm">{isZh ? "接受职业路径升级" : "Accept career upgrade"}</span>
            </label>
          </div>

          {sim && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-600">{sim.compositeScore?.toFixed(1)}</div>
                  <div className="text-xs text-blue-600">{isZh ? "综合得分" : "Score"}</div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-600">{sim.bonusMonths} × {sim.careerMultiplier}</div>
                  <div className="text-xs text-green-600">{isZh ? "月 × 倍数" : "mo × multiplier"}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <div className="text-center">
                  <div className="text-xs text-amber-700 mb-1">{isZh ? "预估年度奖金" : "Projected Annual Bonus"}</div>
                  <div className="text-3xl font-bold text-amber-700">
                    ¥{sim.projectedBonus?.toLocaleString()}
                  </div>
                </div>
                {acceptCareer && (
                  <div className="mt-3 pt-3 border-t border-amber-200 text-center">
                    <div className="text-xs text-amber-600">{isZh ? "新基本工资 (+薪资调整)" : "New Salary (+adjustment)"}</div>
                    <div className="text-lg font-semibold text-amber-700">
                      ¥{sim.projectedNewSalary?.toLocaleString()} <span className="text-sm">+{sim.salaryAdjustmentPct}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>{isZh ? "绩效等级" : "Level"}: <strong>{sim.performanceLevel}</strong></div>
                <div>{isZh ? "奖金上限" : "Cap"}: <strong>{sim.bonusCapMonths} {isZh ? "个月" : "months"}</strong></div>
                <div>{isZh ? "基本工资" : "Base"}: ¥{sim.baseSalary?.toLocaleString()}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projection History */}
      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "试算历史趋势" : "Projection History"}</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{isZh ? "尚无历史数据" : "No history yet"}</div>
          ) : (
            <div className="space-y-2">
              {history.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <div className="text-xs text-muted-foreground">{new Date(p.calculatedAt).toLocaleDateString()}</div>
                    <div className="text-xs">{p.triggerType}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono">{p.compositeScore}</span>
                    <Badge variant="outline" className="text-xs">{p.performanceLevelCode}</Badge>
                    <span className="text-sm font-semibold font-mono">{p.bonusMonths} {isZh ? "月" : "mo"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamOverview({ managerId, year, isZh }: { managerId: number; year: number; isZh: boolean }) {
  const q = trpc.annualGoalIncentive.dashboard.managerSummary.useQuery({ managerId, year });

  if (q.isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const data = q.data;
  if (!data || data.agreements.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">{isZh ? "暂无团队协定" : "No team agreements"}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold">{data.totalEmployees}</div>
          <div className="text-xs text-muted-foreground">{isZh ? "团队成员" : "Team Members"}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data.statusCounts?.active || 0}</div>
          <div className="text-xs text-muted-foreground">{isZh ? "执行中" : "Active"}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data.avgProjectedMonths?.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">{isZh ? "平均预估月数" : "Avg Projected Mo"}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{data.statusCounts?.draft || 0}</div>
          <div className="text-xs text-muted-foreground">{isZh ? "待签署" : "Pending"}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {data.agreements.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
                    {a.employeeName?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{a.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{a.department || "-"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold">{a.projectedBonusMonths || "0"} {isZh ? "月" : "mo"}</div>
                    {a.careerPathAccepted && <div className="text-[10px] text-amber-600 flex items-center gap-0.5"><Sparkles className="h-3 w-3" />2×</div>}
                  </div>
                  <Badge variant="outline" className="text-xs w-16 justify-center">{a.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrgAnalytics({ year, isZh }: { year: number; isZh: boolean }) {
  const q = trpc.annualGoalIncentive.dashboard.hrOrgOverview.useQuery({ year });

  if (q.isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const data = q.data;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold">{data.total}</div>
          <div className="text-xs text-muted-foreground">{isZh ? "总协定数" : "Total"}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold text-green-600">{(data.signedRate * 100).toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">{isZh ? "签署率" : "Signed Rate"}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{(data.activeRate * 100).toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">{isZh ? "活跃率" : "Active Rate"}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{(data.finalizedRate * 100).toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">{isZh ? "完成率" : "Finalized"}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "按状态分布" : "By Status"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${data.total > 0 ? ((count as number) / data.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-mono w-8 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "按部门分布" : "By Department"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.byDept || {}).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-sm">{dept}</span>
                  <span className="text-sm font-mono">{count as number}</span>
                </div>
              ))}
              {Object.keys(data.byDept || {}).length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">{isZh ? "暂无部门数据" : "No department data"}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
