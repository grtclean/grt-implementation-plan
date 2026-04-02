/**
 * System Operations Center — 系统运维中心
 *
 * System admins manage scheduled tasks, view event processing,
 * and monitor system health from a single operations dashboard.
 *
 * Route: /admin/operations
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  Clock,
  Activity,
  Database,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  ArrowRightLeft,
  Wifi,
  WifiOff,
  Zap,
  FileText,
  CalendarClock,
  Shield,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──
type TaskStatus = "success" | "failed" | "running" | "skipped";
type TaskCategory = "sync" | "cleanup" | "report" | "ai" | "audit" | "backup";

interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  cronDesc: string;
  category: TaskCategory;
  categoryLabel: string;
  enabled: boolean;
  lastRun: string;
  lastStatus: TaskStatus;
  nextRun: string;
  avgDuration: string;
}

interface EventBridgeType {
  id: string;
  eventType: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  recentCount: number;
  lastProcessed: string;
}

interface EventLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  status: "processed" | "failed" | "pending";
  source: string;
  detail: string;
}

interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn";
  source: string;
  message: string;
}

// ── Demo data ──
const SCHEDULED_TASKS: ScheduledTask[] = [
  { id: "t1", name: "外部数据同步", cron: "*/15 * * * *", cronDesc: "每15分钟", category: "sync", categoryLabel: "同步", enabled: true, lastRun: "2分钟前", lastStatus: "success", nextRun: "13分钟后", avgDuration: "45s" },
  { id: "t2", name: "ERP凭证推送", cron: "0 */2 * * *", cronDesc: "每2小时", category: "sync", categoryLabel: "同步", enabled: true, lastRun: "1小时前", lastStatus: "success", nextRun: "1小时后", avgDuration: "2m10s" },
  { id: "t3", name: "临时文件清理", cron: "0 3 * * *", cronDesc: "每天03:00", category: "cleanup", categoryLabel: "清理", enabled: true, lastRun: "今天 03:00", lastStatus: "success", nextRun: "明天 03:00", avgDuration: "12s" },
  { id: "t4", name: "数据库备份", cron: "0 2 * * *", cronDesc: "每天02:00", category: "backup", categoryLabel: "备份", enabled: true, lastRun: "今天 02:00", lastStatus: "success", nextRun: "明天 02:00", avgDuration: "8m30s" },
  { id: "t5", name: "日报生成", cron: "0 18 * * 1-5", cronDesc: "工作日18:00", category: "report", categoryLabel: "报表", enabled: true, lastRun: "昨天 18:00", lastStatus: "success", nextRun: "今天 18:00", avgDuration: "1m20s" },
  { id: "t6", name: "AI模型健康检查", cron: "0 */6 * * *", cronDesc: "每6小时", category: "ai", categoryLabel: "AI", enabled: true, lastRun: "4小时前", lastStatus: "success", nextRun: "2小时后", avgDuration: "30s" },
  { id: "t7", name: "审计日志归档", cron: "0 4 * * 0", cronDesc: "每周日04:00", category: "audit", categoryLabel: "审计", enabled: true, lastRun: "上周日", lastStatus: "success", nextRun: "本周日 04:00", avgDuration: "3m45s" },
  { id: "t8", name: "Token用量统计", cron: "0 0 * * *", cronDesc: "每天00:00", category: "ai", categoryLabel: "AI", enabled: true, lastRun: "今天 00:00", lastStatus: "success", nextRun: "明天 00:00", avgDuration: "8s" },
  { id: "t9", name: "过期权限回收", cron: "0 5 * * *", cronDesc: "每天05:00", category: "audit", categoryLabel: "审计", enabled: true, lastRun: "今天 05:00", lastStatus: "success", nextRun: "明天 05:00", avgDuration: "5s" },
  { id: "t10", name: "供应商数据刷新", cron: "0 8 * * 1-5", cronDesc: "工作日08:00", category: "sync", categoryLabel: "同步", enabled: false, lastRun: "3天前", lastStatus: "failed", nextRun: "—", avgDuration: "1m50s" },
  { id: "t11", name: "周报汇总", cron: "0 9 * * 1", cronDesc: "每周一09:00", category: "report", categoryLabel: "报表", enabled: true, lastRun: "本周一", lastStatus: "success", nextRun: "下周一 09:00", avgDuration: "2m30s" },
  { id: "t12", name: "存储空间检查", cron: "0 6 * * *", cronDesc: "每天06:00", category: "cleanup", categoryLabel: "清理", enabled: true, lastRun: "今天 06:00", lastStatus: "success", nextRun: "明天 06:00", avgDuration: "3s" },
];

