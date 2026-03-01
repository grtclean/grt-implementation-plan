/**
 * ProjectAgentDashboard — AI 项目生命周期评审仪表板
 *
 * 4 Tabs:
 *  1. 生命周期概览 (Lifecycle) — M0-M12 stepper + project summary
 *  2. AI评审 (AI Reviews)     — Review list with skeleton for processing
 *  3. 风险预警 (Risk Alerts)  — Delay predictions + violation events
 *  4. 时间线 (Timeline)       — M0-M12 horizontal bar chart
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import {
  Bot, CheckCircle2, Circle, AlertTriangle, XCircle, Clock,
  FileText, Ruler, TrendingUp, ChevronDown, ChevronUp,
  RefreshCw, Shield, Loader2, Activity,
} from "lucide-react";

// ── M0-M12 Phase Definitions ──────────────────────────────────
const M_PHASES = [
  { code: "M0", name: "立项", nameEn: "Initiation" },
  { code: "M1", name: "启动", nameEn: "Kickoff" },
  { code: "M2", name: "需求评审", nameEn: "Requirement" },
  { code: "M3", name: "方案设计", nameEn: "Design" },
  { code: "M4", name: "零件采购", nameEn: "Procurement" },
  { code: "M5", name: "加工制造", nameEn: "Fabrication" },
  { code: "M6", name: "装配调试", nameEn: "Assembly" },
  { code: "M7", name: "FAT测试", nameEn: "FAT" },
  { code: "M8", name: "包装发运", nameEn: "Shipping" },
  { code: "M9", name: "现场安装", nameEn: "Installation" },
  { code: "M10", name: "调试验证", nameEn: "Commissioning" },
  { code: "M11", name: "SAT测试", nameEn: "SAT" },
  { code: "M12", name: "质保移交", nameEn: "Handover" },
];

// ── Severity Colors ───────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  error: "bg-orange-100 text-orange-800 border-orange-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

const VERDICT_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pass: { label: "通过", variant: "default" },
  conditional: { label: "有条件通过", variant: "secondary" },
  fail: { label: "未通过", variant: "destructive" },
  on_track: { label: "正常", variant: "default" },
  at_risk: { label: "有风险", variant: "destructive" },
};

const HEALTH_COLORS: Record<string, string> = {
  green: "text-green-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
};

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════

export default function ProjectAgentDashboard() {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("lifecycle");

  // ── Data Queries ──────────────────────────────────────────
  const projectsQuery = trpc.project.list.useQuery();
  const projects = projectsQuery.data || [];

  const reviewsQuery = trpc.projectAgent.getByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId },
  );
  const reviews = reviewsQuery.data || [];

  // Auto-poll when reviews are processing (React Query supports dynamic refetchInterval)
  const hasProcessing = reviews.some(r => r.status === "processing");
  trpc.projectAgent.getByProject.useQuery(
    { projectId: selectedProjectId! },
    {
      enabled: !!selectedProjectId && hasProcessing,
      refetchInterval: 5000,
    },
  );

  const dashboardQuery = trpc.projectAgent.dashboard.useQuery();

  const stagesQuery = trpc.projectGate.getProjectStages.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId },
  );
  const projectStageData = (stagesQuery.data || [])[0];
  const stages = projectStageData?.stages || [];

  // ── Mutations ─────────────────────────────────────────────
  const bomReview = trpc.projectAgent.triggerBomReview.useMutation({
    onSuccess: () => {
      toast({ title: "BOM评审已提交", description: "AI正在分析，请稍候..." });
      reviewsQuery.refetch();
    },
    onError: (err) => toast({ title: "提交失败", description: err.message, variant: "destructive" }),
  });

  const drawingReview = trpc.projectAgent.triggerDrawingReview.useMutation({
    onSuccess: () => {
      toast({ title: "图纸评审已提交", description: "AI正在分析，请稍候..." });
      reviewsQuery.refetch();
    },
    onError: (err) => toast({ title: "提交失败", description: err.message, variant: "destructive" }),
  });

  const seedDemo = trpc.projectAgent.seedDemo.useMutation({
    onSuccess: (result) => {
      toast({ title: "种子数据已创建", description: result.message });
      projectsQuery.refetch();
      dashboardQuery.refetch();
    },
    onError: (err) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  if (projectsQuery.isLoading && dashboardQuery.isLoading) return <DashboardSkeleton />;

  // ── Derived Data ──────────────────────────────────────────
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  const currentPhaseIdx = selectedProject
    ? M_PHASES.findIndex(m => m.code === selectedProject.currentPhase)
    : -1;

  const delayPredictions = reviews.filter(r => r.reviewType === "delay_prediction" && r.status === "completed");
  const latestDelay = delayPredictions[0];

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">AI 项目 Agent</h1>
          {dashboardQuery.data && (
            <span className="text-sm text-muted-foreground ml-2">
              活跃项目: {dashboardQuery.data.activeProjects} · 待处理: {dashboardQuery.data.pendingReviews}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId?.toString() || ""}
            onValueChange={(v) => setSelectedProjectId(Number(v))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="选择项目..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name} ({p.currentPhase || "M0"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => seedDemo.mutate()}>
            {seedDemo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Seed Demo"}
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lifecycle" className="gap-1"><Activity className="h-4 w-4" /> 生命周期</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1"><FileText className="h-4 w-4" /> AI评审</TabsTrigger>
          <TabsTrigger value="risks" className="gap-1"><AlertTriangle className="h-4 w-4" /> 风险预警</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1"><Clock className="h-4 w-4" /> 时间线</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════ */}
        {/* Tab 1: Lifecycle Overview                           */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="lifecycle" className="space-y-4">
          {!selectedProject ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">请选择一个项目查看生命周期</CardContent></Card>
          ) : (
            <>
              {/* M0-M12 Stepper */}
              <Card>
                <CardHeader><CardTitle className="text-base">M0-M12 阶段步进器</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {M_PHASES.map((phase, idx) => {
                      const isCompleted = idx < currentPhaseIdx;
                      const isCurrent = idx === currentPhaseIdx;
                      const stageInfo = stages.find((s: any) => s.code === phase.code);
                      const isFailed = stageInfo?.status === "FAILED";
                      return (
                        <div key={phase.code} className="flex items-center">
                          <div className="flex flex-col items-center min-w-[56px]">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                              ${isFailed ? "bg-red-100 border-red-500 text-red-700" :
                                isCompleted ? "bg-green-100 border-green-500 text-green-700" :
                                isCurrent ? "bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-200" :
                                "bg-gray-100 border-gray-300 text-gray-400"}
                            `}>
                              {isFailed ? <XCircle className="h-4 w-4" /> :
                                isCompleted ? <CheckCircle2 className="h-4 w-4" /> :
                                isCurrent ? <Circle className="h-4 w-4 fill-current" /> :
                                <Circle className="h-4 w-4" />}
                            </div>
                            <span className={`text-[10px] mt-1 ${isCurrent ? "font-bold text-blue-700" : "text-muted-foreground"}`}>
                              {phase.code}
                            </span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[52px]">{phase.name}</span>
                          </div>
                          {idx < M_PHASES.length - 1 && (
                            <div className={`w-4 h-0.5 ${idx < currentPhaseIdx ? "bg-green-400" : "bg-gray-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">当前阶段</p>
                    <p className="text-2xl font-bold">{selectedProject.currentPhase || "M0"}</p>
                    <p className="text-xs text-muted-foreground">
                      {M_PHASES.find(m => m.code === selectedProject.currentPhase)?.name || "未知"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">健康状态</p>
                    <p className={`text-2xl font-bold ${HEALTH_COLORS[selectedProject.healthStatus || "green"]}`}>
                      {selectedProject.healthStatus === "green" ? "良好" :
                        selectedProject.healthStatus === "yellow" ? "警告" : "危险"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">预算利用率</p>
                    <p className="text-2xl font-bold">
                      {selectedProject.budget ? Math.round(((selectedProject.actualCost || 0) / selectedProject.budget) * 100) : 0}%
                    </p>
                    <Progress value={selectedProject.budget ? ((selectedProject.actualCost || 0) / selectedProject.budget) * 100 : 0} className="mt-1" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">完成进度</p>
                    <p className="text-2xl font-bold">{selectedProject.completionPercent || 0}%</p>
                    <Progress value={selectedProject.completionPercent || 0} className="mt-1" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* Tab 2: AI Reviews                                   */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="reviews" className="space-y-4">
          {!selectedProject ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">请选择一个项目查看AI评审</CardContent></Card>
          ) : (
            <>
              {/* Trigger Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => bomReview.mutate({ projectId: selectedProjectId! })}
                  disabled={bomReview.isPending}
                >
                  {bomReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                  BOM评审
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => drawingReview.mutate({ projectId: selectedProjectId! })}
                  disabled={drawingReview.isPending}
                >
                  {drawingReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ruler className="h-4 w-4 mr-1" />}
                  图纸评审
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reviewsQuery.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {hasProcessing && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> 自动刷新中
                  </Badge>
                )}
              </div>

              {/* Review List */}
              {reviewsQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i}><CardContent className="py-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">暂无AI评审记录</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* Tab 3: Risk Alerts                                  */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="risks" className="space-y-4">
          {!selectedProject ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">请选择一个项目查看风险</CardContent></Card>
          ) : (
            <>
              {/* Delay Prediction */}
              {latestDelay ? (
                <Card className={latestDelay.riskScore && latestDelay.riskScore > 70 ? "border-red-300" : latestDelay.riskScore && latestDelay.riskScore > 40 ? "border-yellow-300" : ""}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      延期风险预测
                      {latestDelay.verdict && VERDICT_BADGE[latestDelay.verdict] && (
                        <Badge variant={VERDICT_BADGE[latestDelay.verdict].variant}>
                          {VERDICT_BADGE[latestDelay.verdict].label}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">风险得分</p>
                        <RiskGauge score={latestDelay.riskScore || 0} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">预计延期</p>
                        <p className="text-3xl font-bold">{latestDelay.predictedDelay || 0}</p>
                        <p className="text-xs text-muted-foreground">天</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">置信度</p>
                        <p className="text-3xl font-bold">{latestDelay.confidence || 0}%</p>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    {Array.isArray(latestDelay.riskFactors) && latestDelay.riskFactors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">风险因素</p>
                        <div className="space-y-2">
                          {(latestDelay.riskFactors as Array<{ factor: string; weight: number; description: string }>).map((rf, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-24 text-xs text-muted-foreground">{rf.factor}</div>
                              <Progress value={rf.weight * 100} className="flex-1 h-2" />
                              <div className="text-xs w-16 text-right">{(rf.weight * 100).toFixed(0)}%权重</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {latestDelay.narrative && (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{latestDelay.narrative}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-8 text-center text-muted-foreground">暂无延期预测数据</CardContent></Card>
              )}

              {/* Dashboard High-Risk Projects */}
              {dashboardQuery.data && dashboardQuery.data.highRiskProjects.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5" /> 高风险项目</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboardQuery.data.highRiskProjects.map((hp: any, i: number) => {
                        const proj = projects.find((p: any) => p.id === hp.projectId);
                        return (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div>
                              <p className="font-medium text-sm">{proj?.name || `项目#${hp.projectId}`}</p>
                              <p className="text-xs text-muted-foreground">预计延期 {hp.predictedDelay || 0} 天</p>
                            </div>
                            <Badge variant={hp.riskScore > 70 ? "destructive" : "secondary"}>
                              风险 {hp.riskScore}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* Tab 4: Timeline                                     */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="timeline" className="space-y-4">
          {!selectedProject ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">请选择一个项目查看时间线</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">M0-M12 时间线</CardTitle></CardHeader>
              <CardContent>
                <TimelineChart
                  stages={stages}
                  currentPhase={selectedProject.currentPhase || "M0"}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sub-Components
// ══════════════════════════════════════════════════════════════

function ReviewCard({ review }: { review: any }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabel: Record<string, { label: string; icon: typeof FileText }> = {
    bom_review: { label: "BOM评审", icon: FileText },
    drawing_review: { label: "图纸评审", icon: Ruler },
    delay_prediction: { label: "延期预测", icon: TrendingUp },
  };

  const info = typeLabel[review.reviewType] || { label: review.reviewType, icon: FileText };
  const Icon = info.icon;

  return (
    <Card className={review.status === "processing" ? "border-blue-200 animate-pulse" : ""}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{info.label}</span>
            <Badge variant="outline" className="text-xs">{review.triggerPhase}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {review.status === "processing" ? (
              <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />处理中</Badge>
            ) : review.status === "completed" && review.verdict && VERDICT_BADGE[review.verdict] ? (
              <Badge variant={VERDICT_BADGE[review.verdict].variant}>
                {VERDICT_BADGE[review.verdict].label}
                {review.confidence ? ` (${review.confidence}%)` : ""}
              </Badge>
            ) : review.status === "pending" ? (
              <Badge variant="outline">等待中</Badge>
            ) : review.status === "failed" ? (
              <Badge variant="destructive">失败</Badge>
            ) : null}
          </div>
        </div>

        {/* Processing skeleton */}
        {review.status === "processing" && (
          <div className="space-y-2 mt-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}

        {/* Completed review content */}
        {review.status === "completed" && (
          <>
            {/* Findings */}
            {Array.isArray(review.findings) && review.findings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {(review.findings as Array<{ severity: string; category: string; message: string; recommendation: string }>)
                  .sort((a, b) => {
                    const order = ["critical", "error", "warning", "info"];
                    return order.indexOf(a.severity) - order.indexOf(b.severity);
                  })
                  .map((f, i) => (
                    <div key={i} className={`text-xs px-2 py-1.5 rounded border ${SEVERITY_COLORS[f.severity] || "bg-gray-100"}`}>
                      <span className="font-medium">[{f.severity.toUpperCase()}]</span> {f.message}
                      {expanded && f.recommendation && (
                        <p className="mt-1 text-[11px] opacity-80">建议: {f.recommendation}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Delay prediction specifics */}
            {review.reviewType === "delay_prediction" && review.riskScore !== null && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span>风险: <strong>{review.riskScore}</strong>/100</span>
                {review.predictedDelay !== null && <span>预计延期: <strong>{review.predictedDelay}天</strong></span>}
              </div>
            )}

            {/* Narrative (collapsible) */}
            {review.narrative && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "收起" : "查看详情"}
              </button>
            )}
            {expanded && review.narrative && (
              <p className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded">{review.narrative}</p>
            )}
          </>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <span>{review.inputSummary}</span>
          {review.reviewedBy && <span>by {review.reviewedBy}</span>}
          {review.createdAt && <span>{new Date(review.createdAt).toLocaleString("zh-CN")}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Risk Score Gauge ──────────────────────────────────────────
function RiskGauge({ score }: { score: number }) {
  const color = score > 70 ? "#ef4444" : score > 40 ? "#eab308" : "#22c55e";
  const angle = (score / 100) * 180;

  return (
    <div className="relative w-24 h-14 mx-auto mt-1">
      <svg viewBox="0 0 100 55" className="w-full h-full">
        {/* Background arc */}
        <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
        {/* Value arc */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 141.37} 141.37`}
        />
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-0">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ── Timeline Chart (simple div-based Gantt) ───────────────────
function TimelineChart({ stages, currentPhase }: {
  stages: Array<{ code: string; status: string; completedDate?: string | null; score?: number | null }>;
  currentPhase: string;
}) {
  const currentIdx = M_PHASES.findIndex(m => m.code === currentPhase);

  return (
    <div className="space-y-1.5">
      {M_PHASES.map((phase, idx) => {
        const stageInfo = stages.find(s => s.code === phase.code);
        const isCompleted = stageInfo?.status === "COMPLETED" || idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isRejected = stageInfo?.status === "FAILED";

        const barWidth = Math.max(((idx + 1) / M_PHASES.length) * 100, 8);

        return (
          <div key={phase.code} className="flex items-center gap-2">
            <div className="w-10 text-xs font-mono text-muted-foreground">{phase.code}</div>
            <div className="flex-1 relative h-5">
              <div className="absolute top-0 h-2.5 rounded bg-gray-100 dark:bg-gray-800" style={{ width: `${barWidth}%` }} />
              {(isCompleted || isCurrent) && (
                <div
                  className={`absolute top-0 h-2.5 rounded ${
                    isRejected ? "bg-red-400" : isCompleted ? "bg-green-400" : "bg-blue-400"
                  }`}
                  style={{ width: `${isCurrent ? barWidth * 0.6 : barWidth}%` }}
                />
              )}
            </div>
            <div className="w-16 text-[10px] text-muted-foreground text-right">
              {stageInfo?.completedDate
                ? new Date(stageInfo.completedDate).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
                : "—"}
            </div>
            <div className="w-14">
              {isRejected ? <Badge variant="destructive" className="text-[10px] px-1">退回</Badge> :
                isCompleted ? <Badge variant="default" className="text-[10px] px-1">完成</Badge> :
                isCurrent ? <Badge variant="secondary" className="text-[10px] px-1">进行中</Badge> :
                <Badge variant="outline" className="text-[10px] px-1">待开始</Badge>}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><div className="w-3 h-2 bg-gray-200 rounded" /> 计划</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 bg-green-400 rounded" /> 已完成</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 bg-blue-400 rounded" /> 进行中</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 bg-red-400 rounded" /> 退回</span>
      </div>
    </div>
  );
}
