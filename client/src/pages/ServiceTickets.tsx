/**
 * 客户需求工单系统
 * SOP流转 · 满意度管理 · 工单统计
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
const STATUS_LABEL_KEYS: Record<string, string> = {
  submitted: "afterSales.tickets.statusSubmitted",
  reviewing: "afterSales.tickets.statusReviewing",
  scheduled: "afterSales.tickets.statusScheduled",
  developing: "afterSales.tickets.statusDeveloping",
  testing: "afterSales.tickets.statusTesting",
  delivered: "afterSales.tickets.statusDelivered",
  accepted: "afterSales.tickets.statusAccepted",
  closed: "afterSales.tickets.statusClosed",
  rejected: "afterSales.tickets.statusRejected",
};

const SOP_ORDER = [
  "submitted", "reviewing", "scheduled", "developing",
  "testing", "delivered", "accepted", "closed",
];

const statusColorMapByKey: Record<string, string> = {
  submitted: "blue",
  reviewing: "purple",
  scheduled: "orange",
  developing: "blue",
  testing: "yellow",
  delivered: "green",
  accepted: "green",
  closed: "gray",
  rejected: "red",
};

const PRIORITY_LABEL_KEYS: Record<string, string> = {
  urgent: "afterSales.tickets.priorityUrgent",
  high: "afterSales.tickets.priorityHigh",
  medium: "afterSales.tickets.priorityMedium",
  low: "afterSales.tickets.priorityLow",
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  requirement: "afterSales.tickets.categoryRequirement",
  bug: "afterSales.tickets.categoryBug",
  improvement: "afterSales.tickets.categoryImprovement",
  consultation: "afterSales.tickets.categoryConsultation",
  complaint: "afterSales.tickets.categoryComplaint",
};

const SOURCE_LABEL_KEYS: Record<string, string> = {
  internal: "afterSales.tickets.sourceInternal",
  external: "afterSales.tickets.sourceExternal",
  email: "afterSales.tickets.sourceEmail",
  phone: "afterSales.tickets.sourcePhone",
  meeting: "afterSales.tickets.sourceMeeting",
  portal: "afterSales.tickets.sourcePortal",
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
  const { t } = useLanguage();
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
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Ticket}
          title={t("afterSales.tickets.title")}
          description={t("afterSales.tickets.desc")}
          actions={
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />{t("afterSales.tickets.newTicket")}
            </Button>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard icon={AlertTriangle} label={t("afterSales.tickets.pendingReview")} value={stats?.byStatus?.submitted ?? 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={FileText} label={t("afterSales.tickets.reviewing")} value={stats?.byStatus?.reviewing ?? 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          <StatCard icon={Clock} label={t("afterSales.tickets.ongoing")} value={(stats?.byStatus?.scheduled ?? 0) + (stats?.byStatus?.developing ?? 0) + (stats?.byStatus?.testing ?? 0)} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={CheckCircle2} label={t("afterSales.tickets.delivered")} value={stats?.byStatus?.delivered ?? 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={CheckCircle2} label={t("afterSales.tickets.closed")} value={stats?.byStatus?.closed ?? 0} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
          <StatCard icon={BarChart3} label={t("afterSales.tickets.totalTickets")} value={stats?.total ?? 0} />
          <StatCard icon={Star} label={t("afterSales.tickets.satisfaction")} value={stats?.avgSatisfaction ?? "-"} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={AlertTriangle} label={t("afterSales.tickets.overdue")} value={stats?.overdueCount ?? 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* Filter Bar + List */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("afterSales.tickets.searchPlaceholder")} className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("afterSales.tickets.allStatus")}</SelectItem>
                  {Object.entries(STATUS_LABEL_KEYS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="优先级" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("afterSales.tickets.allPriority")}</SelectItem>
                  {Object.entries(PRIORITY_LABEL_KEYS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tickets.map(tk => (
                <div
                  key={tk.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setDetailId(tk.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">{tk.ticketCode}</span>
                      {tk.priority === "urgent" && <Badge variant="destructive">{t("afterSales.tickets.priorityUrgent")}</Badge>}
                      {tk.priority === "high" && <Badge className="bg-amber-500 text-white">{t("afterSales.tickets.priorityHigh")}</Badge>}
                      {tk.category && <Badge variant="outline">{t(CATEGORY_LABEL_KEYS[tk.category] ?? tk.category)}</Badge>}
                    </div>
                    <p className="font-medium mt-1 truncate">{tk.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("afterSales.tickets.customer")}: {tk.customerName}
                      {tk.assigneeName && ` · ${t("afterSales.tickets.assignee")}: ${tk.assigneeName}`}
                      {tk.dueDate && ` · ${t("afterSales.tickets.dueDate")}: ${tk.dueDate}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge color={(statusColorMapByKey[tk.status] ?? "gray") as "blue" | "green" | "red" | "yellow" | "orange" | "purple" | "gray"}>
                      {t(STATUS_LABEL_KEYS[tk.status] ?? tk.status)}
                    </StatusBadge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tk.createdAt ? new Date(tk.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Ticket className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">{t("afterSales.tickets.noTickets")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===================== Create Dialog ===================== */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("afterSales.tickets.createTitle")}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label>{t("afterSales.tickets.titleLabel")}</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("afterSales.tickets.titlePlaceholder")} />
              </div>
              <div className="space-y-1">
                <Label>{t("afterSales.tickets.descriptionLabel")}</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.customerName")}</Label>
                  <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.customerContact")}</Label>
                  <Input value={form.customerContact} onChange={e => setForm(f => ({ ...f, customerContact: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.source")}</Label>
                  <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_LABEL_KEYS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.category")}</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABEL_KEYS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.priority")}</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABEL_KEYS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{t(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.assigneeName")}</Label>
                  <Input value={form.assigneeName} onChange={e => setForm(f => ({ ...f, assigneeName: e.target.value }))} placeholder={t("afterSales.tickets.assigneePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.dueDateLabel")}</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t("afterSales.tickets.estimatedHours")}</Label>
                  <Input type="number" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("afterSales.tickets.cancel")}</Button>
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
                {createMutation.isPending ? t("afterSales.tickets.creating") : t("afterSales.tickets.createBtn")}
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
                  <Label className="text-xs text-muted-foreground mb-2 block">{t("afterSales.tickets.sopProgress")}</Label>
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
                            {t(STATUS_LABEL_KEYS[s])}
                          </span>
                        </div>
                      );
                    })}
                    {detail.status === "rejected" && (
                      <Badge variant="destructive" className="ml-2">{t("afterSales.tickets.statusRejected")}</Badge>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><span className="text-muted-foreground">{t("afterSales.tickets.customer")}:</span> {detail.customerName}</div>
                  <div><span className="text-muted-foreground">{t("afterSales.tickets.contactLabel")}:</span> {detail.customerContact ?? "-"}</div>
                  <div><span className="text-muted-foreground">{t("afterSales.tickets.sourceLabel")}:</span> {t(SOURCE_LABEL_KEYS[detail.source] ?? detail.source)}</div>
                  <div><span className="text-muted-foreground">{t("afterSales.tickets.categoryLabel")}:</span> {t(CATEGORY_LABEL_KEYS[detail.category] ?? detail.category)}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("afterSales.tickets.priorityLabel")}:</span>
                    {detail.priority === "urgent" && <Badge variant="destructive">{t("afterSales.tickets.priorityUrgent")}</Badge>}
                    {detail.priority === "high" && <Badge className="bg-amber-500 text-white">{t("afterSales.tickets.priorityHigh")}</Badge>}
                    {detail.priority === "medium" && <Badge variant="outline">{t("afterSales.tickets.priorityMedium")}</Badge>}
                    {detail.priority === "low" && <Badge variant="secondary">{t("afterSales.tickets.priorityLow")}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("afterSales.tickets.assignee")}:</span>
                    {detail.assigneeName ?? t("afterSales.tickets.unassigned")}
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("afterSales.tickets.dueDate")}:</span>
                    {detail.dueDate ?? "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("afterSales.tickets.workHours")}:</span>
                    {detail.estimatedHours ? ` ${t("afterSales.tickets.estimatedLabel")} ${detail.estimatedHours}h` : " -"}
                    {detail.actualHours ? ` / ${t("afterSales.tickets.actualLabel")} ${detail.actualHours}h` : ""}
                  </div>
                  <div><span className="text-muted-foreground">{t("afterSales.tickets.createdBy")}:</span> {detail.createdByName ?? "-"}</div>
                  <div><span className="text-muted-foreground">{t("afterSales.tickets.createdAt")}:</span> {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "-"}</div>
                </div>

                {/* Description */}
                {detail.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">{t("afterSales.tickets.descriptionTitle")}</Label>
                    <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{detail.description}</p>
                  </div>
                )}

                {/* Resolution */}
                {detail.resolution && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">{t("afterSales.tickets.resolution")}</Label>
                    <p className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 rounded-lg p-3">{detail.resolution}</p>
                  </div>
                )}

                {/* Satisfaction */}
                {detail.satisfactionRating && (
                  <div className="border rounded-lg p-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">{t("afterSales.tickets.satisfactionRating")}</Label>
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
                      {t(STATUS_LABEL_KEYS[next])}
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
                      <Star className="h-3 w-3 mr-1" />{t("afterSales.tickets.rate")}
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
            <DialogHeader><DialogTitle>{t("afterSales.tickets.ratingTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} type="button" onClick={() => setRating(i)} className="focus:outline-none">
                    <Star className={`h-8 w-8 transition-colors ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-200"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder={t("afterSales.tickets.ratingComment")}
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRatingOpen(false)}>{t("afterSales.tickets.cancel")}</Button>
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
                {rateMutation.isPending ? t("afterSales.tickets.submittingRating") : t("afterSales.tickets.submitRating")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
