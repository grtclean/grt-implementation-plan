/**
 * 工时打卡记录管理页面 (Work Log Manager)
 * 工人打卡记录追踪与管理 — real tRPC backend
 * v3.0.0
 */

import { useState, useMemo } from 'react';
import { PageHeader, StatCard } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  Play,
  Square,
  Calendar,
  Timer,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  Users,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useToast } from '@/hooks/use-toast';

// ---------- types ----------

type LogStatus = 'Active' | 'Completed' | 'Cancelled';

/** Map DB approvalStatus → UI status */
function mapApprovalStatus(approvalStatus: string | null): LogStatus {
  switch (approvalStatus) {
    case 'approved': return 'Completed';
    case 'rejected': return 'Cancelled';
    default: return 'Active'; // pending or null
  }
}

// 状态配置
const statusConfig: Record<LogStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Active': { label: '进行中', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Play className="w-4 h-4" /> },
  'Completed': { label: '已完成', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  'Cancelled': { label: '已取消', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle className="w-4 h-4" /> },
};

// 项目选项 (可扩展为 API 调用)
const PROJECT_OPTIONS = [
  { id: 1, name: '项目 #1 — 清洗舱总装' },
  { id: 2, name: '项目 #2 — 电气联调' },
  { id: 3, name: '项目 #3 — 现场安装' },
];

// 工时类型标签
const LABOR_CATEGORY_LABELS: Record<string, string> = {
  shearing_bending: '剪板折弯',
  sub_assembly: '部件制作',
  mechanical_assembly: '机械装配',
  electrical_assembly: '电气装配',
  point_check_manual: '对点及手动运行',
  system_integration: '设备联调及跑合',
  internal_acceptance: '内部验收',
  pre_acceptance_rework: '预验收及整改',
  packaging_shipping: '打包发货',
  site_installation: '客户现场安装',
  site_commissioning: '客户现场调试',
  mechanical_design: '机械设计',
  electrical_design: '电气设计',
  project_management: '项目管理',
  other: '其他',
};

// ---------- component ----------

