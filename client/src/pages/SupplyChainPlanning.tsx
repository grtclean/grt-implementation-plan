/**
 * Supply Chain Planning Page
 * 供应链计划 — 项目→生产→供应链 三级计划联动与风险预警
 *
 * Area 1: Company Project Plan (公司级项目计划)
 * Area 2: Production Delivery Plan (生产交付计划)
 * Area 3: Supply Chain Delivery Plan (供应链交付计划)
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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

function useStatusLabels() {
  const { t } = useLanguage();
  return {
    draft: t("supply.planning.statusDraft"),
    active: t("supply.planning.statusActive"),
    on_hold: t("supply.planning.statusOnHold"),
    completed: t("supply.planning.statusCompleted"),
    cancelled: t("supply.planning.statusCancelled"),
    sent: t("supply.planning.statusSent"),
    confirmed: t("supply.planning.statusConfirmed"),
    partially_received: t("supply.planning.statusPartiallyReceived"),
    received: t("supply.planning.statusReceived"),
    pending: t("supply.planning.statusPending"),
    qc_pending: t("supply.planning.statusQCPending"),
    qc_passed: t("supply.planning.statusQCPassed"),
    qc_failed: t("supply.planning.statusQCFailed"),
    warehouse_confirmed: t("supply.planning.statusWarehouseConfirmed"),
    rejected: t("supply.planning.statusRejected"),
    signed: t("supply.planning.statusSigned"),
    expired: t("supply.planning.statusExpired"),
    terminated: t("supply.planning.statusTerminated"),
  } as Record<string, string>;
}

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
  const { t, tpl } = useLanguage();
  const STATUS_LABELS = useStatusLabels();
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
            {t("supply.planning.companyProjectPlan")}
            <Badge variant="outline" className="ml-2">{stats.total} {t("supply.planning.projectsUnit")}</Badge>
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
                  label={t("supply.planning.totalProjects")}
                  value={stats.total}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <StatCard
                  icon={Target}
                  label={t("supply.planning.statusActive")}
                  value={stats.active}
                  iconColor="text-green-500"
                  iconBg="bg-green-500/10"
                />
                <StatCard
                  icon={AlertTriangle}
                  label={t("supply.planning.overdueRisk")}
                  value={stats.atRisk}
                  iconColor="text-red-500"
                  iconBg="bg-red-500/10"
                />
                <StatCard
                  icon={TrendingUp}
                  label={t("supply.planning.completionRate")}
                  value={`${stats.completionRate}%`}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("supply.planning.searchProjectName")}
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
                    toast.success(t("supply.planning.projectDataRefreshed"));
                  }}
                >
                  {t("supply.planning.refresh")}
                </Button>
              </div>

              <div className="space-y-3">
                {projects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">{t("supply.planning.noProjectData")}</div>
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
                                {t("supply.planning.overdue")}
                              </Badge>
                            )}
                            {project.priority === "critical" && (
                              <Badge variant="destructive" className="text-xs">{t("supply.planning.urgent")}</Badge>
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
                                {tpl("supply.planning.days", { count: totalDays })}
                              </span>
                            )}
                            {project.currentPhase && (
                              <span className="flex items-center gap-1">
                                <CircleDot className="w-3.5 h-3.5" />
                                {t("supply.planning.phase")}: {project.currentPhase}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-32 text-right shrink-0">
                          <div className="text-sm font-medium mb-1">{tpl("supply.planning.completed", { percent })}</div>
                          <Progress value={percent} className="h-2" />
                          {timeProgress > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {tpl("supply.planning.timeProgress", { percent: timeProgress })}
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
  const { t, tpl } = useLanguage();
  const STATUS_LABELS = useStatusLabels();
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
      if (diff <= 0) return { days: diff, label: tpl("supply.planning.earlyDays", { count: Math.abs(diff) }), color: "text-green-600" };
      if (diff <= 3) return { days: diff, label: tpl("supply.planning.delayedDays", { count: diff }), color: "text-amber-600" };
      return { days: diff, label: tpl("supply.planning.delayedDays", { count: diff }), color: "text-red-600" };
    }
    if (po.expectedDeliveryDate < today) {
      const diff = daysBetween(po.expectedDeliveryDate, today);
      if (diff !== null && diff > 0)
        return { days: diff, label: tpl("supply.planning.overdueDays", { count: diff }), color: "text-red-600" };
    }
    const daysUntil = daysBetween(today, po.expectedDeliveryDate);
    if (daysUntil !== null && daysUntil <= 3 && daysUntil >= 0)
      return { days: daysUntil, label: tpl("supply.planning.dueSoon", { count: daysUntil }), color: "text-amber-600" };
    return { days: null, label: t("supply.planning.pendingDelivery"), color: "text-muted-foreground" };
  }

  function deliveryStatusBadge(po: {
    expectedDeliveryDate: string;
    actualDeliveryDate: string | null;
    status: string;
  }) {
    if (po.status === "received" || po.status === "partially_received") {
      return <Badge variant="default">{t("supply.planning.received")}</Badge>;
    }
    if (po.status === "cancelled") {
      return <Badge variant="destructive">{t("supply.planning.cancelled")}</Badge>;
    }
    if (po.actualDeliveryDate) {
      const diff = daysBetween(po.expectedDeliveryDate, po.actualDeliveryDate);
      if (diff !== null && diff <= 0) return <Badge className="bg-green-600">{t("supply.planning.onTime")}</Badge>;
      return <Badge variant="destructive">{t("supply.planning.delayed")}</Badge>;
    }
    if (po.expectedDeliveryDate < today) {
      return <Badge variant="destructive">{t("supply.planning.overdueNotDelivered")}</Badge>;
    }
    const daysUntil = daysBetween(today, po.expectedDeliveryDate);
    if (daysUntil !== null && daysUntil <= 3) {
      return <Badge className="bg-amber-500 text-white">{t("supply.planning.expiringLabel")}</Badge>;
    }
    return <Badge variant="outline">{t("supply.planning.pendingDelivery")}</Badge>;
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
            {t("supply.planning.productionDeliveryPlan")}
            <Badge variant="outline" className="ml-2">{tpl("supply.planning.orderCount", { count: stats.total })}</Badge>
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
                  label={t("supply.planning.orderTotal")}
                  value={stats.total}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <StatCard
                  icon={CheckCircle2}
                  label={t("supply.planning.onTimeRate")}
                  value={`${stats.onTimeRate}%`}
                  iconColor="text-green-500"
                  iconBg="bg-green-500/10"
                />
                <StatCard
                  icon={AlertTriangle}
                  label={t("supply.planning.delayedOrders")}
                  value={stats.delayed}
                  iconColor="text-red-500"
                  iconBg="bg-red-500/10"
                />
                <StatCard
                  icon={CalendarDays}
                  label={t("supply.planning.monthlyDelivery")}
                  value={stats.thisMonth}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("supply.planning.searchPoMaterialSupplier")}
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
                    toast.success(t("supply.planning.purchaseOrderRefreshed"));
                  }}
                >
                  {t("supply.planning.refresh")}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-3 font-medium">{t("supply.planning.thPoNumber")}</th>
                      <th className="py-2 px-3 font-medium">{t("supply.planning.thMaterial")}</th>
                      <th className="py-2 px-3 font-medium">{t("supply.planning.thSupplier")}</th>
                      <th className="py-2 px-3 font-medium">{t("supply.planning.thPlannedDelivery")}</th>
                      <th className="py-2 px-3 font-medium">{t("supply.planning.thActualDelivery")}</th>
                      <th className="py-2 px-3 font-medium">{t("supply.planning.thStatus")}</th>
                      <th className="py-2 px-3 font-medium text-right">{t("supply.planning.thVariance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPOs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("supply.planning.noPurchaseOrderData")}
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
  const { t, tpl } = useLanguage();
  const STATUS_LABELS = useStatusLabels();
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
      return { icon: ArrowRightLeft, label: t("supply.planning.notLinkedPo"), color: "text-muted-foreground" };
    }
    const po = poMap.get(delivery.poNumber)!;
    if (delivery.receivedAt && po.expectedDeliveryDate) {
      const diff = daysBetween(po.expectedDeliveryDate, delivery.receivedAt);
      if (diff === null) return { icon: Clock, label: t("supply.planning.cannotCalculate"), color: "text-muted-foreground" };
      if (diff <= 0) return { icon: CheckCircle2, label: tpl("supply.planning.earlyDeliveryDays", { count: Math.abs(diff) }), color: "text-green-600" };
      if (diff <= 2) return { icon: Clock, label: tpl("supply.planning.delayedDays", { count: diff }), color: "text-amber-600" };
      return { icon: AlertTriangle, label: tpl("supply.planning.severeDelayDays", { count: diff }), color: "text-red-600" };
    }
    if (po.expectedDeliveryDate < today) {
      return { icon: AlertTriangle, label: t("supply.planning.overdueNotArrived"), color: "text-red-600" };
    }
    const daysUntil = daysBetween(today, po.expectedDeliveryDate);
    if (daysUntil !== null && daysUntil <= 3) {
      return { icon: Timer, label: tpl("supply.planning.dueSoonDays", { count: daysUntil }), color: "text-amber-600" };
    }
    return { icon: Clock, label: t("supply.planning.waitingForDelivery"), color: "text-muted-foreground" };
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
            {t("supply.planning.supplyChainDeliveryPlan")}
            <Badge variant="outline" className="ml-2">{tpl("supply.planning.deliveryCount", { count: stats.totalDeliveries })}</Badge>
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
                  label={t("supply.planning.pendingDeliveries")}
                  value={stats.pending}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <StatCard
                  icon={FileText}
                  label={t("supply.planning.frameworkAgreements")}
                  value={stats.activeAgreements}
                  iconColor="text-indigo-500"
                  iconBg="bg-indigo-500/10"
                />
                <StatCard
                  icon={AlertTriangle}
                  label={t("supply.planning.deliveryRisk")}
                  value={stats.riskCount}
                  iconColor="text-red-500"
                  iconBg="bg-red-500/10"
                />
                <StatCard
                  icon={BarChart3}
                  label={t("supply.planning.totalDeliveryCount")}
                  value={stats.totalDeliveries}
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("supply.planning.searchDelivery")}
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
                    toast.success(t("supply.planning.supplyChainRefreshed"));
                  }}
                >
                  {t("supply.planning.refresh")}
                </Button>
              </div>

              <div className="space-y-3">
                {deliveries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">{t("supply.planning.noDeliveryData")}</div>
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
                              {delivery.materialName ?? t("supply.planning.unspecifiedMaterial")}
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
                                {t("supply.planning.quantityLabel")}: {delivery.deliveredQuantity} {delivery.unit ?? ""}
                              </span>
                            )}
                            {delivery.receivedAt && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {t("supply.planning.deliveredAt")}: {formatDate(delivery.receivedAt)}
                              </span>
                            )}
                            {linkedPO && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {t("supply.planning.poDeliveryDate")}: {formatDate(linkedPO.expectedDeliveryDate)}
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
                              {t("supply.planning.logistics")}: {delivery.trackingNumber}
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
                    {t("supply.planning.validFrameworkAgreements")}
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
                                  {isExpiring ? t("supply.planning.expiringBadge") : STATUS_LABELS[agreement.status ?? "draft"] ?? agreement.status}
                                </Badge>
                              </div>
                              <div className="font-medium text-sm truncate">
                                {agreement.title ?? agreement.supplierName ?? t("supply.planning.unnamedAgreement")}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(String(agreement.startDate))} → {formatDate(String(agreement.endDate))}
                              </div>
                              {budget > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>{t("supply.planning.budgetUsage")}</span>
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
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title={t("supply.planning.title")}
        description={t("supply.planning.fullDesc")}
      />
      <CompanyProjectPlan />
      <ProductionDeliveryPlan />
      <SupplyChainDeliveryPlan />
    </div>
  );
}
