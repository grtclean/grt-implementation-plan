/**
 * 临时权限管理页面
 * 管理员可为员工授予时限性临时权限
 *
 * Data source: trpc.accessControl.tempPermission.* (DB-backed)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Plus, Clock, User, CheckCircle2, AlertTriangle, Calendar, Search } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function TemporaryPermissions() {
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ user: "", role: "", module: "", reason: "", startDate: "", endDate: "" });

  // ─── tRPC ───
  const listQuery = trpc.accessControl.tempPermission.list.useQuery(undefined, QUERY_OPTS);
  const items = (listQuery.data?.items ?? []) as any[];
  const stats = listQuery.data?.stats ?? { active: 0, expired: 0, expiringSoon: 0, total: 0 };

  const createMut = trpc.accessControl.tempPermission.create.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      setShowCreateDialog(false);
      setFormData({ user: "", role: "", module: "", reason: "", startDate: "", endDate: "" });
      toast.success("临时权限已授予");
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMut = trpc.accessControl.tempPermission.revoke.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      toast.success("临时权限已撤销");
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = items.filter((p: any) => !search || (p.user ?? "").includes(search) || (p.module ?? "").includes(search));

  const handleCreate = () => {
    if (!formData.user.trim()) { toast.error("请选择用户"); return; }
    if (!formData.role) { toast.error("请选择角色"); return; }
    if (!formData.startDate || !formData.endDate) { toast.error("请填写日期范围"); return; }
    createMut.mutate({
      user: formData.user.trim(),
      role: formData.role,
      module: formData.module.trim(),
      reason: formData.reason.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
    });
  };

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Shield} title="临时权限管理" description="..." />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="临时权限管理"
        description="时限性权限授予 · 自动过期 · 审计追踪"
        actions={
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />授予临时权限</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>授予临时权限</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>目标用户</Label>
                  <Input placeholder="用户姓名" value={formData.user} onChange={e => setFormData(prev => ({ ...prev, user: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>授予角色</Label>
                  <Select value={formData.role} onValueChange={v => setFormData(prev => ({ ...prev, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bu_sales">销售工程师</SelectItem>
                      <SelectItem value="bu_pm">项目经理</SelectItem>
                      <SelectItem value="finance_specialist">财务专员</SelectItem>
                      <SelectItem value="hr_specialist">HR专员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>授权模块</Label>
                  <Input placeholder="如: 客户管理、项目管理" value={formData.module} onChange={e => setFormData(prev => ({ ...prev, module: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>开始日期</Label><Input type="date" value={formData.startDate} onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>结束日期</Label><Input type="date" value={formData.endDate} onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-2">
                  <Label>授权原因</Label>
                  <Input placeholder="说明授权原因..." value={formData.reason} onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
                </div>
              </div>
              <DialogFooter><Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "授予中..." : "确认授予"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={CheckCircle2} label="生效中" value={stats.active} iconColor="text-blue-600" iconBg="bg-blue-500/10" />
        <StatCard icon={Clock} label="已过期" value={stats.expired} iconColor="text-gray-400" iconBg="bg-gray-500/10" />
        <StatCard icon={AlertTriangle} label="即将过期(3天内)" value={stats.expiringSoon} iconColor="text-amber-600" iconBg="bg-amber-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>临时权限记录</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.user}</span>
                    <Badge variant="outline">{p.role}</Badge>
                    <Badge variant="secondary">{p.module}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.reason}</p>
                  <p className="text-xs text-muted-foreground"><Calendar className="inline h-3 w-3 mr-1" />{p.startDate} ~ {p.endDate} · 授权人: {p.grantedBy}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge className={p.status === "active" ? "bg-green-100 text-green-700" : p.status === "expired" ? "bg-gray-100 text-gray-500" : "bg-red-100 text-red-700"}>
                    {p.status === "active" ? "生效中" : p.status === "expired" ? "已过期" : "已撤销"}
                  </Badge>
                  {p.status === "active" && (
                    <div><Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => revokeMut.mutate({ id: p.id })} disabled={revokeMut.isPending}>撤销</Button></div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无临时权限记录</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