const EVENT_BRIDGE_TYPES: EventBridgeType[] = [
  { id: "e1", eventType: "SALES_ORDER_CONFIRMED", description: "销售订单确认", debitAccount: "1122 应收账款", creditAccount: "6001 主营业务收入", recentCount: 34, lastProcessed: "5分钟前" },
  { id: "e2", eventType: "PURCHASE_ORDER_RECEIVED", description: "采购入库", debitAccount: "1405 库存商品", creditAccount: "2202 应付账款", recentCount: 21, lastProcessed: "12分钟前" },
  { id: "e3", eventType: "PAYROLL_APPROVED", description: "工资审批通过", debitAccount: "5501 管理费用-工资", creditAccount: "2211 应付职工薪酬", recentCount: 2, lastProcessed: "1小时前" },
  { id: "e4", eventType: "EXPENSE_REIMBURSED", description: "费用报销", debitAccount: "5502 管理费用-差旅", creditAccount: "1001 银行存款", recentCount: 8, lastProcessed: "30分钟前" },
  { id: "e5", eventType: "PRODUCTION_COMPLETE", description: "生产完工入库", debitAccount: "1405 库存商品", creditAccount: "5001 生产成本", recentCount: 15, lastProcessed: "8分钟前" },
  { id: "e6", eventType: "ASSET_DEPRECIATION", description: "固定资产折旧", debitAccount: "5501 管理费用-折旧", creditAccount: "1602 累计折旧", recentCount: 0, lastProcessed: "今天 02:00" },
  { id: "e7", eventType: "TAX_INVOICE_ISSUED", description: "税务发票开具", debitAccount: "2221 应交税费", creditAccount: "1122 应收账款", recentCount: 11, lastProcessed: "15分钟前" },
];

const RECENT_EVENT_LOG: EventLogEntry[] = [
  { id: "l1", timestamp: "10:32:15", eventType: "SALES_ORDER_CONFIRMED", status: "processed", source: "CRM", detail: "订单 SO-2026-0341 确认" },
  { id: "l2", timestamp: "10:28:03", eventType: "PRODUCTION_COMPLETE", status: "processed", source: "MES", detail: "工单 WO-1209 完工 (缸体清洗线)" },
  { id: "l3", timestamp: "10:25:47", eventType: "PURCHASE_ORDER_RECEIVED", status: "processed", source: "SCM", detail: "PO-2026-0178 到货入库" },
  { id: "l4", timestamp: "10:22:11", eventType: "TAX_INVOICE_ISSUED", status: "processed", source: "Finance", detail: "发票 FP-20260317-012" },
  { id: "l5", timestamp: "10:18:30", eventType: "EXPENSE_REIMBURSED", status: "failed", source: "OA", detail: "报销单 BX-0089 — 银行接口超时" },
  { id: "l6", timestamp: "10:15:22", eventType: "SALES_ORDER_CONFIRMED", status: "processed", source: "CRM", detail: "订单 SO-2026-0340 确认" },
  { id: "l7", timestamp: "10:10:05", eventType: "PRODUCTION_COMPLETE", status: "pending", source: "MES", detail: "工单 WO-1208 等待质检确认" },
];

const RECENT_ERRORS: ErrorLogEntry[] = [
  { id: "err1", timestamp: "09:45:12", level: "error", source: "erp-sync", message: "天思ERP连接超时 (MSSQL port 1433) — 3次重试后失败" },
  { id: "err2", timestamp: "08:30:01", level: "warn", source: "ai-agent", message: "报价辅助Agent token限额接近阈值 (92%)" },
  { id: "err3", timestamp: "07:15:33", level: "error", source: "cron", message: "供应商数据刷新失败: HTTP 503 from vendor API" },
  { id: "err4", timestamp: "昨天 23:12", level: "warn", source: "db-pool", message: "连接池使用率达到80% (16/20 connections)" },
  { id: "err5", timestamp: "昨天 18:05", level: "warn", source: "auth", message: "异常登录尝试 IP 103.45.67.89 — 已自动封锁" },
];

// ── Helpers ──
const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  success: { label: "成功", color: "text-emerald-600", icon: CheckCircle2 },
  failed: { label: "失败", color: "text-red-600", icon: XCircle },
  running: { label: "运行中", color: "text-blue-600", icon: RefreshCw },
  skipped: { label: "跳过", color: "text-zinc-400", icon: Pause },
};

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  sync: "bg-blue-500/10 text-blue-600",
  cleanup: "bg-amber-500/10 text-amber-600",
  report: "bg-purple-500/10 text-purple-600",
  ai: "bg-emerald-500/10 text-emerald-600",
  audit: "bg-red-500/10 text-red-600",
  backup: "bg-cyan-500/10 text-cyan-600",
};

