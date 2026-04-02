/**
 * 质量追责与积分看板
 *
 * CEO 视角：依赖阻塞可视化 · 积分排行 · 改善跟踪
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, Trophy, Shield, Plus, CheckCircle, XCircle, Clock,
  ArrowUp, ArrowDown, FileWarning, Send,
} from "lucide-react";

const SEV_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500",
  low: "bg-blue-400 text-white",
};
const STATUS_ICONS: Record<string, any> = {
  reported: Clock, confirmed: AlertTriangle, improving: ArrowUp,
  closed: CheckCircle, rejected: XCircle, investigating: Shield,
};

export default function QualityAccountability() {
  const [tab, setTab] = useState("issues");

  // Data
  const { data: issues, refetch: refetchIssues } = trpc.qualityAccountability.listIssues.useQuery({});
  const { data: leaderboard } = trpc.qualityAccountability.getPointsLeaderboard.useQuery({});
  const { data: buStats } = trpc.qualityAccountability.getBUQualityStats.useQuery({});
  const { data: issueTypes } = trpc.qualityAccountability.getIssueTypes.useQuery();

  // Report form
  const [rProject, setRProject] = useState("");
  const [rBU, setRBU] = useState("BU1");
  const [rType, setRType] = useState("drawing_missing");
  const [rSev, setRSev] = useState("medium");
  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rResp, setRResp] = useState("");
  const [rImpact, setRImpact] = useState("");
  const reportMut = trpc.qualityAccountability.reportIssue.useMutation();
  const seedMut = trpc.qualityAccountability.seedDemoIssues.useMutation();

  async function handleReport() {
    if (!rProject || !rTitle) return;
    await reportMut.mutateAsync({
      projectCode: rProject, buCode: rBU, issueType: rType,
      severity: rSev as any, title: rTitle, description: rDesc || undefined,
      responsibleName: rResp || undefined,
      impactHours: Number(rImpact) || undefined,
    });
    setRTitle(""); setRDesc(""); setRResp(""); setRImpact("");
    refetchIssues();
    setTab("issues");
  }

  const openCount = issues?.filter((i: any) => !["closed", "rejected"].includes(i.status)).length ?? 0;
  const criticalCount = issues?.filter((i: any) => i.severity === "critical" && i.status !== "closed").length ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            质量追责与积分看板
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            绩效委员会主席: 倪微薇 · 问题反馈→追责→改善→闭环
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">待处理问题</div>
            <div className="text-2xl font-bold text-orange-500">{openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-destructive">严重问题</div>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">总影响工时</div>
            <div className="text-2xl font-bold">{issues?.reduce((s: number, i: any) => s + Number(i.impact_hours ?? 0), 0) ?? 0}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-green-600">奖励积分发放</div>
            <div className="text-2xl font-bold text-green-600">+{leaderboard?.reduce((s: number, r: any) => s + Number(r.total_rewards ?? 0), 0) ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-destructive">处罚积分</div>
            <div className="text-2xl font-bold text-destructive">{leaderboard?.reduce((s: number, r: any) => s + Number(r.total_penalties ?? 0), 0) ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="issues"><FileWarning className="h-3.5 w-3.5 mr-1" />问题列表</TabsTrigger>
          <TabsTrigger value="report"><Plus className="h-3.5 w-3.5 mr-1" />提交反馈</TabsTrigger>
          <TabsTrigger value="leaderboard"><Trophy className="h-3.5 w-3.5 mr-1" />积分排行</TabsTrigger>
          <TabsTrigger value="bu-stats"><Shield className="h-3.5 w-3.5 mr-1" />事业部统计</TabsTrigger>
        </TabsList>

        {/* Issues List */}
        <TabsContent value="issues">
          <Card>
            <CardHeader><CardTitle>质量问题追踪</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>状态</TableHead>
                    <TableHead>项目</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>严重度</TableHead>
                    <TableHead className="max-w-xs">问题描述</TableHead>
                    <TableHead>反馈人</TableHead>
                    <TableHead>责任人</TableHead>
                    <TableHead className="text-right">影响</TableHead>
                    <TableHead className="text-right">奖/扣</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues?.map((q: any) => {
                    const StatusIcon = STATUS_ICONS[q.status] || Clock;
                    const typeName = issueTypes?.find((t: any) => t.code === q.issue_type)?.name ?? q.issue_type;
                    return (
                      <TableRow key={q.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-xs">{q.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{q.project_code}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{typeName}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${SEV_COLORS[q.severity] ?? ""}`}>{q.severity}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{q.title}</TableCell>
                        <TableCell className="text-sm text-green-600">{q.reporter_name}</TableCell>
                        <TableCell className="text-sm text-destructive">{q.responsible_name ?? "-"}</TableCell>
                        <TableCell className="text-right text-sm">{q.impact_hours}h</TableCell>
                        <TableCell className="text-right text-sm">
                          {q.reward_points > 0 && <span className="text-green-600 mr-1">+{q.reward_points}</span>}
                          {q.penalty_points > 0 && <span className="text-destructive">-{q.penalty_points}</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Form */}
        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>提交质量问题反馈</CardTitle>
              <CardDescription>任何员工均可提交 · 经绩效委员会确认后自动奖励反馈者、处罚责任人</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>项目号 *</Label>
                  <Input value={rProject} onChange={e => setRProject(e.target.value)} placeholder="GRT-4xx" />
                </div>
                <div className="space-y-2">
                  <Label>事业部</Label>
                  <Select value={rBU} onValueChange={setRBU}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BU1">事业一部</SelectItem>
                      <SelectItem value="BU2">事业二部</SelectItem>
                      <SelectItem value="BU3">事业三部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>问题类型 *</Label>
                  <Select value={rType} onValueChange={setRType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {issueTypes?.map((t: any) => (
                        <SelectItem key={t.code} value={t.code}>{t.name} (扣{t.penaltyBase}分)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>严重程度</Label>
                  <Select value={rSev} onValueChange={setRSev}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低 (×0.5)</SelectItem>
                      <SelectItem value="medium">中 (×1)</SelectItem>
                      <SelectItem value="high">高 (×1.5)</SelectItem>
                      <SelectItem value="critical">严重 (×2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>问题标题 *</Label>
                <Input value={rTitle} onChange={e => setRTitle(e.target.value)} placeholder="简述问题，如：03.工作腔喷嘴安装孔位图纸缺失" />
              </div>
              <div className="space-y-2">
                <Label>详细描述</Label>
                <Textarea value={rDesc} onChange={e => setRDesc(e.target.value)} placeholder="补充说明、影响范围" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>责任人姓名</Label>
                  <Input value={rResp} onChange={e => setRResp(e.target.value)} placeholder="如知道责任人" />
                </div>
                <div className="space-y-2">
                  <Label>影响工时 (h)</Label>
                  <Input value={rImpact} onChange={e => setRImpact(e.target.value)} type="number" placeholder="预估影响" />
                </div>
              </div>
              <Button onClick={handleReport} disabled={!rProject || !rTitle || reportMut.isPending}>
                <Send className="h-4 w-4 mr-2" />提交反馈
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>积分排行榜</CardTitle>
              <CardDescription>正分 = 质量反馈奖励 · 负分 = 质量责任扣分 · 净分影响绩效考核</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>事业部</TableHead>
                    <TableHead className="text-right text-green-600">奖励分</TableHead>
                    <TableHead className="text-right text-destructive">扣罚分</TableHead>
                    <TableHead className="text-right font-bold">净分</TableHead>
                    <TableHead className="text-right">事件数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard?.map((r: any, i: number) => (
                    <TableRow key={r.employee_id} className={Number(r.net_points) < 0 ? "bg-red-50 dark:bg-red-950/20" : ""}>
                      <TableCell>
                        {i === 0 ? <span className="text-yellow-500 font-bold text-lg">1</span> :
                         i === 1 ? <span className="text-gray-400 font-bold">2</span> :
                         i === 2 ? <span className="text-amber-700 font-bold">3</span> :
                         <span>{i + 1}</span>}
                      </TableCell>
                      <TableCell className="font-medium">{r.employee_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.bu_code}</Badge></TableCell>
                      <TableCell className="text-right text-green-600 font-mono">
                        {Number(r.total_rewards) > 0 && <><ArrowUp className="h-3 w-3 inline" />+{r.total_rewards}</>}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-mono">
                        {Number(r.total_penalties) < 0 && <><ArrowDown className="h-3 w-3 inline" />{r.total_penalties}</>}
                      </TableCell>
                      <TableCell className={`text-right font-bold font-mono ${Number(r.net_points) >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {Number(r.net_points) > 0 ? "+" : ""}{r.net_points}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.transaction_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BU Stats */}
        <TabsContent value="bu-stats">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>事业部质量统计</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事业部</TableHead>
                      <TableHead className="text-right">总问题</TableHead>
                      <TableHead className="text-right">已关闭</TableHead>
                      <TableHead className="text-right">待处理</TableHead>
                      <TableHead className="text-right text-destructive">严重</TableHead>
                      <TableHead className="text-right">影响工时</TableHead>
                      <TableHead className="text-right">总扣分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(buStats as any)?.buStats?.map((r: any) => (
                      <TableRow key={r.bu_code}>
                        <TableCell className="font-medium">{r.bu_code}</TableCell>
                        <TableCell className="text-right">{r.total_issues}</TableCell>
                        <TableCell className="text-right text-green-600">{r.closed_issues}</TableCell>
                        <TableCell className="text-right text-orange-500">{r.open_issues}</TableCell>
                        <TableCell className="text-right text-destructive font-bold">{r.critical_count}</TableCell>
                        <TableCell className="text-right">{r.total_impact_hours}h</TableCell>
                        <TableCell className="text-right text-destructive">-{r.total_penalties ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>问题类型分布</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(buStats as any)?.issueTypeDistribution?.map((t: any) => {
                    const typeName = issueTypes?.find((it: any) => it.code === t.issue_type)?.name ?? t.issue_type;
                    return (
                      <div key={t.issue_type} className="border rounded-lg p-3">
                        <div className="text-sm font-medium">{typeName}</div>
                        <div className="text-2xl font-bold mt-1">{t.cnt}<span className="text-sm text-muted-foreground ml-1">件</span></div>
                        {Number(t.penalty_sum ?? 0) > 0 && (
                          <div className="text-xs text-destructive mt-1">扣分: -{t.penalty_sum}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
