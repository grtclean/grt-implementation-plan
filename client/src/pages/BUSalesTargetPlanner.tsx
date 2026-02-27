import { useState } from "react";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Plus,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";

const DEPARTMENTS = [
  { id: "bu2", name: "事业二部", nameEn: "BU-2" },
  { id: "bu3", name: "事业三部", nameEn: "BU-3" },
  { id: "bu4", name: "事业四部", nameEn: "BU-4" },
  { id: "bu5", name: "事业五部", nameEn: "BU-5" },
  { id: "overseas", name: "海外事业部", nameEn: "Overseas BU" },
];

const STATUS_MAP: Record<string, { label: string; labelEn: string; color: string }> = {
  draft: { label: "草稿", labelEn: "Draft", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "已提交", labelEn: "Submitted", color: "bg-blue-100 text-blue-700" },
  approved: { label: "已审批", labelEn: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "已驳回", labelEn: "Rejected", color: "bg-red-100 text-red-700" },
  pending: { label: "待审批", labelEn: "Pending", color: "bg-yellow-100 text-yellow-700" },
};

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const MONTH_LABELS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BUSalesTargetPlanner() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editingDetailId, setEditingDetailId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [adjustReason, setAdjustReason] = useState("");

  // Form state for creation
  const [formYear, setFormYear] = useState(2026);
  const [formDept, setFormDept] = useState("bu2");
  const [formSalesTarget, setFormSalesTarget] = useState("10000000");
  const [formOutputTarget, setFormOutputTarget] = useState("8000000");
  const [formG1, setFormG1] = useState("20");
  const [formG2, setFormG2] = useState("20");
  const [formG3, setFormG3] = useState("10");

  const dashboardQuery = trpc.buSalesTarget.dashboard.useQuery();
  const listQuery = trpc.buSalesTarget.list.useQuery();
  const detailQuery = trpc.buSalesTarget.getById.useQuery(
    { id: selectedPlanId! },
    { enabled: selectedPlanId !== null }
  );

  const createMutation = trpc.buSalesTarget.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      listQuery.refetch();
      dashboardQuery.refetch();
    },
  });

  const updateDetailMutation = trpc.buSalesTarget.updateDetail.useMutation({
    onSuccess: () => {
      setEditingDetailId(null);
      setEditValues({});
      detailQuery.refetch();
    },
  });

  const submitAdjustmentMutation = trpc.buSalesTarget.submitAdjustment.useMutation({
    onSuccess: () => {
      setAdjustOpen(false);
      setAdjustReason("");
      detailQuery.refetch();
    },
  });

  const deleteMutation = trpc.buSalesTarget.delete.useMutation({
    onSuccess: () => {
      setSelectedPlanId(null);
      listQuery.refetch();
      dashboardQuery.refetch();
    },
  });

  const dashboard = dashboardQuery.data;
  const plans = listQuery.data?.items ?? [];
  const detail = detailQuery.data;

  const deptName = (id: string) => {
    const d = DEPARTMENTS.find((x) => x.id === id);
    return d ? (isZh ? d.name : d.nameEn) : id;
  };

  const statusBadge = (s: string) => {
    const info = STATUS_MAP[s] ?? STATUS_MAP.draft;
    return <Badge className={info.color}>{isZh ? info.label : info.labelEn}</Badge>;
  };

  const handleCreate = () => {
    createMutation.mutate({
      year: formYear,
      departmentId: formDept,
      totalSalesTarget: Number(formSalesTarget),
      totalOutputTarget: Number(formOutputTarget),
      growthRules: {
        Q2_vs_Q1: Number(formG1) / 100,
        Q3_vs_Q2: Number(formG2) / 100,
        Q4_vs_Q3: Number(formG3) / 100,
      },
    });
  };

  const handleSaveDetail = (detailId: number) => {
    updateDetailMutation.mutate({
      detailId,
      salesTarget: editValues.salesTarget ? Number(editValues.salesTarget) : undefined,
      outputTarget: editValues.outputTarget ? Number(editValues.outputTarget) : undefined,
      kpiTarget: editValues.kpiTarget ? Number(editValues.kpiTarget) : undefined,
      capabilityLevel: editValues.capabilityLevel ? Number(editValues.capabilityLevel) : undefined,
    });
  };

  const handleSubmitAdjustment = () => {
    if (!selectedPlanId || !adjustReason.trim()) return;
    submitAdjustmentMutation.mutate({
      buSalesPlanId: selectedPlanId,
      applicantId: "current-user",
      adjustmentReason: adjustReason,
      originalData: {},
      proposedData: {},
    });
  };

  // SVG bar chart
  const maxSales = Math.max(...(detail?.details ?? []).map((d) => Number(d.salesTarget ?? 0)), 1);
  const maxOutput = Math.max(...(detail?.details ?? []).map((d) => Number(d.outputTarget ?? 0)), 1);
  const barW = 36;
  const chartH = 150;
  const chartW = 12 * (barW + 10) + 20;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isZh ? "事业部目标分解" : "BU Target Breakdown"}</h1>
          <p className="text-sm text-muted-foreground">
            {isZh ? "年度销售/产值目标按月分解与微调" : "Annual sales/output target monthly breakdown & adjustment"}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "计划总数" : "Total Plans"}</p>
              <p className="text-2xl font-bold">{dashboard?.totalPlans ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "销售目标合计" : "Total Sales Target"}</p>
              <p className="text-2xl font-bold">
                ¥{((dashboard?.totalSalesTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">{isZh ? "产值目标合计" : "Total Output Target"}</p>
              <p className="text-2xl font-bold">
                ¥{((dashboard?.totalOutputTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan List + Create */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isZh ? "目标计划" : "Target Plans"}</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />{isZh ? "新建计划" : "New Plan"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isZh ? "新建目标计划" : "Create Target Plan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{isZh ? "年份" : "Year"}</Label>
                <Input type="number" value={formYear} onChange={(e) => setFormYear(Number(e.target.value))} />
              </div>
              <div>
                <Label>{isZh ? "事业部" : "Department"}</Label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>{isZh ? d.name : d.nameEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{isZh ? "年度销售目标 (¥)" : "Annual Sales Target (¥)"}</Label>
                <Input value={formSalesTarget} onChange={(e) => setFormSalesTarget(e.target.value)} />
              </div>
              <div>
                <Label>{isZh ? "年度产值目标 (¥)" : "Annual Output Target (¥)"}</Label>
                <Input value={formOutputTarget} onChange={(e) => setFormOutputTarget(e.target.value)} />
              </div>
              <Separator />
              <p className="text-sm font-medium">{isZh ? "季度增长率 (%)" : "Quarterly Growth Rate (%)"}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Q2 vs Q1</Label>
                  <Input value={formG1} onChange={(e) => setFormG1(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Q3 vs Q2</Label>
                  <Input value={formG2} onChange={(e) => setFormG2(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Q4 vs Q3</Label>
                  <Input value={formG3} onChange={(e) => setFormG3(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (isZh ? "创建中..." : "Creating...") : (isZh ? "创建并分解" : "Create & Decompose")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {isZh ? "暂无目标计划，点击上方「新建计划」开始" : "No plans yet. Click \"New Plan\" to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition hover:shadow-md ${selectedPlanId === p.id ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setSelectedPlanId(p.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{deptName(p.departmentId)}</span>
                  {statusBadge(p.status ?? "draft")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.year} {isZh ? "年" : ""}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{isZh ? "销售" : "Sales"}: </span>
                    <span className="font-medium">¥{(Number(p.totalSalesTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isZh ? "产值" : "Output"}: </span>
                    <span className="font-medium">¥{(Number(p.totalOutputTarget ?? 0) / 10000).toFixed(0)}{isZh ? "万" : "w"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Plan Detail */}
      {selectedPlanId && detail && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {deptName(detail.plan.departmentId)} — {detail.plan.year}{isZh ? " 年月度分解" : " Monthly Breakdown"}
            </h2>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(isZh ? "确定删除此计划？" : "Delete this plan?")) {
                  deleteMutation.mutate({ id: selectedPlanId });
                }
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />{isZh ? "删除" : "Delete"}
            </Button>
          </div>

          {/* Bar Charts — Sales + Output side by side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sales Target Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  {isZh ? "月度销售目标分布" : "Monthly Sales Target Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <svg width={chartW} height={chartH + 30} className="block">
                  {detail.details.map((d, i) => {
                    const val = Number(d.salesTarget ?? 0);
                    const h = (val / maxSales) * chartH;
                    const x = i * (barW + 10) + 10;
                    const quarter = Math.floor(i / 3);
                    const colors = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
                    return (
                      <g key={d.id}>
                        <rect x={x} y={chartH - h} width={barW} height={h} fill={colors[quarter]} rx={3} opacity={d.isAdjusted ? 1 : 0.75} />
                        <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">
                          {(val / 10000).toFixed(0)}
                        </text>
                        <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" className="text-[10px] fill-muted-foreground">
                          {isZh ? MONTH_LABELS[i] : MONTH_LABELS_EN[i]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </CardContent>
            </Card>

            {/* Output Target Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  {isZh ? "月度产值目标分布" : "Monthly Output Target Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <svg width={chartW} height={chartH + 30} className="block">
                  {detail.details.map((d, i) => {
                    const val = Number(d.outputTarget ?? 0);
                    const h = (val / maxOutput) * chartH;
                    const x = i * (barW + 10) + 10;
                    const quarter = Math.floor(i / 3);
                    const colors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];
                    return (
                      <g key={d.id}>
                        <rect x={x} y={chartH - h} width={barW} height={h} fill={colors[quarter]} rx={3} opacity={d.isAdjusted ? 1 : 0.75} />
                        <text x={x + barW / 2} y={chartH - h - 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">
                          {(val / 10000).toFixed(0)}
                        </text>
                        <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" className="text-[10px] fill-muted-foreground">
                          {isZh ? MONTH_LABELS[i] : MONTH_LABELS_EN[i]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </CardContent>
            </Card>
          </div>

          {/* Detail Table */}
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left">{isZh ? "月份" : "Month"}</th>
                    <th className="px-3 py-2 text-right">{isZh ? "销售目标" : "Sales Target"}</th>
                    <th className="px-3 py-2 text-right">{isZh ? "产值目标" : "Output Target"}</th>
                    <th className="px-3 py-2 text-right">{isZh ? "KPI基线" : "KPI Base"}</th>
                    <th className="px-3 py-2 text-right">{isZh ? "能力等级" : "Cap Level"}</th>
                    <th className="px-3 py-2 text-center">{isZh ? "状态" : "Status"}</th>
                    <th className="px-3 py-2 text-center">{isZh ? "操作" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.details.map((d) => {
                    const isEditing = editingDetailId === d.id;
                    const mLabel = isZh
                      ? MONTH_LABELS[(d.periodValue ?? 1) - 1]
                      : MONTH_LABELS_EN[(d.periodValue ?? 1) - 1];
                    return (
                      <tr key={d.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{mLabel}</td>
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <Input
                              className="h-7 w-28 text-right"
                              defaultValue={d.salesTarget ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, salesTarget: e.target.value }))}
                            />
                          ) : (
                            `¥${Number(d.salesTarget ?? 0).toLocaleString()}`
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <Input
                              className="h-7 w-28 text-right"
                              defaultValue={d.outputTarget ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, outputTarget: e.target.value }))}
                            />
                          ) : (
                            `¥${Number(d.outputTarget ?? 0).toLocaleString()}`
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <Input
                              className="h-7 w-20 text-right"
                              defaultValue={d.kpiTarget ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, kpiTarget: e.target.value }))}
                            />
                          ) : (
                            d.kpiTarget ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <Input
                              className="h-7 w-20 text-right"
                              defaultValue={d.capabilityLevel ?? ""}
                              onChange={(e) => setEditValues((v) => ({ ...v, capabilityLevel: e.target.value }))}
                            />
                          ) : (
                            d.capabilityLevel ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {d.isAdjusted && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              {isZh ? "已微调" : "Adjusted"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSaveDetail(d.id)}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingDetailId(null); setEditValues({}); }}>
                                <AlertCircle className="h-4 w-4 text-gray-400" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => { setEditingDetailId(d.id); setEditValues({}); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Adjustment Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{isZh ? "微调记录" : "Adjustment History"}</CardTitle>
                <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">{isZh ? "提交微调" : "Submit Adjustment"}</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{isZh ? "提交微调申请" : "Submit Adjustment Request"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>{isZh ? "微调原因" : "Reason"}</Label>
                        <Textarea
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder={isZh ? "请说明微调原因..." : "Describe the reason..."}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isZh ? "注意：微调后年度总额应保持不变（零和调整）" : "Note: Year total should remain unchanged (zero-sum adjustment)"}
                      </p>
                      <Button className="w-full" onClick={handleSubmitAdjustment} disabled={submitAdjustmentMutation.isPending}>
                        {submitAdjustmentMutation.isPending ? (isZh ? "提交中..." : "Submitting...") : (isZh ? "提交" : "Submit")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(detail.adjustments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{isZh ? "暂无微调记录" : "No adjustments yet"}</p>
              ) : (
                <div className="space-y-2">
                  {detail.adjustments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div>
                        <p className="font-medium">{a.adjustmentReason}</p>
                        <p className="text-xs text-muted-foreground">{a.applicantId} · {a.createdAt}</p>
                      </div>
                      {statusBadge(a.approvalStatus ?? "pending")}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
