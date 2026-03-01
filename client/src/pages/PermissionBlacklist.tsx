/**
 * 权限黑名单管理页面
 * 管理特定用户的权限禁止列表
 *
 * Data source: trpc.accessControl.blacklist.* (DB-backed)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Plus, Search, Lock, Unlock, AlertTriangle, Clock } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function PermissionBlacklist() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ user: "", department: "", blockedModule: "", blockedAction: "", reason: "" });

  // ─── tRPC ───
  const listQuery = trpc.accessControl.blacklist.list.useQuery(undefined, QUERY_OPTS);
  const items = (listQuery.data?.items ?? []) as any[];
  const stats = listQuery.data?.stats ?? { active: 0, lifted: 0, total: 0 };

  const createMut = trpc.accessControl.blacklist.create.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      setShowAdd(false);
      setFormData({ user: "", department: "", blockedModule: "", blockedAction: "", reason: "" });
      toast.success("黑名单已添加");
    },
    onError: (err) => toast.error(err.message),
  });

  const liftMut = trpc.accessControl.blacklist.lift.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      toast.success("黑名单已解除");
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = items.filter((b: any) => !search || (b.user ?? "").includes(search) || (b.blockedModule ?? "").includes(search));

  const handleCreate = () => {
    if (!formData.user.trim()) { toast.error("请输入目标用户"); return; }
    if (!formData.blockedModule.trim()) { toast.error("请选择限制模块"); return; }
    createMut.mutate({
      user: formData.user.trim(),
      department: formData.department.trim(),
      blockedModule: formData.blockedModule.trim(),
      blockedAction: formData.blockedAction.trim(),
      reason: formData.reason.trim(),
    });
  };

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ShieldAlert} title="权限黑名单" description="..." />
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
        icon={ShieldAlert}
        title="权限黑名单"
        description="特定用户权限禁止管理 · 安全审计"
        actions={
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="destructive"><Plus className="h-4 w-4 mr-2" />添加黑名单</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>添加权限黑名单</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>目标用户</Label>
                  <Input placeholder="搜索用户..." value={formData.user} onChange={e => setFormData(prev => ({ ...prev, user: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>部门</Label>
                  <Input placeholder="所属部门" value={formData.department} onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>限制模块</Label>
                  <Select value={formData.blockedModule} onValueChange={v => setFormData(prev => ({ ...prev, blockedModule: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择模块" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="财务管理">财务管理</SelectItem>
                      <SelectItem value="人力资源">人力资源</SelectItem>
                      <SelectItem value="合同管理">合同管理</SelectItem>
                      <SelectItem value="薪酬管理">薪酬管理</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>限制操作</Label>
                  <Input placeholder="如: 查看、导出、修改..." value={formData.blockedAction} onChange={e => setFormData(prev => ({ ...prev, blockedAction: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>原因说明</Label>
                  <Input placeholder="限制原因..." value={formData.reason} onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
                </div>
              </div>
              <DialogFooter><Button variant="destructive" onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? "添加中..." : "确认添加"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Lock} label="生效中黑名单" value={stats.active} iconColor="text-red-600" iconBg="bg-red-500/10" />
        <StatCard icon={Unlock} label="已解除" value={stats.lifted} iconColor="text-gray-400" iconBg="bg-gray-500/10" />
        <StatCard icon={ShieldAlert} label="总记录" value={stats.total} />
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-amber-800 dark:text-amber-200">权限黑名单操作具有最高优先级，将覆盖角色权限和临时权限。所有操作记录审计日志。</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>黑名单列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map((b: any) => (
              <div key={b.id} className={`flex items-center gap-4 p-4 rounded-lg border ${b.status === "active" ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  {b.status === "active" ? <Lock className="h-5 w-5 text-red-600" /> : <Unlock className="h-5 w-5 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.user}</span>
                    <Badge variant="outline">{b.department}</Badge>
                    <Badge variant="destructive">{b.blockedModule}</Badge>
                  </div>
                  <p className="text-sm mt-1">限制操作: {b.blockedAction}</p>
                  <p className="text-sm text-muted-foreground">原因: {b.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1"><Clock className="inline h-3 w-3 mr-1" />{b.createdAt} · 操作人: {b.createdBy}</p>
                </div>
                <div className="text-right">
                  <Badge className={b.status === "active" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}>{b.status === "active" ? "生效中" : "已解除"}</Badge>
                  {b.status === "active" && (
                    <div className="mt-2"><Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => liftMut.mutate({ id: b.id })} disabled={liftMut.isPending}>解除</Button></div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">暂无黑名单记录</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
