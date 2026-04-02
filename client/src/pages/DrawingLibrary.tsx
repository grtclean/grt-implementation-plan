import { useState, FormEvent } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  FileImage,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle2,
  Eye,
  Archive,
  FileType,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DRAWING_TYPES = [
  "mechanical",
  "electrical",
  "pneumatic",
  "hydraulic",
  "piping",
  "assembly",
  "detail",
  "layout",
  "schematic",
  "wiring",
  "eplan",
] as const;

const STATUSES = ["draft", "in_review", "approved", "released", "obsolete"] as const;

const FILE_FORMATS = ["dwg", "dxf", "pdf", "sldprt", "sldasm", "step", "igs", "eplan"] as const;

type DrawingType = (typeof DRAWING_TYPES)[number];
type DrawingStatus = (typeof STATUSES)[number];

const TYPE_COLORS: Record<DrawingType, string> = {
  mechanical: "bg-blue-100 text-blue-800",
  electrical: "bg-yellow-100 text-yellow-800",
  pneumatic: "bg-green-100 text-green-800",
  hydraulic: "bg-cyan-100 text-cyan-800",
  piping: "bg-orange-100 text-orange-800",
  assembly: "bg-purple-100 text-purple-800",
  detail: "bg-pink-100 text-pink-800",
  layout: "bg-indigo-100 text-indigo-800",
  schematic: "bg-teal-100 text-teal-800",
  wiring: "bg-rose-100 text-rose-800",
  eplan: "bg-emerald-100 text-emerald-800",
};

const STATUS_COLORS: Record<DrawingStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  released: "bg-green-100 text-green-800",
  obsolete: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<DrawingStatus, string> = {
  draft: "草稿",
  in_review: "审核中",
  approved: "已批准",
  released: "已发布",
  obsolete: "已废弃",
};

