/**
 * Concurrent Command Center — 并行调试指挥中心
 *
 * Dual-Track dashboard:
 *   Left  — Track 1: Software dev sandboxes (AI agents × branches)
 *   Right — Track 2: Hardware equipment commissioning (FAT/SAT)
 *
 * Both tracks feed into a manager approval gateway before changes go live.
 */

import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useConcurrentSync } from "@/hooks/useConcurrentSync";
import {
  Monitor,
  GitBranch,
  Bot,
  CheckCircle2,
  Clock,
  Wrench,
  Cpu,
  Users,
  ShieldCheck,
  FileText,
  PlayCircle,
  Cog,
  Zap,
  Wind,
  Filter,
  Wifi,
  WifiOff,
  Activity,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  AlertTriangle,
  Sparkles,
  ClipboardCheck,
  CalendarDays,
  UserCheck,
  RotateCcw,
  MessageSquare,
} from "lucide-react";

// ─── Status badge helpers ────────────────────────────────────────────────────

function BranchStatusBadge({ status, approved }: { status: string; approved: boolean }) {
  if (approved) {
    return <Badge className="bg-green-600 text-white">Merged</Badge>;
  }
  switch (status) {
    case "ISOLATED":
      return <Badge variant="secondary">ISOLATED</Badge>;
    case "TESTING":
      return <Badge className="bg-blue-600 text-white">TESTING</Badge>;
    case "READY_FOR_MERGE":
      return <Badge className="bg-amber-500 text-white">READY FOR MERGE</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function TestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "IDLE":
      return <Badge variant="secondary">IDLE</Badge>;
    case "DEBUGGING":
      return <Badge className="bg-orange-500 text-white">DEBUGGING</Badge>;
    case "PASSED":
      return <Badge className="bg-green-600 text-white">PASSED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const SUB_SYSTEM_ICONS: Record<string, React.ReactNode> = {
  "Conveyor Belt System": <Cog className="h-5 w-5 text-muted-foreground" />,
  "Ultrasonic Generator": <Zap className="h-5 w-5 text-muted-foreground" />,
  "Drying System": <Wind className="h-5 w-5 text-muted-foreground" />,
  "Filtration Unit": <Filter className="h-5 w-5 text-muted-foreground" />,
  "PLC Control Panel": <Cpu className="h-5 w-5 text-muted-foreground" />,
};

// ─── Action labels for activity feed ─────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  claimRoom: "Claimed",
  updateRoomStatus: "Updated status of",
  approveMerge: "Approved merge for",
  updateSandboxStatus: "Updated sandbox",
  approveCommissioningReport: "Approved",
};

// ─── Role Improvement Configuration ─────────────────────────────────────────

const ROLE_CONFIGS = [
  {
    role: "HR Manager",
    color: "bg-teal-600",
    textColor: "text-teal-700",
    borderColor: "border-teal-200",
    bgColor: "bg-teal-50",
    areas: ["招聘流程", "绩效考核", "培训体系", "薪酬福利", "员工关系", "组织发展"],
  },
  {
    role: "Admin",
    color: "bg-purple-600",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    bgColor: "bg-purple-50",
    areas: ["系统权限", "数据安全", "流程审批", "IT基础设施", "合规管理", "系统集成"],
  },
  {
    role: "Sales",
    color: "bg-indigo-600",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-200",
    bgColor: "bg-indigo-50",
    areas: ["客户管理", "销售漏斗", "报价流程", "渠道管理", "售后服务", "市场分析"],
  },
];

// ─── Status Config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: "待分配", color: "bg-gray-100 text-gray-700" },
  assigned: { label: "已分配", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "执行中", color: "bg-amber-100 text-amber-700" },
  completed: { label: "待验收", color: "bg-green-100 text-green-700" },
  verified: { label: "已验收", color: "bg-emerald-100 text-emerald-700" },
  closed: { label: "已归档", color: "bg-slate-100 text-slate-600" },
};

function ImprovementStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  return <Badge className={cfg.color}>{cfg.label}</Badge>;
}

// ─── Role Improvement Panel Component (V2 — Lifecycle Tracking) ─────────────

