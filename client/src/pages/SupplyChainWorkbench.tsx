/**
 * Supply Chain Traceability Workbench
 * IATF 16949 / VDA 6.3 Compliance
 *
 * 8 tabs: Dashboard | Labels | IQC | BOM Scan | Labor | Complaints | Maintenance | Scrap
 * Wired to supplyChain.* tRPC router
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useZodForm, schemas, z } from "@/lib/form-validation";
import {
  Truck, LayoutDashboard, Tag, ClipboardCheck, ScanBarcode,
  Clock, MessageSquare, Wrench, Trash2, Plus, Search,
  CheckCircle2, XCircle, AlertTriangle, Shield, TrendingUp,
  BarChart3, Package, Gauge, Boxes, Factory, Users,
  ArrowRight, ChevronRight, Ban, Timer,
} from "lucide-react";
import QueryErrorBanner from "@/components/QueryErrorBanner";

// ─── Zod Schemas ─────────────────────────────────────────────────
const labelCreateSchema = z.object({
  supplierSerialNumber: schemas.requiredString("Supplier serial number is required / 供应商序列号必填"),
  materialCode: schemas.materialCode("Material code is required / 物料编码必填"),
  poNumber: schemas.optionalString(),
  projectNumber: schemas.optionalString(),
  supplierName: schemas.optionalString(),
  materialName: schemas.optionalString(),
  quantity: z.string().optional(),
  batchNumber: schemas.optionalString(),
});
type LabelCreateValues = z.infer<typeof labelCreateSchema>;

const inspectionCreateSchema = z.object({
  materialCode: schemas.materialCode("Material code is required / 物料编码必填"),
  materialName: schemas.optionalString(),
  supplierName: schemas.optionalString(),
  poNumber: schemas.optionalString(),
  hasTestReport: z.boolean().default(false),
  inspectedQuantity: z.string().optional(),
});
type InspectionCreateValues = z.infer<typeof inspectionCreateSchema>;

const bomScanSchema = z.object({
  projectNumber: schemas.requiredString("Project number is required / 项目编号必填"),
  processCode: z.string().default("T1"),
  barcode: schemas.requiredString("Barcode is required / 条码必填"),
});
type BomScanValues = z.infer<typeof bomScanSchema>;

const complaintCreateSchema = z.object({
  customerName: schemas.optionalString(),
  projectNumber: schemas.optionalString(),
  severity: schemas.severity(),
  description: schemas.requiredString("Description is required / 问题描述必填"),
});
type ComplaintCreateValues = z.infer<typeof complaintCreateSchema>;

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── Tab 1: Dashboard Overview ────────────────────────────────
function DashboardTab() {
  const { t } = useLanguage();
  const statsQuery = trpc.supplyChain.dashboardStats.useQuery();
  const stats = statsQuery.data;

  if (statsQuery.error) return <QueryErrorBanner error={statsQuery.error} onRetry={() => statsQuery.refetch()} />;
  if (!stats) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardCheck} label={t("supply.chain.iqcPassRate")} value={`${stats.iqc?.passRate ?? 0}%`} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={ScanBarcode} label={t("supply.chain.bomMatchRate")} value={`${stats.bomScan?.matchRate ?? 0}%`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Trash2} label={t("supply.chain.totalScrapCost")} value={`¥${((stats.scrap?.totalCost ?? 0) / 10000).toFixed(1)}万`} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Ban} label={t("supply.chain.blacklistedSuppliers")} value={stats.penalties?.blacklisted ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("supply.chain.iqcInspection")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.iqc?.total ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("supply.chain.pendingInspection")}: {stats.iqc?.pending ?? 0} | {t("supply.chain.passRate")}: {stats.iqc?.passRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("supply.chain.customerQualityFeedback")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.complaints?.open ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("supply.chain.unclosed")} | {t("supply.chain.critical")}: {stats.complaints?.critical ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("supply.chain.sparePartsWarning")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.spareParts?.lowStock ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("supply.chain.lowStockParts")} | {t("supply.chain.activePenalties")}: {stats.penalties?.active ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 2: Supplier Labels ───────────────────────────────────
function LabelsTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const form = useZodForm({
    schema: labelCreateSchema,
    defaultValues: { supplierSerialNumber: "", materialCode: "", poNumber: "", projectNumber: "", supplierName: "", materialName: "", quantity: "", batchNumber: "" },
  });

  const labelsQuery = trpc.supplyChain.label.list.useQuery({});
  const labels = labelsQuery.data?.items ?? [];
  const isLoading = labelsQuery.isLoading;
  const refetch = labelsQuery.refetch;

  const createLabelMutation = trpc.supplyChain.label.create.useMutation();
  const validateLabelMutation = trpc.supplyChain.label.validate.useMutation();

  const filtered = labels.filter((l: any) => !search || l.supplierSerialNumber?.includes(search) || l.materialCode?.includes(search));

  const handleCreate = form.handleSubmit(async (data) => {
    try {
      await createLabelMutation.mutateAsync({
        supplierSerialNumber: data.supplierSerialNumber,
        materialCode: data.materialCode,
        poNumber: data.poNumber || undefined,
        projectNumber: data.projectNumber || undefined,
        supplierName: data.supplierName || undefined,
        materialName: data.materialName || undefined,
        quantity: data.quantity || undefined,
        batchNumber: data.batchNumber || undefined,
      });
      toast.success(t("supply.chain.labelCreated"));
      setShowCreate(false);
      form.reset();
      refetch();
    } catch (e: any) { toast.error(e.message || t("supply.p2p.createFailed")); }
  });

  const handleValidate = async (id: number) => {
    try {
      const res = await validateLabelMutation.mutateAsync({ id });
      toast.success(res?.isValidated ? t("supply.chain.verifyPassed") : t("supply.chain.verifyFailed"));
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("supply.chain.searchSerialMaterial")} className="pl-9 w-full sm:w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />{t("supply.chain.newLabel")}</Button>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {filtered.map((l: any) => (
            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border hover:bg-accent/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Tag className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{l.supplierSerialNumber}</span>
                    <Badge variant="outline">{l.materialCode}</Badge>
                    {l.poNumber && <span className="text-xs text-muted-foreground">PO: {l.poNumber}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{l.supplierName || "—"} | {l.materialName || "—"} | {t("supply.p2p.batchNumber")}: {l.batchNumber || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-8 sm:ml-0">
                <Badge className={l.isValidated ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                  {l.isValidated ? <><CheckCircle2 className="h-3 w-3 mr-1" />{t("supply.chain.verified")}</> : t("supply.chain.pendingVerification")}
                </Badge>
                {!l.isValidated && <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => handleValidate(l.id)}>{t("supply.chain.verify")}</Button>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">{t("supply.chain.noLabelData")}</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("supply.chain.newLabelDialog")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <Label>{t("supply.chain.supplierSerialNumber")} *</Label>
              <Input {...form.register("supplierSerialNumber")} />
              {form.formState.errors.supplierSerialNumber && <p className="text-destructive text-sm mt-1">{form.formState.errors.supplierSerialNumber.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("supply.p2p.materialCode")} *</Label>
                <Input {...form.register("materialCode")} />
                {form.formState.errors.materialCode && <p className="text-destructive text-sm mt-1">{form.formState.errors.materialCode.message}</p>}
              </div>
              <div><Label>{t("supply.p2p.materialName")}</Label><Input {...form.register("materialName")} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>{t("supply.p2p.poNumber")}</Label><Input {...form.register("poNumber")} /></div>
              <div><Label>{t("supply.chain.projectNumber")}</Label><Input {...form.register("projectNumber")} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>{t("supply.p2p.supplier")}</Label><Input {...form.register("supplierName")} /></div>
              <div><Label>{t("supply.p2p.batchNumber")}</Label><Input {...form.register("batchNumber")} /></div>
            </div>
            <div><Label>{t("supply.planning.quantityLabel")}</Label><Input type="number" {...form.register("quantity")} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("supply.p2p.cancel")}</Button>
              <Button type="submit">{t("supply.p2p.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Incoming Inspection (IQC) ─────────────────────────
function InspectionTab() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);

  const form = useZodForm({
    schema: inspectionCreateSchema,
    defaultValues: { materialCode: "", materialName: "", supplierName: "", poNumber: "", hasTestReport: false, inspectedQuantity: "" },
  });

  const inspectionsQuery = trpc.supplyChain.inspection.list.useQuery({});
  const inspections = inspectionsQuery.data?.items ?? [];
  const isLoading = inspectionsQuery.isLoading;
  const refetch = inspectionsQuery.refetch;

  const createInspectionMutation = trpc.supplyChain.inspection.create.useMutation();
  const rejectReceiptMutation = trpc.supplyChain.inspection.rejectReceipt.useMutation();

  const resultColor: Record<string, string> = {
    PASS: "bg-green-100 text-green-700",
    FAIL: "bg-red-100 text-red-700",
    CONDITIONAL: "bg-amber-100 text-amber-700",
    PENDING: "bg-gray-100 text-gray-700",
  };

  const resultLabel: Record<string, string> = {
    PASS: t("supply.chain.passLabel"),
    FAIL: t("supply.chain.failLabel"),
    CONDITIONAL: t("supply.chain.conditionalLabel"),
    PENDING: t("supply.chain.pendingLabel"),
  };

  const handleCreate = form.handleSubmit(async (data) => {
    try {
      await createInspectionMutation.mutateAsync({
        materialCode: data.materialCode,
        materialName: data.materialName || undefined,
        supplierName: data.supplierName || undefined,
        poNumber: data.poNumber || undefined,
        hasTestReport: data.hasTestReport,
        inspectedQuantity: data.inspectedQuantity || undefined,
      });
      toast.success(t("supply.chain.inspectionCreated"));
      setShowCreate(false);
      form.reset();
      refetch();
    } catch (e: any) { toast.error(e.message || t("supply.p2p.createFailed")); }
  });

  const handleAutoReject = async (id: number) => {
    try {
      const res = await rejectReceiptMutation.mutateAsync({ id }) as any;
      if (res.autoRejected) {
        toast.error(`${t("supply.chain.autoRejected")}: ${res.reasons.join("; ")}`);
      } else {
        toast.success(res.message);
      }
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{t("supply.chain.totalLabel")}: {inspections.length}</Badge>
          <Badge className="bg-green-100 text-green-700">{t("supply.chain.passed")}: {inspections.filter((i: any) => i.inspectionResult === "PASS").length}</Badge>
          <Badge className="bg-red-100 text-red-700">{t("supply.chain.failed")}: {inspections.filter((i: any) => i.inspectionResult === "FAIL").length}</Badge>
        </div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />{t("supply.chain.newInspection")}</Button>
      </div>
      {isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {inspections.map((i: any) => (
            <div key={i.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border hover:bg-accent/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ClipboardCheck className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{i.inspectionCode}</span>
                    <Badge variant="outline">{i.materialCode}</Badge>
                    {!i.hasTestReport && <Badge variant="destructive" className="text-xs">{t("supply.chain.missingReport")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{i.supplierName || "—"} | PO: {i.poNumber || "—"} | {i.createdAt?.split("T")[0]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-8 sm:ml-0">
                <Badge className={resultColor[i.inspectionResult] || ""}>{resultLabel[i.inspectionResult] || i.inspectionResult}</Badge>
                {i.inspectionResult === "PENDING" && (
                  <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => handleAutoReject(i.id)}>
                    <XCircle className="h-3 w-3 mr-1" />{t("supply.chain.autoCheck")}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {inspections.length === 0 && <div className="text-center py-8 text-muted-foreground">{t("supply.chain.noInspectionData")}</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("supply.chain.newInspectionDialog")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("supply.p2p.materialCode")} *</Label>
                <Input {...form.register("materialCode")} />
                {form.formState.errors.materialCode && <p className="text-destructive text-sm mt-1">{form.formState.errors.materialCode.message}</p>}
              </div>
              <div><Label>{t("supply.p2p.materialName")}</Label><Input {...form.register("materialName")} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>{t("supply.p2p.supplier")}</Label><Input {...form.register("supplierName")} /></div>
              <div><Label>{t("supply.p2p.poNumber")}</Label><Input {...form.register("poNumber")} /></div>
            </div>
            <div><Label>{t("supply.chain.inspectedQuantity")}</Label><Input type="number" {...form.register("inspectedQuantity")} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hasReport" checked={form.watch("hasTestReport")} onChange={e => form.setValue("hasTestReport", e.target.checked)} />
              <Label htmlFor="hasReport">{t("supply.chain.hasTestReport")}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("supply.p2p.cancel")}</Button>
              <Button type="submit">{t("supply.p2p.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: Assembly BOM Scan ─────────────────────────────────
function BomScanTab() {
  const { t } = useLanguage();

  const scanForm = useZodForm({
    schema: bomScanSchema,
    defaultValues: { projectNumber: "", processCode: "T1", barcode: "" },
  });

  const projectNumber = scanForm.watch("projectNumber");
  const processCode = scanForm.watch("processCode");

  const scansQuery = trpc.supplyChain.bomScan.list.useQuery({ projectNumber: projectNumber || undefined, processCode });
  const scans = scansQuery.data?.items ?? [];
  const isLoading = scansQuery.isLoading;
  const refetch = scansQuery.refetch;

  const scanAndVerifyMutation = trpc.supplyChain.bomScan.scanAndVerify.useMutation();

  const matchColor: Record<string, string> = {
    MATCH: "bg-green-100 text-green-700",
    MISMATCH: "bg-red-100 text-red-700",
    SUBSTITUTE: "bg-amber-100 text-amber-700",
    NOT_FOUND: "bg-gray-100 text-gray-700",
  };

  const handleScan = scanForm.handleSubmit(async (data) => {
    try {
      const res = await scanAndVerifyMutation.mutateAsync({
        projectNumber: data.projectNumber,
        processCode: data.processCode,
        scannedBarcode: data.barcode,
      });
      if (res.bomMatchResult === "MATCH") {
        toast.success(`${t("supply.chain.bomMatch")}: ${res.resolvedMaterialCode}`);
      } else if (res.bomMatchResult === "MISMATCH") {
        toast.error(`${t("supply.chain.bomMismatch")} ${res.resolvedMaterialCode}, ${res.expectedMaterialCode || "—"}`);
      } else {
        toast.info(`${t("supply.chain.scanResult")}: ${res.bomMatchResult}`);
      }
      scanForm.setValue("barcode", "");
      refetch();
    } catch (e: any) { toast.error(e.message || t("supply.chain.scanFailed")); }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleScan} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Label>{t("supply.chain.projectNumber")}</Label>
              <Input placeholder="PRJ-2026-XXX" {...scanForm.register("projectNumber")} />
              {scanForm.formState.errors.projectNumber && <p className="text-destructive text-sm mt-1">{scanForm.formState.errors.projectNumber.message}</p>}
            </div>
            <div className="w-full sm:w-32">
              <Label>{t("supply.chain.processCode")}</Label>
              <Select value={scanForm.watch("processCode")} onValueChange={(v) => scanForm.setValue("processCode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 15 }, (_, i) => `T${i + 1}`).map(tc => (
                  <SelectItem key={tc} value={tc}>{tc}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>{t("supply.chain.scanBarcode")}</Label>
              <Input placeholder={t("supply.chain.scanBarcode") + "..."} {...scanForm.register("barcode")} />
              {scanForm.formState.errors.barcode && <p className="text-destructive text-sm mt-1">{scanForm.formState.errors.barcode.message}</p>}
            </div>
            <Button type="submit" className="min-h-[44px]"><ScanBarcode className="h-4 w-4 mr-1" />{t("supply.chain.scanAndVerify")}</Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {scans.slice(0, 20).map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border">
              <ScanBarcode className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{s.scannedBarcode}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{s.resolvedMaterialCode || t("supply.chain.unrecognized")}</span>
                  <Badge variant="secondary" className="text-xs">{s.processCode}</Badge>
                </div>
              </div>
              <Badge className={matchColor[s.bomMatchResult] || ""}>
                {s.bomMatchResult === "MATCH" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {s.bomMatchResult === "MISMATCH" && <XCircle className="h-3 w-3 mr-1" />}
                {s.bomMatchResult}
              </Badge>
              {s.deviationConfirmed && <Badge className="bg-purple-100 text-purple-700">{t("supply.chain.deviationConfirmed")}</Badge>}
            </div>
          ))}
          {scans.length === 0 && <div className="text-center py-8 text-muted-foreground">{t("supply.chain.noScanRecords")}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Labor Confirmations ───────────────────────────────
function LaborTab() {
  const { t } = useLanguage();
  const recordsQuery = trpc.supplyChain.labor.list.useQuery({});
  const records = recordsQuery.data?.items ?? [];
  const isLoading = recordsQuery.isLoading;

  const statsQuery = trpc.supplyChain.labor.stats.useQuery();
  const stats = statsQuery.data ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t("supply.chain.totalRecords")} value={stats?.total ?? 0} />
        <StatCard icon={Timer} label={t("supply.chain.inProgress")} value={stats?.active ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label={t("supply.chain.completedLabel")} value={stats?.completed ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Gauge} label={t("supply.chain.avgEfficiency")} value={`${stats?.avgEfficiency ?? 0}%`} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
      </div>

      {isLoading ? <LoadingSkeleton rows={5} /> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">{t("supply.chain.thProject")}</th><th className="p-3">{t("supply.chain.thProcess")}</th><th className="p-3">{t("supply.chain.thWorker")}</th>
                  <th className="p-3">{t("supply.chain.thClockIn")}</th><th className="p-3">{t("supply.chain.thClockOut")}</th><th className="p-3 text-right">{t("supply.chain.thWorkMinutes")}</th>
                  <th className="p-3 text-right">{t("supply.chain.thEfficiency")}</th><th className="p-3">{t("supply.chain.thQuality")}</th>
                </tr></thead>
                <tbody>
                  {records.slice(0, 20).map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-accent/30">
                      <td className="p-3 font-mono text-xs">{r.projectNumber}</td>
                      <td className="p-3"><Badge variant="secondary">{r.processCode}</Badge></td>
                      <td className="p-3">{r.workerName || `#${r.workerId}`}</td>
                      <td className="p-3 text-xs">{r.clockInTime?.split("T")[1]?.slice(0, 5) || "—"}</td>
                      <td className="p-3 text-xs">{r.clockOutTime?.split("T")[1]?.slice(0, 5) || <Badge className="bg-blue-100 text-blue-700">{t("supply.chain.inProgress")}</Badge>}</td>
                      <td className="p-3 text-right">{r.netWorkMinutes ?? "—"}</td>
                      <td className="p-3 text-right">{r.efficiencyPercent ? `${Number(r.efficiencyPercent).toFixed(0)}%` : "—"}</td>
                      <td className="p-3">
                        {r.qualityResult && <Badge className={r.qualityResult === "PASS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.qualityResult}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <div className="text-center py-8 text-muted-foreground">{t("supply.chain.noLaborRecords")}</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 6: Customer Complaints ───────────────────────────────
function ComplaintsTab() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);

  const form = useZodForm({
    schema: complaintCreateSchema,
    defaultValues: { customerName: "", projectNumber: "", severity: "medium", description: "" },
  });

  const complaintsQuery = trpc.supplyChain.complaint.list.useQuery({});
  const complaints = complaintsQuery.data?.items ?? [];
  const isLoading = complaintsQuery.isLoading;
  const refetch = complaintsQuery.refetch;

  const createComplaintMutation = trpc.supplyChain.complaint.create.useMutation();

  const severityColor: Record<string, string> = {
    low: "bg-gray-100 text-gray-700", medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
  };
  const severityLabel: Record<string, string> = {
    low: t("supply.chain.severityLow"),
    medium: t("supply.chain.severityMedium"),
    high: t("supply.chain.severityHigh"),
    critical: t("supply.chain.severityCritical"),
  };
  const statusLabel: Record<string, string> = {
    open: t("supply.chain.statusOpen"),
    investigating: t("supply.chain.statusInvestigating"),
    resolved: t("supply.chain.statusResolved"),
    closed: t("supply.chain.statusClosed"),
  };

  const handleCreate = form.handleSubmit(async (data) => {
    try {
      await createComplaintMutation.mutateAsync({
        customerName: data.customerName || undefined,
        projectNumber: data.projectNumber || undefined,
        severity: data.severity as "high" | "medium" | "low" | "critical",
        description: data.description,
      });
      toast.success(t("supply.chain.complaintRecorded"));
      setShowCreate(false);
      form.reset();
      refetch();
    } catch (e: any) { toast.error(e.message || t("supply.p2p.createFailed")); }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{t("supply.chain.totalLabel")}: {complaints.length}</Badge>
          <Badge className="bg-red-100 text-red-700">{t("supply.chain.severityCritical")}: {complaints.filter((c: any) => c.severity === "critical").length}</Badge>
        </div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />{t("supply.chain.newFeedback")}</Button>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {complaints.map((c: any) => (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border hover:bg-accent/50">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <MessageSquare className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{c.complaintCode}</span>
                    <Badge className={severityColor[c.severity] || ""}>{severityLabel[c.severity] || c.severity}</Badge>
                    {c.eightDReportId && <Badge variant="secondary">{t("supply.chain.linked8D")}</Badge>}
                    {c.designChangeRequired && <Badge variant="secondary">{t("supply.chain.designChangeNeeded")}</Badge>}
                  </div>
                  <p className="text-sm mt-0.5 line-clamp-1">{c.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.customerName || "—"} | {c.projectNumber || "—"} | {c.createdAt?.split("T")[0]}</p>
                </div>
              </div>
              <Badge variant="outline" className="ml-8 sm:ml-0 shrink-0">{statusLabel[c.status] || c.status}</Badge>
            </div>
          ))}
          {complaints.length === 0 && <div className="text-center py-8 text-muted-foreground">{t("supply.chain.noComplaintData")}</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("supply.chain.newComplaintDialog")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>{t("supply.chain.customerName")}</Label><Input {...form.register("customerName")} /></div>
              <div><Label>{t("supply.chain.projectNumber")}</Label><Input {...form.register("projectNumber")} /></div>
            </div>
            <div><Label>{t("supply.chain.severityLevel")}</Label>
              <Select value={form.watch("severity")} onValueChange={v => form.setValue("severity", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("supply.chain.severityLow")}</SelectItem><SelectItem value="medium">{t("supply.chain.severityMedium")}</SelectItem>
                  <SelectItem value="high">{t("supply.chain.severityHigh")}</SelectItem><SelectItem value="critical">{t("supply.chain.severityCritical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("supply.chain.problemDescription")} *</Label>
              <Textarea rows={3} {...form.register("description")} />
              {form.formState.errors.description && <p className="text-destructive text-sm mt-1">{form.formState.errors.description.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("supply.p2p.cancel")}</Button>
              <Button type="submit">{t("supply.p2p.submit")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 7: Maintenance & Spare Parts ─────────────────────────
function MaintenanceTab() {
  const { t } = useLanguage();
  const maintenanceQuery = trpc.supplyChain.maintenance.list.useQuery({});
  const records = maintenanceQuery.data?.items ?? [];
  const isLoading = maintenanceQuery.isLoading;

  const spareStatsQuery = trpc.supplyChain.sparePart.stats.useQuery();
  const spareStats = spareStatsQuery.data ?? null;

  const lowStockQuery = trpc.supplyChain.sparePart.lowStockAlerts.useQuery();
  const lowStockAlerts = lowStockQuery.data ?? [];

  const typeLabel: Record<string, string> = {
    preventive: t("supply.chain.typePreventive"),
    corrective: t("supply.chain.typeCorrective"),
    predictive: t("supply.chain.typePredictive"),
    emergency: t("supply.chain.typeEmergency"),
  };
  const typeColor: Record<string, string> = { preventive: "bg-blue-100 text-blue-700", corrective: "bg-orange-100 text-orange-700", predictive: "bg-purple-100 text-purple-700", emergency: "bg-red-100 text-red-700" };
  const maintStatusLabel: Record<string, string> = {
    scheduled: t("supply.chain.statusScheduled"),
    in_progress: t("supply.chain.statusInProgressMaint"),
    completed: t("supply.chain.statusCompletedMaint"),
    cancelled: t("supply.chain.statusCancelledMaint"),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wrench} label={t("supply.chain.maintenanceRecords")} value={records.length} />
        <StatCard icon={Package} label={t("supply.chain.partTypes")} value={spareStats?.total ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label={t("supply.chain.lowStockPartsLabel")} value={spareStats?.lowStock ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Shield} label={t("supply.chain.criticalPartsLabel")} value={spareStats?.critical ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("supply.chain.maintenanceRecordsList")}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <LoadingSkeleton rows={3} /> : (
              <div className="space-y-2">
                {records.slice(0, 10).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded border">
                    <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{r.maintenanceCode}</span>
                        <Badge className={typeColor[r.maintenanceType] || ""}>{typeLabel[r.maintenanceType] || r.maintenanceType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.equipmentName || `#${r.equipmentId}`} | {r.scheduledDate || "—"}</p>
                    </div>
                    <Badge variant="outline">{maintStatusLabel[r.status] || r.status}</Badge>
                  </div>
                ))}
                {records.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">{t("supply.chain.noMaintenanceRecords")}</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />{t("supply.chain.sparePartLowStockWarning")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockAlerts.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded border border-orange-200/50 bg-orange-50/30">
                  <Package className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.materialName}</p>
                    <p className="text-xs text-muted-foreground">{p.materialCode} | {p.currentStock} / {p.reorderPoint}</p>
                  </div>
                  {p.autoReorderEnabled && <Badge className="bg-blue-100 text-blue-700 text-xs">{t("supply.chain.autoReorder")}</Badge>}
                </div>
              ))}
              {lowStockAlerts.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">{t("supply.chain.noLowStockWarning")}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 8: Scrap & Supplier Penalties ────────────────────────
function ScrapPenaltyTab() {
  const { t } = useLanguage();
  const scrapsQuery = trpc.supplyChain.scrap.list.useQuery({});
  const scraps = scrapsQuery.data?.items ?? [];

  const penaltiesQuery = trpc.supplyChain.penalty.list.useQuery({});
  const penalties = penaltiesQuery.data?.items ?? [];

  const scrapStatsQuery = trpc.supplyChain.scrap.stats.useQuery();
  const scrapStats = scrapStatsQuery.data ?? null;

  const penaltyStatsQuery = trpc.supplyChain.penalty.stats.useQuery();
  const penaltyStats = penaltyStatsQuery.data ?? null;

  const methodLabel: Record<string, string> = {
    recycle: t("supply.chain.disposalRecycle"),
    destroy: t("supply.chain.disposalDestroy"),
    return: t("supply.chain.disposalReturn"),
    salvage: t("supply.chain.disposalSalvage"),
  };
  const triggerLabel: Record<string, string> = {
    quality_reject: t("supply.chain.triggerQualityReject"),
    late_delivery: t("supply.chain.triggerLateDelivery"),
    missing_report: t("supply.chain.triggerMissingReport"),
    safety_violation: t("supply.chain.triggerSafetyViolation"),
  };
  const penaltyTypeLabel: Record<string, string> = {
    warning: t("supply.chain.penaltyWarning"),
    fine: t("supply.chain.penaltyFine"),
    probation: t("supply.chain.penaltyProbation"),
    suspension: t("supply.chain.penaltySuspension"),
    blacklist: t("supply.chain.penaltyBlacklist"),
  };
  const penaltyTypeColor: Record<string, string> = { warning: "bg-amber-100 text-amber-700", fine: "bg-orange-100 text-orange-700", probation: "bg-red-100 text-red-700", suspension: "bg-red-200 text-red-800", blacklist: "bg-red-300 text-red-900" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Trash2} label={t("supply.chain.totalScraps")} value={scrapStats?.total ?? 0} />
        <StatCard icon={TrendingUp} label={t("supply.chain.scrapCost")} value={`¥${((scrapStats?.totalCost ?? 0) / 10000).toFixed(1)}万`} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Ban} label={t("supply.chain.activePenaltiesStat")} value={penaltyStats?.active ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Shield} label={t("supply.chain.blacklistStat")} value={penaltyStats?.blacklisted ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("supply.chain.scrapRecords")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scraps.slice(0, 8).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded border">
                  <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{s.scrapCode}</span>
                      <span className="text-sm">{s.materialName || s.materialCode}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.scrapReason} | {methodLabel[s.disposalMethod] || s.disposalMethod} | ¥{s.totalScrapCost || 0}</p>
                  </div>
                  {s.replacementRequired && <Badge variant="secondary">{t("supply.chain.replacementNeeded")}</Badge>}
                </div>
              ))}
              {scraps.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">{t("supply.chain.noScrapRecords")}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("supply.chain.supplierPenalties")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {penalties.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded border">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${p.isBlacklisted ? "text-red-600" : "text-orange-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.supplierName || `#${p.supplierId}`}</span>
                      <Badge className={penaltyTypeColor[p.penaltyType] || ""}>{penaltyTypeLabel[p.penaltyType] || p.penaltyType}</Badge>
                      {p.isBlacklisted && <Badge variant="destructive">{t("supply.chain.blacklisted")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{triggerLabel[p.triggerType] || p.triggerType} | {t("supply.chain.occurrenceCount")}: {p.occurrenceCount} | {t("supply.chain.escalationLevel")}: L{p.escalationLevel}</p>
                  </div>
                  <Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? t("supply.chain.statusActivePenalty") : t("supply.chain.statusResolvedPenalty")}</Badge>
                </div>
              ))}
              {penalties.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">{t("supply.chain.noPenaltyRecords")}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Workbench
// ═══════════════════════════════════════════════════════════════
export default function SupplyChainWorkbench() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title={t("supply.chain.title")}
        description={t("supply.chain.desc")}
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="dashboard" className="gap-1 min-h-[44px]"><LayoutDashboard className="h-3.5 w-3.5" />{t("supply.chain.tabDashboard")}</TabsTrigger>
          <TabsTrigger value="labels" className="gap-1 min-h-[44px]"><Tag className="h-3.5 w-3.5" />{t("supply.chain.tabLabels")}</TabsTrigger>
          <TabsTrigger value="inspection" className="gap-1 min-h-[44px]"><ClipboardCheck className="h-3.5 w-3.5" />{t("supply.chain.tabInspection")}</TabsTrigger>
          <TabsTrigger value="bom-scan" className="gap-1 min-h-[44px]"><ScanBarcode className="h-3.5 w-3.5" />{t("supply.chain.tabBomScan")}</TabsTrigger>
          <TabsTrigger value="labor" className="gap-1 min-h-[44px]"><Clock className="h-3.5 w-3.5" />{t("supply.chain.tabLabor")}</TabsTrigger>
          <TabsTrigger value="complaints" className="gap-1 min-h-[44px]"><MessageSquare className="h-3.5 w-3.5" />{t("supply.chain.tabComplaints")}</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1 min-h-[44px]"><Wrench className="h-3.5 w-3.5" />{t("supply.chain.tabMaintenance")}</TabsTrigger>
          <TabsTrigger value="scrap" className="gap-1 min-h-[44px]"><Trash2 className="h-3.5 w-3.5" />{t("supply.chain.tabScrap")}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="labels"><LabelsTab /></TabsContent>
        <TabsContent value="inspection"><InspectionTab /></TabsContent>
        <TabsContent value="bom-scan"><BomScanTab /></TabsContent>
        <TabsContent value="labor"><LaborTab /></TabsContent>
        <TabsContent value="complaints"><ComplaintsTab /></TabsContent>
        <TabsContent value="maintenance"><MaintenanceTab /></TabsContent>
        <TabsContent value="scrap"><ScrapPenaltyTab /></TabsContent>
      </Tabs>
    </div>
  );
}
