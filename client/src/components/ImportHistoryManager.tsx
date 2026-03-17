/**
 * 导入历史管理组件
 * 记录每次导入的文件、时间、结果，支持查看和回滚
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  History,
  FileUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  Download,
  Trash2,
  Clock,
  FileText,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { FeatureGuideDialog, importHistoryGuideSteps } from "./FeatureGuide";

// 导入类型映射
const IMPORT_TYPES: Record<string, { label: string; color: string }> = {
  lead: { label: "商机", color: "bg-blue-500" },
  customer: { label: "客户", color: "bg-green-500" },
  contact: { label: "联系人", color: "bg-purple-500" },
  project: { label: "项目", color: "bg-orange-500" },
  cost: { label: "成本", color: "bg-red-500" },
  other: { label: "其他", color: "bg-gray-500" },
};

// 状态映射
const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "等待中", icon: Clock, color: "text-yellow-500" },
  processing: { label: "处理中", icon: RefreshCw, color: "text-blue-500" },
  completed: { label: "已完成", icon: CheckCircle2, color: "text-green-500" },
  failed: { label: "失败", icon: XCircle, color: "text-red-500" },
  rolled_back: { label: "已回滚", icon: RotateCcw, color: "text-gray-500" },
};

interface ImportHistoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType?: string;
}

export default function ImportHistoryManager({
  open,
  onOpenChange,
  importType,
}: ImportHistoryManagerProps) {
  const [selectedType, setSelectedType] = useState<string>(importType || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);

  // 获取导入历史列表
  const { data: historyList, isLoading, refetch } = (trpc.importHistory.list as any).useQuery({
    importType: selectedType !== "all" ? selectedType as any : undefined,
    status: selectedStatus !== "all" ? selectedStatus as any : undefined,
    limit: 100,
  });

  // 获取统计数据
  const { data: stats } = (trpc.importHistory as any).getStats.useQuery({
    importType: selectedType !== "all" ? selectedType as any : undefined,
  });

  // 检查是否可以回滚
  const { data: canRollbackData } = (trpc.importHistory as any).canRollback.useQuery(
    { id: selectedRecord?.id || 0 },
    { enabled: !!selectedRecord?.id }
  );

  // 回滚mutation
  const rollbackMutation = (trpc.importHistory as any).rollback.useMutation({
    onSuccess: (result: any) => {
      if (result.success) {
        toast.success(result.message);
        setShowRollbackDialog(false);
        setSelectedRecord(null);
        refetch();
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => {
      toast.error("回滚失败: " + err.message);
    },
  });

  const handleRollback = () => {
    if (selectedRecord?.id) {
      rollbackMutation.mutate({ id: selectedRecord.id });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <FeatureGuideDialog
        featureKey="import_history"
        featureName="导入历史功能引导"
        steps={importHistoryGuideSteps}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              导入历史记录
            </DialogTitle>
          </DialogHeader>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-5 gap-3">
            <Card className="bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalImports}</div>
                <div className="text-xs text-muted-foreground">总导入次数</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalRows}</div>
                <div className="text-xs text-muted-foreground">总记录数</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.totalSuccess}</div>
                <div className="text-xs text-muted-foreground">成功导入</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.totalFailed}</div>
                <div className="text-xs text-muted-foreground">导入失败</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-500">{stats.totalSkipped}</div>
                <div className="text-xs text-muted-foreground">跳过记录</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">类型:</span>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {Object.entries(IMPORT_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">状态:</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* 历史列表 */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>文件名</TableHead>
                <TableHead className="w-20">类型</TableHead>
                <TableHead className="w-24">状态</TableHead>
                <TableHead className="w-32">导入结果</TableHead>
                <TableHead className="w-20">文件大小</TableHead>
                <TableHead className="w-36">导入时间</TableHead>
                <TableHead className="w-28">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    加载中...
                  </TableCell>
                </TableRow>
              ) : (historyList as any)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <FileUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    暂无导入记录
                  </TableCell>
                </TableRow>
              ) : (
                (historyList as any)?.map((record: any, index: number) => {
                  const typeInfo = IMPORT_TYPES[record.importType] || IMPORT_TYPES.other;
                  const statusInfo = STATUS_MAP[record.status] || STATUS_MAP.pending;
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[200px]" title={record.fileName}>
                            {record.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${typeInfo.color} text-white`}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm">{statusInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">{record.successCount}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-red-500">{record.failedCount}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-yellow-500">{record.skippedCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(record.fileSize)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(record.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {record.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-500 hover:text-orange-600"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowRollbackDialog(true);
                              }}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* 详情对话框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>导入详情</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">基本信息</TabsTrigger>
                  <TabsTrigger value="mapping">字段映射</TabsTrigger>
                  <TabsTrigger value="errors">错误日志</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">文件名</div>
                      <div className="font-medium">{selectedRecord.fileName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">文件大小</div>
                      <div className="font-medium">{formatFileSize(selectedRecord.fileSize)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">导入类型</div>
                      <div className="font-medium">{IMPORT_TYPES[selectedRecord.importType]?.label}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">状态</div>
                      <div className="font-medium">{STATUS_MAP[selectedRecord.status]?.label}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总记录数</div>
                      <div className="font-medium">{selectedRecord.totalRows}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">导入时间</div>
                      <div className="font-medium">
                        {format(new Date(selectedRecord.createdAt), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <Card className="bg-green-500/10">
                      <CardContent className="p-3 text-center">
                        <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <div className="text-xl font-bold text-green-500">{selectedRecord.successCount}</div>
                        <div className="text-xs text-muted-foreground">成功</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-500/10">
                      <CardContent className="p-3 text-center">
                        <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                        <div className="text-xl font-bold text-red-500">{selectedRecord.failedCount}</div>
                        <div className="text-xs text-muted-foreground">失败</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-500/10">
                      <CardContent className="p-3 text-center">
                        <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                        <div className="text-xl font-bold text-yellow-500">{selectedRecord.skippedCount}</div>
                        <div className="text-xs text-muted-foreground">跳过</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="mapping">
                  {selectedRecord.fieldMapping?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>源字段</TableHead>
                          <TableHead>目标字段</TableHead>
                          <TableHead>转换</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRecord.fieldMapping.map((mapping: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{mapping.sourceField}</TableCell>
                            <TableCell>{mapping.targetField}</TableCell>
                            <TableCell>{mapping.transform || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无字段映射信息
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="errors">
                  {selectedRecord.errorLog?.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">行号</TableHead>
                            <TableHead className="w-24">字段</TableHead>
                            <TableHead className="w-32">值</TableHead>
                            <TableHead>错误信息</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecord.errorLog.map((error: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{error.row}</TableCell>
                              <TableCell>{error.field || "-"}</TableCell>
                              <TableCell className="truncate max-w-[100px]" title={String(error.value)}>
                                {String(error.value) || "-"}
                              </TableCell>
                              <TableCell className="text-red-500">{error.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      没有错误记录
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* 回滚确认对话框 */}
        <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-500">
                <AlertTriangle className="w-5 h-5" />
                确认回滚
              </DialogTitle>
              <DialogDescription>
                此操作将删除本次导入的所有数据，且不可恢复。
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">将要回滚的导入:</div>
                  <div className="font-medium">{selectedRecord.fileName}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    共 {selectedRecord.successCount} 条成功导入的数据将被删除
                  </div>
                </div>
                {canRollbackData && !canRollbackData.canRollback && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                    {canRollbackData.reason}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleRollback}
                disabled={rollbackMutation.isPending || !canRollbackData?.canRollback}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {rollbackMutation.isPending ? "回滚中..." : "确认回滚"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
    </>
  );
}
