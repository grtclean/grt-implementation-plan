import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt";
import {
  CalendarDays,
  Loader2,
  Sparkles,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react";

interface PlanTask {
  id: string;
  name: string;
  phase: string;
  duration: number;
  startDate: string;
  endDate: string;
  assignee: string;
  dependencies: string[];
  risk: 'low' | 'medium' | 'high';
  aiOptimization?: string;
}

interface ResourceAllocation {
  role: string;
  name: string;
  utilization: number;
  tasks: number;
  overloaded: boolean;
}

export default function AIPlanningAssistant() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectType, setProjectType] = useState('');
  const [complexity, setComplexity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [resources, setResources] = useState<ResourceAllocation[]>([]);

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': { zh: 'AI 计划助手', en: 'AI Planning Assistant', de: 'KI-Planungsassistent', fr: 'Assistant Planification IA' },
      'description': { zh: '智能生成项目计划，优化资源分配和时间安排', en: 'Intelligently generate project plans, optimize resource allocation and scheduling', de: 'Intelligente Projektplanung und Ressourcenoptimierung', fr: 'Génération intelligente de plans de projet' },
      'projectType': { zh: '项目类型', en: 'Project Type', de: 'Projekttyp', fr: 'Type de projet' },
      'complexity': { zh: '复杂度', en: 'Complexity', de: 'Komplexität', fr: 'Complexité' },
      'deadline': { zh: '目标交付日期', en: 'Target Deadline', de: 'Zieltermin', fr: 'Date limite' },
      'generate': { zh: '生成计划', en: 'Generate Plan', de: 'Plan erstellen', fr: 'Générer le plan' },
      'generating': { zh: '正在生成...', en: 'Generating...', de: 'Wird erstellt...', fr: 'Génération en cours...' },
      'taskPlan': { zh: '任务计划', en: 'Task Plan', de: 'Aufgabenplan', fr: 'Plan des tâches' },
      'resourcePlan': { zh: '资源分配', en: 'Resources', de: 'Ressourcen', fr: 'Ressources' },
      'optimization': { zh: 'AI优化', en: 'AI Optimization', de: 'KI-Optimierung', fr: 'Optimisation IA' },
      'phase': { zh: '阶段', en: 'Phase', de: 'Phase', fr: 'Phase' },
      'duration': { zh: '工期', en: 'Duration', de: 'Dauer', fr: 'Durée' },
      'assignee': { zh: '负责人', en: 'Assignee', de: 'Zuständig', fr: 'Assigné' },
      'risk': { zh: '风险', en: 'Risk', de: 'Risiko', fr: 'Risque' },
      'utilization': { zh: '利用率', en: 'Utilization', de: 'Auslastung', fr: 'Utilisation' },
      'standard': { zh: '标准设备', en: 'Standard Equipment', de: 'Standardausrüstung', fr: 'Équipement standard' },
      'custom': { zh: '定制设备', en: 'Custom Equipment', de: 'Sonderanfertigung', fr: 'Équipement personnalisé' },
      'automation': { zh: '自动化产线', en: 'Automation Line', de: 'Automatisierungslinie', fr: 'Ligne d\'automatisation' },
      'low': { zh: '低', en: 'Low', de: 'Niedrig', fr: 'Faible' },
      'medium': { zh: '中', en: 'Medium', de: 'Mittel', fr: 'Moyen' },
      'high': { zh: '高', en: 'High', de: 'Hoch', fr: 'Élevé' },
      'days': { zh: '天', en: 'days', de: 'Tage', fr: 'jours' },
      'applyOptimization': { zh: '应用优化', en: 'Apply Optimization', de: 'Optimierung anwenden', fr: 'Appliquer l\'optimisation' },
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  const handleGenerate = async () => {
    if (!projectType || !complexity) {
      toast({
        title: language === 'zh' ? '请填写必要信息' : 'Please fill required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Mock task plan
      setTasks([
        { id: '1', name: '需求确认', phase: 'M1', duration: 5, startDate: '2024-02-01', endDate: '2024-02-05', assignee: '张工', dependencies: [], risk: 'low' },
        { id: '2', name: '方案设计', phase: 'M2', duration: 10, startDate: '2024-02-06', endDate: '2024-02-19', assignee: '李工', dependencies: ['1'], risk: 'medium', aiOptimization: '建议并行进行机械和电气设计，可节省5天' },
        { id: '3', name: '机械设计', phase: 'M3', duration: 15, startDate: '2024-02-20', endDate: '2024-03-11', assignee: '焦斌', dependencies: ['2'], risk: 'medium' },
        { id: '4', name: '电气设计', phase: 'M4', duration: 12, startDate: '2024-02-20', endDate: '2024-03-06', assignee: '赵工', dependencies: ['2'], risk: 'low' },
        { id: '5', name: '采购', phase: 'M5', duration: 20, startDate: '2024-03-07', endDate: '2024-04-03', assignee: '采购部', dependencies: ['3', '4'], risk: 'high', aiOptimization: '长周期物料建议提前采购' },
        { id: '6', name: '装配', phase: 'M7', duration: 15, startDate: '2024-04-04', endDate: '2024-04-24', assignee: '装配组', dependencies: ['5'], risk: 'medium' },
        { id: '7', name: '调试', phase: 'M8', duration: 10, startDate: '2024-04-25', endDate: '2024-05-08', assignee: '调试组', dependencies: ['6'], risk: 'high' },
        { id: '8', name: 'FAT验收', phase: 'M9', duration: 3, startDate: '2024-05-09', endDate: '2024-05-13', assignee: '质量部', dependencies: ['7'], risk: 'low' },
      ]);

      setResources([
        { role: '机械工程师', name: '焦斌', utilization: 85, tasks: 3, overloaded: false },
        { role: '电气工程师', name: '赵工', utilization: 72, tasks: 2, overloaded: false },
        { role: '项目经理', name: '张工', utilization: 95, tasks: 5, overloaded: true },
        { role: '装配技师', name: '装配组', utilization: 60, tasks: 2, overloaded: false },
        { role: '调试工程师', name: '调试组', utilization: 88, tasks: 2, overloaded: false },
      ]);

      toast({
        title: language === 'zh' ? '计划生成完成' : 'Plan Generated',
        description: language === 'zh' ? '已生成8个任务，总工期约100天' : '8 tasks generated, ~100 days total',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate plan',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const riskColors: Record<string, string> = {
    low: 'bg-green-500/20 text-green-500',
    medium: 'bg-yellow-500/20 text-yellow-500',
    high: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title={t('title')}
        description={t('description')}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{language === 'zh' ? '项目参数' : 'Project Parameters'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('projectType')}</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'zh' ? '选择类型' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t('standard')}</SelectItem>
                  <SelectItem value="custom">{t('custom')}</SelectItem>
                  <SelectItem value="automation">{t('automation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('complexity')}</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'zh' ? '选择复杂度' : 'Select complexity'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('low')}</SelectItem>
                  <SelectItem value="medium">{t('medium')}</SelectItem>
                  <SelectItem value="high">{t('high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('deadline')}</Label>
              <Input 
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('generate')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {tasks.length > 0 && (
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks">{t('taskPlan')}</TabsTrigger>
            <TabsTrigger value="resources">{t('resourcePlan')}</TabsTrigger>
            <TabsTrigger value="optimization">{t('optimization')}</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {tasks.map((task, index) => (
              <Card key={task.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{task.phase}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{task.name}</h3>
                        <Badge className={riskColors[task.risk]}>{t(task.risk)}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {task.duration} {t('days')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {task.assignee}
                        </span>
                        <span>{task.startDate} → {task.endDate}</span>
                      </div>
                      {task.aiOptimization && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                          <Sparkles className="w-3 h-3" />
                          {task.aiOptimization}
                        </div>
                      )}
                    </div>
                    {index < tasks.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((resource) => (
                <Card key={resource.name}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{resource.name}</h3>
                        <p className="text-sm text-muted-foreground">{resource.role}</p>
                      </div>
                      {resource.overloaded && (
                        <Badge className="bg-red-500/20 text-red-500">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {language === 'zh' ? '超负荷' : 'Overloaded'}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('utilization')}</span>
                        <span className={resource.utilization > 90 ? 'text-red-500' : ''}>{resource.utilization}%</span>
                      </div>
                      <Progress value={resource.utilization} className={`h-2 ${resource.utilization > 90 ? '[&>div]:bg-red-500' : ''}`} />
                      <p className="text-xs text-muted-foreground">{resource.tasks} {language === 'zh' ? '个任务' : 'tasks'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  {language === 'zh' ? 'AI优化建议' : 'AI Optimization Suggestions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tasks.filter(t => t.aiOptimization).map((task) => (
                  <div key={task.id} className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{task.name} ({task.phase})</p>
                        <p className="text-sm text-muted-foreground mt-1">{task.aiOptimization}</p>
                        <Button size="sm" className="mt-3">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {t('applyOptimization')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-medium mb-2">{language === 'zh' ? '整体优化效果' : 'Overall Optimization Impact'}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {language === 'zh' ? '应用所有建议可缩短工期约10天' : 'Applying all suggestions can reduce duration by ~10 days'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {language === 'zh' ? '资源利用率可优化15%' : 'Resource utilization can be optimized by 15%'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {language === 'zh' ? '高风险任务可减少2个' : 'High-risk tasks can be reduced by 2'}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
