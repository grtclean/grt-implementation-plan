import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
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

// ── Constants (10 workflow types from JDY 人事及OA管理系统) ──

const WORKFLOW_TYPES = [
  { value: "LEAVE", label: "请假", icon: Clock, color: "text-blue-500" },
  { value: "OVERTIME", label: "加班", icon: Clock, color: "text-indigo-500" },
  { value: "ATTENDANCE_FIX", label: "补卡", icon: ClipboardCheck, color: "text-cyan-500" },
  { value: "OUTING", label: "外出", icon: LogOut, color: "text-teal-500" },
  { value: "VEHICLE", label: "用车", icon: Car, color: "text-purple-500" },
  { value: "STATIONERY", label: "文具领用", icon: Pencil, color: "text-orange-500" },
  { value: "PROCUREMENT", label: "采购", icon: ShoppingCart, color: "text-emerald-500" },
  { value: "EXPENSE", label: "报销", icon: DollarSign, color: "text-green-500" },
  { value: "SEAL", label: "用印", icon: Stamp, color: "text-rose-500" },
  { value: "GIFT", label: "礼品", icon: Gift, color: "text-pink-500" },
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

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "年假",
  sick: "病假",
  personal: "事假",
  maternity: "产假",
  paternity: "陪产假",
  marriage: "婚假",
  bereavement: "丧假",
  compensatory: "调休",
};

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  overdue_task: { label: "逾期任务", color: "bg-red-100 text-red-700" },
  "8d_report": { label: "8D报告", color: "bg-orange-100 text-orange-700" },
  quality_issue: { label: "质量问题", color: "bg-yellow-100 text-yellow-700" },
  manual: { label: "手动添加", color: "bg-gray-100 text-gray-600" },
};

// ── Main Component ──

