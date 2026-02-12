import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert, Lock, Unlock, Bell, BellOff, CheckCircle2, XCircle,
  AlertTriangle, Clock, Eye, Shield, RefreshCw, Filter
} from "lucide-react";

const PROCESS_NAMES: Record<string, string> = {
  T1: '机加工', T2: '冷作', T3: '机械部件装配', T4: '机械装配', T5: '机械总装',
  T6: '电气装配', T7: '设备调试', T8: '跑和', T9: '包装', T10: '发货',
  T11: '卸车', T12: '就位', T13: '水电气连接', T14: '现场调试', T15: '终验收',
};
const PROCESS_CODES = Object.keys(PROCESS_NAMES);

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400", label: "严重" },
  major: { bg: "bg-orange-500/20", text: "text-orange-400", label: "重大" },
  minor: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "轻微" },
};
const LOCK_STATUS_STYLES: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  locked: { bg: "bg-red-500/20", text: "text-red-400", label: "已锁定", icon: Lock },
  unlock_requested: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "待审批", icon: Clock },
  unlocked: { bg: "bg-green-500/20", text: "text-green-400", label: "已解锁", icon: Unlock },
  expired: { bg: "bg-gray-500/20", text: "text-gray-400", label: "已过期", icon: Clock },
};

export default function QualityInterlock() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("locks");
  const [selectedProject] = useState("PRJ-2026-001");
  const [lockStatusFilter, setLockStatusFilter] = useState<string>("all");
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [selectedLockId, setSelectedLockId] = useState<number | null>(null);

  // Form states
  const [triggerForm, setTriggerForm] = useState({
    processCode: "T1", severity: "major" as string, reason: "",
  });
  const [unlockForm, setUnlockForm] = useState({ unlockReason: "" });

  // Queries
  const locksQuery = trpc.qualityInterlock.getLocks.useQuery({
    projectId: selectedProject,
    status: lockStatusFilter !== "all" ? lockStatusFilter : undefined,
  });
  const summaryQuery = trpc.qualityInterlock.lockSummary.useQuery({ projectId: selectedProject });
  const alertsQuery = trpc.qualityInterlock.getAlerts.useQuery({
    projectId: selectedProject, limit: 50,
  });
  const unreadCountQuery = trpc.qualityInterlock.unreadCount.useQuery({ projectId: selectedProject });
  const utils = trpc.useUtils();

  // Mutations
  const triggerLockMut = trpc.qualityInterlock.triggerLock.useMutation({
    onSuccess: () => {
      toast({ title: "工序已锁定", description: "已成功触发工序锁定" });
      setShowTriggerDialog(false);
      setTriggerForm({ processCode: "T1", severity: "major", reason: "" });
      utils.qualityInterlock.getLocks.invalidate();
      utils.qualityInterlock.lockSummary.invalidate();
    },
    onError: (e) => toast({ title: "操作失败", description: e.message, variant: "destructive" }),
  });

  const requestUnlockMut = trpc.qualityInterlock.requestUnlock.useMutation({
    onSuccess: () => {
      toast({ title: "解锁申请已提交", description: "等待审批" });
      setShowUnlockDialog(false);
      setUnlockForm({ unlockReason: "" });
      utils.qualityInterlock.getLocks.invalidate();
    },
    onError: (e) => toast({ title: "操作失败", description: e.message, variant: "destructive" }),
  });

  const approveUnlockMut = trpc.qualityInterlock.approveUnlock.useMutation({
    onSuccess: () => {
      toast({ title: "审批完成" });
      utils.qualityInterlock.getLocks.invalidate();
      utils.qualityInterlock.lockSummary.invalidate();
    },
    onError: (e) => toast({ title: "操作失败", description: e.message, variant: "destructive" }),
  });

  const markAlertReadMut = trpc.qualityInterlock.markRead.useMutation({
    onSuccess: () => {
      utils.qualityInterlock.getAlerts.invalidate();
      utils.qualityInterlock.unreadCount.invalidate();
    },
  });

  const markAllReadMut = trpc.qualityInterlock.markAllRead.useMutation({
    onSuccess: () => {
      toast({ title: "已全部标记为已读" });
      utils.qualityInterlock.getAlerts.invalidate();
      utils.qualityInterlock.unreadCount.invalidate();
    },
  });

  const markActionedMut = trpc.qualityInterlock.markActioned.useMutation({
    onSuccess: () => {
      toast({ title: "已标记为已处理" });
      utils.qualityInterlock.getAlerts.invalidate();
    },
  });

  const locks = (locksQuery.data || []) as any[];
  const summary = (summaryQuery.data || {}) as any;
  const alerts = (alertsQuery.data || []) as any[];
  const unreadCount = (unreadCountQuery.data as any)?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-400" />
            质量工序联动
          </h1>
          <p className="text-muted-foreground mt-1">CCD缺陷自动暂停后续工序 · 质量预警通知</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            utils.qualityInterlock.getLocks.invalidate();
            utils.qualityInterlock.lockSummary.invalidate();
            utils.qualityInterlock.getAlerts.invalidate();
          }}>
            <RefreshCw className="w-4 h-4 mr-1" /> 刷新
          </Button>
          <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Lock className="w-4 h-4 mr-1" /> 手动锁定工序
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>手动触发工序锁定</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>目标工序</Label>
                  <Select value={triggerForm.processCode} onValueChange={v => setTriggerForm(f => ({ ...f, processCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROCESS_CODES.map(c => (
                        <SelectItem key={c} value={c}>{c} - {PROCESS_NAMES[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>严重程度</Label>
                  <Select value={triggerForm.severity} onValueChange={v => setTriggerForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">严重 (Critical)</SelectItem>
                      <SelectItem value="major">重大 (Major)</SelectItem>
                      <SelectItem value="minor">轻微 (Minor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>锁定原因</Label>
                  <Textarea
                    value={triggerForm.reason}
                    onChange={e => setTriggerForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="描述锁定原因..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
                <Button
                  variant="destructive"
                  disabled={!triggerForm.reason || triggerLockMut.isPending}
                  onClick={() => triggerLockMut.mutate({
                    projectId: selectedProject,
                    processCode: triggerForm.processCode,
                    severity: triggerForm.severity as any,
                    reason: triggerForm.reason,
                  })}
                >
                  {triggerLockMut.isPending ? "锁定中..." : "确认锁定"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20"><Lock className="w-5 h-5 text-red-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">当前锁定</p>
              <p className="text-2xl font-bold text-red-400">{summary.activeLocks || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20"><Clock className="w-5 h-5 text-yellow-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">待审批</p>
              <p className="text-2xl font-bold text-yellow-400">{summary.pendingUnlocks || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20"><Unlock className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">已解锁</p>
              <p className="text-2xl font-bold text-green-400">{summary.totalUnlocked || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20"><Bell className="w-5 h-5 text-orange-400" /></div>
            <div>
              <p className="text-sm text-muted-foreground">未读预警</p>
              <p className="text-2xl font-bold text-orange-400">{unreadCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="locks">
            <Lock className="w-4 h-4 mr-1" /> 工序锁定
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-1" /> 质量预警
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{unreadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Locks Tab */}
        <TabsContent value="locks" className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={lockStatusFilter} onValueChange={setLockStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="locked">已锁定</SelectItem>
                <SelectItem value="unlock_requested">待审批</SelectItem>
                <SelectItem value="unlocked">已解锁</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {locksQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">加载中...</div>
          ) : locks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>当前没有工序锁定记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {locks.map((lock: any) => {
                const statusStyle = LOCK_STATUS_STYLES[lock.lock_status] || LOCK_STATUS_STYLES.locked;
                const severityStyle = SEVERITY_STYLES[lock.severity] || SEVERITY_STYLES.major;
                const StatusIcon = statusStyle.icon;
                return (
                  <Card key={lock.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${statusStyle.bg}`}>
                            <StatusIcon className={`w-5 h-5 ${statusStyle.text}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-lg">
                                {lock.process_code} - {PROCESS_NAMES[lock.process_code] || lock.process_code}
                              </span>
                              <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0`}>
                                {statusStyle.label}
                              </Badge>
                              <Badge className={`${severityStyle.bg} ${severityStyle.text} border-0`}>
                                {severityStyle.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{lock.reason}</p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>锁定人: {lock.locked_by || '-'}</span>
                              <span>锁定时间: {lock.locked_at ? new Date(Number(lock.locked_at)).toLocaleString() : '-'}</span>
                              {lock.unlock_reason && <span>解锁原因: {lock.unlock_reason}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {lock.lock_status === 'locked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedLockId(lock.id); setShowUnlockDialog(true); }}
                            >
                              <Unlock className="w-3 h-3 mr-1" /> 申请解锁
                            </Button>
                          )}
                          {lock.lock_status === 'unlock_requested' && (
                            <div className="flex gap-1">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => approveUnlockMut.mutate({ lockId: lock.id, approved: true })}
                                disabled={approveUnlockMut.isPending}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> 批准
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => approveUnlockMut.mutate({ lockId: lock.id, approved: false, comments: "驳回" })}
                                disabled={approveUnlockMut.isPending}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> 驳回
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">共 {alerts.length} 条预警</p>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllReadMut.mutate({ projectId: selectedProject })}>
                <BellOff className="w-3 h-3 mr-1" /> 全部已读
              </Button>
            )}
          </div>

          {alertsQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">加载中...</div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无质量预警</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert: any) => (
                <Card key={alert.id} className={`transition-colors ${!alert.is_read ? 'border-orange-500/40 bg-orange-500/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${alert.alert_type === 'process_locked' ? 'bg-red-500/20' : alert.alert_type === 'defect_detected' ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                          <AlertTriangle className={`w-4 h-4 ${alert.alert_type === 'process_locked' ? 'text-red-400' : alert.alert_type === 'defect_detected' ? 'text-orange-400' : 'text-blue-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.created_at ? new Date(Number(alert.created_at)).toLocaleString() : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!alert.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => markAlertReadMut.mutate({ alertId: alert.id })}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                        {!alert.is_actioned && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markActionedMut.mutate({ alertId: alert.id, actionTaken: "已确认处理" })}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> 已处理
                          </Button>
                        )}
                        {alert.is_actioned && (
                          <Badge variant="outline" className="text-green-400 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> 已处理
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Unlock Request Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请解锁工序</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>解锁原因</Label>
              <Textarea
                value={unlockForm.unlockReason}
                onChange={e => setUnlockForm({ unlockReason: e.target.value })}
                placeholder="说明解锁原因..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button
              disabled={!unlockForm.unlockReason || requestUnlockMut.isPending || !selectedLockId}
              onClick={() => selectedLockId && requestUnlockMut.mutate({
                lockId: selectedLockId,
                unlockReason: unlockForm.unlockReason,
              })}
            >
              {requestUnlockMut.isPending ? "提交中..." : "提交申请"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
