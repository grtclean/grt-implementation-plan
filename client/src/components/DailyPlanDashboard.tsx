import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { ListTodo, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";

interface DailyTask {
  id: string;
  title: string;
  source: 'ANNUAL_PLAN' | 'PROJECT_CMS' | 'MEETING_ACTION' | 'AD_HOC' | 'LEAVE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  aiSuggestion?: string;
}

interface DailyPlanDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const mockTasks: DailyTask[] = [
  { id: '1', title: '完成Q1销售报告', source: 'ANNUAL_PLAN', priority: 'HIGH', status: 'IN_PROGRESS', aiSuggestion: '建议优先处理，截止日期临近' },
  { id: '2', title: '项目A设计评审', source: 'PROJECT_CMS', priority: 'HIGH', status: 'PENDING' },
  { id: '3', title: '团队周会准备', source: 'MEETING_ACTION', priority: 'MEDIUM', status: 'COMPLETED' },
  { id: '4', title: '供应商沟通', source: 'AD_HOC', priority: 'LOW', status: 'PENDING' },
];

const sourceLabels: Record<string, { zh: string; en: string }> = {
  ANNUAL_PLAN: { zh: '年度计划', en: 'Annual Plan' },
  PROJECT_CMS: { zh: '项目任务', en: 'Project Task' },
  MEETING_ACTION: { zh: '会议行动', en: 'Meeting Action' },
  AD_HOC: { zh: '临时任务', en: 'Ad Hoc' },
  LEAVE: { zh: '请假', en: 'Leave' },
};

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-500/20 text-red-500 border-red-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  LOW: 'bg-green-500/20 text-green-500 border-green-500/30',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4 text-muted-foreground" />,
  IN_PROGRESS: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

export default function DailyPlanDashboard({ 
  authorized = true, 
  userPreferenceShow = true 
}: DailyPlanDashboardProps) {
  const { language } = useLanguage();
  const completedCount = mockTasks.filter(t => t.status === 'COMPLETED').length;
  const progress = (completedCount / mockTasks.length) * 100;

  return (
    <DashboardWidget
      title={language === 'zh' ? '每日计划' : 'Daily Plan'}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<ListTodo className="w-5 h-5" />}
      headerExtra={
        <Badge variant="outline" className="text-xs">
          {completedCount}/{mockTasks.length} {language === 'zh' ? '已完成' : 'Done'}
        </Badge>
      }
    >
      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-3">
          {mockTasks.map(task => (
            <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
              {statusIcons[task.status]}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-200 ${task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {sourceLabels[task.source]?.[language === 'zh' ? 'zh' : 'en'] || task.source}
                  </Badge>
                  <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </Badge>
                </div>
                {task.aiSuggestion && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-primary">
                    <Sparkles className="w-3 h-3" />
                    <span>{task.aiSuggestion}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardWidget>
  );
}
