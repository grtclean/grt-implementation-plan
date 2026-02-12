/**
 * 合规调度器状态面板组件
 * 显示定时任务运行状态、下次执行时间和最近执行日志
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Clock, 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Calendar,
  Timer,
  Activity
} from "lucide-react";
import { useState } from "react";

interface TaskExecutionLog {
  taskName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

interface SchedulerStatus {
  germanDaily: {
    running: boolean;
    nextExecution?: string;
  };
  usWeekly: {
    running: boolean;
    nextExecution?: string;
  };
  recentLogs: TaskExecutionLog[];
}

export default function SchedulerStatusPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取调度器状态
  const { data: schedulerStatus, isLoading, refetch } = trpc.compliance.getSchedulerStatus.useQuery(
    undefined,
    { refetchInterval: 30000 } // 每30秒自动刷新
  );

  // 手动触发德国检查
  const runGermanCheckMutation = trpc.compliance.runGermanDailyCheckNow.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('德国每日检查已完成');
        refetch();
      } else {
        toast.error(`检查失败: ${(data as any).error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`检查失败: ${error.message}`);
    }
  });

  // 手动触发美国检查
  const runUSCheckMutation = trpc.compliance.runUSWeeklyCheckNow.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('美国每周检查已完成');
        refetch();
      } else {
        toast.error(`检查失败: ${(data as any).error}`);
      }
    },
    onError: (error) => {
      toast.error(`检查失败: ${error.message}`);
    }
  });

  // 启动调度器
  const startSchedulersMutation = trpc.compliance.startSchedulers.useMutation({
    onSuccess: () => {
      toast.success('调度器已启动');
      refetch();
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    }
  });

  // 停止调度器
  const stopSchedulersMutation = trpc.compliance.stopSchedulers.useMutation({
    onSuccess: () => {
      toast.success('调度器已停止');
      refetch();
    },
    onError: (error) => {
      toast.error(`停止失败: ${error.message}`);
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (running: boolean) => {
    if (running) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">运行中</Badge>;
    }
    return <Badge variant="secondary">已停止</Badge>;
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = schedulerStatus as unknown as SchedulerStatus | undefined;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              定时任务调度器
            </CardTitle>
            <CardDescription>
              合规检查自动化调度状态
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 调度器状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 德国每日检查 */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇩🇪</span>
                <span className="font-medium">德国每日检查</span>
              </div>
              {getStatusBadge(status?.germanDaily?.running ?? false)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>执行时间: 每日 23:00 (柏林)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>下次执行: {formatDateTime(status?.germanDaily?.nextExecution)}</span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={() => runGermanCheckMutation.mutate()}
              disabled={runGermanCheckMutation.isPending}
            >
              {runGermanCheckMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              立即执行
            </Button>
          </div>

          {/* 美国每周检查 */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇺🇸</span>
                <span className="font-medium">美国每周检查</span>
              </div>
              {getStatusBadge(status?.usWeekly?.running ?? false)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>执行时间: 每周日 23:00 (纽约)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>下次执行: {formatDateTime(status?.usWeekly?.nextExecution)}</span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 w-full"
              onClick={() => runUSCheckMutation.mutate()}
              disabled={runUSCheckMutation.isPending}
            >
              {runUSCheckMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              立即执行
            </Button>
          </div>
        </div>

        {/* 调度器控制按钮 */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => (startSchedulersMutation as any).mutate({ type: 'all' })}
            disabled={startSchedulersMutation.isPending || (status?.germanDaily?.running && status?.usWeekly?.running)}
          >
            {startSchedulersMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            启动全部调度器
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => stopSchedulersMutation.mutate()}
            disabled={stopSchedulersMutation.isPending || (!status?.germanDaily?.running && !status?.usWeekly?.running)}
          >
            {stopSchedulersMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Square className="w-4 h-4 mr-2" />
            )}
            停止全部调度器
          </Button>
        </div>

        {/* 最近执行日志 */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            最近执行日志
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {status?.recentLogs && status.recentLogs.length > 0 ? (
              status.recentLogs.map((log, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getLogStatusIcon(log.status)}
                    <span className="font-medium">
                      {log.taskName === 'GermanDailyCheck' ? '🇩🇪 德国检查' : '🇺🇸 美国检查'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{formatDateTime(log.startTime)}</span>
                    <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                      {log.status === 'completed' ? '成功' : log.status === 'failed' ? '失败' : '运行中'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                暂无执行记录
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
