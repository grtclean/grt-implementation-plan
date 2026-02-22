/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  GRT Morning Meeting Smart Whiteboard — Full-Screen Board (v2)     ║
 * ║                                                                     ║
 * ║  Industrial-grade interactive board for BU Directors.               ║
 * ║  Full-screen dense layout with inline editing, 10s auto-refresh,   ║
 * ║  and "Conclude Meeting" batch dispatch.                             ║
 * ║                                                                     ║
 * ║  Design language: Control-room aesthetic · Dark-mode optimized ·   ║
 * ║  Status-aware row coloring · Pulsing live indicators · Monospace   ║
 * ║  numbers · Gradient header bar                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  Gavel,
  Radio,
  Users,
  Target,
  AlertTriangle,
  Zap,
} from "lucide-react";

// ════════════════════════════════════════════════════════
// Source Badges — Status-aware with pulsing indicators
// ════════════════════════════════════════════════════════

const SOURCE_CONFIG: Record<string, {
  indicator: string;
  label: string;
  labelZh: string;
  bg: string;
  text: string;
  dot: string;
}> = {
  overdue_task: {
    indicator: "bg-red-500",
    label: "OVERDUE",
    labelZh: "逾期",
    bg: "bg-red-500/10 dark:bg-red-500/15 border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    dot: "animate-pulse bg-red-500",
  },
  "8d_report": {
    indicator: "bg-orange-500",
    label: "8D",
    labelZh: "8D报告",
    bg: "bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  quality_issue: {
    indicator: "bg-amber-500",
    label: "QUALITY",
    labelZh: "质量",
    bg: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  manual: {
    indicator: "bg-slate-400",
    label: "MANUAL",
    labelZh: "手动",
    bg: "bg-slate-500/10 dark:bg-slate-500/15 border-slate-500/20",
    text: "text-slate-500 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "待办", color: "text-blue-400", bg: "bg-blue-500/10" },
  in_progress: { label: "进行中", color: "text-amber-400", bg: "bg-amber-500/10" },
  done: { label: "完成", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  cancelled: { label: "取消", color: "text-slate-400", bg: "bg-slate-500/10" },
};

const STATUS_OPTIONS = [
  { value: "open", label: "待办 Open" },
  { value: "in_progress", label: "进行中 In Progress" },
  { value: "done", label: "完成 Done" },
  { value: "cancelled", label: "取消 Cancelled" },
];

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════

export default function MorningMeetingBoard() {
  const today = new Date().toISOString().split("T")[0];
  const [concluded, setConcluded] = useState(false);
  const [liveClock, setLiveClock] = useState(new Date());

  // Live clock — 1s tick
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Data ──
  const meetingsQuery = trpc.oa.listMeetings.useQuery();
  const firstMeeting = meetingsQuery.data?.[0];

  const agendaQuery = trpc.oa.getAgendaItems.useQuery(
    { meetingId: firstMeeting?.id ?? 0, meetingDate: today },
    { enabled: !!firstMeeting, refetchInterval: concluded ? false : 10_000 },
  );

  const usersQuery = trpc.users.getAll.useQuery();
  const userMap = useMemo(() => {
    const m = new Map<number, string>();
    if (usersQuery.data) {
      for (const u of usersQuery.data) {
        m.set(u.id, u.name || u.email || `#${u.id}`);
      }
    }
    return m;
  }, [usersQuery.data]);

  // ── Mutations ──
  const utils = trpc.useUtils();

  const updateAgendaMut = trpc.oa.updateAgendaItem.useMutation({
    onSuccess: () => utils.oa.getAgendaItems.invalidate(),
  });

  const generateAgendaMut = trpc.oa.generateAgenda.useMutation({
    onSuccess: () => {
      utils.oa.getAgendaItems.invalidate();
      toast.success("AI Agenda Generated", { description: "议题已从项目/质量数据自动提取" });
    },
    onError: (err) => toast.error("Generation Failed", { description: err.message }),
  });

  const concludeMut = trpc.oa.concludeMeeting.useMutation({
    onSuccess: (data) => {
      setConcluded(true);
      utils.oa.getAgendaItems.invalidate();
      toast.success("Meeting Concluded", {
        description: `${data.updatedCount} items updated · Tasks dispatched`,
      });
    },
    onError: (err) => toast.error("Conclude Failed", { description: err.message }),
  });

  // ── Inline Editors ──
  const handleDecisionBlur = useCallback((itemId: number, oldVal: string | null, newVal: string) => {
    if (newVal !== (oldVal ?? "") && !concluded) {
      updateAgendaMut.mutate({ id: itemId, decision: newVal });
    }
  }, [concluded, updateAgendaMut]);

  const handleAssigneeChange = useCallback((itemId: number, userId: string) => {
    if (!concluded) {
      updateAgendaMut.mutate({ id: itemId, assignedTo: parseInt(userId) });
    }
  }, [concluded, updateAgendaMut]);

  const handleDeadlineChange = useCallback((itemId: number, oldVal: string | null, newVal: string) => {
    if (newVal !== (oldVal ?? "") && !concluded) {
      updateAgendaMut.mutate({ id: itemId, deadline: newVal });
    }
  }, [concluded, updateAgendaMut]);

  const handleStatusChange = useCallback((itemId: number, status: string) => {
    if (!concluded) {
      updateAgendaMut.mutate({ id: itemId, status: status as any });
    }
  }, [concluded, updateAgendaMut]);

  const handleConclude = () => {
    if (!firstMeeting || !agendaQuery.data) return;
    const updates = agendaQuery.data.map(item => ({
      id: item.id,
      decision: undefined,
      assignedTo: undefined,
      deadline: undefined,
      status: undefined,
    }));
    concludeMut.mutate({
      meetingId: firstMeeting.id,
      meetingDate: today,
      updates,
    });
  };

  // ── Derived Stats ──
  const items = agendaQuery.data ?? [];
  const totalCount = items.length;
  const decidedCount = items.filter(i => i.decision && i.decision.trim()).length;
  const assignedCount = items.filter(i => i.assignedTo).length;
  const overdueCount = items.filter(i => i.sourceType === "overdue_task").length;
  const doneCount = items.filter(i => i.status === "done").length;

  const clockStr = liveClock.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateStr = liveClock.toLocaleDateString("zh-CN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">

      {/* ═══════════════════════════════════════════════
          HEADER — Dark command-center aesthetic
          ═══════════════════════════════════════════════ */}
      <div className="relative shrink-0">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50 px-5 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title + Meta */}
            <div className="flex items-center gap-4">
              {/* Pulsing live indicator */}
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Radio className="h-5 w-5 text-cyan-400" />
                </div>
                {!concluded && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  {firstMeeting?.title ?? "BU 晨会智能看板"}
                  {concluded && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      CONCLUDED
                    </Badge>
                  )}
                </h1>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-0.5">
                  {firstMeeting && (
                    <>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-cyan-400/70" />
                        {firstMeeting.startTime}–{firstMeeting.endTime}
                      </span>
                      {firstMeeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-cyan-400/70" />
                          {firstMeeting.location}
                        </span>
                      )}
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-cyan-400/70" />
                    {dateStr}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Clock + Actions */}
            <div className="flex items-center gap-4">
              {/* Live Clock */}
              <div className="text-right hidden sm:block">
                <div className="font-mono text-2xl font-bold tabular-nums text-white tracking-wider">
                  {clockStr}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {concluded ? "meeting ended" : "live"}
                </div>
              </div>

              {/* Generate Button */}
              {firstMeeting && !concluded && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generateAgendaMut.isPending}
                  onClick={() => generateAgendaMut.mutate({ meetingId: firstMeeting.id })}
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 bg-transparent"
                >
                  {generateAgendaMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1.5" />
                  )}
                  AI Generate
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mini stat bar */}
        {totalCount > 0 && (
          <div className="bg-slate-900/50 border-b border-slate-700/30 px-5 py-1.5 flex items-center gap-6 text-xs">
            <StatPill icon={Target} label="TOTAL" value={totalCount} color="text-slate-300" />
            <StatPill icon={CheckCircle2} label="DECIDED" value={decidedCount} color="text-cyan-400" />
            <StatPill icon={Users} label="ASSIGNED" value={assignedCount} color="text-blue-400" />
            {overdueCount > 0 && (
              <StatPill icon={AlertTriangle} label="OVERDUE" value={overdueCount} color="text-red-400" />
            )}
            <StatPill icon={CheckCircle2} label="DONE" value={doneCount} color="text-emerald-400" />

            {/* Progress bar */}
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-[10px] uppercase tracking-wider">completion</span>
              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-slate-400">
                {totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          AGENDA GRID — Dense industrial table
          ═══════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto">
        {items.length > 0 ? (
          <table className="w-full border-collapse">
            {/* Column Headers */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
                <th className="w-[44px] text-center py-2.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  #
                </th>
                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Agenda Item / 议题
                </th>
                <th className="w-[100px] text-center py-2.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Source
                </th>
                <th className="w-[260px] text-left py-2.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Executive Decision / 高管决议
                </th>
                <th className="w-[150px] text-left py-2.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Assignee / 责任人
                </th>
                <th className="w-[130px] text-left py-2.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Deadline
                </th>
                <th className="w-[110px] text-left py-2.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, idx) => {
                const src = SOURCE_CONFIG[item.sourceType ?? "manual"] ?? SOURCE_CONFIG.manual;
                const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open;
                const hasDecision = item.decision && item.decision.trim();
                const isOverdue = item.sourceType === "overdue_task";

                return (
                  <tr
                    key={item.id}
                    className={`
                      border-b border-slate-800/60 transition-colors duration-150
                      ${concluded
                        ? "opacity-80"
                        : isOverdue
                        ? "bg-red-500/[0.03] hover:bg-red-500/[0.06]"
                        : "hover:bg-slate-800/40"
                      }
                    `}
                  >
                    {/* Row Number */}
                    <td className="text-center py-2.5 px-2">
                      <span className="font-mono text-xs text-slate-600 tabular-nums">{idx + 1}</span>
                    </td>

                    {/* Agenda Item */}
                    <td className="py-2.5 px-3">
                      <p className="text-sm leading-relaxed text-slate-200">{item.agendaItem}</p>
                    </td>

                    {/* Source Badge */}
                    <td className="text-center py-2.5 px-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`
                            inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider
                            ${src.bg} ${src.text}
                          `}>
                            <span className={`w-1.5 h-1.5 rounded-full ${src.dot}`} />
                            {src.label}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          Source: {src.labelZh} ({src.label})
                          {item.sourceId && <span className="text-muted-foreground"> · #{item.sourceId}</span>}
                        </TooltipContent>
                      </Tooltip>
                    </td>

                    {/* Executive Decision — Inline Edit */}
                    <td className="py-2 px-2">
                      <Input
                        defaultValue={item.decision ?? ""}
                        placeholder={concluded ? "—" : "Type decision..."}
                        disabled={concluded}
                        onBlur={(e) => handleDecisionBlur(item.id, item.decision, e.target.value)}
                        className={`
                          h-8 text-sm border-slate-700/50 placeholder:text-slate-600
                          ${concluded
                            ? "bg-transparent border-transparent text-slate-400"
                            : hasDecision
                            ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-100 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                            : "bg-slate-800/50 focus:bg-slate-800 focus:border-cyan-500/40 focus:ring-cyan-500/20"
                          }
                        `}
                      />
                    </td>

                    {/* Assignee — Dropdown */}
                    <td className="py-2 px-2">
                      <Select
                        value={item.assignedTo ? item.assignedTo.toString() : undefined}
                        onValueChange={(v) => handleAssigneeChange(item.id, v)}
                        disabled={concluded}
                      >
                        <SelectTrigger className={`
                          h-8 text-xs border-slate-700/50
                          ${concluded
                            ? "bg-transparent border-transparent text-slate-400"
                            : item.assignedTo
                            ? "bg-blue-500/5 border-blue-500/20 text-blue-200"
                            : "bg-slate-800/50"
                          }
                        `}>
                          <SelectValue placeholder="Select...">
                            {item.assignedTo ? userMap.get(item.assignedTo) ?? `#${item.assignedTo}` : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {usersQuery.data?.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()} className="text-slate-200">
                              {u.name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Deadline */}
                    <td className="py-2 px-2">
                      <Input
                        type="date"
                        defaultValue={item.deadline ?? ""}
                        disabled={concluded}
                        onChange={(e) => handleDeadlineChange(item.id, item.deadline, e.target.value)}
                        className={`
                          h-8 text-xs font-mono border-slate-700/50
                          ${concluded
                            ? "bg-transparent border-transparent text-slate-400"
                            : item.deadline
                            ? "bg-violet-500/5 border-violet-500/20 text-violet-200"
                            : "bg-slate-800/50"
                          }
                        `}
                      />
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2">
                      <Select
                        value={item.status}
                        onValueChange={(v) => handleStatusChange(item.id, v)}
                        disabled={concluded}
                      >
                        <SelectTrigger className={`
                          h-8 text-xs border-slate-700/50
                          ${concluded ? "bg-transparent border-transparent" : "bg-slate-800/50"}
                          ${st.color}
                        `}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {STATUS_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value} className="text-slate-200">
                              <span className={STATUS_CONFIG[o.value]?.color}>{o.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-400 mb-1">
              {firstMeeting ? "No Agenda Items" : "No Meeting Defined"}
            </h3>
            <p className="text-sm text-slate-600 max-w-md">
              {firstMeeting
                ? 'Click "AI Generate" to auto-extract agenda items from overdue tasks, 8D reports, and quality issues.'
                : "Configure a recurring meeting in the OA Command Center to activate the smart whiteboard."}
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          FOOTER — Action bar
          ═══════════════════════════════════════════════ */}
      <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-md px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Stats summary */}
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              <strong className="text-slate-300">{totalCount}</strong> items
            </span>
            <span>
              <strong className="text-cyan-400">{decidedCount}</strong> decided
            </span>
            <span>
              <strong className="text-blue-400">{assignedCount}</strong> assigned
            </span>
            {!concluded && agendaQuery.isFetching && (
              <span className="flex items-center gap-1 text-slate-600">
                <Loader2 className="h-3 w-3 animate-spin" /> syncing...
              </span>
            )}
          </div>

          {/* Action Button */}
          {concluded ? (
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 px-4 py-1.5">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Meeting Concluded — Tasks Dispatched
              </Badge>
            </div>
          ) : (
            <Button
              onClick={handleConclude}
              disabled={concludeMut.isPending || totalCount === 0}
              className="
                min-h-[44px] px-6
                bg-gradient-to-r from-cyan-500 to-blue-600 text-white
                border-0 hover:from-cyan-400 hover:to-blue-500
                shadow-lg shadow-cyan-500/20
                disabled:opacity-40 disabled:shadow-none
              "
            >
              {concludeMut.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Concluding...</>
              ) : (
                <><Gavel className="h-4 w-4 mr-2" /> Conclude Meeting & Dispatch Tasks</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// Sub-Component: Stat Pill for header bar
// ════════════════════════════════════════════════════════

function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-mono font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
