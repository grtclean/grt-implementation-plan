/**
 * v2.5.31 定时任务监控面板
 * 任务状态、执行历史、手动触发
 */

import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Clock, Play, Pause, RefreshCw, CheckCircle2, XCircle, AlertTriangle, History, Settings
} from "lucide-react";
import { useState } from "react";

interface CronTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date;
  status: "idle" | "running" | "success" | "failed";
  avgDuration: number;
}

interface ExecutionLog {
  id: string;
  taskId: string;
  taskName: string;
  startTime: Date;
  endTime: Date | null;
  status: "running" | "success" | "failed";
  duration: number;
  message: string;
}

export default function CronMonitor() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<CronTask[]>([
    { id: "1", name: "工时预警检查", description: "检查工时超预估情况并发送预警通知", cronExpression: "0 * * * *", enabled: true, lastRun: new Date(Date.now() - 3600000), nextRun: new Date(Date.now() + 3600000), status: "success", avgDuration: 45 },
    { id: "2", name: "效率统计更新", description: "更新工人效率统计数据", cronExpression: "0 0 * * *", enabled: true, lastRun: new Date(Date.now() - 86400000), nextRun: new Date(Date.now() + 86400000), status: "success", avgDuration: 120 },
    { id: "3", name: "UWB位置同步", description: "同步UWB定位系统位置数据", cronExpression: "*/5 * * * *", enabled: true, lastRun: new Date(Date.now() - 300000), nextRun: new Date(Date.now() + 300000), status: "running", avgDuration: 15 },
    { id: "4", name: "数据备份", description: "每日数据库备份", cronExpression: "0 2 * * *", enabled: false, lastRun: new Date(Date.now() - 172800000), nextRun: new Date(Date.now() + 86400000), status: "idle", avgDuration: 300 },
    { id: "5", name: "报表生成", description: "生成每周生产报表", cronExpression: "0 8 * * 1", enabled: true, lastRun: new Date(Date.now() - 604800000), nextRun: new Date(Date.now() + 604800000), status: "failed", avgDuration: 180 },
  ]);

  const [logs] = useState<ExecutionLog[]>([
    { id: "1", taskId: "3", taskName: "UWB位置同步", startTime: new Date(Date.now() - 60000), endTime: null, status: "running", duration: 0, message: "正在同步位置数据..." },
    { id: "2", taskId: "1", taskName: "工时预警检查", startTime: new Date(Date.now() - 3600000), endTime: new Date(Date.now() - 3600000 + 45000), status: "success", duration: 45, message: "检查完成，发现3条预警" },
    { id: "3", taskId: "3", taskName: "UWB位置同步", startTime: new Date(Date.now() - 600000), endTime: new Date(Date.now() - 600000 + 12000), status: "success", duration: 12, message: "同步完成，更新15条位置记录" },
    { id: "4", taskId: "5", taskName: "报表生成", startTime: new Date(Date.now() - 604800000), endTime: new Date(Date.now() - 604800000 + 180000), status: "failed", duration: 180, message: "生成失败：数据库连接超时" },
    { id: "5", taskId: "2", taskName: "效率统计更新", startTime: new Date(Date.now() - 86400000), endTime: new Date(Date.now() - 86400000 + 115000), status: "success", duration: 115, message: "统计完成，更新50条工人效率数据" },
  ]);

  const stats = {
    totalTasks: tasks.length,
    enabledTasks: tasks.filter(t => t.enabled).length,
    runningTasks: tasks.filter(t => t.status === "running").length,
    failedTasks: tasks.filter(t => t.status === "failed").length,
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, enabled: !t.enabled } : t));
    const task = tasks.find(t => t.id === taskId);
    toast({ title: task?.enabled ? "任务已禁用" : "任务已启用", description: task?.name });
  };

  const handleRunTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: "running" } : t));
    toast({ title: "任务已触发", description: `正在执行: ${task?.name}` });
    setTimeout(() => {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: "success", lastRun: new Date() } : t));
      toast({ title: "任务执行完成", description: task?.name });
    }, 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "idle": return <Badge variant="outline">空闲</Badge>;
      case "running": return <Badge className="bg-blue-500 animate-pulse">运行中</Badge>;
      case "success": return <Badge className="bg-green-500">成功</Badge>;
      case "failed": return <Badge variant="destructive">失败</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
  };

  const formatCron = (cron: string) => {
    const parts = cron.split(" ");
    if (parts[0] === "*/5") return "每5分钟";
    if (parts[0] === "0" && parts[1] === "*") return "每小时";
    if (parts[0] === "0" && parts[1] === "0") return "每天0点";
    if (parts[0] === "0" && parts[1] === "2") return "每天2点";
    if (parts[0] === "0" && parts[1] === "8" && parts[4] === "1") return "每周一8点";
    return cron;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Clock}
          title="定时任务监控"
          description="管理和监控系统定时任务执行状态"
          actions={
            <Button onClick={() => toast({ title: "正在刷新任务状态..." })}><RefreshCw className="w-4 h-4 mr-1" />刷新状态</Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Settings} label="总任务数" value={stats.totalTasks} />
          <StatCard icon={CheckCircle2} label="已启用" value={stats.enabledTasks} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Play} label="运行中" value={stats.runningTasks} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={XCircle} label="失败" value={stats.failedTasks} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" />任务列表</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>任务名称</TableHead><TableHead>执行周期</TableHead><TableHead>状态</TableHead><TableHead>上次执行</TableHead><TableHead>下次执行</TableHead><TableHead>平均耗时</TableHead><TableHead>启用</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className={task.status === "failed" ? "bg-red-500/5" : task.status === "running" ? "bg-blue-500/5" : ""}>
                    <TableCell><div><p className="font-medium">{task.name}</p><p className="text-xs text-muted-foreground">{task.description}</p></div></TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{formatCron(task.cronExpression)}</Badge></TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.lastRun ? task.lastRun.toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.nextRun.toLocaleString()}</TableCell>
                    <TableCell>{formatDuration(task.avgDuration)}</TableCell>
                    <TableCell><Switch checked={task.enabled} onCheckedChange={() => handleToggleTask(task.id)} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleRunTask(task.id)} disabled={task.status === "running"}><Play className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5" />执行日志</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>任务名称</TableHead><TableHead>开始时间</TableHead><TableHead>结束时间</TableHead><TableHead>状态</TableHead><TableHead>耗时</TableHead><TableHead>消息</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className={log.status === "failed" ? "bg-red-500/5" : log.status === "running" ? "bg-blue-500/5" : ""}>
                    <TableCell className="font-medium">{log.taskName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.startTime.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.endTime ? log.endTime.toLocaleString() : "-"}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{log.status === "running" ? "-" : formatDuration(log.duration)}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{log.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
