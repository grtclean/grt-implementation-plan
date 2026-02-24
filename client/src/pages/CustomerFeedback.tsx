/**
 * 客户反馈页面
 * 沟通记录 · 满意度追踪 · NPS管理
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageCircle,
  Plus,
  Search,
  Star,
  ThumbsUp,
  TrendingUp,
  Phone,
  Mail,
  Video,
  Users,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CustomerFeedback() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("comm");
  const [search, setSearch] = useState("");
  const [commTypeFilter, setCommTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Labels (inside component so t() is available)
  // ---------------------------------------------------------------------------
  const COMM_TYPE_LABELS: Record<string, string> = {
    email: t("crm.feedback.typeEmail"),
    phone: t("crm.feedback.typePhone"),
    meeting: t("crm.feedback.typeMeeting"),
    chat: t("crm.feedback.typeChat"),
    video: t("crm.feedback.typeVideo"),
    onsite: t("crm.feedback.typeOnsite"),
  };

  const commTypeColorMap = createStatusColorMap({
    [t("crm.feedback.typeEmail")]: "blue",
    [t("crm.feedback.typePhone")]: "green",
    [t("crm.feedback.typeMeeting")]: "purple",
    [t("crm.feedback.typeChat")]: "orange",
    [t("crm.feedback.typeVideo")]: "yellow",
    [t("crm.feedback.typeOnsite")]: "red",
  });

  const COMM_TYPE_ICONS: Record<string, typeof Mail> = {
    email: Mail,
    phone: Phone,
    meeting: Users,
    chat: MessageCircle,
    video: Video,
    onsite: MapPin,
  };

  // Comm records query
  const commQuery = trpc.customerComm.list.useQuery({
    commType: commTypeFilter !== "all" ? commTypeFilter : undefined,
    search: search || undefined,
    pageSize: 50,
  });

  // Rated tickets query (for satisfaction tab)
  const ratedQuery = trpc.customerTicket.list.useQuery({ pageSize: 100 });
  const statsQuery = trpc.customerTicket.stats.useQuery();

  const utils = trpc.useUtils();
  const createMutation = trpc.customerComm.create.useMutation({
    onSuccess: () => {
      utils.customerComm.list.invalidate();
      setCreateOpen(false);
    },
  });

  // Create form
  const [form, setForm] = useState({
    customerName: "", commType: "email", subject: "", content: "",
    commDate: new Date().toISOString().slice(0, 16), duration: "",
    actionItems: "", nextFollowUpDate: "",
  });

  const resetForm = () => setForm({
    customerName: "", commType: "email", subject: "", content: "",
    commDate: new Date().toISOString().slice(0, 16), duration: "",
    actionItems: "", nextFollowUpDate: "",
  });

  const commRecords = commQuery.data?.items ?? [];
  const allTickets = ratedQuery.data?.items ?? [];
  const ratedTickets = allTickets.filter(t => t.satisfactionRating != null);
  const stats = statsQuery.data;

  // Computed stats
  const avgRating = stats?.avgSatisfaction ?? 0;
  const totalFeedback = ratedTickets.length;
  const satisfiedRate = totalFeedback > 0
    ? Math.round((ratedTickets.filter(t => (t.satisfactionRating ?? 0) >= 4).length / totalFeedback) * 100)
    : 0;
  const pendingFollowUp = commRecords.filter(r =>
    r.nextFollowUpDate && new Date(r.nextFollowUpDate) >= new Date(),
  ).length;

  return (
      <div className="space-y-6">
        <PageHeader
          icon={MessageCircle}
          title={t("crm.feedback.title")}
          description={t("crm.feedback.description")}
          actions={
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />{t("crm.feedback.newCommRecord")}
            </Button>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Star} label={t("crm.feedback.avgRating")} value={avgRating || "-"} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={TrendingUp} label={t("crm.feedback.totalFeedback")} value={totalFeedback} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={ThumbsUp} label={t("crm.feedback.satisfiedRate")} value={totalFeedback > 0 ? `${satisfiedRate}%` : "-"} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={Calendar} label={t("crm.feedback.pendingFollowUp")} value={pendingFollowUp} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="comm">{t("crm.feedback.tabComm")}</TabsTrigger>
            <TabsTrigger value="satisfaction">{t("crm.feedback.tabSatisfaction")}</TabsTrigger>
          </TabsList>

          {/* ========== Tab 1: Communication Records ========== */}
          <TabsContent value="comm" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t("crm.feedback.searchPlaceholder")} className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={commTypeFilter} onValueChange={setCommTypeFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("crm.feedback.commType")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("crm.feedback.allTypes")}</SelectItem>
                      {Object.entries(COMM_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {commRecords.map(r => {
                    const TypeIcon = COMM_TYPE_ICONS[r.commType] ?? MessageCircle;
                    return (
                      <div key={r.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">{r.recordCode}</span>
                              <StatusBadge color={commTypeColorMap[COMM_TYPE_LABELS[r.commType] ?? ""] ?? "gray"}>
                                <TypeIcon className="h-3 w-3 mr-1 inline" />
                                {COMM_TYPE_LABELS[r.commType] ?? r.commType}
                              </StatusBadge>
                              {r.ticketId && <Badge variant="outline" className="text-xs">{t("crm.feedback.linkedTicket")}</Badge>}
                            </div>
                            <p className="font-medium mt-1">{r.subject}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {t("crm.feedback.customer")}: {r.customerName}
                              {r.duration ? ` · ${t("crm.feedback.duration")}: ${r.duration}${t("crm.feedback.minutes")}` : ""}
                              {r.createdByName ? ` · ${t("crm.feedback.recorder")}: ${r.createdByName}` : ""}
                            </p>
                            {r.summary && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>
                            )}
                            {r.actionItems && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">{t("crm.feedback.actionItems")}: </span>{r.actionItems}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {r.commDate ? new Date(r.commDate).toLocaleDateString() : ""}
                            </div>
                            {r.nextFollowUpDate && (
                              <div className="flex items-center gap-1 mt-1 text-orange-500">
                                <Calendar className="h-3 w-3" />
                                {t("crm.feedback.followUp")}: {r.nextFollowUpDate}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {commRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-medium">{t("crm.feedback.noCommRecords")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== Tab 2: Satisfaction Ratings ========== */}
          <TabsContent value="satisfaction" className="mt-4">
            <Card>
              <CardHeader><CardTitle>{t("crm.feedback.satisfactionTitle")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ratedTickets.map(ticket => (
                    <div key={ticket.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{ticket.ticketCode}</span>
                          <span className="font-medium">{ticket.title}</span>
                          <Badge variant="outline">{ticket.customerName}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i <= (ticket.satisfactionRating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                          <span className="ml-1 text-sm font-medium">{ticket.satisfactionRating}/5</span>
                        </div>
                      </div>
                      {ticket.satisfactionComment && (
                        <p className="text-sm mt-2 text-muted-foreground">{ticket.satisfactionComment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {ticket.ratedAt ? `${t("crm.feedback.ratedTime")}: ${new Date(ticket.ratedAt).toLocaleString()}` : ""}
                      </p>
                    </div>
                  ))}
                  {ratedTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Star className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-medium">{t("crm.feedback.noSatisfactionData")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===================== Create Comm Record Dialog ===================== */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("crm.feedback.newCommRecord")}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("crm.feedback.customerNameLabel")} *</Label>
                  <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t("crm.feedback.commType")}</Label>
                  <Select value={form.commType} onValueChange={v => setForm(f => ({ ...f, commType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMM_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("crm.feedback.subject")} *</Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={t("crm.feedback.subjectPlaceholder")} />
              </div>
              <div className="space-y-1">
                <Label>{t("crm.feedback.content")}</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("crm.feedback.commTime")} *</Label>
                  <Input type="datetime-local" value={form.commDate} onChange={e => setForm(f => ({ ...f, commDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t("crm.feedback.durationMinutes")}</Label>
                  <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("crm.feedback.actionItems")}</Label>
                <Textarea value={form.actionItems} onChange={e => setForm(f => ({ ...f, actionItems: e.target.value }))} rows={2} placeholder={t("crm.feedback.actionItemsPlaceholder")} />
              </div>
              <div className="space-y-1">
                <Label>{t("crm.feedback.nextFollowUpDate")}</Label>
                <Input type="date" value={form.nextFollowUpDate} onChange={e => setForm(f => ({ ...f, nextFollowUpDate: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("crm.feedback.cancel")}</Button>
              <Button
                disabled={!form.customerName || !form.subject || !form.commDate || createMutation.isPending}
                onClick={() => {
                  createMutation.mutate({
                    customerName: form.customerName,
                    commType: form.commType,
                    subject: form.subject,
                    content: form.content || undefined,
                    commDate: new Date(form.commDate).toISOString(),
                    duration: form.duration ? Number(form.duration) : undefined,
                    actionItems: form.actionItems || undefined,
                    nextFollowUpDate: form.nextFollowUpDate || undefined,
                  });
                }}
              >
                {createMutation.isPending ? t("crm.feedback.creating") : t("crm.feedback.createRecord")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