interface DrawingItem {
  id: number;
  drawingNumber: string;
  title: string;
  drawingType: DrawingType;
  status: DrawingStatus;
  version: string;
  revision: number;
  designer: string;
  productCode?: string | null;
  projectNumber?: string | null;
  fileFormat?: string | null;
  description?: string | null;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DrawingLibrary() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productCodeFilter, setProductCodeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    drawingNumber: "",
    title: "",
    drawingType: "mechanical" as DrawingType,
    fileFormat: "",
    version: "A.1",
    productCode: "",
    projectNumber: "",
    designer: "",
    description: "",
    tags: "",
  });

  // Queries
  const statsQuery = trpc.drawingLibrary.getStats.useQuery();
  const listQuery = trpc.drawingLibrary.list.useQuery({
    search: search || undefined,
    drawingType: typeFilter !== "all" ? (typeFilter as DrawingType) : undefined,
    status: statusFilter !== "all" ? (statusFilter as DrawingStatus) : undefined,
    productCode: productCodeFilter || undefined,
  });

  const revisionsQuery = trpc.drawingLibrary.getRevisions.useQuery(
    { drawingId: expandedId! },
    { enabled: !!expandedId }
  );

  const relationsQuery = trpc.drawingLibrary.getRelations.useQuery(
    { drawingId: expandedId! },
    { enabled: !!expandedId }
  );

  const createMutation = trpc.drawingLibrary.create.useMutation({
    onSuccess: () => {
      toast({ title: "图纸创建成功", description: "新图纸已添加到图纸库" });
      setCreateOpen(false);
      resetForm();
      listQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast({ title: "创建失败", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = trpc.drawingLibrary.changeStatus.useMutation({
    onSuccess: () => {
      toast({ title: "状态更新成功" });
      listQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast({ title: "状态更新失败", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({
      drawingNumber: "",
      title: "",
      drawingType: "mechanical",
      fileFormat: "",
      version: "A.1",
      productCode: "",
      projectNumber: "",
      designer: "",
      description: "",
      tags: "",
    });
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      drawingNumber: formData.drawingNumber,
      title: formData.title,
      drawingType: formData.drawingType,
      fileFormat: formData.fileFormat || undefined,
      version: formData.version || "A.1",
      productCode: formData.productCode || undefined,
      projectNumber: formData.projectNumber || undefined,
      designer: formData.designer,
      description: formData.description || undefined,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
  }

  function handleStatusChange(drawingId: number, newStatus: DrawingStatus) {
    updateStatusMutation.mutate({ id: drawingId, newStatus });
  }

  const stats = statsQuery.data;
  const drawings: DrawingItem[] = ((listQuery.data as any)?.items as DrawingItem[]) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileImage className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BDO 图纸管理</h1>
            <p className="text-sm text-muted-foreground">
              Drawing Library — 设计图纸版本管理与追溯
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建图纸
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">图纸总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              已发布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats?.byStatus?.find((s: any) => s.status === "released")?.count ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-amber-600" />
              审核中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats?.byStatus?.find((s: any) => s.status === "in_review")?.count ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              近7天新增
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats?.recentMonth ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索图纸号/名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="图纸类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {DRAWING_TYPES.map((dt) => (
              <SelectItem key={dt} value={dt}>
                {dt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="产品编码"
          value={productCodeFilter}
          onChange={(e) => setProductCodeFilter(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Drawing Grid */}
      {listQuery.isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : drawings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileImage className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>暂无图纸数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drawings.map((dwg) => {
            const isExpanded = expandedId === dwg.id;
            return (
              <Card
                key={dwg.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${isExpanded ? "ring-2 ring-primary/30" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : dwg.id)}
              >
                <CardContent className="pt-4 pb-3 space-y-2">
                  {/* Top line */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm truncate">{dwg.drawingNumber}</p>
                      <p className="text-sm mt-0.5 truncate">{dwg.title}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={TYPE_COLORS[dwg.drawingType]}>
                      {dwg.drawingType}
                    </Badge>
                    <Badge variant="outline" className={STATUS_COLORS[dwg.status]}>
                      {STATUS_LABELS[dwg.status]}
                    </Badge>
                    {dwg.fileFormat && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        <FileType className="h-3 w-3 mr-0.5" />
                        {dwg.fileFormat}
                      </Badge>
                    )}
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {dwg.version} Rev.{dwg.revision}
                    </span>
                    <span>{dwg.designer}</span>
                    {dwg.productCode && (
                      <span className="font-mono text-primary/70">{dwg.productCode}</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {new Date(dwg.createdAt).toLocaleDateString("zh-CN")}
                  </p>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className="pt-3 mt-2 border-t space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Full metadata */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {dwg.projectNumber && (
                          <div>
                            <span className="text-muted-foreground">项目号: </span>
                            <span className="font-mono">{dwg.projectNumber}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">更新时间: </span>
                          <span>{new Date(dwg.updatedAt).toLocaleDateString("zh-CN")}</span>
                        </div>
                        {dwg.description && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">描述: </span>
                            <span>{dwg.description}</span>
                          </div>
                        )}
                        {dwg.tags && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">标签: </span>
                            {dwg.tags.split(",").map((tag, i) => (
                              <Badge key={i} variant="secondary" className="mr-1 text-[10px]">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Revision history */}
                      {revisionsQuery.data && (revisionsQuery.data as unknown[]).length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">版本历史</p>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {(
                              revisionsQuery.data as Array<{
                                id: number;
                                version: string;
                                revision: number;
                                changedBy: string | null;
                                changeDescription: string | null;
                                createdAt: Date;
                              }>
                            ).map((rev) => (
                              <div
                                key={rev.id}
                                className="text-xs flex items-center gap-2 text-muted-foreground"
                              >
                                <span className="font-mono">
                                  {rev.version} Rev.{rev.revision}
                                </span>
                                <span>{rev.changedBy}</span>
                                {rev.changeDescription && <span className="truncate">{rev.changeDescription}</span>}
                                <span className="ml-auto">
                                  {new Date(rev.createdAt).toLocaleDateString("zh-CN")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Relations */}
                      {relationsQuery.data && (relationsQuery.data as unknown[]).length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">关联关系</p>
                          <div className="space-y-1">
                            {(
                              relationsQuery.data as Array<{
                                id: number;
                                relationType: string;
                                relatedEntityId: number | null;
                                relatedEntityCode: string | null;
                                notes: string | null;
                              }>
                            ).map((rel) => (
                              <div
                                key={rel.id}
                                className="text-xs flex items-center gap-2 text-muted-foreground"
                              >
                                <Badge variant="outline" className="text-[10px]">
                                  {rel.relationType}
                                </Badge>
                                <span>{rel.relatedEntityCode ?? String(rel.relatedEntityId ?? "")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {dwg.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(dwg.id, "in_review")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            审核
                          </Button>
                        )}
                        {dwg.status === "in_review" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(dwg.id, "approved")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            批准
                          </Button>
                        )}
                        {dwg.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusChange(dwg.id, "released")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            发布
                          </Button>
                        )}
                        {dwg.status !== "obsolete" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleStatusChange(dwg.id, "obsolete")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" />
                            废弃
                          </Button>
                        )}
                      </div>

                      {/* Quick links */}
                      <div className="flex gap-3 text-xs">
                        <a
                          href="/bom-management"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          关联BOM
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href="/projects"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          关联项目
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href="/pdm"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          PDM
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              新建图纸
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                图纸号 <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="DWG-USC15-M-001"
                value={formData.drawingNumber}
                onChange={(e) => setFormData((p) => ({ ...p, drawingNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                名称 <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="图纸名称"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  类型 <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.drawingType}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, drawingType: v as DrawingType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRAWING_TYPES.map((dt) => (
                      <SelectItem key={dt} value={dt}>
                        {dt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">文件格式</label>
                <Select
                  value={formData.fileFormat}
                  onValueChange={(v) => setFormData((p) => ({ ...p, fileFormat: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择格式" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">版本</label>
                <Input
                  placeholder="A.1"
                  value={formData.version}
                  onChange={(e) => setFormData((p) => ({ ...p, version: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">设计者</label>
                <Input
                  placeholder="设计者姓名"
                  value={formData.designer}
                  onChange={(e) => setFormData((p) => ({ ...p, designer: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">产品编码</label>
                <Input
                  placeholder="关联产品编码"
                  value={formData.productCode}
                  onChange={(e) => setFormData((p) => ({ ...p, productCode: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">项目号</label>
                <Input
                  placeholder="关联项目号"
                  value={formData.projectNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, projectNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                placeholder="图纸描述..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <Input
                placeholder="逗号分隔，如: 汽车,底盘,焊接"
                value={formData.tags}
                onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "提交中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
