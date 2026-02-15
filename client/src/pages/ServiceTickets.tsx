/**
 * 客户需求工单系统
 * SOP流转 · 满意度管理 · 工单统计
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Ticket,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Star,
  ArrowRight,
  CalendarDays,
  User,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// SOP状态
// ---------------------------------------------------------------------------
const STATUS_LABELS: Record<string, string> = {
  submitted: "已提交",
  reviewing: "评审中",
  scheduled: "已排期",
  developing: "开发中",
  testing: "测试中",
  delivered: "已交付",
  accepted: "已验收",
  closed: "已关闭",
  rejected: "已驳回",
};

const SOP_ORDER = [
  "submitted", "reviewing", "scheduled", "developing",
  "testing", "delivered", "accepted", "closed",
];

const statusColorMap = createStatusColorMap({
  "已提交": "blue",
  "评审中": "purple",
  "已排期": "orange",
  "开发中": "blue",
  "测试中": "yellow",
  "已交付": "green",
  "已验收": "green",
  "已关闭": "gray",
  "已驳回": "red",
});

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

const CATEGORY_LABELS: Record<string, string> = {
  requirement: "需求",
  bug: "缺陷",
  improvement: "改进",
  consultation: "咨询",
  complaint: "投诉",
};

const SOURCE_LABELS: Record<string, string> = {
  internal: "内部",
  external: "外部",
  email: "邮件",
  phone: "电话",
  meeting: "会议",
  portal: "门户",
};

// Valid next statuses per current status
const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ["reviewing", "rejected"],
  reviewing: ["scheduled", "rejected"],
  scheduled: ["developing"],
  developing: ["testing"],
  testing: ["delivered", "developing"],
  delivered: ["accepted", "testing"],
  accepted: ["closed"],
  rejected: ["submitted"],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ServiceTickets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);

  // tRPC queries
  const statsQuery = trpc.customerTicket.stats.useQuery();
  const listQuery = trpc.customerTicket.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    search: search || undefined,
    pageSize: 50,
  });
  const detailQuery = trpc.customerTicket.detail.useQuery(
    { ticketId: detailId! },
    { enabled: !!detailId },
  );

  // Mutations
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.customerTicket.list.invalidate();
    utils.customerTicket.stats.invalidate();
  };

  const createMutation = trpc.customerTicket.create.useMutation({ onSuccess: () => { invalidate(); setCreateOpen(false); } });
  const updateMutation = trpc.customerTicket.update.useMutation({ onSuccess: () => { invalidate(); utils.customerTicket.detail.invalidate(); } });
  const rateMutation = trpc.customerTicket.rate.useMutation({ onSuccess: () => { invalidate(); utils.customerTicket.detail.invalidate(); setRatingOpen(false); } });

  // Create form state
  const [form, setForm] = useState({
    title: "", description: "", customerName: "", customerContact: "",
    source: "internal", category: "requirement", priority: "medium",
    assigneeName: "", dueDate: "", estimatedHours: "",
  });

  const resetForm = () => setForm({
    title: "", description: "", customerName: "", customerContact: "",
    source: "internal", category: "requirement", priority: "medium",
    assigneeName: "", dueDate: "", estimatedHours: "",
  });

  // Rating state
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const stats = statsQuery.data;
  const tickets = listQuery.data?.items ?? [];
  const detail = detailQuery.data;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Ticket}
          title="客户需求工单"
          description="需求接收 · SOP流转 · 满意度管理"
          actions={
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />新建工单
            </Button>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard icon={AlertTriangle} label="待审" value={stats?.byStatus?.submitted ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={FileText} label="评审中" value={stats?.byStatus?.reviewing ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Clock} label="进行中" value={(stats?.byStatus?.scheduled ?? 0) + (stats?.byStatus?.developing ?? 0) + (stats?.byStatus?.testing ?? 0)} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={CheckCircle2} label="已交付" value={stats?.byStatus?.delivered ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={CheckCircle2} label="已关闭" value={stats?.byStatus?.closed ?? 0} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
          <StatCard icon={BarChart3} label="总工单" value={stats?.total ?? 0} />
          <StatCard icon={Star} label="满意度" value={stats?.avgSatisfaction ?? "-"} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={AlertTriangle} label="逾期" value={stats?.overdueCount ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* Filter Bar + List */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索工单号/标题/客户..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="优先级" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tickets.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setDetailId(t.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{t.ticketCode}</span>
                      {t.priority === "urgent" && <Badge variant="destructive">紧急</Badge>}
                      {t.priority === "high" && <Badge className="bg-amber-500 text-white">高</Badge>}
                      {t.category && <Badge variant="outline">{CATEGORY_LABELS[t.category] ?? t.category}</Badge>}
                    </div>
                    <p className="font-medium mt-1 truncate">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      客户: {t.customerName}
                      {t.assigneeName && ` · 负责人: ${t.assigneeName}`}
                      {t.dueDate && ` · 截止: ${t.dueDate}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge color={statusColorMap[STATUS_LABELS[t.status] ?? ""] ?? "gray"}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </StatusBadge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Ticket className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">暂无工单</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===================== Create Dialog ===================== */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>新建客户需求工单</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label>标题 *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="简要描述需求" />
              </div>
              <div className="space-y-1">
                <Label>详细描述</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>客户名称 *</Label>
                  <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>客户联系人</Label>
                  <Input value={form.customerContact} onChange={e => setForm(f => ({ ...f, customerContact: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>来源</Label>
                  <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>类别</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>优先级</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>负责人</Label>
                  <Input value={form.assigneeName} onChange={e => setForm(f => ({ ...f, assigneeName: e.target.value }))} placeholder="输入姓名" />
                </div>
                <div className="space-y-1">
                  <Label>截止日期</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>预估工时(h)</Label>
                  <Input type="number" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button
                disabled={!form.title || !form.customerName || createMutation.isPending}
                onClick={() => {
                  createMutation.mutate({
                    title: form.title,
                    description: form.description || undefined,
                    customerName: form.customerName,
                    customerContact: form.customerContact || undefined,
                    source: form.source,
                    category: form.category,
                    priority: form.priority,
                    assigneeName: form.assigneeName || undefined,
                    dueDate: form.dueDate || undefined,
                    estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
                  });
                }}
              >
                {createMutation.isPending ? "创建中..." : "创建工单"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===================== Detail Dialog ===================== */}
        <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{detail?.ticketCode}</span>
                {detail?.title}
              </DialogTitle>
            </DialogHeader>

            {detail && (
              <div className="space-y-5 py-2">
                {/* SOP Progress */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">SOP 流程进度</Label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {SOP_ORDER.map((s, i) => {
                      const idx = SOP_ORDER.indexOf(detail.status);
                      const isRejected = detail.status === "rejected";
                      const isCurrent = s === detail.status;
                      const isPast = !isRejected && i <= idx;
                      return (
                        <div key={s} className="flex items-center gap-1">
                          {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isCurrent
                                ? "bg-primary text-primary-foreground font-medium"
                                : isPast
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {STATUS_LABELS[s]}
                          </span>
                        </div>
                      );
                    })}
                    {detail.status === "rejected" && (
                      <Badge variant="destructive" className="ml-2">已驳回</Badge>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><span className="text-muted-foreground">客户：</span>{detail.customerName}</div>
                  <div><span className="text-muted-foreground">联系人：</span>{detail.customerContact ?? "-"}</div>
                  <div><span className="text-muted-foreground">来源：</span>{SOURCE_LABELS[detail.source] ?? detail.source}</div>
                  <div><span className="text-muted-foreground">类别：</span>{CATEGORY_LABELS[detail.category] ?? detail.category}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">优先级：</span>
                    {detail.priority === "urgent" && <Badge variant="destructive">紧急</Badge>}
                    {detail.priority === "high" && <Badge className="bg-amber-500 text-white">高</Badge>}
                    {detail.priority === "medium" && <Badge variant="outline">中</Badge>}
                    {detail.priority === "low" && <Badge variant="secondary">低</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">负责人：</span>
                    {detail.assigneeName ?? "未分配"}
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">截止：</span>
                    {detail.dueDate ?? "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">工时：</span>
                    {detail.estimatedHours ? `预估 ${detail.estimatedHours}h` : "-"}
                    {detail.actualHours ? ` / 实际 ${detail.actualHours}h` : ""}
                  </div>
                  <div><span className="text-muted-foreground">创建人：</span>{detail.createdByName ?? "-"}</div>
                  <div><span className="text-muted-foreground">创建时间：</span>{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}</div>
                </div>

                {/* Description */}
                {detail.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">描述</Label>
                    <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{detail.description}</p>
                  </div>
                )}

                {/* Resolution */}
                {detail.resolution && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">解决方案</Label>
                    <p className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 rounded-lg p-3">{detail.resolution}</p>
                  </div>
                )}

                {/* Satisfaction */}
                {detail.satisfactionRating && (
                  <div className="border rounded-lg p-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">客户满意度评分</Label>
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i <= detail.satisfactionRating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium">{detail.satisfactionRating}/5</span>
                    </div>
                    {detail.satisfactionComment && (
                      <p className="text-sm text-muted-foreground">{detail.satisfactionComment}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {/* Status transition buttons */}
                  {VALID_TRANSITIONS[detail.status]?.map(next => (
                    <Button
                      key={next}
                      size="sm"
                      variant={next === "rejected" ? "destructive" : "default"}
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ ticketId: detail.id, status: next })}
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      {STATUS_LABELS[next]}
                    </Button>
                  ))}

                  {/* Rate button */}
                  {["delivered", "accepted", "closed"].includes(detail.status) && !detail.satisfactionRating && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRating(5);
                        setRatingComment("");
                        setRatingOpen(true);
                      }}
                    >
                      <Star className="h-3 w-3 mr-1" />评分
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ===================== Rating Dialog ===================== */}
        <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>客户满意度评分</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} type="button" onClick={() => setRating(i)} className="focus:outline-none">
                    <Star className={`h-8 w-8 transition-colors ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-200"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="评价说明（选填）"
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRatingOpen(false)}>取消</Button>
              <Button
                disabled={rateMutation.isPending}
                onClick={() => {
                  if (detailId) {
                    rateMutation.mutate({
                      ticketId: detailId,
                      satisfactionRating: rating,
                      satisfactionComment: ratingComment || undefined,
                    });
                  }
                }}
              >
                {rateMutation.isPending ? "提交中..." : "提交评分"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
