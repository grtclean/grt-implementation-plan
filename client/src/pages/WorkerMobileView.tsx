/**
 * 产线员工移动端视图 (Worker Mobile View)
 * 
 * 功能：
 * 1. 简化的移动端界面，仅显示当前分配的工序步骤
 * 2. 大号开始/结束打卡按钮
 * 3. 今日/本周工时统计
 * 4. 工时历史记录
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Play, Square, Clock, CheckCircle2, AlertCircle,
  Loader2, Timer, Calendar, History, Wrench,
  ChevronRight, User, Zap, Home
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function WorkerMobileView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const assignmentsQuery = trpc.processSteps.getWorkerAssignments.useQuery();
  const summaryQuery = trpc.processSteps.getWorkerDailySummary.useQuery();
  const historyQuery = trpc.processSteps.getWorkerTimeHistory.useQuery({ limit: 30 });

  const startMutation = trpc.processSteps.startTimeLogForWorker.useMutation({
    onSuccess: () => {
      toast({ title: t("manufacturing.workerMobile.timerStarted"), description: t("manufacturing.workerMobile.timerStartedDesc") });
      assignmentsQuery.refetch();
      summaryQuery.refetch();
    },
    onError: (err) => toast({ title: t("manufacturing.workerMobile.startFailed"), description: err.message, variant: "destructive" }),
  });

  const endMutation = trpc.processSteps.endTimeLog.useMutation({
    onSuccess: (data: any) => {
      toast({ title: t("manufacturing.workerMobile.timeRecorded"), description: `${t("manufacturing.workerMobile.actualHours")}: ${data.actualHours?.toFixed(2) || '?'}h` });
      assignmentsQuery.refetch();
      summaryQuery.refetch();
      historyQuery.refetch();
    },
    onError: (err) => toast({ title: t("manufacturing.workerMobile.endFailed"), description: err.message, variant: "destructive" }),
  });

  const assignments = (assignmentsQuery.data as any[]) || [];
  const summary = summaryQuery.data as any;
  const history = (historyQuery.data as any[]) || [];

  // 当前正在计时的任务
  const activeTask = assignments.find((a: any) => a.activeTimeLogId !== null);

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20">
      {/* 返回主页导航 */}
      <div className="flex items-center gap-2 py-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <Home className="w-4 h-4" />
            {t("manufacturing.workerMobile.backToHome")}
          </Button>
        </Link>
      </div>
      {/* 顶部：员工信息和统计 */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg">{user?.name || t("manufacturing.workerMobile.lineWorker")}</div>
              <div className="text-xs text-muted-foreground">{t("manufacturing.workerMobile.workstationTerminal")}</div>
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/80 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{summary.todayHours?.toFixed(1) || 0}h</div>
                <div className="text-[10px] text-muted-foreground">{t("manufacturing.workerMobile.todayHours")} ({summary.todayTasks || 0})</div>
              </div>
              <div className="bg-background/80 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.weekHours?.toFixed(1) || 0}h</div>
                <div className="text-[10px] text-muted-foreground">{t("manufacturing.workerMobile.weekHours")} ({summary.weekTasks || 0})</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 当前正在计时的任务 - 醒目显示 */}
      {activeTask && (
        <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 animate-pulse-slow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="font-bold text-blue-700 dark:text-blue-300">{t("manufacturing.workerMobile.timing")}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">{activeTask.processCode}</Badge>
                <span className="font-medium">{activeTask.processName}</span>
              </div>
              <div className="text-lg font-bold mb-1">{activeTask.stepName}</div>
              {activeTask.processRequirements && (
                <div className="text-xs text-muted-foreground mb-1">
                  {t("manufacturing.workerMobile.processRequirements")}: {activeTask.processRequirements}
                </div>
              )}
              <ElapsedTimer startTime={activeTask.activeStartTime} />
            </div>
            <Button
              className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700"
              onClick={() => endMutation.mutate({ timeLogId: activeTask.activeTimeLogId })}
              disabled={endMutation.isPending}
            >
              {endMutation.isPending ? (
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              ) : (
                <Square className="w-6 h-6 mr-2" />
              )}
              {t("manufacturing.workerMobile.endTime")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 标签页：待办任务 / 历史记录 */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks" className="text-sm">
            <Wrench className="w-4 h-4 mr-1" />
            {t("manufacturing.workerMobile.pendingSteps")} ({assignments.filter((a: any) => !a.activeTimeLogId).length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            <History className="w-4 h-4 mr-1" />
            {t("manufacturing.workerMobile.timeRecords")}
          </TabsTrigger>
        </TabsList>

        {/* 待办任务列表 */}
        <TabsContent value="tasks" className="space-y-3 mt-3">
          {assignmentsQuery.isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : assignments.filter((a: any) => !a.activeTimeLogId).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                <span className="text-muted-foreground">{t("manufacturing.workerMobile.noPendingSteps")}</span>
              </CardContent>
            </Card>
          ) : (
            assignments
              .filter((a: any) => !a.activeTimeLogId)
              .map((task: any) => (
                <WorkerTaskCard
                  key={task.bomStepId}
                  task={task}
                  user={user}
                  onStart={() => {
                    startMutation.mutate({
                      bomStepId: task.bomStepId,
                      workerId: user?.id || 0,
                      workerName: user?.name || t("manufacturing.workerMobile.unknown"),
                    });
                  }}
                  isStarting={startMutation.isPending}
                  hasActiveTask={!!activeTask}
                />
              ))
          )}
        </TabsContent>

        {/* 工时历史记录 */}
        <TabsContent value="history" className="space-y-2 mt-3">
          {historyQuery.isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <span className="text-muted-foreground">{t("manufacturing.workerMobile.noTimeRecords")}</span>
              </CardContent>
            </Card>
          ) : (
            history.map((record: any) => (
              <Card key={record.id} className="bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{record.processCode}</Badge>
                      <span className="font-medium text-sm">{record.stepName}</span>
                    </div>
                    {record.actualHours ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        {record.actualHours.toFixed(2)}h
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("manufacturing.workerMobile.inProgress")}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{new Date(record.startTime).toLocaleString()}</span>
                    {record.endTime && (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        <span>{new Date(record.endTime).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                  {record.notes && (
                    <div className="text-xs text-muted-foreground mt-1 italic">{record.notes}</div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// 子组件：员工任务卡片
// ============================================================

function WorkerTaskCard({
  task, user, onStart, isStarting, hasActiveTask
}: {
  task: any; user: any;
  onStart: () => void;
  isStarting: boolean;
  hasActiveTask: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono">{task.processCode}</Badge>
          <span className="text-sm text-muted-foreground">{task.processName}</span>
        </div>
        <div className="font-bold text-lg mb-2">{task.stepName}</div>

        {task.processRequirements && (
          <div className="text-xs text-muted-foreground mb-1 bg-muted/50 rounded p-2">
            <span className="font-medium">{t("manufacturing.workerMobile.processRequirements")}:</span> {task.processRequirements}
          </div>
        )}
        {task.processDescription && (
          <div className="text-xs text-muted-foreground mb-2">
            {task.processDescription}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {task.bomItemReference && (
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" /> BOM: {task.bomItemReference}
            </span>
          )}
          {task.theoreticalHours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {t("manufacturing.workerMobile.theoretical")}: {task.theoreticalHours}h
            </span>
          )}
        </div>

        <Button
          className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
          onClick={onStart}
          disabled={isStarting || hasActiveTask}
        >
          {isStarting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          {hasActiveTask ? t("manufacturing.workerMobile.finishCurrentFirst") : t("manufacturing.workerMobile.startTime")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 子组件：已用时间计时器
// ============================================================

function ElapsedTimer({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) return;

    const update = () => {
      const diff = Date.now() - startTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 mt-2">
      <Timer className="w-4 h-4 text-blue-600" />
      <span className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">{elapsed}</span>
    </div>
  );
}
