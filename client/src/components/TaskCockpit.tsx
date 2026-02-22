/**
 * TaskCockpit — AI Task Assistant
 *
 * Categorized task management with:
 * - Category tabs (milestone / approval / hr_training / field_service)
 * - Task detail sheet with time tracker + prerequisites panel
 * - QMS safety guard for field_service tasks
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PHASE_LABELS } from "@/config/rolePhaseConfig";
import {
  Play, Square, Clock, CheckCircle2, XCircle, AlertTriangle,
  Target, FileCheck, GraduationCap, Wrench, ListTodo, Shield,
} from "lucide-react";

// ============================================
// Types
// ============================================
interface Task {
  id: number;
  name: string;
  status: string;
  priority: string;
  phaseCode: string | null;
  taskCategory: string | null;
  safetyChecklistCompleted: boolean | null;
  completionPercent: number | null;
  estimatedHours: number | null;
  actualHours: number | null;
  plannedEndDate: string | null;
  projectId: number;
  [key: string]: any;
}

const CATEGORIES = [
  { key: "milestone", label: "项目里程碑", labelEn: "Milestones", icon: Target },
  { key: "approval", label: "流程审批", labelEn: "Approvals", icon: FileCheck },
  { key: "hr_training", label: "HR/培训", labelEn: "HR/Training", icon: GraduationCap },
  { key: "field_service", label: "现场服务", labelEn: "Field Service", icon: Wrench },
  { key: "other", label: "其他任务", labelEn: "Other", icon: ListTodo },
] as const;

// ============================================
// Time Tracker Widget
// ============================================
function TimeTrackerWidget({ taskId, projectId, userId }: { taskId: number; projectId: number; userId: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const utils = trpc.useUtils();

  const { data: activeSession } = trpc.taskCockpit.getActiveSession.useQuery({ userId });
  const startMut = trpc.taskCockpit.startTimer.useMutation({
    onSuccess: () => utils.taskCockpit.getActiveSession.invalidate(),
  });
  const stopMut = trpc.taskCockpit.stopTimer.useMutation({
    onSuccess: () => utils.taskCockpit.getActiveSession.invalidate(),
  });

  const isRunning = activeSession?.taskId === taskId && activeSession?.isActive;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !activeSession) { setElapsed(0); return; }
    const started = new Date(activeSession.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [isRunning, activeSession]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Clock className="w-5 h-5 text-blue-500 shrink-0" />
      <span className="font-mono text-lg tabular-nums">{isRunning ? fmt(elapsed) : "00:00:00"}</span>
      {isRunning ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => activeSession && stopMut.mutate({ sessionId: activeSession.id })}
          disabled={stopMut.isPending}
        >
          <Square className="w-4 h-4 mr-1" />
          {isEn ? "Stop" : "停止"}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => startMut.mutate({ taskId, projectId, userId })}
          disabled={startMut.isPending}
        >
          <Play className="w-4 h-4 mr-1" />
          {isEn ? "Start" : "开始"}
        </Button>
      )}
    </div>
  );
}

// ============================================
// Prerequisites Panel
// ============================================
function PrerequisitesPanel({ taskId }: { taskId: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { data, isLoading } = trpc.taskCockpit.checkPrerequisites.useQuery({ taskId });

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!data) return null;

  if (data.canComplete && data.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm">{isEn ? "All prerequisites met" : "所有前置条件已满足"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.blockers.map((b, i) => (
        <div key={`b-${i}`} className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{b.message}</span>
        </div>
      ))}
      {data.warnings.map((w, i) => (
        <div key={`w-${i}`} className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{w.message}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Task Detail Sheet
// ============================================
function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  userId,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: number;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const utils = trpc.useUtils();

  const safetyMut = trpc.taskCockpit.setSafetyChecklistComplete.useMutation({
    onSuccess: () => {
      utils.taskCockpit.getTasksForCockpit.invalidate();
      utils.taskCockpit.checkPrerequisites.invalidate();
    },
  });
  const completeMut = trpc.taskCockpit.completeTask.useMutation({
    onSuccess: () => {
      utils.taskCockpit.getTasksForCockpit.invalidate();
      utils.taskCockpit.checkPrerequisites.invalidate();
      onOpenChange(false);
    },
  });

  const { data: prereqs } = trpc.taskCockpit.checkPrerequisites.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task }
  );

  if (!task) return null;

  const phaseLabel = task.phaseCode ? PHASE_LABELS[task.phaseCode] : null;
  const isFieldService = task.taskCategory === "field_service";
  const canComplete = prereqs?.canComplete ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="truncate">{task.name}</span>
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={task.priority === "critical" ? "destructive" : task.priority === "high" ? "default" : "secondary"}>
              {task.priority}
            </Badge>
            {task.phaseCode && (
              <Badge variant="outline" className="font-mono text-xs">
                {task.phaseCode}{phaseLabel ? ` · ${isEn ? phaseLabel.en : phaseLabel.zh}` : ""}
              </Badge>
            )}
            <Badge variant="outline">{task.status}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Time Tracker */}
          <div>
            <h4 className="text-sm font-medium mb-2">{isEn ? "Time Tracking" : "计时追踪"}</h4>
            <TimeTrackerWidget taskId={task.id} projectId={task.projectId} userId={userId} />
            {(task.estimatedHours || task.actualHours) && (
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {task.estimatedHours && <span>{isEn ? "Est" : "预估"}: {task.estimatedHours}h</span>}
                {task.actualHours && <span>{isEn ? "Actual" : "实际"}: {task.actualHours}h</span>}
              </div>
            )}
          </div>

          {/* Safety Checklist (field_service only) */}
          {isFieldService && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Shield className="w-4 h-4 text-red-500" />
                {isEn ? "Safety Checklist" : "安全检查清单"}
              </h4>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="safety-check"
                  checked={!!task.safetyChecklistCompleted}
                  onCheckedChange={(checked) =>
                    safetyMut.mutate({ taskId: task.id, completed: !!checked })
                  }
                />
                <label htmlFor="safety-check" className="text-sm cursor-pointer">
                  {isEn
                    ? "I confirm the safety checklist has been completed for this field service task"
                    : "确认本现场服务任务安全检查清单已完成"}
                </label>
              </div>
            </div>
          )}

          {/* Prerequisites */}
          <div>
            <h4 className="text-sm font-medium mb-2">{isEn ? "Prerequisites" : "前置条件"}</h4>
            <PrerequisitesPanel taskId={task.id} />
          </div>

          {/* Progress */}
          <div>
            <h4 className="text-sm font-medium mb-2">{isEn ? "Completion" : "完成进度"}</h4>
            <Progress value={task.completionPercent ?? 0} className="h-2" />
            <span className="text-xs text-muted-foreground">{task.completionPercent ?? 0}%</span>
          </div>

          {/* Complete Button */}
          {task.status !== "done" && (
            <Button
              className="w-full"
              disabled={!canComplete || completeMut.isPending}
              onClick={() => completeMut.mutate({ taskId: task.id })}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isEn ? "Mark as Complete" : "标记完成"}
            </Button>
          )}
          {completeMut.error && (
            <p className="text-sm text-red-500">{completeMut.error.message}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// Active Timer Banner
// ============================================
function ActiveTimerBanner({ userId }: { userId: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { data: session } = trpc.taskCockpit.getActiveSession.useQuery({ userId });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session?.isActive) { setElapsed(0); return; }
    const started = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session]);

  if (!session?.isActive) return null;

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-blue-600 text-white rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 animate-pulse" />
        <span className="text-sm">{isEn ? "Timer running" : "计时进行中"}</span>
        <span className="font-mono tabular-nums">{fmt(elapsed)}</span>
      </div>
      <Badge variant="secondary" className="text-xs">Task #{session.taskId}</Badge>
    </div>
  );
}