export default function WorkLogManager() {
  const { level } = useUserProfile();
  const canManage = level >= 5; // manager-level approval
  const { toast } = useToast();

  // Project selector
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');

  // Manual clock-in dialog
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockInForm, setClockInForm] = useState({
    taskId: '',
    duration: '',
    laborCategory: 'other',
    notes: '',
    location: '',
  });

  // Approve/reject dialog
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; logId: number; action: 'approved' | 'rejected' }>({
    open: false,
    logId: 0,
    action: 'approved',
  });
  const [approveReason, setApproveReason] = useState('');

  // ---------- tRPC queries ----------

  const utils = trpc.useUtils();
  const laborReport = (trpc.smartProductionScheduling as any).laborReport;

  const logsQuery = laborReport.listByProject.useQuery(
    { projectId: selectedProjectId, limit: 200 },
    { refetchInterval: 30_000 },
  );

  const statsQuery = laborReport.statsByCategory.useQuery(
    { projectId: selectedProjectId },
  );

  // ---------- tRPC mutations ----------

  const submitMutation = laborReport.submit.useMutation({
    onSuccess: () => {
      toast({ title: '打卡成功', description: '工时记录已提交' });
      setClockInOpen(false);
      setClockInForm({ taskId: '', duration: '', laborCategory: 'other', notes: '', location: '' });
      utils.smartProductionScheduling.invalidate();
    },
    onError: (err: any) => {
      toast({ title: '提交失败', description: err.message, variant: 'destructive' });
    },
  });

  const approveMutation = laborReport.approve.useMutation({
    onSuccess: () => {
      toast({ title: '审批完成' });
      setApproveDialog({ open: false, logId: 0, action: 'approved' });
      setApproveReason('');
      utils.smartProductionScheduling.invalidate();
    },
    onError: (err: any) => {
      toast({ title: '审批失败', description: err.message, variant: 'destructive' });
    },
  });

  // ---------- derived data ----------

  type WorkLogRow = {
    id: number;
    logCode: string | null;
    taskId: number | null;
    workerId: number | null;
    workerName: string | null;
    logType: string | null;
    logTime: string | null;
    duration: string | null;
    laborCategory: string | null;
    projectId: number | null;
    approvalStatus: string | null;
    notes: string | null;
    location: string | null;
    approvedBy: number | null;
  };

  const rawLogs: WorkLogRow[] = logsQuery.data ?? [];

  const logs = useMemo(() => rawLogs.map(row => ({
    id: row.logCode ?? `#${row.id}`,
    dbId: row.id,
    taskId: row.taskId,
    taskName: `Task-${row.taskId ?? '?'}`,
    workerId: String(row.workerId ?? ''),
    workerName: row.workerName ?? '未知',
    startTime: row.logTime ? new Date(row.logTime).getTime() : Date.now(),
    duration: Number(row.duration ?? 0),
    status: mapApprovalStatus(row.approvalStatus),
    approvalStatus: row.approvalStatus,
    comments: row.notes ?? '',
    laborCategory: row.laborCategory ?? 'other',
    location: row.location ?? '',
  })), [rawLogs]);

  // Workers list for filter
  const workers = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of logs) {
      if (!map.has(l.workerId)) map.set(l.workerId, l.workerName);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [logs]);

  // Filtered
  const filteredLogs = useMemo(() => logs.filter(log => {
    if (searchKeyword && !log.taskName.includes(searchKeyword) && !log.workerName.includes(searchKeyword)) {
      return false;
    }
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (workerFilter !== 'all' && log.workerId !== workerFilter) return false;
    return true;
  }), [logs, searchKeyword, statusFilter, workerFilter]);

  // Stats computed from logs
  const stats = useMemo(() => ({
    total: logs.length,
    active: logs.filter(l => l.status === 'Active').length,
    completed: logs.filter(l => l.status === 'Completed').length,
    cancelled: logs.filter(l => l.status === 'Cancelled').length,
    totalHours: logs.filter(l => l.status === 'Completed').reduce((sum, l) => sum + l.duration, 0),
    activeWorkers: new Set(logs.filter(l => l.status === 'Active').map(l => l.workerId)).size,
  }), [logs]);

  // Category stats from backend
  const categoryStats = statsQuery.data ?? [];

  // ---------- handlers ----------

  const handleSubmitClockIn = () => {
    const taskId = Number(clockInForm.taskId);
    const duration = Number(clockInForm.duration);
    if (!taskId || !duration) {
      toast({ title: '请填写必填项', description: '任务ID和工时不能为空', variant: 'destructive' });
      return;
    }
    submitMutation.mutate({
      taskId,
      projectId: selectedProjectId,
      duration,
      laborCategory: clockInForm.laborCategory,
      notes: clockInForm.notes || undefined,
      location: clockInForm.location || undefined,
    });
  };

  /** "结束" — submit a completed log entry for the active task */
  const handleStopWork = (log: (typeof logs)[number]) => {
    const durationHours = Math.max(0.1, Math.round(((Date.now() - log.startTime) / 3_600_000) * 10) / 10);
    submitMutation.mutate({
      taskId: log.taskId ?? 1,
      projectId: selectedProjectId,
      duration: Math.min(durationHours, 24),
      laborCategory: log.laborCategory,
      notes: `结束打卡 — 基于 ${log.id}`,
    });
  };

  const handleApprove = (logId: number, action: 'approved' | 'rejected') => {
    setApproveDialog({ open: true, logId, action });
  };

  const confirmApprove = () => {
    approveMutation.mutate({
      logId: approveDialog.logId,
      action: approveDialog.action,
      reason: approveReason || undefined,
    });
  };

  // ---------- format helpers ----------

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}分钟`;
    return `${hours.toFixed(1)}小时`;
  };

  const getActiveDuration = (startTime: number) => {
    const hours = (Date.now() - startTime) / (1000 * 60 * 60);
    return formatDuration(hours);
  };

  // ---------- loading state ----------

  const isLoading = logsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Clock}
        title="工时打卡管理"
        description="工人打卡记录追踪与工时统计"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => utils.smartProductionScheduling.invalidate()}
              disabled={logsQuery.isFetching}
            >
              {logsQuery.isFetching
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <RefreshCw className="w-4 h-4 mr-2" />
              }
              刷新
            </Button>
            <Button size="sm" onClick={() => setClockInOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              手动打卡
            </Button>
          </>
        }
      />

      {/* 项目选择器 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium whitespace-nowrap">当前项目</Label>
            <Select
              value={String(selectedProjectId)}
              onValueChange={(v) => setSelectedProjectId(Number(v))}
            >
              <SelectTrigger className="w-[300px] bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_OPTIONS.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard icon={ClipboardList} label="总记录" value={isLoading ? '—' : stats.total} />
        <StatCard icon={Play} label="进行中" value={isLoading ? '—' : stats.active} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={isLoading ? '—' : stats.completed} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={XCircle} label="已取消" value={isLoading ? '—' : stats.cancelled} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Timer} label="总工时" value={isLoading ? '—' : `${stats.totalHours.toFixed(1)}h`} />
        <StatCard icon={Users} label="在岗人数" value={isLoading ? '—' : stats.activeWorkers} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
      </div>

      {/* 工时类型统计 (from statsByCategory) */}
      {categoryStats.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">工时类型统计 (已审批)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {categoryStats.map((s: { category: string; totalHours: number; logCount: number }) => (
                <div key={s.category} className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm">
                  <span className="font-medium">{LABOR_CATEGORY_LABELS[s.category] ?? s.category}</span>
                  <span className="ml-2 text-muted-foreground">{s.totalHours.toFixed(1)}h / {s.logCount}条</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 当前在岗人员 */}
      {stats.active > 0 && (
        <Card className="bg-card/50 border-border border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              当前在岗人员
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {logs.filter(l => l.status === 'Active').map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-green-500/20 text-green-500">
                      {log.workerName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{log.workerName}</p>
                    <p className="text-xs text-muted-foreground">{log.taskName}</p>
                    <p className="text-xs text-green-500">已工作 {getActiveDuration(log.startTime)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => handleStopWork(log)}
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending
                      ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      : <Square className="w-3 h-3 mr-1" />
                    }
                    结束
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 过滤器 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务名称或员工姓名..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="Active">进行中</SelectItem>
                  <SelectItem value="Completed">已完成</SelectItem>
                  <SelectItem value="Cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>

              <Select value={workerFilter} onValueChange={setWorkerFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="员工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部员工</SelectItem>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 打卡记录列表 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">加载打卡记录...</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => {
                const statusConf = statusConfig[log.status];

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* 员工头像 */}
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className={log.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-muted'}>
                          {log.workerName.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>

                      {/* 记录信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{log.workerName}</span>
                          <Badge variant="outline" className={statusConf.color}>
                            {statusConf.icon}
                            <span className="ml-1">{statusConf.label}</span>
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {LABOR_CATEGORY_LABELS[log.laborCategory] ?? log.laborCategory}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            {log.taskName}
                          </span>
                          <span className="font-mono">{log.id}</span>
                        </div>
                      </div>

                      {/* 时间信息 */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{formatTime(log.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Timer className="w-3 h-3" />
                          {log.status === 'Active'
                            ? <span className="text-green-500">{getActiveDuration(log.startTime)}</span>
                            : <span>{formatDuration(log.duration)}</span>
                          }
                        </div>
                      </div>

                      {/* 备注 */}
                      {log.comments && (
                        <div className="max-w-[200px]">
                          <div className="flex items-start gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{log.comments}</span>
                          </div>
                        </div>
                      )}

                      {/* 审批操作 (manager only, pending logs only) */}
                      {canManage && log.approvalStatus === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(log.dbId, 'approved')}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleApprove(log.dbId, 'rejected')}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* 操作 */}
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredLogs.length === 0 && (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">暂无符合条件的打卡记录</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== 手动打卡 Dialog ========== */}
      <Dialog open={clockInOpen} onOpenChange={setClockInOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>手动打卡</DialogTitle>
            <DialogDescription>提交工时记录到当前项目</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>任务 ID *</Label>
              <Input
                type="number"
                placeholder="例如 3"
                value={clockInForm.taskId}
                onChange={(e) => setClockInForm(f => ({ ...f, taskId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>工时 (小时) *</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="24"
                placeholder="例如 2.5"
                value={clockInForm.duration}
                onChange={(e) => setClockInForm(f => ({ ...f, duration: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>工时类型</Label>
              <Select
                value={clockInForm.laborCategory}
                onValueChange={(v) => setClockInForm(f => ({ ...f, laborCategory: v }))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABOR_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>位置</Label>
              <Input
                placeholder="例如 车间A"
                value={clockInForm.location}
                onChange={(e) => setClockInForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                placeholder="可选备注..."
                value={clockInForm.notes}
                onChange={(e) => setClockInForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockInOpen(false)}>取消</Button>
            <Button onClick={handleSubmitClockIn} disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== 审批确认 Dialog ========== */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => { if (!open) setApproveDialog(d => ({ ...d, open: false })); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {approveDialog.action === 'approved' ? '审批通过' : '驳回'}
            </DialogTitle>
            <DialogDescription>
              {approveDialog.action === 'approved'
                ? '确认通过该工时记录？'
                : '确认驳回该工时记录？请填写原因。'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>原因 {approveDialog.action === 'rejected' ? '*' : '(可选)'}</Label>
            <Textarea
              className="mt-2"
              placeholder="审批原因..."
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(d => ({ ...d, open: false }))}>取消</Button>
            <Button
              variant={approveDialog.action === 'approved' ? 'default' : 'destructive'}
              onClick={confirmApprove}
              disabled={approveMutation.isPending || (approveDialog.action === 'rejected' && !approveReason.trim())}
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {approveDialog.action === 'approved' ? '通过' : '驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
