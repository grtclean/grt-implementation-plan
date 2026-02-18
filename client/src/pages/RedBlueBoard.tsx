import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Clock, Eye, Layers, Loader2, Play, RefreshCw, Shield, ShieldAlert, ShieldCheck, Target, XCircle, Zap } from "lucide-react";
import { useState } from "react";

const GATES = [
  { id: 'G1', name_zh: '需求对抗', name_en: 'Requirement Challenge', description_zh: '红队模拟客户挑战需求理解', description_en: 'Red team simulates customer challenging requirement understanding',
    checkpoints: [{ id: 'G1-1', name_zh: '需求完整性验证', name_en: 'Requirement completeness verification' }, { id: 'G1-2', name_zh: '边界条件识别', name_en: 'Boundary condition identification' }, { id: 'G1-3', name_zh: '隐性需求挖掘', name_en: 'Implicit requirement discovery' }, { id: 'G1-4', name_zh: '风险预判', name_en: 'Risk prediction' }] },
  { id: 'G2', name_zh: '设计对抗', name_en: 'Design Challenge', description_zh: '红队挑战技术方案可行性', description_en: 'Red team challenges technical solution feasibility',
    checkpoints: [{ id: 'G2-1', name_zh: '技术方案评审', name_en: 'Technical solution review' }, { id: 'G2-2', name_zh: '工艺参数验证', name_en: 'Process parameter verification' }, { id: 'G2-3', name_zh: '设备选型确认', name_en: 'Equipment selection confirmation' }, { id: 'G2-4', name_zh: '接口兼容性检查', name_en: 'Interface compatibility check' }] },
  { id: 'G3', name_zh: '交付对抗', name_en: 'Delivery Challenge', description_zh: '红队模拟现场突发状况', description_en: 'Red team simulates on-site emergencies',
    checkpoints: [{ id: 'G3-1', name_zh: '安装调试预演', name_en: 'Installation commissioning rehearsal' }, { id: 'G3-2', name_zh: '异常场景模拟', name_en: 'Exception scenario simulation' }, { id: 'G3-3', name_zh: '应急预案验证', name_en: 'Emergency plan verification' }, { id: 'G3-4', name_zh: '客户验收模拟', name_en: 'Customer acceptance simulation' }] },
  { id: 'G4', name_zh: '知识固化', name_en: 'Knowledge Consolidation', description_zh: '经验总结与规范更新', description_en: 'Experience summary and specification update',
    checkpoints: [{ id: 'G4-1', name_zh: '问题清单归档', name_en: 'Issue list archiving' }, { id: 'G4-2', name_zh: '解决方案沉淀', name_en: 'Solution precipitation' }, { id: 'G4-3', name_zh: '规范更新建议', name_en: 'Specification update suggestions' }, { id: 'G4-4', name_zh: '能力证据生成', name_en: 'Capability evidence generation' }] },
];

