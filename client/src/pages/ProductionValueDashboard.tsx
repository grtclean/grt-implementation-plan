/**
 * 产值统计仪表板 — CEO 视角
 *
 * Tabs:
 *   1. 年度总览 — 事业部产值 vs 目标 + 绩效排名
 *   2. 月度/季度 — 各BU月度趋势 + 工序分类
 *   3. 项目明细 — 按项目的周度工时与产值
 *   4. 趋势追踪 — 累计产值 vs 目标线
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Target, BarChart3, AlertTriangle, Trophy, Factory, CalendarDays } from "lucide-react";

function fmt(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return v >= 10000 ? `¥${(v / 10000).toFixed(1)}万` : `¥${v.toLocaleString()}`;
}
function fmtH(n: number | string | null | undefined): string {
  return `${Number(n ?? 0).toLocaleString()}h`;
}
function pct(n: number | string | null | undefined): string {
  return `${Number(n ?? 0)}%`;
}

export default function ProductionValueDashboard() {
  const [year] = useState(2026);
  const [buFilter, setBuFilter] = useState<string>("all");

  const { data: annual } = trpc.productionValue.getAnnualByBU.useQuery({ year });
  const { data: ranking } = trpc.productionValue.getBUPerformanceRanking.useQuery({ year });
  const { data: monthly } = trpc.productionValue.getMonthlyByBU.useQuery({
    year, buCode: buFilter === "all" ? undefined : buFilter,
  });
  const { data: quarterly } = trpc.productionValue.getQuarterlyByBU.useQuery({
    year, buCode: buFilter === "all" ? undefined : buFilter,
  });
  const { data: byProcess } = trpc.productionValue.getByProcessCategory.useQuery({ year });
  const { data: trend } = trpc.productionValue.getProductionValueTrend.useQuery({
    year, buCode: buFilter === "all" ? undefined : buFilter,
  });

  const totalPV = useMemo(() => annual?.reduce((s, r) => s + Number(r.production_value ?? 0), 0) ?? 0, [annual]);
  const totalTarget = useMemo(() => annual?.reduce((s, r) => s + Number(r.targetProductionValue ?? 0), 0) ?? 0, [annual]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            产值统计仪表板
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {year}年度 · 各事业部生产产值、效率、目标达成追踪
          </p>
        </div>
        <Select value={buFilter} onValueChange={setBuFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="全部事业部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部事业部</SelectItem>
            <SelectItem value="BU1">事业一部(海外)</SelectItem>
            <SelectItem value="BU2">事业二部(商用车)</SelectItem>
            <SelectItem value="BU3">事业三部(乘用车)</SelectItem>
            <SelectItem value="BU4">事业四部(半导体)</SelectItem>
            <SelectItem value="BU5">事业十部(工业通用)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />年度产值</div>
            <div className="text-2xl font-bold mt-1">{fmt(totalPV)}</div>
            <div className="text-xs text-muted-foreground">目标 {fmt(totalTarget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" />达成率</div>
            <div className="text-2xl font-bold mt-1">{totalTarget > 0 ? (totalPV / totalTarget * 100).toFixed(1) : 0}%</div>
            <div className="text-xs text-muted-foreground">年度进度</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><Factory className="h-3.5 w-3.5" />活跃项目</div>
            <div className="text-2xl font-bold mt-1">{annual?.reduce((s, r) => s + Number(r.project_count ?? 0), 0) ?? 0}</div>
            <div className="text-xs text-muted-foreground">跨{annual?.length ?? 0}个事业部</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />无效工时</div>
            <div className="text-2xl font-bold mt-1 text-destructive">
              {fmtH(annual?.reduce((s, r) => s + Number(r.invalid_hours ?? 0), 0) ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">需控制在10%以内</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="annual">
        <TabsList>
          <TabsTrigger value="annual"><Trophy className="h-3.5 w-3.5 mr-1" />年度总览</TabsTrigger>
          <TabsTrigger value="monthly"><CalendarDays className="h-3.5 w-3.5 mr-1" />月度/季度</TabsTrigger>
          <TabsTrigger value="process"><Factory className="h-3.5 w-3.5 mr-1" />工序分析</TabsTrigger>
          <TabsTrigger value="trend"><TrendingUp className="h-3.5 w-3.5 mr-1" />趋势追踪</TabsTrigger>
        </TabsList>

        {/* Tab 1: Annual Overview */}
        <TabsContent value="annual" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>事业部年度产值 vs 目标</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>事业部</TableHead>
                    <TableHead className="text-right">产值</TableHead>
                    <TableHead className="text-right">目标</TableHead>
                    <TableHead className="text-right">达成率</TableHead>
                    <TableHead className="text-right">效率</TableHead>
                    <TableHead className="text-right">无效率</TableHead>
                    <TableHead className="text-right">项目数</TableHead>
                    <TableHead>达标</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {annual?.map((r: any) => (
                    <TableRow key={r.bu_code}>
                      <TableCell className="font-medium">{r.buName}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.production_value)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(r.targetProductionValue)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Number(r.pvAchievementRate) >= 80 ? "default" : "destructive"}>
                          {pct(r.pvAchievementRate)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{pct(r.efficiency)}</TableCell>
                      <TableCell className="text-right text-destructive">{pct(r.invalid_pct)}</TableCell>
                      <TableCell className="text-right">{r.project_count}</TableCell>
                      <TableCell>
                        {Number(r.efficiencyVsTarget) >= 0
                          ? <Badge variant="outline" className="text-green-600">达标</Badge>
                          : <Badge variant="destructive">差{Math.abs(Number(r.efficiencyVsTarget)).toFixed(1)}%</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>绩效排名</CardTitle><CardDescription>按产值排序 · 人时产值体现单位效率</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排名</TableHead>
                    <TableHead>事业部</TableHead>
                    <TableHead className="text-right">产值</TableHead>
                    <TableHead className="text-right">人时产值</TableHead>
                    <TableHead className="text-right">效率</TableHead>
                    <TableHead className="text-right">无效率</TableHead>
                    <TableHead>达标</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking?.map((r: any) => (
                    <TableRow key={r.bu_code}>
                      <TableCell>
                        {r.rank === 1 ? <span className="text-yellow-500 font-bold">1</span> :
                         r.rank === 2 ? <span className="text-gray-400 font-bold">2</span> :
                         <span className="text-amber-700 font-bold">{r.rank}</span>}
                      </TableCell>
                      <TableCell className="font-medium">{r.buName}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.production_value)}</TableCell>
                      <TableCell className="text-right font-mono">¥{r.value_per_hour}/h</TableCell>
                      <TableCell className="text-right">{pct(r.efficiency)}</TableCell>
                      <TableCell className="text-right text-destructive">{pct(r.invalid_rate)}</TableCell>
                      <TableCell><Badge variant={r.efficiencyScore === "达标" ? "outline" : "destructive"}>{r.efficiencyScore}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Monthly/Quarterly */}
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>月度产值</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BU</TableHead>
                      <TableHead>月份</TableHead>
                      <TableHead className="text-right">产值</TableHead>
                      <TableHead className="text-right">有效工时</TableHead>
                      <TableHead className="text-right">效率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthly?.slice(0, 24).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.bu_code}</TableCell>
                        <TableCell>{r.month}月</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.production_value)}</TableCell>
                        <TableCell className="text-right">{fmtH(r.effective_hours)}</TableCell>
                        <TableCell className="text-right">{pct(r.efficiency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>季度产值</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BU</TableHead>
                      <TableHead>季度</TableHead>
                      <TableHead className="text-right">产值</TableHead>
                      <TableHead className="text-right">项目数</TableHead>
                      <TableHead className="text-right">效率</TableHead>
                      <TableHead className="text-right">无效工时</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quarterly?.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.bu_code}</TableCell>
                        <TableCell>Q{r.quarter}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.production_value)}</TableCell>
                        <TableCell className="text-right">{r.project_count}</TableCell>
                        <TableCell className="text-right">{pct(r.efficiency)}</TableCell>
                        <TableCell className="text-right text-destructive">{fmtH(r.invalid_hours)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Process Analysis */}
        <TabsContent value="process">
          <Card>
            <CardHeader><CardTitle>工序分类产值分析</CardTitle><CardDescription>7大制造工序产值与效率</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工序</TableHead>
                    <TableHead className="text-right">产值</TableHead>
                    <TableHead className="text-right">有效工时</TableHead>
                    <TableHead className="text-right">无效工时</TableHead>
                    <TableHead className="text-right">效率</TableHead>
                    <TableHead>产值占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byProcess?.map((r: any) => {
                    const totalProcPV = byProcess.reduce((s: number, x: any) => s + Number(x.production_value ?? 0), 0);
                    const share = totalProcPV > 0 ? (Number(r.production_value) / totalProcPV * 100) : 0;
                    return (
                      <TableRow key={r.process_code}>
                        <TableCell className="font-medium">{r.process_name}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.production_value)}</TableCell>
                        <TableCell className="text-right">{fmtH(r.effective_hours)}</TableCell>
                        <TableCell className="text-right text-destructive">{fmtH(r.invalid_hours)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(r.efficiency) >= 85 ? "outline" : "destructive"}>{pct(r.efficiency)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 bg-primary/20 rounded-full flex-1 max-w-24">
                              <div className="h-2 bg-primary rounded-full" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{share.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Trend Tracking */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>累计产值趋势 vs 目标线</CardTitle>
              <CardDescription>年度目标 {fmt(trend?.annualTarget ?? 0)} · 周度追踪</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>周</TableHead>
                    <TableHead className="text-right">周产值</TableHead>
                    <TableHead className="text-right">累计产值</TableHead>
                    <TableHead className="text-right">目标累计</TableHead>
                    <TableHead className="text-right">差距</TableHead>
                    <TableHead className="text-right">达成率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trend?.trend?.filter((_: any, i: number) => i % 4 === 3 || i === 0).map((t: any) => (
                    <TableRow key={t.week}>
                      <TableCell>W{t.week}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(t.weeklyValue)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(t.cumulativeValue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(t.cumulativeTarget)}</TableCell>
                      <TableCell className={`text-right ${t.gapToTarget >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {t.gapToTarget >= 0 ? "+" : ""}{fmt(t.gapToTarget)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={t.achievementRate >= 90 ? "outline" : "destructive"}>{t.achievementRate}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
