import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Check,
  X,
  Plus,
  RefreshCw,
  Calendar,
  MapPin,
  FileText,
  Briefcase,
  Clock,
  Car,
  Pencil,
  Gift,
  DollarSign,
  Stamp,
  ShoppingCart,
  LogOut,
  ClipboardCheck,
  Megaphone,
  Pin,
  Eye,
  TreePalm,
} from "lucide-react";

// ── Constants (10 workflow types from 人事及OA管理系统) ──

const WORKFLOW_TYPES = [
  { value: "LEAVE", labelKey: "admin.oa.wfLeave", icon: Clock, color: "text-blue-500" },
  { value: "OVERTIME", labelKey: "admin.oa.wfOvertime", icon: Clock, color: "text-indigo-500" },
  { value: "ATTENDANCE_FIX", labelKey: "admin.oa.wfAttendanceFix", icon: ClipboardCheck, color: "text-cyan-500" },
  { value: "OUTING", labelKey: "admin.oa.wfOuting", icon: LogOut, color: "text-teal-500" },
  { value: "VEHICLE", labelKey: "admin.oa.wfVehicle", icon: Car, color: "text-purple-500" },
  { value: "STATIONERY", labelKey: "admin.oa.wfStationery", icon: Pencil, color: "text-orange-500" },
  { value: "PROCUREMENT", labelKey: "admin.oa.wfProcurement", icon: ShoppingCart, color: "text-emerald-500" },
  { value: "EXPENSE", labelKey: "admin.oa.wfExpense", icon: DollarSign, color: "text-green-500" },
  { value: "SEAL", labelKey: "admin.oa.wfSeal", icon: Stamp, color: "text-rose-500" },
  { value: "GIFT", labelKey: "admin.oa.wfGift", icon: Gift, color: "text-pink-500" },
] as const;

const TYPE_MAP = Object.fromEntries(WORKFLOW_TYPES.map(t => [t.value, t]));

const PLACEHOLDER_HINTS: Record<string, string> = {
  LEAVE: "请假日期、天数、事由...",
  OVERTIME: "加班日期、时段、原因...",
  ATTENDANCE_FIX: "补卡日期、正确打卡时间、原因...",
  OUTING: "外出日期、时间段、目的地、事由...",
  VEHICLE: "用车日期、目的地、乘客数...",
  STATIONERY: "所需文具清单(名称x数量)...",
  PROCUREMENT: "采购物品、规格、数量、预算...",
  EXPENSE: "报销项目、金额、发票信息...",
  SEAL: "印章类型、文件名称、份数、用途...",
  GIFT: "礼品类型、接收方、预算...",
};

const LEAVE_TYPE_KEYS: Record<string, string> = {
  annual: "admin.oa.leaveTypeAnnual",
  sick: "admin.oa.leaveTypeSick",
  personal: "admin.oa.leaveTypePersonal",
  maternity: "admin.oa.leaveTypeMaternity",
  paternity: "admin.oa.leaveTypePaternity",
  marriage: "admin.oa.leaveTypeMarriage",
  bereavement: "admin.oa.leaveTypeBereavement",
  compensatory: "admin.oa.leaveTypeCompensatory",
};

const SOURCE_BADGES: Record<string, { labelKey: string; color: string }> = {
  overdue_task: { labelKey: "admin.oa.srcOverdueTask", color: "bg-red-100 text-red-700" },
  "8d_report": { labelKey: "admin.oa.src8dReport", color: "bg-orange-100 text-orange-700" },
  quality_issue: { labelKey: "admin.oa.srcQualityIssue", color: "bg-yellow-100 text-yellow-700" },
  manual: { labelKey: "admin.oa.srcManual", color: "bg-gray-100 text-gray-600" },
};

// ── Main Component ──

