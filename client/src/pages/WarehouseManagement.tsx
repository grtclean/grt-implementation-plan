/**
 * 仓库管理页面
 * 仓库列表、库位管理、入库管理、出库管理
 * Wired to warehouse.router.ts (30 tRPC procedures)
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Warehouse, MapPin, ArrowDownToLine, ArrowUpFromLine, Plus,
  Search, Package, Clock, CheckCircle2, XCircle, Eye,
} from "lucide-react";

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );
}

function WarehouseListTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const warehouseQuery = trpc.warehouse.getWarehouses.useQuery();
  const warehouses = warehouseQuery.data ?? [];
  const isLoading = warehouseQuery.isLoading;

  const typeLabels: Record<string, string> = {
    raw_material: t("supply.warehouse.typeRawMaterial"),
    semi_finished: t("supply.warehouse.typeSemiFinished"),
    finished_goods: t("supply.warehouse.typeFinishedGoods"),
    spare_parts: t("supply.warehouse.typeSpareParts"),
    tools: t("supply.warehouse.typeTools"),
    quarantine: t("supply.warehouse.typeQuarantine"),
    returns: t("supply.warehouse.typeReturns"),
  };

  const filtered = warehouses.filter((w: any) => !search || w.warehouseName?.includes(search) || w.warehouseCode?.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t("supply.warehouse.searchWarehouse")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("supply.warehouse.newWarehouse")}</Button>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((w: any) => (
            <Card key={w.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{w.warehouseCode}</span>
                      <Badge variant="outline">{typeLabels[w.warehouseType] || w.warehouseType}</Badge>
                      {!w.isActive && <Badge variant="destructive">{t("supply.warehouse.disabled")}</Badge>}
                    </div>
                    <p className="font-semibold mt-1">{w.warehouseName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("supply.warehouse.address")}: {w.address} | {t("supply.warehouse.capacity")}: {w.totalCapacity} | {t("supply.warehouse.manager")}: {w.managerName}</p>
                  </div>
                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-2 text-center py-8 text-muted-foreground">{t("supply.warehouse.noWarehouseData")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationTreeTab() {
  const { t } = useLanguage();
  const [selectedWarehouse, setSelectedWarehouse] = useState("1");
  const [selectedZone, setSelectedZone] = useState("A");

  const locationQuery = trpc.warehouse.getLocations.useQuery({ warehouseId: Number(selectedWarehouse) });
  const locations = locationQuery.data ?? [];
  const isLoading = locationQuery.isLoading;

  const zones = Array.from(new Set(locations.map((l: any) => l.zone).filter(Boolean)));
  if (zones.length > 0 && !zones.includes(selectedZone)) setSelectedZone(zones[0]);
  const filtered = locations.filter((l: any) => l.zone === selectedZone);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{t("supply.warehouse.selectWarehouse")}:</span>
        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">WH-001 {t("supply.warehouse.typeRawMaterial")}</SelectItem>
            <SelectItem value="2">WH-002 {t("supply.warehouse.typeSemiFinished")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-4">{zones.map((z: string) => (
          <Button key={z} variant={selectedZone === z ? "default" : "outline"} size="sm" onClick={() => setSelectedZone(z)}>{z}{t("supply.warehouse.zone")}</Button>
        ))}</div>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((loc: any) => (
            <Card key={loc.id} className={`border-l-4 ${loc.isOccupied ? "border-l-amber-500" : "border-l-green-500"}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{loc.locationCode}</span>
                  <Badge className={loc.isOccupied ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                    {loc.isOccupied ? t("supply.warehouse.occupied") : t("supply.warehouse.available")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("supply.warehouse.type")}: {loc.locationType}</p>
                {loc.currentMaterialCode && <p className="text-xs mt-1">{t("supply.warehouse.materialLabel")}: {loc.currentMaterialCode}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> {t("supply.warehouse.available")}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> {t("supply.warehouse.occupied")}</span>
      </div>
    </div>
  );
}

function ReceiptsTab() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ receiptType: "purchase", warehouseId: "", notes: "" });
  const receiptsQuery = trpc.warehouse.getReceipts.useQuery({});
  const receipts = (receiptsQuery.data as any)?.items ?? [];
  const isLoading = receiptsQuery.isLoading;
  const createReceiptMutation = trpc.warehouse.createReceipt.useMutation();

  const receiptStatusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: t("supply.warehouse.receiptDraft"), color: "bg-gray-100 text-gray-700" },
    pending_qc: { label: t("supply.warehouse.receiptPendingQC"), color: "bg-blue-100 text-blue-700" },
    shelved: { label: t("supply.warehouse.receiptShelved"), color: "bg-green-100 text-green-700" },
    qc_failed: { label: t("supply.warehouse.receiptQCFailed"), color: "bg-red-100 text-red-700" },
    qc_passed: { label: t("supply.warehouse.receiptQCPassed"), color: "bg-emerald-100 text-emerald-700" },
  };

  const receiptTypeLabels: Record<string, string> = {
    purchase: t("supply.warehouse.receiptTypePurchase"),
    production: t("supply.warehouse.receiptTypeProduction"),
    return: t("supply.warehouse.receiptTypeReturn"),
  };

  const handleCreateReceipt = async () => {
    if (!receiptForm.warehouseId) { toast.error(t("supply.warehouse.selectTargetWarehouse")); return; }
    try {
      await createReceiptMutation.mutateAsync({
        receiptType: receiptForm.receiptType as any,
        warehouseId: Number(receiptForm.warehouseId),
        notes: receiptForm.notes || undefined,
        items: [],
      });
      toast.success(t("supply.warehouse.receiptCreated"));
      setShowCreate(false);
      setReceiptForm({ receiptType: "purchase", warehouseId: "", notes: "" });
      receiptsQuery.refetch();
    } catch (e: any) { toast.error(e.message || t("supply.p2p.createFailed")); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue placeholder={t("supply.warehouse.filterStatus")} /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t("supply.warehouse.allStatuses")}</SelectItem><SelectItem value="draft">{t("supply.warehouse.receiptDraft")}</SelectItem><SelectItem value="pending_qc">{t("supply.warehouse.receiptPendingQC")}</SelectItem><SelectItem value="shelved">{t("supply.warehouse.receiptShelved")}</SelectItem></SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("supply.warehouse.newReceipt")}</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{t("supply.warehouse.newReceipt")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><label className="text-sm font-medium">{t("supply.warehouse.receiptType")}</label><Select value={receiptForm.receiptType} onValueChange={v => setReceiptForm(p => ({ ...p, receiptType: v }))}><SelectTrigger><SelectValue placeholder={t("supply.warehouse.selectType")} /></SelectTrigger><SelectContent><SelectItem value="purchase">{t("supply.warehouse.receiptTypePurchase")}</SelectItem><SelectItem value="production">{t("supply.warehouse.receiptTypeProduction")}</SelectItem><SelectItem value="return">{t("supply.warehouse.receiptTypeReturn")}</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">{t("supply.warehouse.targetWarehouse")}</label><Select value={receiptForm.warehouseId} onValueChange={v => setReceiptForm(p => ({ ...p, warehouseId: v }))}><SelectTrigger><SelectValue placeholder={t("supply.warehouse.selectWarehouse")} /></SelectTrigger><SelectContent><SelectItem value="1">WH-001 {t("supply.warehouse.typeRawMaterial")}</SelectItem><SelectItem value="2">WH-002 {t("supply.warehouse.typeSemiFinished")}</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">{t("supply.warehouse.notes")}</label><Input placeholder={t("supply.warehouse.receiptNotes")} value={receiptForm.notes} onChange={e => setReceiptForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreateReceipt}>{t("supply.common.submit")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {receipts.map((r: any) => {
            const st = receiptStatusLabels[r.status] || { label: r.status, color: "" };
            return (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <ArrowDownToLine className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-mono text-xs">{r.receiptCode}</span><Badge variant="outline">{receiptTypeLabels[r.receiptType] || r.receiptType}</Badge></div>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.warehouseName || "—"} | {r.receivedByName || "—"} | {r.createdAt}</p>
                </div>
                <Badge className={st.color}>{r.status === "pending_qc" && <Clock className="h-3 w-3 mr-1" />}{r.status === "qc_failed" && <XCircle className="h-3 w-3 mr-1" />}{r.status === "shelved" && <CheckCircle2 className="h-3 w-3 mr-1" />}{st.label}</Badge>
              </div>
            );
          })}
          {receipts.length === 0 && !isLoading && <div className="text-center py-8 text-muted-foreground">{t("supply.warehouse.noReceiptRecords")}</div>}
        </div>
      )}
    </div>
  );
}

function IssuesTab() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [issueForm, setIssueForm] = useState({ issueType: "production", warehouseId: "", projectCode: "" });
  const issuesQuery = trpc.warehouse.getIssues.useQuery({});
  const issues = (issuesQuery.data as any)?.items ?? [];
  const isLoading = issuesQuery.isLoading;
  const createIssueMutation = trpc.warehouse.createIssue.useMutation();

  const issueStatusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: t("supply.warehouse.issueDraft"), color: "bg-gray-100 text-gray-700" },
    approved: { label: t("supply.warehouse.issueApproved"), color: "bg-blue-100 text-blue-700" },
    picking: { label: t("supply.warehouse.issuePicking"), color: "bg-amber-100 text-amber-700" },
    issued: { label: t("supply.warehouse.issueIssued"), color: "bg-green-100 text-green-700" },
    cancelled: { label: t("supply.warehouse.issueCancelled"), color: "bg-red-100 text-red-700" },
  };

  const issueTypeLabels: Record<string, string> = {
    production: t("supply.warehouse.issueTypeProduction"),
    sales: t("supply.warehouse.issueTypeSales"),
    scrap: t("supply.warehouse.issueTypeScrap"),
  };

  const handleCreateIssue = async () => {
    if (!issueForm.warehouseId) { toast.error(t("supply.warehouse.selectSourceWarehouse")); return; }
    try {
      await createIssueMutation.mutateAsync({
        issueType: issueForm.issueType as any,
        warehouseId: Number(issueForm.warehouseId),
        projectCode: issueForm.projectCode || undefined,
        items: [],
      });
      toast.success(t("supply.warehouse.issueCreated"));
      setShowCreate(false);
      setIssueForm({ issueType: "production", warehouseId: "", projectCode: "" });
      issuesQuery.refetch();
    } catch (e: any) { toast.error(e.message || t("supply.p2p.createFailed")); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue placeholder={t("supply.warehouse.filterStatus")} /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t("supply.warehouse.allStatuses")}</SelectItem><SelectItem value="draft">{t("supply.warehouse.issueDraft")}</SelectItem><SelectItem value="approved">{t("supply.warehouse.issueApproved")}</SelectItem><SelectItem value="issued">{t("supply.warehouse.issueIssued")}</SelectItem></SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("supply.warehouse.newIssue")}</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{t("supply.warehouse.newIssue")}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><label className="text-sm font-medium">{t("supply.warehouse.issueType")}</label><Select value={issueForm.issueType} onValueChange={v => setIssueForm(p => ({ ...p, issueType: v }))}><SelectTrigger><SelectValue placeholder={t("supply.warehouse.selectType")} /></SelectTrigger><SelectContent><SelectItem value="production">{t("supply.warehouse.issueTypeProduction")}</SelectItem><SelectItem value="sales">{t("supply.warehouse.issueTypeSales")}</SelectItem><SelectItem value="scrap">{t("supply.warehouse.issueTypeScrap")}</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">{t("supply.warehouse.sourceWarehouse")}</label><Select value={issueForm.warehouseId} onValueChange={v => setIssueForm(p => ({ ...p, warehouseId: v }))}><SelectTrigger><SelectValue placeholder={t("supply.warehouse.selectWarehouse")} /></SelectTrigger><SelectContent><SelectItem value="1">WH-001 {t("supply.warehouse.typeRawMaterial")}</SelectItem><SelectItem value="3">WH-003 {t("supply.warehouse.typeFinishedGoods")}</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">{t("supply.warehouse.projectCode")}</label><Input placeholder="PRJ-2026-XXX" value={issueForm.projectCode} onChange={e => setIssueForm(p => ({ ...p, projectCode: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreateIssue}>{t("supply.common.submit")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {issues.map((iss: any) => {
            const st = issueStatusLabels[iss.status] || { label: iss.status, color: "" };
            return (
              <div key={iss.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <ArrowUpFromLine className="h-5 w-5 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-mono text-xs">{iss.issueCode}</span><Badge variant="outline">{issueTypeLabels[iss.issueType] || iss.issueType}</Badge></div>
                  <p className="text-sm text-muted-foreground mt-0.5">{iss.warehouseName || "—"} | {iss.issuedByName || "—"}{iss.projectCode ? ` | ${t("supply.warehouse.projectLabel")}: ${iss.projectCode}` : ""} | {iss.createdAt}</p>
                </div>
                <Badge className={st.color}>{st.label}</Badge>
              </div>
            );
          })}
          {issues.length === 0 && !isLoading && <div className="text-center py-8 text-muted-foreground">{t("supply.warehouse.noIssueRecords")}</div>}
        </div>
      )}
    </div>
  );
}

export default function WarehouseManagement() {
  const { t } = useLanguage();
  const statsQuery = trpc.warehouse.getWarehouseStats.useQuery();
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader icon={Warehouse} title={t("supply.warehouse.title")} description={t("supply.warehouse.pageDesc")} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Warehouse} label={t("supply.warehouse.totalWarehouses")} value={stats?.totalWarehouses ?? "—"} />
        <StatCard icon={MapPin} label={t("supply.warehouse.totalLocations")} value={stats?.totalLocations ?? "—"} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Package} label={t("supply.warehouse.locationUtilization")} value={stats?.locationUtilization != null ? `${stats.locationUtilization}%` : "—"} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={Clock} label={t("supply.warehouse.pendingDocuments")} value={(stats?.pendingReceipts ?? 0) + (stats?.pendingIssues ?? 0) || "—"} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>
      <Tabs defaultValue="warehouses">
        <TabsList><TabsTrigger value="warehouses">{t("supply.warehouse.warehouseList")}</TabsTrigger><TabsTrigger value="locations">{t("supply.warehouse.locationManagement")}</TabsTrigger><TabsTrigger value="receipts">{t("supply.warehouse.receiptManagement")}</TabsTrigger><TabsTrigger value="issues">{t("supply.warehouse.issueManagement")}</TabsTrigger></TabsList>
        <TabsContent value="warehouses"><WarehouseListTab /></TabsContent>
        <TabsContent value="locations"><LocationTreeTab /></TabsContent>
        <TabsContent value="receipts"><ReceiptsTab /></TabsContent>
        <TabsContent value="issues"><IssuesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
