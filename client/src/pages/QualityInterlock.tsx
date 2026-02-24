import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader, StatCard } from "@/components/grt";
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

const PROCESS_NAME_KEYS: Record<string, string> = {
  T1: 'quality.interlock.processT1', T2: 'quality.interlock.processT2', T3: 'quality.interlock.processT3',
  T4: 'quality.interlock.processT4', T5: 'quality.interlock.processT5', T6: 'quality.interlock.processT6',
  T7: 'quality.interlock.processT7', T8: 'quality.interlock.processT8', T9: 'quality.interlock.processT9',
  T10: 'quality.interlock.processT10', T11: 'quality.interlock.processT11', T12: 'quality.interlock.processT12',
  T13: 'quality.interlock.processT13', T14: 'quality.interlock.processT14', T15: 'quality.interlock.processT15',
};
const PROCESS_CODES = Object.keys(PROCESS_NAME_KEYS);

const SEVERITY_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400", labelKey: "quality.interlock.severityCritical" },
  major: { bg: "bg-orange-500/20", text: "text-orange-400", labelKey: "quality.interlock.severityMajor" },
  minor: { bg: "bg-yellow-500/20", text: "text-yellow-400", labelKey: "quality.interlock.severityMinor" },
};
const LOCK_STATUS_STYLES: Record<string, { bg: string; text: string; labelKey: string; icon: any }> = {
  locked: { bg: "bg-red-500/20", text: "text-red-400", labelKey: "quality.interlock.statusLocked", icon: Lock },
  unlock_requested: { bg: "bg-yellow-500/20", text: "text-yellow-400", labelKey: "quality.interlock.statusPending", icon: Clock },
  unlocked: { bg: "bg-green-500/20", text: "text-green-400", labelKey: "quality.interlock.statusUnlocked", icon: Unlock },
  expired: { bg: "bg-gray-500/20", text: "text-gray-400", labelKey: "quality.interlock.statusExpired", icon: Clock },
};

