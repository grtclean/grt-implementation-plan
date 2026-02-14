import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Play, Trash2, GraduationCap, BarChart3, CheckCircle, XCircle, SkipForward, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function WorkflowCoachingTab() {
  // Rule creation form
  const [ruleName, setRuleName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("meeting_ended");
  const [conditionField, setConditionField] = useState("");
  const [conditionOperator, setConditionOperator] = useState("<");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState("notify");
  const [ruleScope, setRuleScope] = useState("global");

  // Evaluate form
  const [evalMeetingId, setEvalMeetingId] = useState("");
  const [evalEvent, setEvalEvent] = useState("meeting_ended");

  // Coaching form
  const [coachScope, setCoachScope] = useState("organization");
  const [coachScopeId, setCoachScopeId] = useState("");
  const [coachPeriod, setCoachPeriod] = useState("monthly");

  // Culture score
  const [culturePeriod, setCulturePeriod] = useState("monthly");

  const rulesQuery = trpc.ime.listRules.useQuery({});
  const executionsQuery = trpc.ime.workflowExecutions.useQuery({});
  const cultureQuery = trpc.ime.meetingCultureScore.useQuery({ period: culturePeriod });

  const createRuleMut = trpc.ime.createRule.useMutation({
    onSuccess: () => { rulesQuery.refetch(); setRuleName(""); setConditionField(""); setConditionValue(""); },
  });
  const deleteRuleMut = trpc.ime.deleteRule.useMutation({
    onSuccess: () => rulesQuery.refetch(),
  });
  const evaluateMut = trpc.ime.evaluateRules.useMutation({
    onSuccess: () => executionsQuery.refetch(),
  });
  const coachingMut = trpc.ime.generateCoaching.useMutation();

  const rules = (rulesQuery.data || []) as any[];
  const executions = (executionsQuery.data || []) as any[];
  const culture = cultureQuery.data as any;

  return (
    <div className="space-y-6">
      {/* Culture Score Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            会议文化评分
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={culturePeriod} onValueChange={setCulturePeriod}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">近30天</SelectItem>
                <SelectItem value="quarterly">近90天</SelectItem>
                <SelectItem value="yearly">近一年</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {culture ? (
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold">{Math.round(culture.cultureScore)}</div>
                  <div className="text-sm text-muted-foreground">综合文化评分</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{culture.volume?.totalMeetings || 0}</div>
                  <div className="text-sm text-muted-foreground">会议总数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{culture.volume?.avgDuration || 0}分钟</div>
                  <div className="text-sm text-muted-foreground">平均时长</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{culture.fatigueIndex}</div>
                  <div className="text-sm text-muted-foreground">疲劳指数</div>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(culture.dimensions || {}).map(([key, val]) => (
                  <div key={key} className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-semibold">{val as number}</div>
                    <div className="text-xs text-muted-foreground">
                      {key === "effectiveness" ? "效能" : key === "healthScore" ? "健康度" : key === "followThrough" ? "执行力" : key === "sentiment" ? "情感" : key === "collaboration" ? "协作" : key === "roi" ? "ROI" : key}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">加载中...</p>
          )}
        </CardContent>
      </Card>

      {/* Workflow Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            自动化规则
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder="规则名称" value={ruleName} onChange={e => setRuleName(e.target.value)} />
            <Select value={triggerEvent} onValueChange={setTriggerEvent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting_ended">会议结束</SelectItem>
                <SelectItem value="health_below">健康度低于</SelectItem>
                <SelectItem value="action_overdue">行动项逾期</SelectItem>
                <SelectItem value="roi_low">ROI过低</SelectItem>
                <SelectItem value="sentiment_negative">情感消极</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">通知</SelectItem>
                <SelectItem value="generate_report">生成报告</SelectItem>
                <SelectItem value="create_action_item">创建行动项</SelectItem>
                <SelectItem value="escalate">升级处理</SelectItem>
                <SelectItem value="coaching">触发教练</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ruleScope} onValueChange={setRuleScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">全局</SelectItem>
                <SelectItem value="department">部门</SelectItem>
                <SelectItem value="channel">频道</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder="条件字段 (如 health_score)" value={conditionField} onChange={e => setConditionField(e.target.value)} />
            <Select value={conditionOperator} onValueChange={setConditionOperator}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="<">{"<"}</SelectItem>
                <SelectItem value=">">{">"}</SelectItem>
                <SelectItem value="<=">{"\u2264"}</SelectItem>
                <SelectItem value=">=">{"\u2265"}</SelectItem>
                <SelectItem value="==">{"="}</SelectItem>
                <SelectItem value="!=">{"≠"}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="阈值" value={conditionValue} onChange={e => setConditionValue(e.target.value)} />
            <Button
              onClick={() => createRuleMut.mutate({
                name: ruleName, triggerEvent, conditionField: conditionField || undefined,
                conditionOperator: conditionField ? conditionOperator : undefined,
                conditionValue: conditionField ? conditionValue : undefined,
                actionType, scope: ruleScope,
              })}
              disabled={!ruleName || createRuleMut.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createRuleMut.isPending ? "创建中..." : "添加规则"}
            </Button>
          </div>

          {rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>触发事件</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>范围</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.trigger_event}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {r.condition_field ? `${r.condition_field} ${r.condition_operator} ${r.condition_value}` : "—"}
                    </TableCell>
                    <TableCell><Badge>{r.action_type}</Badge></TableCell>
                    <TableCell>{r.scope}{r.scope_id ? `: ${r.scope_id}` : ""}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => deleteRuleMut.mutate({ id: r.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Evaluate Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            手动触发规则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="会议ID" value={evalMeetingId} onChange={e => setEvalMeetingId(e.target.value)} className="flex-1" />
            <Select value={evalEvent} onValueChange={setEvalEvent}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting_ended">会议结束</SelectItem>
                <SelectItem value="health_below">健康度检查</SelectItem>
                <SelectItem value="action_overdue">行动项检查</SelectItem>
                <SelectItem value="roi_low">ROI检查</SelectItem>
                <SelectItem value="sentiment_negative">情感检查</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => evaluateMut.mutate({ meetingId: evalMeetingId, event: evalEvent })} disabled={!evalMeetingId || evaluateMut.isPending}>
              {evaluateMut.isPending ? "执行中..." : "执行规则"}
            </Button>
          </div>
          {evaluateMut.data && (
            <div className="mt-3 p-3 bg-muted rounded text-sm">
              <p>匹配 {(evaluateMut.data as any).total} 条规则，执行 {(evaluateMut.data as any).executed} 条</p>
              {((evaluateMut.data as any).results || []).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  {r.status === "success" ? <CheckCircle className="h-3 w-3 text-green-500" /> : <SkipForward className="h-3 w-3 text-gray-400" />}
                  <span>{r.ruleName}</span>
                  <Badge variant={r.status === "success" ? "default" : "secondary"} className="text-xs">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            执行历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则</TableHead>
                  <TableHead>事件</TableHead>
                  <TableHead>会议</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.slice(0, 20).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{e.trigger_event}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{e.trigger_meeting_id?.slice(0, 8)}</TableCell>
                    <TableCell>{e.action_type}</TableCell>
                    <TableCell>
                      {e.status === "success" ? <Badge className="bg-green-100 text-green-800">成功</Badge>
                        : e.status === "failed" ? <Badge variant="destructive">失败</Badge>
                        : <Badge variant="secondary">跳过</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{e.executed_at ? new Date(e.executed_at).toLocaleString("zh-CN") : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">暂无执行记录</p>
          )}
        </CardContent>
      </Card>

      {/* Coaching Plan Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            会议教练计划
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={coachScope} onValueChange={setCoachScope}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">组织级</SelectItem>
                <SelectItem value="department">部门级</SelectItem>
                <SelectItem value="individual">个人级</SelectItem>
              </SelectContent>
            </Select>
            {coachScope !== "organization" && (
              <Input placeholder={coachScope === "department" ? "部门名称" : "用户ID"} value={coachScopeId} onChange={e => setCoachScopeId(e.target.value)} className="w-[200px]" />
            )}
            <Select value={coachPeriod} onValueChange={setCoachPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">月度</SelectItem>
                <SelectItem value="quarterly">季度</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => coachingMut.mutate({ scope: coachScope, scopeId: coachScopeId || undefined, period: coachPeriod })} disabled={coachingMut.isPending}>
              {coachingMut.isPending ? "生成中..." : "生成教练计划"}
            </Button>
          </div>

          {coachingMut.data && (
            <div className="space-y-3 p-4 bg-muted rounded">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-3xl font-bold">{Math.round((coachingMut.data as any).cultureScore)}</span>
                  <span className="text-sm text-muted-foreground ml-1">文化评分</span>
                </div>
                {(coachingMut.data as any).dimensions && (
                  <div className="flex gap-3 text-sm">
                    {Object.entries((coachingMut.data as any).dimensions).map(([k, v]) => (
                      <span key={k}>{k}: <strong>{v as number}</strong></span>
                    ))}
                  </div>
                )}
              </div>

              {(coachingMut.data as any).strengths?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">优势</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(coachingMut.data as any).strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {(coachingMut.data as any).improvements?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">改进建议</h4>
                  <div className="space-y-2">
                    {(coachingMut.data as any).improvements.map((imp: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">{imp.priority || "P2"}</Badge>
                        <div>
                          <span className="font-medium">{imp.area}</span>
                          <span className="text-muted-foreground"> — {imp.recommendation}</span>
                          {imp.expected_impact && <span className="text-xs text-blue-600 ml-1">({imp.expected_impact})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(coachingMut.data as any).actionPlan?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">行动计划</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>步骤</TableHead>
                        <TableHead>负责人</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead>指标</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(coachingMut.data as any).actionPlan.map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{a.step}</TableCell>
                          <TableCell>{a.owner || "—"}</TableCell>
                          <TableCell>{a.timeline || "—"}</TableCell>
                          <TableCell>{a.metric || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {(coachingMut.data as any).narrative && (
                <p className="text-sm text-muted-foreground italic">{(coachingMut.data as any).narrative}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
