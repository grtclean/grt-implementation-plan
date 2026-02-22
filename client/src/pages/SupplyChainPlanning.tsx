/**
 * Supply Chain Planning Page
 * 供应链计划 — 项目→生产→供应链 三级计划联动与风险预警
 *
 * Area 1: Company Project Plan (公司级项目计划)
 * Area 2: Production Delivery Plan (生产交付计划)
 * Area 3: Supply Chain Delivery Plan (供应链交付计划)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CalendarClock, FolderKanban, Factory, Truck,
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  ChevronDown, ChevronUp, Search, Package,
  FileText, ShieldCheck, ArrowRightLeft, Target,
  Timer, CalendarDays, BarChart3, CircleDot,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────

function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  active: "进行中",
  on_hold: "暂停",
  completed: "已完成",
  cancelled: "已取消",
  sent: "已发送",
  confirmed: "已确认",
  partially_received: "部分收货",
  received: "已收货",
  pending: "待处理",
  qc_pending: "待质检",
  qc_passed: "质检通过",
  qc_failed: "质检不通过",
  warehouse_confirmed: "已入库",
  rejected: "已拒绝",
  signed: "已签署",
  expired: "已过期",
  terminated: "已终止",
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["completed", "received", "qc_passed", "warehouse_confirmed", "signed", "active"].includes(status)) return "default";
  if (["cancelled", "rejected", "qc_failed", "terminated"].includes(status)) return "destructive";
  if (["draft", "pending", "expired"].includes(status)) return "outline";
  return "secondary";
}

function projectProgressColor(percent: number): string {
  if (percent >= 80) return "bg-green-500";
  if (percent >= 50) return "bg-blue-500";
  if (percent >= 25) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Area 1: Company Project Plan ─────────────────────────────

function CompanyProjectPlan() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const projectsQuery = trpc.project.list.useQuery();
  const today = todayStr();

  const projects = useMemo(() => {
    const raw = projectsQuery.data ?? [];
    const filtered = search
      ? raw.filter(
          (p) =>
            (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (p.projectCode ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : raw;
    return [...filtered].sort((a, b) => {
      const aEnd = a.plannedEndDate ?? "9999-12-31";
      const bEnd = b.plannedEndDate ?? "9999-12-31";
      return aEnd.localeCompare(bEnd);
    });
  }, [projectsQuery.data, search]);

  const stats = useMemo(() => {
    const all = projectsQuery.data ?? [];
    const total = all.length;
    const active = all.filter((p) => p.status === "active").length;
    const completed = all.filter((p) => p.status === "completed").length;
    const atRisk = all.filter(
      (p) =>
        p.plannedEndDate &&
        p.plannedEndDate < today &&
        p.status !== "completed" &&
        p.status !== "cancelled"
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, active, atRisk, completionRate };
  }, [projectsQuery.data, today]);

  const isOverdue = (p: { plannedEndDate?: string | null; status: string }) =>
    p.plannedEndDate && p.plannedEndDate < today && p.status !== "completed" && p.status !== "cancelled";

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderKanban className="w-5 h-5 text-blue-500" />
            公司级项目计划
            <Badge variant="outline" className="ml-2">{stats.total} 个项目</Badge>
          </CardTitle>
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          {projectsQuery.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={FolderKanban}
                  label="项目总数"
                  value={stats.total}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <StatCard
                  icon={Target}
                  label="进行中"
                  value={stats.active}
                  iconColor="text-green-500"
                  iconBg="bg-green-500/10"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="超期风险"
                  value={stats.atRisk}
                  iconColor="text-red-500"
                  iconBg="bg-red-500/10"
                />
                <StatCard
                  icon={TrendingUp}
                  label="完成率"
                  value={`${stats.completionRate}%`}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索项目名称或编号..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    projectsQuery.refetch();
                    toast.success("项目数据已刷新");
                  }}
                >
                  刷新
                </Button>
              </div>

              <div className="space-y-3">
                {projects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">暂无项目数据</div>
                )}
                {projects.map((project) => {
                  const overdue = isOverdue(project);
                  const percent = project.completionPercent ?? 0;
                  const startDate = formatDate(project.plannedStartDate);
                  const endDate = formatDate(project.plannedEndDate);
                  const totalDays = daysBetween(project.plannedStartDate, project.plannedEndDate);
                  const elapsedDays = daysBetween(project.plannedStartDate, today);
                  const timeProgress =
                    totalDays && totalDays > 0 && elapsedDays !== null
                      ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
                      : 0;

                  return (
                    <div
                      key={project.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        overdue ? "border-red-500/50 bg-red-500/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              {project.projectCode ?? "—"}
                            </span>
                            <Badge variant={statusVariant(project.status)}>
                              {STATUS_LABELS[project.status] ?? project.status}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                超期
                              </Badge>
                            )}
                            {project.priority === "critical" && (
                              <Badge variant="destructive" className="text-xs">紧急</Badge>
                            )}
                          </div>
                          <h4 className="font-medium truncate">{project.name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {startDate} → {endDate}
                            </span>
                            {totalDays !== null && (
                              <span className="flex items-center gap-1">
                                <Timer className="w-3.5 h-3.5" />
                                {totalDays} 天
                              </span>
                            )}
                            {project.currentPhase && (
                              <span className="flex items-center gap-1">
                                <CircleDot className="w-3.5 h-3.5" />
                                阶段: {project.currentPhase}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-32 text-right shrink-0">
                          <div className="text-sm font-medium mb-1">完成 {percent}%</div>
                          <Progress value={percent} className="h-2" />
                          {timeProgress > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              时间进度: {timeProgress}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Area 2: Production Delivery Plan ─────────────────────────

function ProductionDeliveryPlan() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const posQuery = trpc.procurement.getPurchaseOrders.useQuery({
    page: 1,
    pageSize: 200,
  });
  const today = todayStr();

  const allPOs = useMemo(() => posQuery.data?.items ?? [], [posQuery.data]);

  const filteredPOs = useMemo(() => {
    const filtered = search
      ? allPOs.filter(
          (po) =>
            (po.poNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (po.materialName ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (po.supplierName ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : allPOs;
    return [...filtered].sort((a, b) => {
      const aDate = a.expectedDeliveryDate ?? "9999-12-31";
      const bDate = b.expectedDeliveryDate ?? "9999-12-31";
      return aDate.localeCompare(bDate);
    });
  }, [allPOs, search]);

  const stats = useMemo(() => {
    const total = allPOs.length;
    let onTime = 0;
    let delayed = 0;
    let thisMonth = 0;
    const currentMonth = today.substring(0, 7);

    allPOs.forEach((po) => {
      if (po.actualDeliveryDate && po.expectedDeliveryDate) {
        const variance = daysBetween(po.expectedDeliveryDate, po.actualDeliveryDate);
        if (variance !== null && variance <= 0) onTime++;
        else delayed++;
      } else if (po.expectedDeliveryDate && po.expectedDeliveryDate < today && !po.actualDeliveryDate) {
        delayed++;
      } else if (po.actualDeliveryDate) {
        onTime++;
      }

      if (
        (po.expectedDeliveryDate ?? "").substring(0, 7) === currentMonth ||
        (po.actualDeliveryDate ?? "").substring(0, 7) === currentMonth
      ) {
        thisMonth++;
      }
    });

    const onTimeRate = total > 0 ? Math.round((onTime / Math.max(1, onTime + delayed)) * 100) : 0;
    return { total, onTimeRate, delayed, thisMonth };
  }, [allPOs, today]);

  function getVarianceInfo(po: {
    expectedDeliveryDate: string;
    actualDeliveryDate: string | null;
  }): { days: number | null; label: string; color: string } {
    if (po.actualDeliveryDate) {
      const diff = daysBetween(po.expectedDeliveryDate, po.actualDeliveryDate);
      if (diff === null) return { days: null, label: "—", color: "text-muted-foreground" };
      if (diff <= 0) return { days: diff, label: `提前 ${Math.abs(diff)} 天`, color: "text-green-600" };
      if (diff <= 3) return { days: diff, label: `延迟 ${diff} 天`, color: "text-amber-600" };
      return { days: diff, label: `延迟 ${diff} 天`, color: "text-red-600" };
    }
    if (po.expectedDeliveryDate < today) {
      const diff = daysBetween(po.expectedDeliveryDate, today);
      if (diff !== null && diff > 0)
        return { days: diff, label: `超期 ${diff} 天`, color: "text-red-600" };
    }
    const daysUntil = daysBetween(today, po.expectedDeliveryDate);
    if (daysUntil !== null && daysUntil <= 3 && daysUntil >= 0)
      return { days: daysUntil, label: `${daysUntil} 天内到期`, color: "text-amber-600" };
    return { days: null, label: "待交付", color: "text-muted-foreground" };
  }

  function deliveryStatusBadge(po: {
    expectedDeliveryDate: string;
    actualDeliveryDate: string | null;
    status: string;
  }) {
    if (po.status === "received" || po.status === "partially_received") {
      return <Badge variant="default">已收货</Badge>;
    }
    if (po.status === "cancelled") {
      return <Badge variant="destructive">已取消</Badge>;
    }
    if (po.actualDeliveryDate) {
      const diff = daysBetween(po.expectedDeliveryDate, po.actualDeliveryDate);
      if (diff !== null && diff <= 0) return <Badge className="bg-green-600">准时</Badge>;
      return <Badge variant="destructive">延迟</Badge>;
    }
    if (po.expectedDeliveryDate < today) {
      return <Badge variant="destructive">超期未交</Badge>;
    }
    const daysUntil = daysBetween(today, po.expectedDeliveryDate);
    if (daysUntil !== null && daysUntil <= 3) {
      return <Badge className="bg-amber-500 text-white">即将到期</Badge>;
    }
    return <Badge variant="outline">待交付</Badge>;
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="w-5 h-5 text-orange-500" />
            生产交付计划
            <Badge variant="outline" className="ml-2">{stats.total} 笔订单</Badge>
          </CardTitle>
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          {posQuery.isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Package}
                  label="订单总数"
                  value={stats.total}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="准时率"
                  value={`${stats.onTimeRate}%`}
                  iconColor="text-green-500"
                  iconBg="bg-green-500/10"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="延迟订单"
                  value={stats.delayed}
                  iconColor="text-red-500"
                  iconBg="bg-red-500/10"
                />
                <StatCard
                  icon={CalendarDays}
                  label="本月交付"
                  value={stats.thisMonth}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索PO编号、物料或供应商..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    posQuery.refetch();
                    toast.success("采购订单已刷新");
                  }}
                >
                  刷新
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-3 font-medium">PO编号</th>
                      <th className="py-2 px-3 font-medium">物料</th>
                      <th className="py-2 px-3 font-medium">供应商</th>
                      <th className="py-2 px-3 font-medium">计划交期</th>
                      <th className="py-2 px-3 font-medium">实际交期</th>
                      <th className="py-2 px-3 font-medium">状态</th>
                      <th className="py-2 px-3 font-medium text-right">偏差</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPOs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无采购订单数据
                        </td>
                      </tr>
                    )}
                    {filteredPOs.map((po) => {
                      const variance = getVarianceInfo(po);
                      return (
                        <tr key={po.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-xs">{po.poNumber}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{po.materialName}</div>
                            <div className="text-xs text-muted-foreground">{po.materialCode}</div>
                          </td>
                          <td className="py-2.5 px-3">{po.supplierName}</td>
                          <td className="py-2.5 px-3">{formatDate(po.expectedDeliveryDate)}</td>
                          <td className="py-2.5 px-3">{formatDate(po.actualDeliveryDate)}</td>
                          <td className="py-2.5 px-3">{deliveryStatusBadge(po)}</td>
                          <td className={`py-2.5 px-3 text-right font-medium ${variance.color}`}>
                            {variance.label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Area 3: Supply Chain Delivery Plan ───────────────────────

function SupplyChainDeliveryPlan() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const deliveryQuery = trpc.p2p.delivery.list.useQuery();
  const agreementsQuery = trpc.p2p.frameworkAgreement.list.useQuery();
  const posQuery = trpc.procurement.getPurchaseOrders.useQuery({
    page: 1,
    pageSize: 500,
  });
  const today = todayStr();

  const deliveries = useMemo(() => {
    const items = deliveryQuery.data?.items ?? [];
    const filtered = search
      ? items.filter(
          (d) =>
            (d.registrationCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (d.materialName ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (d.supplierName ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (d.poNumber ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : items;
    return [...filtered].sort((a, b) => {
      const aDate = a.receivedAt ?? a.createdAt ?? "9999-12-31";
      const bDate = b.receivedAt ?? b.createdAt ?? "9999-12-31";
      return bDate.localeCompare(aDate);
    });
  }, [deliveryQuery.data, search]);

  const poMap = useMemo(() => {
    const map = new Map<string, { expectedDeliveryDate: string; status: string }>();
    const pos = posQuery.data?.items ?? [];
    pos.forEach((po) => {
      if (po.poNumber) {
        map.set(po.poNumber, {
          expectedDeliveryDate: po.expectedDeliveryDate,
          status: po.status,
        });
      }
    });
    return map;
  }, [posQuery.data]);

  const stats = useMemo(() => {
    const allDeliveries = deliveryQuery.data?.items ?? [];
    const agreements = agreementsQuery.data?.items ?? [];
    const pending = allDeliveries.filter(
      (d) => d.status === "pending" || d.status === "received" || d.status === "qc_pending"
    ).length;
    const activeAgreements = agreements.filter(
      (a) => a.status === "active"
    ).length;

    let riskCount = 0;
    allDeliveries.forEach((d) => {
      if (d.poNumber && poMap.has(d.poNumber)) {
        const po = poMap.get(d.poNumber)!;
        if (d.receivedAt && po.expectedDeliveryDate) {
          const diff = daysBetween(po.expectedDeliveryDate, d.receivedAt);
          if (diff !== null && diff > 2) riskCount++;
        } else if (!d.receivedAt && po.expectedDeliveryDate && po.expectedDeliveryDate < today) {
          riskCount++;
        }
      }
    });

    return { pending, activeAgreements, riskCount, totalDeliveries: allDeliveries.length };
  }, [deliveryQuery.data, agreementsQuery.data, poMap, today]);

  function getAlignmentInfo(delivery: {
    poNumber: string | null;
    receivedAt: string | null;
    status: string | null;
  }): { icon: typeof CheckCircle2; label: string; color: string } {
    if (!delivery.poNumber || !poMap.has(delivery.poNumber)) {
      return { icon: ArrowRightLeft, label: "未关联PO", color: "text-muted-foreground" };
    }
    const po = poMap.get(delivery.poNumber)!;
    if (delivery.receivedAt && po.expectedDeliveryDate) {
      const diff = daysBetween(po.expectedDeliveryDate, delivery.receivedAt);
      if (diff === null) return { icon: Clock, label: "无法计算", color: "text-muted-foreground" };
      if (diff <= 0) return { icon: CheckCircle2, label: `提前 ${Math.abs(diff)} 天到货`, color: "text-green-600" };
      if (diff <= 2) return { icon: Clock, label: `延迟 ${diff} 天`, color: "text-amber-600" };
      return { icon: AlertTriangle, label: `严重延迟 ${diff} 天`, color: "text-red-600" };
    }
    if (po.expectedDeliveryDate < today) {
      return { icon: AlertTriangle, label: "超期未到货", color: "text-red-600" };
    }
    const daysUntil = daysBetween(today, po.expectedDeliveryDate);
    if (daysUntil !== null && daysUntil <= 3) {
      return { icon: Timer, label: `${daysUntil} 天内到期`, color: "text-amber-600" };
    }
    return { icon: Clock, label: "等待到货", color: "text-muted-foreground" };
  }

  const isLoading = deliveryQuery.isLoading || agreementsQuery.isLoading || posQuery.isLoading;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-green-500" />
            供应链交付计划
            <Badge variant="outline" className="ml-2">{stats.totalDeliveries} 条到货</Badge>
          </CardTitle>
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Package}
                  label="待处理到货"
                  value={stats.pending}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <StatCard
                  icon={FileText}
                  label="框架协议"
                  value={stats.activeAgreements}
                  iconColor="text-indigo-500"
                  iconBg="bg-indigo-500/10"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="交付风险"
                  value={stats.riskCount}
                  iconColor="text-red-500"
                  iconBg="bg-red-500/10"
                />
                <StatCard
                  icon={BarChart3}
                  label="到货总数"
                  value={stats.totalDeliveries}
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索到货单号、物料或供应商..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    deliveryQuery.refetch();
                    agreementsQuery.refetch();
                    toast.success("供应链数据已刷新");
                  }}
                >
                  刷新
                </Button>
              </div>

              <div className="space-y-3">
                {deliveries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">暂无到货登记数据</div>
                )}
                {deliveries.map((delivery) => {
                  const alignment = getAlignmentInfo(delivery as any);
                  const AlignIcon = alignment.icon;
                  const linkedPO = delivery.poNumber ? poMap.get(delivery.poNumber) : null;
                  const hasRisk =
                    alignment.color === "text-red-600" || alignment.color === "text-amber-600";

                  return (
                    <div
                      key={delivery.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        hasRisk ? "border-amber-500/50 bg-amber-500/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              {delivery.registrationCode}
                            </span>
                            <Badge variant={statusVariant(delivery.status ?? "pending")}>
                              {STATUS_LABELS[delivery.status ?? "pending"] ?? delivery.status}
                            </Badge>
                            {delivery.poNumber && (
                              <span className="text-xs text-muted-foreground">
                                PO: {delivery.poNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <h4 className="font-medium">
                              {delivery.materialName ?? "未指定物料"}
                            </h4>
                            {delivery.supplierName && (
                              <span className="text-sm text-muted-foreground">
                                {delivery.supplierName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {delivery.deliveredQuantity && (
                              <span className="flex items-center gap-1">
                                <Package className="w-3.5 h-3.5" />
                                数量: {delivery.deliveredQuantity} {delivery.unit ?? ""}
                              </span>
                            )}
                            {delivery.receivedAt && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                到货: {formatDate(delivery.receivedAt)}
                              </span>
                            )}
                            {linkedPO && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                PO交期: {formatDate(linkedPO.expectedDeliveryDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`flex items-center gap-1.5 ${alignment.color}`}>
                            <AlignIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{alignment.label}</span>
                          </div>
                          {delivery.trackingNumber && (
                            <div className="text-xs text-muted-foreground mt-1">
                              物流: {delivery.trackingNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(agreementsQuery.data?.items ?? []).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    有效框架协议
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {(agreementsQuery.data?.items ?? [])
                      .filter((a) => a.status === "active")
                      .slice(0, 6)
                      .map((agreement) => {
                        const budget = parseFloat(String(agreement.totalBudget ?? "0"));
                        const spent = parseFloat(String(agreement.spentAmount ?? "0"));
                        const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                        const isExpiring =
                          agreement.endDate &&
                          daysBetween(today, String(agreement.endDate)) !== null &&
                          (daysBetween(today, String(agreement.endDate)) ?? 999) <= 30;

                        return (
                          <Card key={agreement.id} className="bg-muted/30">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono">{agreement.agreementCode}</span>
                                <Badge
                                  variant={isExpiring ? "destructive" : "default"}
                                  className="text-xs"
                                >
                                  {isExpiring ? "即将到期" : STATUS_LABELS[agreement.status ?? "draft"] ?? agreement.status}
                                </Badge>
                              </div>
                              <div className="font-medium text-sm truncate">
                                {agreement.title ?? agreement.supplierName ?? "未命名协议"}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(String(agreement.startDate))} → {formatDate(String(agreement.endDate))}
                              </div>
                              {budget > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>预算使用</span>
                                    <span>{utilization}%</span>
                                  </div>
                                  <Progress value={utilization} className="h-1.5" />
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {`¥${(spent / 10000).toFixed(1)}万 / ¥${(budget / 10000).toFixed(1)}万`}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function SupplyChainPlanning() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="供应链计划"
        description="项目→生产→供应链 三级计划联动与风险预警"
      />
      <CompanyProjectPlan />
      <ProductionDeliveryPlan />
      <SupplyChainDeliveryPlan />
    </div>
  );
}
