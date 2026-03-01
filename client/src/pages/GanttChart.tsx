/**
 * 甘特图页面
 * 项目甘特图、任务依赖、里程碑追踪
 * Data source: operationsDashboard.getGanttTasks (DB-backed)
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, Building2, ChevronLeft, ChevronRight, Milestone } from "lucide-react";
import { PageHeader } from "@/components/grt";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;
const WEEKS = Array.from({ length: 20 }, (_, i) => `W${i + 1}`);

export default function GanttChart() {
  const { currentBU } = useUserProfile();
  const { t } = useLanguage();
  const tasksQuery = trpc.operationsDashboard.getGanttTasks.useQuery(undefined, QUERY_OPTS);
  const tasks = (tasksQuery.data ?? []) as any[];

  if (tasksQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title={t("projects.gantt.title")}
        description={t("projects.gantt.description")}
        actions={<>
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Select defaultValue="all">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("projects.gantt.allProjects")}</SelectItem>
              <SelectItem value="p1">缸体清洗线</SelectItem>
              <SelectItem value="p2">变速箱清洗</SelectItem>
            </SelectContent>
          </Select>
        </>}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("projects.gantt.projectGantt")} - 缸体清洗线</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">2026 Q1</span>
              <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* 时间轴头部 */}
            <div className="flex border-b pb-2 mb-2 min-w-[800px]">
              <div className="w-40 shrink-0 text-sm font-medium text-muted-foreground">{t("projects.gantt.taskName")}</div>
              <div className="flex-1 flex">
                {WEEKS.map(w => (
                  <div key={w} className="flex-1 text-center text-xs text-muted-foreground">{w}</div>
                ))}
              </div>
            </div>
            {/* 甘特条 */}
            <div className="space-y-1 min-w-[800px]">
              {tasks.map((task: any) => (
                <div key={task.id} className="flex items-center h-8">
                  <div className="w-40 shrink-0 text-sm truncate pr-2">{task.name}</div>
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute top-0 h-full rounded ${task.color} opacity-80`}
                      style={{ left: `${((task.start ?? 1) - 1) * 5}%`, width: `${(task.duration ?? 1) * 5}%` }}
                    >
                      <div className="h-full bg-white/30 rounded" style={{ width: `${task.progress ?? 0}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">{task.progress ?? 0}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Milestone className="h-3 w-3" />{t("projects.gantt.milestone")}</span>
            <span>{t("projects.gantt.totalDuration")}</span>
            <span>{t("projects.gantt.overallProgress")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