export default function OADashboard() {
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
            Smart OA 指挥中心
          </h1>
          <p className="text-muted-foreground mt-1">
            10类审批 / 假期余额 / 晨会看板 / 出差报告 / 公告通知
          </p>
        </div>
        <Button onClick={() => setShowNewWorkflow(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新建申请
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">审批总览</TabsTrigger>
          <TabsTrigger value="meeting">晨会看板</TabsTrigger>
          <TabsTrigger value="trips">出差报告</TabsTrigger>
          <TabsTrigger value="leave">假期余额</TabsTrigger>
          <TabsTrigger value="announcements">公告通知</TabsTrigger>
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
                      <p className="text-xs text-muted-foreground">{wt.label}</p>
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
                  共 {totalPending} 项待审批
                </span>
              </CardContent>
            </Card>
          )}

          {/* Pending Approvals Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">我的待审批</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingQuery.data && pendingQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">类型</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead className="w-[100px]">申请时间</TableHead>
                      <TableHead className="w-[150px] text-right">操作</TableHead>
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
                              {wt?.label ?? wf.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{wf.title}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {wf.createdAt?.split("T")[0] ?? "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" disabled={approveMut.isPending}
                              onClick={() => approveMut.mutate({ id: wf.id })}>
                              <Check className="h-3 w-3 mr-1" /> 批准
                            </Button>
                            <Button size="sm" variant="destructive" disabled={rejectMut.isPending}
                              onClick={() => rejectMut.mutate({ id: wf.id })}>
                              <X className="h-3 w-3 mr-1" /> 驳回
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">暂无待审批事项</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ Tab 2: Morning Meeting ═══════════════ */}
        <TabsContent value="meeting" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              周一晨会看板
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
                生成议题
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {agendaQuery.data && agendaQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>议题</TableHead>
                      <TableHead className="w-[90px]">来源</TableHead>
                      <TableHead className="w-[180px]">决议</TableHead>
                      <TableHead className="w-[80px]">负责人</TableHead>
                      <TableHead className="w-[110px]">截止</TableHead>
                      <TableHead className="w-[90px]">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendaQuery.data.map((item) => {
                      const src = SOURCE_BADGES[item.sourceType ?? "manual"] ?? SOURCE_BADGES.manual;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.agendaItem}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${src.color}`}>{src.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 text-sm" defaultValue={item.decision ?? ""} placeholder="决议..."
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
                                <SelectItem value="open">待办</SelectItem>
                                <SelectItem value="in_progress">进行中</SelectItem>
                                <SelectItem value="done">完成</SelectItem>
                                <SelectItem value="cancelled">取消</SelectItem>
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
                  {firstMeeting ? '暂无议题，点击"生成议题"自动提取' : "暂无会议定义，请管理员创建"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ Tab 3: Trip Reports ═══════════════ */}
        <TabsContent value="trips" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> 最新出差报告
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
                        {report.destination ?? "未填目的地"}
                      </CardTitle>
                      <Badge variant="secondary" className={
                        report.status === "submitted" ? "bg-blue-100 text-blue-700"
                          : report.status === "reviewed" ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                      }>
                        {report.status === "submitted" ? "已提交" : report.status === "reviewed" ? "已评审" : "草稿"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {report.travelStartDate ?? "?"} ~ {report.travelEndDate ?? "?"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.tripSummary ?? "暂无概述"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {report.technicalQuestionnaireData && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">含技术问卷</Badge>
                      )}
                      {report.attachments && (report.attachments as any[]).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />{(report.attachments as any[]).length}个附件
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="text-center text-muted-foreground py-8">暂无出差报告</CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════════ Tab 4: Leave Balances ═══════════════ */}
        <TabsContent value="leave" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TreePalm className="h-5 w-5" /> 我的假期余额 ({new Date().getFullYear()})
          </h2>

          {leaveQuery.data && leaveQuery.data.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {leaveQuery.data.map((b) => {
                const remaining = b.totalDays + (b.carriedOverDays ?? 0) - b.usedDays - b.pendingDays;
                const usedPct = b.totalDays > 0 ? Math.round((b.usedDays / b.totalDays) * 100) : 0;
                return (
                  <Card key={b.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{LEAVE_TYPE_LABELS[b.leaveType] ?? b.leaveType}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mb-2">
                        <span>剩余 <strong>{remaining}</strong> 天</span>
                        <span className="text-muted-foreground">共{b.totalDays}天</span>
                      </div>
                      <Progress value={usedPct} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>已用 {b.usedDays}天</span>
                        {b.pendingDays > 0 && <span>审批中 {b.pendingDays}天</span>}
                        {(b.carriedOverDays ?? 0) > 0 && <span>结转 {b.carriedOverDays}天</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><CardContent className="text-center text-muted-foreground py-8">
              暂无假期余额数据。请联系HR初始化年度假期。
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ═══════════════ Tab 5: Announcements ═══════════════ */}
        <TabsContent value="announcements" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> 公告通知
          </h2>

          {announcementsQuery.data && announcementsQuery.data.items.length > 0 ? (
            <div className="space-y-3">
              {announcementsQuery.data.items.map((ann) => (
                <Card key={ann.id} className={ann.isPinned ? "border-blue-200 bg-blue-50/30" : ""}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {ann.isPinned && <Pin className="h-3 w-3 text-blue-500" />}
                      {ann.priority === "urgent" && <Badge variant="destructive" className="text-xs">紧急</Badge>}
                      {ann.priority === "important" && <Badge className="text-xs bg-orange-100 text-orange-700">重要</Badge>}
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
            <Card><CardContent className="text-center text-muted-foreground py-8">暂无公告</CardContent></Card>
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
        <DialogHeader><DialogTitle>新建OA申请</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>申请类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as WorkflowType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKFLOW_TYPES.map((wt) => {
                  const Icon = wt.icon;
                  return (
                    <SelectItem key={wt.value} value={wt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${wt.color}`} />
                        {wt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="简要描述申请内容" />
          </div>
          <div>
            <Label>详细说明</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder={PLACEHOLDER_HINTS[type] ?? "详细说明..."} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? "提交中..." : "提交申请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TripReportSheet({ report, open, onOpenChange }: {
  report: any; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  if (!report) return null;
  const q = report.technicalQuestionnaireData as Record<string, any> | null;
  const actions = report.followUpActions as { action: string; assignee: string; deadline: string }[] | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {report.destination ?? "出差报告"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">出发:</span> {report.travelStartDate ?? "—"}</div>
            <div><span className="text-muted-foreground">返回:</span> {report.travelEndDate ?? "—"}</div>
          </div>
          {report.tripSummary && (
            <div>
              <h4 className="font-medium text-sm mb-1">出差概述</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.tripSummary}</p>
            </div>
          )}
          {report.keyFindings && (
            <div>
              <h4 className="font-medium text-sm mb-1">关键发现</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.keyFindings}</p>
            </div>
          )}
          {actions && actions.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-1">后续行动</h4>
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
                <FileText className="h-3 w-3" /> 技术问卷 (Parts Cleaning)
              </h4>
              <div className="border rounded-md p-3 space-y-1.5 bg-purple-50/30 text-sm">
                {q.partName && <QF l="零件名称" v={q.partName} />}
                {q.partNumber && <QF l="零件号" v={q.partNumber} />}
                {q.partMaterial && <QF l="材料" v={q.partMaterial} />}
                {q.cleanlinessStandard && <QF l="清洁度标准" v={q.cleanlinessStandard} />}
                {q.particleRequirements && <QF l="颗粒要求" v={q.particleRequirements} />}
                {q.currentCleaningMethod && <QF l="清洗方式" v={q.currentCleaningMethod} />}
                {q.mediaType && <QF l="介质类型" v={q.mediaType} />}
                {q.cycleTimeTarget && <QF l="节拍(秒)" v={q.cycleTimeTarget} />}
                {q.specialRequirements && <QF l="特殊要求" v={q.specialRequirements} />}
                {q.customerNotes && <QF l="客户备注" v={q.customerNotes} />}
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
