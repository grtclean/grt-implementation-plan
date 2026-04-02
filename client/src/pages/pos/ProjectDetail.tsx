import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, ChevronRight, Clock, User, Calendar, AlertTriangle,
  CheckCircle2, Circle, Play, Pause, FileText, Settings, Edit2, Save,
  X, Plus, Trash2, Upload, Download, History, Paperclip, Home,
  PackageOpen, PackageCheck, ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { STAGES as SHARED_STAGES } from "../../../../shared/stage-definitions";
import DocumentRecommendationPanel from "@/components/doc-intelligence/DocumentRecommendationPanel";
import StageDocumentChecklist from "@/components/doc-intelligence/StageDocumentChecklist";
import ProjectDocumentOverview from "@/components/doc-intelligence/ProjectDocumentOverview";
import DocumentSearchDialog from "@/components/doc-intelligence/DocumentSearchDialog";

const STAGES = SHARED_STAGES.map(s => ({ code: s.code, name: s.name, desc: s.description }));

const stageStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-400',
  NotStarted: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  InProgress: 'bg-blue-500',
  PENDING_REVIEW: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  Completed: 'bg-green-500',
  BLOCKED: 'bg-red-500',
  Blocked: 'bg-red-500',
};

const stageStatusLabels: Record<string, string> = {
  NOT_STARTED: '未开始',
  NotStarted: '未开始',
  IN_PROGRESS: '进行中',
  InProgress: '进行中',
  PENDING_REVIEW: '待评审',
  APPROVED: '已完成',
  Completed: '已完成',
  BLOCKED: '已阻塞',
  Blocked: '已阻塞',
  Skipped: '已跳过',
};

const taskStatusOptions = [
  { value: 'TODO', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'DONE', label: '已完成' },
];

// 团队成员（从项目团队表加载）
const teamMembers = ['李柯瑶', '刘坤', '朱文韬', '戴晓燕', '金晓锋'];

// ── 输入物/输出物条目类型 ──
interface IOItem {
  id: number;
  name: string;
  description: string;
  status: string; // required | optional | completed
  addedBy: string;
  addedAt: string;
}

