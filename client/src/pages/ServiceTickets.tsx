/**
 * 售后工单页面
 * 工单管理、SLA追踪、问题分类统计
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Plus, Search, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

type TicketStatus = "open" | "in_progress" | "pending_parts" | "resolved" | "closed";
const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "待处理",
  in_progress: "处理中",
  pending_parts: "等待备件",
  resolved: "已解决",
  closed: "已关闭",
};
const ticketStatusColorMap = createStatusColorMap({
  "待处理": "red",
  "处理中": "blue",
  "等待备件": "orange",
  "已解决": "green",
  "已关闭": "gray",
});

// TODO: 接入 tRPC 后端接口替换
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
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Ticket}
        title="售后工单"
        description="工单管理 · SLA追踪 · 问题统计"
        actions={<Button><Plus className="h-4 w-4 mr-2" />创建工单</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={AlertTriangle} label="待处理" value={5} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Clock} label="处理中" value={8} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Ticket} label="等待备件" value={3} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已解决" value={42} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={TrendingUp} label="SLA达标率" value="95%" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>工单列表</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="open">待处理</TabsTrigger>
              <TabsTrigger value="in_progress">处理中</TabsTrigger>
              <TabsTrigger value="pending_parts">等待备件</TabsTrigger>
              <TabsTrigger value="resolved">已解决</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4 space-y-2">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
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
                    <StatusBadge color={ticketStatusColorMap[STATUS_LABELS[t.status]] ?? "gray"}>{STATUS_LABELS[t.status]}</StatusBadge>
                    <p className="text-xs text-muted-foreground mt-1">{t.createdAt}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Ticket className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">暂无工单</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
