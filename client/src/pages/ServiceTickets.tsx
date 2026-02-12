/**
 * 售后工单页面
 * 工单管理、SLA追踪、问题分类统计
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Plus, Search, Clock, CheckCircle2, AlertTriangle, User, Building2 } from "lucide-react";

type TicketStatus = "open" | "in_progress" | "pending_parts" | "resolved" | "closed";
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: "待处理", color: "bg-red-100 text-red-700" },
  in_progress: { label: "处理中", color: "bg-blue-100 text-blue-700" },
  pending_parts: { label: "等待备件", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "已解决", color: "bg-green-100 text-green-700" },
  closed: { label: "已关闭", color: "bg-gray-100 text-gray-700" },
};

const MOCK_TICKETS = [
  { id: "TK-2026-001", title: "清洗槽泄漏报修", customer: "上海大众", priority: "urgent", status: "in_progress" as TicketStatus, assignee: "陈工", createdAt: "2026-02-10", sla: "4h" },
  { id: "TK-2026-002", title: "PLC通讯异常", customer: "宝马慕尼黑", priority: "high", status: "open" as TicketStatus, assignee: "未分配", createdAt: "2026-02-11", sla: "8h" },
  { id: "TK-2026-003", title: "传送带更换", customer: "潍柴动力", priority: "medium", status: "pending_parts" as TicketStatus, assignee: "李工", createdAt: "2026-02-08", sla: "48h" },
  { id: "TK-2026-004", title: "干燥温度校准", customer: "英飞凌", priority: "low", status: "resolved" as TicketStatus, assignee: "张工", createdAt: "2026-02-05", sla: "72h" },
];

export default function ServiceTickets() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const filtered = MOCK_TICKETS.filter(t => {
    if (search && !t.title.includes(search) && !t.customer.includes(search)) return false;
    if (tab !== "all" && t.status !== tab) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket className="h-6 w-6 text-primary" />售后工单</h1>
          <p className="text-muted-foreground mt-1">工单管理 · SLA追踪 · 问题统计</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />创建工单</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-red-600">5</p><p className="text-xs text-muted-foreground">待处理</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-blue-600">8</p><p className="text-xs text-muted-foreground">处理中</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">3</p><p className="text-xs text-muted-foreground">等待备件</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">42</p><p className="text-xs text-muted-foreground">已解决</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">95%</p><p className="text-xs text-muted-foreground">SLA达标率</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>工单列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList><TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="open">待处理</TabsTrigger><TabsTrigger value="in_progress">处理中</TabsTrigger><TabsTrigger value="pending_parts">等待备件</TabsTrigger><TabsTrigger value="resolved">已解决</TabsTrigger></TabsList>
            <TabsContent value={tab} className="mt-4 space-y-2">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">{t.id}</span>
                      {t.priority === "urgent" && <Badge variant="destructive">紧急</Badge>}
                      {t.priority === "high" && <Badge className="bg-amber-500">高</Badge>}
                    </div>
                    <p className="font-medium mt-1">{t.title}</p>
                    <p className="text-sm text-muted-foreground">客户: {t.customer} · 处理人: {t.assignee} · SLA: {t.sla}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={STATUS_CONFIG[t.status].color}>{STATUS_CONFIG[t.status].label}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{t.createdAt}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