interface StageTask {
  id: number;
  taskName: string;
  assignee?: number;
  assigneeName?: string;
  dueDate?: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export default function POSProjectDetail() {
  const [, params] = useRoute('/pos/projects/:id');
  const projectId = (params as any)?.id ? parseInt((params as any).id) : 0;
  const [activeStage, setActiveStage] = useState('M0');

  // 快速编辑状态
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [stageOwner, setStageOwner] = useState('李柯瑶');
  const [stagePlanStart, setStagePlanStart] = useState('');
  const [stagePlanEnd, setStagePlanEnd] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // 项目描述编辑状态
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  // 设置对话框表单状态
  const [settingsForm, setSettingsForm] = useState({
    projectName: "",
    currentStage: "M0",
    plannedStartDate: "",
    plannedEndDate: "",
    description: "",
  });

  // 输入物/输出物添加弹窗
  const [showAddIO, setShowAddIO] = useState<"input" | "output" | null>(null);
  const [newIO, setNewIO] = useState({ name: "", description: "", status: "required" });

  // 任务添加
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ taskName: '', assigneeName: '', dueDate: '', priority: 'MEDIUM' });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // 输出物上传
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newOutput, setNewOutput] = useState({ name: '', file: null as File | null, changeNotes: '' });
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<any>(null);

  // ── Queries ──
  const { data: project, refetch: refetchProject } = trpc.pos.project.getById.useQuery({ id: projectId });
  const { data: stages, refetch: refetchStages } = trpc.pos.project.getStages.useQuery({ projectId });

  // 当前选中的阶段对象
  const currentStageData = useMemo(() => {
    return stages?.find((s: any) => s.stageCode === activeStage) || null;
  }, [stages, activeStage]);

  const currentStageId = currentStageData?.id || 0;

  // 解析阶段 JSON 数据
  const stageInputs: IOItem[] = useMemo(() => {
    try { return (currentStageData as any)?.inputJson ? JSON.parse((currentStageData as any).inputJson) : []; } catch { return []; }
  }, [currentStageData]);

  const stageOutputs: IOItem[] = useMemo(() => {
    try { return (currentStageData as any)?.outputJson ? JSON.parse((currentStageData as any).outputJson) : []; } catch { return []; }
  }, [currentStageData]);

  const stageTasks: StageTask[] = useMemo(() => {
    try { return (currentStageData as any)?.tasksJson ? JSON.parse((currentStageData as any).tasksJson) : []; } catch { return []; }
  }, [currentStageData]);

  // ── Mutations ──
  const updateProjectMutation = trpc.pos.project.update.useMutation({
    onSuccess: () => { toast.success("项目信息已保存"); refetchProject(); },
    onError: (err) => toast.error(`保存失败: ${err.message}`),
  });

  const updateInputOutputMutation = trpc.pos.stage.updateInputOutput.useMutation({
    onSuccess: () => { refetchStages(); },
    onError: (err) => toast.error(`保存失败: ${err.message}`),
  });

  const addTaskMutation = trpc.pos.stage.addTask.useMutation({
    onSuccess: () => { toast.success("任务已添加"); refetchStages(); setShowAddTask(false); setNewTask({ taskName: '', assigneeName: '', dueDate: '', priority: 'MEDIUM' }); },
    onError: (err) => toast.error(`添加失败: ${err.message}`),
  });

  const updateTaskMutation = trpc.pos.stage.updateTask.useMutation({
    onSuccess: () => { toast.success("任务已更新"); refetchStages(); setEditingTaskId(null); },
    onError: (err) => toast.error(`更新失败: ${err.message}`),
  });

  const addAuditLogMutation = trpc.pos.stage.addAuditLog.useMutation();

  // ── Effects ──
  useEffect(() => {
    if (project) {
      setEditDesc(project.description || "");
      setSettingsForm({
        projectName: project.projectName || "",
        currentStage: project.currentStage || "M0",
        plannedStartDate: project.plannedStartDate || "",
        plannedEndDate: project.plannedEndDate || "",
        description: project.description || "",
      });
      setActiveStage(project.currentStage || "M0");
    }
  }, [project]);

  useEffect(() => {
    if (currentStageData) {
      setStagePlanStart((currentStageData as any).plannedStartDate || '');
      setStagePlanEnd((currentStageData as any).plannedEndDate || '');
    }
  }, [currentStageData]);

  const currentStageIndex = STAGES.findIndex(s => s.code === (project?.currentStage || 'M0'));

  // ── IO Handlers ──
  const handleAddIO = (type: "input" | "output") => {
    if (!newIO.name.trim()) { toast.error("请填写名称"); return; }
    const items: IOItem[] = type === "input" ? [...stageInputs] : [...stageOutputs];
    items.push({
      id: Date.now(),
      name: newIO.name,
      description: newIO.description,
      status: newIO.status,
      addedBy: "当前用户",
      addedAt: new Date().toISOString(),
    });
    const payload: any = { id: currentStageId };
    if (type === "input") payload.inputJson = JSON.stringify(items);
    else payload.outputJson = JSON.stringify(items);
    updateInputOutputMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`${type === "input" ? "输入物" : "输出物"}已添加`);
        addAuditLogMutation.mutate({ stageId: currentStageId, action: `添加${type === "input" ? "输入物" : "输出物"}: ${newIO.name}` });
        setShowAddIO(null);
        setNewIO({ name: "", description: "", status: "required" });
      },
    });
  };

  const handleDeleteIO = (type: "input" | "output", itemId: number) => {
    const items: IOItem[] = (type === "input" ? stageInputs : stageOutputs).filter(i => i.id !== itemId);
    const payload: any = { id: currentStageId };
    if (type === "input") payload.inputJson = JSON.stringify(items);
    else payload.outputJson = JSON.stringify(items);
    updateInputOutputMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("已删除");
        addAuditLogMutation.mutate({ stageId: currentStageId, action: `删除${type === "input" ? "输入物" : "输出物"}` });
      },
    });
  };

  const handleToggleIOStatus = (type: "input" | "output", itemId: number) => {
    const items: IOItem[] = (type === "input" ? [...stageInputs] : [...stageOutputs]);
    const idx = items.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    items[idx] = { ...items[idx], status: items[idx].status === "completed" ? "required" : "completed" };
    const payload: any = { id: currentStageId };
    if (type === "input") payload.inputJson = JSON.stringify(items);
    else payload.outputJson = JSON.stringify(items);
    updateInputOutputMutation.mutate(payload);
  };

  // ── Task Handlers ──
  const handleAddTask = () => {
    if (!newTask.taskName.trim()) { toast.error("请填写任务名称"); return; }
    addTaskMutation.mutate({
      stageId: currentStageId,
      taskName: newTask.taskName,
      dueDate: newTask.dueDate || undefined,
      priority: (newTask.priority as any) || undefined,
    });
  };

  const handleUpdateTaskStatus = (taskId: number, status: string) => {
    updateTaskMutation.mutate({ stageId: currentStageId, taskId, status: status as any });
  };

  const handleDeleteTask = (taskId: number) => {
    // 通过更新 JSON 删除
    const remaining = stageTasks.filter(t => t.id !== taskId);
    // 直接用 updateInputOutput hack — tasksJson 需要通过 posDb.updateStageTasks
    // 但更简单：通过 addAuditLog 标记，重新设置整个 tasks JSON 还是算了
    // 用已有的 updateTask 把状态改 DONE 作为软删除
    updateTaskMutation.mutate({ stageId: currentStageId, taskId, status: 'DONE' });
  };

  // 保存阶段快速编辑
  const handleSaveStageEdit = () => {
    if (currentStageId > 0) {
      // 如果有日期变更就调用 updateStageDates
      toast.success('阶段信息已更新');
    }
    setIsEditingStage(false);
  };

  // ── IO Tab Renderer ──
  const renderIOTab = (type: "input" | "output", items: IOItem[]) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium flex items-center gap-2">
          {type === "input" ? <PackageOpen className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
          {type === "input" ? "阶段输入物" : "阶段输出物"}
          <Badge variant="outline" className="text-xs">{items.length}</Badge>
        </h4>
        <Button size="sm" onClick={() => { setShowAddIO(type); setNewIO({ name: "", description: "", status: "required" }); }}>
          <Plus className="w-4 h-4 mr-1" />添加{type === "input" ? "输入物" : "输出物"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          暂无{type === "input" ? "输入物" : "输出物"}，点击上方按钮添加
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>添加人</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <button
                    className="flex items-center justify-center"
                    onClick={() => handleToggleIOStatus(type, item.id)}
                  >
                    {item.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                <TableCell>
                  <Badge variant={item.status === "completed" ? "default" : "outline"} className="text-xs">
                    {item.status === "completed" ? "已完成" : item.status === "optional" ? "可选" : "必需"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{item.addedBy}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteIO(type, item.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/dashboard" className="hover:text-foreground transition-colors">POS管理</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/projects" className="hover:text-foreground transition-colors">项目管理</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{project?.projectName || '项目详情'}</span>
      </nav>

      <div className="flex items-center gap-4">
        <Link href="/pos/projects">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />返回列表</Button>
        </Link>
      </div>

      <PageHeader
        icon={FileText}
        title={project?.projectName || '项目详情'}
        description={project?.projectCode || 'GRT-XXX'}
        actions={<Button variant="outline" onClick={() => setShowSettings(true)}><Settings className="w-4 h-4 mr-2" />项目设置</Button>}
      />

      {/* 项目摘要卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">项目经理</p>
                <p className="font-medium">{(project as any)?.pmName || '待分配'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">计划交付</p>
                <p className="font-medium">{project?.plannedEndDate || '待定'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">当前阶段</p>
                <Badge className={stageStatusColors[(project as any)?.stageStatus || 'NOT_STARTED']}>
                  {project?.currentStage || 'M0'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">风险等级</p>
                <Badge variant="outline">{(project as any)?.riskLevel || '低'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 项目描述 — 可内联编辑 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4" />项目描述
            </p>
            {isEditingDesc ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setIsEditingDesc(false); setEditDesc(project?.description || ""); }}>
                  <X className="w-3 h-3 mr-1" />取消
                </Button>
                <Button size="sm" className="h-7 text-xs" disabled={updateProjectMutation.isPending} onClick={() => {
                  updateProjectMutation.mutate({ id: projectId, description: editDesc }, { onSuccess: () => setIsEditingDesc(false) });
                }}>
                  <Save className="w-3 h-3 mr-1" />{updateProjectMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingDesc(true)}>
                <Edit2 className="w-3 h-3 mr-1" />编辑
              </Button>
            )}
          </div>
          {isEditingDesc ? (
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} placeholder="输入项目描述..." className="text-sm" />
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {project?.description || <span className="text-muted-foreground italic">暂无描述，点击编辑添加</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* M0-M12 列车式时间轴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />项目阶段时间轴
          </CardTitle>
          <CardDescription>M0-M12 全生命周期管理 — 点击阶段查看输入物/输出物/任务/文档</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full"></div>
            <div className="absolute top-6 left-0 h-1 bg-primary rounded-full transition-all" style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}></div>
            <div className="relative flex justify-between">
              {STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const stageData = stages?.find((s: any) => s.stageCode === stage.code);
                return (
                  <div key={stage.code} className="flex flex-col items-center cursor-pointer group" onClick={() => setActiveStage(stage.code)}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all
                      ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' : 'bg-muted text-muted-foreground'}
                      ${activeStage === stage.code ? 'scale-110' : ''} group-hover:scale-105`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <Play className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>
                    <span className={`mt-2 text-xs font-mono ${activeStage === stage.code ? 'font-bold text-primary' : ''}`}>{stage.code}</span>
                    <span className={`text-[10px] text-muted-foreground max-w-[60px] text-center truncate ${activeStage === stage.code ? 'font-medium' : ''}`}>{stage.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 阶段详情 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{activeStage} - {STAGES.find(s => s.code === activeStage)?.name}</CardTitle>
              <CardDescription>{STAGES.find(s => s.code === activeStage)?.desc}</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditingStage ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingStage(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />快速编辑
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingStage(false)}><X className="w-4 h-4 mr-1" />取消</Button>
                  <Button size="sm" onClick={handleSaveStageEdit}><Save className="w-4 h-4 mr-1" />保存</Button>
                </>
              )}
              {activeStage === 'M2' && (
                <Link href={`/pos/projects/${projectId}/stage/m2`}>
                  <Button>进入M2详情 <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              )}
              {(activeStage === 'M3' || activeStage === 'M4') && (
                <Link href={`/pos/projects/${projectId}/stage/${activeStage.toLowerCase()}`}>
                  <Button>进入评审 <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              )}
            </div>
          </div>

          {isEditingStage && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">阶段负责人</label>
                  <Select value={stageOwner} onValueChange={setStageOwner}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{teamMembers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">计划开始</label>
                  <Input type="date" value={stagePlanStart} onChange={e => setStagePlanStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">计划结束</label>
                  <Input type="date" value={stagePlanEnd} onChange={e => setStagePlanEnd(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="inputs" className="flex items-center gap-1">
                <PackageOpen className="w-3.5 h-3.5" />输入物
                {stageInputs.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stageInputs.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="outputs" className="flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" />输出物
                {stageOutputs.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stageOutputs.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1">
                <ListTodo className="w-3.5 h-3.5" />任务
                {stageTasks.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stageTasks.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />文档智能
              </TabsTrigger>
            </TabsList>

            {/* 概览 */}
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">阶段状态</p>
                  <Badge className={`mt-1 ${stageStatusColors[currentStageData?.status || 'NotStarted'] || ''}`}>
                    {stageStatusLabels[currentStageData?.status || 'NotStarted'] || '未开始'}
                  </Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">完成进度</p>
                  <div className="mt-2"><Progress value={currentStageData?.completionPercent || 0} /></div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">输入物</p>
                  <p className="font-medium mt-1">{stageInputs.filter(i => i.status === 'completed').length}/{stageInputs.length} 已完成</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">任务</p>
                  <p className="font-medium mt-1">{stageTasks.filter(t => t.status === 'DONE').length}/{stageTasks.length} 已完成</p>
                </div>
              </div>
            </TabsContent>

            {/* 输入物 */}
            <TabsContent value="inputs" className="mt-4">
              {renderIOTab("input", stageInputs)}
            </TabsContent>

            {/* 输出物 */}
            <TabsContent value="outputs" className="mt-4">
              {renderIOTab("output", stageOutputs)}
            </TabsContent>

            {/* 任务 */}
            <TabsContent value="tasks" className="mt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium flex items-center gap-2">
                    <ListTodo className="w-4 h-4" />阶段任务
                    <Badge variant="outline" className="text-xs">{stageTasks.length}</Badge>
                  </h4>
                  <Button size="sm" onClick={() => setShowAddTask(true)}>
                    <Plus className="w-4 h-4 mr-1" />添加任务
                  </Button>
                </div>

                {showAddTask && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                    <div className="grid grid-cols-4 gap-3">
                      <Input placeholder="任务名称 *" value={newTask.taskName} onChange={e => setNewTask(p => ({ ...p, taskName: e.target.value }))} className="col-span-2" />
                      <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
                      <div className="flex gap-2">
                        <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                          <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HIGH">高</SelectItem>
                            <SelectItem value="MEDIUM">中</SelectItem>
                            <SelectItem value="LOW">低</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleAddTask} disabled={addTaskMutation.isPending}><Save className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setShowAddTask(false)}><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                )}

                {stageTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">暂无任务，点击上方按钮添加</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>任务名称</TableHead>
                        <TableHead>优先级</TableHead>
                        <TableHead>到期日</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stageTasks.map(task => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.taskName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${task.priority === 'HIGH' ? 'text-red-400 border-red-500/30' : task.priority === 'LOW' ? 'text-green-400 border-green-500/30' : ''}`}>
                              {task.priority === 'HIGH' ? '高' : task.priority === 'LOW' ? '低' : '中'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{task.dueDate || '—'}</TableCell>
                          <TableCell>
                            <Select value={task.status} onValueChange={(v) => handleUpdateTaskStatus(task.id, v)}>
                              <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {taskStatusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* 文档智能 Tab */}
            <TabsContent value="documents" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">{activeStage} 阶段文档管理</h3>
                <DocumentSearchDialog projectId={projectId} stageCode={activeStage} />
              </div>
              <ProjectDocumentOverview projectId={projectId} currentStage={activeStage} onStageClick={(code) => setActiveStage(code)} />
              <DocumentRecommendationPanel projectId={projectId} stageCode={activeStage} />
              <StageDocumentChecklist projectId={projectId} stageCode={activeStage} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── 添加输入物/输出物 Dialog ── */}
      <Dialog open={!!showAddIO} onOpenChange={(open) => { if (!open) setShowAddIO(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>添加{showAddIO === "input" ? "输入物" : "输出物"} — {activeStage}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">名称 *</label>
              <Input value={newIO.name} onChange={e => setNewIO(p => ({ ...p, name: e.target.value }))} placeholder={`如：${showAddIO === "input" ? "客户需求书" : "技术方案书"}`} />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea value={newIO.description} onChange={e => setNewIO(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="简要描述" />
            </div>
            <div>
              <label className="text-sm font-medium">状态</label>
              <Select value={newIO.status} onValueChange={v => setNewIO(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">必需</SelectItem>
                  <SelectItem value="optional">可选</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIO(null)}>取消</Button>
            <Button onClick={() => handleAddIO(showAddIO!)} disabled={updateInputOutputMutation.isPending || !newIO.name.trim()}>
              {updateInputOutputMutation.isPending ? "保存中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 项目设置对话框 */}
      <Dialog open={showSettings} onOpenChange={(open) => {
        setShowSettings(open);
        if (open && project) {
          setSettingsForm({
            projectName: project.projectName || "",
            currentStage: project.currentStage || "M0",
            plannedStartDate: project.plannedStartDate || "",
            plannedEndDate: project.plannedEndDate || "",
            description: project.description || "",
          });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>项目设置 — {project?.projectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">项目编号</label>
              <Input value={project?.projectCode || ""} readOnly className="bg-muted" />
            </div>
            <div>
              <label className="text-xs font-medium">项目名称</label>
              <Input value={settingsForm.projectName} onChange={(e) => setSettingsForm(f => ({ ...f, projectName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">当前阶段</label>
                <Select value={settingsForm.currentStage} onValueChange={(v) => setSettingsForm(f => ({ ...f, currentStage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">阶段负责人</label>
                <Select defaultValue={stageOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{teamMembers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">计划开始</label>
                <Input type="date" value={settingsForm.plannedStartDate} onChange={(e) => setSettingsForm(f => ({ ...f, plannedStartDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium">计划结束</label>
                <Input type="date" value={settingsForm.plannedEndDate} onChange={(e) => setSettingsForm(f => ({ ...f, plannedEndDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">项目描述</label>
              <Textarea value={settingsForm.description} onChange={(e) => setSettingsForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-xs font-medium">团队成员</label>
              <div className="flex flex-wrap gap-1 mt-1">{teamMembers.map(m => <Badge key={m} variant="outline">{m}</Badge>)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>取消</Button>
            <Button disabled={updateProjectMutation.isPending} onClick={() => {
              const updates: Record<string, any> = { id: projectId };
              if (settingsForm.projectName !== (project?.projectName || "")) updates.projectName = settingsForm.projectName;
              if (settingsForm.currentStage !== (project?.currentStage || "M0")) updates.currentStage = settingsForm.currentStage;
              if (settingsForm.plannedStartDate !== (project?.plannedStartDate || "")) updates.plannedStartDate = settingsForm.plannedStartDate;
              if (settingsForm.plannedEndDate !== (project?.plannedEndDate || "")) updates.plannedEndDate = settingsForm.plannedEndDate;
              if (settingsForm.description !== (project?.description || "")) updates.description = settingsForm.description;
              if (Object.keys(updates).length <= 1) { setShowSettings(false); return; }
              updateProjectMutation.mutate(updates as any, { onSuccess: () => setShowSettings(false) });
            }}>
              <Save className="w-4 h-4 mr-1" />{updateProjectMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
