/**
 * 客户授权管理 — GRT内部管理界面
 *
 * 4-Tab:
 *  1. 授权列表 (DataTable + 创建)
 *  2. 文档管理
 *  3. NDA管理
 *  4. 访问审计
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, Plus, FileText, ClipboardCheck, BarChart3,
  Eye, Download, Ban, RefreshCw, Send, Check,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const TIER_LABELS: Record<number, { zh: string; en: string; color: string }> = {
  1: { zh: "T1 基础买方", en: "T1 Basic Buyer", color: "bg-gray-100 text-gray-800" },
  2: { zh: "T2 技术联系人", en: "T2 Technical Contact", color: "bg-blue-100 text-blue-800" },
  3: { zh: "T3 工程伙伴", en: "T3 Engineering Partner", color: "bg-purple-100 text-purple-800" },
  4: { zh: "T4 战略合作", en: "T4 Strategic Partner", color: "bg-orange-100 text-orange-800" },
};

const STATUS_LABELS: Record<string, { zh: string; en: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_nda: { zh: "待签NDA", en: "Pending NDA", variant: "outline" },
  active: { zh: "有效", en: "Active", variant: "default" },
  suspended: { zh: "暂停", en: "Suspended", variant: "secondary" },
  revoked: { zh: "已撤销", en: "Revoked", variant: "destructive" },
  expired: { zh: "已到期", en: "Expired", variant: "secondary" },
};

const DOC_CATEGORIES = [
  { value: "operation_manual", label: "操作手册" },
  { value: "maintenance_manual", label: "维护手册" },
  { value: "basic_wiring", label: "基础接线图" },
  { value: "electrical_drawing", label: "电气图纸" },
  { value: "bom", label: "BOM清单" },
  { value: "factory_params", label: "出厂参数" },
  { value: "pid_tuning", label: "PID调参" },
  { value: "plc_source_code", label: "PLC源代码" },
  { value: "hmi_variable_table", label: "HMI变量表" },
  { value: "historical_data", label: "历史数据" },
  { value: "fat_certificate", label: "FAT证书" },
  { value: "sat_certificate", label: "SAT证书" },
  { value: "design_rationale", label: "设计依据" },
  { value: "custom", label: "自定义" },
] as const;

export default function CustomerAuthorizationManager() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("authorizations");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAuthId, setSelectedAuthId] = useState<number | null>(null);

  // ── Queries ──
  const listQuery = trpc.customerAuthorization.listAuthorizations.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });
  const statsQuery = trpc.customerAuthorization.getAuthorizationStats.useQuery();

  const detailQuery = trpc.customerAuthorization.getAuthorization.useQuery(
    { id: selectedAuthId! },
    { enabled: !!selectedAuthId }
  );

  // ── Mutations ──
  const createMutation = trpc.customerAuthorization.createAuthorization.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setForm({ companyName: "", contactName: "", contactEmail: "", contactPhone: "", accessTier: 1, ndaRequired: true });
      listQuery.refetch();
      statsQuery.refetch();
    },
  });
  const revokeMutation = trpc.customerAuthorization.revokeAuthorization.useMutation({
    onSuccess: () => { listQuery.refetch(); statsQuery.refetch(); },
  });
  const generateNdaMutation = trpc.customerAuthorization.generateNdaToken.useMutation();
  const countersignMutation = trpc.customerAuthorization.countersignNda.useMutation({
    onSuccess: () => { detailQuery.refetch(); },
  });
  const addDocMutation = trpc.customerAuthorization.addDocument.useMutation({
    onSuccess: () => { detailQuery.refetch(); },
  });

  // ── Create Form State ──
  const [form, setForm] = useState({
    companyName: "", contactName: "", contactEmail: "", contactPhone: "",
    accessTier: 1, ndaRequired: true,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">客户授权管理</h1>
            <p className="text-sm text-muted-foreground">Customer Authorization & Document Access Control</p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> 创建授权</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>创建客户授权</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>公司名称 *</Label>
                  <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="客户公司" />
                </div>
                <div>
                  <Label>联系人 *</Label>
                  <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="联系人姓名" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>邮箱 *</Label>
                  <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="email@company.com" />
                </div>
                <div>
                  <Label>电话</Label>
                  <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>授权等级</Label>
                <Select value={String(form.accessTier)} onValueChange={v => setForm(f => ({ ...f, accessTier: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(t => (
                      <SelectItem key={t} value={String(t)}>{TIER_LABELS[t].zh}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.ndaRequired}
                  onChange={e => setForm(f => ({ ...f, ndaRequired: e.target.checked }))} />
                <Label>需要签署NDA</Label>
              </div>
              {createMutation.error && (
                <p className="text-sm text-red-500">{createMutation.error.message}</p>
              )}
              <Button className="w-full"
                disabled={createMutation.isPending || !form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()}
                onClick={() => createMutation.mutate({
                  ...form,
                  companyName: form.companyName.trim(),
                  contactName: form.contactName.trim(),
                  contactEmail: form.contactEmail.trim(),
                  contactPhone: form.contactPhone.trim() || undefined,
                })}>
                {createMutation.isPending ? "创建中..." : "创建授权"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {["pending_nda", "active", "suspended", "revoked", "expired"].map(status => {
          const count = (statsQuery.data || [])
            .filter(s => s.status === status)
            .reduce((sum, s) => sum + s.count, 0);
          const label = STATUS_LABELS[status];
          return (
            <Card key={status} className="cursor-pointer hover:border-blue-300"
              onClick={() => setStatusFilter(status === statusFilter ? "all" : status)}>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{label.zh}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="authorizations"><FileText className="h-3 w-3 mr-1" /> 授权列表</TabsTrigger>
          <TabsTrigger value="documents"><ClipboardCheck className="h-3 w-3 mr-1" /> 文档管理</TabsTrigger>
          <TabsTrigger value="nda"><ShieldCheck className="h-3 w-3 mr-1" /> NDA管理</TabsTrigger>
          <TabsTrigger value="audit"><BarChart3 className="h-3 w-3 mr-1" /> 访问审计</TabsTrigger>
        </TabsList>

        {/* Tab 1: Authorization List */}
        <TabsContent value="authorizations" className="space-y-4">
          <div className="flex gap-3">
            <Input placeholder="搜索公司/联系人..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="状态过滤" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.zh}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => listQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>公司</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>到期日</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(listQuery.data?.items || []).map(auth => (
                <TableRow key={auth.id}>
                  <TableCell className="font-medium">{auth.companyName}</TableCell>
                  <TableCell>{auth.contactName}<br /><span className="text-xs text-muted-foreground">{auth.contactEmail}</span></TableCell>
                  <TableCell>
                    <Badge className={TIER_LABELS[auth.accessTier]?.color || ""}>
                      {TIER_LABELS[auth.accessTier]?.zh || `T${auth.accessTier}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[auth.status]?.variant || "outline"}>
                      {STATUS_LABELS[auth.status]?.zh || auth.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {auth.validUntil ? new Date(auth.validUntil).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="sm"
                      onClick={() => { setSelectedAuthId(auth.id); setActiveTab("documents"); }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    {auth.status === "pending_nda" && (
                      <Button variant="ghost" size="sm"
                        onClick={() => generateNdaMutation.mutate({ authorizationId: auth.id })}>
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    {auth.status === "active" && (
                      <Button variant="ghost" size="sm"
                        onClick={() => {
                          const reason = prompt("撤销原因:");
                          if (reason) revokeMutation.mutate({ id: auth.id, reason });
                        }}>
                        <Ban className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(listQuery.data?.total ?? 0) > 20 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm leading-8">第 {page} / {Math.ceil((listQuery.data?.total ?? 0) / 20)} 页</span>
              <Button variant="outline" size="sm" disabled={page * 20 >= (listQuery.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}

          {/* NDA Token Result */}
          {generateNdaMutation.data && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 space-y-2">
                <p className="font-medium text-green-700">NDA签名链接已生成</p>
                <p className="text-xs break-all font-mono">Token: {generateNdaMutation.data.token}</p>
                <p className="text-xs">过期时间: {generateNdaMutation.data.expiresAt.toLocaleString?.() ?? String(generateNdaMutation.data.expiresAt)}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Document Management */}
        <TabsContent value="documents" className="space-y-4">
          {selectedAuthId ? (
            <DocumentManagementPanel authId={selectedAuthId} detailQuery={detailQuery} addDocMutation={addDocMutation} />
          ) : (
            <Card><CardContent className="pt-8 text-center text-muted-foreground">请先在授权列表中选择一个授权记录</CardContent></Card>
          )}
        </TabsContent>

        {/* Tab 3: NDA Management */}
        <TabsContent value="nda" className="space-y-4">
          <NdaManagementPanel
            items={listQuery.data?.items || []}
            countersignMutation={countersignMutation}
            generateNdaMutation={generateNdaMutation}
          />
        </TabsContent>

        {/* Tab 4: Audit */}
        <TabsContent value="audit" className="space-y-4">
          <AuditPanel selectedAuthId={selectedAuthId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function DocumentManagementPanel({ authId, detailQuery, addDocMutation }: {
  authId: number;
  detailQuery: any;
  addDocMutation: any;
}) {
  const [docForm, setDocForm] = useState({ docCategory: "operation_manual" as string, docLabel: "", allowDownload: false });

  const detail = detailQuery.data;
  if (!detail) return <Card><CardContent className="pt-4">加载中...</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{detail.companyName} — 授权文档 ({detail.documents?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>文档类别</Label>
              <Select value={docForm.docCategory} onValueChange={v => setDocForm(f => ({ ...f, docCategory: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>文档标签</Label>
              <Input value={docForm.docLabel} onChange={e => setDocForm(f => ({ ...f, docLabel: e.target.value }))} placeholder="可选标签" />
            </div>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={docForm.allowDownload}
                onChange={e => setDocForm(f => ({ ...f, allowDownload: e.target.checked }))} />
              <Label className="text-xs">可下载</Label>
            </div>
            <Button size="sm" disabled={addDocMutation.isPending}
              onClick={() => addDocMutation.mutate({
                authorizationId: authId,
                docCategory: docForm.docCategory as any,
                docLabel: docForm.docLabel || undefined,
                allowDownload: docForm.allowDownload,
              })}>
              <Plus className="h-3 w-3 mr-1" /> 添加
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类别</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>可下载</TableHead>
                <TableHead>水印</TableHead>
                <TableHead>访问次数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.documents || []).map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {DOC_CATEGORIES.find(c => c.value === doc.docCategory)?.label || doc.docCategory}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.docLabel || "—"}</TableCell>
                  <TableCell>{doc.allowDownload ? <Check className="h-4 w-4 text-green-500" /> : "—"}</TableCell>
                  <TableCell>{doc.watermarkRequired ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : "—"}</TableCell>
                  <TableCell>{doc.accessCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NdaManagementPanel({ items, countersignMutation, generateNdaMutation }: {
  items: any[];
  countersignMutation: any;
  generateNdaMutation: any;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">NDA协议管理</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>公司</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>NDA状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.filter(a => a.ndaRequired).map(auth => (
                <TableRow key={auth.id}>
                  <TableCell>{auth.companyName}</TableCell>
                  <TableCell>
                    <Badge className={TIER_LABELS[auth.accessTier]?.color || ""}>
                      T{auth.accessTier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={auth.status === "pending_nda" ? "outline" : auth.ndaSignedAt ? "default" : "secondary"}>
                      {auth.status === "pending_nda" ? "待签署" : auth.ndaSignedAt ? "已签署" : "未知"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {auth.status === "pending_nda" && (
                      <Button variant="outline" size="sm"
                        onClick={() => generateNdaMutation.mutate({ authorizationId: auth.id })}>
                        <Send className="h-3 w-3 mr-1" /> 生成签名链接
                      </Button>
                    )}
                    {auth.status === "active" && (
                      <Button variant="outline" size="sm"
                        onClick={() => countersignMutation.mutate({ authorizationId: auth.id })}>
                        <Check className="h-3 w-3 mr-1" /> 会签
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditPanel({ selectedAuthId }: { selectedAuthId: number | null }) {
  const [auditPage, setAuditPage] = useState(1);
  const logsQuery = trpc.customerAuthorization.listAccessLogs.useQuery({
    authorizationId: selectedAuthId ?? undefined,
    page: auditPage,
    pageSize: 20,
  });
  const summaryQuery = trpc.customerAuthorization.getAccessSummary.useQuery({
    authorizationId: selectedAuthId ?? undefined,
  });
  const exportMutation = trpc.customerAuthorization.exportAuditReport.useQuery({
    authorizationId: selectedAuthId ?? undefined,
  }, { enabled: false });

  const RISK_COLORS: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(summaryQuery.data || []).map((row, i) => (
          <Card key={i}>
            <CardContent className="pt-3 text-center">
              <div className="text-lg font-bold">{row.count}</div>
              <div className="text-xs text-muted-foreground">{row.actionType}</div>
              <Badge className={RISK_COLORS[row.riskLevel] || ""} variant="outline">
                {row.riskLevel}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">访问日志</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>公司</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>文档</TableHead>
                <TableHead>风险</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logsQuery.data?.items || []).map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</TableCell>
                  <TableCell>{log.customerCompany || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.actionType}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.docLabel || log.docCategory || "—"}</TableCell>
                  <TableCell>
                    <Badge className={RISK_COLORS[log.riskLevel] || ""} variant="outline">
                      {log.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{log.ipAddress || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(logsQuery.data?.total ?? 0) > 20 && (
            <div className="flex justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>上一页</Button>
              <span className="text-sm leading-8">第 {auditPage} 页</span>
              <Button variant="outline" size="sm" onClick={() => setAuditPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
