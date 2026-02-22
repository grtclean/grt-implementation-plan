/**
 * Test Execution Dashboard — Phase-grouped testing matrix
 *
 * Industrial-dense UI for QA / EE engineers:
 * - AI Context Metadata card (traceability)
 * - Phase-collapsible data grid with inline Pass/Fail/Blocked actions
 * - Planned vs. actual hours time tracker per case
 * - Bug logging dialog on Fail
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import type { StatusColor } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Ban,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FlaskConical,
  Loader2,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  TestTube,
  Timer,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────

interface TestCaseRow {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  phase: string;
  category: string;
  priority: string;
  estimatedHours: string | null;
  requiredRole: string | null;
  skillLevel: string | null;
  steps: { step: number; action: string; expected: string }[] | null;
  expectedResult: string | null;
}

interface TestResultRow {
  id: number;
  executionId: number;
  testCaseId: number;
  status: string;
  executedBy: number | null;
  executedAt: string | null;
  actualHours: string | null;
  bugSeverity: string | null;
  bugDescription: string | null;
  bugTicketUrl: string | null;
  evidenceUrls: string[] | null;
  notes: string | null;
}

// ── Status / priority color maps (dark-mode safe) ────

const execStatusColors = createStatusColorMap({
  planned: "slate",
  in_progress: "blue",
  paused: "yellow",
  completed: "emerald",
  aborted: "red",
});

const resultStatusColors = createStatusColorMap({
  not_started: "slate",
  pass: "green",
  fail: "red",
  blocked: "orange",
  skipped: "gray",
  partial: "cyan",
});

const priorityColors = createStatusColorMap({
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "slate",
});

const categoryColors = createStatusColorMap({
  functional: "blue",
  performance: "purple",
  safety: "red",
  integration: "cyan",
  regression: "orange",
  acceptance: "emerald",
});

// ── Phase display config ─────────────────────────────

const PHASE_META: Record<string, { label: string; en: string; color: StatusColor }> = {
  setup:        { label: "环境准备",   en: "Environment Setup",  color: "blue" },
  execution:    { label: "执行测试",   en: "Test Execution",     color: "yellow" },
  verification: { label: "验证确认",   en: "Verification",       color: "emerald" },
  teardown:     { label: "清理收尾",   en: "Teardown",           color: "slate" },
};

// Static mapping for phase icon backgrounds (Tailwind JIT-safe)
const PHASE_ICON_BG: Record<string, string> = {
  setup:        "bg-blue-500/20",
  execution:    "bg-yellow-500/20",
  verification: "bg-emerald-500/20",
  teardown:     "bg-slate-500/20",
};

const PHASE_ICON: Record<string, React.ReactNode> = {
  setup:        <Play className="w-4 h-4" />,
  execution:    <FlaskConical className="w-4 h-4" />,
  verification: <CheckCircle2 className="w-4 h-4" />,
  teardown:     <Ban className="w-4 h-4" />,
};

const RESULT_ICON: Record<string, React.ReactNode> = {
  pass:        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  fail:        <XCircle className="w-3.5 h-3.5 text-red-400" />,
  blocked:     <Ban className="w-3.5 h-3.5 text-orange-400" />,
  skipped:     <SkipForward className="w-3.5 h-3.5 text-gray-400" />,
  not_started: <Clock className="w-3.5 h-3.5 text-slate-400" />,
  partial:     <Pause className="w-3.5 h-3.5 text-cyan-400" />,
};

const PHASE_ORDER = ["setup", "execution", "verification", "teardown"];

// ══════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════

export default function TestExecutionDashboard() {
  const [selectedExecutionId, setSelectedExecutionId] = useState<number | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [bugTargetCaseId, setBugTargetCaseId] = useState<number | null>(null);
  const [bugSeverity, setBugSeverity] = useState("major");
  const [bugDescription, setBugDescription] = useState("");
  const [bugTicketUrl, setBugTicketUrl] = useState("");
  const [hoursInput, setHoursInput] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const utils = trpc.useUtils();

  // ── Queries ────────────────────────────────────────

  const { data: templatesData, isLoading: templatesLoading } =
    trpc.testEngine.listTemplates.useQuery({ status: "active", limit: 100 });

  const { data: execution, isLoading: execLoading } =
    trpc.testEngine.getExecution.useQuery(
      { id: selectedExecutionId! },
      { enabled: !!selectedExecutionId },
    );

  const { data: resultsData, isLoading: resultsLoading } =
    trpc.testEngine.getExecutionResults.useQuery(
      { executionId: selectedExecutionId! },
      { enabled: !!selectedExecutionId },
    );

  const templateId = execution?.templateId;

  const { data: templateDetail } = trpc.testEngine.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId },
  );

  const { data: aiLogs } = trpc.testEngine.getAiLogs.useQuery(
    { templateId: templateId!, limit: 5 },
    { enabled: !!templateId },
  );

  // ── Mutations ──────────────────────────────────────

  const recordResultMut = trpc.testEngine.recordResult.useMutation({
    onSuccess: () => {
      utils.testEngine.getExecutionResults.invalidate();
      utils.testEngine.getExecution.invalidate();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const updateExecMut = trpc.testEngine.updateExecution.useMutation({
    onSuccess: () => {
      utils.testEngine.getExecution.invalidate();
      utils.testEngine.listExecutions.invalidate();
      toast.success("Status updated");
    },
    onError: (err) => toast.error("Update failed: " + err.message),
  });

  // ── Derived data ───────────────────────────────────

  const cases: TestCaseRow[] = templateDetail?.cases ?? [];
  const results: TestResultRow[] = (resultsData?.items as TestResultRow[] | undefined) ?? [];

  const resultMap = useMemo(() => {
    const m = new Map<number, TestResultRow>();
    for (const r of results) m.set(r.testCaseId, r);
    return m;
  }, [results]);

  const phaseGroups = useMemo(() => {
    const groups: Record<string, TestCaseRow[]> = {};
    for (const c of cases) {
      const phase = c.phase || "execution";
      if (statusFilter !== "all") {
        const r = resultMap.get(c.id);
        if (!r || r.status !== statusFilter) continue;
      }
      if (priorityFilter !== "all" && c.priority !== priorityFilter) continue;
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(c);
    }
    return groups;
  }, [cases, resultMap, statusFilter, priorityFilter]);

  const summary = (execution as any)?.summary ?? {
    total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, notStarted: 0, partial: 0,
  };
  const progressPct = summary.total > 0
    ? Math.round(((summary.passed + summary.failed + summary.blocked + summary.skipped) / summary.total) * 100)
    : 0;
  const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : "0.0";

  // ── Handlers ───────────────────────────────────────

  const handlePass = useCallback((caseId: number) => {
    if (!selectedExecutionId) return;
    recordResultMut.mutate({
      executionId: selectedExecutionId,
      testCaseId: caseId,
      status: "pass",
      actualHours: hoursInput[caseId] || undefined,
    });
    toast.success("PASS recorded");
  }, [selectedExecutionId, hoursInput, recordResultMut]);

  const openBugDialog = useCallback((caseId: number) => {
    setBugTargetCaseId(caseId);
    setBugSeverity("major");
    setBugDescription("");
    setBugTicketUrl("");
    setBugDialogOpen(true);
  }, []);

  const submitBug = useCallback(() => {
    if (!selectedExecutionId || !bugTargetCaseId) return;
    recordResultMut.mutate({
      executionId: selectedExecutionId,
      testCaseId: bugTargetCaseId,
      status: "fail",
      bugSeverity: bugSeverity as any,
      bugDescription: bugDescription || undefined,
      bugTicketUrl: bugTicketUrl || undefined,
      actualHours: hoursInput[bugTargetCaseId] || undefined,
    });
    setBugDialogOpen(false);
    toast.error("FAIL recorded — bug logged");
  }, [selectedExecutionId, bugTargetCaseId, bugSeverity, bugDescription, bugTicketUrl, hoursInput, recordResultMut]);

  const markBlocked = useCallback((caseId: number) => {
    if (!selectedExecutionId) return;
    recordResultMut.mutate({ executionId: selectedExecutionId, testCaseId: caseId, status: "blocked" });
    toast("Marked BLOCKED");
  }, [selectedExecutionId, recordResultMut]);

  const markSkipped = useCallback((caseId: number) => {
    if (!selectedExecutionId) return;
    recordResultMut.mutate({ executionId: selectedExecutionId, testCaseId: caseId, status: "skipped" });
  }, [selectedExecutionId, recordResultMut]);

  const togglePhase = (p: string) => setCollapsedPhases((prev) => ({ ...prev, [p]: !prev[p] }));

  // ══════════════════════════════════════════════════
  // Render: Template picker (no execution selected)
  // ══════════════════════════════════════════════════

  if (!selectedExecutionId) {
    return (
      <div className="space-y-4">
        <PageHeader
          icon={TestTube}
          title="Test Execution Dashboard"
          description="Select a template and start or continue an execution run"
        />

        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Active Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !templatesData?.items?.length ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <TestTube className="w-10 h-10 mb-2" />
                <p className="text-sm">No active templates found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templatesData.items.map((tmpl: any) => (
                  <TemplatePicker
                    key={tmpl.id}
                    template={tmpl}
                    onSelectExecution={setSelectedExecutionId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // Render: Main execution matrix
  // ══════════════════════════════════════════════════

  const isLoading = execLoading || resultsLoading;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <PageHeader
        icon={TestTube}
        title={execution?.executionName ?? "Loading..."}
        description={`Template: ${templateDetail?.name ?? "—"}  ·  Env: ${execution?.environment ?? "—"}  ·  v${templateDetail?.version ?? "?"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedExecutionId(null)}>
              Back
            </Button>
            {execution?.status === "planned" && (
              <Button size="sm" onClick={() => updateExecMut.mutate({ id: selectedExecutionId, status: "in_progress", actualStartDate: new Date().toISOString() })}>
                <Play className="w-4 h-4 mr-1" /> Start
              </Button>
            )}
            {execution?.status === "in_progress" && (
              <>
                <Button variant="outline" size="sm" onClick={() => updateExecMut.mutate({ id: selectedExecutionId, status: "paused" })}>
                  <Pause className="w-4 h-4 mr-1" /> Pause
                </Button>
                <Button size="sm" onClick={() => updateExecMut.mutate({ id: selectedExecutionId, status: "completed", actualEndDate: new Date().toISOString() })}>
                  <Check className="w-4 h-4 mr-1" /> Complete
                </Button>
              </>
            )}
            {execution?.status === "paused" && (
              <Button size="sm" onClick={() => updateExecMut.mutate({ id: selectedExecutionId, status: "in_progress" })}>
                <Play className="w-4 h-4 mr-1" /> Resume
              </Button>
            )}
            <StatusBadge color={execStatusColors[execution?.status as keyof typeof execStatusColors] ?? "slate"}>
              {(execution?.status ?? "planned").replace(/_/g, " ").toUpperCase()}
            </StatusBadge>
          </div>
        }
      />

      {/* ── AI Context Metadata ── */}
      <AiContextCard aiLogs={aiLogs?.items} templateName={templateDetail?.name} />

      {/* ── Stat cards row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={TestTube} label="Total" value={summary.total} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label="Passed" value={summary.passed} iconColor="text-green-500" iconBg="bg-green-500/20" />
        <StatCard icon={XCircle} label="Failed" value={summary.failed} iconColor="text-red-500" iconBg="bg-red-500/20" />
        <StatCard icon={Ban} label="Blocked" value={summary.blocked} iconColor="text-orange-500" iconBg="bg-orange-500/20" />
        <StatCard icon={SkipForward} label="Skipped" value={summary.skipped} iconColor="text-gray-400" iconBg="bg-gray-500/20" />
        <StatCard icon={Clock} label="Pending" value={summary.notStarted} iconColor="text-slate-400" iconBg="bg-slate-500/20" />
        {/* Progress mini-card */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex flex-col justify-center gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="font-bold font-mono tabular-nums">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <span className="text-xs text-muted-foreground">Pass rate: {passRate}%</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="not_started">Not started</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || priorityFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }}>
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground font-mono tabular-nums">
          {cases.length} cases · {results.filter(r => r.status !== "not_started").length} executed
        </span>
      </div>

      {/* ── Phase-grouped matrix ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {PHASE_ORDER.map((phase) => {
            const group = phaseGroups[phase];
            if (!group?.length) return null;
            const meta = PHASE_META[phase] ?? PHASE_META.execution;
            const collapsed = collapsedPhases[phase];

            const phaseResults = group.map((c) => resultMap.get(c.id));
            const pP = phaseResults.filter((r) => r?.status === "pass").length;
            const pF = phaseResults.filter((r) => r?.status === "fail").length;
            const pDone = phaseResults.filter((r) => r && r.status !== "not_started").length;

            return (
              <Card key={phase} className="bg-card/50 border-border overflow-hidden">
                {/* Phase header row */}
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left border-b border-border hover:bg-muted/30 transition-colors"
                  onClick={() => togglePhase(phase)}
                >
                  {collapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  <div className={`p-1 rounded-sm ${PHASE_ICON_BG[phase] ?? "bg-slate-500/20"}`}>
                    {PHASE_ICON[phase]}
                  </div>
                  <span className="font-heading font-semibold text-sm">{meta.en}</span>
                  <StatusBadge color={meta.color}>{meta.label}</StatusBadge>
                  <span className="ml-auto text-xs font-mono tabular-nums text-muted-foreground">
                    {group.length} cases · <span className="text-green-400">{pP}P</span> · <span className="text-red-400">{pF}F</span> · {pDone}/{group.length} done
                  </span>
                </button>

                {/* Data grid */}
                {!collapsed && (
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-[52px]">Code</TableHead>
                        <TableHead className="min-w-[200px]">Test Case</TableHead>
                        <TableHead className="w-[70px] text-center">Priority</TableHead>
                        <TableHead className="w-[78px] text-center">Category</TableHead>
                        <TableHead className="w-[68px] text-center">Status</TableHead>
                        <TableHead className="w-[130px] text-center">Hours (Est / Act)</TableHead>
                        <TableHead className="w-[180px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.map((tc) => {
                        const result = resultMap.get(tc.id);
                        const st = result?.status ?? "not_started";
                        const isDone = st === "pass" || st === "fail";

                        // Row tint (static Tailwind classes — JIT safe)
                        const rowTint =
                          st === "fail" ? "bg-red-500/5" :
                          st === "pass" ? "bg-green-500/5" :
                          st === "blocked" ? "bg-orange-500/5" : "";

                        return (
                          <TableRow key={tc.id} className={rowTint}>
                            {/* Code */}
                            <TableCell className="font-mono text-xs text-muted-foreground py-1.5">
                              {tc.code ?? "—"}
                            </TableCell>

                            {/* Title + detail tooltip */}
                            <TableCell className="py-1.5">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <span className="text-sm font-medium">{tc.title}</span>
                                      {tc.requiredRole && (
                                        <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 bg-slate-500/10 text-slate-400 border-slate-500/20">
                                          {tc.requiredRole}{tc.skillLevel ? ` · ${tc.skillLevel}` : ""}
                                        </Badge>
                                      )}
                                      {result?.bugDescription && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <Bug className="w-3 h-3 text-red-400 shrink-0" />
                                          <span className="text-xs text-red-400 truncate max-w-[280px]">{result.bugDescription}</span>
                                          {result.bugTicketUrl && (
                                            <a href={result.bugTicketUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 underline shrink-0">ticket</a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-sm text-xs space-y-1">
                                    {tc.description && <p>{tc.description}</p>}
                                    {tc.expectedResult && <p className="text-green-400">Expected: {tc.expectedResult}</p>}
                                    {tc.steps && tc.steps.length > 0 && (
                                      <ol className="list-decimal ml-4 space-y-0.5 text-[11px]">
                                        {tc.steps.map((s) => (
                                          <li key={s.step}>
                                            {s.action} <span className="text-muted-foreground">→</span> <em className="text-green-400">{s.expected}</em>
                                          </li>
                                        ))}
                                      </ol>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>

                            {/* Priority */}
                            <TableCell className="text-center py-1.5">
                              <StatusBadge color={priorityColors[tc.priority as keyof typeof priorityColors] ?? "slate"}>
                                {tc.priority}
                              </StatusBadge>
                            </TableCell>

                            {/* Category */}
                            <TableCell className="text-center py-1.5">
                              <StatusBadge color={categoryColors[tc.category as keyof typeof categoryColors] ?? "slate"}>
                                {tc.category}
                              </StatusBadge>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="text-center py-1.5">
                              <div className="flex items-center justify-center gap-1">
                                {RESULT_ICON[st]}
                                <span className="text-[10px] capitalize">{st.replace(/_/g, " ")}</span>
                              </div>
                            </TableCell>

                            {/* Hours: estimated / actual */}
                            <TableCell className="py-1.5">
                              <div className="flex items-center justify-center gap-1">
                                <Timer className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground font-mono tabular-nums w-[32px] text-right">
                                  {tc.estimatedHours ?? "—"}
                                </span>
                                <span className="text-muted-foreground text-xs">/</span>
                                {isDone ? (
                                  <span className="text-xs font-mono tabular-nums font-medium w-[32px]">
                                    {result?.actualHours ?? "—"}
                                  </span>
                                ) : (
                                  <Input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    placeholder="0"
                                    className="h-6 w-[48px] text-xs text-center px-1 font-mono"
                                    value={hoursInput[tc.id] ?? ""}
                                    onChange={(e) => setHoursInput((p) => ({ ...p, [tc.id]: e.target.value }))}
                                  />
                                )}
                                <span className="text-[10px] text-muted-foreground">h</span>
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-center py-1.5">
                              {isDone ? (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {result?.executedAt ? new Date(result.executedAt).toLocaleDateString() : "Recorded"}
                                </span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm" variant="outline"
                                    className="h-6 px-2 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                                    onClick={() => handlePass(tc.id)}
                                    disabled={recordResultMut.isPending}
                                  >
                                    <Check className="w-3 h-3 mr-0.5" /> Pass
                                  </Button>
                                  <Button
                                    size="sm" variant="outline"
                                    className="h-6 px-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    onClick={() => openBugDialog(tc.id)}
                                    disabled={recordResultMut.isPending}
                                  >
                                    <Bug className="w-3 h-3 mr-0.5" /> Fail
                                  </Button>
                                  <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm" variant="ghost"
                                          className="h-6 w-6 p-0 text-orange-400 hover:bg-orange-500/10"
                                          onClick={() => markBlocked(tc.id)}
                                          disabled={recordResultMut.isPending}
                                        >
                                          <Ban className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Blocked</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm" variant="ghost"
                                          className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-500/10"
                                          onClick={() => markSkipped(tc.id)}
                                          disabled={recordResultMut.isPending}
                                        >
                                          <SkipForward className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Skip</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Bug / Fail Dialog ── */}
      <Dialog open={bugDialogOpen} onOpenChange={setBugDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-400" /> Log Bug — Mark as FAIL
            </DialogTitle>
            <DialogDescription>
              Record defect details. Test case will be marked failed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={bugSeverity} onValueChange={setBugSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical — system down / data loss</SelectItem>
                  <SelectItem value="major">Major — feature broken, no workaround</SelectItem>
                  <SelectItem value="minor">Minor — feature broken, has workaround</SelectItem>
                  <SelectItem value="cosmetic">Cosmetic — UI/text issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bug Description</Label>
              <Textarea
                rows={3}
                placeholder="What happened vs. what was expected..."
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Ticket URL (optional)</Label>
              <Input
                placeholder="https://jira.example.com/browse/GRT-..."
                value={bugTicketUrl}
                onChange={(e) => setBugTicketUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBugDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={submitBug} disabled={recordResultMut.isPending}>
                {recordResultMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Confirm Fail & Log Bug
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// AI Context Metadata — always-visible traceability card
// ══════════════════════════════════════════════════════

function AiContextCard({ aiLogs, templateName }: { aiLogs?: any[]; templateName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const log = aiLogs?.[0];

  if (!log) {
    return (
      <Card className="border-dashed border-purple-500/30 bg-purple-500/5">
        <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="w-4 h-4 text-purple-400" />
          No AI generation log — this test plan was created manually.
        </CardContent>
      </Card>
    );
  }

  const conditions = log.promptInputConditions as Record<string, unknown> | null;
  const content = log.generatedContent as Record<string, unknown> | null;

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <div className="p-1.5 rounded-sm bg-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            AI Context Metadata
            <StatusBadge color="purple">{log.source?.replace(/_/g, " ")}</StatusBadge>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Summary row — always visible */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-xs">
          <KV label="Model" value={`${log.modelUsed}${log.modelVersion ? ` (${log.modelVersion})` : ""}`} mono />
          <KV label="Generated" value={log.generatedAt ? new Date(log.generatedAt).toLocaleString() : "—"} />
          <KV label="Tokens (in/out)" value={`${log.promptTokens ?? "—"} / ${log.responseTokens ?? "—"}`} mono />
          <KV label="Total tokens" value={log.totalTokens ?? "—"} mono />
          <KV label="Confidence" value={log.confidenceScore ? `${(parseFloat(log.confidenceScore) * 100).toFixed(1)}%` : "—"} />
        </div>

        {/* Expanded: prompt + reasoning */}
        {expanded && (
          <div className="space-y-2 pt-2 border-t border-purple-500/20">
            <div>
              <Label className="text-xs text-purple-400 font-semibold mb-1 block">Prompt Input Conditions</Label>
              <pre className="text-[11px] bg-background/60 rounded p-2 border border-border overflow-x-auto max-h-[180px] overflow-y-auto whitespace-pre-wrap font-mono">
                {conditions ? JSON.stringify(conditions, null, 2) : "No conditions recorded"}
              </pre>
            </div>
            {content && (
              <div>
                <Label className="text-xs text-purple-400 font-semibold mb-1 block">AI Reasoning / Generated Content</Label>
                <pre className="text-[11px] bg-background/60 rounded p-2 border border-border overflow-x-auto max-h-[180px] overflow-y-auto whitespace-pre-wrap font-mono">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </div>
            )}
            {log.userModifications && (
              <div>
                <Label className="text-xs text-orange-400 font-semibold mb-1 block">Human Modifications</Label>
                <p className="text-xs bg-orange-500/10 rounded p-2 border border-orange-500/20">{log.userModifications}</p>
              </div>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
              <span>Accepted: {log.userAccepted === true ? "Yes" : log.userAccepted === false ? "No" : "Pending"}</span>
              <span>·</span>
              <span>Template: {templateName ?? "—"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════
// Template Picker — card for each active template
// ══════════════════════════════════════════════════════

function TemplatePicker({ template, onSelectExecution }: { template: any; onSelectExecution: (id: number) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [execName, setExecName] = useState("");
  const [execEnv, setExecEnv] = useState("staging");
  const utils = trpc.useUtils();

  const { data: detail } = trpc.testEngine.getTemplate.useQuery({ id: template.id });

  // Fetch existing executions for this template
  const { data: execsData, isLoading: execsLoading } =
    trpc.testEngine.listExecutions.useQuery({ templateId: template.id, limit: 10 });

  const createExecMut = trpc.testEngine.createExecution.useMutation({
    onSuccess: (data) => {
      toast.success("Execution created");
      setShowCreate(false);
      onSelectExecution(data.id);
      utils.testEngine.getTemplate.invalidate();
      utils.testEngine.listExecutions.invalidate();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const existingExecs = execsData?.items ?? [];

  return (
    <div className="border border-border rounded-lg p-3 hover:border-primary/40 transition-colors bg-card/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-sm bg-primary/10 mt-0.5">
            <FlaskConical className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-semibold text-sm">{template.name}</span>
              <StatusBadge color="blue">{template.domain?.replace(/_/g, " ")}</StatusBadge>
              <StatusBadge color={template.status === "active" ? "green" : "slate"}>{template.status}</StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{template.description || "No description"}</p>
            <p className="text-xs text-muted-foreground font-mono tabular-nums">
              {detail?.caseCount ?? "?"} cases · v{template.version}
              {template.estimatedTotalHours && ` · ~${template.estimatedTotalHours}h`}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Cancel" : "New Execution"}
        </Button>
      </div>

      {/* ── Existing executions list ── */}
      {existingExecs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Recent Executions</p>
          <div className="space-y-1">
            {existingExecs.map((exec: any) => {
              const score = exec.totalCases > 0
                ? Math.round((exec.passedCases / exec.totalCases) * 100)
                : 0;
              return (
                <button
                  key={exec.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-muted/40 transition-colors group"
                  onClick={() => onSelectExecution(exec.id)}
                >
                  <StatusBadge color={execStatusColors[exec.status as keyof typeof execStatusColors] ?? "slate"}>
                    {exec.status.replace(/_/g, " ")}
                  </StatusBadge>
                  <span className="text-xs font-medium truncate flex-1">{exec.executionName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {exec.environment}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {exec.passedCases ?? 0}/{exec.totalCases ?? 0}
                  </span>
                  {exec.totalCases > 0 && (
                    <div className="w-[40px]">
                      <Progress value={score} className="h-1.5" />
                    </div>
                  )}
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
      {execsLoading && (
        <div className="mt-2 pt-2 border-t border-border">
          <Skeleton className="h-6 w-full" />
        </div>
      )}

      {/* ── Create new execution form ── */}
      {showCreate && (
        <div className="mt-2 pt-2 border-t border-border flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs">Execution Name</Label>
            <Input
              className="h-8 text-xs"
              placeholder={`${template.name} — Run #${existingExecs.length + 1}`}
              value={execName}
              onChange={(e) => setExecName(e.target.value)}
            />
          </div>
          <div className="w-[120px] space-y-1">
            <Label className="text-xs">Environment</Label>
            <Select value={execEnv} onValueChange={setExecEnv}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Dev</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="prod">Prod</SelectItem>
                <SelectItem value="field">Field</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm" className="h-8"
            disabled={!execName.trim() || createExecMut.isPending}
            onClick={() => createExecMut.mutate({ templateId: template.id, executionName: execName, environment: execEnv as any })}
          >
            {createExecMut.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Create & Open
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────

function KV({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className={`font-medium ${mono ? "font-mono tabular-nums" : ""}`}>{String(value)}</p>
    </div>
  );
}
