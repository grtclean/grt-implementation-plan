/**
 * Concurrent Command Center — 并行调试指挥中心
 *
 * Dual-Track dashboard:
 *   Left  — Track 1: Software dev sandboxes (AI agents × branches)
 *   Right — Track 2: Hardware equipment commissioning (FAT/SAT)
 *
 * Both tracks feed into a manager approval gateway before changes go live.
 */

import { useState, useMemo } from "react";
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
  Droplets,
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

// ─── Local Improvement Generator (fallback when backend unavailable) ─────────

let localIdCounter = 9000;

function generateLocalImprovement(role: string, area: string, requirement: string) {
  const reqLower = requirement.toLowerCase();
  const highKeywords = ["紧急", "严重", "立即", "关键", "阻塞", "urgent", "critical"];
  const lowKeywords = ["建议", "考虑", "未来", "长期", "suggest", "future"];

  let priority: "high" | "medium" | "low" = "medium";
  if (highKeywords.some(k => reqLower.includes(k))) priority = "high";
  else if (lowKeywords.some(k => reqLower.includes(k))) priority = "low";

  const steps = [
    `现状分析: 对"${area}"进行全面诊断，识别${requirement.slice(0, 20)}相关的关键痛点`,
    `方案设计: 制定针对性改进方案，明确目标指标与验收标准`,
    `资源评估: 评估所需人力、预算和时间投入`,
    `试点执行: 选择1个部门/场景进行小范围试点验证`,
    `效果评估: 对比改进前后数据，量化改进效果`,
    `全面推广: 试点成功后制定推广计划并固化为标准流程`,
  ];

  const estimatedDays = priority === "high" ? "7-14天" : priority === "medium" ? "14-30天" : "30-60天";

  return {
    id: ++localIdCounter,
    userName: role,
    target: `[${role}] ${area}: ${requirement.slice(0, 60)}`,
    data: {
      role,
      area,
      requirement,
      priority,
      steps,
      estimatedDays,
      assignedTo: `${role}团队`,
      status: "待执行",
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  };
}

// ─── Role Improvement Panel Component ────────────────────────────────────────

function RoleImprovementPanel({ currentUserName, utils }: { currentUserName: string; utils: any }) {
  const [activeRole, setActiveRole] = useState<string>("HR Manager");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [requirement, setRequirement] = useState("");
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  const roleConfig = ROLE_CONFIGS.find(r => r.role === activeRole) || ROLE_CONFIGS[0];

  // Local results state (fallback when backend unavailable)
  const [localResults, setLocalResults] = useState<any[]>([]);

  // Keep a snapshot so onError can still access values after state changes
  const pendingRef = { area: selectedArea, req: requirement };

  const submitMutation = trpc.concurrentCommand.submitImprovement.useMutation({
    onSuccess: (data) => {
      toast.success(`改进需求已提交: ${data.area} [优先级: ${data.priority === "high" ? "高" : data.priority === "medium" ? "中" : "低"}]`);
      setRequirement("");
      setSelectedArea("");
      try { improvementsQuery.refetch(); } catch {}
      try { utils.concurrentCommand.getActivityLog.invalidate(); } catch {}
    },
    onError: () => {
      // Backend unavailable — generate locally, do NOT clear inputs on failure
      const result = generateLocalImprovement(activeRole, pendingRef.area, pendingRef.req.trim());
      setLocalResults(prev => [result, ...prev]);
      toast.success(`改进方案已生成: ${pendingRef.area}`);
      // Only clear after successful local generation
      setRequirement("");
      setSelectedArea("");
    },
  });

  const improvementsQuery = trpc.concurrentCommand.listImprovements.useQuery(
    { role: activeRole },
    { retry: false, throwOnError: false },
  );
  const serverResults = improvementsQuery.data ?? [];
  const improvements = [...localResults.filter(r => r.data?.role === activeRole), ...serverResults];

  const handleSubmit = () => {
    if (!selectedArea) { toast.error("请先选择改进领域"); return; }
    if (!requirement.trim()) { toast.error("请输入改进需求内容"); return; }
    // Snapshot current values before mutation (in case of async state issues)
    pendingRef.area = selectedArea;
    pendingRef.req = requirement;
    submitMutation.mutate({
      role: activeRole,
      area: selectedArea,
      requirement: requirement.trim(),
      userName: currentUserName,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-600" />
          角色改进输入中心
        </CardTitle>
        <CardDescription>
          选择角色 → 输入改进需求 → 生成执行方案
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Tabs */}
        <div className="flex gap-1 border-b pb-0">
          {ROLE_CONFIGS.map(rc => (
            <button
              key={rc.role}
              onClick={() => { setActiveRole(rc.role); setSelectedArea(""); setRequirement(""); }}
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

        {/* Input Form */}
        <div className="space-y-3">
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
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
            />
            <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter 快速提交</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Send className="h-4 w-4 mr-2" />
            }
            提交改进需求
          </Button>
        </div>

        {/* Results List */}
        {improvements.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              {activeRole} 改进记录 ({improvements.length})
            </div>
            {improvements.map(item => {
              const d = item.data;
              const isExpanded = expandedResult === item.id;
              const priColor = d?.priority === "high" ? "bg-red-100 text-red-700"
                : d?.priority === "medium" ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700";

              return (
                <Card key={item.id} className="border bg-card/50">
                  <CardContent className="p-3">
                    <div
                      className="flex items-start gap-2 cursor-pointer"
                      onClick={() => setExpandedResult(isExpanded ? null : item.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                        : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{d?.area}</span>
                          <Badge className={priColor}>{d?.priority === "high" ? "高" : d?.priority === "medium" ? "中" : "低"}</Badge>
                          <span className="text-xs text-muted-foreground">{d?.estimatedDays}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{d?.requirement}</p>
                      </div>
                    </div>

                    {isExpanded && d?.steps && (
                      <div className="mt-3 ml-6 space-y-1.5 text-sm">
                        {(d.steps as string[]).map((step: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${roleConfig.color}`}>
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{step.replace(/^\d+\.\s*/, "")}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>负责: {d.assignedTo}</span>
                          <span>预计: {d.estimatedDays}</span>
                          <Badge variant="outline">{d.status}</Badge>
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
                          onClick={() => approveMerge.mutate({ id: sandbox.id, userName: currentUser.name })}
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
                                engineerName: currentUser.name,
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
                                userName: currentUser.name,
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
                    onClick={() => approveReport.mutate({ userName: currentUser.name })}
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
