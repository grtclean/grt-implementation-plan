/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Remote Maintenance Command Center                          ║
 * ║  远程维护指挥中心                                            ║
 * ║  CEO mandate: Zero-Trust Remote Debugging Protocol          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Shield, ShieldAlert, ShieldCheck, ShieldOff,
  Clock, Wifi, WifiOff, Send, CheckCircle2, XCircle,
  AlertTriangle, Activity, History, Skull, Timer,
  Radio, Zap, Lock,
} from "lucide-react";

// ── Status Helpers ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:  { label: "待审批",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { label: "已批准",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30",     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ACTIVE:   { label: "隧道活跃", color: "bg-green-500/20 text-green-400 border-green-500/30",   icon: <Radio className="w-3.5 h-3.5 animate-pulse" /> },
  REJECTED: { label: "已拒绝",  color: "bg-red-500/20 text-red-400 border-red-500/30",         icon: <XCircle className="w-3.5 h-3.5" /> },
  EXPIRED:  { label: "已过期",  color: "bg-gray-500/20 text-gray-400 border-gray-500/30",      icon: <Timer className="w-3.5 h-3.5" /> },
  REVOKED:  { label: "已吊销",  color: "bg-red-700/20 text-red-500 border-red-700/30",         icon: <Skull className="w-3.5 h-3.5" /> },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  NORMAL:   { label: "普通", color: "bg-slate-600/30 text-slate-300" },
  URGENT:   { label: "紧急", color: "bg-orange-500/20 text-orange-400" },
  CRITICAL: { label: "危急", color: "bg-red-500/20 text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1 font-mono text-xs`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

// ── Countdown Timer ────────────────────────────────────────────

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("EXPIRED");
        setIsUrgent(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      setIsUrgent(diff < 600000); // <10 min
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return (
    <span className={`font-mono text-sm font-bold ${isUrgent ? "text-red-400 animate-pulse" : "text-green-400"}`}>
      {remaining}
    </span>
  );
}

// ── Section 1: Engineer Request Form ───────────────────────────

function RequestAccessSection() {
  const utils = trpc.useUtils();
  const createMut = trpc.remoteGovernance.request.create.useMutation({
    onSuccess: () => {
      utils.remoteGovernance.invalidate();
      setOpen(false);
      resetForm();
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    customerName: "",
    equipmentId: "",
    equipmentModel: "",
    targetIp: "",
    reasonForAccess: "",
    urgency: "NORMAL" as "NORMAL" | "URGENT" | "CRITICAL",
    requestedDurationHours: 1,
  });

  const resetForm = () =>
    setForm({ projectName: "", customerName: "", equipmentId: "", equipmentModel: "", targetIp: "", reasonForAccess: "", urgency: "NORMAL", requestedDurationHours: 1 });

  const myRequests = trpc.remoteGovernance.request.listMine.useQuery(undefined, { refetchInterval: 10000 });

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">远程接入申请 — Request Remote Access</CardTitle>
              <CardDescription>工程师通过此入口申请限时VPN隧道令牌</CardDescription>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Send className="w-4 h-4" /> 发起申请
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* My recent requests */}
        {myRequests.data && myRequests.data.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">我的近期申请</p>
            <div className="grid gap-2">
              {myRequests.data.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <span className="text-sm font-medium">{r.equipmentId}</span>
                    <span className="text-xs text-muted-foreground">{r.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{r.requestedDurationHours}h</Badge>
                    {r.tempVpnToken && (
                      <code className="text-xs font-mono text-green-400 bg-green-900/30 px-2 py-0.5 rounded">{r.tempVpnToken}</code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Request Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-400" /> 远程接入申请单</DialogTitle>
            <DialogDescription>请填写完整信息。审批通过后将生成限时VPN令牌。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">项目名称 *</label>
                <Input placeholder="GRT-4xx 项目名" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">客户名称 *</label>
                <Input placeholder="客户公司" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">设备编号 *</label>
                <Input placeholder="PLC-S7-1500-01" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">设备型号</label>
                <Input placeholder="Siemens S7-1500" value={form.equipmentModel} onChange={(e) => setForm({ ...form, equipmentModel: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">目标IP</label>
                <Input placeholder="192.168.x.x" value={form.targetIp} onChange={(e) => setForm({ ...form, targetIp: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">紧急程度</label>
                <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">普通</SelectItem>
                    <SelectItem value="URGENT">紧急</SelectItem>
                    <SelectItem value="CRITICAL">危急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">申请时长</label>
              <Select value={String(form.requestedDurationHours)} onValueChange={(v) => setForm({ ...form, requestedDurationHours: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 小时</SelectItem>
                  <SelectItem value="2">2 小时</SelectItem>
                  <SelectItem value="4">4 小时</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">接入原因 * (至少10字)</label>
              <Textarea
                placeholder="例：修复泵联锁逻辑Bug — M7阶段FAT测试急停延迟3秒"
                className="min-h-[80px]"
                value={form.reasonForAccess}
                onChange={(e) => setForm({ ...form, reasonForAccess: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              disabled={createMut.isPending || !form.projectName || !form.customerName || !form.equipmentId || form.reasonForAccess.length < 10}
              onClick={() => createMut.mutate(form)}
            >
              <Send className="w-4 h-4" /> {createMut.isPending ? "提交中..." : "提交申请"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Section 2: Manager Approval Panel ──────────────────────────

function PendingApprovalsSection() {
  const utils = trpc.useUtils();
  const pendingQ = trpc.remoteGovernance.approval.listPending.useQuery(undefined, { refetchInterval: 5000 });
  const approveMut = trpc.remoteGovernance.approval.approve.useMutation({ onSuccess: () => utils.remoteGovernance.invalidate() });
  const rejectMut = trpc.remoteGovernance.approval.reject.useMutation({ onSuccess: () => utils.remoteGovernance.invalidate() });

  const [rejectDialog, setRejectDialog] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = () => {
    if (rejectDialog && rejectReason.trim()) {
      rejectMut.mutate({ requestId: rejectDialog.id, reason: rejectReason });
      setRejectDialog(null);
      setRejectReason("");
    }
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-lg">待审批队列 — Pending Approvals</CardTitle>
            <CardDescription>主管/CEO审批远程接入请求并生成限时VPN令牌</CardDescription>
          </div>
          {pendingQ.data && pendingQ.data.length > 0 && (
            <Badge className="bg-amber-500/30 text-amber-300 ml-auto text-base px-3 py-1 animate-pulse">{pendingQ.data.length} 待处理</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!pendingQ.data || pendingQ.data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-green-500/50" />
            <p>暂无待审批请求</p>
          </div>
        ) : (
          pendingQ.data.map((r: any) => (
            <div key={r.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.engineerName}</span>
                    <Badge variant="outline" className={URGENCY_CONFIG[r.urgency]?.color ?? ""}>{URGENCY_CONFIG[r.urgency]?.label ?? r.urgency}</Badge>
                    <Badge variant="outline" className="text-xs">{r.requestedDurationHours}h</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.projectName} — {r.customerName}</p>
                </div>
                <code className="text-xs text-muted-foreground">{r.equipmentId}{r.targetIp ? ` @ ${r.targetIp}` : ""}</code>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/30">
                <p className="text-sm">{r.reasonForAccess}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-900/20" onClick={() => setRejectDialog({ id: r.id, name: r.engineerName })}>
                  <XCircle className="w-4 h-4 mr-1" /> 拒绝
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 gap-2 text-base px-6 py-5 font-bold shadow-lg shadow-green-900/30"
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate({ requestId: r.id })}
                >
                  <ShieldCheck className="w-5 h-5" /> {approveMut.isPending ? "生成中..." : "批准并生成令牌"}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝 {rejectDialog?.name} 的接入请求</DialogTitle>
            <DialogDescription>请填写拒绝原因。</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="拒绝原因..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog(null)}>取消</Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={!rejectReason.trim()} onClick={handleReject}>确认拒绝</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Section 3: Active Tunnels + Kill Switch ────────────────────

function ActiveTunnelsSection() {
  const utils = trpc.useUtils();
  const activeQ = trpc.remoteGovernance.tunnel.listActive.useQuery(undefined, { refetchInterval: 3000 });
  const revokeMut = trpc.remoteGovernance.tunnel.revoke.useMutation({ onSuccess: () => utils.remoteGovernance.invalidate() });

  const [killTarget, setKillTarget] = useState<{ id: number; token: string; engineer: string } | null>(null);
  const [killReason, setKillReason] = useState("");

  const handleKill = () => {
    if (killTarget && killReason.trim()) {
      revokeMut.mutate({ requestId: killTarget.id, reason: killReason });
      setKillTarget(null);
      setKillReason("");
    }
  };

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-950/20 to-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <CardTitle className="text-lg">活跃隧道 — Active Tunnels</CardTitle>
            <CardDescription>实时监控所有VPN隧道 · 倒计时到期自动断开</CardDescription>
          </div>
          {activeQ.data && activeQ.data.length > 0 && (
            <Badge className="bg-green-500/30 text-green-300 ml-auto gap-1"><Radio className="w-3 h-3 animate-pulse" /> {activeQ.data.length} 活跃</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!activeQ.data || activeQ.data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <WifiOff className="w-10 h-10 mx-auto mb-2 text-slate-500/50" />
            <p>当前无活跃隧道</p>
          </div>
        ) : (
          activeQ.data.map((r: any) => (
            <div key={r.id} className="p-4 rounded-xl bg-slate-800/60 border border-green-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="font-semibold">{r.engineerName}</span>
                  <code className="text-xs font-mono text-green-400 bg-green-900/30 px-2 py-0.5 rounded">{r.tempVpnToken}</code>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">剩余时间</p>
                    <CountdownTimer expiresAt={r.expiresAt} />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-700 hover:bg-red-800 gap-1 font-bold shadow-lg shadow-red-900/40"
                    onClick={() => setKillTarget({ id: r.id, token: r.tempVpnToken, engineer: r.engineerName })}
                  >
                    <Zap className="w-4 h-4" /> Kill Switch
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{r.projectName}</span>
                <span>{r.equipmentId}{r.targetIp ? ` @ ${r.targetIp}` : ""}</span>
                <span>{r.customerName}</span>
                <span>审批人: {r.approverName}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Kill Switch Confirmation Dialog */}
      <Dialog open={!!killTarget} onOpenChange={() => setKillTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldOff className="w-5 h-5" /> 紧急吊销VPN令牌
            </DialogTitle>
            <DialogDescription>
              即将吊销 <strong>{killTarget?.engineer}</strong> 的令牌 <code className="text-red-400">{killTarget?.token}</code>。此操作不可逆。
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="吊销原因（必填）..." value={killReason} onChange={(e) => setKillReason(e.target.value)} className="border-red-500/30" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setKillTarget(null)}>取消</Button>
            <Button className="bg-red-700 hover:bg-red-800 gap-2 font-bold" disabled={!killReason.trim() || revokeMut.isPending} onClick={handleKill}>
              <Zap className="w-4 h-4" /> {revokeMut.isPending ? "吊销中..." : "确认吊销 — Kill Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Section 4: Audit History ───────────────────────────────────

function AuditHistorySection() {
  const historyQ = trpc.remoteGovernance.dashboard.history.useQuery({ limit: 30, offset: 0 }, { refetchInterval: 15000 });

  return (
    <Card className="border-slate-600/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-600/20">
            <History className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <CardTitle className="text-lg">审计追踪 — Audit Trail</CardTitle>
            <CardDescription>所有远程接入请求的完整生命周期记录</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-2 pr-3">ID</th>
                <th className="pb-2 pr-3">工程师</th>
                <th className="pb-2 pr-3">设备</th>
                <th className="pb-2 pr-3">客户</th>
                <th className="pb-2 pr-3">时长</th>
                <th className="pb-2 pr-3">状态</th>
                <th className="pb-2 pr-3">VPN令牌</th>
                <th className="pb-2">申请时间</th>
              </tr>
            </thead>
            <tbody>
              {historyQ.data?.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2 pr-3 font-mono text-xs">#{r.id}</td>
                  <td className="py-2 pr-3">{r.engineerName}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.equipmentId}</td>
                  <td className="py-2 pr-3">{r.customerName}</td>
                  <td className="py-2 pr-3">{r.requestedDurationHours}h</td>
                  <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2 pr-3">{r.tempVpnToken ? <code className="text-xs font-mono text-green-400">{r.tempVpnToken}</code> : "—"}</td>
                  <td className="py-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!historyQ.data || historyQ.data.length === 0) && (
            <p className="text-center py-6 text-muted-foreground">暂无历史记录</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function RemoteGovernanceDashboard() {
  const statsQ = trpc.remoteGovernance.dashboard.stats.useQuery(undefined, { refetchInterval: 5000 });
  const stats = statsQ.data;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/20">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">远程维护指挥中心</h1>
          <p className="text-muted-foreground">Remote Maintenance Command Center — Zero-Trust VPN Governance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-yellow-500/20 bg-yellow-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{stats?.pendingCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">待审批</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Wifi className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{stats?.activeCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">活跃隧道</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{stats?.todayRequestCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">今日请求</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldOff className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{stats?.revokedCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">已吊销</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incident Banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-950/30 border border-red-500/20">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-300">
          <strong>CEO指令：</strong>因Siemens PLC被误覆写事件，所有远程调试必须通过本系统申请限时VPN令牌。禁止直接VPN连接。违规者立即吊销令牌并记录审计日志。
        </p>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="command" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="command" className="gap-1"><Shield className="w-4 h-4" /> 指挥台</TabsTrigger>
          <TabsTrigger value="request" className="gap-1"><Send className="w-4 h-4" /> 工程师申请</TabsTrigger>
          <TabsTrigger value="tunnels" className="gap-1"><Wifi className="w-4 h-4" /> 活跃隧道</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="w-4 h-4" /> 审计追踪</TabsTrigger>
        </TabsList>

        <TabsContent value="command" className="space-y-4">
          <PendingApprovalsSection />
          <ActiveTunnelsSection />
        </TabsContent>

        <TabsContent value="request">
          <RequestAccessSection />
        </TabsContent>

        <TabsContent value="tunnels">
          <ActiveTunnelsSection />
        </TabsContent>

        <TabsContent value="history">
          <AuditHistorySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