export default function OADashboard() {
  const { t } = useLanguage();
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const searchString = useSearch();
  const tabFromUrl = new URLSearchParams(searchString).get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");
  // Sync tab when URL query changes (e.g. sidebar nav)
  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // ── Data fetching ──
  const statsQuery = trpc.oa.getWorkflowStats.useQuery();
  const pendingQuery = trpc.oa.getMyPendingApprovals.useQuery();
  const meetingsQuery = trpc.oa.listMeetings.useQuery();
  const tripsQuery = trpc.oa.listTripReports.useQuery({ limit: 10 });
  const leaveQuery = trpc.oa.getMyLeaveBalances.useQuery();
  const announcementsQuery = trpc.oa.listAnnouncements.useQuery({ status: "published", limit: 5 });

  const firstMeeting = meetingsQuery.data?.[0];
  const agendaQuery = trpc.oa.getAgendaItems.useQuery(
    { meetingId: firstMeeting?.id ?? 0, meetingDate: new Date().toISOString().split("T")[0] },
    { enabled: !!firstMeeting },
  );

  // ── Mutations ──
  const utils = trpc.useUtils();
  const approveMut = trpc.oa.approveWorkflow.useMutation({
    onSuccess: () => { utils.oa.getMyPendingApprovals.invalidate(); utils.oa.getWorkflowStats.invalidate(); },
  });
  const rejectMut = trpc.oa.rejectWorkflow.useMutation({
    onSuccess: () => { utils.oa.getMyPendingApprovals.invalidate(); utils.oa.getWorkflowStats.invalidate(); },
  });
  const generateAgendaMut = trpc.oa.generateAgenda.useMutation({
    onSuccess: () => { utils.oa.getAgendaItems.invalidate(); },
  });
  const updateAgendaMut = trpc.oa.updateAgendaItem.useMutation({
    onSuccess: () => { utils.oa.getAgendaItems.invalidate(); },
  });
  const createWorkflowMut = trpc.oa.createWorkflow.useMutation({
    onSuccess: () => {
      utils.oa.getWorkflowStats.invalidate();
      utils.oa.getMyPendingApprovals.invalidate();
      setShowNewWorkflow(false);
    },
  });

  const stats = statsQuery.data;
  const totalPending = stats?.totalPending ?? 0;

  if (statsQuery.isLoading && pendingQuery.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            {t("admin.oa.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("admin.oa.description")}
          </p>
        </div>
        <Button onClick={() => setShowNewWorkflow(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t("admin.oa.newApplication")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("admin.oa.tabOverview")}</TabsTrigger>
          <TabsTrigger value="meeting">{t("admin.oa.tabMeeting")}</TabsTrigger>
          <TabsTrigger value="trips">{t("admin.oa.tabTrips")}</TabsTrigger>
          <TabsTrigger value="leave">{t("admin.oa.tabLeave")}</TabsTrigger>
          <TabsTrigger value="announcements">{t("admin.oa.tabAnnouncements")}</TabsTrigger>
        </TabsList>

        {/* ═══════════════ Tab 1: Overview ═══════════════ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stat Cards — 2 rows of 5 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {WORKFLOW_TYPES.map((wt) => {
              const pending = stats?.byTypeAndStatus?.[wt.value]?.PENDING ?? 0;
              const Icon = wt.icon;
              return (
                <Card key={wt.value} className={pending > 0 ? "border-yellow-200" : ""}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t(wt.labelKey)}</p>
                      <p className="text-xl font-bold">{pending}</p>
                    </div>
                    <Icon className={`h-5 w-5 ${wt.color}`} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Total pending highlight */}
          {totalPending > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="flex items-center gap-3 p-3">
                <ClipboardList className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-700">
                  {t("admin.oa.totalPending").replace("{count}", String(totalPending))}
                </span>
              </CardContent>
            </Card>
          )}

          {/* Pending Approvals Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">{t("admin.oa.myPending")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingQuery.data && pendingQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{t("admin.oa.thType")}</TableHead>
                      <TableHead>{t("admin.oa.thTitle")}</TableHead>
                      <TableHead className="w-[100px]">{t("admin.oa.thApplyTime")}</TableHead>
                      <TableHead className="w-[150px] text-right">{t("admin.oa.thAction")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingQuery.data.map((wf) => {
                      const wt = TYPE_MAP[wf.type];
                      const Icon = wt?.icon ?? ClipboardList;
                      return (
                        <TableRow key={wf.id}>
                          <TableCell>
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Icon className="h-3 w-3" />
                              {wt ? t(wt.labelKey) : wf.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{wf.title}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {wf.createdAt?.split("T")[0] ?? "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" disabled={approveMut.isPending}
                              onClick={() => approveMut.mutate({ id: wf.id })}>
                              <Check className="h-3 w-3 mr-1" /> {t("admin.oa.approve")}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={rejectMut.isPending}
                              onClick={() => rejectMut.mutate({ id: wf.id })}>
                              <X className="h-3 w-3 mr-1" /> {t("admin.oa.reject")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">{t("admin.oa.noPending")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ Tab 2: Morning Meeting ═══════════════ */}
        <TabsContent value="meeting" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("admin.oa.morningBoard")}
              {firstMeeting && (
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  {firstMeeting.title} · {firstMeeting.startTime}–{firstMeeting.endTime} · {firstMeeting.location}
                </span>
              )}
            </h2>
            {firstMeeting && (
              <Button variant="outline" size="sm" disabled={generateAgendaMut.isPending}
                onClick={() => generateAgendaMut.mutate({ meetingId: firstMeeting.id })}>
                <RefreshCw className={`h-4 w-4 mr-1 ${generateAgendaMut.isPending ? "animate-spin" : ""}`} />
                {t("admin.oa.generateAgenda")}
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {agendaQuery.data && agendaQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.oa.thAgenda")}</TableHead>
                      <TableHead className="w-[90px]">{t("admin.oa.thSource")}</TableHead>
                      <TableHead className="w-[180px]">{t("admin.oa.thDecision")}</TableHead>
                      <TableHead className="w-[80px]">{t("admin.oa.thAssignee")}</TableHead>
                      <TableHead className="w-[110px]">{t("admin.oa.thDeadline")}</TableHead>
                      <TableHead className="w-[90px]">{t("admin.oa.thStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendaQuery.data.map((item) => {
                      const src = SOURCE_BADGES[item.sourceType ?? "manual"] ?? SOURCE_BADGES.manual;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.agendaItem}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${src.color}`}>{t(src.labelKey)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 text-sm" defaultValue={item.decision ?? ""} placeholder={t("admin.oa.decisionPlaceholder")}
                              onBlur={(e) => {
                                if (e.target.value !== (item.decision ?? ""))
                                  updateAgendaMut.mutate({ id: item.id, decision: e.target.value });
                              }} />
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 text-sm w-16" defaultValue={item.assignedTo?.toString() ?? ""} placeholder="ID"
                              onBlur={(e) => {
                                const v = parseInt(e.target.value);
                                if (!isNaN(v) && v !== item.assignedTo) updateAgendaMut.mutate({ id: item.id, assignedTo: v });
                              }} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-7 text-sm" defaultValue={item.deadline ?? ""}
                              onChange={(e) => { if (e.target.value !== item.deadline) updateAgendaMut.mutate({ id: item.id, deadline: e.target.value }); }} />
                          </TableCell>
                          <TableCell>
                            <Select value={item.status}
                              onValueChange={(v) => updateAgendaMut.mutate({ id: item.id, status: v as any })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">{t("admin.oa.statusOpen")}</SelectItem>
                                <SelectItem value="in_progress">{t("admin.oa.statusInProgress")}</SelectItem>
                                <SelectItem value="done">{t("admin.oa.statusDone")}</SelectItem>
                                <SelectItem value="cancelled">{t("admin.oa.statusCancelled")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {firstMeeting ? t("admin.oa.noAgendaHasMeeting") : t("admin.oa.noAgendaNoMeeting")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ Tab 3: Trip Reports ═══════════════ */}
        <TabsContent value="trips" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> {t("admin.oa.latestTrips")}
          </h2>

          {tripsQuery.data && tripsQuery.data.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tripsQuery.data.items.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedReport(report)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {report.destination ?? t("admin.oa.noDestination")}
                      </CardTitle>
                      <Badge variant="secondary" className={
                        report.status === "submitted" ? "bg-blue-100 text-blue-700"
                          : report.status === "reviewed" ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                      }>
                        {report.status === "submitted" ? t("admin.oa.submitted") : report.status === "reviewed" ? t("admin.oa.reviewed") : t("admin.oa.draft")}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {report.travelStartDate ?? "?"} ~ {report.travelEndDate ?? "?"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.tripSummary ?? t("admin.oa.noSummary")}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {report.technicalQuestionnaireData && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{t("admin.oa.hasTechQuestionnaire")}</Badge>
                      )}
                      {report.attachments && (report.attachments as any[]).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />{t("admin.oa.attachmentCount").replace("{count}", String((report.attachments as any[]).length))}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="text-center text-muted-foreground py-8">{t("admin.oa.noTrips")}</CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════════ Tab 4: Leave Balances ═══════════════ */}
        <TabsContent value="leave" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TreePalm className="h-5 w-5" /> {t("admin.oa.myLeaveBalance")} ({new Date().getFullYear()})
          </h2>

          {leaveQuery.data && leaveQuery.data.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {leaveQuery.data.map((b) => {
                const remaining = b.totalDays + (b.carriedOverDays ?? 0) - b.usedDays - b.pendingDays;
                const usedPct = b.totalDays > 0 ? Math.round((b.usedDays / b.totalDays) * 100) : 0;
                return (
                  <Card key={b.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{LEAVE_TYPE_KEYS[b.leaveType] ? t(LEAVE_TYPE_KEYS[b.leaveType]) : b.leaveType}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{t("admin.oa.remaining")} <strong>{remaining}</strong> {t("admin.oa.days")}</span>
                        <span className="text-muted-foreground">{t("admin.oa.total").replace("{count}", String(b.totalDays))}</span>
                      </div>
                      <Progress value={usedPct} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{t("admin.oa.used")} {b.usedDays}{t("admin.oa.days")}</span>
                        {b.pendingDays > 0 && <span>{t("admin.oa.pendingApproval")} {b.pendingDays}{t("admin.oa.days")}</span>}
                        {(b.carriedOverDays ?? 0) > 0 && <span>{t("admin.oa.carryOver")} {b.carriedOverDays}{t("admin.oa.days")}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><CardContent className="text-center text-muted-foreground py-8">
              {t("admin.oa.noLeaveData")}
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════════ Tab 5: Announcements ═══════════════ */}
        <TabsContent value="announcements" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> {t("admin.oa.announcements")}
          </h2>

          {announcementsQuery.data && announcementsQuery.data.items.length > 0 ? (
            <div className="space-y-3">
              {announcementsQuery.data.items.map((ann) => (
                <Card key={ann.id} className={ann.isPinned ? "border-blue-200 bg-blue-50/30" : ""}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {ann.isPinned && <Pin className="h-3 w-3 text-blue-500" />}
                      {ann.priority === "urgent" && <Badge variant="destructive" className="text-xs">{t("admin.oa.urgent")}</Badge>}
                      {ann.priority === "important" && <Badge className="text-xs bg-orange-100 text-orange-700">{t("admin.oa.important")}</Badge>}
                      <CardTitle className="text-sm font-medium flex-1">{ann.title}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />{ann.viewCount ?? 0}
                        <span>{ann.publishedAt?.split("T")[0] ?? "—"}</span>
                      </div>
                    </div>
                  </CardHeader>
                  {ann.content && (
                    <CardContent className="pt-0 px-4 pb-3">
                      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{ann.content}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="text-center text-muted-foreground py-8">{t("admin.oa.noAnnouncements")}</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewWorkflowDialog open={showNewWorkflow} onOpenChange={setShowNewWorkflow}
        onSubmit={(data) => createWorkflowMut.mutate(data as any)} isPending={createWorkflowMut.isPending} />
      <TripReportSheet report={selectedReport} open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)} />
    </div>
  );
}

// ── Sub-Components ──

type WorkflowType = typeof WORKFLOW_TYPES[number]["value"];

function NewWorkflowDialog({ open, onOpenChange, onSubmit, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { type: WorkflowType; title: string; content?: Record<string, unknown> }) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const [type, setType] = useState<WorkflowType>("LEAVE");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ type, title: title.trim(), content: details ? { details } : undefined });
    setType("LEAVE"); setTitle(""); setDetails("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { setType("LEAVE"); setTitle(""); setDetails(""); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("admin.oa.newOaTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("admin.oa.applicationType")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as WorkflowType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKFLOW_TYPES.map((wt) => {
                  const Icon = wt.icon;
                  return (
                    <SelectItem key={wt.value} value={wt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${wt.color}`} />
                        {t(wt.labelKey)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin.oa.titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("admin.oa.titlePlaceholder")} />
          </div>
          <div>
            <Label>{t("admin.oa.detailLabel")}</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder={PLACEHOLDER_HINTS[type] ?? t("admin.oa.detailLabel")} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>{t("admin.oa.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? t("admin.oa.submitting") : t("admin.oa.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TripReportSheet({ report, open, onOpenChange }: {
  report: any; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  if (!report) return null;
  const q = report.technicalQuestionnaireData as Record<string, any> | null;
  const actions = report.followUpActions as { action: string; assignee: string; deadline: string }[] | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {report.destination ?? t("admin.oa.tripReport")}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">{t("admin.oa.departure")}:</span> {report.travelStartDate ?? "—"}</div>
            <div><span className="text-muted-foreground">{t("admin.oa.returnDate")}:</span> {report.travelEndDate ?? "—"}</div>
          </div>
          {report.tripSummary && (
            <div>
              <h4 className="font-medium text-sm mb-1">{t("admin.oa.tripSummary")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.tripSummary}</p>
            </div>
          )}
          {report.keyFindings && (
            <div>
              <h4 className="font-medium text-sm mb-1">{t("admin.oa.keyFindings")}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.keyFindings}</p>
            </div>
          )}
          {actions && actions.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-1">{t("admin.oa.followUpActions")}</h4>
              <div className="space-y-1">
                {actions.map((a, i) => (
                  <div key={i} className="text-sm flex items-start gap-2 bg-muted/50 rounded p-2">
                    <Badge variant="outline" className="text-xs shrink-0">{a.assignee}</Badge>
                    <span>{a.action}</span>
                    <span className="text-muted-foreground text-xs ml-auto shrink-0">{a.deadline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {q && Object.keys(q).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> {t("admin.oa.techQuestionnaire")}
              </h4>
              <div className="border rounded-md p-3 space-y-1.5 bg-purple-50/30 text-sm">
                {q.partName && <QF l={t("admin.oa.partName")} v={q.partName} />}
                {q.partNumber && <QF l={t("admin.oa.partNumber")} v={q.partNumber} />}
                {q.partMaterial && <QF l={t("admin.oa.partMaterial")} v={q.partMaterial} />}
                {q.cleanlinessStandard && <QF l={t("admin.oa.cleanlinessStd")} v={q.cleanlinessStandard} />}
                {q.particleRequirements && <QF l={t("admin.oa.particleReq")} v={q.particleRequirements} />}
                {q.currentCleaningMethod && <QF l={t("admin.oa.cleaningMethod")} v={q.currentCleaningMethod} />}
                {q.mediaType && <QF l={t("admin.oa.mediaType")} v={q.mediaType} />}
                {q.cycleTimeTarget && <QF l={t("admin.oa.cycleTime")} v={q.cycleTimeTarget} />}
                {q.specialRequirements && <QF l={t("admin.oa.specialReq")} v={q.specialRequirements} />}
                {q.customerNotes && <QF l={t("admin.oa.customerNotes")} v={q.customerNotes} />}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QF({ l, v }: { l: string; v: any }) {
  return (
    <div className="flex">
      <span className="text-muted-foreground w-24 shrink-0">{l}:</span>
      <span>{String(v)}</span>
    </div>
  );
}
