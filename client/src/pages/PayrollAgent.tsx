import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Mail, Play, Eye, CheckCircle, AlertTriangle, Users,
  Target, Brain, Send, FileText, Clock, Loader2, Sparkles,
  MailCheck, MailX, Zap, Calculator, Rocket,
} from "lucide-react";

const toneBadge: Record<string, { label: string; color: string }> = {
  excellent: { label: "优秀", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  good: { label: "良好", color: "bg-blue-100 text-blue-800 border-blue-300" },
  needs_improvement: { label: "待改进", color: "bg-amber-100 text-amber-800 border-amber-300" },
  warning: { label: "警告", color: "bg-red-100 text-red-800 border-red-300" },
};

export default function PayrollAgent() {
  const { toast } = useToast();
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [includeGoals, setIncludeGoals] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [goalEmployeeName, setGoalEmployeeName] = useState("");
  const [goalContext, setGoalContext] = useState("");

  // --- Queries ---
  const cyclesQuery = trpc.payrollSandbox.cycle.list.useQuery();
  const statusQuery = trpc.payrollAgent.orchestration.getStatus.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: selectedCycleId != null },
  );
  const historyQuery = trpc.payrollAgent.orchestration.history.useQuery(
    { cycleId: selectedCycleId ?? undefined },
    { enabled: selectedCycleId != null },
  );

  // --- Mutations ---
  const calcMutation = trpc.payrollAgent.orchestration.calculate.useMutation({
    onSuccess: (data) => {
      toast({ title: "薪资计算完成", description: `${data.employeesCalculated}人已计算, 异常${data.anomaliesDetected}项` });
      statusQuery.refetch();
    },
    onError: (err) => toast({ title: "计算失败", description: err.message, variant: "destructive" }),
  });

  const runMutation = trpc.payrollAgent.orchestration.run.useMutation({
    onSuccess: (data) => {
      toast({ title: "Agent 通知完成", description: dryRun ? "试运行完成，未实际发送邮件" : `已发送${data?.emailsSent ?? 0}封邮件` });
      historyQuery.refetch();
      statusQuery.refetch();
    },
    onError: (err) => toast({ title: "执行失败", description: err.message, variant: "destructive" }),
  });

  const calcAndNotifyMutation = trpc.payrollAgent.orchestration.calculateAndNotify.useMutation({
    onSuccess: (data) => {
      const c = data.calculation;
      const n = data.notification;
      toast({
        title: "一键计算+通知完成",
        description: `计算${c.employeesCalculated}人 | ${dryRun ? "试运行" : `发送${n?.emailsSent ?? 0}封`}`,
      });
      statusQuery.refetch();
      historyQuery.refetch();
    },
    onError: (err) => toast({ title: "执行失败", description: err.message, variant: "destructive" }),
  });

  const previewQuery = trpc.payrollAgent.orchestration.preview.useQuery(
    { cycleId: selectedCycleId!, employeeName: previewName.trim() },
    { enabled: false },
  );

  const goalMutation = trpc.payrollAgent.goals.generateGoals.useMutation({
    onError: (err) => toast({ title: "目标生成失败", description: err.message, variant: "destructive" }),
  });

  const batchGoalMutation = trpc.payrollAgent.goals.batchGenerateGoals.useMutation({
    onSuccess: (data) => toast({ title: "批量生成完成", description: `已为 ${data?.generated ?? 0} 名员工生成目标` }),
    onError: (err) => toast({ title: "批量生成失败", description: err.message, variant: "destructive" }),
  });

  const status = statusQuery.data;
  const calcResult = calcMutation.data;
  const runResult = runMutation.data;
  const calcAndNotifyResult = calcAndNotifyMutation.data;
  const preview = previewQuery.data;
  const goals = goalMutation.data;

  const filterArr = employeeFilter.trim()
    ? employeeFilter.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const anyRunning = calcMutation.isPending || runMutation.isPending || calcAndNotifyMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">薪酬Agent</h1>
            <p className="text-sm text-muted-foreground">智能薪资计算 · 绩效总结 · 目标设定 · 邮件通知</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">薪酬周期</Label>
          <Select
            value={selectedCycleId != null ? String(selectedCycleId) : ""}
            onValueChange={(v) => setSelectedCycleId(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="选择周期..." />
            </SelectTrigger>
            <SelectContent>
              {cyclesQuery.data?.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name ?? c.period ?? `周期 ${c.id}`} ({c.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCycleId == null && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>请先选择一个薪酬周期以开始操作</p>
          </CardContent>
        </Card>
      )}

      {selectedCycleId != null && (
        <>
          {/* Section 1: Status Panel */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-violet-600" /> Agent 状态面板
            </h2>
            {statusQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <StatusCard icon={FileText} label="周期状态" value={status?.cycleStatus ?? "—"} />
                  <StatusCard icon={Users} label="已计算员工" value={status?.totalEmployees ?? 0} />
                  <StatusCard icon={Mail} label="有邮箱" value={status?.employeesWithEmail ?? 0} />
                  <StatusCard icon={Target} label="有绩效" value={status?.employeesWithPerf ?? 0} />
                  <StatusCard icon={Clock} label="有考勤" value={status?.employeesWithAttendance ?? 0} />
                  <StatusCard
                    icon={status?.canSendNotifications ? CheckCircle : AlertTriangle}
                    label="通知就绪"
                    value={status?.canSendNotifications ? "就绪" : "未就绪"}
                    accent={status?.canSendNotifications ? "text-emerald-600" : "text-amber-600"}
                    bgAccent={status?.canSendNotifications ? "bg-emerald-50" : "bg-amber-50"}
                  />
                </div>
              </>
            )}
          </section>

          {/* Section 2: Execution Console */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Play className="h-5 w-5 text-violet-600" /> 执行控制台
            </h2>
            <Card>
              <Tabs defaultValue="calculate">
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger value="calculate" className="gap-1.5"><Calculator className="h-3.5 w-3.5" /> 薪资计算</TabsTrigger>
                    <TabsTrigger value="notify" className="gap-1.5"><Send className="h-3.5 w-3.5" /> 发送通知</TabsTrigger>
                    <TabsTrigger value="all" className="gap-1.5"><Rocket className="h-3.5 w-3.5" /> 一键执行</TabsTrigger>
                    <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> 预览</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Tab: Calculate */}
                  <TabsContent value="calculate" className="mt-0 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      执行CEO Excel公式引擎：考勤扣款 → 三档绩效工资 → 社保公积金 → 累计预扣法个税 → 异常检测
                    </p>
                    <Button
                      size="lg"
                      className="gap-2"
                      disabled={anyRunning}
                      onClick={() => calcMutation.mutate({ cycleId: selectedCycleId })}
                    >
                      {calcMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                      执行薪资计算
                    </Button>

                    {calcResult && (
                      <div className="rounded-lg border bg-white p-4 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 font-medium">
                          <CheckCircle className="h-5 w-5" /> 计算完成
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-muted-foreground">员工数：</span><strong>{calcResult.employeesCalculated}</strong></div>
                          <div><span className="text-muted-foreground">异常数：</span><strong className={calcResult.anomaliesDetected > 0 ? "text-amber-600" : ""}>{calcResult.anomaliesDetected}</strong></div>
                          <div><span className="text-muted-foreground">应发总额：</span><strong>¥{Number(calcResult.totalGrossPay).toLocaleString("zh-CN")}</strong></div>
                          <div><span className="text-muted-foreground">实发总额：</span><strong>¥{Number(calcResult.totalNetPay).toLocaleString("zh-CN")}</strong></div>
                          <div><span className="text-muted-foreground">个税总额：</span><strong>¥{Number(calcResult.totalTax).toLocaleString("zh-CN")}</strong></div>
                          <div><span className="text-muted-foreground">耗时：</span><strong>{calcResult.duration}ms</strong></div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Notify */}
                  <TabsContent value="notify" className="mt-0 space-y-4">
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch id="goals" checked={includeGoals} onCheckedChange={setIncludeGoals} />
                        <Label htmlFor="goals">包含下月目标</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="dryrun" checked={dryRun} onCheckedChange={setDryRun} />
                        <Label htmlFor="dryrun">试运行（不实际发送）</Label>
                        {dryRun && <Badge variant="outline" className="text-xs">安全模式</Badge>}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">员工过滤（可选，逗号分隔姓名）</Label>
                      <Input
                        placeholder="例如：倪亚琴,金晓锋,戴晓燕"
                        value={employeeFilter}
                        onChange={(e) => setEmployeeFilter(e.target.value)}
                        className="mt-1 max-w-md"
                      />
                    </div>
                    <Button
                      size="lg"
                      className="gap-2"
                      disabled={anyRunning || !status?.canSendNotifications}
                      onClick={() => runMutation.mutate({ cycleId: selectedCycleId, dryRun, includeGoals, employeeFilter: filterArr })}
                    >
                      {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {dryRun ? "试运行通知" : "发送薪资通知"}
                    </Button>

                    {runResult && <NotificationResult data={runResult} dryRun={dryRun} />}
                  </TabsContent>

                  {/* Tab: Calculate & Notify */}
                  <TabsContent value="all" className="mt-0 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      一键完成：薪资计算 → AI绩效总结 → 邮件通知。适用于全流程自动执行。
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch id="goals2" checked={includeGoals} onCheckedChange={setIncludeGoals} />
                        <Label htmlFor="goals2">包含下月目标</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="dryrun2" checked={dryRun} onCheckedChange={setDryRun} />
                        <Label htmlFor="dryrun2">试运行</Label>
                        {dryRun && <Badge variant="outline" className="text-xs">安全模式</Badge>}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                      disabled={anyRunning}
                      onClick={() => calcAndNotifyMutation.mutate({ cycleId: selectedCycleId, dryRun, includeGoals, employeeFilter: filterArr })}
                    >
                      {calcAndNotifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                      一键计算 + 通知
                    </Button>

                    {calcAndNotifyResult && (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-white p-4 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700 font-medium">
                            <Calculator className="h-5 w-5" /> 计算结果
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <div>员工: <strong>{calcAndNotifyResult.calculation.employeesCalculated}</strong></div>
                            <div>异常: <strong>{calcAndNotifyResult.calculation.anomaliesDetected}</strong></div>
                            <div>应发: <strong>¥{Number(calcAndNotifyResult.calculation.totalGrossPay).toLocaleString("zh-CN")}</strong></div>
                          </div>
                        </div>
                        {calcAndNotifyResult.notification && (
                          <NotificationResult data={calcAndNotifyResult.notification} dryRun={dryRun} />
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Preview */}
                  <TabsContent value="preview" className="mt-0 space-y-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 max-w-xs">
                        <Label className="text-sm text-muted-foreground">员工姓名</Label>
                        <Input
                          placeholder="输入员工姓名"
                          value={previewName}
                          onChange={(e) => setPreviewName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        disabled={!previewName.trim() || previewQuery.isFetching}
                        onClick={() => previewQuery.refetch()}
                        className="gap-1.5"
                      >
                        {previewQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        生成预览
                      </Button>
                    </div>

                    {preview && !(preview as any).error && (
                      <div className="space-y-4">
                        {preview.subject && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">邮件主题：</span>
                            <span className="font-medium">{preview.subject}</span>
                          </div>
                        )}

                        {preview.perfSummary && (
                          <Card className="border-violet-200 bg-violet-50/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Brain className="h-4 w-4 text-violet-600" /> AI 绩效总结
                                {preview.perfSummary.overallTone && toneBadge[preview.perfSummary.overallTone] && (
                                  <Badge variant="outline" className={toneBadge[preview.perfSummary.overallTone].color}>
                                    {toneBadge[preview.perfSummary.overallTone].label}
                                  </Badge>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3">
                              {preview.perfSummary.monthlySummary && <p>{preview.perfSummary.monthlySummary}</p>}
                              {preview.perfSummary.strengths?.length > 0 && (
                                <div>
                                  <p className="font-medium text-emerald-700 mb-1">优势</p>
                                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                    {preview.perfSummary.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              {preview.perfSummary.improvements?.length > 0 && (
                                <div>
                                  <p className="font-medium text-amber-700 mb-1">改进方向</p>
                                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                    {preview.perfSummary.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              {preview.perfSummary.nextMonthGoals?.length > 0 && (
                                <div>
                                  <p className="font-medium text-indigo-700 mb-1">下月目标</p>
                                  <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                                    {preview.perfSummary.nextMonthGoals.map((g: string, i: number) => <li key={i}>{g}</li>)}
                                  </ol>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {preview.html && (
                          <div>
                            <Label className="text-sm text-muted-foreground mb-2 block">邮件正文预览</Label>
                            <div
                              className="rounded-lg border bg-white p-4 max-h-[500px] overflow-auto text-sm"
                              dangerouslySetInnerHTML={{ __html: preview.html }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {(preview as any)?.error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {(preview as any).error}
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </section>

          {/* Section 3: Goal Generation */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-600" /> AI 目标生成
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">员工姓名</Label>
                    <Input placeholder="输入员工姓名" value={goalEmployeeName} onChange={(e) => setGoalEmployeeName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">补充说明（可选）</Label>
                    <Textarea placeholder="如项目要求、部门重点等" value={goalContext} onChange={(e) => setGoalContext(e.target.value)} className="mt-1 min-h-[38px]" rows={1} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    disabled={!goalEmployeeName.trim() || goalMutation.isPending}
                    onClick={() => goalMutation.mutate({ cycleId: selectedCycleId, employeeName: goalEmployeeName.trim(), additionalContext: goalContext.trim() || undefined })}
                    className="gap-1.5"
                  >
                    {goalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    生成目标
                  </Button>
                  <Button
                    variant="outline"
                    disabled={batchGoalMutation.isPending}
                    onClick={() => batchGoalMutation.mutate({ cycleId: selectedCycleId })}
                    className="gap-1.5"
                  >
                    {batchGoalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    批量生成全部
                  </Button>
                </div>

                {goals && goals.goals && goals.goals.length > 0 && (
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-indigo-600" />
                      {goalEmployeeName} — 下月目标
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                      {goals.goals.map((g: string, i: number) => <li key={i}>{g}</li>)}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Section 4: History */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-600" /> 周期概览
            </h2>
            <Card>
              <CardContent className="pt-6">
                {historyQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">暂无周期数据</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>周期</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyQuery.data.map((row: any) => (
                        <TableRow key={row.cycleId}>
                          <TableCell className="font-mono text-xs">{row.cycleId}</TableCell>
                          <TableCell className="font-medium">{row.name ?? "—"}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "calculated" || row.status === "approved" ? "default" : "secondary"} className="text-xs">
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

/* ---- Notification Result Display ---- */
function NotificationResult({ data, dryRun }: { data: any; dryRun: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-2">
      <div className="flex items-center gap-2 text-emerald-700 font-medium">
        <CheckCircle className="h-5 w-5" /> 通知{dryRun ? "试运行" : "发送"}完成
        {dryRun && <Badge variant="secondary" className="text-xs">试运行</Badge>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div>总员工: <strong>{data.totalEmployees ?? 0}</strong></div>
        <div>生成摘要: <strong>{data.summariesGenerated ?? 0}</strong></div>
        <div>邮件发送: <strong>{data.emailsSent ?? 0}</strong></div>
        <div>失败: <strong className={data.emailsFailed ? "text-red-600" : ""}>{data.emailsFailed ?? 0}</strong></div>
      </div>
      {data.errors?.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.errors.slice(0, 10).map((e: any, i: number) => (
            <div key={i} className="text-sm text-red-600 flex items-start gap-1.5">
              <MailX className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{e.employeeName}: {e.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Status Card Sub-Component ---- */
function StatusCard({ icon: Icon, label, value, accent, bgAccent }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; title?: string }>; label: string; value: number | string; accent?: string; bgAccent?: string;
}) {
  return (
    <Card className={bgAccent}>
      <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${accent ?? "text-muted-foreground"}`} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-lg font-semibold leading-tight ${accent ?? ""}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
