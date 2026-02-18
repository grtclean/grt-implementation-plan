/**
 * 合同管理页面
 * 合同CRUD、文档上传、AI智能分析
 */
import { useState, useRef, useCallback } from "react";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileCheck, Plus, Search, DollarSign, Clock, AlertTriangle,
  Eye, Trash2, Upload, Download, FileText, Brain, Loader2,
  CheckCircle, XCircle, ChevronRight,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

const CONTRACT_TYPES: Record<string, string> = {
  sales: "销售合同",
  service: "服务合同",
  framework: "框架协议",
};

const CONTRACT_STATUSES: Record<string, string> = {
  draft: "草稿",
  pending_approval: "待审批",
  active: "履行中",
  completed: "已完成",
  terminated: "已终止",
};

const DOC_TYPES: Record<string, string> = {
  tech_spec: "技术规范",
  bidding_req: "招标要求",
  equipment_spec: "设备规范",
  order: "订单",
  contract: "合同",
  other: "其他",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  pending_approval: "outline",
  active: "default",
  completed: "secondary",
  terminated: "destructive",
};

// ============================================================
// Component
// ============================================================

export default function ContractManagement() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New contract form
  const [newContract, setNewContract] = useState({
    title: "",
    customerId: undefined as number | undefined,
    type: "sales" as "sales" | "service" | "framework",
    amount: "",
    currency: "CNY",
    signDate: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  // tRPC queries
  const { data: listData, isLoading, refetch } = (trpc.contract as any).list.useQuery({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const contractItems: any[] = listData?.items ?? [];

  const { data: stats } = (trpc.contract as any).stats.useQuery();

  // Customer list for the selector
  const { data: customerListData } = (trpc.crm?.customers as any)?.list?.useQuery?.({}) ?? { data: undefined };
  const customers: any[] = customerListData?.items ?? [];

  // Create mutation
  const createMutation = (trpc.contract as any).create.useMutation({
    onSuccess: () => {
      toast.success("合同创建成功");
      refetch();
      setIsCreateOpen(false);
      setNewContract({
        title: "", customerId: undefined, type: "sales",
        amount: "", currency: "CNY", signDate: "", startDate: "", endDate: "", notes: "",
      });
    },
    onError: (err: any) => toast.error(`创建失败: ${err.message}`),
  });

  // Delete mutation
  const deleteMutation = (trpc.contract as any).delete.useMutation({
    onSuccess: () => {
      toast.success("合同已删除");
      refetch();
    },
    onError: (err: any) => toast.error(`删除失败: ${err.message}`),
  });

  const handleCreate = () => {
    if (!newContract.title.trim()) {
      toast.error("请输入合同标题");
      return;
    }
    const payload: any = {
      title: newContract.title.trim(),
      type: newContract.type,
      currency: newContract.currency,
    };
    if (newContract.customerId) payload.customerId = newContract.customerId;
    if (newContract.amount) payload.amount = newContract.amount;
    if (newContract.signDate) payload.signDate = newContract.signDate;
    if (newContract.startDate) payload.startDate = newContract.startDate;
    if (newContract.endDate) payload.endDate = newContract.endDate;
    if (newContract.notes.trim()) payload.notes = newContract.notes.trim();
    createMutation.mutate(payload);
  };

  const formatAmount = (amount: string | null, currency: string | null) => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    const prefix = currency === "EUR" ? "\u20AC" : currency === "USD" ? "$" : "\u00A5";
    return `${prefix}${num.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileCheck}
        title="合同管理"
        description="合同全生命周期管理 - 创建、文档上传、AI智能分析"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />新建合同</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>新建合同</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <Label>合同标题 *</Label>
                  <Input value={newContract.title} onChange={e => setNewContract({ ...newContract, title: e.target.value })} placeholder="输入合同标题" />
                </div>
                <div className="space-y-2">
                  <Label>客户</Label>
                  <Select value={newContract.customerId ? String(newContract.customerId) : "none"} onValueChange={v => setNewContract({ ...newContract, customerId: v === "none" ? undefined : Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="选择客户" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不关联客户</SelectItem>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>合同类型</Label>
                  <Select value={newContract.type} onValueChange={v => setNewContract({ ...newContract, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">销售合同</SelectItem>
                      <SelectItem value="service">服务合同</SelectItem>
                      <SelectItem value="framework">框架协议</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>合同金额</Label>
                  <Input value={newContract.amount} onChange={e => setNewContract({ ...newContract, amount: e.target.value })} placeholder="例如 1000000" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>币种</Label>
                  <Select value={newContract.currency} onValueChange={v => setNewContract({ ...newContract, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">CNY (人民币)</SelectItem>
                      <SelectItem value="USD">USD (美元)</SelectItem>
                      <SelectItem value="EUR">EUR (欧元)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>签署日期</Label>
                  <Input type="date" value={newContract.signDate} onChange={e => setNewContract({ ...newContract, signDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input type="date" value={newContract.startDate} onChange={e => setNewContract({ ...newContract, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input type="date" value={newContract.endDate} onChange={e => setNewContract({ ...newContract, endDate: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>备注</Label>
                  <Textarea value={newContract.notes} onChange={e => setNewContract({ ...newContract, notes: e.target.value })} placeholder="备注信息" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "创建中..." : "创建合同"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileCheck} label="合同总数" value={stats?.total ?? 0} />
        <StatCard icon={DollarSign} label="合同总额(CNY)" value={stats?.totalAmount ? `¥${Number(stats.totalAmount).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}` : "¥0"} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Clock} label="履行中" value={stats?.activeCount ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="即将到期" value={stats?.expiringCount ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索合同编号或标题..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="合同类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="sales">销售合同</SelectItem>
                <SelectItem value="service">服务合同</SelectItem>
                <SelectItem value="framework">框架协议</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="pending_approval">待审批</SelectItem>
                <SelectItem value="active">履行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="terminated">已终止</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contract Table */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">合同列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : contractItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileCheck className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">暂无合同数据</p>
              <p className="text-sm mt-1">点击"新建合同"创建第一份合同</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同编号</TableHead>
                  <TableHead>合同标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>签署日期</TableHead>
                  <TableHead>到期日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractItems.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.contractCode}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{CONTRACT_TYPES[c.type] || c.type}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatAmount(c.amount, c.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[c.status] || "secondary"}>
                        {CONTRACT_STATUSES[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.signDate || "-"}</TableCell>
                    <TableCell className="text-sm">{c.endDate || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedContract(c); setIsDetailOpen(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("确定删除此合同?")) deleteMutation.mutate({ id: c.id }); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedContract && (
        <ContractDetailDialog
          contract={selectedContract}
          open={isDetailOpen}
          onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setSelectedContract(null); }}
        />
      )}
    </div>
  );
}

// ============================================================
// Contract Detail Dialog (Tabs: Info / Documents / AI Analysis)
// ============================================================

function ContractDetailDialog({ contract, open, onOpenChange }: {
  contract: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{contract.contractCode}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            {contract.title}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="documents">文档管理</TabsTrigger>
            <TabsTrigger value="analysis">AI分析</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-4 mt-4">
            <ContractInfoTab contract={contract} />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <DocumentsTab contractId={contract.id} />
          </TabsContent>
          <TabsContent value="analysis" className="mt-4">
            <AnalysisTab contractId={contract.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Tab 1: Contract Info
// ============================================================

function ContractInfoTab({ contract }: { contract: any }) {
  const formatAmount = (amount: string | null, currency: string | null) => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    const prefix = currency === "EUR" ? "\u20AC" : currency === "USD" ? "$" : "\u00A5";
    return `${prefix}${num.toLocaleString("zh-CN")}`;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-muted-foreground">合同编号</Label>
        <p className="font-mono">{contract.contractCode}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">合同类型</Label>
        <p>{CONTRACT_TYPES[contract.type] || contract.type}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">合同金额</Label>
        <p className="text-lg font-bold">{formatAmount(contract.amount, contract.currency)}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">状态</Label>
        <p><Badge variant={STATUS_VARIANTS[contract.status] || "secondary"}>{CONTRACT_STATUSES[contract.status] || contract.status}</Badge></p>
      </div>
      <div>
        <Label className="text-muted-foreground">签署日期</Label>
        <p>{contract.signDate || "-"}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">开始日期</Label>
        <p>{contract.startDate || "-"}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">结束日期</Label>
        <p>{contract.endDate || "-"}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">创建时间</Label>
        <p className="text-sm">{contract.createdAt ? new Date(contract.createdAt).toLocaleString("zh-CN") : "-"}</p>
      </div>
      <div className="col-span-2">
        <Label className="text-muted-foreground">备注</Label>
        <p className="whitespace-pre-wrap">{contract.notes || "-"}</p>
      </div>
    </div>
  );
}

// ============================================================
// Tab 2: Document Upload & Management
// ============================================================

function DocumentsTab({ contractId }: { contractId: number }) {
  const [uploadDocType, setUploadDocType] = useState<string>("other");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, refetch } = (trpc.contract as any).getDocuments.useQuery({ contractId });

  const uploadMutation = (trpc.contract as any).uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("文档上传成功");
      refetch();
      setIsUploading(false);
    },
    onError: (err: any) => {
      toast.error(`上传失败: ${err.message}`);
      setIsUploading(false);
    },
  });

  const deleteMutation = (trpc.contract as any).deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("文档已删除");
      refetch();
    },
    onError: (err: any) => toast.error(`删除失败: ${err.message}`),
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("文件大小不能超过50MB");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        contractId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        docType: uploadDocType,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [contractId, uploadDocType, uploadMutation]);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={uploadDocType} onValueChange={setUploadDocType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {isUploading ? "上传中..." : "选择文件上传"}
            </Button>
            <span className="text-xs text-muted-foreground">支持PDF、Word、Excel、图片等，最大50MB</span>
          </div>
        </CardContent>
      </Card>

      {/* Document list */}
      {!documents || documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>暂无文档，请上传文件</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="mr-2 text-xs">{DOC_TYPES[doc.docType] || doc.docType}</Badge>
                  {formatSize(doc.fileSize)} · {doc.createdAt ? new Date(doc.createdAt).toLocaleString("zh-CN") : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`/api/contract-documents/${doc.id}/download`} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
                <DocumentAnalyzeButton documentId={doc.id} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("确定删除此文档?")) deleteMutation.mutate({ id: doc.id }); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AI Analyze Button (per document)
// ============================================================

function DocumentAnalyzeButton({ documentId }: { documentId: number }) {
  const analyzeMutation = (trpc.contract as any).analyzeDocument.useMutation({
    onSuccess: () => toast.success("AI分析完成"),
    onError: (err: any) => toast.error(`分析失败: ${err.message}`),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={analyzeMutation.isPending}
      onClick={() => analyzeMutation.mutate({ documentId })}
      title="AI分析"
    >
      {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4 text-purple-500" />}
    </Button>
  );
}

// ============================================================
// Tab 3: AI Analysis Results
// ============================================================

function AnalysisTab({ contractId }: { contractId: number }) {
  const { data: analyses, refetch } = (trpc.contract as any).getAnalysesByContract.useQuery({ contractId });

  const applyMutation = (trpc.contract as any).applyAnalysis.useMutation({
    onSuccess: () => {
      toast.success("分析结果已标记为已采纳");
      refetch();
    },
    onError: (err: any) => toast.error(`操作失败: ${err.message}`),
  });

  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>暂无AI分析结果</p>
        <p className="text-sm mt-1">请先上传文档并点击AI分析按钮</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis: any) => {
        const reqs = analysis.extractedRequirements as any;
        const isApplied = analysis.status === "applied";
        const isFailed = analysis.status === "failed";

        return (
          <Card key={analysis.id} className={isFailed ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={isFailed ? "destructive" : isApplied ? "default" : "secondary"}>
                    {isFailed ? "分析失败" : isApplied ? "已采纳" : analysis.status === "completed" ? "已完成" : analysis.status === "processing" ? "分析中" : "待分析"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {analysis.createdAt ? new Date(analysis.createdAt).toLocaleString("zh-CN") : ""}
                  </span>
                </div>
                {analysis.status === "completed" && (
                  <Button size="sm" variant="outline" onClick={() => applyMutation.mutate({ analysisId: analysis.id, userId: 1 })}>
                    <CheckCircle className="w-4 h-4 mr-1" /> 应用到系统
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isFailed ? (
                <p className="text-sm text-destructive">{analysis.rawResponse || "分析过程中发生错误"}</p>
              ) : reqs ? (
                <>
                  {reqs.summary && (
                    <div>
                      <Label className="text-muted-foreground">文档摘要</Label>
                      <p className="text-sm">{reqs.summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ModuleCard title="客户合同条款" icon="📋" data={reqs.contract_terms} fields={[
                      ["payment_terms", "付款条件"], ["delivery_terms", "交货条件"],
                      ["warranty_terms", "保修条款"], ["penalty_terms", "违约责任"],
                    ]} />
                    <ModuleCard title="设备配置建议" icon="⚙️" data={reqs.configuration} fields={[
                      ["equipment_model", "设备型号"], ["process_params", "工艺参数"],
                      ["automation_level", "自动化程度"],
                    ]} />
                    <ModuleCard title="项目参数" icon="📅" data={reqs.project_params} fields={[
                      ["timeline", "项目周期"], ["milestones", "里程碑"],
                      ["acceptance_criteria", "验收标准"],
                    ]} />
                    <ModuleCard title="质量规格" icon="🔬" data={reqs.quality_specs} fields={[
                      ["cleanliness_standard", "清洁度标准"], ["inspection_method", "检测方法"],
                      ["pass_rate", "合格率"],
                    ]} />
                    <ModuleCard title="交付要求" icon="🚛" data={reqs.delivery} fields={[
                      ["delivery_location", "交货地点"], ["packaging", "包装"],
                      ["transport", "运输"], ["installation", "安装调试"],
                    ]} />
                  </div>

                  {reqs.risks?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 风险提示</Label>
                      <ul className="text-sm space-y-1 mt-1">
                        {reqs.risks.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reqs.recommendations?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">建议操作</Label>
                      <ul className="text-sm space-y-1 mt-1">
                        {reqs.recommendations.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">分析中...</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// Module Card for AI Analysis display
// ============================================================

function ModuleCard({ title, icon, data, fields }: {
  title: string;
  icon: string;
  data: any;
  fields: [string, string][];
}) {
  if (!data) return null;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="font-medium text-sm">{icon} {title}</p>
      {fields.map(([key, label]) => (
        <div key={key}>
          <span className="text-xs text-muted-foreground">{label}:</span>
          <p className="text-sm">{data[key] || "-"}</p>
        </div>
      ))}
    </div>
  );
}
