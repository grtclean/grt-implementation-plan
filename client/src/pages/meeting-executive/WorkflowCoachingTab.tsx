import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Play, Trash2, GraduationCap, BarChart3, CheckCircle, XCircle, SkipForward, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export function WorkflowCoachingTab() {
  const { t } = useLanguage();

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

  const dimensionLabel = (key: string) => {
    const map: Record<string, string> = {
      effectiveness: t("meeting.workflow.dimEffectiveness"),
      healthScore: t("meeting.workflow.dimHealth"),
      followThrough: t("meeting.workflow.dimFollowThrough"),
      sentiment: t("meeting.workflow.dimSentiment"),
      collaboration: t("meeting.workflow.dimCollaboration"),
      roi: t("meeting.workflow.dimROI"),
    };
    return map[key] || key;
  };

  return (
    <div className="space-y-6">
      {/* Culture Score Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("meeting.workflow.cultureScore")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={culturePeriod} onValueChange={setCulturePeriod}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("meeting.workflow.last30days")}</SelectItem>
                <SelectItem value="quarterly">{t("meeting.workflow.last90days")}</SelectItem>
                <SelectItem value="yearly">{t("meeting.workflow.lastYear")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {culture ? (
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold">{Math.round(culture.cultureScore)}</div>
                  <div className="text-sm text-muted-foreground">{t("meeting.workflow.compositeCultureScore")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{culture.volume?.totalMeetings || 0}</div>
                  <div className="text-sm text-muted-foreground">{t("meeting.workflow.totalMeetings")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{culture.volume?.avgDuration || 0}{t("meeting.workflow.minutes")}</div>
                  <div className="text-sm text-muted-foreground">{t("meeting.workflow.avgDuration")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold">{culture.fatigueIndex}</div>
                  <div className="text-sm text-muted-foreground">{t("meeting.workflow.fatigueIndex")}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(culture.dimensions || {}).map(([key, val]) => (
                  <div key={key} className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-semibold">{val as number}</div>
                    <div className="text-xs text-muted-foreground">
                      {dimensionLabel(key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("meeting.workflow.loading")}</p>
          )}
        </CardContent>
      </Card>

      {/* Workflow Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t("meeting.workflow.automationRules")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder={t("meeting.workflow.ruleName")} value={ruleName} onChange={e => setRuleName(e.target.value)} />
            <Select value={triggerEvent} onValueChange={setTriggerEvent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting_ended">{t("meeting.workflow.triggerMeetingEnded")}</SelectItem>
                <SelectItem value="health_below">{t("meeting.workflow.triggerHealthBelow")}</SelectItem>
                <SelectItem value="action_overdue">{t("meeting.workflow.triggerActionOverdue")}</SelectItem>
                <SelectItem value="roi_low">{t("meeting.workflow.triggerROILow")}</SelectItem>
                <SelectItem value="sentiment_negative">{t("meeting.workflow.triggerSentimentNeg")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">{t("meeting.workflow.actionNotify")}</SelectItem>
                <SelectItem value="generate_report">{t("meeting.workflow.actionGenerateReport")}</SelectItem>
                <SelectItem value="create_action_item">{t("meeting.workflow.actionCreateItem")}</SelectItem>
                <SelectItem value="escalate">{t("meeting.workflow.actionEscalate")}</SelectItem>
                <SelectItem value="coaching">{t("meeting.workflow.actionCoaching")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ruleScope} onValueChange={setRuleScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">{t("meeting.workflow.scopeGlobal")}</SelectItem>
                <SelectItem value="department">{t("meeting.workflow.scopeDepartment")}</SelectItem>
                <SelectItem value="channel">{t("meeting.workflow.scopeChannel")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder={t("meeting.workflow.conditionField")} value={conditionField} onChange={e => setConditionField(e.target.value)} />
            <Select value={conditionOperator} onValueChange={setConditionOperator}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="<">{"<"}</SelectItem>
                <SelectItem value=">">{">"}</SelectItem>
                <SelectItem value="<=">{"\u2264"}</SelectItem>
                <SelectItem value=">=">{"\u2265"}</SelectItem>
                <SelectItem value="==">{"="}</SelectItem>
                <SelectItem value="!=">{"\u2260"}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t("meeting.workflow.threshold")} value={conditionValue} onChange={e => setConditionValue(e.target.value)} />
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
              {createRuleMut.isPending ? t("meeting.workflow.creating") : t("meeting.workflow.addRule")}
            </Button>
          </div>

          {rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.workflow.thName")}</TableHead>
                  <TableHead>{t("meeting.workflow.thTrigger")}</TableHead>
                  <TableHead>{t("meeting.workflow.thCondition")}</TableHead>
                  <TableHead>{t("meeting.workflow.thAction")}</TableHead>
                  <TableHead>{t("meeting.workflow.thScope")}</TableHead>
                  <TableHead>{t("meeting.workflow.thOps")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.trigger_event}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {r.condition_field ? `${r.condition_field} ${r.condition_operator} ${r.condition_value}` : "\u2014"}
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
            {t("meeting.workflow.manualTrigger")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder={t("meeting.workflow.meetingId")} value={evalMeetingId} onChange={e => setEvalMeetingId(e.target.value)} className="flex-1" />
            <Select value={evalEvent} onValueChange={setEvalEvent}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting_ended">{t("meeting.workflow.triggerMeetingEnded")}</SelectItem>
                <SelectItem value="health_below">{t("meeting.workflow.evalHealthCheck")}</SelectItem>
                <SelectItem value="action_overdue">{t("meeting.workflow.evalActionCheck")}</SelectItem>
                <SelectItem value="roi_low">{t("meeting.workflow.evalROICheck")}</SelectItem>
                <SelectItem value="sentiment_negative">{t("meeting.workflow.evalSentimentCheck")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => evaluateMut.mutate({ meetingId: evalMeetingId, event: evalEvent })} disabled={!evalMeetingId || evaluateMut.isPending}>
              {evaluateMut.isPending ? t("meeting.workflow.executing") : t("meeting.workflow.executeRules")}
            </Button>
          </div>
          {evaluateMut.data && (
            <div className="mt-3 p-3 bg-muted rounded text-sm">
              <p>{t("meeting.workflow.matched")} {(evaluateMut.data as any).total} {t("meeting.workflow.rulesExecuted")} {(evaluateMut.data as any).executed} {t("meeting.workflow.rulesCount")}</p>
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
            {t("meeting.workflow.executionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.workflow.exRule")}</TableHead>
                  <TableHead>{t("meeting.workflow.exEvent")}</TableHead>
                  <TableHead>{t("meeting.workflow.exMeeting")}</TableHead>
                  <TableHead>{t("meeting.workflow.exAction")}</TableHead>
                  <TableHead>{t("meeting.workflow.exStatus")}</TableHead>
                  <TableHead>{t("meeting.workflow.exTime")}</TableHead>
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
                      {e.status === "success" ? <Badge className="bg-green-100 text-green-800">{t("meeting.workflow.statusSuccess")}</Badge>
                        : e.status === "failed" ? <Badge variant="destructive">{t("meeting.workflow.statusFailed")}</Badge>
                        : <Badge variant="secondary">{t("meeting.workflow.statusSkipped")}</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{e.executed_at ? new Date(e.executed_at).toLocaleString("zh-CN") : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("meeting.workflow.noExecutionHistory")}</p>
          )}
        </CardContent>
      </Card>

      {/* Coaching Plan Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {t("meeting.workflow.coachingPlan")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={coachScope} onValueChange={setCoachScope}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">{t("meeting.workflow.coachOrg")}</SelectItem>
                <SelectItem value="department">{t("meeting.workflow.coachDept")}</SelectItem>
                <SelectItem value="individual">{t("meeting.workflow.coachIndividual")}</SelectItem>
              </SelectContent>
            </Select>
            {coachScope !== "organization" && (
              <Input placeholder={coachScope === "department" ? t("meeting.workflow.deptName") : t("meeting.workflow.userId")} value={coachScopeId} onChange={e => setCoachScopeId(e.target.value)} className="w-[200px]" />
            )}
            <Select value={coachPeriod} onValueChange={setCoachPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("meeting.workflow.monthly")}</SelectItem>
                <SelectItem value="quarterly">{t("meeting.workflow.quarterly")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => coachingMut.mutate({ scope: coachScope, scopeId: coachScopeId || undefined, period: coachPeriod })} disabled={coachingMut.isPending}>
              {coachingMut.isPending ? t("meeting.workflow.generating") : t("meeting.workflow.generatePlan")}
            </Button>
          </div>

          {coachingMut.data && (
            <div className="space-y-3 p-4 bg-muted rounded">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-3xl font-bold">{Math.round((coachingMut.data as any).cultureScore)}</span>
                  <span className="text-sm text-muted-foreground ml-1">{t("meeting.workflow.cultureScore")}</span>
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
                  <h4 className="font-semibold text-sm mb-1">{t("meeting.workflow.strengths")}</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {(coachingMut.data as any).strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {(coachingMut.data as any).improvements?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">{t("meeting.workflow.improvements")}</h4>
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
                  <h4 className="font-semibold text-sm mb-1">{t("meeting.workflow.actionPlan")}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("meeting.workflow.apStep")}</TableHead>
                        <TableHead>{t("meeting.workflow.apOwner")}</TableHead>
                        <TableHead>{t("meeting.workflow.apTimeline")}</TableHead>
                        <TableHead>{t("meeting.workflow.apMetric")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(coachingMut.data as any).actionPlan.map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{a.step}</TableCell>
                          <TableCell>{a.owner || "\u2014"}</TableCell>
                          <TableCell>{a.timeline || "\u2014"}</TableCell>
                          <TableCell>{a.metric || "\u2014"}</TableCell>
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