export default function RedBlueBoard() {
  const { language } = useLanguage();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");

  // tRPC queries
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = trpc.redBlue.getProjects.useQuery();
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = (trpc.redBlue.getTasks as any).useQuery(
    { projectId: selectedProject ? parseInt(selectedProject) : undefined },
    { enabled: true }
  );
  const { data: gates, isLoading: gatesLoading, refetch: refetchGates } = (trpc.redBlue.getGates as any).useQuery(
    { projectId: selectedProject ? parseInt(selectedProject) : undefined },
    { enabled: !!selectedProject }
  );

  // Set default project when data loads
  if (projects && projects.length > 0 && !selectedProject) {
    setSelectedProject(projects[0].id.toString());
  }

  const currentProject = projects?.find((p: any) => p.id.toString() === selectedProject);

  const getGateStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> {language === 'zh' ? '已通过' : 'Passed'}</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Play className="w-3 h-3 mr-1" /> {language === 'zh' ? '进行中' : 'In Progress'}</Badge>;
      case 'pending': return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Clock className="w-3 h-3 mr-1" /> {language === 'zh' ? '待开始' : 'Pending'}</Badge>;
      case 'blocked': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> {language === 'zh' ? '阻塞' : 'Blocked'}</Badge>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{language === 'zh' ? '紧急' : 'Critical'}</Badge>;
      case 'high': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{language === 'zh' ? '高' : 'High'}</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{language === 'zh' ? '中' : 'Medium'}</Badge>;
      case 'low': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{language === 'zh' ? '低' : 'Low'}</Badge>;
      default: return null;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> {language === 'zh' ? '已完成' : 'Completed'}</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Play className="w-3 h-3 mr-1" /> {language === 'zh' ? '进行中' : 'In Progress'}</Badge>;
      case 'open': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> {language === 'zh' ? '待处理' : 'Open'}</Badge>;
      default: return null;
    }
  };

  const handleRefresh = () => {
    refetchProjects();
    refetchTasks();
    if (selectedProject) refetchGates();
  };

  const isLoading = projectsLoading;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  // Calculate stats from real data
  const stats = {
    totalProjects: projects?.length || 0,
    inProgress: projects?.filter((p: any) => p.status === 'in_progress').length || 0,
    openIssues: tasks?.filter((t: any) => t.status === 'open').length || 0,
    resolvedToday: tasks?.filter((t: any) => {
      const today = new Date().toISOString().split('T')[0];
      return t.status === 'completed' && t.updatedAt?.toString().startsWith(today);
    }).length || 0
  };

  // Build gate status from gates data
  const buildGateStatus = () => {
    const gateStatus: Record<string, { status: string; issues: number; resolved: number }> = {
      G1: { status: 'pending', issues: 0, resolved: 0 },
      G2: { status: 'pending', issues: 0, resolved: 0 },
      G3: { status: 'pending', issues: 0, resolved: 0 },
      G4: { status: 'pending', issues: 0, resolved: 0 },
    };
    
    gates?.forEach((gate: any) => {
      const gateKey = gate.gateCode;
      if (gateStatus[gateKey]) {
        gateStatus[gateKey] = {
          status: gate.status,
          issues: gate.issuesFound || 0,
          resolved: gate.issuesResolved || 0,
        };
      }
    });
    
    return gateStatus;
  };

  const gateStatus = buildGateStatus();

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Shield}
          title={language === 'zh' ? '红蓝对抗项目看板' : 'Red-Blue Adversarial Board'}
          description={language === 'zh' ? 'Tier1客户项目红蓝对抗交付管理，G1-G4门禁状态追踪' : 'Tier1 customer project red-blue adversarial delivery management'}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'zh' ? '刷新' : 'Refresh'}
              </Button>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[280px]"><SelectValue placeholder={language === 'zh' ? '选择项目' : 'Select Project'} /></SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{project.tier}</Badge><span>{project.name}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Layers} label={language === 'zh' ? '活跃项目' : 'Active Projects'} value={stats.totalProjects} />
          <StatCard icon={Play} label={language === 'zh' ? '对抗进行中' : 'In Progress'} value={stats.inProgress} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={ShieldAlert} label={language === 'zh' ? '待解决问题' : 'Open Issues'} value={stats.openIssues} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={ShieldCheck} label={language === 'zh' ? '今日解决' : 'Resolved Today'} value={stats.resolvedToday} iconColor="text-green-500" iconBg="bg-green-500/10" />
        </div>

        {currentProject && (
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2"><Badge className="bg-primary/20 text-primary border-primary/30">{currentProject.tier}</Badge>{currentProject.name}</CardTitle>
                  <CardDescription className="mt-1">{currentProject.customer} | {new Date(currentProject.startDate).toLocaleDateString()} → {new Date(currentProject.targetDate).toLocaleDateString()}</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center"><div className="text-sm text-muted-foreground">{language === 'zh' ? '红队负责人' : 'Red Team Lead'}</div><div className="font-medium text-red-400">{currentProject.redTeamLead || '-'}</div></div>
                  <div className="text-center"><div className="text-sm text-muted-foreground">{language === 'zh' ? '蓝队负责人' : 'Blue Team Lead'}</div><div className="font-medium text-blue-400">{currentProject.blueTeamLead || '-'}</div></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{language === 'zh' ? '整体进度' : 'Overall Progress'}</span><span className="font-medium">{currentProject.progress || 0}%</span></div><Progress value={currentProject.progress || 0} className="h-2" /></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {GATES.map((gate) => {
                  const gateData = gateStatus[gate.id] || { status: 'pending', issues: 0, resolved: 0 };
                  const isCurrentGate = currentProject.currentGate === gate.id;
                  return (
                    <Dialog key={gate.id}>
                      <DialogTrigger asChild>
                        <div className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${isCurrentGate ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-background/50 hover:border-primary/50'}`}>
                          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span className={`text-lg font-bold ${isCurrentGate ? 'text-primary' : ''}`}>{gate.id}</span>{isCurrentGate && <Zap className="w-4 h-4 text-primary animate-pulse" />}</div>{getGateStatusBadge(gateData.status)}</div>
                          <div className="text-sm font-medium mb-1">{language === 'zh' ? gate.name_zh : gate.name_en}</div>
                          <div className="text-xs text-muted-foreground mb-3">{language === 'zh' ? gate.description_zh : gate.description_en}</div>
                          {gateData.issues > 0 && <div className="flex items-center gap-2 text-xs"><span className="text-red-400">{gateData.issues - gateData.resolved} {language === 'zh' ? '待解决' : 'open'}</span><span className="text-muted-foreground">/</span><span className="text-green-400">{gateData.resolved} {language === 'zh' ? '已解决' : 'resolved'}</span></div>}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="text-xl font-bold">{gate.id}</span><span>{language === 'zh' ? gate.name_zh : gate.name_en}</span>{getGateStatusBadge(gateData.status)}</DialogTitle><DialogDescription>{language === 'zh' ? gate.description_zh : gate.description_en}</DialogDescription></DialogHeader>
                        <div className="py-4"><h4 className="font-medium mb-3">{language === 'zh' ? '检查点清单' : 'Checkpoint List'}</h4><div className="space-y-2">{gate.checkpoints.map((checkpoint, idx) => (<div key={checkpoint.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${gateData.status === 'passed' || (gateData.status === 'in_progress' && idx < 2) ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>{gateData.status === 'passed' || (gateData.status === 'in_progress' && idx < 2) ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{idx + 1}</span>}</div><span className="flex-1">{language === 'zh' ? checkpoint.name_zh : checkpoint.name_en}</span></div>))}</div></div>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="overview" className="flex items-center gap-2"><Target className="w-4 h-4" />{language === 'zh' ? '任务概览' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="red" className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-400" />{language === 'zh' ? '红队挑战' : 'Red Team'}</TabsTrigger>
            <TabsTrigger value="blue" className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-400" />{language === 'zh' ? '蓝队响应' : 'Blue Team'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-red-500/30">
                <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2 text-red-400"><ShieldAlert className="w-5 h-5" />{language === 'zh' ? '红队挑战任务' : 'Red Team Challenges'}</CardTitle></CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : (
                    <div className="space-y-3">
                      {tasks?.filter((t: any) => t.teamType === 'red').map((task: any) => (
                        <div key={task.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:border-red-500/40 transition-colors">
                          <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><div className="font-medium text-sm">{task.title}</div><div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><span>{task.gateCode}</span><span>•</span><span>{new Date(task.createdAt).toLocaleDateString()}</span></div></div><div className="flex items-center gap-2">{getPriorityBadge(task.priority)}{getTaskStatusBadge(task.status)}</div></div>
                        </div>
                      ))}
                      {(!tasks || tasks.filter((t: any) => t.teamType === 'red').length === 0) && <div className="text-center py-8 text-muted-foreground"><ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>{language === 'zh' ? '暂无红队挑战任务' : 'No red team challenges'}</p></div>}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-blue-500/30">
                <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2 text-blue-400"><ShieldCheck className="w-5 h-5" />{language === 'zh' ? '蓝队响应任务' : 'Blue Team Responses'}</CardTitle></CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : (
                    <div className="space-y-3">
                      {tasks?.filter((t: any) => t.teamType === 'blue').map((task: any) => (
                        <div key={task.id} className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 transition-colors">
                          <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><div className="font-medium text-sm">{task.title}</div><div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><span>{task.gateCode}</span><span>•</span><span>{new Date(task.createdAt).toLocaleDateString()}</span></div></div><div className="flex items-center gap-2">{getPriorityBadge(task.priority)}{getTaskStatusBadge(task.status)}</div></div>
                        </div>
                      ))}
                      {(!tasks || tasks.filter((t: any) => t.teamType === 'blue').length === 0) && <div className="text-center py-8 text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>{language === 'zh' ? '暂无蓝队响应任务' : 'No blue team responses'}</p></div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="red">
            <Card className="bg-card/50 border-border">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-400" />{language === 'zh' ? '所有红队挑战' : 'All Red Team Challenges'}</CardTitle><CardDescription>{language === 'zh' ? '红队模拟客户和不确定性，提出挑战和质疑' : 'Red team simulates customers and uncertainties'}</CardDescription></CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-3">
                    {tasks?.filter((t: any) => t.teamType === 'red').map((task: any) => {
                      const project = projects?.find((p: any) => p.id === task.projectId);
                      return (
                        <div key={task.id} className="p-4 rounded-lg border border-border bg-background/50 hover:border-red-500/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><div className="font-medium">{task.title}</div><div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><span>{project?.name}</span><span>•</span><span>{task.gateCode}</span><span>•</span><span>{new Date(task.createdAt).toLocaleDateString()}</span></div></div><div className="flex items-center gap-2">{getPriorityBadge(task.priority)}{getTaskStatusBadge(task.status)}<Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></div></div>
                        </div>
                      );
                    })}
                    {(!tasks || tasks.filter((t: any) => t.teamType === 'red').length === 0) && <div className="text-center py-8 text-muted-foreground"><ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>{language === 'zh' ? '暂无红队挑战任务' : 'No red team challenges'}</p></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blue">
            <Card className="bg-card/50 border-border">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-400" />{language === 'zh' ? '所有蓝队响应' : 'All Blue Team Responses'}</CardTitle><CardDescription>{language === 'zh' ? '蓝队只能依赖系统响应，验证系统能力' : 'Blue team can only rely on system responses'}</CardDescription></CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-3">
                    {tasks?.filter((t: any) => t.teamType === 'blue').map((task: any) => {
                      const project = projects?.find((p: any) => p.id === task.projectId);
                      return (
                        <div key={task.id} className="p-4 rounded-lg border border-border bg-background/50 hover:border-blue-500/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1 min-w-0"><div className="font-medium">{task.title}</div><div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><span>{project?.name}</span><span>•</span><span>{task.gateCode}</span><span>•</span><span>{new Date(task.createdAt).toLocaleDateString()}</span></div></div><div className="flex items-center gap-2">{getPriorityBadge(task.priority)}{getTaskStatusBadge(task.status)}<Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></div></div>
                        </div>
                      );
                    })}
                    {(!tasks || tasks.filter((t: any) => t.teamType === 'blue').length === 0) && <div className="text-center py-8 text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>{language === 'zh' ? '暂无蓝队响应任务' : 'No blue team responses'}</p></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
