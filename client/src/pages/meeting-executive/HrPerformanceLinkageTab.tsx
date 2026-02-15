import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Plus, Trash2, Search, Play, CheckCircle, XCircle, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

const CONDITION_TYPES: Record<string, string> = {
  engagement_score: "参与度分数",
  contribution_score: "贡献评分",
  behavior_tag: "行为标签",
  action_item_accepted: "接受行动项数",
  decision_count: "决策数",
  signal_type: "信号类型",
  question_count: "提问数",
  insight_count: "洞察数",
};

const ACTION_TYPES: Record<string, string> = {
  update_kpi: "更新KPI",
  flag_training: "标记培训",
  add_achievement: "添加成就",
  adjust_score: "调整评分",
  create_key_result: "创建关键结果",
  coaching_suggestion: "辅导建议",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  executed: "bg-green-100 text-green-800",
};

export function HrPerformanceLinkageTab() {
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
            <div className="text-xs text-muted-foreground">活跃规则</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-7 w-7 mx-auto text-yellow-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.pendingActions || 0}</div>
            <div className="text-xs text-muted-foreground">待审批操作</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-7 w-7 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.executedActions || 0}</div>
            <div className="text-xs text-muted-foreground">已执行操作</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Zap className="h-7 w-7 mx-auto text-purple-500 mb-1" />
            <div className="text-2xl font-bold">{dashboard?.approvalRate || 0}%</div>
            <div className="text-xs text-muted-foreground">批准率</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Linkage Rules Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            联动规则管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder="规则名称" value={ruleName} onChange={e => setRuleName(e.target.value)} />
            <Select value={condType} onValueChange={setCondType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CONDITION_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
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
                <SelectItem value="contains">包含</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="阈值" value={condThreshold} onChange={e => setCondThreshold(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Select value={actType} onValueChange={setActType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="操作目标" value={actTarget} onChange={e => setActTarget(e.target.value)} />
            <Input placeholder="操作值" value={actValue} onChange={e => setActValue(e.target.value)} />
            <Input placeholder="影响维度" value={impactDim} onChange={e => setImpactDim(e.target.value)} />
            <Select value={ruleScope} onValueChange={setRuleScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">个人</SelectItem>
                <SelectItem value="team">团队</SelectItem>
                <SelectItem value="department">部门</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input className="w-24" placeholder="优先级" type="number" value={rulePriority} onChange={e => setRulePriority(e.target.value)} />
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
              {createRuleMut.isPending ? "创建中..." : "创建规则"}
            </Button>
          </div>

          {rules.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>规则名称</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>范围</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>删除</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">
                      {CONDITION_TYPES[r.condition_type] || r.condition_type} {r.condition_operator} {r.condition_threshold}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ACTION_TYPES[r.action_type] || r.action_type}</Badge>
                    </TableCell>
                    <TableCell>{r.scope}</TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>
                      <Badge className={r.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                        {r.is_active ? "活跃" : "停用"}
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
            会议联动评估
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="输入会议ID" value={evalMeetingId} onChange={e => setEvalMeetingId(e.target.value)} className="max-w-md" />
            <Button onClick={() => evaluateMut.mutate({ meetingId: evalMeetingId })} disabled={!evalMeetingId || evaluateMut.isPending}>
              <Play className="h-4 w-4 mr-1" />
              {evaluateMut.isPending ? "评估中..." : "评估"}
            </Button>
          </div>
          {evaluateMut.data && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="font-medium">评估结果: 生成 {(evaluateMut.data as any).actionsGenerated} 个HR操作</div>
              {((evaluateMut.data as any).byEmployee || []).map((emp: any, i: number) => (
                <div key={i} className="ml-4 text-sm">
                  <span className="font-medium">{emp.employeeName}</span>: {emp.actions.length} 个操作
                  <ul className="ml-4 list-disc">
                    {emp.actions.map((a: any, j: number) => (
                      <li key={j}>{a.ruleName} → {ACTION_TYPES[a.actionType] || a.actionType}</li>
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
            HR操作日志与审批
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审批</SelectItem>
                <SelectItem value="approved">已批准</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
                <SelectItem value="executed">已执行</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="员工搜索" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="w-40" />
            <Select value={filterActionType} onValueChange={setFilterActionType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="操作类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {Object.entries(ACTION_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {actions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>操作类型</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>影响</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>审批</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a: any) => (
                  <>
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.employee_name || a.employee_id}</TableCell>
                      <TableCell><Badge variant="outline">{ACTION_TYPES[a.action_type] || a.action_type}</Badge></TableCell>
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
                            <div><strong>详细描述:</strong> {a.action_description}</div>
                            <div><strong>规则:</strong> {a.rule_name} (ID: {a.rule_id})</div>
                            <div><strong>会议:</strong> {a.meeting_title || a.meeting_id}</div>
                            {a.review_notes && <div><strong>审批备注:</strong> {a.review_notes}</div>}
                            {a.source_data && (
                              <div><strong>源数据:</strong> <code className="text-xs">{typeof a.source_data === "string" ? a.source_data : JSON.stringify(a.source_data)}</code></div>
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
          {actions.length === 0 && <div className="text-center text-muted-foreground py-4">暂无HR操作记录</div>}
        </CardContent>
      </Card>

      {/* Section 5: Execute Approved Actions */}
      {approvedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              执行已批准操作
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
                  <TableHead>员工</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>影响维度</TableHead>
                  <TableHead>影响值</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedActions.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedActions.includes(a.id)} onChange={() => toggleActionSelect(a.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{a.employee_name || a.employee_id}</TableCell>
                    <TableCell><Badge variant="outline">{ACTION_TYPES[a.action_type] || a.action_type}</Badge></TableCell>
                    <TableCell>{a.impact_dimension}</TableCell>
                    <TableCell>{a.impact_value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              onClick={() => { if (selectedActions.length > 0 && confirm(`确认执行 ${selectedActions.length} 个操作？`)) executeMut.mutate({ actionIds: selectedActions }); }}
              disabled={selectedActions.length === 0 || executeMut.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              {executeMut.isPending ? "执行中..." : `执行选中 (${selectedActions.length})`}
            </Button>
            {executeMut.data && (
              <div className="text-sm text-muted-foreground">
                执行完成: {(executeMut.data as any).executed} 成功, {(executeMut.data as any).failed} 失败
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
