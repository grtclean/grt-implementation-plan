/**
 * 临时权限管理页面
 * 管理员可为员工授予时限性临时权限
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield, Plus, Clock, User, CheckCircle2, XCircle, AlertTriangle, Calendar, Search } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

interface TempPermission {
  id: string;
  user: string;
  role: string;
  module: string;
  reason: string;
  grantedBy: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "revoked";
}

const MOCK_TEMP_PERMS: TempPermission[] = [
  { id: "TP-001", user: "赵工", role: "bu_sales", module: "客户管理", reason: "临时支援BU3销售", grantedBy: "王总", startDate: "2026-02-01", endDate: "2026-02-28", status: "active" },
  { id: "TP-002", user: "陈工", role: "finance_specialist", module: "费用报销审批", reason: "财务休假期间代理审批", grantedBy: "钱经理", startDate: "2026-02-10", endDate: "2026-02-14", status: "active" },
  { id: "TP-003", user: "李工", role: "hr_specialist", module: "考勤管理", reason: "协助HR月度考勤统计", grantedBy: "孙经理", startDate: "2026-01-25", endDate: "2026-01-31", status: "expired" },
  { id: "TP-004", user: "张工", role: "bu_pm", module: "项目管理", reason: "紧急项目临时项目经理", grantedBy: "李总", startDate: "2026-02-05", endDate: "2026-03-05", status: "active" },
];

export default function TemporaryPermissions() {
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const filtered = MOCK_TEMP_PERMS.filter(p => !search || p.user.includes(search) || p.module.includes(search));

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
                <div className="space-y-2"><Label>目标用户</Label><Select><SelectTrigger><SelectValue placeholder="选择用户" /></SelectTrigger><SelectContent><SelectItem value="zhao">赵工</SelectItem><SelectItem value="chen">陈工</SelectItem><SelectItem value="li">李工</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>授予角色</Label><Select><SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger><SelectContent><SelectItem value="bu_sales">销售工程师</SelectItem><SelectItem value="bu_pm">项目经理</SelectItem><SelectItem value="finance_specialist">财务专员</SelectItem><SelectItem value="hr_specialist">HR专员</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>授权模块</Label><Input placeholder="如: 客户管理、项目管理" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>开始日期</Label><Input type="date" /></div>
                  <div className="space-y-2"><Label>结束日期</Label><Input type="date" /></div>
                </div>
                <div className="space-y-2"><Label>授权原因</Label><Input placeholder="说明授权原因..." /></div>
              </div>
              <DialogFooter><Button onClick={() => setShowCreateDialog(false)}>确认授予</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={CheckCircle2} label="生效中" value={3} iconColor="text-blue-600" iconBg="bg-blue-500/10" />
        <StatCard icon={Clock} label="已过期" value={8} iconColor="text-gray-400" iconBg="bg-gray-500/10" />
        <StatCard icon={AlertTriangle} label="即将过期(3天内)" value={1} iconColor="text-amber-600" iconBg="bg-amber-500/10" />
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
            {filtered.map(p => (
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
                    <div><Button variant="ghost" size="sm" className="h-6 text-xs text-destructive">撤销</Button></div>
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
