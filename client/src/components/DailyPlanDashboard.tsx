import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import {
  ListTodo, CheckCircle2, Clock, AlertCircle,
  Sparkles, RefreshCw, Plus, Flame, TrendingUp, Loader2,
} from "lucide-react";

interface DailyPlanDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const sourceLabels: Record<string, string> = {
  annual_plan: '年度计划',
  quarterly_plan: '季度计划',
  monthly_plan: '月度计划',
  opl: '项目任务',
  meeting: '会议行动',
  supervisor: '主管分配',
  manual: '临时任务',
  customer_feedback: '客户反馈',
  kpi_gap: 'KPI差距',
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  P0: { label: 'P0', cls: 'bg-red-600/20 text-red-400 border-red-500/30' },
  P1: { label: 'P1', cls: 'bg-red-500/20 text-red-500 border-red-500/30' },
  P2: { label: 'P2', cls: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  P3: { label: 'P3', cls: 'bg-green-500/20 text-green-500 border-green-500/30' },
};

export default function DailyPlanDashboard({
  authorized = true,
  userPreferenceShow = true,
}: DailyPlanDashboardProps) {
  const { language } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const utils = trpc.useUtils();

  const planQuery = trpc.dailyPlan.getTodayPlan.useQuery();
  const statsQuery = trpc.dailyPlan.getStats.useQuery();

  const generateMutation = trpc.dailyPlan.generatePlan.useMutation({
    onSuccess: () => utils.dailyPlan.getTodayPlan.invalidate(),
  });
  const updateStatusMutation = trpc.dailyPlan.updateTaskStatus.useMutation({
    onSuccess: () => {
      utils.dailyPlan.getTodayPlan.invalidate();
      utils.dailyPlan.getStats.invalidate();
    },
  });
  const addTaskMutation = trpc.dailyPlan.addTask.useMutation({
    onSuccess: () => {
      utils.dailyPlan.getTodayPlan.invalidate();
      setNewTaskTitle('');
      setShowAddForm(false);
    },
  });
  const refreshMutation = trpc.dailyPlan.refreshPlan.useMutation({
    onSuccess: () => {
      utils.dailyPlan.getTodayPlan.invalidate();
      utils.dailyPlan.getStats.invalidate();
    },
  });

  const plan = planQuery.data;
  const stats = statsQuery.data;

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateStatusMutation.mutate({ taskId, status: newStatus as any });
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTaskMutation.mutate({ title: newTaskTitle.trim() });
  };

  const progress = plan ? (plan.totalCount > 0 ? (plan.completedCount / plan.totalCount) * 100 : 0) : 0;

  return (
    <DashboardWidget
      title={language === 'zh' ? '每日计划' : 'Daily Plan'}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<ListTodo className="w-5 h-5" />}
      headerExtra={
        <div className="flex items-center gap-2">
          {stats && (
            <>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>{stats.avgCompletionRate}%</span>
              </div>
              {stats.streak > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-400">
                  <Flame className="w-3 h-3" />
                  <span>{stats.streak}天</span>
                </div>
              )}
            </>
          )}
          {plan && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {plan && (
            <Badge variant="outline" className="text-xs">
              {plan.completedCount}/{plan.totalCount} {language === 'zh' ? '已完成' : 'Done'}
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {planQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>{language === 'zh' ? '加载中...' : 'Loading...'}</span>
          </div>
        ) : !plan ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Sparkles className="w-8 h-8 text-primary/50" />
            <p className="text-sm text-muted-foreground">
              {language === 'zh' ? '今日尚未生成工作计划' : 'No plan generated for today'}
            </p>
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {language === 'zh' ? '生成今日计划' : "Generate Today's Plan"}
            </Button>
          </div>
        ) : (
          <>
            <Progress value={progress} className="h-2" />

            {showAddForm && (
              <div className="flex gap-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={language === 'zh' ? '输入任务标题...' : 'Task title...'}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleAddTask}
                  disabled={addTaskMutation.isPending || !newTaskTitle.trim()}
                >
                  {language === 'zh' ? '添加' : 'Add'}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {plan.tasks.map((task: any) => (
                <div
                  key={task.taskId}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => handleToggleTask(task.taskId, task.status)}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  ) : task.status === 'in_progress' ? (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-slate-200 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {sourceLabels[task.sourceType] || task.sourceType}
                      </Badge>
                      {priorityConfig[task.priority] && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${priorityConfig[task.priority].cls}`}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                      )}
                      {task.estimatedHours && (
                        <span className="text-[10px] text-muted-foreground">{task.estimatedHours}h</span>
                      )}
                    </div>
                    {task.description && task.status !== 'completed' && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-primary/70">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate">{task.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {plan.aiSummary && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 mt-0.5 text-primary/50 shrink-0" />
                  <p className="line-clamp-2">{plan.aiSummary}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardWidget>
  );
}
