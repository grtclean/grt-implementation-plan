/**
 * 智慧排程工作台 — Smart Production Scheduling Workbench
 * 4 tabs: BOM工时分解 | 资源与约束 | 里程碑追踪 | 智能排程
 *
 * Data source: trpc.smartProductionScheduling.* (DB-backed)
 */
import { useState } from "react";
import { useSandboxPageEnhancements } from "@/components/Sandbox/useSandboxPageEnhancements";
import ShortcutOverlay from "@/components/Sandbox/ShortcutOverlay";
import SandboxFileImport from "@/components/Sandbox/SandboxFileImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CalendarClock,
  Wrench,
  Package,
  Milestone,
  BarChart3,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Calculator,
  CircleCheck,
  CircleX,
  Timer,
  Truck,
  Users,
  Cpu,
  GanttChart,
} from "lucide-react";

// ── Process T1-T15 labels ──
const PROCESS_LABELS: Record<string, string> = {
  T1: "T1 机加工", T2: "T2 冷作", T3: "T3 部件装配", T4: "T4 机械装配",
  T5: "T5 机械总装", T6: "T6 电气装配", T7: "T7 设备调试", T8: "T8 跑和",
  T9: "T9 包装", T10: "T10 发货", T11: "T11 卸车", T12: "T12 就位",
  T13: "T13 水电气连接", T14: "T14 现场调试", T15: "T15 终验收",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  scheduled: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  delayed: "bg-red-100 text-red-700",
};

