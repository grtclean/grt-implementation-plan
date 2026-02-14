import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Clock, RefreshCw, Download, Package,
  ArrowRight, List, History, FileText
} from "lucide-react";

const PROCESS_NAMES: Record<string, string> = {
  T1: '机加工', T2: '冷作', T3: '机械部件装配', T4: '机械装配', T5: '机械总装',
  T6: '电气装配', T7: '设备调试', T8: '跑和', T9: '包装', T10: '发货',
  T11: '卸车', T12: '就位', T13: '水电气连接', T14: '现场调试', T15: '终验收',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-green-500/20", text: "text-green-400", label: "已完成" },
  partial: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "部分导入" },
  failed: { bg: "bg-red-500/20", text: "text-red-400", label: "导入失败" },
  processing: { bg: "bg-blue-500/20", text: "text-blue-400", label: "处理中" },
};

export default function BomImport() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("import");
  const [selectedProject] = useState("PRJ-2026-001");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Import form state
  const [importForm, setImportForm] = useState({
    processCode: "T4",
    source: "manual" as string,
    csvData: "",
  });

  // Queries
  const importHistoryQuery = (trpc.bomImport as any).getImportHistory.useQuery({
    projectId: selectedProject,
    limit: 50,
  });
  const statsQuery = (trpc.bomImport as any).getImportStats.useQuery({
    projectId: selectedProject,
  });

  // Mutations
  const batchImportMutation = (trpc.bomImport as any).batchImport.useMutation({
    onSuccess: (data) => {
      toast({
        title: "导入完成",
        description: `成功: ${data.successCount}, 失败: ${data.failedCount}, 跳过: ${data.skippedCount}`,
      });
      importHistoryQuery.refetch();
      statsQuery.refetch();
      setShowImportDialog(false);
    },
    onError: (err) => toast({ title: "导入失败", description: err.message, variant: "destructive" }),
  });

  const downloadTemplateMutation = (trpc.bomImport as any).downloadTemplate.useMutation({
    onSuccess: (data) => {
      // Create and download CSV file
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bom_template_${importForm.processCode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "成功", description: "模板已下载" });
    },
    onError: (err) => toast({ title: "错误", description: err.message, variant: "destructive" }),
  });

  const history = (importHistoryQuery.data ?? []) as any[];
  const stats = (statsQuery.data ?? {}) as any;

  // Parse CSV data into items
  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        materialCode: cols[0] || '',
        materialName: cols[1] || '',
        specification: cols[2] || '',
        unit: cols[3] || '个',
        requiredQty: Number(cols[4]) || 1,
        category: cols[5] || 'standard',
      };
    }).filter(item => item.materialCode && item.materialName);
  };

  const handleImport = () => {
    const items = parseCSV(importForm.csvData);
    if (items.length === 0) {
      toast({ title: "错误", description: "请输入有效的CSV数据（至少包含物料编码和名称）", variant: "destructive" });
      return;
    }
    batchImportMutation.mutate({
      projectId: selectedProject,
      processCode: importForm.processCode,
      source: importForm.source,
      items,
    });
  };

  return (
    <Layout>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Database}
        title="BOM数据批量导入"
        description="从ERP/简道云/CSV批量导入BOM清单 · 自动关联BOM校验模块"
        actions={
          <>
            <Button variant="outline" onClick={() => importHistoryQuery.refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> 刷新
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadTemplateMutation.mutate({ processCode: importForm.processCode })}
            >
              <Download className="w-4 h-4 mr-2" /> 下载模板
            </Button>
            <Button onClick={() => setShowImportDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Upload className="w-4 h-4 mr-2" /> 批量导入
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={History} label="总导入次数" value={stats.totalImports ?? 0} iconColor="text-emerald-400" iconBg="bg-emerald-500/20" />
        <StatCard icon={CheckCircle2} label="成功导入项" value={stats.totalSuccess ?? 0} iconColor="text-green-400" iconBg="bg-green-500/20" />
        <StatCard icon={XCircle} label="失败项" value={stats.totalFailed ?? 0} iconColor="text-red-400" iconBg="bg-red-500/20" />
        <StatCard icon={Package} label="覆盖工序数" value={stats.processCount ?? 0} iconColor="text-blue-400" iconBg="bg-blue-500/20" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="import"><Upload className="w-4 h-4 mr-1" /> 导入操作</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> 导入历史</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                CSV数据导入
              </CardTitle>
              <CardDescription>
                将BOM清单数据粘贴到下方文本框，格式：物料编码,物料名称,规格,单位,需求数量,类别
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>目标工序</Label>
                  <Select value={importForm.processCode} onValueChange={(v) => setImportForm(p => ({ ...p, processCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROCESS_NAMES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>数据来源</Label>
                  <Select value={importForm.source} onValueChange={(v) => setImportForm(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">手动输入</SelectItem>
                      <SelectItem value="erp">ERP导出</SelectItem>
                      <SelectItem value="jiandaoyun">简道云导出</SelectItem>
                      <SelectItem value="excel">Excel导出</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>CSV数据</Label>
                <Textarea
                  value={importForm.csvData}
                  onChange={(e) => setImportForm(p => ({ ...p, csvData: e.target.value }))}
                  rows={10}
                  placeholder={`物料编码,物料名称,规格,单位,需求数量,类别\nMAT-001,螺栓M10x30,M10x30,个,24,standard\nMAT-002,密封圈DN50,DN50,个,8,critical\nMAT-003,轴承6205,6205-2RS,个,4,standard`}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {importForm.csvData ? `预览: ${parseCSV(importForm.csvData).length} 条记录` : '请粘贴CSV数据'}
                </p>
                <Button
                  onClick={handleImport}
                  disabled={batchImportMutation.isPending || !importForm.csvData}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {batchImportMutation.isPending ? "导入中..." : "开始导入"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Guide */}
          <Card className="bg-card/30 border-border">
            <CardHeader>
              <CardTitle className="text-base">导入说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. <strong className="text-foreground">CSV格式</strong>：第一行为表头，后续每行为一条物料记录，字段用逗号分隔</p>
              <p>2. <strong className="text-foreground">必填字段</strong>：物料编码（materialCode）、物料名称（materialName）</p>
              <p>3. <strong className="text-foreground">可选字段</strong>：规格（specification）、单位（unit，默认"个"）、需求数量（requiredQty，默认1）、类别（category，默认"standard"）</p>
              <p>4. <strong className="text-foreground">类别选项</strong>：standard（标准件）、critical（关键件）、custom（定制件）</p>
              <p>5. <strong className="text-foreground">去重规则</strong>：相同工序+物料编码的记录会被跳过（不重复导入）</p>
              <p>6. 导入成功后，数据将自动关联到BOM校验模块，可在"BOM校验管理"页面查看</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">导入历史记录</h3>
          {history.length === 0 ? (
            <Card className="bg-card/30 border-dashed border-border">
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">暂无导入记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((record: any) => {
                const status = STATUS_STYLES[record.status] || STATUS_STYLES.completed;
                return (
                  <Card key={record.id} className="bg-card/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${status.bg}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {record.process_code} ({PROCESS_NAMES[record.process_code] || ''})
                              <span className="text-muted-foreground ml-2">来源: {record.source}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              总计: {record.total_items} · 成功: {record.success_count} · 失败: {record.failed_count} · 跳过: {record.skipped_count}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${status.bg} ${status.text} border-0`}>{status.label}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.created_at ? new Date(Number(record.created_at)).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                      {record.error_details && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300 max-h-20 overflow-auto">
                          {record.error_details}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import Dialog (for quick access) */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>快速BOM导入</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>目标工序</Label>
                <Select value={importForm.processCode} onValueChange={(v) => setImportForm(p => ({ ...p, processCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROCESS_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>数据来源</Label>
                <Select value={importForm.source} onValueChange={(v) => setImportForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动输入</SelectItem>
                    <SelectItem value="erp">ERP导出</SelectItem>
                    <SelectItem value="jiandaoyun">简道云导出</SelectItem>
                    <SelectItem value="excel">Excel导出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>CSV数据</Label>
              <Textarea
                value={importForm.csvData}
                onChange={(e) => setImportForm(p => ({ ...p, csvData: e.target.value }))}
                rows={8}
                placeholder="物料编码,物料名称,规格,单位,需求数量,类别"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button
              onClick={handleImport}
              disabled={batchImportMutation.isPending || !importForm.csvData}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {batchImportMutation.isPending ? "导入中..." : "开始导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}
