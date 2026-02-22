/**
 * BOM管理页面 (TX-005)
 * 物料清单管理、BOM版本、成本估算
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Package, Plus, Search, Upload, Download, Building2, DollarSign, Layers, Loader2 } from "lucide-react";

const statusColorMap = createStatusColorMap({
  "已发布": "green",
  "审核中": "orange",
  "编制中": "blue",
  "已批准": "green",
  "草稿": "gray",
  "已废弃": "red",
  "已替代": "yellow",
});

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  pending_review: "审核中",
  approved: "已批准",
  active: "已发布",
  superseded: "已替代",
  obsolete: "已废弃",
};

const BOM_TYPE_LABELS: Record<string, string> = {
  manufacturing: "制造BOM",
  engineering: "工程BOM",
  sales: "销售BOM",
  template: "模板BOM",
};

const BU_LABELS: Record<string, string> = {
  BU1: "海外",
  BU2: "商用车",
  BU3: "乘用车",
  BU4: "半导体",
  BU5: "工业通用",
};

export default function BomManagement() {
  const { currentBU } = useUserProfile();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Form state for create dialog
  const [formProductCode, setFormProductCode] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formBomType, setFormBomType] = useState<string>("manufacturing");
  const [formBuCode, setFormBuCode] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");

  // tRPC queries
  const { data: statsData } = trpc.bom.getStats.useQuery();

  const { data: bomData, isLoading: bomsLoading } = trpc.bom.getBomMasters.useQuery({
    search: search || undefined,
    buCode: currentBU || undefined,
    page,
    pageSize: 20,
  });

  // tRPC mutation
  const utils = trpc.useUtils();

  const createBomMutation = trpc.bom.createBomMaster.useMutation({
    onSuccess: () => {
      toast.success("BOM创建成功");
      setCreateDialogOpen(false);
      resetForm();
      utils.bom.getBomMasters.invalidate();
      utils.bom.getStats.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const resetForm = () => {
    setFormProductCode("");
    setFormProductName("");
    setFormBomType("manufacturing");
    setFormBuCode("");
    setFormDescription("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductCode.trim() || !formProductName.trim()) {
      toast.error("产品编码和产品名称为必填项");
      return;
    }
    createBomMutation.mutate({
      productCode: formProductCode.trim(),
      productName: formProductName.trim(),
      bomType: formBomType as "manufacturing" | "engineering" | "sales" | "template",
      buCode: formBuCode ? (formBuCode as "BU1" | "BU2" | "BU3" | "BU4" | "BU5") : undefined,
      description: formDescription.trim() || undefined,
    });
  };

  const items = bomData?.items ?? [];
  const total = bomData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const formatCost = (materialCost: string | null, laborCost: string | null, overheadCost: string | null) => {
    const m = parseFloat(materialCost || "0") || 0;
    const l = parseFloat(laborCost || "0") || 0;
    const o = parseFloat(overheadCost || "0") || 0;
    const sum = m + l + o;
    if (sum >= 1000000) {
      return `¥${(sum / 1000000).toFixed(2)}M`;
    }
    if (sum >= 1000) {
      return `¥${(sum / 1000).toFixed(1)}K`;
    }
    return `¥${sum.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="BOM管理"
        description="TX-005 · 物料清单管理与成本估算"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{BU_LABELS[currentBU] || currentBU}</Badge>}
            <Button onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />新建BOM</Button>
            <Button variant="outline" onClick={() => toast.info("导入功能开发中")}><Upload className="h-4 w-4 mr-2" />导入</Button>
            <Button variant="outline" onClick={() => toast.info("导出功能开发中")}><Download className="h-4 w-4 mr-2" />导出</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Layers} label="BOM总数" value={statsData?.total ?? 0} />
        <StatCard icon={Package} label="物料种类" value={statsData?.totalItems ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={DollarSign} label="已发布BOM" value={statsData?.active ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>BOM列表 {total > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">共 {total} 条</span>}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索产品编码/名称..."
                className="pl-9 w-64"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bomsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((b) => {
                const statusLabel = STATUS_LABELS[b.status] ?? b.status;
                const statusColor = statusColorMap[statusLabel as keyof typeof statusColorMap] ?? "gray";
                return (
                  <div key={b.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                    <Layers className="h-10 w-10 text-primary/20" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">{b.productCode}</span>
                        {b.buCode && <Badge variant="outline">{BU_LABELS[b.buCode] || b.buCode}</Badge>}
                        <Badge variant="secondary">V{b.currentVersion}</Badge>
                        <Badge variant="outline" className="text-xs">{BOM_TYPE_LABELS[b.bomType] || b.bomType}</Badge>
                      </div>
                      <p className="font-medium mt-1">{b.productName}</p>
                      {b.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{b.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <StatusBadge color={statusColor}>{statusLabel}</StatusBadge>
                      <p className="text-sm font-medium mt-1">
                        {formatCost(b.totalMaterialCost, b.totalLaborCost, b.totalOverheadCost)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">暂无BOM数据</p>
                  <p className="text-sm mt-1">点击"新建BOM"创建第一条物料清单</p>
                </div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create BOM Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建BOM</DialogTitle>
            <DialogDescription>创建新的物料清单主记录</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCode">产品编码 <span className="text-red-500">*</span></Label>
                <Input
                  id="productCode"
                  placeholder="例: PRD-001"
                  value={formProductCode}
                  onChange={e => setFormProductCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productName">产品名称 <span className="text-red-500">*</span></Label>
                <Input
                  id="productName"
                  placeholder="例: 缸体清洗线"
                  value={formProductName}
                  onChange={e => setFormProductName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bomType">BOM类型</Label>
                <Select value={formBomType} onValueChange={setFormBomType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择BOM类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturing">制造BOM</SelectItem>
                    <SelectItem value="engineering">工程BOM</SelectItem>
                    <SelectItem value="sales">销售BOM</SelectItem>
                    <SelectItem value="template">模板BOM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buCode">所属事业部</Label>
                <Select value={formBuCode} onValueChange={setFormBuCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择事业部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BU1">BU1 - 海外</SelectItem>
                    <SelectItem value="BU2">BU2 - 商用车</SelectItem>
                    <SelectItem value="BU3">BU3 - 乘用车</SelectItem>
                    <SelectItem value="BU4">BU4 - 半导体</SelectItem>
                    <SelectItem value="BU5">BU5 - 工业通用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                placeholder="BOM描述信息（可选）"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={createBomMutation.isPending}>
                {createBomMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                创建BOM
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
