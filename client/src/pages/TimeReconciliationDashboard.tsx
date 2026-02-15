/**
 * US-013 三套工时对账看板
 * UWB定位 vs BOM工步 vs 生产执行 工时三角对账 · 差异分析
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Lightbulb,
  MapPin,
  Wrench,
  Factory,
  Search,
  Sparkles,
  Users,
  ArrowRightLeft,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

interface ResolveDialogState {
  open: boolean;
  discrepancyId: string;
  userName: string;
  resolution: string;
  adjustedHours: string;
}

// ============================================================
// Component
// ============================================================

export default function TimeReconciliationDashboard() {
  // --- Form state for reconcile query ---
  const [projectId, setProjectId] = useState("");
  const [reconcileDate, setReconcileDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [userId, setUserId] = useState("");

  // --- Form state for discrepancy query ---
  const [discProjectId, setDiscProjectId] = useState("");
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateEnd, setDateEnd] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // --- Query triggers ---
  const [reconcileEnabled, setReconcileEnabled] = useState(false);
  const [discEnabled, setDiscEnabled] = useState(false);

  // --- Resolve dialog ---
  const [resolveDialog, setResolveDialog] = useState<ResolveDialogState>({
    open: false,
    discrepancyId: "",
    userName: "",
    resolution: "",
    adjustedHours: "",
  });

  // --- tRPC queries ---
  const reconcileQuery = trpc.timeReconciliation.reconcile.useQuery(
    {
      projectId: Number(projectId),
      date: reconcileDate,
      ...(userId ? { userId: Number(userId) } : {}),
    },
    {
      enabled: reconcileEnabled && !!projectId && !!reconcileDate,
      retry: false,
    }
  );

  const discrepancyQuery = trpc.timeReconciliation.getDiscrepancies.useQuery(
    {
      projectId: Number(discProjectId),
      dateRange: { start: dateStart, end: dateEnd },
    },
    {
      enabled: discEnabled && !!discProjectId && !!dateStart && !!dateEnd,
      retry: false,
    }
  );

  const resolveMutation = trpc.timeReconciliation.resolveDiscrepancy.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("差异已解决");
        setResolveDialog((prev) => ({ ...prev, open: false }));
        reconcileQuery.refetch();
        discrepancyQuery.refetch();
      } else {
        toast.error(data.message);
      }
    },
    onError: (err) => {
      toast.error(`操作失败: ${err.message}`);
    },
  });

  // --- Handlers ---
  const handleReconcile = () => {
    if (!projectId) {
      toast.error("请输入项目ID");
      return;
    }
    setReconcileEnabled(true);
  };

  const handleQueryDiscrepancies = () => {
    if (!discProjectId) {
      toast.error("请输入项目ID");
      return;
    }
    setDiscEnabled(true);
  };

  const handleResolveSubmit = () => {
    const hours = parseFloat(resolveDialog.adjustedHours);
    if (!resolveDialog.resolution.trim()) {
      toast.error("请输入处理说明");
      return;
    }
    if (isNaN(hours) || hours < 0) {
      toast.error("请输入有效的调整工时");
      return;
    }
    resolveMutation.mutate({
      discrepancyId: resolveDialog.discrepancyId,
      resolution: resolveDialog.resolution,
      adjustedHours: hours,
    });
  };

  const openResolveDialog = (discrepancyId: string, userName: string) => {
    setResolveDialog({
      open: true,
      discrepancyId,
      userName,
      resolution: "",
      adjustedHours: "",
    });
  };

  // --- Helpers ---
  const report = reconcileQuery.data;
  const discrepancies = discrepancyQuery.data;

  const formatHours = (h: number | null) => {
    if (h === null || h === undefined) return "--";
    return `${h.toFixed(1)}h`;
  };

  const getDiffBadge = (minutes: number) => {
    if (minutes === 0)
      return <Badge variant="secondary">数据缺失</Badge>;
    if (minutes > 120)
      return <Badge variant="destructive">{minutes}分钟</Badge>;
    if (minutes > 60)
      return <Badge className="bg-orange-500 text-white">{minutes}分钟</Badge>;
    return <Badge className="bg-yellow-500 text-yellow-950">{minutes}分钟</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500 text-white">已解决</Badge>;
      case "acknowledged":
        return <Badge className="bg-blue-500 text-white">已确认</Badge>;
      default:
        return <Badge variant="destructive">未解决</Badge>;
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Clock}
          title="三套工时对账"
          description="UWB定位 vs BOM工步 vs 生产执行 工时三角对账 · 差异分析"
          actions={
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI 智能对账
            </Badge>
          }
        />

        {/* ====== Tab Layout ====== */}
        <Tabs defaultValue="reconcile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reconcile" className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              工时对账
            </TabsTrigger>
            <TabsTrigger value="discrepancies" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              差异查询
            </TabsTrigger>
          </TabsList>

          {/* ====== Tab 1: Reconcile ====== */}
          <TabsContent value="reconcile" className="space-y-6">
            {/* Query Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5" />
                  对账查询
                </CardTitle>
                <CardDescription>
                  输入项目ID和日期，对比UWB定位、BOM工步、生产执行三套工时数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>项目ID *</Label>
                    <Input
                      type="number"
                      placeholder="输入项目ID"
                      className="w-[160px]"
                      value={projectId}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        setReconcileEnabled(false);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>对账日期 *</Label>
                    <Input
                      type="date"
                      className="w-[180px]"
                      value={reconcileDate}
                      onChange={(e) => {
                        setReconcileDate(e.target.value);
                        setReconcileEnabled(false);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>员工ID（可选）</Label>
                    <Input
                      type="number"
                      placeholder="全部员工"
                      className="w-[160px]"
                      value={userId}
                      onChange={(e) => {
                        setUserId(e.target.value);
                        setReconcileEnabled(false);
                      }}
                    />
                  </div>
                  <Button onClick={handleReconcile} disabled={reconcileQuery.isFetching}>
                    {reconcileQuery.isFetching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    执行对账
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {reconcileQuery.isFetching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">正在对账中...</span>
              </div>
            )}

            {/* Error */}
            {reconcileQuery.isError && (
              <Card className="border-destructive/50">
                <CardContent className="py-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    <span>对账失败: {reconcileQuery.error?.message}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {report && !reconcileQuery.isFetching && (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard
                    icon={Users}
                    label="总员工数"
                    value={report.summary.totalWorkers}
                    iconColor="text-blue-500"
                    iconBg="bg-blue-500/10"
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="匹配人数"
                    value={report.summary.matchedCount}
                    iconColor="text-green-500"
                    iconBg="bg-green-500/10"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    label="差异人数"
                    value={report.summary.discrepancyCount}
                    iconColor="text-red-500"
                    iconBg="bg-red-500/10"
                  />
                  <StatCard
                    icon={MapPin}
                    label="UWB总工时"
                    value={`${report.summary.totalUwbHours}h`}
                    iconColor="text-cyan-500"
                    iconBg="bg-cyan-500/10"
                  />
                  <StatCard
                    icon={Wrench}
                    label="BOM工步总工时"
                    value={`${report.summary.totalBomStepHours}h`}
                    iconColor="text-orange-500"
                    iconBg="bg-orange-500/10"
                  />
                  <StatCard
                    icon={Factory}
                    label="生产执行总工时"
                    value={`${report.summary.totalProductionHours}h`}
                    iconColor="text-purple-500"
                    iconBg="bg-purple-500/10"
                  />
                </div>

                {/* Three-source comparison cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-cyan-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-cyan-600">
                        <MapPin className="w-5 h-5" />
                        UWB定位工时
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{report.summary.totalUwbHours}h</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        基于UWB室内定位自动采集
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                        <Wrench className="w-5 h-5" />
                        BOM工步工时
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{report.summary.totalBomStepHours}h</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        工人上下工打卡记录汇总
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-purple-600">
                        <Factory className="w-5 h-5" />
                        生产执行工时
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{report.summary.totalProductionHours}h</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        生产执行系统阶段性记录
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Matched Records Table */}
                {report.matchedRecords.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        匹配记录（三源一致）
                      </CardTitle>
                      <CardDescription>
                        以下员工的三套工时差异在阈值（30分钟）以内
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-3 px-4 font-medium">员工</th>
                              <th className="py-3 px-4 font-medium text-cyan-600">UWB工时</th>
                              <th className="py-3 px-4 font-medium text-orange-600">BOM工步</th>
                              <th className="py-3 px-4 font-medium text-purple-600">生产执行</th>
                              <th className="py-3 px-4 font-medium">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.matchedRecords.map((rec) => (
                              <tr key={rec.userId} className="border-b hover:bg-muted/50">
                                <td className="py-3 px-4 font-medium">{rec.userName}</td>
                                <td className="py-3 px-4">{formatHours(rec.uwbHours)}</td>
                                <td className="py-3 px-4">{formatHours(rec.bomStepHours)}</td>
                                <td className="py-3 px-4">{formatHours(rec.productionHours)}</td>
                                <td className="py-3 px-4">
                                  <Badge className="bg-green-500 text-white">一致</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Discrepancy Table */}
                {report.discrepancies.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        差异记录（需处理）
                      </CardTitle>
                      <CardDescription>
                        以下员工的工时差异超过阈值（30分钟），请核实后处理
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-3 px-4 font-medium">员工</th>
                              <th className="py-3 px-4 font-medium text-cyan-600">UWB工时</th>
                              <th className="py-3 px-4 font-medium text-orange-600">BOM工步</th>
                              <th className="py-3 px-4 font-medium text-purple-600">生产执行</th>
                              <th className="py-3 px-4 font-medium">最大差异</th>
                              <th className="py-3 px-4 font-medium">状态</th>
                              <th className="py-3 px-4 font-medium">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.discrepancies.map((disc) => (
                              <tr
                                key={disc.id}
                                className="border-b hover:bg-muted/50"
                              >
                                <td className="py-3 px-4 font-medium">{disc.userName}</td>
                                <td className="py-3 px-4">{formatHours(disc.uwbHours)}</td>
                                <td className="py-3 px-4">{formatHours(disc.bomStepHours)}</td>
                                <td className="py-3 px-4">{formatHours(disc.productionHours)}</td>
                                <td className="py-3 px-4">
                                  {getDiffBadge(disc.maxDifferenceMinutes)}
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(disc.status)}</td>
                                <td className="py-3 px-4">
                                  {disc.status === "unresolved" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        openResolveDialog(disc.id, disc.userName)
                                      }
                                    >
                                      <FileCheck className="w-4 h-4 mr-1" />
                                      处理
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      {disc.resolution}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {report.recommendations.length > 0 && (
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI 对账建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {report.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state when no data */}
                {report.summary.totalWorkers === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        该项目在选定日期没有找到工时记录
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Initial state prompt */}
            {!report && !reconcileQuery.isFetching && !reconcileQuery.isError && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ArrowRightLeft className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    输入项目ID和日期开始对账
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    系统将自动对比UWB定位、BOM工步、生产执行三套工时数据
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ====== Tab 2: Discrepancy History ====== */}
          <TabsContent value="discrepancies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  差异记录查询
                </CardTitle>
                <CardDescription>
                  查询指定项目和日期范围内的未解决差异记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>项目ID *</Label>
                    <Input
                      type="number"
                      placeholder="输入项目ID"
                      className="w-[160px]"
                      value={discProjectId}
                      onChange={(e) => {
                        setDiscProjectId(e.target.value);
                        setDiscEnabled(false);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>开始日期</Label>
                    <Input
                      type="date"
                      className="w-[180px]"
                      value={dateStart}
                      onChange={(e) => {
                        setDateStart(e.target.value);
                        setDiscEnabled(false);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>结束日期</Label>
                    <Input
                      type="date"
                      className="w-[180px]"
                      value={dateEnd}
                      onChange={(e) => {
                        setDateEnd(e.target.value);
                        setDiscEnabled(false);
                      }}
                    />
                  </div>
                  <Button onClick={handleQueryDiscrepancies} disabled={discrepancyQuery.isFetching}>
                    {discrepancyQuery.isFetching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    查询差异
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {discrepancyQuery.isFetching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">正在查询...</span>
              </div>
            )}

            {/* Error */}
            {discrepancyQuery.isError && (
              <Card className="border-destructive/50">
                <CardContent className="py-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    <span>查询失败: {discrepancyQuery.error?.message}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discrepancy Results */}
            {discrepancies && !discrepancyQuery.isFetching && (
              <>
                {discrepancies.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        未解决差异（{discrepancies.length} 条）
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-3 px-4 font-medium">日期</th>
                              <th className="py-3 px-4 font-medium">员工</th>
                              <th className="py-3 px-4 font-medium text-cyan-600">UWB工时</th>
                              <th className="py-3 px-4 font-medium text-orange-600">BOM工步</th>
                              <th className="py-3 px-4 font-medium text-purple-600">生产执行</th>
                              <th className="py-3 px-4 font-medium">最大差异</th>
                              <th className="py-3 px-4 font-medium">状态</th>
                              <th className="py-3 px-4 font-medium">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {discrepancies.map((disc) => (
                              <tr
                                key={disc.id}
                                className="border-b hover:bg-muted/50"
                              >
                                <td className="py-3 px-4">{disc.date}</td>
                                <td className="py-3 px-4 font-medium">{disc.userName}</td>
                                <td className="py-3 px-4">{formatHours(disc.uwbHours)}</td>
                                <td className="py-3 px-4">{formatHours(disc.bomStepHours)}</td>
                                <td className="py-3 px-4">{formatHours(disc.productionHours)}</td>
                                <td className="py-3 px-4">
                                  {getDiffBadge(disc.maxDifferenceMinutes)}
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(disc.status)}</td>
                                <td className="py-3 px-4">
                                  {disc.status === "unresolved" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        openResolveDialog(disc.id, disc.userName)
                                      }
                                    >
                                      <FileCheck className="w-4 h-4 mr-1" />
                                      处理
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      {disc.resolution}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-green-500/30 mb-4" />
                      <p className="text-muted-foreground">
                        该日期范围内没有未解决的差异记录
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Initial state */}
            {!discrepancies && !discrepancyQuery.isFetching && !discrepancyQuery.isError && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    输入项目ID和日期范围查询差异记录
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    系统将显示该时段内所有未解决的工时差异
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* ====== Resolve Dialog ====== */}
        <Dialog
          open={resolveDialog.open}
          onOpenChange={(open) =>
            setResolveDialog((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>处理工时差异</DialogTitle>
              <DialogDescription>
                为 {resolveDialog.userName} 的工时差异提供处理说明和调整工时
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>处理说明 *</Label>
                <Textarea
                  placeholder="说明差异原因及处理方式..."
                  value={resolveDialog.resolution}
                  onChange={(e) =>
                    setResolveDialog((prev) => ({
                      ...prev,
                      resolution: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>调整后工时（小时） *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="输入最终确认的工时"
                  value={resolveDialog.adjustedHours}
                  onChange={(e) =>
                    setResolveDialog((prev) => ({
                      ...prev,
                      adjustedHours: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setResolveDialog((prev) => ({ ...prev, open: false }))
                }
              >
                取消
              </Button>
              <Button
                onClick={handleResolveSubmit}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                确认处理
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====== Feature Info Card ====== */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              三套工时对账功能说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                对比UWB室内定位、BOM工步打卡、生产执行记录三套工时数据
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                自动检测差异超过30分钟的记录，按严重程度分级标记
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                支持差异处理流程，记录处理说明和调整后工时
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                AI智能分析生成对账建议，识别系统性偏差和数据缺失
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                支持按项目、日期、员工维度灵活查询和过滤
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
