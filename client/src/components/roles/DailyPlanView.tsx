/**
 * DailyPlanView — 8-source aggregated daily plan
 * Replaces per-role placeholder DailyTasks components.
 * Queries dailyPlan.getAggregatedPlan (8 parallel DB sources)
 * and renders categorised accordion sections with task completion.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Phone,
  FolderKanban,
  CalendarRange,
  Users,
  History,
  UserCheck,
  ShieldCheck,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Flame,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

// ── Category icon map ──
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone, FolderKanban, CalendarRange, Users, History,
  UserCheck, ShieldCheck, PlusCircle,
};

const COLOR_MAP: Record<string, string> = {
  customer: "text-green-600",
  project: "text-blue-600",
  annual: "text-purple-600",
  meeting: "text-orange-600",
  carryover: "text-red-600",
  customer_assign: "text-teal-600",
  supervisor: "text-indigo-600",
  personal: "text-gray-600",
};

const BG_MAP: Record<string, string> = {
  customer: "bg-green-50",
  project: "bg-blue-50",
  annual: "bg-purple-50",
  meeting: "bg-orange-50",
  carryover: "bg-red-50",
  customer_assign: "bg-teal-50",
  supervisor: "bg-indigo-50",
  personal: "bg-gray-50",
};

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  P0: { bg: "bg-red-100 text-red-700", text: "P0" },
  P1: { bg: "bg-orange-100 text-orange-700", text: "P1" },
  P2: { bg: "bg-blue-100 text-blue-700", text: "P2" },
  P3: { bg: "bg-gray-100 text-gray-500", text: "P3" },
};

export default function DailyPlanView() {
  const { currentUserRole } = useUserProfile();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const isZh = language === "zh";

  // Expanded accordion state — start with all non-empty expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"P0" | "P1" | "P2" | "P3">("P2");

  // tRPC calls
  const aggregateQuery = trpc.dailyPlan.getAggregatedPlan.useQuery(
    { role: currentUserRole },
    { refetchOnWindowFocus: false },
  );
  const statsQuery = trpc.dailyPlan.getStats.useQuery(undefined, { refetchOnWindowFocus: false });
  const generateMut = trpc.dailyPlan.generatePlan.useMutation({
    onSuccess: () => aggregateQuery.refetch(),
  });
  const refreshMut = trpc.dailyPlan.refreshPlan.useMutation({
    onSuccess: () => aggregateQuery.refetch(),
  });
  const updateStatusMut = trpc.dailyPlan.updateTaskStatus.useMutation({
    onSuccess: () => aggregateQuery.refetch(),
  });
  const addTaskMut = trpc.dailyPlan.addPersonalItem.useMutation({
    onSuccess: () => {
      setNewTitle("");
      aggregateQuery.refetch();
    },
  });

  const data = aggregateQuery.data;
  const stats = statsQuery.data;

  // Progress
  const totalItems = data?.totalItems ?? 0;
  const completedItems = data?.completedItems ?? 0;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Date display
  const dateStr = useMemo(() => {
    const d = new Date();
    const weekday = isZh
      ? ["日", "一", "二", "三", "四", "五", "六"][d.getDay()]
      : d.toLocaleDateString("en-US", { weekday: "short" });
    return isZh
      ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${weekday}`
      : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) + ` ${weekday}`;
  }, [isZh]);

  const toggleCategory = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleToggleTask = (itemId: string, currentStatus: string) => {
    // Extract the real taskId from prefixed id (e.g., "personal-TASK-123" → "TASK-123")
    const parts = itemId.split("-");
    const prefix = parts[0];
    const taskId = parts.slice(1).join("-");

    // Only personal / carryover items can be toggled (they're in planning_tasks)
    if (prefix === "personal" || prefix === "carry") {
      updateStatusMut.mutate({
        taskId,
        status: currentStatus === "completed" ? "pending" : "completed",
      });
    }
  };

  const handleAddPersonal = () => {
    const title = newTitle.trim();
    if (!title) return;
    addTaskMut.mutate({ title, priority: newPriority });
  };

  // ── Loading ──
  if (aggregateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          {isZh ? "加载每日计划…" : "Loading daily plan…"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top Stats Bar ── */}
      <div className="rounded-xl border bg-white p-4 flex flex-wrap items-center gap-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarRange className="w-4 h-4 text-blue-500" />
          {dateStr}
        </div>

        <div className="flex-1" />

        {/* Progress */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {completedItems}/{totalItems} ({pct}%)
          </span>
        </div>

        {/* Streak */}
        {(stats?.streak ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
            <Flame className="w-3.5 h-3.5" />
            {stats!.streak}{isZh ? "天连续" : "d streak"}
          </div>
        )}

        {/* Overdue */}
        {(stats?.overdueTasks ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            {stats!.overdueTasks} {isZh ? "逾期" : "overdue"}
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isZh ? "生成计划" : "Generate Plan"}
        </button>
        <button
          onClick={() => refreshMut.mutate()}
          disabled={refreshMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
        >
          {refreshMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {isZh ? "刷新" : "Refresh"}
        </button>
      </div>

      {/* ── 8 Category Accordion Sections ── */}
      {data?.categories.map((cat) => {
        const IconComp = ICON_MAP[cat.icon] ?? PlusCircle;
        const colorClass = COLOR_MAP[cat.key] ?? "text-gray-600";
        const bgClass = BG_MAP[cat.key] ?? "bg-gray-50";
        const isCollapsed = collapsed[cat.key] ?? false;
        const count = cat.items.length;
        const completedCount = cat.items.filter((i) => i.status === "completed").length;

        return (
          <div key={cat.key} className="rounded-xl border bg-white overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(cat.key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center`}>
                <IconComp className={`w-4 h-4 ${colorClass}`} />
              </div>
              <span className="text-sm font-semibold text-foreground flex-1">
                {isZh ? cat.labelZh : cat.labelEn}
              </span>
              {count > 0 && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bgClass} ${colorClass}`}>
                  {completedCount > 0 ? `${completedCount}/` : ""}{count}
                </span>
              )}
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Items */}
            {!isCollapsed && count > 0 && (
              <div className="border-t px-4 pb-3 pt-1 space-y-1">
                {cat.items.map((item) => {
                  const isCompleted = item.status === "completed";
                  const canToggle = item.id.startsWith("personal-") || item.id.startsWith("carry-");
                  const pb = PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.P2;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors group ${
                        isCompleted ? "opacity-60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => canToggle && handleToggleTask(item.id, item.status)}
                        className={`mt-0.5 flex-shrink-0 ${canToggle ? "cursor-pointer" : "cursor-default"}`}
                        disabled={!canToggle}
                        title={canToggle ? (isZh ? "切换完成状态" : "Toggle completion") : ""}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                        )}
                      </button>

                      {/* Title + desc */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                        )}
                      </div>

                      {/* Meta badges */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${pb.bg}`}>{pb.text}</span>
                        {item.isCarryover && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                            {isZh ? "遗留" : "Carry"}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {item.dueDate}
                          </span>
                        )}
                        {item.estimatedHours && (
                          <span className="text-[10px] text-muted-foreground">{item.estimatedHours}h</span>
                        )}
                        {item.sourceRoute && (
                          <button
                            onClick={() => setLocation(item.sourceRoute!)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title={isZh ? "跳转" : "Go to source"}
                          >
                            <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-blue-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!isCollapsed && count === 0 && (
              <div className="border-t px-4 py-3">
                <p className="text-xs text-muted-foreground italic">
                  {isZh ? "暂无数据" : "No items"}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Add Personal Item ── */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-gray-500" />
          {isZh ? "添加个人项" : "Add Personal Item"}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPersonal()}
            placeholder={isZh ? "输入任务标题…" : "Task title…"}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as any)}
            className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background"
          >
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <button
            onClick={handleAddPersonal}
            disabled={!newTitle.trim() || addTaskMut.isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addTaskMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {isZh ? "添加" : "Add"}
          </button>
        </div>
      </div>

      {/* ── AI Notes ── */}
      {data?.aiNotes && data.aiNotes.length > 0 && (
        <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
          <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {isZh ? "AI 建议" : "AI Notes"}
          </h3>
          <div className="space-y-1">
            {data.aiNotes.map((note, i) => (
              <p key={i} className="text-xs text-blue-800">{note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
