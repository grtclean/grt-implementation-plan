/**
 * 仓库管理页面
 * 仓库列表、库位管理、入库管理、出库管理
 * Wired to warehouse.router.ts (30 tRPC procedures)
 */
import { useState } from "react";
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

const TYPE_LABELS: Record<string, string> = {
  raw_material: "原材料", semi_finished: "半成品", finished_goods: "成品",
  spare_parts: "备件", tools: "工具", quarantine: "隔离", returns: "退货",
};

const RECEIPT_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "待提交", color: "bg-gray-100 text-gray-700" },
  pending_qc: { label: "质检中", color: "bg-blue-100 text-blue-700" },
  shelved: { label: "已上架", color: "bg-green-100 text-green-700" },
  qc_failed: { label: "质检不合格", color: "bg-red-100 text-red-700" },
  qc_passed: { label: "质检通过", color: "bg-emerald-100 text-emerald-700" },
};

const ISSUE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700" },
  approved: { label: "已审批", color: "bg-blue-100 text-blue-700" },
  picking: { label: "拣货中", color: "bg-amber-100 text-amber-700" },
  issued: { label: "已出库", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );
}

function WarehouseListTab() {
  const [search, setSearch] = useState("");
  const warehouseQuery = trpc.warehouse.getWarehouses.useQuery();
  const warehouses = warehouseQuery.data ?? [];
  const isLoading = warehouseQuery.isLoading;

  const filtered = warehouses.filter((w: any) => !search || w.warehouseName?.includes(search) || w.warehouseCode?.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索仓库..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />新建仓库</Button>
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
                      <Badge variant="outline">{TYPE_LABELS[w.warehouseType] || w.warehouseType}</Badge>
                      {!w.isActive && <Badge variant="destructive">停用</Badge>}
                    </div>
                    <p className="font-semibold mt-1">{w.warehouseName}</p>
                    <p className="text-sm text-muted-foreground mt-1">地址: {w.address} | 容量: {w.totalCapacity} | 管理员: {w.managerName}</p>
                  </div>
                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-2 text-center py-8 text-muted-foreground">暂无仓库数据</div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationTreeTab() {
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
        <span className="text-sm font-medium">选择仓库:</span>
        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">WH-001 原材料主仓</SelectItem>
            <SelectItem value="2">WH-002 半成品暂存仓</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-4">{zones.map((z: string) => (
          <Button key={z} variant={selectedZone === z ? "default" : "outline"} size="sm" onClick={() => setSelectedZone(z)}>{z}区</Button>
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
                    {loc.isOccupied ? "已占用" : "空闲"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">类型: {loc.locationType}</p>
                {loc.currentMaterialCode && <p className="text-xs mt-1">物料: {loc.currentMaterialCode}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 空闲</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 已占用</span>
      </div>
    </div>
  );
}

function ReceiptsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ receiptType: "purchase", warehouseId: "", notes: "" });
  const receiptsQuery = trpc.warehouse.getReceipts.useQuery({});
  const receipts = (receiptsQuery.data as any)?.items ?? [];
  const isLoading = receiptsQuery.isLoading;
  const createReceiptMutation = trpc.warehouse.createReceipt.useMutation();

  const handleCreateReceipt = async () => {
    if (!receiptForm.warehouseId) { toast.error("请选择目标仓库"); return; }
    try {
      await createReceiptMutation.mutateAsync({
        receiptType: receiptForm.receiptType as any,
        warehouseId: Number(receiptForm.warehouseId),
        notes: receiptForm.notes || undefined,
        items: [],
      });
      toast.success("入库单已创建");
      setShowCreate(false);
      setReceiptForm({ receiptType: "purchase", warehouseId: "", notes: "" });
      receiptsQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue placeholder="状态筛选" /></SelectTrigger>
          <SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="draft">待提交</SelectItem><SelectItem value="pending_qc">质检中</SelectItem><SelectItem value="shelved">已上架</SelectItem></SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />新建入库单</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>新建入库单</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><label className="text-sm font-medium">入库类型</label><Select value={receiptForm.receiptType} onValueChange={v => setReceiptForm(p => ({ ...p, receiptType: v }))}><SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger><SelectContent><SelectItem value="purchase">采购入库</SelectItem><SelectItem value="production">生产入库</SelectItem><SelectItem value="return">退货入库</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">目标仓库</label><Select value={receiptForm.warehouseId} onValueChange={v => setReceiptForm(p => ({ ...p, warehouseId: v }))}><SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger><SelectContent><SelectItem value="1">WH-001 原材料主仓</SelectItem><SelectItem value="2">WH-002 半成品暂存仓</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">备注</label><Input placeholder="入库备注..." value={receiptForm.notes} onChange={e => setReceiptForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreateReceipt}>提交</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {receipts.map((r: any) => {
            const st = RECEIPT_STATUS[r.status] || { label: r.status, color: "" };
            return (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <ArrowDownToLine className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-mono text-xs">{r.receiptCode}</span><Badge variant="outline">{r.receiptType === "purchase" ? "采购" : r.receiptType === "production" ? "生产" : "退货"}</Badge></div>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.warehouseName || "—"} | {r.receivedByName || "—"} | {r.createdAt}</p>
                </div>
                <Badge className={st.color}>{r.status === "pending_qc" && <Clock className="h-3 w-3 mr-1" />}{r.status === "qc_failed" && <XCircle className="h-3 w-3 mr-1" />}{r.status === "shelved" && <CheckCircle2 className="h-3 w-3 mr-1" />}{st.label}</Badge>
              </div>
            );
          })}
          {receipts.length === 0 && !isLoading && <div className="text-center py-8 text-muted-foreground">暂无入库记录</div>}
        </div>
      )}
    </div>
  );
}

function IssuesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [issueForm, setIssueForm] = useState({ issueType: "production", warehouseId: "", projectCode: "" });
  const issuesQuery = trpc.warehouse.getIssues.useQuery({});
  const issues = (issuesQuery.data as any)?.items ?? [];
  const isLoading = issuesQuery.isLoading;
  const createIssueMutation = trpc.warehouse.createIssue.useMutation();

  const handleCreateIssue = async () => {
    if (!issueForm.warehouseId) { toast.error("请选择来源仓库"); return; }
    try {
      await createIssueMutation.mutateAsync({
        issueType: issueForm.issueType as any,
        warehouseId: Number(issueForm.warehouseId),
        projectCode: issueForm.projectCode || undefined,
        items: [],
      });
      toast.success("出库单已创建");
      setShowCreate(false);
      setIssueForm({ issueType: "production", warehouseId: "", projectCode: "" });
      issuesQuery.refetch();
    } catch (e: any) { toast.error(e.message || "创建失败"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue placeholder="状态筛选" /></SelectTrigger>
          <SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="draft">草稿</SelectItem><SelectItem value="approved">已审批</SelectItem><SelectItem value="issued">已出库</SelectItem></SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />新建出库单</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>新建出库单</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><label className="text-sm font-medium">出库类型</label><Select value={issueForm.issueType} onValueChange={v => setIssueForm(p => ({ ...p, issueType: v }))}><SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger><SelectContent><SelectItem value="production">生产领料</SelectItem><SelectItem value="sales">销售出库</SelectItem><SelectItem value="scrap">报废</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">来源仓库</label><Select value={issueForm.warehouseId} onValueChange={v => setIssueForm(p => ({ ...p, warehouseId: v }))}><SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger><SelectContent><SelectItem value="1">WH-001 原材料主仓</SelectItem><SelectItem value="3">WH-003 成品仓</SelectItem></SelectContent></Select></div>
              <div><label className="text-sm font-medium">项目编号</label><Input placeholder="PRJ-2026-XXX" value={issueForm.projectCode} onChange={e => setIssueForm(p => ({ ...p, projectCode: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleCreateIssue}>提交</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {issues.map((iss: any) => {
            const st = ISSUE_STATUS[iss.status] || { label: iss.status, color: "" };
            return (
              <div key={iss.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <ArrowUpFromLine className="h-5 w-5 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-mono text-xs">{iss.issueCode}</span><Badge variant="outline">{iss.issueType === "production" ? "生产领料" : iss.issueType === "sales" ? "销售出库" : "报废"}</Badge></div>
                  <p className="text-sm text-muted-foreground mt-0.5">{iss.warehouseName || "—"} | {iss.issuedByName || "—"}{iss.projectCode ? ` | 项目: ${iss.projectCode}` : ""} | {iss.createdAt}</p>
                </div>
                <Badge className={st.color}>{st.label}</Badge>
              </div>
            );
          })}
          {issues.length === 0 && !isLoading && <div className="text-center py-8 text-muted-foreground">暂无出库记录</div>}
        </div>
      )}
    </div>
  );
}

export default function WarehouseManagement() {
  const statsQuery = trpc.warehouse.getWarehouseStats.useQuery();
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader icon={Warehouse} title="仓库管理" description="仓库、库位、入库、出库一站式管理" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Warehouse} label="仓库总数" value={stats?.totalWarehouses ?? "—"} />
        <StatCard icon={MapPin} label="库位总数" value={stats?.totalLocations ?? "—"} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Package} label="库位利用率" value={stats?.locationUtilization != null ? `${stats.locationUtilization}%` : "—"} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <StatCard icon={Clock} label="待处理单据" value={(stats?.pendingReceipts ?? 0) + (stats?.pendingIssues ?? 0) || "—"} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>
      <Tabs defaultValue="warehouses">
        <TabsList><TabsTrigger value="warehouses">仓库列表</TabsTrigger><TabsTrigger value="locations">库位管理</TabsTrigger><TabsTrigger value="receipts">入库管理</TabsTrigger><TabsTrigger value="issues">出库管理</TabsTrigger></TabsList>
        <TabsContent value="warehouses"><WarehouseListTab /></TabsContent>
        <TabsContent value="locations"><LocationTreeTab /></TabsContent>
        <TabsContent value="receipts"><ReceiptsTab /></TabsContent>
        <TabsContent value="issues"><IssuesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
