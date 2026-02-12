/**
 * 任务执行日志查看器组件
 * 展示Cron任务和手动任务的执行详情
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Timer,
  Play,
  RefreshCw,
  Download,
  Eye,
  Search,
  BarChart3,
  Trash2,
  FileText,
  Terminal,
  Zap,
} from "lucide-react";

// 任务类型映射
const TASK_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  cron: { label: "定时任务", icon: Clock, color: "bg-blue-500" },
  manual: { label: "手动触发", icon: Play, color: "bg-green-500" },
  webhook: { label: "Webhook", icon: Zap, color: "bg-purple-500" },
  system: { label: "系统任务", icon: Terminal, color: "bg-gray-500" },
};

// 状态映射
const STATUS_MAP: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  running: { label: "运行中", icon: RefreshCw, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  success: { label: "成功", icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
  failed: { label: "失败", icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  timeout: { label: "超时", icon: Timer, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  cancelled: { label: "已取消", icon: AlertTriangle, color: "text-gray-500", bgColor: "bg-gray-500/10" },
};

interface TaskExecutionLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
}

export default function TaskExecutionLogViewer({
  open,
  onOpenChange,
  taskId,
}: TaskExecutionLogViewerProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 获取执行日志列表
  const { data: logList, isLoading, refetch } = (trpc.taskExecutionLog.list as any).useQuery({
    taskId: taskId || undefined,
    taskType: selectedType !== "all" ? selectedType as any : undefined,
    status: selectedStatus !== "all" ? selectedStatus as any : undefined,
    taskName: searchKeyword || undefined,
    limit: 100,
  });

  // 获取统计数据
  const { data: stats } = (trpc.taskExecutionLog.getStats as any).useQuery({
    taskId: taskId || undefined,
    taskType: selectedType !== "all" ? selectedType as any : undefined,
  });

  // 清理旧日志
  const cleanupMutation = trpc.taskExecutionLog.cleanup.useMutation({
    onSuccess: (result) => {
      toast.success(`已清理 ${(result as any).deletedCount} 条旧日志`);
      refetch();
    },
    onError: (err) => {
      toast.error("清理失败: " + err.message);
    },
  });

  // 导出CSV
  const { data: csvData, refetch: exportCSV } = (trpc.taskExecutionLog.exportCSV as any).useQuery({
    taskId: taskId || undefined,
    taskType: selectedType !== "all" ? selectedType as any : undefined,
    status: selectedStatus !== "all" ? selectedStatus as any : undefined,
  }, { enabled: false });

  const handleExport = async () => {
    const result = await exportCSV();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `task-logs-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            任务执行日志
            {taskId && <Badge variant="outline">{taskId}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-6 gap-3">
            <Card className="bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{(stats as any).totalExecutions}</div>
                <div className="text-xs text-muted-foreground">总执行次数</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{(stats as any).successCount}</div>
                <div className="text-xs text-muted-foreground">成功</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{(stats as any).failedCount}</div>
                <div className="text-xs text-muted-foreground">失败</div>
              </CardContent>
            </Card>
            <Card className="bg-orange-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{(stats as any).timeoutCount}</div>
                <div className="text-xs text-muted-foreground">超时</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{(stats as any).successRate}%</div>
                <div className="text-xs text-muted-foreground">成功率</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-500">{formatDuration((stats as any).avgDuration)}</div>
                <div className="text-xs text-muted-foreground">平均耗时</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索任务名称..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">类型:</span>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {Object.entries(TASK_TYPES).map(([key, { label }]) => (
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
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => cleanupMutation.mutate({ daysToKeep: 30 })}
            disabled={cleanupMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清理30天前
          </Button>
        </div>

        {/* 日志列表 */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>任务名称</TableHead>
                <TableHead className="w-24">类型</TableHead>
                <TableHead className="w-28">状态</TableHead>
                <TableHead className="w-36">开始时间</TableHead>
                <TableHead className="w-24">耗时</TableHead>
                <TableHead className="w-20">重试</TableHead>
                <TableHead className="w-28">触发者</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    加载中...
                  </TableCell>
                </TableRow>
              ) : (logList as any)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    暂无执行日志
                  </TableCell>
                </TableRow>
              ) : (
                (logList as any)?.map((log: any, index: number) => {
                  const typeInfo = TASK_TYPES[log.taskType] || TASK_TYPES.system;
                  const statusInfo = STATUS_MAP[log.status] || STATUS_MAP.running;
                  const StatusIcon = statusInfo.icon;
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]" title={log.taskName}>
                            {log.taskName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">{log.taskId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${typeInfo.color} text-white`}>
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${statusInfo.bgColor}`}>
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${log.status === 'running' ? 'animate-spin' : ''}`} />
                          <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.startTime), "MM-dd HH:mm:ss", { locale: zhCN })}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatDuration(log.duration)}
                      </TableCell>
                      <TableCell>
                        {log.retryCount > 0 ? (
                          <Badge variant="outline" className="text-orange-500">
                            {log.retryCount}次
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[100px]" title={log.triggeredBy}>
                        {log.triggeredBy || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
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
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>执行详情</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
                <TabsList>
                  <TabsTrigger value="info">基本信息</TabsTrigger>
                  <TabsTrigger value="input">输入参数</TabsTrigger>
                  <TabsTrigger value="output">输出结果</TabsTrigger>
                  {selectedLog.errorMessage && <TabsTrigger value="error">错误信息</TabsTrigger>}
                </TabsList>
                <ScrollArea className="flex-1">
                  <TabsContent value="info" className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">任务ID</div>
                        <div className="font-mono">{selectedLog.taskId}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">任务名称</div>
                        <div className="font-medium">{selectedLog.taskName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">任务类型</div>
                        <div className="font-medium">{TASK_TYPES[selectedLog.taskType]?.label}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">状态</div>
                        <div className={STATUS_MAP[selectedLog.status]?.color}>
                          {STATUS_MAP[selectedLog.status]?.label}
                        </div>
                      </div>
                      {selectedLog.cronExpression && (
                        <div>
                          <div className="text-sm text-muted-foreground">Cron表达式</div>
                          <div className="font-mono">{selectedLog.cronExpression}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-muted-foreground">触发者</div>
                        <div className="font-medium">{selectedLog.triggeredBy || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">开始时间</div>
                        <div className="font-medium">
                          {format(new Date(selectedLog.startTime), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">结束时间</div>
                        <div className="font-medium">
                          {selectedLog.endTime
                            ? format(new Date(selectedLog.endTime), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">执行耗时</div>
                        <div className="font-medium">{formatDuration(selectedLog.duration)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">重试次数</div>
                        <div className="font-medium">{selectedLog.retryCount}</div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="input" className="p-1">
                    {selectedLog.inputParams ? (
                      <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm font-mono">
                        {JSON.stringify(selectedLog.inputParams, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        无输入参数
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="output" className="p-1">
                    {selectedLog.outputResult ? (
                      <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm font-mono">
                        {JSON.stringify(selectedLog.outputResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        无输出结果
                      </div>
                    )}
                  </TabsContent>
                  {selectedLog.errorMessage && (
                    <TabsContent value="error" className="p-1 space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">错误信息</div>
                        <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
                          {selectedLog.errorMessage}
                        </div>
                      </div>
                      {selectedLog.errorStack && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">错误堆栈</div>
                          <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs font-mono text-red-400">
                            {selectedLog.errorStack}
                          </pre>
                        </div>
                      )}
                    </TabsContent>
                  )}
                </ScrollArea>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