// ============================================
// Main TaskCockpit Component
// ============================================
export default function TaskCockpit({ projectId, userId = 1 }: { projectId: number; userId?: number }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: grouped, isLoading } = trpc.taskCockpit.getTasksForCockpit.useQuery({ projectId });

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
  };

  const renderTaskList = (tasks: Task[]) => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {isEn ? "No tasks in this category" : "此类别暂无任务"}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.plannedEndDate && task.plannedEndDate < new Date().toISOString() && task.status !== "done";
          return (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              onClick={() => openTask(task)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {task.status === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm truncate ${isOverdue ? "text-red-600 font-medium" : ""}`}>{task.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.phaseCode && (
                      <span className="text-[10px] font-mono text-muted-foreground">{task.phaseCode}</span>
                    )}
                    <Badge variant={task.priority === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                      {task.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{task.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {task.completionPercent !== null && task.completionPercent !== undefined && (
                  <span className="text-xs text-muted-foreground">{task.completionPercent}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div>
      <ActiveTimerBanner userId={userId} />

      <Tabs defaultValue="milestone">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          {CATEGORIES.map(cat => {
            const tasks = (grouped as any)?.[cat.key] ?? [];
            return (
              <TabsTrigger key={cat.key} value={cat.key} className="gap-1">
                <cat.icon className="w-4 h-4" />
                {isEn ? cat.labelEn : cat.label}
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">{tasks.length}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.key} value={cat.key}>
            {renderTaskList((grouped as any)?.[cat.key] ?? [])}
          </TabsContent>
        ))}
      </Tabs>

      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        userId={userId}
      />
    </div>
  );
}