export default function QualityInterlock() {
  const { t, tpl } = useLanguage();
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
      toast({ title: t("quality.interlock.lockSuccess"), description: t("quality.interlock.lockSuccessDesc") });
      setShowTriggerDialog(false);
      setTriggerForm({ processCode: "T1", severity: "major", reason: "" });
      utils.qualityInterlock.getLocks.invalidate();
      utils.qualityInterlock.lockSummary.invalidate();
    },
    onError: (e) => toast({ title: t("quality.interlock.operationFailed"), description: e.message, variant: "destructive" }),
  });

  const requestUnlockMut = trpc.qualityInterlock.requestUnlock.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.interlock.unlockRequestSubmitted"), description: t("quality.interlock.waitingApproval") });
      setShowUnlockDialog(false);
      setUnlockForm({ unlockReason: "" });
      utils.qualityInterlock.getLocks.invalidate();
    },
    onError: (e) => toast({ title: t("quality.interlock.operationFailed"), description: e.message, variant: "destructive" }),
  });

  const approveUnlockMut = trpc.qualityInterlock.approveUnlock.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.interlock.approvalComplete") });
      utils.qualityInterlock.getLocks.invalidate();
      utils.qualityInterlock.lockSummary.invalidate();
    },
    onError: (e) => toast({ title: t("quality.interlock.operationFailed"), description: e.message, variant: "destructive" }),
  });

  const markAlertReadMut = trpc.qualityInterlock.markRead.useMutation({
    onSuccess: () => {
      utils.qualityInterlock.getAlerts.invalidate();
      utils.qualityInterlock.unreadCount.invalidate();
    },
  });

  const markAllReadMut = trpc.qualityInterlock.markAllRead.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.interlock.allMarkedRead") });
      utils.qualityInterlock.getAlerts.invalidate();
      utils.qualityInterlock.unreadCount.invalidate();
    },
  });

  const markActionedMut = trpc.qualityInterlock.markActioned.useMutation({
    onSuccess: () => {
      toast({ title: t("quality.interlock.markedProcessed") });
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
      <PageHeader
        icon={ShieldAlert}
        title={t("quality.interlock.title")}
        description={t("quality.interlock.description")}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => {
              utils.qualityInterlock.getLocks.invalidate();
              utils.qualityInterlock.lockSummary.invalidate();
              utils.qualityInterlock.getAlerts.invalidate();
            }}>
              <RefreshCw className="w-4 h-4 mr-1" /> {t("quality.interlock.refresh")}
            </Button>
            <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Lock className="w-4 h-4 mr-1" /> {t("quality.interlock.manualLock")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("quality.interlock.manualLockDialog")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("quality.interlock.targetProcess")}</Label>
                    <Select value={triggerForm.processCode} onValueChange={v => setTriggerForm(f => ({ ...f, processCode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROCESS_CODES.map(c => (
                          <SelectItem key={c} value={c}>{c} - {t(PROCESS_NAME_KEYS[c])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("quality.interlock.severityLevel")}</Label>
                    <Select value={triggerForm.severity} onValueChange={v => setTriggerForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">{t("quality.interlock.severityCritical")}</SelectItem>
                        <SelectItem value="major">{t("quality.interlock.severityMajor")}</SelectItem>
                        <SelectItem value="minor">{t("quality.interlock.severityMinor")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("quality.interlock.lockReason")}</Label>
                    <Textarea
                      value={triggerForm.reason}
                      onChange={e => setTriggerForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder={t("quality.interlock.lockReasonPlaceholder")}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">{t("quality.interlock.cancel")}</Button></DialogClose>
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
                    {triggerLockMut.isPending ? t("quality.interlock.locking") : t("quality.interlock.confirmLock")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Lock} label={t("quality.interlock.currentLocks")} value={summary.activeLocks || 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Clock} label={t("quality.interlock.pendingApproval")} value={summary.pendingUnlocks || 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={Unlock} label={t("quality.interlock.unlocked")} value={summary.totalUnlocked || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Bell} label={t("quality.interlock.unreadAlerts")} value={unreadCount} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="locks">
            <Lock className="w-4 h-4 mr-1" /> {t("quality.interlock.tabLock")}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-1" /> {t("quality.interlock.tabAlerts")}
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
                <SelectItem value="all">{t("quality.interlock.allStatuses")}</SelectItem>
                <SelectItem value="locked">{t("quality.interlock.statusLocked")}</SelectItem>
                <SelectItem value="unlock_requested">{t("quality.interlock.statusPending")}</SelectItem>
                <SelectItem value="unlocked">{t("quality.interlock.statusUnlocked")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {locksQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">{t("quality.common.loading")}</div>
          ) : locks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t("quality.interlock.noLocks")}</p>
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
                                {lock.process_code} - {PROCESS_NAME_KEYS[lock.process_code] ? t(PROCESS_NAME_KEYS[lock.process_code]) : lock.process_code}
                              </span>
                              <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0`}>
                                {t(statusStyle.labelKey)}
                              </Badge>
                              <Badge className={`${severityStyle.bg} ${severityStyle.text} border-0`}>
                                {t(severityStyle.labelKey)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{lock.reason}</p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{t("quality.interlock.lockedBy")}: {lock.locked_by || '-'}</span>
                              <span>{t("quality.interlock.lockTime")}: {lock.locked_at ? new Date(Number(lock.locked_at)).toLocaleString() : '-'}</span>
                              {lock.unlock_reason && <span>{t("quality.interlock.unlockReasonLabel")}: {lock.unlock_reason}</span>}
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
                              <Unlock className="w-3 h-3 mr-1" /> {t("quality.interlock.applyUnlock")}
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
                                <CheckCircle2 className="w-3 h-3 mr-1" /> {t("quality.interlock.approveBtn")}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => approveUnlockMut.mutate({ lockId: lock.id, approved: false, comments: "rejected" })}
                                disabled={approveUnlockMut.isPending}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> {t("quality.interlock.rejectBtn")}
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
            <p className="text-sm text-muted-foreground">{tpl("quality.interlock.alertCount", { count: alerts.length })}</p>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllReadMut.mutate({ projectId: selectedProject })}>
                <BellOff className="w-3 h-3 mr-1" /> {t("quality.interlock.markAllRead")}
              </Button>
            )}
          </div>

          {alertsQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">{t("quality.common.loading")}</div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t("quality.interlock.noAlerts")}</p>
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
                            onClick={() => markActionedMut.mutate({ alertId: alert.id, actionTaken: "confirmed" })}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t("quality.interlock.processed")}
                          </Button>
                        )}
                        {alert.is_actioned && (
                          <Badge variant="outline" className="text-green-400 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t("quality.interlock.processed")}
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
            <DialogTitle>{t("quality.interlock.unlockDialog")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("quality.interlock.unlockReason")}</Label>
              <Textarea
                value={unlockForm.unlockReason}
                onChange={e => setUnlockForm({ unlockReason: e.target.value })}
                placeholder={t("quality.interlock.unlockReasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("quality.interlock.cancel")}</Button></DialogClose>
            <Button
              disabled={!unlockForm.unlockReason || requestUnlockMut.isPending || !selectedLockId}
              onClick={() => selectedLockId && requestUnlockMut.mutate({
                lockId: selectedLockId,
                unlockReason: unlockForm.unlockReason,
              })}
            >
              {requestUnlockMut.isPending ? t("quality.interlock.submitting") : t("quality.interlock.submitRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
