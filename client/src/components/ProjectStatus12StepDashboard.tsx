import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { Milestone } from "lucide-react";

interface ProjectStage {
  id: number;
  name: { zh: string; en: string };
  status: 'completed' | 'in_progress' | 'pending';
}

interface Project12Step {
  id: string;
  name: string;
  currentStage: number;
  stages: ProjectStage[];
}

interface ProjectStatus12StepDashboardProps {
  authorized?: boolean;
  userPreferenceShow?: boolean;
}

const stageNames: { [key: number]: { zh: string; en: string } } = {
  1: { zh: 'M1启动', en: 'M1 Init' },
  2: { zh: 'M2需求', en: 'M2 Req' },
  3: { zh: 'M3机械', en: 'M3 Mech' },
  4: { zh: 'M4电气', en: 'M4 Elec' },
  5: { zh: 'M5采购', en: 'M5 Proc' },
  6: { zh: 'M6 BOM', en: 'M6 BOM' },
  7: { zh: 'M7装配', en: 'M7 Assy' },
  8: { zh: 'M8调试', en: 'M8 Test' },
  9: { zh: 'M9 FAT', en: 'M9 FAT' },
  10: { zh: 'M10发货', en: 'M10 Ship' },
  11: { zh: 'M11 SAT', en: 'M11 SAT' },
  12: { zh: 'M12验收', en: 'M12 Accept' },
};

const mockProjects: Project12Step[] = [
  {
    id: '1',
    name: '超声波清洗机-A型',
    currentStage: 7,
    stages: Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: stageNames[i + 1],
      status: i + 1 < 7 ? 'completed' : i + 1 === 7 ? 'in_progress' : 'pending',
    })),
  },
  {
    id: '2',
    name: '真空干燥设备-B型',
    currentStage: 4,
    stages: Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: stageNames[i + 1],
      status: i + 1 < 4 ? 'completed' : i + 1 === 4 ? 'in_progress' : 'pending',
    })),
  },
  {
    id: '3',
    name: '自动化产线-C型',
    currentStage: 10,
    stages: Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: stageNames[i + 1],
      status: i + 1 < 10 ? 'completed' : i + 1 === 10 ? 'in_progress' : 'pending',
    })),
  },
];

const statusColors: Record<string, string> = {
  completed: 'bg-green-500',
  in_progress: 'bg-yellow-500 animate-pulse',
  pending: 'bg-muted',
};

export default function ProjectStatus12StepDashboard({ 
  authorized = true, 
  userPreferenceShow = true 
}: ProjectStatus12StepDashboardProps) {
  const { language } = useLanguage();

  return (
    <DashboardWidget
      title={language === 'zh' ? '12步项目状态' : '12-Step Project Status'}
      authorized={authorized}
      userPreferenceShow={userPreferenceShow}
      icon={<Milestone className="w-5 h-5" />}
      headerExtra={
        <Badge variant="outline" className="text-xs">
          {mockProjects.length} {language === 'zh' ? '个活跃项目' : 'Active'}
        </Badge>
      }
    >
      <div className="space-y-4">
        {mockProjects.map(project => (
          <div key={project.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">{project.name}</span>
              <Badge variant="outline" className="text-[10px]">
                {stageNames[project.currentStage]?.[language === 'zh' ? 'zh' : 'en']}
              </Badge>
            </div>
            <div className="flex gap-0.5">
              {project.stages.map(stage => (
                <div
                  key={stage.id}
                  className={`h-2 flex-1 rounded-sm ${statusColors[stage.status]}`}
                  title={stage.name[language === 'zh' ? 'zh' : 'en']}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>M1</span>
              <span>M6</span>
              <span>M12</span>
            </div>
          </div>
        ))}
        
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-sm bg-green-500" />
            <span>{language === 'zh' ? '已完成' : 'Done'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-sm bg-yellow-500" />
            <span>{language === 'zh' ? '进行中' : 'Active'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-sm bg-muted" />
            <span>{language === 'zh' ? '待开始' : 'Pending'}</span>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
