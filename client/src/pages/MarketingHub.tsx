/**
 * Marketing Digital Platform Workbench (营销数字化平台)
 *
 * 5 tabs: 年度目标 | 品质红线 | 展会战役 | 历史资产 | 播控矩阵
 * Wired to marketingPlatform.* tRPC namespace
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Target, BarChart3, Shield, Trophy, Monitor,
  Plus, Search, CheckCircle, XCircle, Send, Eye, Radio,
  Calendar, Upload, TrendingUp, Building2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ─── Types (aligned to tRPC inferred shapes) ────────────────────────
type TabKey = "annual" | "quality" | "exhibition" | "assets" | "broadcast";

interface MktPlan { id: number; title: string; year: number; [k: string]: unknown }
interface MktKpi { id: number; name: string; target: string | number; actual: string | number; unit: string; status: "red" | "amber" | "green"; currentValue?: string | number; [k: string]: unknown }
interface MktBudgetDash { totalBudget?: number; spentBudget?: number; burnRate?: number; [k: string]: unknown }
interface MktSpec { id: number; name: string; category: string; standard: string; updatedAt: string; [k: string]: unknown }
interface MktReview { id: number; assetName: string; submitter: string; type: string; status: string; submittedAt: string; [k: string]: unknown }
interface MktExhibitionDash { totalExhibitions?: number; totalLeads?: number; totalBudget?: number; averageROI?: number; [k: string]: unknown }
interface MktExhibition { id: number; stage: string; name: string; location: string; startDate: string; leadCount: number; [k: string]: unknown }
interface MktTask { id: number; completed: boolean; title: string; assignee: string; [k: string]: unknown }
interface MktLead { id: number; company: string; contact: string; email?: string; phone?: string; notes?: string; [k: string]: unknown }
interface MktAsset { id: number; title: string; year: number; region: string; industry: string; type: string; vectorized: boolean; [k: string]: unknown }
interface MktAssetStats { total?: number; vectorized?: number; pending?: number; [k: string]: unknown }
interface MktChannel { id: number; name: string; type: string; online: boolean; [k: string]: unknown }
interface MktSchedule { id: number; contentTitle: string; scheduledAt: string; status: string; [k: string]: unknown }
interface MktBroadcastDash { totalChannels?: number; onlineChannels?: number; scheduledItems?: number; publishedToday?: number; [k: string]: unknown }

// ─── RAG Badge helper ────────────────────────────────────────────────
function RagDot({ status }: { status: "red" | "amber" | "green" }) {
  const colors: Record<string, string> = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
  };
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[status] ?? "bg-gray-300"}`}
      title={status}
    />
  );
}

// ─── Tab: Annual Targets ─────────────────────────────────────────────
function AnnualTargetsTab() {
  const utils = trpc.useUtils();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const { data: plans = [], isLoading: plansLoading } =
    trpc.marketingPlatform.annualPlan.listPlans.useQuery();

  const activePlanId = selectedPlanId ?? (plans as unknown as MktPlan[])[0]?.id ?? null;

  const { data: kpis = [] } =
    trpc.marketingPlatform.annualPlan.listKpiTargets.useQuery(
      { planId: activePlanId! },
      { enabled: activePlanId !== null },
    );

  const { data: budgetData } =
    trpc.marketingPlatform.annualPlan.budgetDashboard.useQuery(
      { planId: activePlanId! },
      { enabled: activePlanId !== null },
    );

  const submitBudget = trpc.marketingPlatform.annualPlan.submitBudgetForReview.useMutation({
    onSuccess: () => {
      toast.success("预算已提交审核");
      utils.marketingPlatform.annualPlan.listPlans.invalidate();
    },
    onError: (err) => toast.error("提交失败:" + err.message),
  });

  const checkInKpi = trpc.marketingPlatform.annualPlan.checkInKpi.useMutation({
    onSuccess: () => {
      toast.success("KPI 已更新");
      if (activePlanId) {
        utils.marketingPlatform.annualPlan.listKpiTargets.invalidate();
      }
    },
    onError: (err) => toast.error("更新失败:" + err.message),
  });

  const typedPlans = plans as unknown as MktPlan[];
  const typedKpis = kpis as unknown as MktKpi[];
  const budget = budgetData as unknown as MktBudgetDash | undefined;

  return (
    <div className="space-y-6">
      {/* Plan selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select
          value={activePlanId?.toString() ?? ""}
          onValueChange={(v) => setSelectedPlanId(Number(v))}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="选择年度计划" />
          </SelectTrigger>
          <SelectContent>
            {typedPlans.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.title} ({p.year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="default"
          disabled={!activePlanId || submitBudget.isPending}
          onClick={() => {
            if (activePlanId) {
              submitBudget.mutate({ planId: activePlanId });
            }
          }}
        >
          <Send className="w-4 h-4 mr-1" />
          提交预算审核
        </Button>
      </div>

      {/* OKR stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">计划总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{typedPlans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总预算</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {budget?.totalBudget != null
                ? `¥${(budget.totalBudget / 10000).toFixed(1)}万`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">已消耗</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {budget?.spentBudget != null
                ? `¥${(budget.spentBudget / 10000).toFixed(1)}万`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">消耗率</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {budget?.burnRate != null ? `${budget.burnRate}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            KPI 目标表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">加载中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>指标名称</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>实际</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedKpis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      暂无 KPI 数据
                    </TableCell>
                  </TableRow>
                ) : (
                  typedKpis.map((kpi) => (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.name}</TableCell>
                      <TableCell>{kpi.target}</TableCell>
                      <TableCell>{kpi.actual}</TableCell>
                      <TableCell>{kpi.unit}</TableCell>
                      <TableCell>
                        <RagDot status={kpi.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={checkInKpi.isPending}
                          onClick={() =>
                            checkInKpi.mutate({ id: kpi.id, currentValue: String(kpi.currentValue ?? kpi.actual ?? "0") })
                          }
                        >
                          打卡
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Quality Red Line ───────────────────────────────────────────
function QualityRedLineTab() {
  const utils = trpc.useUtils();

  const { data: specs = [] } =
    trpc.marketingPlatform.assetQuality.listSpecs.useQuery();
  const { data: reviews = [] } =
    trpc.marketingPlatform.assetQuality.listReviews.useQuery();
  const { data: dashboard } =
    trpc.marketingPlatform.assetQuality.reviewDashboard.useQuery();

  const reviewAsset = trpc.marketingPlatform.assetQuality.reviewAsset.useMutation({
    onSuccess: () => {
      toast.success("审核结果已保存");
      utils.marketingPlatform.assetQuality.listReviews.invalidate();
      utils.marketingPlatform.assetQuality.reviewDashboard.invalidate();
    },
    onError: (err) => toast.error("审核失败:" + err.message),
  });

  const typedSpecs = specs as unknown as MktSpec[];
  const typedReviews = reviews as unknown as MktReview[];
  const dash = dashboard as unknown as Record<string, number> | undefined;

  return (
    <div className="space-y-6">
      {/* Review dashboard stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{dash?.pending ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">已通过</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{dash?.approved ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">已驳回</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{dash?.rejected ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">总计</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dash?.total ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quality spec dictionary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            品质规范词典
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规范名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>标准</TableHead>
                <TableHead>更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedSpecs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    暂无规范数据
                  </TableCell>
                </TableRow>
              ) : (
                typedSpecs.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell className="font-medium">{spec.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{spec.category}</Badge>
                    </TableCell>
                    <TableCell>{spec.standard}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {spec.updatedAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Asset review queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            资产审核队列
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>资产名称</TableHead>
                <TableHead>提交人</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    暂无待审核资产
                  </TableCell>
                </TableRow>
              ) : (
                typedReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.assetName}</TableCell>
                    <TableCell>{review.submitter}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{review.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {review.status === "pending" && (
                        <Badge variant="secondary">待审核</Badge>
                      )}
                      {review.status === "approved" && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          已通过
                        </Badge>
                      )}
                      {review.status === "rejected" && (
                        <Badge variant="destructive">已驳回</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {review.submittedAt}
                    </TableCell>
                    <TableCell>
                      {review.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={reviewAsset.isPending}
                            onClick={() =>
                              reviewAsset.mutate({
                                id: review.id,
                                status: "approved" as const,
                              })
                            }
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={reviewAsset.isPending}
                            onClick={() =>
                              reviewAsset.mutate({
                                id: review.id,
                                status: "rejected" as const,
                              })
                            }
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            驳回
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VI compliance checker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            VI 合规检查器
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 py-4">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-1" />
              上传素材检查
            </Button>
            <p className="text-sm text-muted-foreground">
              上传图片或文件，自动比对 VI 规范标准
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Exhibition Campaign ────────────────────────────────────────
function ExhibitionCampaignTab() {
  const utils = trpc.useUtils();
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<number | null>(null);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { data: exhibitions = [] } =
    trpc.marketingPlatform.exhibition.list.useQuery();
  const { data: dashboard } =
    trpc.marketingPlatform.exhibition.exhibitionDashboard.useQuery();

  const activeExhibitionId =
    selectedExhibitionId ?? (exhibitions as unknown as MktExhibition[])[0]?.id ?? null;

  const { data: tasks = [] } =
    trpc.marketingPlatform.exhibition.listTasks.useQuery(
      { exhibitionId: activeExhibitionId! },
      { enabled: activeExhibitionId !== null },
    );

  const { data: leads = [] } =
    trpc.marketingPlatform.exhibition.getLeadCaptures.useQuery(
      { exhibitionId: activeExhibitionId! },
      { enabled: activeExhibitionId !== null },
    );

  const advanceStage = trpc.marketingPlatform.exhibition.advanceStage.useMutation({
    onSuccess: () => {
      toast.success("阶段已推进");
      utils.marketingPlatform.exhibition.list.invalidate();
    },
    onError: (err) => toast.error("推进失败:" + err.message),
  });

  const captureLead = trpc.marketingPlatform.exhibition.captureLead.useMutation({
    onSuccess: () => {
      toast.success("线索已录入");
      setLeadDialogOpen(false);
      setLeadForm({ company: "", contact: "", email: "", phone: "", notes: "" });
      if (activeExhibitionId) {
        utils.marketingPlatform.exhibition.getLeadCaptures.invalidate();
        utils.marketingPlatform.exhibition.exhibitionDashboard.invalidate();
      }
    },
    onError: (err) => toast.error("录入失败:" + err.message),
  });

  const typedExhibitions = exhibitions as unknown as MktExhibition[];
  const typedTasks = tasks as unknown as MktTask[];
  const typedLeads = leads as unknown as MktLead[];
  const dash = dashboard as unknown as MktExhibitionDash | undefined;

  const stages = ["E0", "E1", "E2", "E3"] as const;
  const stageLabels: Record<string, string> = {
    E0: "E0 策划",
    E1: "E1 筹备",
    E2: "E2 执行",
    E3: "E3 复盘",
  };

  return (
    <div className="space-y-6">
      {/* ROI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">展会总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dash?.totalExhibitions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">线索总量</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dash?.totalLeads ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">预算总计</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dash?.totalBudget != null
                ? `¥${(dash.totalBudget / 10000).toFixed(1)}万`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">平均 ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dash?.averageROI != null ? `${dash.averageROI}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* E0-E3 Kanban pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            展会 Kanban (E0-E3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map((stage) => {
              const items = typedExhibitions.filter((e) => e.stage === stage);
              return (
                <div
                  key={stage}
                  className="border rounded-lg p-3 bg-muted/30 min-h-[160px]"
                >
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">{stageLabels[stage]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ({items.length})
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {items.map((ex) => (
                      <div
                        key={ex.id}
                        className={`p-2 bg-white border rounded-md text-sm cursor-pointer hover:shadow-sm transition-shadow ${
                          activeExhibitionId === ex.id
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                        onClick={() => setSelectedExhibitionId(ex.id)}
                      >
                        <p className="font-medium truncate">{ex.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ex.location} | {ex.startDate}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            线索: {ex.leadCount}
                          </span>
                          {stage !== "E3" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              disabled={advanceStage.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                advanceStage.mutate({ id: ex.id });
                              }}
                            >
                              推进 &rarr;
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        暂无展会
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task checklists + Lead capture */}
      {activeExhibitionId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">任务清单</CardTitle>
            </CardHeader>
            <CardContent>
              {typedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  暂无任务
                </p>
              ) : (
                <div className="space-y-2">
                  {typedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-1.5 border-b last:border-0"
                    >
                      {task.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm flex-1 ${
                          task.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {task.assignee}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead captures + form */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">线索录入</CardTitle>
              <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    新增线索
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>录入线索</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">公司</label>
                      <Input
                        value={leadForm.company}
                        onChange={(e) =>
                          setLeadForm((f) => ({ ...f, company: e.target.value }))
                        }
                        placeholder="公司名称"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">联系人</label>
                      <Input
                        value={leadForm.contact}
                        onChange={(e) =>
                          setLeadForm((f) => ({ ...f, contact: e.target.value }))
                        }
                        placeholder="联系人姓名"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">邮箱</label>
                        <Input
                          value={leadForm.email}
                          onChange={(e) =>
                            setLeadForm((f) => ({ ...f, email: e.target.value }))
                          }
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">电话</label>
                        <Input
                          value={leadForm.phone}
                          onChange={(e) =>
                            setLeadForm((f) => ({ ...f, phone: e.target.value }))
                          }
                          placeholder="手机号"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">备注</label>
                      <Input
                        value={leadForm.notes}
                        onChange={(e) =>
                          setLeadForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        placeholder="需求描述、产品兴趣等"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={
                        !leadForm.company.trim() || captureLead.isPending
                      }
                      onClick={() =>
                        captureLead.mutate({
                          exhibitionId: activeExhibitionId,
                          ...leadForm,
                        })
                      }
                    >
                      <Send className="w-4 h-4 mr-1" />
                      提交线索
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {typedLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  暂无线索
                </p>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {typedLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-start gap-3 p-2 border rounded-md"
                    >
                      <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="text-sm flex-1 min-w-0">
                        <p className="font-medium truncate">{lead.company}</p>
                        <p className="text-muted-foreground text-xs">
                          {lead.contact} | {lead.email || lead.phone}
                        </p>
                        {lead.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {lead.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Historical Assets ──────────────────────────────────────────
function HistoricalAssetsTab() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");

  const { data: assets = [] } =
    trpc.marketingPlatform.historicalAssets.list.useQuery();
  const { data: stats } =
    trpc.marketingPlatform.historicalAssets.stats.useQuery();

  const vectorize = trpc.marketingPlatform.historicalAssets.vectorize.useMutation({
    onSuccess: () => {
      toast.success("向量化任务已启动");
      utils.marketingPlatform.historicalAssets.list.invalidate();
      utils.marketingPlatform.historicalAssets.stats.invalidate();
    },
    onError: (err) => toast.error("向量化失败:" + err.message),
  });

  const typedAssets = assets as unknown as MktAsset[];
  const typedStats = stats as unknown as MktAssetStats | undefined;

  // Client-side filtering
  const filtered = typedAssets.filter((a) => {
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterYear !== "all" && a.year.toString() !== filterYear) return false;
    if (filterRegion !== "all" && a.region !== filterRegion) return false;
    if (filterIndustry !== "all" && a.industry !== filterIndustry) return false;
    return true;
  });

  // Unique filter options
  const years = [...new Set(typedAssets.map((a) => a.year))].sort((a, b) => b - a);
  const regions = [...new Set(typedAssets.map((a) => a.region))].filter(Boolean);
  const industries = [...new Set(typedAssets.map((a) => a.industry))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">资产总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{typedStats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">已向量化</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {typedStats?.vectorized ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">待处理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {typedStats?.pending ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="语义搜索资产..."
            className="pl-9"
          />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="年份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部年份</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="区域" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部区域</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="行业" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部行业</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无匹配资产
            </CardContent>
          </Card>
        ) : (
          filtered.map((asset) => (
            <Card key={asset.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-snug">
                    {asset.title}
                  </CardTitle>
                  {asset.vectorized ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex-shrink-0">
                      已向量化
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex-shrink-0">
                      待处理
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Calendar className="w-3 h-3" />
                  {asset.year}
                  <span className="mx-1">|</span>
                  {asset.region}
                  <span className="mx-1">|</span>
                  {asset.industry}
                </div>
                <Badge variant="outline" className="text-xs">
                  {asset.type}
                </Badge>
                {!asset.vectorized && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled={vectorize.isPending}
                    onClick={() => vectorize.mutate({ id: asset.id })}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    向量化
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Broadcast Matrix ───────────────────────────────────────────
function BroadcastMatrixTab() {
  const utils = trpc.useUtils();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [contentTitle, setContentTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: channels = [] } =
    trpc.marketingPlatform.broadcast.listChannels.useQuery();
  const { data: dashboard } =
    trpc.marketingPlatform.broadcast.broadcastDashboard.useQuery();

  const activeChannelId =
    selectedChannelId ?? (channels as unknown as MktChannel[])[0]?.id ?? null;

  const { data: schedules = [] } =
    trpc.marketingPlatform.broadcast.listSchedules.useQuery(
      { channelId: activeChannelId! },
      { enabled: activeChannelId !== null },
    );

  const publish = trpc.marketingPlatform.broadcast.publishToChannel.useMutation({
    onSuccess: () => {
      toast.success("一键分发成功");
      utils.marketingPlatform.broadcast.listSchedules.invalidate();
      utils.marketingPlatform.broadcast.broadcastDashboard.invalidate();
    },
    onError: (err) => toast.error("分发失败:" + err.message),
  });

  const typedChannels = channels as unknown as MktChannel[];
  const typedSchedules = schedules as unknown as MktSchedule[];
  const dash = dashboard as unknown as MktBroadcastDash | undefined;

  return (
    <div className="space-y-6">
      {/* Dashboard stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">渠道总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dash?.totalChannels ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">在线渠道</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {dash?.onlineChannels ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">已排期</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dash?.scheduledItems ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">今日已发布</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {dash?.publishedToday ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel registry */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="w-4 h-4" />
              渠道注册表
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              {typedChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  暂无渠道
                </p>
              ) : (
                typedChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                      activeChannelId === ch.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedChannelId(ch.id)}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        ch.online ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">{ch.type}</p>
                    </div>
                    <Badge variant={ch.online ? "default" : "secondary"} className="text-xs">
                      {ch.online ? "在线" : "离线"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule view + content picker */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              排期管理
            </CardTitle>
            <Button
              size="sm"
              disabled={!activeChannelId || publish.isPending}
              onClick={() => {
                if (activeChannelId) {
                  publish.mutate({
                    channelIds: [activeChannelId],
                    contentTitle: "快速分发内容",
                    contentType: "video",
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 86400000).toISOString(),
                  });
                }
              }}
            >
              <Send className="w-4 h-4 mr-1" />
              一键分发
            </Button>
          </CardHeader>
          <CardContent>
            {/* Content picker for adding schedule */}
            <div className="flex items-end gap-3 mb-4 pb-4 border-b">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  内容标题
                </label>
                <Input
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder="选择或输入内容"
                />
              </div>
              <div className="w-[180px] space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  发布时间
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!contentTitle.trim() || !activeChannelId}
                onClick={() => {
                  toast.info("排期功能开发中");
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>

            {/* Schedule list */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>内容</TableHead>
                  <TableHead>排期时间</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      暂无排期内容
                    </TableCell>
                  </TableRow>
                ) : (
                  typedSchedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.contentTitle}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.scheduledAt}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "published"
                              ? "default"
                              : s.status === "scheduled"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {s.status === "published"
                            ? "已发布"
                            : s.status === "scheduled"
                              ? "已排期"
                              : s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function MarketingHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("annual");

  const tabMeta: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "annual", label: "年度目标", icon: <Target className="w-4 h-4" /> },
    { key: "quality", label: "品质红线", icon: <Shield className="w-4 h-4" /> },
    { key: "exhibition", label: "展会战役", icon: <Trophy className="w-4 h-4" /> },
    { key: "assets", label: "历史资产", icon: <Eye className="w-4 h-4" /> },
    { key: "broadcast", label: "播控矩阵", icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("marketing.hub_title") !== "marketing.hub_title"
            ? t("marketing.hub_title")
            : "营销数字化平台"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("marketing.hub_desc") !== "marketing.hub_desc"
            ? t("marketing.hub_desc")
            : "年度目标 / 品质红线 / 展会战役 / 历史资产 / 播控矩阵"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="w-full"
      >
        <TabsList className="w-full flex overflow-x-auto">
          {tabMeta.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="flex items-center gap-1.5 min-w-fit"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="annual" className="mt-6">
          <AnnualTargetsTab />
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <QualityRedLineTab />
        </TabsContent>

        <TabsContent value="exhibition" className="mt-6">
          <ExhibitionCampaignTab />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <HistoricalAssetsTab />
        </TabsContent>

        <TabsContent value="broadcast" className="mt-6">
          <BroadcastMatrixTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