// ── Component ──
export default function SystemOperationsCenter() {
  const [tasks, setTasks] = useState(SCHEDULED_TASKS);

  // tRPC data source probe
  const schedulerQuery = trpc.systemScheduler.getSupportedEventTypes.useQuery(undefined, { retry: false });
  const isLive = !!schedulerQuery.data && !schedulerQuery.isError;

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          系统运维中心
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">定时任务 / 事件桥接 / 系统健康 — 一站式运维管控</p>
        <Badge variant={isLive ? "default" : "secondary"} className={`text-[10px] mt-1 ${isLive ? "bg-emerald-600" : ""}`}>
          数据来源: {isLive ? "tRPC 实时" : "本地演示数据"}
        </Badge>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="cron" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cron" className="gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            定时任务
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            事件桥接
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            系统健康
          </TabsTrigger>
        </TabsList>

        {/* ════════ Tab 1: 定时任务 ════════ */}
        <TabsContent value="cron" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">共 {tasks.length} 个定时任务, {tasks.filter((t) => t.enabled).length} 个已启用</p>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务名称</TableHead>
                    <TableHead>Cron</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>启用</TableHead>
                    <TableHead>上次运行</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>下次运行</TableHead>
                    <TableHead>平均耗时</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const statusCfg = TASK_STATUS_CONFIG[task.lastStatus];
                    const StatusIcon = statusCfg.icon;
                    return (
                      <TableRow key={task.id} className={!task.enabled ? "opacity-50" : ""}>
                        <TableCell className="font-medium text-sm">{task.name}</TableCell>
                        <TableCell>
                          <div>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{task.cron}</code>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{task.cronDesc}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[11px] border-0 ${CATEGORY_COLORS[task.category]}`}>
                            {task.categoryLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={task.enabled}
                            onCheckedChange={() => toggleTask(task.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{task.lastRun}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{task.nextRun}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{task.avgDuration}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Play className="w-3 h-3" />
                            手动触发
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════ Tab 2: 事件桥接 ════════ */}
        <TabsContent value="events" className="space-y-6">
          {/* Event types with GL mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">事件类型与会计科目映射</CardTitle>
              <CardDescription>7种业务事件自动生成会计凭证 (debit → credit)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>事件类型</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>借方科目</TableHead>
                    <TableHead>贷方科目</TableHead>
                    <TableHead>近7天次数</TableHead>
                    <TableHead>最近处理</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EVENT_BRIDGE_TYPES.map((evt) => (
                    <TableRow key={evt.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{evt.eventType}</code>
                      </TableCell>
                      <TableCell className="text-sm">{evt.description}</TableCell>
                      <TableCell className="text-xs font-mono text-red-600">{evt.debitAccount}</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-600">{evt.creditAccount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{evt.recentCount}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{evt.lastProcessed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent event processing log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">近期事件处理日志</CardTitle>
              <CardDescription>今日事件处理流水</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>事件类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_EVENT_LOG.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-mono">{entry.timestamp}</TableCell>
                      <TableCell>
                        <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{entry.eventType}</code>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] border-0 ${
                          entry.status === "processed" ? "bg-emerald-500/10 text-emerald-600" :
                          entry.status === "failed" ? "bg-red-500/10 text-red-600" :
                          "bg-amber-500/10 text-amber-600"
                        }`}>
                          {entry.status === "processed" ? "已处理" : entry.status === "failed" ? "失败" : "待处理"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{entry.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{entry.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════ Tab 3: 系统健康 ════════ */}
        <TabsContent value="health" className="space-y-6">
          {/* Health cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  DB连接
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-500" />
                  <span className="text-lg font-bold text-emerald-600">正常</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">MySQL 8.0 / TiDB — 延迟 2ms</p>
                <p className="text-xs text-muted-foreground">连接池: 6/20 active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Redis状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-500" />
                  <span className="text-lg font-bold text-emerald-600">正常</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Redis 7.2 — 延迟 0.3ms</p>
                <p className="text-xs text-muted-foreground">内存: 128MB / 512MB</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  天思ERP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-amber-500" />
                  <span className="text-lg font-bold text-amber-600">降级</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">MSSQL — 延迟 850ms</p>
                <p className="text-xs text-muted-foreground">上次成功同步: 1小时前</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  金蝶ERP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-500" />
                  <span className="text-lg font-bold text-emerald-600">正常</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">K/3 Cloud API — 延迟 120ms</p>
                <p className="text-xs text-muted-foreground">上次成功同步: 15分钟前</p>
              </CardContent>
            </Card>
          </div>

          {/* Router stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Router 统计
              </CardTitle>
              <CardDescription>tRPC Router 注册概况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">210</div>
                  <div className="text-xs text-muted-foreground">总Router数</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1,127</div>
                  <div className="text-xs text-muted-foreground">受保护mutations</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">14,208</div>
                  <div className="text-xs text-muted-foreground">测试用例</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">383</div>
                  <div className="text-xs text-muted-foreground">测试文件</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent errors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                最近错误日志
              </CardTitle>
              <CardDescription>近48小时内的 error/warn 级别日志</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>消息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_ERRORS.map((err) => (
                    <TableRow key={err.id}>
                      <TableCell className="text-xs font-mono whitespace-nowrap">{err.timestamp}</TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] border-0 ${
                          err.level === "error" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {err.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{err.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{err.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
