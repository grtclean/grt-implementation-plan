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
import {
  Truck, LayoutDashboard, Tag, ClipboardCheck, ScanBarcode,
  Clock, MessageSquare, Wrench, Trash2, Plus, Search,
  CheckCircle2, XCircle, AlertTriangle, Shield, TrendingUp,
  BarChart3, Package, Gauge, Boxes, Factory, Users,
  ArrowRight, ChevronRight, Ban, Timer,
} from "lucide-react";

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── Tab 1: Dashboard Overview ────────────────────────────────
function DashboardTab() {
  const statsQuery = trpc.supplyChain.dashboardStats.useQuery();
  const stats = statsQuery.data;

  if (!stats) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardCheck} label="IQC通过率" value={`${stats.iqc?.passRate ?? 0}%`} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={ScanBarcode} label="BOM匹配率" value={`${stats.bomScan?.matchRate ?? 0}%`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Trash2} label="报废总成本" value={`¥${((stats.scrap?.totalCost ?? 0) / 10000).toFixed(1)}万`} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Ban} label="黑名单供应商" value={stats.penalties?.blacklisted ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">来料检验 IQC</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.iqc?.total ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">待检: {stats.iqc?.pending ?? 0} | 通过率: {stats.iqc?.passRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">客户质量反馈</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.complaints?.open ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">未关闭 | 严重: {stats.complaints?.critical ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">备件预警</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.spareParts?.lowStock ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">低库存备件 | 活跃处罚: {stats.penalties?.active ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 2: Supplier Labels ───────────────────────────────────
function LabelsTab() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplierSerialNumber: "", materialCode: "", poNumber: "", projectNumber: "", supplierName: "", materialName: "", quantity: "", batchNumber: "" });

  const labelsQuery = trpc.supplyChain.label.list.useQuery({});
  const labels = labelsQuery.data?.items ?? [];
  const isLoading = labelsQuery.isLoading;
  const refetch = labelsQuery.refetch;

  const createLabelMutation = trpc.supplyChain.label.create.useMutation();
  const validateLabelMutation = trpc.supplyChain.label.validate.useMutation();

  const filtered = labels.filter((l: any) => !search || l.supplierSerialNumber?.includes(search) || l.materialCode?.includes(search));

  const handleCreate = async () => {
    if (!form.supplierSerialNumber || !form.materialCode) { toast.error("序列号和物料编码必填"); return; }
    try {
      await createLabelMutation.mutateAsync(form);
      toast.success("标签已创建");
      setShowCreate(false);
      setForm({ supplierSerialNumber: "", materialCode: "", poNumber: "", projectNumber: "", supplierName: "", materialName: "", quantity: "", batchNumber: "" });
      refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handleValidate = async (id: number) => {
    try {
      const res = await validateLabelMutation.mutateAsync({ id });
      toast.success(res?.isValidated ? "验证通过" : "验证失败，请检查数据");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索序列号/物料..." className="pl-9 w-full sm:w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建标签</Button>
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
                  <p className="text-sm text-muted-foreground mt-0.5">{l.supplierName || "—"} | {l.materialName || "—"} | 批次: {l.batchNumber || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-8 sm:ml-0">
                <Badge className={l.isValidated ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                  {l.isValidated ? <><CheckCircle2 className="h-3 w-3 mr-1" />已验证</> : "待验证"}
                </Badge>
                {!l.isValidated && <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => handleValidate(l.id)}>验证</Button>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无标签数据</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建供应商标签</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>供应商序列号 *</Label><Input value={form.supplierSerialNumber} onChange={e => setForm(p => ({ ...p, supplierSerialNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>物料编码 *</Label><Input value={form.materialCode} onChange={e => setForm(p => ({ ...p, materialCode: e.target.value }))} /></div>
              <div><Label>物料名称</Label><Input value={form.materialName} onChange={e => setForm(p => ({ ...p, materialName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>PO编号</Label><Input value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} /></div>
              <div><Label>项目编号</Label><Input value={form.projectNumber} onChange={e => setForm(p => ({ ...p, projectNumber: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>供应商</Label><Input value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} /></div>
              <div><Label>批次号</Label><Input value={form.batchNumber} onChange={e => setForm(p => ({ ...p, batchNumber: e.target.value }))} /></div>
            </div>
            <div><Label>数量</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Incoming Inspection (IQC) ─────────────────────────
function InspectionTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ materialCode: "", materialName: "", supplierName: "", poNumber: "", hasTestReport: false, inspectedQuantity: "" });

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
  const resultLabel: Record<string, string> = { PASS: "通过", FAIL: "不合格", CONDITIONAL: "有条件接收", PENDING: "待检" };

  const handleCreate = async () => {
    if (!form.materialCode) { toast.error("物料编码必填"); return; }
    try {
      await createInspectionMutation.mutateAsync(form);
      toast.success("检验记录已创建");
      setShowCreate(false);
      setForm({ materialCode: "", materialName: "", supplierName: "", poNumber: "", hasTestReport: false, inspectedQuantity: "" });
      refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handleAutoReject = async (id: number) => {
    try {
      const res = await rejectReceiptMutation.mutateAsync({ id }) as any;
      if (res.autoRejected) {
        toast.error(`自动拒绝: ${res.reasons.join("; ")} — 已触发供应商处罚`);
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
          <Badge variant="outline">总计: {inspections.length}</Badge>
          <Badge className="bg-green-100 text-green-700">通过: {inspections.filter((i: any) => i.inspectionResult === "PASS").length}</Badge>
          <Badge className="bg-red-100 text-red-700">不合格: {inspections.filter((i: any) => i.inspectionResult === "FAIL").length}</Badge>
        </div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建检验</Button>
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
                    {!i.hasTestReport && <Badge variant="destructive" className="text-xs">缺报告</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{i.supplierName || "—"} | PO: {i.poNumber || "—"} | {i.createdAt?.split("T")[0]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-8 sm:ml-0">
                <Badge className={resultColor[i.inspectionResult] || ""}>{resultLabel[i.inspectionResult] || i.inspectionResult}</Badge>
                {i.inspectionResult === "PENDING" && (
                  <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => handleAutoReject(i.id)}>
                    <XCircle className="h-3 w-3 mr-1" />自动检查
                  </Button>
                )}
              </div>
            </div>
          ))}
          {inspections.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无检验记录</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建来料检验</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>物料编码 *</Label><Input value={form.materialCode} onChange={e => setForm(p => ({ ...p, materialCode: e.target.value }))} /></div>
              <div><Label>物料名称</Label><Input value={form.materialName} onChange={e => setForm(p => ({ ...p, materialName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>供应商</Label><Input value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} /></div>
              <div><Label>PO编号</Label><Input value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} /></div>
            </div>
            <div><Label>检验数量</Label><Input type="number" value={form.inspectedQuantity} onChange={e => setForm(p => ({ ...p, inspectedQuantity: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hasReport" checked={form.hasTestReport} onChange={e => setForm(p => ({ ...p, hasTestReport: e.target.checked }))} />
              <Label htmlFor="hasReport">已附检测报告</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: Assembly BOM Scan ─────────────────────────────────
function BomScanTab() {
  const [projectNumber, setProjectNumber] = useState("");
  const [processCode, setProcessCode] = useState("T1");
  const [barcode, setBarcode] = useState("");

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

  const handleScan = async () => {
    if (!projectNumber || !barcode) { toast.error("项目编号和条码必填"); return; }
    try {
      const res = await scanAndVerifyMutation.mutateAsync({
        projectNumber,
        processCode,
        scannedBarcode: barcode,
      });
      if (res.bomMatchResult === "MATCH") {
        toast.success(`BOM匹配: ${res.resolvedMaterialCode}`);
      } else if (res.bomMatchResult === "MISMATCH") {
        toast.error(`BOM不匹配! 扫描: ${res.resolvedMaterialCode}, 预期: ${res.expectedMaterialCode || "—"}`);
      } else {
        toast.info(`扫码结果: ${res.bomMatchResult}`);
      }
      setBarcode("");
      refetch();
    } catch (e: any) { toast.error(e.message || "扫码失败"); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1"><Label>项目编号</Label><Input placeholder="PRJ-2026-XXX" value={projectNumber} onChange={e => setProjectNumber(e.target.value)} /></div>
            <div className="w-full sm:w-32">
              <Label>工序</Label>
              <Select value={processCode} onValueChange={setProcessCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 15 }, (_, i) => `T${i + 1}`).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div className="flex-1"><Label>扫描条码</Label><Input placeholder="扫描或输入条码..." value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleScan()} /></div>
            <Button className="min-h-[44px]" onClick={handleScan}><ScanBarcode className="h-4 w-4 mr-1" />扫码验证</Button>
          </div>
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
                  <span className="text-sm">{s.resolvedMaterialCode || "未识别"}</span>
                  <Badge variant="secondary" className="text-xs">{s.processCode}</Badge>
                </div>
              </div>
              <Badge className={matchColor[s.bomMatchResult] || ""}>
                {s.bomMatchResult === "MATCH" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {s.bomMatchResult === "MISMATCH" && <XCircle className="h-3 w-3 mr-1" />}
                {s.bomMatchResult}
              </Badge>
              {s.deviationConfirmed && <Badge className="bg-purple-100 text-purple-700">偏差已确认</Badge>}
            </div>
          ))}
          {scans.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无扫码记录</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Labor Confirmations ───────────────────────────────
function LaborTab() {
  const recordsQuery = trpc.supplyChain.labor.list.useQuery({});
  const records = recordsQuery.data?.items ?? [];
  const isLoading = recordsQuery.isLoading;

  const statsQuery = trpc.supplyChain.labor.stats.useQuery();
  const stats = statsQuery.data ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="总记录" value={stats?.total ?? 0} />
        <StatCard icon={Timer} label="进行中" value={stats?.active ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={stats?.completed ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Gauge} label="平均效率" value={`${stats?.avgEfficiency ?? 0}%`} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
      </div>

      {isLoading ? <LoadingSkeleton rows={5} /> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">项目</th><th className="p-3">工序</th><th className="p-3">工人</th>
                  <th className="p-3">上班</th><th className="p-3">下班</th><th className="p-3 text-right">工时(分)</th>
                  <th className="p-3 text-right">效率</th><th className="p-3">质量</th>
                </tr></thead>
                <tbody>
                  {records.slice(0, 20).map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-accent/30">
                      <td className="p-3 font-mono text-xs">{r.projectNumber}</td>
                      <td className="p-3"><Badge variant="secondary">{r.processCode}</Badge></td>
                      <td className="p-3">{r.workerName || `#${r.workerId}`}</td>
                      <td className="p-3 text-xs">{r.clockInTime?.split("T")[1]?.slice(0, 5) || "—"}</td>
                      <td className="p-3 text-xs">{r.clockOutTime?.split("T")[1]?.slice(0, 5) || <Badge className="bg-blue-100 text-blue-700">进行中</Badge>}</td>
                      <td className="p-3 text-right">{r.netWorkMinutes ?? "—"}</td>
                      <td className="p-3 text-right">{r.efficiencyPercent ? `${Number(r.efficiencyPercent).toFixed(0)}%` : "—"}</td>
                      <td className="p-3">
                        {r.qualityResult && <Badge className={r.qualityResult === "PASS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.qualityResult}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无工时记录</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 6: Customer Complaints ───────────────────────────────
function ComplaintsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customerName: "", projectNumber: "", severity: "medium" as string, description: "" });

  const complaintsQuery = trpc.supplyChain.complaint.list.useQuery({});
  const complaints = complaintsQuery.data?.items ?? [];
  const isLoading = complaintsQuery.isLoading;
  const refetch = complaintsQuery.refetch;

  const createComplaintMutation = trpc.supplyChain.complaint.create.useMutation();

  const severityColor: Record<string, string> = {
    low: "bg-gray-100 text-gray-700", medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
  };
  const severityLabel: Record<string, string> = { low: "低", medium: "中", high: "高", critical: "严重" };
  const statusLabel: Record<string, string> = { open: "待处理", investigating: "调查中", resolved: "已解决", closed: "已关闭" };

  const handleCreate = async () => {
    if (!form.description) { toast.error("问题描述必填"); return; }
    try {
      await createComplaintMutation.mutateAsync({ ...form, severity: form.severity as "high" | "medium" | "low" | "critical" });
      toast.success("投诉已记录");
      setShowCreate(false);
      setForm({ customerName: "", projectNumber: "", severity: "medium", description: "" });
      refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">总计: {complaints.length}</Badge>
          <Badge className="bg-red-100 text-red-700">严重: {complaints.filter((c: any) => c.severity === "critical").length}</Badge>
        </div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建反馈</Button>
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
                    {c.eightDReportId && <Badge variant="secondary">8D已关联</Badge>}
                    {c.designChangeRequired && <Badge variant="secondary">需设计变更</Badge>}
                  </div>
                  <p className="text-sm mt-0.5 line-clamp-1">{c.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.customerName || "—"} | {c.projectNumber || "—"} | {c.createdAt?.split("T")[0]}</p>
                </div>
              </div>
              <Badge variant="outline" className="ml-8 sm:ml-0 shrink-0">{statusLabel[c.status] || c.status}</Badge>
            </div>
          ))}
          {complaints.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无投诉记录</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建客户质量反馈</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>客户名称</Label><Input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div><Label>项目编号</Label><Input value={form.projectNumber} onChange={e => setForm(p => ({ ...p, projectNumber: e.target.value }))} /></div>
            </div>
            <div><Label>严重程度</Label>
              <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem><SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem><SelectItem value="critical">严重</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>问题描述 *</Label><Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 7: Maintenance & Spare Parts ─────────────────────────
function MaintenanceTab() {
  const maintenanceQuery = trpc.supplyChain.maintenance.list.useQuery({});
  const records = maintenanceQuery.data?.items ?? [];
  const isLoading = maintenanceQuery.isLoading;

  const spareStatsQuery = trpc.supplyChain.sparePart.stats.useQuery();
  const spareStats = spareStatsQuery.data ?? null;

  const lowStockQuery = trpc.supplyChain.sparePart.lowStockAlerts.useQuery();
  const lowStockAlerts = lowStockQuery.data ?? [];

  const typeLabel: Record<string, string> = { preventive: "预防性", corrective: "纠正性", predictive: "预测性", emergency: "紧急" };
  const typeColor: Record<string, string> = { preventive: "bg-blue-100 text-blue-700", corrective: "bg-orange-100 text-orange-700", predictive: "bg-purple-100 text-purple-700", emergency: "bg-red-100 text-red-700" };
  const statusLabel: Record<string, string> = { scheduled: "已排期", in_progress: "进行中", completed: "已完成", cancelled: "已取消" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wrench} label="维保记录" value={records.length} />
        <StatCard icon={Package} label="备件种类" value={spareStats?.total ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="低库存备件" value={spareStats?.lowStock ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Shield} label="关键备件" value={spareStats?.critical ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">维保记录</CardTitle></CardHeader>
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
                      <p className="text-xs text-muted-foreground">{r.equipmentName || `设备#${r.equipmentId}`} | {r.scheduledDate || "—"}</p>
                    </div>
                    <Badge variant="outline">{statusLabel[r.status] || r.status}</Badge>
                  </div>
                ))}
                {records.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">暂无维保记录</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />备件低库存预警</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockAlerts.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded border border-orange-200/50 bg-orange-50/30">
                  <Package className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.materialName}</p>
                    <p className="text-xs text-muted-foreground">{p.materialCode} | 库存: {p.currentStock} / 安全: {p.reorderPoint}</p>
                  </div>
                  {p.autoReorderEnabled && <Badge className="bg-blue-100 text-blue-700 text-xs">自动补货</Badge>}
                </div>
              ))}
              {lowStockAlerts.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">无低库存预警</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 8: Scrap & Supplier Penalties ────────────────────────
function ScrapPenaltyTab() {
  const scrapsQuery = trpc.supplyChain.scrap.list.useQuery({});
  const scraps = scrapsQuery.data?.items ?? [];

  const penaltiesQuery = trpc.supplyChain.penalty.list.useQuery({});
  const penalties = penaltiesQuery.data?.items ?? [];

  const scrapStatsQuery = trpc.supplyChain.scrap.stats.useQuery();
  const scrapStats = scrapStatsQuery.data ?? null;

  const penaltyStatsQuery = trpc.supplyChain.penalty.stats.useQuery();
  const penaltyStats = penaltyStatsQuery.data ?? null;

  const methodLabel: Record<string, string> = { recycle: "回收", destroy: "销毁", return: "退供应商", salvage: "拆解利用" };
  const triggerLabel: Record<string, string> = { quality_reject: "质量不合格", late_delivery: "交付延迟", missing_report: "缺失报告", safety_violation: "安全违规" };
  const penaltyTypeLabel: Record<string, string> = { warning: "警告", fine: "罚款", probation: "观察期", suspension: "暂停", blacklist: "黑名单" };
  const penaltyTypeColor: Record<string, string> = { warning: "bg-amber-100 text-amber-700", fine: "bg-orange-100 text-orange-700", probation: "bg-red-100 text-red-700", suspension: "bg-red-200 text-red-800", blacklist: "bg-red-300 text-red-900" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Trash2} label="报废总数" value={scrapStats?.total ?? 0} />
        <StatCard icon={TrendingUp} label="报废成本" value={`¥${((scrapStats?.totalCost ?? 0) / 10000).toFixed(1)}万`} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Ban} label="活跃处罚" value={penaltyStats?.active ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Shield} label="黑名单" value={penaltyStats?.blacklisted ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">报废记录</CardTitle></CardHeader>
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
                  {s.replacementRequired && <Badge variant="secondary">需替换</Badge>}
                </div>
              ))}
              {scraps.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">暂无报废记录</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">供应商处罚</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {penalties.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded border">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${p.isBlacklisted ? "text-red-600" : "text-orange-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.supplierName || `供应商#${p.supplierId}`}</span>
                      <Badge className={penaltyTypeColor[p.penaltyType] || ""}>{penaltyTypeLabel[p.penaltyType] || p.penaltyType}</Badge>
                      {p.isBlacklisted && <Badge variant="destructive">黑名单</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{triggerLabel[p.triggerType] || p.triggerType} | 次数: {p.occurrenceCount} | 等级: L{p.escalationLevel}</p>
                  </div>
                  <Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? "活跃" : "已解决"}</Badge>
                </div>
              ))}
              {penalties.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">暂无处罚记录</div>}
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
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="供应链追溯工作台"
        description="IATF 16949 全链追溯 — 供应商→来料→装配→客户→维保→报废"
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="dashboard" className="gap-1 min-h-[44px]"><LayoutDashboard className="h-3.5 w-3.5" />总览</TabsTrigger>
          <TabsTrigger value="labels" className="gap-1 min-h-[44px]"><Tag className="h-3.5 w-3.5" />供应商标签</TabsTrigger>
          <TabsTrigger value="inspection" className="gap-1 min-h-[44px]"><ClipboardCheck className="h-3.5 w-3.5" />来料检验</TabsTrigger>
          <TabsTrigger value="bom-scan" className="gap-1 min-h-[44px]"><ScanBarcode className="h-3.5 w-3.5" />装配扫码</TabsTrigger>
          <TabsTrigger value="labor" className="gap-1 min-h-[44px]"><Clock className="h-3.5 w-3.5" />工时确认</TabsTrigger>
          <TabsTrigger value="complaints" className="gap-1 min-h-[44px]"><MessageSquare className="h-3.5 w-3.5" />质量反馈</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1 min-h-[44px]"><Wrench className="h-3.5 w-3.5" />维保与备件</TabsTrigger>
          <TabsTrigger value="scrap" className="gap-1 min-h-[44px]"><Trash2 className="h-3.5 w-3.5" />报废与供应商</TabsTrigger>
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
