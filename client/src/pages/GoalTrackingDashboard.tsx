/**
 * GoalTrackingDashboard — 目标跟踪看板
 *
 * Tab1: 进度追踪 (雷达图+检查点时间线)
 * Tab2: 季度评审 (评分UI)
 * Tab3: 年中调整 (差异对比+审批)
 * Tab4: 沟通消息 (系统内消息通道)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, Calendar, MessageSquare, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Send, Loader2,
  Target, Award, ArrowUpDown, Sparkles, BarChart3, FileText,
} from "lucide-react";
import { useState, useMemo } from "react";

const CHECKPOINT_STATUS: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "待开始", icon: Clock, color: "text-gray-400" },
  scheduled: { label: "已安排", icon: Calendar, color: "text-blue-500" },
  in_progress: { label: "进行中", icon: RefreshCw, color: "text-yellow-500" },
  completed: { label: "已完成", icon: CheckCircle2, color: "text-green-500" },
  skipped: { label: "已跳过", icon: AlertTriangle, color: "text-gray-400" },
};

export default function GoalTrackingDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("progress");

  const year = new Date().getFullYear();
  const employeeId = user?.id ?? 0;
  const summaryQ = trpc.annualGoalIncentive.dashboard.employeeSummary.useQuery(
    { employeeId, year },
    { enabled: !!employeeId }
  );

  const agreement = summaryQ.data?.agreement;
  const dimensions = summaryQ.data?.dimensions || [];
  const checkpoints = summaryQ.data?.checkpoints || [];
  const projection = summaryQ.data?.projection;

  // Also check as manager
  const managerQ = trpc.annualGoalIncentive.dashboard.managerSummary.useQuery(
    { managerId: employeeId, year },
    { enabled: !!employeeId }
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{isZh ? "目标跟踪看板" : "Goal Tracking Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">{isZh ? "查看进度、评分、调整、沟通" : "Track progress, score reviews, adjustments, messages"}</p>
        </div>
      </div>

      {!agreement ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {isZh ? `${year} 年暂无目标协定。请先在\"年度目标协定\"页面创建。` : `No ${year} agreement found. Create one first.`}
        </CardContent></Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="progress" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{isZh ? "进度追踪" : "Progress"}</TabsTrigger>
            <TabsTrigger value="review" className="gap-1.5"><Target className="h-3.5 w-3.5" />{isZh ? "季度评审" : "Reviews"}</TabsTrigger>
            <TabsTrigger value="adjust" className="gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" />{isZh ? "年中调整" : "Adjustments"}</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />{isZh ? "消息" : "Messages"}</TabsTrigger>
          </TabsList>

          {/* Tab 1: Progress */}
          <TabsContent value="progress" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dimension Scores */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">{isZh ? "维度得分" : "Dimension Scores"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dimensions.map((d: any) => {
                      const score = parseFloat(d.currentScore || "0");
                      const weight = parseFloat(d.weight || "0");
                      return (
                        <div key={d.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{isZh ? d.dimensionName : d.dimensionNameEn || d.dimensionName}</span>
                            <span className="font-mono">
                              <span className="font-semibold">{score}</span>
                              <span className="text-muted-foreground">/100 × {weight}%</span>
                              <span className="ml-2 text-blue-600 font-semibold">= {((score * weight) / 100).toFixed(1)}</span>
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                              style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {dimensions.length > 0 && (
                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm font-medium">{isZh ? "综合加权得分" : "Composite Score"}</span>
                      <span className="text-lg font-bold font-mono">
                        {dimensions.reduce((s: number, d: any) => s + (parseFloat(d.currentScore || "0") * parseFloat(d.weight || "0")) / 100, 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Projection Card */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {isZh ? "激励预估" : "Incentive Projection"}
                </CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {projection ? (
                    <>
                      <div className="text-center py-3">
                        <div className="text-3xl font-bold text-green-600">{projection.bonusMonths} {isZh ? "月" : "mo"}</div>
                        <div className="text-xs text-muted-foreground">{isZh ? "预估奖金月数" : "Projected bonus months"}</div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span>{isZh ? "绩效等级" : "Level"}</span><Badge variant="outline">{projection.performanceLevelCode}</Badge></div>
                        <div className="flex justify-between"><span>{isZh ? "综合得分" : "Score"}</span><span className="font-mono">{projection.compositeScore}</span></div>
                        <div className="flex justify-between"><span>{isZh ? "职业倍数" : "Career ×"}</span><span className="font-mono">{projection.careerMultiplier}×</span></div>
                        {projection.projectedBonusAmount && (
                          <div className="flex justify-between font-medium pt-2 border-t">
                            <span>{isZh ? "预估奖金金额" : "Projected Amount"}</span>
                            <span className="font-mono text-green-600">¥{parseFloat(projection.projectedBonusAmount).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      {isZh ? "尚无试算数据" : "No projection yet"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkpoint Timeline */}
              <Card className="lg:col-span-3">
                <CardHeader><CardTitle className="text-base">{isZh ? "检查点时间线" : "Checkpoint Timeline"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {checkpoints.map((cp: any, idx: number) => {
                      const cfg = CHECKPOINT_STATUS[cp.status] || CHECKPOINT_STATUS.pending;
                      const Icon = cfg.icon;
                      const isLast = idx === checkpoints.length - 1;
                      return (
                        <div key={cp.id} className="flex items-center">
                          <div className={`flex flex-col items-center min-w-[100px] p-3 rounded-lg border ${cp.status === "completed" ? "border-green-200 bg-green-50" : "border-muted"}`}>
                            <Icon className={`h-5 w-5 ${cfg.color}`} />
                            <div className="text-xs font-semibold mt-1">{cp.checkpointType}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(cp.scheduledDate).toLocaleDateString()}
                            </div>
                            {cp.overallScore && (
                              <div className="text-xs font-mono font-semibold mt-1">{cp.overallScore}</div>
                            )}
                          </div>
                          {!isLast && <div className="w-6 h-0.5 bg-muted mx-1" />}
                        </div>
                      );
                    })}
                    {checkpoints.length === 0 && (
                      <div className="text-sm text-muted-foreground">{isZh ? "协定激活后自动生成检查点" : "Checkpoints auto-created on activation"}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Quarterly Review */}
          <TabsContent value="review" className="mt-4">
            <QuarterlyReviewPanel agreementId={agreement.id} checkpoints={checkpoints} dimensions={dimensions} isZh={isZh} user={user} onRefresh={() => summaryQ.refetch()} />
          </TabsContent>

          {/* Tab 3: Adjustments */}
          <TabsContent value="adjust" className="mt-4">
            <AdjustmentPanel agreementId={agreement.id} isZh={isZh} user={user} />
          </TabsContent>

          {/* Tab 4: Messages */}
          <TabsContent value="messages" className="mt-4">
            <MessagePanel agreementId={agreement.id} isZh={isZh} user={user} />
          </TabsContent>
        </Tabs>
      )}

      {/* Manager view */}
      {managerQ.data && managerQ.data.agreements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              {isZh ? `我的团队 (${managerQ.data.totalEmployees} 人)` : `My Team (${managerQ.data.totalEmployees})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(managerQ.data.statusCounts).map(([status, count]) => (
                <div key={status} className="text-center p-2 rounded-lg border">
                  <div className="text-lg font-bold">{count as number}</div>
                  <div className="text-xs text-muted-foreground">{status}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {managerQ.data.agreements.slice(0, 10).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                      {a.employeeName?.charAt(0)}
                    </div>
                    <span className="text-sm">{a.employeeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{a.projectedBonusMonths || "0"} {isZh ? "月" : "mo"}</span>
                    <Badge variant="outline" className="text-xs">{a.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Quarterly Review Panel ──
function QuarterlyReviewPanel({ agreementId, checkpoints, dimensions, isZh, user, onRefresh }: any) {
  const [selectedCp, setSelectedCp] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState("");
  const [selfAssess, setSelfAssess] = useState("");

  const submitMut = trpc.annualGoalIncentive.checkpoints.submitScores.useMutation();
  const startMut = trpc.annualGoalIncentive.checkpoints.startReview.useMutation();

  const pendingCps = checkpoints.filter((cp: any) => cp.status === "scheduled" || cp.status === "in_progress");

  const handleStartReview = async (cpId: number) => {
    await startMut.mutateAsync({ checkpointId: cpId });
    setSelectedCp(cpId);
    onRefresh();
  };

  const handleSubmitScores = async () => {
    if (!selectedCp) return;
    await submitMut.mutateAsync({
      checkpointId: selectedCp,
      agreementId,
      dimensionScoresJson: dimensions.map((d: any) => ({
        dimensionId: d.id,
        dimensionName: d.dimensionName,
        weight: parseFloat(d.weight),
        score: scores[d.id] ?? 0,
      })),
      managerComments: comments,
      employeeSelfAssessment: selfAssess,
      reviewedBy: user?.id ?? 0,
      reviewedByName: user?.name ?? "",
    });
    setSelectedCp(null);
    setScores({});
    setComments("");
    setSelfAssess("");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Pending checkpoints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {pendingCps.map((cp: any) => (
          <Card key={cp.id} className={`cursor-pointer ${selectedCp === cp.id ? "border-blue-400" : ""}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{cp.checkpointType}</div>
                  <div className="text-xs text-muted-foreground">{new Date(cp.scheduledDate).toLocaleDateString()}</div>
                </div>
                {cp.status === "scheduled" ? (
                  <Button size="sm" variant="outline" onClick={() => handleStartReview(cp.id)}>
                    {isZh ? "开始评审" : "Start"}
                  </Button>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700">{isZh ? "进行中" : "Active"}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingCps.length === 0 && (
          <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
            {isZh ? "当前无待评审检查点" : "No pending reviews"}
          </div>
        )}
      </div>

      {/* Scoring form */}
      {selectedCp && (
        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "维度评分" : "Dimension Scoring"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {dimensions.map((d: any) => (
              <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="text-sm font-medium">{d.dimensionName}</div>
                  <div className="text-xs text-muted-foreground">{isZh ? "权重" : "Weight"}: {d.weight}%</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100}
                    value={scores[d.id] ?? ""}
                    onChange={e => setScores({ ...scores, [d.id]: parseFloat(e.target.value) || 0 })}
                    className="w-20 h-8 text-sm font-mono text-right"
                    placeholder="0-100" />
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label>{isZh ? "主管评语" : "Manager Comments"}</Label>
              <textarea className="w-full rounded-md border bg-background text-sm p-2.5 min-h-[60px] resize-none"
                value={comments} onChange={e => setComments(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isZh ? "员工自评" : "Self Assessment"}</Label>
              <textarea className="w-full rounded-md border bg-background text-sm p-2.5 min-h-[60px] resize-none"
                value={selfAssess} onChange={e => setSelfAssess(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmitScores} disabled={submitMut.isPending}>
                {submitMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {isZh ? "提交评分" : "Submit Scores"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed reviews */}
      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "已完成评审" : "Completed Reviews"}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checkpoints.filter((cp: any) => cp.status === "completed").map((cp: any) => (
              <div key={cp.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50">
                <div>
                  <div className="text-sm font-medium">{cp.checkpointType}</div>
                  <div className="text-xs text-muted-foreground">{cp.actualDate ? new Date(cp.actualDate).toLocaleDateString() : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-semibold">{cp.overallScore}</span>
                  <Badge variant="outline">{cp.performanceLevelCode}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Adjustment Panel ──
function AdjustmentPanel({ agreementId, isZh, user }: any) {
  const [reason, setReason] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [adjustType, setAdjustType] = useState("dimension_reweight");

  const listQ = trpc.annualGoalIncentive.adjustments.listByAgreement.useQuery({ agreementId });
  const createMut = trpc.annualGoalIncentive.adjustments.create.useMutation();

  const handleCreate = async () => {
    if (!reason) return;
    await createMut.mutateAsync({
      agreementId,
      adjustmentType: adjustType,
      reason,
      triggerEvent: triggerEvent || undefined,
      proposedStateJson: {},
      requestedBy: user?.id ?? 0,
      requestedByName: user?.name ?? "",
    });
    setReason("");
    setTriggerEvent("");
    listQ.refetch();
  };

  const adjustments = listQ.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "申请年中调整" : "Request Mid-Year Adjustment"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isZh ? "调整类型" : "Type"}</Label>
              <select className="w-full rounded-md border bg-background text-sm h-9 px-2" value={adjustType} onChange={e => setAdjustType(e.target.value)}>
                <option value="dimension_reweight">{isZh ? "维度权重调整" : "Reweight Dimensions"}</option>
                <option value="add_dimension">{isZh ? "新增维度" : "Add Dimension"}</option>
                <option value="target_change">{isZh ? "目标值变更" : "Target Change"}</option>
                <option value="career_path_change">{isZh ? "职业路径变更" : "Career Path Change"}</option>
                <option value="bonus_structure_change">{isZh ? "奖金结构变更" : "Bonus Structure Change"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? "触发事件" : "Trigger Event"}</Label>
              <Input value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)}
                placeholder={isZh ? "例: 组织架构调整" : "e.g. Re-org"} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isZh ? "调整原因" : "Reason"} *</Label>
            <textarea className="w-full rounded-md border bg-background text-sm p-2.5 min-h-[60px] resize-none"
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder={isZh ? "说明为什么需要调整目标..." : "Explain why the goals need adjustment..."} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={!reason || createMut.isPending}>
              <Send className="h-4 w-4 mr-2" />{isZh ? "提交调整申请" : "Submit Request"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "调整历史" : "Adjustment History"}</CardTitle></CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">{isZh ? "暂无调整记录" : "No adjustments yet"}</div>
          ) : (
            <div className="space-y-2">
              {adjustments.map((adj: any) => (
                <div key={adj.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{adj.adjustmentType}</div>
                    <Badge variant="outline">{adj.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{adj.reason}</div>
                  {adj.triggerEvent && <div className="text-xs text-blue-600 mt-0.5">{isZh ? "触发" : "Trigger"}: {adj.triggerEvent}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {adj.requestedByName} · {new Date(adj.createdAt).toLocaleDateString()}
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

// ── Message Panel ──
function MessagePanel({ agreementId, isZh, user }: any) {
  const [content, setContent] = useState("");
  const messagesQ = trpc.annualGoalIncentive.messages.listByAgreement.useQuery({ agreementId, limit: 50 });
  const sendMut = trpc.annualGoalIncentive.messages.send.useMutation();

  const handleSend = async () => {
    if (!content.trim()) return;
    await sendMut.mutateAsync({
      agreementId,
      senderId: user?.id ?? 0,
      senderName: user?.name ?? "",
      content: content.trim(),
    });
    setContent("");
    messagesQ.refetch();
  };

  const messages = messagesQ.data || [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{isZh ? "目标沟通通道" : "Goal Discussion Channel"}</CardTitle></CardHeader>
      <CardContent>
        {/* Messages */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{isZh ? "开始对话..." : "Start the conversation..."}</div>
          ) : (
            [...messages].reverse().map((msg: any) => {
              const isMe = msg.senderId === (user?.id ?? 0);
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${isMe ? "bg-blue-500 text-white" : "bg-muted"}`}>
                    {!isMe && <div className="text-xs font-medium mb-1">{msg.senderName}</div>}
                    <div className="text-sm">{msg.content}</div>
                    <div className={`text-[10px] mt-1 ${isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t">
          <Input value={content} onChange={e => setContent(e.target.value)}
            placeholder={isZh ? "输入消息..." : "Type a message..."}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
          <Button onClick={handleSend} disabled={!content.trim() || sendMut.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
