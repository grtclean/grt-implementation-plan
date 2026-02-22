/**
 * Procurement Workbench (P2P)
 * Full Procure-to-Pay lifecycle management
 *
 * 10 tabs: Overview | Suppliers | Qualifications | Quality Agreements |
 *          RFQ/Bidding | Framework Agreements | Purchase Orders |
 *          Delivery Registration | Invoice & Payment | Small Value
 *
 * Wired to p2p.* and procurement.* tRPC routers
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
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart, LayoutDashboard, Users, ShieldCheck, FileCheck2,
  Gavel, FileText, Package, Truck, CreditCard, Coins,
  Plus, Search, CheckCircle2, XCircle, AlertTriangle, Clock,
  TrendingUp, ArrowRight, Star, Award, RefreshCw, Eye,
  Send, Ban, CalendarClock, Receipt, Handshake, FileWarning,
  CircleDollarSign, Scale, BarChart3,
} from "lucide-react";

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
}

// ─── Tab 1: Overview ──────────────────────────────────────────
function OverviewTab() {
  const agreementsQuery = trpc.p2p.frameworkAgreement.list.useQuery({});
  const paymentsQuery = trpc.p2p.payment.list.useQuery({});
  const rfqQuery = trpc.p2p.rfq.list.useQuery({});
  const deliveryQuery = trpc.p2p.delivery.list.useQuery({});
  const incidentQuery = trpc.p2p.qualityLossIncident.list.useQuery({});

  const agreements = agreementsQuery.data?.items ?? [];
  const payments = paymentsQuery.data?.items ?? [];
  const rfqs = rfqQuery.data?.items ?? [];
  const deliveries = deliveryQuery.data?.items ?? [];
  const incidents = incidentQuery.data?.items ?? [];

  const isLoading = agreementsQuery.isLoading || paymentsQuery.isLoading;

  const activeAgreements = agreements.filter((a: any) => a.status === "ACTIVE").length;
  const pendingPayments = payments.filter((p: any) => p.status !== "ARCHIVED" && p.status !== "SUPPLIER_CONFIRMED").length;
  const overduePayments = payments.filter((p: any) => p.overdue || p.status === "OVERDUE").length;
  const totalPoValue = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const totalQualityLoss = incidents.reduce((sum: number, i: any) => sum + (Number(i.lossAmount) || 0), 0);

  if (isLoading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={CircleDollarSign} label="采购总额" value={`${(totalPoValue / 10000).toFixed(1)}万`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Clock} label="待付款" value={pendingPayments} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={Handshake} label="有效协议" value={activeAgreements} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="逾期发票" value={overduePayments} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Scale} label="质量损失" value={`${(totalQualityLoss / 10000).toFixed(1)}万`} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">询价进行中</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rfqs.filter((r: any) => r.status === "PUBLISHED").length}</div>
            <p className="text-sm text-muted-foreground mt-1">总询价: {rfqs.length} | 已关闭: {rfqs.filter((r: any) => r.status === "CLOSED").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">到货待验收</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{deliveries.filter((d: any) => d.status === "REGISTERED" || d.status === "QC_PENDING").length}</div>
            <p className="text-sm text-muted-foreground mt-1">总到货: {deliveries.length} | 已确认: {deliveries.filter((d: any) => d.status === "CONFIRMED").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">质量损失事件</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{incidents.filter((i: any) => !i.acknowledged).length}</div>
            <p className="text-sm text-muted-foreground mt-1">未确认 | 总事件: {incidents.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">付款流水线状态</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {["INITIATED", "QUALITY_OK", "BU_APPROVED", "QA_APPROVED", "PAYMENT_APPROVED", "PROCUREMENT_CONFIRMED", "SUPPLIER_CONFIRMED", "ARCHIVED"].map(s => {
              const count = payments.filter((p: any) => p.status === s).length;
              return (
                <div key={s} className="p-2 rounded border">
                  <div className="font-bold text-lg">{count}</div>
                  <div className="text-muted-foreground truncate">{s.replace(/_/g, " ")}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: Suppliers ─────────────────────────────────────────
function SuppliersTab() {
  const [search, setSearch] = useState("");
  const suppliersQuery = trpc.procurement.getSuppliers.useQuery();
  const qualQuery = trpc.p2p.qualification.list.useQuery({});

  const suppliers = (suppliersQuery.data as any)?.items ?? suppliersQuery.data ?? [];
  const qualifications = qualQuery.data?.items ?? [];
  const isLoading = suppliersQuery.isLoading;

  const filtered = (suppliers as any[]).filter((s: any) => !search || s.supplierName?.includes(search) || s.supplierCode?.includes(search));

  const getQualStatus = (supplierId: any) => {
    const q = qualifications.filter((q: any) => String(q.supplierId) === String(supplierId));
    if (q.length === 0) return { label: "未审查", color: "bg-gray-100 text-gray-700" };
    const valid = q.filter((x: any) => x.status === "VALID");
    if (valid.length === q.length) return { label: "全部有效", color: "bg-green-100 text-green-700" };
    if (valid.length > 0) return { label: "部分有效", color: "bg-amber-100 text-amber-700" };
    return { label: "已过期", color: "bg-red-100 text-red-700" };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索供应商名称/编码..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {isLoading ? <LoadingSkeleton rows={5} /> : (
        <div className="space-y-2">
          {filtered.map((s: any) => {
            const qual = getQualStatus(s.id);
            return (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50">
                <Users className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.code && <Badge variant="outline">{s.code}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {s.category || "通用"} | 联系人: {s.contact || "—"} | 评级: {s.rating ? `${s.rating}/5` : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={qual.color}>{qual.label}</Badge>
                  {s.rating && Number(s.rating) >= 4 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无供应商数据</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Qualifications ────────────────────────────────────
function QualificationsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplierId: "", certificationType: "ISO9001", certificateNumber: "", issueDate: "", expiryDate: "", auditNotes: "" });

  const qualQuery = trpc.p2p.qualification.list.useQuery({});
  const quals = qualQuery.data?.items ?? [];
  const isLoading = qualQuery.isLoading;

  const trpcUtils = trpc.useUtils();
  const createMutation = trpc.p2p.qualification.create.useMutation();

  const certTypes = ["ISO9001", "ISO14001", "ISO45001", "IATF16949", "OTHER"];
  const certLabel: Record<string, string> = { ISO9001: "ISO 9001 质量管理", ISO14001: "ISO 14001 环境管理", ISO45001: "ISO 45001 职业安全", IATF16949: "IATF 16949 汽车质量", OTHER: "其他" };
  const statusColor: Record<string, string> = { VALID: "bg-green-100 text-green-700", EXPIRED: "bg-red-100 text-red-700", EXPIRING_SOON: "bg-amber-100 text-amber-700", PENDING: "bg-gray-100 text-gray-700" };

  const handleCreate = async () => {
    if (!form.supplierId || !form.certificateNumber) { toast.error("供应商ID和证书编号必填"); return; }
    try {
      await createMutation.mutateAsync({ ...form, supplierId: Number(form.supplierId) });
      toast.success("资格记录已创建");
      setShowCreate(false);
      setForm({ supplierId: "", certificationType: "ISO9001", certificateNumber: "", issueDate: "", expiryDate: "", auditNotes: "" });
      qualQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handleCheckExpiry = async () => {
    try {
      const res = await trpcUtils.p2p.qualification.checkExpiry.fetch();
      toast.success(`检查完成: ${res.expiring?.length ?? 0} 个证书即将过期, ${res.expired?.length ?? 0} 个已过期`);
      qualQuery.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const expiringSoon = quals.filter((q: any) => q.status === "EXPIRING_SOON").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {expiringSoon > 0 && (
            <Badge className="bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3 mr-1" />{expiringSoon} 个证书即将过期</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="min-h-[44px]" onClick={handleCheckExpiry}><RefreshCw className="h-4 w-4 mr-1" />检查到期</Button>
          <Button size="sm" className="min-h-[44px]" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建资格</Button>
        </div>
      </div>
      {isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {quals.map((q: any) => (
            <div key={q.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50">
              <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{certLabel[q.certificationType] || q.certificationType}</span>
                  <Badge variant="outline">{q.certificateNumber}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  供应商: {q.supplierName || `#${q.supplierId}`} | 有效期: {q.issueDate || "—"} ~ {q.expiryDate || "—"}
                </p>
                {q.auditNotes && <p className="text-xs text-muted-foreground mt-0.5">{q.auditNotes}</p>}
              </div>
              <Badge className={statusColor[q.status] || "bg-gray-100 text-gray-700"}>{q.status === "VALID" ? "有效" : q.status === "EXPIRED" ? "已过期" : q.status === "EXPIRING_SOON" ? "即将过期" : "待审"}</Badge>
            </div>
          ))}
          {quals.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无资格审查记录</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建资格审查</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>供应商ID *</Label><Input value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))} placeholder="输入供应商ID" /></div>
            <div>
              <Label>认证类型</Label>
              <Select value={form.certificationType} onValueChange={v => setForm(p => ({ ...p, certificationType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{certTypes.map(t => <SelectItem key={t} value={t}>{certLabel[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>证书编号 *</Label><Input value={form.certificateNumber} onChange={e => setForm(p => ({ ...p, certificateNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>签发日期</Label><Input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} /></div>
              <div><Label>到期日期</Label><Input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} /></div>
            </div>
            <div><Label>审核备注</Label><Textarea value={form.auditNotes} onChange={e => setForm(p => ({ ...p, auditNotes: e.target.value }))} placeholder="阀门供应商需额外提供压力测试报告..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: Quality Agreements ────────────────────────────────
function QualityAgreementsTab() {
  const [showCreateAgreement, setShowCreateAgreement] = useState(false);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [agrForm, setAgrForm] = useState({ supplierId: "", qualityLossThreshold: "", penaltyFormula: "", maxPenaltyAmount: "" });
  const [incForm, setIncForm] = useState({ qualityLossAgreementId: "", lossDescription: "", lossAmount: "", materialCode: "", supplierId: "" });

  const agreementsQuery = trpc.p2p.qualityLossAgreement.list.useQuery({});
  const incidentsQuery = trpc.p2p.qualityLossIncident.list.useQuery({});
  const agreements = agreementsQuery.data?.items ?? [];
  const incidents = incidentsQuery.data?.items ?? [];

  const createAgrMutation = trpc.p2p.qualityLossAgreement.create.useMutation();
  const signAgrMutation = trpc.p2p.qualityLossAgreement.sign.useMutation();
  const createIncMutation = trpc.p2p.qualityLossIncident.create.useMutation();
  const ackIncMutation = trpc.p2p.qualityLossIncident.acknowledge.useMutation();
  const statsQuery = trpc.p2p.qualityLossIncident.stats.useQuery({});
  const stats = statsQuery.data;

  const handleCreateAgreement = async () => {
    if (!agrForm.supplierId) { toast.error("供应商ID必填"); return; }
    try {
      await createAgrMutation.mutateAsync({
        supplierId: Number(agrForm.supplierId),
        qualityLossThreshold: agrForm.qualityLossThreshold || undefined,
        penaltyFormula: agrForm.penaltyFormula || undefined,
        maxPenaltyAmount: agrForm.maxPenaltyAmount || undefined,
      });
      toast.success("质量协议已创建");
      setShowCreateAgreement(false);
      setAgrForm({ supplierId: "", qualityLossThreshold: "", penaltyFormula: "", maxPenaltyAmount: "" });
      agreementsQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handleSign = async (id: number) => {
    try {
      await signAgrMutation.mutateAsync({ id, signedBy: "当前用户" });
      toast.success("协议已签署");
      agreementsQuery.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateIncident = async () => {
    if (!incForm.lossAmount) { toast.error("损失金额必填"); return; }
    try {
      await createIncMutation.mutateAsync({
        qualityLossAgreementId: Number(incForm.qualityLossAgreementId) || undefined,
        supplierId: Number(incForm.supplierId) || 0,
        lossAmount: incForm.lossAmount,
        lossDescription: incForm.lossDescription || undefined,
        materialCode: incForm.materialCode || undefined,
      });
      toast.success("质量损失事件已记录");
      setShowCreateIncident(false);
      setIncForm({ qualityLossAgreementId: "", lossDescription: "", lossAmount: "", materialCode: "", supplierId: "" });
      incidentsQuery.refetch();
      statsQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await ackIncMutation.mutateAsync({ id });
      toast.success("事件已确认");
      incidentsQuery.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileCheck2} label="有效协议" value={agreements.length} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={AlertTriangle} label="总损失事件" value={stats.totalIncidents ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={CircleDollarSign} label="累计损失" value={`${((Number(stats.totalLoss) || 0) / 10000).toFixed(1)}万`} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={Ban} label="触发处罚" value={stats.penaltyTriggeredCount ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">质量损失协议</CardTitle>
          <Button size="sm" onClick={() => setShowCreateAgreement(true)}><Plus className="h-4 w-4 mr-1" />新建协议</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agreements.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50">
                <Handshake className="h-5 w-5 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.agreementCode}</div>
                  <p className="text-sm text-muted-foreground">阈值: {a.qualityLossThreshold ? `${a.qualityLossThreshold}元` : "—"} | 最大罚款: {a.maxPenaltyAmount ? `${a.maxPenaltyAmount}元` : "—"} | 供应商: #{a.supplierId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={a.status === "SIGNED" ? "bg-green-100 text-green-700" : a.status === "EXPIRED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                    {a.status === "SIGNED" ? "已签署" : a.status === "EXPIRED" ? "已过期" : "待签署"}
                  </Badge>
                  {a.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => handleSign(a.id)}>签署</Button>}
                </div>
              </div>
            ))}
            {agreements.length === 0 && <div className="text-center py-4 text-muted-foreground">暂无质量协议</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">质量损失事件</CardTitle>
          <Button size="sm" onClick={() => setShowCreateIncident(true)}><Plus className="h-4 w-4 mr-1" />记录事件</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {incidents.map((inc: any) => {
              const agreement = agreements.find((a: any) => a.id === inc.qualityLossAgreementId);
              const threshold = Number(agreement?.qualityLossThreshold) || 100000;
              const cumulative = Number(inc.cumulativeLoss) || Number(inc.lossAmount) || 0;
              const pct = Math.min(100, (cumulative / threshold) * 100);
              return (
                <div key={inc.id} className="p-3 rounded-lg border hover:bg-accent/50">
                  <div className="flex items-center gap-4">
                    <FileWarning className="h-5 w-5 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inc.description || "质量损失事件"}</span>
                        <Badge variant="outline">{inc.materialCode || "—"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">损失: {inc.lossAmount}元 | 协议: #{inc.qualityLossAgreementId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inc.deductionFromPaymentId && <Badge className="bg-red-100 text-red-700">已扣款</Badge>}
                      {inc.supplierAcknowledged ? (
                        <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />已确认</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleAcknowledge(inc.id)}>确认</Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={pct} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{pct.toFixed(0)}% / 阈值</span>
                    {pct >= 100 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              );
            })}
            {incidents.length === 0 && <div className="text-center py-4 text-muted-foreground">暂无质量损失事件</div>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateAgreement} onOpenChange={setShowCreateAgreement}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建质量损失协议</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>供应商ID *</Label><Input value={agrForm.supplierId} onChange={e => setAgrForm(p => ({ ...p, supplierId: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>损失阈值(元)</Label><Input type="number" value={agrForm.qualityLossThreshold} onChange={e => setAgrForm(p => ({ ...p, qualityLossThreshold: e.target.value }))} /></div>
              <div><Label>最大罚款(元)</Label><Input type="number" value={agrForm.maxPenaltyAmount} onChange={e => setAgrForm(p => ({ ...p, maxPenaltyAmount: e.target.value }))} /></div>
            </div>
            <div><Label>罚款公式</Label><Input value={agrForm.penaltyFormula} onChange={e => setAgrForm(p => ({ ...p, penaltyFormula: e.target.value }))} placeholder="例: PERCENTAGE / FIXED" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAgreement(false)}>取消</Button>
            <Button onClick={handleCreateAgreement} disabled={createAgrMutation.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateIncident} onOpenChange={setShowCreateIncident}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>记录质量损失事件</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>供应商ID *</Label><Input value={incForm.supplierId} onChange={e => setIncForm(p => ({ ...p, supplierId: e.target.value }))} /></div>
            <div><Label>关联协议ID</Label><Input value={incForm.qualityLossAgreementId} onChange={e => setIncForm(p => ({ ...p, qualityLossAgreementId: e.target.value }))} /></div>
            <div><Label>损失金额(元) *</Label><Input type="number" value={incForm.lossAmount} onChange={e => setIncForm(p => ({ ...p, lossAmount: e.target.value }))} /></div>
            <div><Label>物料编码</Label><Input value={incForm.materialCode} onChange={e => setIncForm(p => ({ ...p, materialCode: e.target.value }))} /></div>
            <div><Label>描述</Label><Textarea value={incForm.lossDescription} onChange={e => setIncForm(p => ({ ...p, lossDescription: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateIncident(false)}>取消</Button>
            <Button onClick={handleCreateIncident} disabled={createIncMutation.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 5: RFQ / Bidding ─────────────────────────────────────
function RfqBiddingTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", materialCodes: "", deadline: "" });
  const [selectedRfq, setSelectedRfq] = useState<number | null>(null);

  const rfqQuery = trpc.p2p.rfq.list.useQuery({});
  const rfqs = rfqQuery.data?.items ?? [];
  const isLoading = rfqQuery.isLoading;

  const quotesQuery = trpc.p2p.rfq.getQuotes.useQuery({ rfqEventId: selectedRfq! }, { enabled: !!selectedRfq });
  const quotes = quotesQuery.data ?? [];

  const createMutation = trpc.p2p.rfq.create.useMutation();
  const publishMutation = trpc.p2p.rfq.publish.useMutation();
  const closeMutation = trpc.p2p.rfq.close.useMutation();
  const awardMutation = trpc.p2p.rfq.awardQuote.useMutation();

  const statusColor: Record<string, string> = { DRAFT: "bg-gray-100 text-gray-700", PUBLISHED: "bg-blue-100 text-blue-700", EVALUATING: "bg-amber-100 text-amber-700", AWARDED: "bg-green-100 text-green-700", CLOSED: "bg-red-100 text-red-700" };
  const statusLabel: Record<string, string> = { DRAFT: "草稿", PUBLISHED: "已发布", EVALUATING: "评审中", AWARDED: "已授标", CLOSED: "已关闭" };

  const handleCreate = async () => {
    if (!form.title) { toast.error("标题必填"); return; }
    try {
      await createMutation.mutateAsync(form);
      toast.success("询价单已创建");
      setShowCreate(false);
      setForm({ title: "", description: "", materialCodes: "", deadline: "" });
      rfqQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handlePublish = async (id: number) => {
    try { await publishMutation.mutateAsync({ id }); toast.success("询价已发布"); rfqQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  const handleClose = async (id: number) => {
    try { await closeMutation.mutateAsync({ id }); toast.success("询价已关闭"); rfqQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  const handleAward = async (quoteId: number) => {
    try { await awardMutation.mutateAsync({ rfqEventId: selectedRfq!, quoteId }); toast.success("已授标，将自动创建PO"); rfqQuery.refetch(); quotesQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-medium">询价竞标管理</h3>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建询价</Button>
      </div>
      {isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {rfqs.map((r: any) => (
            <div key={r.id} className="p-3 rounded-lg border hover:bg-accent/50">
              <div className="flex items-center gap-4">
                <Gavel className="h-5 w-5 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge className={statusColor[r.status] || "bg-gray-100 text-gray-700"}>{statusLabel[r.status] || r.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    截止: {r.deadline || "—"} | 报价数: {r.quoteCount ?? 0} | 物料: {r.materialCodes || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => handlePublish(r.id)}><Send className="h-3 w-3 mr-1" />发布</Button>}
                  {r.status === "PUBLISHED" && <Button size="sm" variant="outline" onClick={() => setSelectedRfq(r.id)}><Eye className="h-3 w-3 mr-1" />报价</Button>}
                  {(r.status === "PUBLISHED" || r.status === "EVALUATING") && <Button size="sm" variant="outline" onClick={() => handleClose(r.id)}><XCircle className="h-3 w-3 mr-1" />关闭</Button>}
                </div>
              </div>
            </div>
          ))}
          {rfqs.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无询价记录</div>}
        </div>
      )}

      {selectedRfq && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">报价比较 - 询价 #{selectedRfq}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSelectedRfq(null)}>关闭</Button>
          </CardHeader>
          <CardContent>
            {quotesQuery.isLoading ? <LoadingSkeleton rows={3} /> : (
              <div className="space-y-2">
                {quotes.length > 0 ? quotes.map((q: any) => (
                  <div key={q.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.supplierName || `供应商 #${q.supplierId}`}</span>
                        <span className="text-lg font-bold text-blue-600">{q.unitPrice ? `${q.unitPrice}元/件` : "—"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">交期: {q.leadTimeDays ?? "—"}天 | 评分: {q.score ?? "—"}/100</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.awarded ? (
                        <Badge className="bg-green-100 text-green-700"><Award className="h-3 w-3 mr-1" />已授标</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleAward(q.id)}><Award className="h-3 w-3 mr-1" />授标</Button>
                      )}
                    </div>
                  </div>
                )) : <div className="text-center py-4 text-muted-foreground">暂无报价</div>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建询价单</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>标题 *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>物料编码(逗号分隔)</Label><Input value={form.materialCodes} onChange={e => setForm(p => ({ ...p, materialCodes: e.target.value }))} placeholder="M001,M002" /></div>
            <div><Label>截止日期</Label><Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} /></div>
            <div><Label>描述</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 6: Framework Agreements ──────────────────────────────
function FrameworkAgreementsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", supplierId: "", totalBudget: "", startDate: "", endDate: "", pricingItems: "" });

  const agreementsQuery = trpc.p2p.frameworkAgreement.list.useQuery({});
  const agreements = agreementsQuery.data?.items ?? [];
  const isLoading = agreementsQuery.isLoading;

  const createMutation = trpc.p2p.frameworkAgreement.create.useMutation();
  const activateMutation = trpc.p2p.frameworkAgreement.activate.useMutation();
  const expireMutation = trpc.p2p.frameworkAgreement.expire.useMutation();

  const handleCreate = async () => {
    if (!form.title || !form.supplierId) { toast.error("标题和供应商必填"); return; }
    try {
      await createMutation.mutateAsync({ ...form, supplierId: Number(form.supplierId), totalBudget: form.totalBudget || undefined });
      toast.success("框架协议已创建");
      setShowCreate(false);
      setForm({ title: "", supplierId: "", totalBudget: "", startDate: "", endDate: "", pricingItems: "" });
      agreementsQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  const handleActivate = async (id: number) => {
    try { await activateMutation.mutateAsync({ id }); toast.success("协议已激活"); agreementsQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  const handleExpire = async (id: number) => {
    try { await expireMutation.mutateAsync({ id }); toast.success("协议已设为过期"); agreementsQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  const statusColor: Record<string, string> = { DRAFT: "bg-gray-100 text-gray-700", ACTIVE: "bg-green-100 text-green-700", EXPIRED: "bg-red-100 text-red-700", RENEWED: "bg-blue-100 text-blue-700" };
  const statusLabel: Record<string, string> = { DRAFT: "草稿", ACTIVE: "有效", EXPIRED: "已过期", RENEWED: "已续签" };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-medium">年度框架协议</h3>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建协议</Button>
      </div>
      {isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {agreements.map((a: any) => {
            const budget = Number(a.totalBudget) || 0;
            const used = Number(a.spentAmount) || 0;
            const usagePct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
            const daysLeft = a.endDate ? Math.max(0, Math.floor((new Date(a.endDate).getTime() - Date.now()) / 86400000)) : null;

            return (
              <div key={a.id} className="p-3 rounded-lg border hover:bg-accent/50">
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      <Badge className={statusColor[a.status] || "bg-gray-100 text-gray-700"}>{statusLabel[a.status] || a.status}</Badge>
                      {daysLeft !== null && daysLeft <= 30 && a.status === "ACTIVE" && (
                        <Badge className="bg-amber-100 text-amber-700"><CalendarClock className="h-3 w-3 mr-1" />{daysLeft}天到期</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      供应商: #{a.supplierId} | 预算: {budget > 0 ? `${(budget / 10000).toFixed(1)}万` : "—"} | 期间: {a.startDate || "—"} ~ {a.endDate || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => handleActivate(a.id)}>激活</Button>}
                    {a.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => handleExpire(a.id)}>到期</Button>}
                  </div>
                </div>
                {budget > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={usagePct} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {(used / 10000).toFixed(1)}万 / {(budget / 10000).toFixed(1)}万 ({usagePct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {agreements.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无框架协议</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建框架协议</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>协议标题 *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>供应商ID *</Label><Input value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))} /></div>
            <div><Label>预算金额(元)</Label><Input type="number" value={form.totalBudget} onChange={e => setForm(p => ({ ...p, totalBudget: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>开始日期</Label><Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label>结束日期</Label><Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div><Label>定价项目(JSON)</Label><Textarea value={form.pricingItems} onChange={e => setForm(p => ({ ...p, pricingItems: e.target.value }))} placeholder='[{"material":"M001","price":100}]' /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 7: Purchase Orders ───────────────────────────────────
function PurchaseOrdersTab() {
  const [search, setSearch] = useState("");
  const ordersQuery = trpc.procurement.getPurchaseOrders.useQuery();
  const orders = (ordersQuery.data as any)?.items ?? ordersQuery.data ?? [];
  const isLoading = ordersQuery.isLoading;

  const filtered = (orders as any[]).filter((o: any) => !search || o.poNumber?.includes(search) || o.supplierName?.includes(search) || o.materialCode?.includes(search));

  const statusPipeline = ["DRAFT", "APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_DELIVERED", "DELIVERED", "INVOICED", "CLOSED"];
  const statusLabel: Record<string, string> = { DRAFT: "草稿", APPROVED: "已审批", SENT: "已发送", ACKNOWLEDGED: "已确认", PARTIALLY_DELIVERED: "部分到货", DELIVERED: "已到货", INVOICED: "已开票", CLOSED: "已关闭" };
  const statusColor: Record<string, string> = { DRAFT: "bg-gray-100 text-gray-700", APPROVED: "bg-blue-100 text-blue-700", SENT: "bg-indigo-100 text-indigo-700", ACKNOWLEDGED: "bg-cyan-100 text-cyan-700", PARTIALLY_DELIVERED: "bg-amber-100 text-amber-700", DELIVERED: "bg-green-100 text-green-700", INVOICED: "bg-purple-100 text-purple-700", CLOSED: "bg-gray-200 text-gray-800" };

  const getStepIndex = (status: string) => statusPipeline.indexOf(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索PO编号/供应商/物料..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Badge variant="outline">共 {filtered.length} 条</Badge>
      </div>
      {isLoading ? <LoadingSkeleton rows={5} /> : (
        <div className="space-y-2">
          {filtered.map((o: any) => {
            const step = getStepIndex(o.status);
            const progress = step >= 0 ? ((step + 1) / statusPipeline.length) * 100 : 0;
            return (
              <div key={o.id} className="p-3 rounded-lg border hover:bg-accent/50">
                <div className="flex items-center gap-4">
                  <Package className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{o.poNumber || `PO-${o.id}`}</span>
                      <Badge className={statusColor[o.status] || "bg-gray-100 text-gray-700"}>{statusLabel[o.status] || o.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      供应商: {o.supplierName || "—"} | 金额: {o.totalAmount ? `${o.totalAmount}元` : "—"} | 交期: {o.deliveryDate || "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex justify-between mt-1 overflow-x-auto scrollbar-hide">
                    {statusPipeline.map((s, i) => (
                      <span key={s} className={`text-[10px] whitespace-nowrap ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{statusLabel[s]}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无采购订单</div>}
        </div>
      )}
    </div>
  );
}

// ─── Tab 8: Delivery Registration ─────────────────────────────
function DeliveryTab() {
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ poNumber: "", materialCode: "", quantity: "", supplierName: "", batchNumber: "" });

  const deliveryQuery = trpc.p2p.delivery.list.useQuery({});
  const deliveries = deliveryQuery.data?.items ?? [];
  const isLoading = deliveryQuery.isLoading;

  const registerMutation = trpc.p2p.delivery.register.useMutation();
  const confirmMutation = trpc.p2p.delivery.confirmReceipt.useMutation();
  const linkQcMutation = trpc.p2p.delivery.linkQcInspection.useMutation();

  const statusColor: Record<string, string> = { REGISTERED: "bg-blue-100 text-blue-700", QC_PENDING: "bg-amber-100 text-amber-700", QC_PASSED: "bg-green-100 text-green-700", QC_FAILED: "bg-red-100 text-red-700", CONFIRMED: "bg-green-200 text-green-800", REJECTED: "bg-red-200 text-red-800" };
  const statusLabel: Record<string, string> = { REGISTERED: "已登记", QC_PENDING: "质检中", QC_PASSED: "质检通过", QC_FAILED: "质检不合格", CONFIRMED: "已确认收货", REJECTED: "已拒收" };

  const handleRegister = async () => {
    if (!form.poNumber || !form.materialCode) { toast.error("PO编号和物料编码必填"); return; }
    try {
      await registerMutation.mutateAsync({ poNumber: form.poNumber, materialCode: form.materialCode, supplierName: form.supplierName, trackingNumber: form.batchNumber || undefined, deliveredQuantity: form.quantity || undefined });
      toast.success("到货已登记");
      setShowRegister(false);
      setForm({ poNumber: "", materialCode: "", quantity: "", supplierName: "", batchNumber: "" });
      deliveryQuery.refetch();
    } catch (e: any) { toast.error(e.message || "登记失败"); }
  };

  const handleConfirm = async (id: number) => {
    try { await confirmMutation.mutateAsync({ id }); toast.success("收货已确认"); deliveryQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  const handleLinkQc = async (id: number) => {
    try { await linkQcMutation.mutateAsync({ id, qcInspectionId: 0 }); toast.success("已关联质检"); deliveryQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-medium">到货登记管理</h3>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowRegister(true)}><Plus className="h-4 w-4 mr-1" />登记到货</Button>
      </div>
      {isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {deliveries.map((d: any) => (
            <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50">
              <Truck className="h-5 w-5 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{d.poNumber || "—"}</span>
                  <Badge variant="outline">{d.materialCode || "—"}</Badge>
                  <span className="text-sm">x{d.quantity ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  供应商: {d.supplierName || "—"} | 批次: {d.batchNumber || "—"} | 登记: {d.registeredAt ? new Date(d.registeredAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor[d.status] || "bg-gray-100 text-gray-700"}>{statusLabel[d.status] || d.status}</Badge>
                {d.status === "REGISTERED" && <Button size="sm" variant="outline" onClick={() => handleLinkQc(d.id)}>送检</Button>}
                {d.status === "QC_PASSED" && <Button size="sm" variant="outline" onClick={() => handleConfirm(d.id)}><CheckCircle2 className="h-3 w-3 mr-1" />确认收货</Button>}
              </div>
            </div>
          ))}
          {deliveries.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无到货记录</div>}
        </div>
      )}

      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>登记到货</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>PO编号 *</Label><Input value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>物料编码 *</Label><Input value={form.materialCode} onChange={e => setForm(p => ({ ...p, materialCode: e.target.value }))} /></div>
              <div><Label>数量</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>供应商</Label><Input value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} /></div>
              <div><Label>批次号</Label><Input value={form.batchNumber} onChange={e => setForm(p => ({ ...p, batchNumber: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)}>取消</Button>
            <Button onClick={handleRegister} disabled={registerMutation.isPending}>登记</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 9: Invoice & Payment ─────────────────────────────────
function InvoicePaymentTab() {
  const [showInitiate, setShowInitiate] = useState(false);
  const [form, setForm] = useState({ poNumber: "", invoiceNumber: "", amount: "", supplierId: "" });

  const paymentsQuery = trpc.p2p.payment.list.useQuery({});
  const payments = paymentsQuery.data?.items ?? [];
  const isLoading = paymentsQuery.isLoading;

  const initiateMutation = trpc.p2p.payment.initiate.useMutation();
  const qualityOkMutation = trpc.p2p.payment.confirmQualityOk.useMutation();
  const buApprovalMutation = trpc.p2p.payment.submitBuApproval.useMutation();
  const qaApprovalMutation = trpc.p2p.payment.submitQualityApproval.useMutation();
  const paymentApproveMutation = trpc.p2p.payment.approvePayment.useMutation();
  const procurementConfirmMutation = trpc.p2p.payment.procurementConfirm.useMutation();
  const archiveMutation = trpc.p2p.payment.archiveContract.useMutation();

  const workflowSteps = [
    { key: "INITIATED", label: "发起付款" },
    { key: "QUALITY_OK", label: "质量确认" },
    { key: "BU_APPROVED", label: "BU审批" },
    { key: "QA_APPROVED", label: "质量审批" },
    { key: "PAYMENT_APPROVED", label: "付款审批" },
    { key: "PROCUREMENT_CONFIRMED", label: "采购确认" },
    { key: "SUPPLIER_CONFIRMED", label: "供应商确认" },
    { key: "ARCHIVED", label: "归档" },
  ];

  const getStepIndex = (status: string) => workflowSteps.findIndex(s => s.key === status);

  const getNextAction = (status: string, id: number) => {
    const actions: Record<string, { label: string; fn: () => Promise<void> }> = {
      INITIATED: { label: "质量确认", fn: async () => { await qualityOkMutation.mutateAsync({ id }); toast.success("质量已确认"); paymentsQuery.refetch(); } },
      QUALITY_OK: { label: "提交BU审批", fn: async () => { await buApprovalMutation.mutateAsync({ id }); toast.success("已提交BU审批"); paymentsQuery.refetch(); } },
      BU_APPROVED: { label: "质量审批", fn: async () => { await qaApprovalMutation.mutateAsync({ id }); toast.success("质量已审批"); paymentsQuery.refetch(); } },
      QA_APPROVED: { label: "审批付款", fn: async () => { await paymentApproveMutation.mutateAsync({ id }); toast.success("付款已审批"); paymentsQuery.refetch(); } },
      PAYMENT_APPROVED: { label: "采购确认", fn: async () => { await procurementConfirmMutation.mutateAsync({ id }); toast.success("采购已确认"); paymentsQuery.refetch(); } },
      PROCUREMENT_CONFIRMED: { label: "归档完成", fn: async () => { await archiveMutation.mutateAsync({ id }); toast.success("合同已归档"); paymentsQuery.refetch(); } },
    };
    return actions[status];
  };

  const handleInitiate = async () => {
    if (!form.invoiceNumber || !form.amount) { toast.error("发票号和金额必填"); return; }
    try {
      await initiateMutation.mutateAsync({ invoiceNumber: form.invoiceNumber, paymentAmount: form.amount, supplierId: Number(form.supplierId) || undefined });
      toast.success("付款流程已发起");
      setShowInitiate(false);
      setForm({ poNumber: "", invoiceNumber: "", amount: "", supplierId: "" });
      paymentsQuery.refetch();
    } catch (e: any) { toast.error(e.message || "发起失败"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-medium">发票付款管理 (8步流程)</h3>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowInitiate(true)}><Plus className="h-4 w-4 mr-1" />发起付款</Button>
      </div>
      {isLoading ? <LoadingSkeleton rows={5} /> : (
        <div className="space-y-3">
          {payments.map((p: any) => {
            const stepIdx = getStepIndex(p.status);
            const progress = stepIdx >= 0 ? ((stepIdx + 1) / workflowSteps.length) * 100 : 0;
            const nextAction = getNextAction(p.status, p.id);

            return (
              <div key={p.id} className="p-4 rounded-lg border hover:bg-accent/50">
                <div className="flex items-center gap-4">
                  <Receipt className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{p.invoiceNumber || `INV-${p.id}`}</span>
                      <span className="font-bold text-blue-600">{p.amount ? `${Number(p.amount).toLocaleString()}元` : "—"}</span>
                      {p.qualityDeduction && Number(p.qualityDeduction) > 0 && (
                        <Badge className="bg-red-100 text-red-700">质量扣款: -{p.qualityDeduction}元</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">PO: {p.poNumber || "—"} | 供应商: #{p.supplierId || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {nextAction && (
                      <Button size="sm" onClick={async () => { try { await nextAction.fn(); } catch (e: any) { toast.error(e.message); } }}>
                        <ArrowRight className="h-3 w-3 mr-1" />{nextAction.label}
                      </Button>
                    )}
                    {p.status === "ARCHIVED" && <Badge className="bg-gray-200 text-gray-800"><CheckCircle2 className="h-3 w-3 mr-1" />已归档</Badge>}
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between mt-1 overflow-x-auto scrollbar-hide gap-1">
                    {workflowSteps.map((s, i) => (
                      <div key={s.key} className="flex flex-col items-center shrink-0">
                        <div className={`w-3 h-3 rounded-full border-2 ${i <= stepIdx ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"}`} />
                        <span className={`text-[9px] mt-0.5 max-w-[50px] text-center leading-tight whitespace-nowrap ${i <= stepIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {payments.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无付款记录</div>}
        </div>
      )}

      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>发起付款</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>发票号 *</Label><Input value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} /></div>
            <div><Label>金额(元) *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>PO编号</Label><Input value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))} /></div>
              <div><Label>供应商ID</Label><Input value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiate(false)}>取消</Button>
            <Button onClick={handleInitiate} disabled={initiateMutation.isPending}>发起</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 10: Small Value Procurement ──────────────────────────
function SmallValueTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ materialName: "", materialCode: "", estimatedUnitPrice: "", quantity: "1", requestedByName: "", purpose: "" });

  const svQuery = trpc.p2p.smallValue.list.useQuery({});
  const items = svQuery.data?.items ?? [];
  const isLoading = svQuery.isLoading;

  const createMutation = trpc.p2p.smallValue.create.useMutation();
  const supervisorMutation = trpc.p2p.smallValue.supervisorApprove.useMutation();
  const procurementMutation = trpc.p2p.smallValue.procurementConfirm.useMutation();

  const approvalSteps = [
    { key: "SUBMITTED", label: "提交申请" },
    { key: "SUPERVISOR_APPROVED", label: "主管审批" },
    { key: "PROCUREMENT_CONFIRMED", label: "采购确认" },
  ];

  const getStepIndex = (status: string) => approvalSteps.findIndex(s => s.key === status);

  const handleCreate = async () => {
    if (!form.materialName || !form.estimatedUnitPrice) { toast.error("物料名称和预估单价必填"); return; }
    try {
      await createMutation.mutateAsync({
        materialName: form.materialName,
        materialCode: form.materialCode || undefined,
        estimatedUnitPrice: form.estimatedUnitPrice,
        quantity: Number(form.quantity) || 1,
        requestedByName: form.requestedByName || undefined,
        purpose: form.purpose || undefined,
      });
      toast.success("小额采购已提交");
      setShowCreate(false);
      setForm({ materialName: "", materialCode: "", estimatedUnitPrice: "", quantity: "1", requestedByName: "", purpose: "" });
      svQuery.refetch();
    } catch (e: any) { toast.error(e.message || "提交失败"); }
  };

  const handleSupervisorApprove = async (id: number) => {
    try { await supervisorMutation.mutateAsync({ id, approved: true }); toast.success("主管已审批"); svQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  const handleProcurementConfirm = async (id: number) => {
    try { await procurementMutation.mutateAsync({ id }); toast.success("采购已确认"); svQuery.refetch(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">小额采购审批</h3>
          <p className="text-sm text-muted-foreground">{"3步简化流程: 提交 → 主管审批 → 采购确认"}</p>
        </div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />新建申请</Button>
      </div>
      {isLoading ? <LoadingSkeleton rows={4} /> : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const stepIdx = getStepIndex(item.status);
            const progress = stepIdx >= 0 ? ((stepIdx + 1) / approvalSteps.length) * 100 : 33;

            return (
              <div key={item.id} className="p-3 rounded-lg border hover:bg-accent/50">
                <div className="flex items-center gap-4">
                  <Coins className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.materialName}</span>
                      <span className="text-sm font-bold text-blue-600">{item.estimatedUnitPrice ? `${Number(item.estimatedUnitPrice).toLocaleString()}元/件` : "—"}</span>
                      {item.estimatedTotalAmount && <span className="text-xs text-muted-foreground">总计: {item.estimatedTotalAmount}元</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      物料: {item.materialCode || "—"} | 申请人: {item.requestedByName || "—"} | {item.purpose || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "SUBMITTED" && <Button size="sm" variant="outline" onClick={() => handleSupervisorApprove(item.id)}>主管审批</Button>}
                    {item.status === "SUPERVISOR_APPROVED" && <Button size="sm" variant="outline" onClick={() => handleProcurementConfirm(item.id)}>采购确认</Button>}
                    {item.status === "PROCUREMENT_CONFIRMED" && <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />已完成</Badge>}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 overflow-x-auto scrollbar-hide">
                  {approvalSteps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1 shrink-0">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                      <span className={`text-xs whitespace-nowrap ${i <= stepIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                      {i < approvalSteps.length - 1 && <ArrowRight className={`h-3 w-3 mx-1 ${i < stepIdx ? "text-primary" : "text-muted-foreground/30"}`} />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无小额采购申请</div>}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建小额采购</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>物料名称 *</Label><Input value={form.materialName} onChange={e => setForm(p => ({ ...p, materialName: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>预估单价(元) *</Label><Input type="number" value={form.estimatedUnitPrice} onChange={e => setForm(p => ({ ...p, estimatedUnitPrice: e.target.value }))} placeholder="小于50元" /></div>
              <div><Label>数量</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              <div><Label>物料编码</Label><Input value={form.materialCode} onChange={e => setForm(p => ({ ...p, materialCode: e.target.value }))} /></div>
            </div>
            <div><Label>申请人</Label><Input value={form.requestedByName} onChange={e => setForm(p => ({ ...p, requestedByName: e.target.value }))} /></div>
            <div><Label>用途</Label><Textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ProcurementWorkbench() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShoppingCart}
        title="采购工作台"
        description="P2P全生命周期 — 供应商→询价→协议→到货→发票→付款→归档"
      />
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="min-h-[44px]"><LayoutDashboard className="h-4 w-4 mr-1" />采购总览</TabsTrigger>
          <TabsTrigger value="suppliers" className="min-h-[44px]"><Users className="h-4 w-4 mr-1" />供应商管理</TabsTrigger>
          <TabsTrigger value="qualifications" className="min-h-[44px]"><ShieldCheck className="h-4 w-4 mr-1" />资格审查</TabsTrigger>
          <TabsTrigger value="quality-agreements" className="min-h-[44px]"><FileCheck2 className="h-4 w-4 mr-1" />质量协议</TabsTrigger>
          <TabsTrigger value="rfq" className="min-h-[44px]"><Gavel className="h-4 w-4 mr-1" />询价竞标</TabsTrigger>
          <TabsTrigger value="framework" className="min-h-[44px]"><FileText className="h-4 w-4 mr-1" />年度协议</TabsTrigger>
          <TabsTrigger value="orders" className="min-h-[44px]"><Package className="h-4 w-4 mr-1" />采购订单</TabsTrigger>
          <TabsTrigger value="delivery" className="min-h-[44px]"><Truck className="h-4 w-4 mr-1" />到货登记</TabsTrigger>
          <TabsTrigger value="payment" className="min-h-[44px]"><CreditCard className="h-4 w-4 mr-1" />发票付款</TabsTrigger>
          <TabsTrigger value="small-value" className="min-h-[44px]"><Coins className="h-4 w-4 mr-1" />小额采购</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="qualifications"><QualificationsTab /></TabsContent>
        <TabsContent value="quality-agreements"><QualityAgreementsTab /></TabsContent>
        <TabsContent value="rfq"><RfqBiddingTab /></TabsContent>
        <TabsContent value="framework"><FrameworkAgreementsTab /></TabsContent>
        <TabsContent value="orders"><PurchaseOrdersTab /></TabsContent>
        <TabsContent value="delivery"><DeliveryTab /></TabsContent>
        <TabsContent value="payment"><InvoicePaymentTab /></TabsContent>
        <TabsContent value="small-value"><SmallValueTab /></TabsContent>
      </Tabs>
    </div>
  );
}
