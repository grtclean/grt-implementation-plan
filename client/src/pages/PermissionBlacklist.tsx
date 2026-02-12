/**
 * 权限黑名单管理页面
 * 管理特定用户的权限禁止列表
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Plus, Search, User, Lock, Unlock, AlertTriangle, Clock } from "lucide-react";

interface BlacklistEntry {
  id: string;
  user: string;
  department: string;
  blockedModule: string;
  blockedAction: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  status: "active" | "lifted";
}

const MOCK_BLACKLIST: BlacklistEntry[] = [
  { id: "BL-001", user: "赵某", department: "销售部", blockedModule: "财务管理", blockedAction: "查看成本数据", reason: "离职过渡期限制敏感数据访问", createdBy: "HR经理", createdAt: "2026-02-01", status: "active" },
  { id: "BL-002", user: "钱某", department: "研发部", blockedModule: "合同管理", blockedAction: "导出合同", reason: "竞业协议限制", createdBy: "法务部", createdAt: "2026-01-15", status: "active" },
  { id: "BL-003", user: "孙某", department: "生产部", blockedModule: "薪酬管理", blockedAction: "查看他人薪资", reason: "数据泄露事件处罚", createdBy: "admin", createdAt: "2025-12-20", status: "lifted" },
];

export default function PermissionBlacklist() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = MOCK_BLACKLIST.filter(b => !search || b.user.includes(search) || b.blockedModule.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" />权限黑名单</h1>
          <p className="text-muted-foreground mt-1">特定用户权限禁止管理 · 安全审计</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button variant="destructive"><Plus className="h-4 w-4 mr-2" />添加黑名单</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>添加权限黑名单</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>目标用户</Label><Input placeholder="搜索用户..." /></div>
              <div className="space-y-2"><Label>限制模块</Label><Select><SelectTrigger><SelectValue placeholder="选择模块" /></SelectTrigger><SelectContent><SelectItem value="finance">财务管理</SelectItem><SelectItem value="hr">人力资源</SelectItem><SelectItem value="contract">合同管理</SelectItem><SelectItem value="salary">薪酬管理</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>限制操作</Label><Input placeholder="如: 查看、导出、修改..." /></div>
              <div className="space-y-2"><Label>原因说明</Label><Input placeholder="限制原因..." /></div>
            </div>
            <DialogFooter><Button variant="destructive" onClick={() => setShowAdd(false)}>确认添加</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200"><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-red-600">2</p><p className="text-sm text-muted-foreground">生效中黑名单</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-gray-400">1</p><p className="text-sm text-muted-foreground">已解除</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">3</p><p className="text-sm text-muted-foreground">总记录</p></CardContent></Card>
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
            {filtered.map(b => (
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
                    <div className="mt-2"><Button variant="outline" size="sm" className="h-7 text-xs">解除</Button></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