function RoleImprovementPanel({ currentUserName, utils }: { currentUserName: string; utils: any }) {
  const [activeRole, setActiveRole] = useState<string>("HR Manager");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [requirement, setRequirement] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [view, setView] = useState<"form" | "list">("list");

  // Dialogs
  const [progressDialog, setProgressDialog] = useState<{ id: number; stepNum: number; stepLabel: string } | null>(null);
  const [progressContent, setProgressContent] = useState("");
  const [progressPct, setProgressPct] = useState([50]);
  const [resultDialog, setResultDialog] = useState<number | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [resultBefore, setResultBefore] = useState("");
  const [resultAfter, setResultAfter] = useState("");
  const [verifyDialog, setVerifyDialog] = useState<{ id: number; action: "approve" | "reject" } | null>(null);
  const [verifyComment, setVerifyComment] = useState("");

  const roleConfig = ROLE_CONFIGS.find(r => r.role === activeRole) || ROLE_CONFIGS[0];

  // ─── Queries ──────────────────────────────────────────────────────────────
  const statsQuery = trpc.concurrentCommand.improvementStats.useQuery(
    { role: activeRole },
    { retry: false, throwOnError: false },
  );
  const stats = statsQuery.data ?? { submitted: 0, assigned: 0, in_progress: 0, completed: 0, verified: 0, closed: 0 };

  const listQuery = trpc.concurrentCommand.listImprovementsV2.useQuery(
    { role: activeRole },
    { retry: false, throwOnError: false },
  );
  const improvements = listQuery.data ?? [];

  // Detail query for expanded row
  const detailQuery = trpc.concurrentCommand.getImprovement.useQuery(
    { id: expandedId! },
    { enabled: expandedId !== null, retry: false, throwOnError: false },
  );
  const detail = detailQuery.data;

  // ─── Mutations ────────────────────────────────────────────────────────────
  const invalidateAll = () => {
    try { listQuery.refetch(); } catch {}
    try { statsQuery.refetch(); } catch {}
    try { if (expandedId) detailQuery.refetch(); } catch {}
    try { utils.concurrentCommand.getActivityLog.invalidate(); } catch {}
  };

  const createMutation = trpc.concurrentCommand.createImprovement.useMutation({
    onSuccess: (data) => {
      toast.success(`改进需求已创建: ${data.area} [${data.priority === "high" ? "高" : data.priority === "medium" ? "中" : "低"}优先级]`);
      setRequirement("");
      setSelectedArea("");
      setAssignedTo("");
      setView("list");
      invalidateAll();
    },
    onError: (err) => { toast.error(`提交失败: ${err.message}`); },
  });

  const updateProgressMutation = trpc.concurrentCommand.updateProgress.useMutation({
    onSuccess: () => {
      toast.success("进度已更新");
      setProgressDialog(null);
      setProgressContent("");
      setProgressPct([50]);
      invalidateAll();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const submitResultMutation = trpc.concurrentCommand.submitResult.useMutation({
    onSuccess: () => {
      toast.success("改进结果已提交，等待验收");
      setResultDialog(null);
      setResultSummary("");
      setResultBefore("");
      setResultAfter("");
      invalidateAll();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const verifyMutation = trpc.concurrentCommand.verifyImprovement.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "verified" ? "验收通过" : "已打回修改");
      setVerifyDialog(null);
      setVerifyComment("");
      invalidateAll();
    },
    onError: (err) => { toast.error(err.message); },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!selectedArea) { toast.error("请先选择改进领域"); return; }
    if (!requirement.trim()) { toast.error("请输入改进需求内容"); return; }
    createMutation.mutate({
      role: activeRole,
      area: selectedArea,
      requirement: requirement.trim(),
      assignedTo: assignedTo.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-600" />
          绩效改进闭环管理
        </CardTitle>
        <CardDescription>
          提交 → 分配 → 逐步执行 → 效果验证 → 经理签收 → 归档
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Tabs */}
        <div className="flex gap-1 border-b pb-0">
          {ROLE_CONFIGS.map(rc => (
            <button
              key={rc.role}
              onClick={() => { setActiveRole(rc.role); setSelectedArea(""); setRequirement(""); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeRole === rc.role
                  ? `${rc.textColor} border-current`
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {rc.role}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "submitted", label: "待分配", icon: Clock, color: "text-gray-600" },
            { key: "in_progress", label: "执行中", icon: PlayCircle, color: "text-amber-600" },
            { key: "completed", label: "待验收", icon: ClipboardCheck, color: "text-green-600" },
            { key: "verified", label: "已验收", icon: ShieldCheck, color: "text-emerald-600" },
          ].map(s => (
            <div key={s.key} className="flex flex-col items-center p-2 rounded-lg border bg-card/50">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-lg font-bold mt-0.5">{stats[s.key as keyof typeof stats] ?? 0}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            <ListChecks className="h-3.5 w-3.5 mr-1" /> 跟踪列表
          </Button>
          <Button
            variant={view === "form" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("form")}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> 新建改进
          </Button>
        </div>

        {/* ─── Form View ─────────────────────────────────────────────── */}
        {view === "form" && (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div>
              <label className="text-sm font-medium mb-1 block">改进领域</label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="选择改进领域..." />
                </SelectTrigger>
                <SelectContent>
                  {roleConfig.areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">改进需求</label>
              <Textarea
                placeholder={`作为${activeRole}，描述您希望改进的具体内容...`}
                value={requirement}
                onChange={e => setRequirement(e.target.value)}
                rows={3}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleCreate(); }}
              />
              <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter 快速提交</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">责任人 <span className="text-muted-foreground font-normal">(可选)</span></label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={`默认: ${activeRole}团队`}
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Send className="h-4 w-4 mr-2" />
              }
              提交改进需求
            </Button>
          </div>
        )}

        {/* ─── List View ─────────────────────────────────────────────── */}
        {view === "list" && (
          <div className="space-y-2">
            {improvements.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                暂无改进记录，点击"新建改进"创建第一个
              </div>
            )}
            {improvements.map(imp => {
              const isExpanded = expandedId === imp.id;
              const priColor = imp.priority === "high" ? "bg-red-100 text-red-700"
                : imp.priority === "medium" ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700";
              const steps = Array.isArray(imp.steps) ? (imp.steps as { label: string; desc: string; done: boolean }[]) : [];
              const pct = imp.completionPct ?? 0;
              const progressColor = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-blue-500";

              return (
                <Card key={imp.id} className="border bg-card/50">
                  <CardContent className="p-3">
                    {/* Row Header */}
                    <div
                      className="flex items-start gap-2 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : imp.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                        : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{imp.area}</span>
                          <Badge className={priColor}>{imp.priority === "high" ? "高" : imp.priority === "medium" ? "中" : "低"}</Badge>
                          <ImprovementStatusBadge status={imp.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-primary/20 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{imp.assignedTo}</span>
                          {imp.dueDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{imp.dueDate}</span>}
                          <span>{imp.estimatedDays}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-3 ml-6 space-y-3">
                        {/* Requirement */}
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{imp.requirement}</p>

                        {/* 6 Steps with update button */}
                        <div className="space-y-1.5">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${step.done ? "bg-green-500" : roleConfig.color}`}>
                                {step.done ? "✓" : i + 1}
                              </span>
                              <span className={`text-sm flex-1 ${step.done ? "line-through text-muted-foreground" : ""}`}>
                                {step.label}: {step.desc}
                              </span>
                              {!step.done && ["submitted", "assigned", "in_progress"].includes(imp.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProgressPct([Math.min(Math.round(((i + 1) / 6) * 100), 100)]);
                                    setProgressDialog({ id: imp.id, stepNum: i + 1, stepLabel: step.label });
                                  }}
                                >
                                  更新
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Update Timeline */}
                        {detail && detail.id === imp.id && Array.isArray(detail.updates) && detail.updates.length > 0 && (
                          <div className="border-t pt-2 space-y-1">
                            <div className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                              <MessageSquare className="h-3 w-3" /> 进度记录
                            </div>
                            {detail.updates.map((u: any) => (
                              <div key={u.id} className="flex items-start gap-2 text-xs pl-2 border-l-2 border-muted ml-1">
                                <span className="text-muted-foreground shrink-0 w-14">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : ""}
                                </span>
                                <Badge variant="outline" className="text-[10px] h-4 shrink-0">{u.action}</Badge>
                                <span className="text-muted-foreground">{u.content}</span>
                                <span className="ml-auto text-muted-foreground shrink-0">{u.userName}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap pt-1">
                          {/* Submit Result — when completionPct >= 80 and not yet completed */}
                          {pct >= 80 && ["submitted", "assigned", "in_progress"].includes(imp.status) && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={(e) => { e.stopPropagation(); setResultDialog(imp.id); }}
                            >
                              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> 提交结果
                            </Button>
                          )}

                          {/* Verify — when status = completed */}
                          {imp.status === "completed" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={(e) => { e.stopPropagation(); setVerifyDialog({ id: imp.id, action: "approve" }); }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> 验收通过
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); setVerifyDialog({ id: imp.id, action: "reject" }); }}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> 打回
                              </Button>
                            </>
                          )}

                          {/* Verified badge */}
                          {imp.status === "verified" && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {imp.verifiedBy} 已验收 {imp.verifiedAt ? new Date(imp.verifiedAt).toLocaleDateString("zh-CN") : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* ─── Progress Update Dialog ───────────────────────────────── */}
      <Dialog open={progressDialog !== null} onOpenChange={() => setProgressDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新进度 — 步骤{progressDialog?.stepNum}: {progressDialog?.stepLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">进展说明</label>
              <Textarea
                placeholder="描述当前步骤完成情况..."
                value={progressContent}
                onChange={e => setProgressContent(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">总体完成度: {progressPct[0]}%</label>
              <Slider
                value={progressPct}
                onValueChange={setProgressPct}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialog(null)}>取消</Button>
            <Button
              disabled={!progressContent.trim() || updateProgressMutation.isPending}
              onClick={() => {
                if (!progressDialog) return;
                updateProgressMutation.mutate({
                  id: progressDialog.id,
                  stepNumber: progressDialog.stepNum,
                  content: progressContent.trim(),
                  completionPct: progressPct[0],
                });
              }}
            >
              {updateProgressMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              确认更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Submit Result Dialog ─────────────────────────────────── */}
      <Dialog open={resultDialog !== null} onOpenChange={() => setResultDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交改进结果</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">结果总结</label>
              <Textarea
                placeholder="总结改进执行情况与取得的成果..."
                value={resultSummary}
                onChange={e => setResultSummary(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">改进前指标</label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="如: 合格率 85%"
                  value={resultBefore}
                  onChange={e => setResultBefore(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">改进后指标</label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="如: 合格率 96%"
                  value={resultAfter}
                  onChange={e => setResultAfter(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialog(null)}>取消</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!resultSummary.trim() || submitResultMutation.isPending}
              onClick={() => {
                if (resultDialog === null) return;
                submitResultMutation.mutate({
                  id: resultDialog,
                  resultSummary: resultSummary.trim(),
                  resultEvidence: (resultBefore || resultAfter) ? { before: resultBefore, after: resultAfter } : undefined,
                });
              }}
            >
              {submitResultMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              提交结果
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Verify Dialog ────────────────────────────────────────── */}
      <Dialog open={verifyDialog !== null} onOpenChange={() => setVerifyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{verifyDialog?.action === "approve" ? "确认验收通过" : "打回修改"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">备注 <span className="text-muted-foreground font-normal">(可选)</span></label>
              <Textarea
                placeholder={verifyDialog?.action === "approve" ? "验收通过备注..." : "打回原因说明..."}
                value={verifyComment}
                onChange={e => setVerifyComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialog(null)}>取消</Button>
            <Button
              className={verifyDialog?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
              disabled={verifyMutation.isPending}
              onClick={() => {
                if (!verifyDialog) return;
                verifyMutation.mutate({
                  id: verifyDialog.id,
                  approved: verifyDialog.action === "approve",
                  comment: verifyComment.trim() || undefined,
                });
              }}
            >
              {verifyMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {verifyDialog?.action === "approve" ? "确认通过" : "确认打回"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Simulated current user (replace with real auth context in production) ───

function useCurrentUser() {
  const [user] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get("userId") || String(Math.floor(Math.random() * 9000) + 1000));
    const name = params.get("userName") || `Engineer-${id}`;
    return { id, name };
  });
  return user;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ConcurrentCommandCenter() {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const currentUser = useCurrentUser();
  const { isConnected, onlineUsers, activities } = useConcurrentSync(currentUser.id, currentUser.name);

  // Track 1 data
  const sandboxes = trpc.concurrentCommand.listSandboxes.useQuery();
  // Track 2 data
  const rooms = trpc.concurrentCommand.listRooms.useQuery();
  // Commissioning report
  const report = trpc.concurrentCommand.generateCommissioningReport.useQuery();

  // Mutations
  const approveMerge = trpc.concurrentCommand.approveMerge.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.moduleName} branch approved for merge`);
      utils.concurrentCommand.listSandboxes.invalidate();
      utils.concurrentCommand.getActivityLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const claimRoom = trpc.concurrentCommand.claimRoom.useMutation({
    onSuccess: (data) => {
      toast.success(`Claimed ${data.subSystem} for debugging`);
      utils.concurrentCommand.listRooms.invalidate();
      utils.concurrentCommand.generateCommissioningReport.invalidate();
      utils.concurrentCommand.getActivityLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRoomStatus = trpc.concurrentCommand.updateRoomStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.subSystem} marked as ${data.testStatus}`);
      utils.concurrentCommand.listRooms.invalidate();
      utils.concurrentCommand.generateCommissioningReport.invalidate();
      utils.concurrentCommand.getActivityLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveReport = trpc.concurrentCommand.approveCommissioningReport.useMutation({
    onSuccess: () => {
      toast.success("Commissioning report approved by Chief Engineer");
      utils.concurrentCommand.generateCommissioningReport.invalidate();
      utils.concurrentCommand.getActivityLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Derived stats ──────────────────────────────────────────────────────

  const sandboxList = sandboxes.data ?? [];
  const roomList = rooms.data ?? [];

  const activeSandboxes = sandboxList.filter((s) => !s.managerApproved).length;
  const pendingMerges = sandboxList.filter(
    (s) => s.branchStatus === "READY_FOR_MERGE" && !s.managerApproved
  ).length;
  const totalRooms = roomList.length;
  const passedRooms = roomList.filter((r) => r.testStatus === "PASSED").length;
  const commissioningProgress = totalRooms > 0 ? Math.round((passedRooms / totalRooms) * 100) : 0;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Monitor}
        title="并行调试指挥中心"
        description="Concurrent Command Center — Dual-Track Software & Hardware debugging with manager approval gateway"
      />

      {/* Online Status Bar */}
      <div className="flex items-center gap-3 rounded-lg border px-4 py-2 bg-card">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        <span className="text-sm text-muted-foreground">
          — {Math.max(onlineUsers.length, 1)} user{Math.max(onlineUsers.length, 1) !== 1 ? "s" : ""} online
        </span>
        <div className="flex -space-x-1 ml-2">
          {(onlineUsers.length > 0
            ? onlineUsers
            : [{ userId: currentUser.id, userName: currentUser.name }]
          ).slice(0, 8).map((u) => (
            <span
              key={u.userId}
              title={u.userName}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background"
            >
              {u.userName.slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          You: {currentUser.name}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Sandboxes"
          value={activeSandboxes}
          icon={GitBranch}
          subtitle="Software branches in progress"
        />
        <StatCard
          label="Pending Merges"
          value={pendingMerges}
          icon={Clock}
          subtitle="Awaiting manager approval"
          iconColor={pendingMerges > 0 ? "text-amber-500" : undefined}
          iconBg={pendingMerges > 0 ? "bg-amber-500/10" : undefined}
        />
        <StatCard
          label="Commissioning Progress"
          value={`${commissioningProgress}%`}
          icon={Wrench}
          subtitle={`${passedRooms}/${totalRooms} sub-systems passed`}
        />
        <StatCard
          label="Passed Sub-Systems"
          value={passedRooms}
          icon={CheckCircle2}
          subtitle="FAT/SAT complete"
          iconColor={passedRooms === totalRooms && totalRooms > 0 ? "text-green-500" : undefined}
          iconBg={passedRooms === totalRooms && totalRooms > 0 ? "bg-green-500/10" : undefined}
        />
      </div>

      {/* Dual-Track Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══════ LEFT PANEL — SOFTWARE TRACK ═══════ */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="h-5 w-5 text-blue-600" />
                System Software Concurrent Sandbox
              </CardTitle>
              <CardDescription>
                GRT模块并行开发沙箱 — AI agents managing isolated branches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sandboxList.map((sandbox) => (
                <Card key={sandbox.id} className="border bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{sandbox.moduleName}</span>
                          <BranchStatusBadge
                            status={sandbox.branchStatus}
                            approved={sandbox.managerApproved}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Bot className="h-4 w-4 shrink-0" />
                          <span>{sandbox.assignedAiAgent}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                          <GitBranch className="h-4 w-4 shrink-0" />
                          <span className="truncate">{sandbox.branchName}</span>
                        </div>
                      </div>

                      {/* Approve Merge button */}
                      {sandbox.branchStatus === "READY_FOR_MERGE" && !sandbox.managerApproved && (
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                          onClick={() => approveMerge.mutate({ id: sandbox.id })}
                          disabled={approveMerge.isPending}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Approve Merge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {sandboxList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No sandboxes found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Role-Based Improvement Input */}
          <RoleImprovementPanel currentUserName={currentUser.name} utils={utils} />
        </div>

        {/* ═══════ RIGHT PANEL — HARDWARE TRACK ═══════ */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5 text-orange-600" />
                Equipment Commissioning Hub (FAT/SAT)
              </CardTitle>
              <CardDescription>
                SAIC New Energy Cleaning Line — 上汽新能源清洗线调试
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roomList.map((room) => (
                <Card key={room.id} className="border bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {SUB_SYSTEM_ICONS[room.subSystem] ?? (
                            <Cpu className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="font-semibold">{room.subSystem}</span>
                          <TestStatusBadge status={room.testStatus} />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {room.engineerAssigned ? (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {room.engineerAssigned}
                            </span>
                          ) : (
                            <span className="italic">Unclaimed</span>
                          )}
                        </div>
                        {room.testNotes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {room.testNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        {/* Claim button — only when IDLE */}
                        {room.testStatus === "IDLE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              claimRoom.mutate({
                                id: room.id,
                              })
                            }
                            disabled={claimRoom.isPending}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Claim
                          </Button>
                        )}

                        {/* Mark as Passed — only when DEBUGGING */}
                        {room.testStatus === "DEBUGGING" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() =>
                              updateRoomStatus.mutate({
                                id: room.id,
                                testStatus: "PASSED",
                              })
                            }
                            disabled={updateRoomStatus.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Passed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {roomList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No commissioning rooms found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Commissioning Report — shown when all sub-systems PASSED */}
          {report.data?.ready && (
            <Card className="border-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                  Final Commissioning Report
                </CardTitle>
                <CardDescription>
                  All {report.data.report?.totalSubSystems} sub-systems have passed FAT/SAT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-3 bg-green-50 dark:bg-green-950/30 space-y-2">
                  <p className="text-sm font-medium">
                    Project: {report.data.report?.projectName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Generated: {report.data.report?.generatedAt
                      ? new Date(report.data.report.generatedAt).toLocaleString()
                      : "—"}
                  </p>
                  <div className="space-y-1">
                    {report.data.report?.subSystems.map((ss) => (
                      <div
                        key={ss.name}
                        className="flex items-center justify-between text-xs border-b last:border-0 pb-1"
                      >
                        <span>{ss.name}</span>
                        <span className="text-green-600 font-medium">{ss.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {report.data.approved ? (
                  <Badge className="bg-green-600 text-white">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                    Approved by Chief Engineer
                  </Badge>
                ) : (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                    onClick={() => approveReport.mutate()}
                    disabled={approveReport.isPending}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    Chief Engineer Approve
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-blue-600" />
            Live Activity Feed
          </CardTitle>
          <CardDescription>
            Real-time operations from all connected users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[240px]">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No activity yet — perform an action to see it here
              </p>
            ) : (
              <div className="space-y-2">
                {activities.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      {entry.userName.slice(0, 6)}
                    </Badge>
                    <span className="flex-1">
                      <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>{" "}
                      <span className="text-muted-foreground">{entry.target}</span>
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
