import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Plus, Trash2, Search, Play, CheckCircle, XCircle, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

const CONDITION_TYPE_KEYS: Record<string, string> = {
  engagement_score: "meeting.hrLinkage.condEngagement",
  contribution_score: "meeting.hrLinkage.condContribution",
  behavior_tag: "meeting.hrLinkage.condBehavior",
  action_item_accepted: "meeting.hrLinkage.condActionItems",
  decision_count: "meeting.hrLinkage.condDecisions",
  signal_type: "meeting.hrLinkage.condSignalType",
  question_count: "meeting.hrLinkage.condQuestions",
  insight_count: "meeting.hrLinkage.condInsights",
};

const ACTION_TYPE_KEYS: Record<string, string> = {
  update_kpi: "meeting.hrLinkage.actUpdateKpi",
  flag_training: "meeting.hrLinkage.actFlagTraining",
  add_achievement: "meeting.hrLinkage.actAddAchievement",
  adjust_score: "meeting.hrLinkage.actAdjustScore",
  create_key_result: "meeting.hrLinkage.actCreateKeyResult",
  coaching_suggestion: "meeting.hrLinkage.actCoachingSuggestion",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  executed: "bg-green-100 text-green-800",
};

export function HrPerformanceLinkageTab() {
  const { t } = useLanguage();
  // Rule form
  const [ruleName, setRuleName] = useState("");
  const [condType, setCondType] = useState("contribution_score");
  const [condField, setCondField] = useState("");
  const [condOp, setCondOp] = useState(">=");
  const [condThreshold, setCondThreshold] = useState("");
  const [actType, setActType] = useState("update_kpi");
  const [actTarget, setActTarget] = useState("");
  const [actValue, setActValue] = useState("");
  const [impactDim, setImpactDim] = useState("");
  const [ruleScope, setRuleScope] = useState("individual");
  const [rulePriority, setRulePriority] = useState("0");

  // Evaluate form
  const [evalMeetingId, setEvalMeetingId] = useState("");

  // Action log filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterActionType, setFilterActionType] = useState("all");

  // Execute selection
  const [selectedActions, setSelectedActions] = useState<number[]>([]);

  // Expanded rows
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Queries
  const dashboardQuery = trpc.ime.linkageDashboard.useQuery({});
  const rulesQuery = trpc.ime.listLinkageRules.useQuery({});
  const actionsQuery = trpc.ime.hrActionLog.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus,
    employeeId: filterEmployee || undefined,
    actionType: filterActionType === "all" ? undefined : filterActionType,
  });

  // Mutations
  const createRuleMut = trpc.ime.createLinkageRule.useMutation({
    onSuccess: () => { rulesQuery.refetch(); dashboardQuery.refetch(); setRuleName(""); setCondThreshold(""); setActValue(""); },
  });
  const deleteRuleMut = trpc.ime.deleteLinkageRule.useMutation({
    onSuccess: () => { rulesQuery.refetch(); dashboardQuery.refetch(); },
  });
  const evaluateMut = trpc.ime.evaluateLinkage.useMutation({
    onSuccess: () => { actionsQuery.refetch(); dashboardQuery.refetch(); },
  });
  const approveMut = trpc.ime.approveHrAction.useMutation({
    onSuccess: () => { actionsQuery.refetch(); dashboardQuery.refetch(); },
  });
  const rejectMut = trpc.ime.rejectHrAction.useMutation({
    onSuccess: () => { actionsQuery.refetch(); dashboardQuery.refetch(); },
  });
  const executeMut = trpc.ime.executeHrActions.useMutation({
    onSuccess: () => { actionsQuery.refetch(); dashboardQuery.refetch(); setSelectedActions([]); },
  });

  const dashboard = dashboardQuery.data as any;
  const rules = (rulesQuery.data || []) as any[];
  const actions = (actionsQuery.data || []) as any[];
  const approvedActions = actions.filter((a: any) => a.status === "approved");

  const toggleActionSelect = (id: number) => {
    setSelectedActions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Link2 className="h-7 w-7 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.activeRules || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.hrLinkage.activeRules")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-7 w-7 mx-auto text-yellow-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.pendingActions || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.hrLinkage.pendingActions")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-7 w-7 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.executedActions || 0}</div>
            <div className="text-xs text-muted-foreground">{t("meeting.hrLinkage.executedActions")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Zap className="h-7 w-7 mx-auto text-purple-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.approvalRate || 0}%</div>
            <div className="text-xs text-muted-foreground">{t("meeting.hrLinkage.approvalRate")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Linkage Rules Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t("meeting.hrLinkage.ruleManagement")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder={t("meeting.hrLinkage.ruleName")} value={ruleName} onChange={e => setRuleName(e.target.value)} />
            <Select value={condType} onValueChange={setCondType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CONDITION_TYPE_KEYS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={condOp} onValueChange={setCondOp}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value=">=">{"≥"}</SelectItem>
                <SelectItem value="<=">{"≤"}</SelectItem>
                <SelectItem value=">">{">"}</SelectItem>
                <SelectItem value="<">{"<"}</SelectItem>
                <SelectItem value="==">{"="}</SelectItem>
                <SelectItem value="!=">{"≠"}</SelectItem>
                <SelectItem value="contains">{t("meeting.hrLinkage.contains")}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t("meeting.hrLinkage.threshold")} value={condThreshold} onChange={e => setCondThreshold(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Select value={actType} onValueChange={setActType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_TYPE_KEYS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder={t("meeting.hrLinkage.actionTarget")} value={actTarget} onChange={e => setActTarget(e.target.value)} />
            <Input placeholder={t("meeting.hrLinkage.actionValue")} value={actValue} onChange={e => setActValue(e.target.value)} />
            <Input placeholder={t("meeting.hrLinkage.impactDimension")} value={impactDim} onChange={e => setImpactDim(e.target.value)} />
            <Select value={ruleScope} onValueChange={setRuleScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">{t("meeting.hrLinkage.scopeIndividual")}</SelectItem>
                <SelectItem value="team">{t("meeting.hrLinkage.scopeTeam")}</SelectItem>
                <SelectItem value="department">{t("meeting.hrLinkage.scopeDepartment")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input className="w-24" placeholder={t("meeting.hrLinkage.priority")} type="number" value={rulePriority} onChange={e => setRulePriority(e.target.value)} />
            <Button
              onClick={() => createRuleMut.mutate({
                name: ruleName,
                conditionType: condType,
                conditionField: condField || condType,
                conditionOperator: condOp,
                conditionThreshold: condThreshold,
                actionType: actType,
                actionTarget: actTarget || undefined,
                actionValue: actValue || undefined,
                impactDimension: impactDim || undefined,
                scope: ruleScope,
                priority: Number(rulePriority) || 0,
              })}
              disabled={!ruleName || !condThreshold || createRuleMut.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createRuleMut.isPending ? t("meeting.hrLinkage.creating") : t("meeting.hrLinkage.createRule")}
            </Button>
          </div>

          {rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.hrLinkage.ruleName")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.condition")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.operation")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.scope")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.priority")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.statusLabel")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.delete")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">
                      {CONDITION_TYPE_KEYS[r.condition_type] ? t(CONDITION_TYPE_KEYS[r.condition_type]) : r.condition_type} {r.condition_operator} {r.condition_threshold}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ACTION_TYPE_KEYS[r.action_type] ? t(ACTION_TYPE_KEYS[r.action_type]) : r.action_type}</Badge>
                    </TableCell>
                    <TableCell>{r.scope}</TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>
                      <Badge className={r.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                        {r.is_active ? t("meeting.hrLinkage.statusActive") : t("meeting.hrLinkage.statusInactive")}
                      </Badge>
                    </TableCell>
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

      {/* Section 3: Evaluate Meeting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t("meeting.hrLinkage.evaluateTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder={t("meeting.hrLinkage.enterMeetingId")} value={evalMeetingId} onChange={e => setEvalMeetingId(e.target.value)} className="max-w-md" />
            <Button onClick={() => evaluateMut.mutate({ meetingId: evalMeetingId })} disabled={!evalMeetingId || evaluateMut.isPending}>
              <Play className="h-4 w-4 mr-1" />
              {evaluateMut.isPending ? t("meeting.hrLinkage.evaluating") : t("meeting.hrLinkage.evaluate")}
            </Button>
          </div>
          {evaluateMut.data && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="font-medium">{t("meeting.hrLinkage.evalResult")} {(evaluateMut.data as any).actionsGenerated} {t("meeting.hrLinkage.hrActions")}</div>
              {((evaluateMut.data as any).byEmployee || []).map((emp: any, i: number) => (
                <div key={i} className="ml-4 text-sm">
                  <span className="font-medium">{emp.employeeName}</span>: {emp.actions.length} {t("meeting.hrLinkage.actions")}
                  <ul className="ml-4 list-disc">
                    {emp.actions.map((a: any, j: number) => (
                      <li key={j}>{a.ruleName} → {ACTION_TYPE_KEYS[a.actionType] ? t(ACTION_TYPE_KEYS[a.actionType]) : a.actionType}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: HR Action Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("meeting.hrLinkage.actionLogTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t("meeting.hrLinkage.statusLabel")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("meeting.hrLinkage.allStatus")}</SelectItem>
                <SelectItem value="pending">{t("meeting.hrLinkage.pending")}</SelectItem>
                <SelectItem value="approved">{t("meeting.hrLinkage.approved")}</SelectItem>
                <SelectItem value="rejected">{t("meeting.hrLinkage.rejected")}</SelectItem>
                <SelectItem value="executed">{t("meeting.hrLinkage.executed")}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t("meeting.hrLinkage.employeeSearch")} value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="w-40" />
            <Select value={filterActionType} onValueChange={setFilterActionType}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t("meeting.hrLinkage.actionType")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("meeting.hrLinkage.allTypes")}</SelectItem>
                {Object.entries(ACTION_TYPE_KEYS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {actions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.hrLinkage.employee")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.actionType")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.reason")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.impactLabel")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.statusLabel")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.approval")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a: any) => (
                  <>
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.employee_name || a.employee_id}</TableCell>
                      <TableCell><Badge variant="outline">{ACTION_TYPE_KEYS[a.action_type] ? t(ACTION_TYPE_KEYS[a.action_type]) : a.action_type}</Badge></TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{a.reason}</TableCell>
                      <TableCell className="text-sm">{a.impact_dimension} {a.impact_value}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[a.status] || ""}>{a.status}</Badge></TableCell>
                      <TableCell>
                        {a.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => approveMut.mutate({ id: a.id, reviewedBy: "current_user" })}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => rejectMut.mutate({ id: a.id, reviewedBy: "current_user" })}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setExpandedRow(expandedRow === a.id ? null : a.id)}>
                          {expandedRow === a.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === a.id && (
                      <TableRow key={`${a.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/50">
                          <div className="p-2 space-y-1 text-sm">
                            <div><strong>{t("meeting.hrLinkage.detailDesc")}</strong> {a.action_description}</div>
                            <div><strong>{t("meeting.hrLinkage.rule")}</strong> {a.rule_name} (ID: {a.rule_id})</div>
                            <div><strong>{t("meeting.hrLinkage.meeting")}</strong> {a.meeting_title || a.meeting_id}</div>
                            {a.review_notes && <div><strong>{t("meeting.hrLinkage.reviewNotes")}</strong> {a.review_notes}</div>}
                            {a.source_data && (
                              <div><strong>{t("meeting.hrLinkage.sourceData")}</strong> <code className="text-xs">{typeof a.source_data === "string" ? a.source_data : JSON.stringify(a.source_data)}</code></div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
          {actions.length === 0 && <div className="text-center text-muted-foreground py-4">{t("meeting.hrLinkage.noActionRecords")}</div>}
        </CardContent>
      </Card>

      {/* Section 5: Execute Approved Actions */}
      {approvedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {t("meeting.hrLinkage.executeApproved")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedActions.length === approvedActions.length && approvedActions.length > 0}
                      onChange={() => {
                        if (selectedActions.length === approvedActions.length) {
                          setSelectedActions([]);
                        } else {
                          setSelectedActions(approvedActions.map((a: any) => a.id));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>{t("meeting.hrLinkage.employee")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.operation")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.impactDimensionLabel")}</TableHead>
                  <TableHead>{t("meeting.hrLinkage.impactValueLabel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedActions.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedActions.includes(a.id)} onChange={() => toggleActionSelect(a.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{a.employee_name || a.employee_id}</TableCell>
                    <TableCell><Badge variant="outline">{ACTION_TYPE_KEYS[a.action_type] ? t(ACTION_TYPE_KEYS[a.action_type]) : a.action_type}</Badge></TableCell>
                    <TableCell>{a.impact_dimension}</TableCell>
                    <TableCell>{a.impact_value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              onClick={() => { if (selectedActions.length > 0 && confirm(`${t("meeting.hrLinkage.confirmExecute")} ${selectedActions.length}?`)) executeMut.mutate({ actionIds: selectedActions }); }}
              disabled={selectedActions.length === 0 || executeMut.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              {executeMut.isPending ? t("meeting.hrLinkage.executing") : `${t("meeting.hrLinkage.executeSelected")} (${selectedActions.length})`}
            </Button>
            {executeMut.data && (
              <div className="text-sm text-muted-foreground">
                {t("meeting.hrLinkage.executeComplete")} {(executeMut.data as any).executed} {t("meeting.hrLinkage.successCount")}, {(executeMut.data as any).failed} {t("meeting.hrLinkage.failedCount")}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