export default function SmartProductionScheduling() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("bom-hours");
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);

  // ── Sandbox enhancements ──
  const { shortcutOverlayOpen, setShortcutOverlayOpen, shortcuts, lastSaved, isSaving } = useSandboxPageEnhancements({
    sandboxShortcuts: [
      { key: "ctrl+shift+w", label: "提交报工", labelEn: "Submit labor report", action: () => setActiveTab("labor-report") },
    ],
    autoSave: {
      data: { activeTab, selectedProjectId },
      onSave: async (d) => { localStorage.setItem("grt-sb-scheduling", JSON.stringify(d)); },
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} commonShortcuts={shortcuts.commonShortcuts} sandboxShortcuts={shortcuts.sandboxShortcuts} sandboxTitle="排产调度" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            智慧排程工作台
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            BOM工时分解 → 约束排程 → 里程碑追踪 → 智能优化
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">项目:</span>
          <Select
            value={String(selectedProjectId)}
            onValueChange={(v) => setSelectedProjectId(Number(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((id) => (
                <SelectItem key={id} value={String(id)}>
                  GRT{String(id).padStart(3, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bom-hours" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" /> BOM工时
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1">
            <Package className="h-4 w-4" /> 资源约束
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-1">
            <Milestone className="h-4 w-4" /> 里程碑
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> 智能排程
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bom-hours">
          <BomWorkHoursTab projectId={selectedProjectId} />
        </TabsContent>
        <TabsContent value="resources">
          <ResourceConstraintsTab projectId={selectedProjectId} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestoneTrackingTab projectId={selectedProjectId} />
        </TabsContent>
        <TabsContent value="scheduling">
          <SmartSchedulingTab projectId={selectedProjectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: BOM工时分解
// ═══════════════════════════════════════════════════════════════

function BomWorkHoursTab({ projectId }: { projectId: number }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [editReason, setEditReason] = useState("");

  const breakdown = trpc.smartProductionScheduling.bomWorkHours.getWorkHoursBreakdown.useQuery(
    { projectId },
  );
  const summary = trpc.smartProductionScheduling.bomWorkHours.getWorkHoursSummary.useQuery(
    { projectId },
  );
  const comparison = trpc.smartProductionScheduling.bomWorkHours.getWorkHoursComparison.useQuery(
    { projectId },
  );

  const generateMut = trpc.smartProductionScheduling.bomWorkHours.generateWorkHoursFromBom.useMutation({
    onSuccess: () => { breakdown.refetch(); summary.refetch(); toast.success("工时生成完成"); },
    onError: (e) => toast.error(e.message),
  });
  const adjustMut = trpc.smartProductionScheduling.bomWorkHours.adjustWorkHours.useMutation({
    onSuccess: () => { breakdown.refetch(); summary.refetch(); setEditingId(null); toast.success("工时已调整"); },
    onError: (e) => toast.error(e.message),
  });
  const confirmMut = trpc.smartProductionScheduling.bomWorkHours.batchConfirmWorkHours.useMutation({
    onSuccess: () => { breakdown.refetch(); summary.refetch(); toast.success("工时已确认"); },
    onError: (e) => toast.error(e.message),
  });

  const grouped = breakdown.data?.grouped ?? {};
  const processCodes = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">理论总工时</div>
            <div className="text-2xl font-bold">{summary.data?.totalTheoryHours ?? 0}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">调整后总工时</div>
            <div className="text-2xl font-bold">{summary.data?.totalAdjustedHours ?? 0}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">工步总数</div>
            <div className="text-2xl font-bold">{summary.data?.totalItems ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              vs 历史均值
              {comparison.data?.comparison?.[0]?.delta != null && (
                <Badge variant={comparison.data.comparison[0].delta > 0 ? "destructive" : "default"} className="text-xs">
                  {comparison.data.comparison[0].delta > 0 ? "+" : ""}{comparison.data.comparison[0].delta}h
                </Badge>
              )}
            </div>
            <div className="text-sm mt-1">
              {comparison.data?.comparison?.length ?? 0} 工序有历史数据
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => generateMut.mutate({ projectId })}
          disabled={generateMut.isPending}
        >
          <Calculator className="h-4 w-4 mr-1" />
          自动计算
        </Button>
        <SandboxFileImport
          accept=".csv"
          label="导入工时"
          onImport={(rows, fileName) => { toast.success(`已导入 ${rows.length} 行工时数据 (${fileName})`); }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const pendingIds = (breakdown.data?.items ?? [])
              .filter((i) => i.status === "pending")
              .map((i) => i.id);
            if (pendingIds.length > 0) confirmMut.mutate({ ids: pendingIds });
            else toast.info("无待确认工步");
          }}
          disabled={confirmMut.isPending}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          确认工时
        </Button>
        <Button size="sm" variant="ghost" onClick={() => breakdown.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* T1-T15 Accordion */}
      {processCodes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            暂无工时数据，点击自动计算从BOM生成工时分解
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {processCodes.map((pc) => {
            const items = grouped[pc] ?? [];
            const theoryTotal = items.reduce((s, i) => s + (i.baseTheoryMinutes ?? 0), 0);
            const adjustedTotal = items.reduce((s, i) => s + (i.adjustedMinutes ?? i.baseTheoryMinutes ?? 0), 0);
            const confirmedCount = items.filter((i) => i.status === "confirmed").length;

            return (
              <AccordionItem key={pc} value={pc} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <span className="font-medium">{PROCESS_LABELS[pc] ?? pc}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        理论 {(theoryTotal / 60).toFixed(1)}h / 调整 {(adjustedTotal / 60).toFixed(1)}h
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {confirmedCount}/{items.length} 已确认
                      </Badge>
                      {items.some((i) => !i.materialReady) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />缺料
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">装配内容</TableHead>
                          <TableHead>SOP基准(分)</TableHead>
                          <TableHead>难度系数</TableHead>
                          <TableHead>理论工时(分)</TableHead>
                          <TableHead>调整工时(分)</TableHead>
                          <TableHead>调整原因</TableHead>
                          <TableHead>前置</TableHead>
                          <TableHead>物料</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm max-w-[250px] truncate">
                              {item.assemblyDescription ?? "-"}
                            </TableCell>
                            <TableCell>{item.baseTheoryMinutes ?? "-"}</TableCell>
                            <TableCell>{item.difficultyFactor ?? "1.0"}</TableCell>
                            <TableCell>{item.baseTheoryMinutes ?? "-"}</TableCell>
                            <TableCell>
                              {editingId === item.id ? (
                                <Input
                                  type="number"
                                  value={editMinutes}
                                  onChange={(e) => setEditMinutes(e.target.value)}
                                  className="w-20 h-7"
                                />
                              ) : (
                                item.adjustedMinutes ?? item.baseTheoryMinutes ?? "-"
                              )}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-sm">
                              {editingId === item.id ? (
                                <Input
                                  value={editReason}
                                  onChange={(e) => setEditReason(e.target.value)}
                                  placeholder="调整原因"
                                  className="w-32 h-7"
                                />
                              ) : (
                                item.adjustReason ?? "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {item.predecessorStepIds && (item.predecessorStepIds as number[]).length > 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  {(item.predecessorStepIds as number[]).length}个前置
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">无</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.materialReady ? (
                                <CircleCheck className="h-4 w-4 text-green-500" />
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CircleX className="h-4 w-4 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {item.materialEarliestAvailable
                                        ? `PO预计到货: ${item.materialEarliestAvailable}`
                                        : "物料未就绪"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${STATUS_COLORS[item.status] ?? ""}`}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {editingId === item.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 px-2"
                                    onClick={() =>
                                      adjustMut.mutate({
                                        id: item.id,
                                        adjustedMinutes: Number(editMinutes),
                                        adjustReason: editReason,
                                      })
                                    }
                                    disabled={adjustMut.isPending}
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => setEditingId(null)}
                                  >
                                    取消
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditMinutes(String(item.adjustedMinutes ?? item.baseTheoryMinutes ?? ""));
                                    setEditReason(item.adjustReason ?? "");
                                  }}
                                >
                                  调整
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: 资源与约束
// ═══════════════════════════════════════════════════════════════

function ResourceConstraintsTab({ projectId }: { projectId: number }) {
  const constraints = trpc.smartProductionScheduling.resourceMaterial.getSchedulingConstraints.useQuery({ projectId });
  const capacity = trpc.smartProductionScheduling.resourceMaterial.getCapacityUtilization.useQuery();

  return (
    <div className="space-y-4">
      {/* Capacity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            跨项目资源负荷
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capacity.data?.utilization && capacity.data.utilization.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {capacity.data.utilization.map((u) => (
                <div key={u.processCode} className="text-center p-3 border rounded-lg">
                  <div className="font-medium text-sm">{PROCESS_LABELS[u.processCode] ?? u.processCode}</div>
                  <div className="text-xl font-bold mt-1">{u.totalHours}h</div>
                  <div className="text-xs text-muted-foreground">{u.taskCount} 任务</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">暂无排程数据</p>
          )}
        </CardContent>
      </Card>

      {/* Material Readiness Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            物料齐套矩阵
          </CardTitle>
        </CardHeader>
        <CardContent>
          {constraints.data?.constraints && constraints.data.constraints.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工序</TableHead>
                    <TableHead>工步ID</TableHead>
                    <TableHead>设备要求</TableHead>
                    <TableHead>技能等级</TableHead>
                    <TableHead>物料就绪</TableHead>
                    <TableHead>最早可用</TableHead>
                    <TableHead>前置任务</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constraints.data.constraints.map((c) => (
                    <TableRow key={c.workHourId}>
                      <TableCell className="font-medium">{PROCESS_LABELS[c.processCode] ?? c.processCode}</TableCell>
                      <TableCell>#{c.workHourId}</TableCell>
                      <TableCell>{c.equipmentRequired ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.skillLevelRequired ?? "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.materialReady ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">就绪</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">缺料</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{c.materialEarliestAvailable ?? "-"}</TableCell>
                      <TableCell>
                        {c.predecessorStepIds && (c.predecessorStepIds as number[]).length > 0
                          ? `${(c.predecessorStepIds as number[]).length}个`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">暂无约束数据，请先在BOM工时Tab生成并确认工时</p>
          )}
        </CardContent>
      </Card>

      {/* Resource Panels (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              人员技能矩阵
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              按技能等级(L1-L5)×工序能力展示人员分配。
              需要在排程资源管理中配置人员数据。
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              设备产能面板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              设备可用时间线与产能(小时/天)。
              需要在排程资源管理中配置设备数据。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: 里程碑追踪
// ═══════════════════════════════════════════════════════════════

function MilestoneTrackingTab({ projectId }: { projectId: number }) {
  const progress = trpc.smartProductionScheduling.milestone.getMilestoneProgress.useQuery({ projectId });
  const risk = trpc.smartProductionScheduling.milestone.getMilestoneRiskAssessment.useQuery({ projectId });
  const benchmarks = trpc.smartProductionScheduling.milestone.getHistoricalBenchmarks.useQuery();

  const generateMut = trpc.smartProductionScheduling.milestone.generateMilestoneTargets.useMutation({
    onSuccess: () => { progress.refetch(); risk.refetch(); toast.success("里程碑目标已生成"); },
    onError: (e) => toast.error(e.message),
  });
  const computeBenchMut = trpc.smartProductionScheduling.milestone.computeHistoricalBenchmarks.useMutation({
    onSuccess: () => { benchmarks.refetch(); toast.success("历史基准已计算"); },
    onError: (e) => toast.error(e.message),
  });

  const milestones = progress.data?.items ?? [];
  const risks = risk.data ?? [];

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => computeBenchMut.mutate()}
          disabled={computeBenchMut.isPending}
        >
          <Calculator className="h-4 w-4 mr-1" />
          计算历史基准
        </Button>
        <Button
          size="sm"
          onClick={() => generateMut.mutate({ projectId })}
          disabled={generateMut.isPending}
        >
          <Milestone className="h-4 w-4 mr-1" />
          生成里程碑目标
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { progress.refetch(); risk.refetch(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* M0-M12 Timeline */}
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            暂无里程碑数据，请先计算历史基准后生成里程碑目标
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">M0-M12 里程碑时间轴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((m) => {
                const riskItem = risks.find((r) => r.milestoneCode === m.milestoneCode);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    {/* Status indicator */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <Badge className={`text-xs ${STATUS_COLORS[m.status] ?? ""}`}>
                        {m.milestoneCode}
                      </Badge>
                    </div>

                    {/* Name + Source */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{m.milestoneName ?? m.milestoneCode}</div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="text-xs text-muted-foreground truncate max-w-[400px]">
                              {m.baselineSource
                                ? m.baselineSource.slice(0, 80) + (m.baselineSource.length > 80 ? "..." : "")
                                : "无历史来源"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p className="text-xs">{m.baselineSource ?? "无历史来源数据"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-right space-y-0.5 flex-shrink-0">
                      <div>目标: {m.targetDate ?? "-"}</div>
                      <div className={m.actualDate ? "text-green-600 font-medium" : ""}>
                        实际: {m.actualDate ?? "进行中"}
                      </div>
                    </div>

                    {/* Historical Range */}
                    <div className="text-xs text-right flex-shrink-0 w-24">
                      <div>历史均值: {Number(m.historicalAvgDays)?.toFixed(1) ?? "-"}天</div>
                      <div className="text-muted-foreground">
                        {Number(m.historicalMinDays)?.toFixed(0) ?? "?"}–{Number(m.historicalMaxDays)?.toFixed(0) ?? "?"}天
                      </div>
                    </div>

                    {/* Risk */}
                    <div className="flex-shrink-0">
                      {riskItem && (
                        <Badge className={`text-xs ${STATUS_COLORS[riskItem.riskLevel] ?? ""}`}>
                          {riskItem.riskLevel === "on_track" ? "正常" : riskItem.riskLevel === "at_risk" ? "风险" : "延期"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" />
            T步骤历史基准
          </CardTitle>
        </CardHeader>
        <CardContent>
          {benchmarks.data?.items && benchmarks.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工序</TableHead>
                    <TableHead>产品类别</TableHead>
                    <TableHead>平均(h)</TableHead>
                    <TableHead>P50(h)</TableHead>
                    <TableHead>P80(h)</TableHead>
                    <TableHead>最小-最大(h)</TableHead>
                    <TableHead>样本数</TableHead>
                    <TableHead>置信度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks.data.items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{PROCESS_LABELS[b.processCode] ?? b.processCode}</TableCell>
                      <TableCell>{b.productCategory}</TableCell>
                      <TableCell>{Number(b.avgHours)?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell>{Number(b.p50Hours)?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell>{Number(b.p80Hours)?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell>{Number(b.minHours)?.toFixed(1) ?? "-"} – {Number(b.maxHours)?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell>{b.sampleCount ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={(b.sampleCount ?? 0) < 5 ? "destructive" : "default"} className="text-xs">
                          {(b.sampleCount ?? 0) < 5 ? "低" : "高"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">无历史基准数据。点击"计算历史基准"按钮生成。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab 4: 智能排程
// ═══════════════════════════════════════════════════════════════

function SmartSchedulingTab({ projectId }: { projectId: number }) {
  const [optimLevel, setOptimLevel] = useState<"fast" | "balanced" | "optimal">("balanced");

  const gantt = trpc.smartProductionScheduling.scheduling.getProjectGantt.useQuery({ projectId });
  const conflicts = trpc.smartProductionScheduling.scheduling.getScheduleConflicts.useQuery({ projectId });
  const changeLog = trpc.smartProductionScheduling.scheduling.getScheduleChangeLog.useQuery({ projectId, limit: 20 });

  const buildMut = trpc.smartProductionScheduling.scheduling.buildProjectSchedule.useMutation({
    onSuccess: (data) => {
      gantt.refetch();
      conflicts.refetch();
      if (data.result.feasible) {
        toast.success(`排程完成: ${data.result.scheduledTasks.length}个任务已安排`);
      } else {
        toast.warning(`排程不可行: ${data.result.message}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const applyMut = trpc.smartProductionScheduling.scheduling.applyScheduleToProject.useMutation({
    onSuccess: (data) => {
      gantt.refetch();
      toast.success(`已更新${data.applied}个工序的计划日期`);
    },
    onError: (e) => toast.error(e.message),
  });

  const ganttTasks = gantt.data?.tasks ?? [];
  const ganttMilestones = gantt.data?.milestones ?? [];
  const conflictList = conflicts.data?.conflicts ?? [];

  return (
    <div className="space-y-4">
      {/* Scheduling Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">优化等级:</span>
              <Select value={optimLevel} onValueChange={(v) => setOptimLevel(v as typeof optimLevel)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">快速</SelectItem>
                  <SelectItem value="balanced">均衡</SelectItem>
                  <SelectItem value="optimal">最优</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => buildMut.mutate({ projectId, optimizationLevel: optimLevel })}
              disabled={buildMut.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              运行排程
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (buildMut.data?.result.scheduledTasks) {
                  applyMut.mutate({
                    projectId,
                    scheduledTasks: buildMut.data.result.scheduledTasks.map((t) => ({
                      taskId: t.taskId,
                      scheduledStart: new Date(t.scheduledStart).toISOString(),
                      scheduledEnd: new Date(t.scheduledEnd).toISOString(),
                    })),
                  });
                } else {
                  toast.info("请先运行排程");
                }
              }}
              disabled={applyMut.isPending || !buildMut.data?.result.feasible}
            >
              <Download className="h-4 w-4 mr-1" />
              应用排程
            </Button>
            <Button size="sm" variant="ghost" onClick={() => gantt.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conflict Alerts */}
      {conflictList.length > 0 && (
        <Card className="border-yellow-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              冲突告警 ({conflictList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflictList.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant={c.severity === "critical" ? "destructive" : "default"} className="text-xs">
                    {c.severity === "critical" ? "严重" : "警告"}
                  </Badge>
                  <span>{c.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gantt-like Task View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GanttChart className="h-5 w-5" />
            排程任务视图
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ganttTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              暂无已排程的任务。请先在BOM工时Tab确认工时，然后运行排程。
            </p>
          ) : (
            <div className="space-y-2">
              {ganttTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50">
                  <Badge variant="outline" className="w-16 justify-center text-xs">
                    {task.processCode}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{task.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(task.durationMinutes / 60).toFixed(1)}h
                      {task.predecessors && (task.predecessors as number[]).length > 0 &&
                        ` | ${(task.predecessors as number[]).length}个前置`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.materialReady ? (
                      <Truck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Truck className="h-4 w-4 text-red-400" />
                    )}
                    <Badge className={`text-xs ${STATUS_COLORS[task.status] ?? ""}`}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones in Gantt */}
      {ganttMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">里程碑节点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {ganttMilestones.map((m) => (
                <div key={m.code} className="text-center p-2 border rounded-lg min-w-[100px]">
                  <Badge className={`text-xs ${STATUS_COLORS[m.status] ?? ""}`}>{m.code}</Badge>
                  <div className="text-xs mt-1">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.targetDate ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Log */}
      {(changeLog.data?.changes?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              排程修改日志
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工序</TableHead>
                    <TableHead>装配内容</TableHead>
                    <TableHead>调整工时(分)</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeLog.data?.changes?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.processCode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.description ?? "-"}</TableCell>
                      <TableCell>{c.adjustedMinutes ?? "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.adjustReason ?? "-"}</TableCell>
                      <TableCell className="text-xs">{c.adjustedAt ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Solver Results (if available) */}
      {buildMut.data?.result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">排程求解结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">可行性</div>
                <Badge variant={buildMut.data.result.feasible ? "default" : "destructive"}>
                  {buildMut.data.result.feasible ? "可行" : "不可行"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">总延迟</div>
                <div className="text-lg font-bold">{buildMut.data.result.totalDelay.toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">换线成本</div>
                <div className="text-lg font-bold">{buildMut.data.result.totalChangeoverCost.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">求解耗时</div>
                <div className="text-lg font-bold">{buildMut.data.result.solveTimeSeconds.toFixed(2)}s</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
