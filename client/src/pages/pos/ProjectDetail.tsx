import { useState, useEffect } from "react";
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
  X, Plus, Trash2, Upload, Download, History, Paperclip, Home
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
  IN_PROGRESS: 'bg-blue-500',
  PENDING_REVIEW: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  BLOCKED: 'bg-red-500',
};

const stageStatusLabels: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  PENDING_REVIEW: '待评审',
  APPROVED: '已完成',
  BLOCKED: '已阻塞',
};

const taskStatusOptions = [
  { value: 'PENDING', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'BLOCKED', label: '已阻塞' },
];

// 模拟任务数据
const mockTasks = [
  { id: 1, name: '需求文档编写', owner: '张三', plannedDate: '2025-02-10', status: 'IN_PROGRESS' },
  { id: 2, name: '技术方案评审', owner: '李四', plannedDate: '2025-02-15', status: 'PENDING' },
  { id: 3, name: '客户沟通确认', owner: '王五', plannedDate: '2025-02-12', status: 'COMPLETED' },
];

// 模拟输出物数据
const mockOutputs = [
  { id: 1, name: '技术方案书', version: 'v1.2', uploadDate: '2025-02-08', uploader: '张三', fileSize: '2.5MB' },
  { id: 2, name: '报价单', version: 'v2.0', uploadDate: '2025-02-09', uploader: '李四', fileSize: '1.2MB' },
];

// 模拟团队成员
const teamMembers = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];

export default function POSProjectDetail() {
  const [, params] = useRoute('/pos/projects/:id');
  const projectId = (params as any)?.id ? parseInt((params as any).id) : 0;
  const [activeStage, setActiveStage] = useState('M2');
  
  // 快速编辑状态
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [stageOwner, setStageOwner] = useState('张三');
  const [stagePlanStart, setStagePlanStart] = useState('2025-02-01');
  const [stagePlanEnd, setStagePlanEnd] = useState('2025-02-28');
  
  // 任务编辑状态
  const [tasks, setTasks] = useState(mockTasks);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', owner: '', plannedDate: '', status: 'PENDING' });
  
  // 输出物/附件状态
  const [outputs, setOutputs] = useState(mockOutputs);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<any>(null);
  const [newOutput, setNewOutput] = useState({ name: '', file: null as File | null });

  const { data: project } = trpc.pos.project.getById.useQuery({ id: projectId });
  const { data: stages } = trpc.pos.project.getStages.useQuery({ projectId });

  const currentStageIndex = STAGES.findIndex(s => s.code === (project?.currentStage || 'M0'));

  // 保存阶段快速编辑
  const handleSaveStageEdit = () => {
    toast.success('阶段信息已更新');
    setIsEditingStage(false);
  };

  // 更新任务
  const handleUpdateTask = (taskId: number, field: string, value: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, [field]: value } : t
    ));
  };

  // 保存任务编辑
  const handleSaveTask = (taskId: number) => {
    toast.success('任务已更新');
    setEditingTaskId(null);
  };

  // 添加新任务
  const handleAddTask = () => {
    if (!newTask.name || !newTask.owner || !newTask.plannedDate) {
      toast.error('请填写完整任务信息');
      return;
    }
    const newId = Math.max(...tasks.map(t => t.id)) + 1;
    setTasks(prev => [...prev, { ...newTask, id: newId }]);
    setNewTask({ name: '', owner: '', plannedDate: '', status: 'PENDING' });
    setShowAddTask(false);
    toast.success('任务已添加');
  };

  // 删除任务
  const handleDeleteTask = (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('任务已删除');
  };

  // 上传附件
  const handleUploadOutput = () => {
    if (!newOutput.name) {
      toast.error('请填写文件名称');
      return;
    }
    const newId = Math.max(...outputs.map(o => o.id)) + 1;
    setOutputs(prev => [...prev, {
      id: newId,
      name: newOutput.name,
      version: 'v1.0',
      uploadDate: new Date().toISOString().split('T')[0],
      uploader: '当前用户',
      fileSize: '1.0MB'
    }]);
    setNewOutput({ name: '', file: null });
    setShowUploadDialog(false);
    toast.success('文件已上传');
  };

  // 版本历史数据
  const versionHistory = [
    { version: 'v1.2', date: '2025-02-08', uploader: '张三', changes: '更新了技术参数' },
    { version: 'v1.1', date: '2025-02-05', uploader: '张三', changes: '添加了工艺流程图' },
    { version: 'v1.0', date: '2025-02-01', uploader: '李四', changes: '初始版本' },
  ];

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
          首页
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/dashboard" className="hover:text-foreground transition-colors">POS管理</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/pos/projects" className="hover:text-foreground transition-colors">项目管理</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{project?.projectName || '项目详情'}</span>
      </nav>

      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Link href="/pos/projects">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />返回列表</Button>
        </Link>
      </div>

      <PageHeader
        icon={FileText}
        title={project?.projectName || '项目详情'}
        description={project?.projectCode || 'GRT-XXX'}
        actions={<Button variant="outline"><Settings className="w-4 h-4 mr-2" />项目设置</Button>}
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

      {/* M0-M12 列车式时间轴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            项目阶段时间轴
          </CardTitle>
          <CardDescription>M0-M12 全生命周期管理</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 时间轴轨道 */}
          <div className="relative">
            <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full"></div>
            <div 
              className="absolute top-6 left-0 h-1 bg-primary rounded-full transition-all"
              style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
            ></div>
            
            {/* 阶段节点 */}
            <div className="relative flex justify-between">
              {STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const stageData = stages?.find((s: any) => s.stageCode === stage.code);
                
                return (
                  <div 
                    key={stage.code}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => setActiveStage(stage.code)}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all
                      ${isCompleted ? 'bg-green-500 text-white' : 
                        isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' : 
                        'bg-muted text-muted-foreground'}
                      ${activeStage === stage.code ? 'scale-110' : ''}
                      group-hover:scale-105
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                       isCurrent ? <Play className="w-5 h-5" /> :
                       <Circle className="w-5 h-5" />}
                    </div>
                    <span className={`mt-2 text-xs font-mono ${activeStage === stage.code ? 'font-bold text-primary' : ''}`}>
                      {stage.code}
                    </span>
                    <span className={`text-[10px] text-muted-foreground max-w-[60px] text-center truncate ${activeStage === stage.code ? 'font-medium' : ''}`}>
                      {stage.name}
                    </span>
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
              {/* 快速编辑按钮 */}
              {!isEditingStage ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditingStage(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />快速编辑
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingStage(false)}>
                    <X className="w-4 h-4 mr-1" />取消
                  </Button>
                  <Button size="sm" onClick={handleSaveStageEdit}>
                    <Save className="w-4 h-4 mr-1" />保存
                  </Button>
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
          
          {/* 快速编辑区域 */}
          {isEditingStage && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">阶段负责人</label>
                  <Select value={stageOwner} onValueChange={setStageOwner}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">计划开始</label>
                  <Input 
                    type="date" 
                    value={stagePlanStart} 
                    onChange={e => setStagePlanStart(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">计划结束</label>
                  <Input 
                    type="date" 
                    value={stagePlanEnd} 
                    onChange={e => setStagePlanEnd(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="inputs">输入物</TabsTrigger>
              <TabsTrigger value="outputs">输出物</TabsTrigger>
              <TabsTrigger value="tasks">任务</TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                文档智能
              </TabsTrigger>
            </TabsList>
            
            {/* 概览 */}
            <TabsContent value="overview" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">阶段状态</p>
                  <Badge className="mt-1">{stageStatusLabels['IN_PROGRESS']}</Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">完成进度</p>
                  <div className="mt-2"><Progress value={35} /></div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">计划开始</p>
                  <p className="font-medium mt-1">{stagePlanStart}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">计划结束</p>
                  <p className="font-medium mt-1">{stagePlanEnd}</p>
                </div>
              </div>
            </TabsContent>
            
            {/* 输入物 */}
            <TabsContent value="inputs" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">暂无输入物</div>
            </TabsContent>
            
            {/* 输出物（附件版本管理） */}
            <TabsContent value="outputs" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">阶段输出物</h4>
                <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-1" />上传文件
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名称</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>上传日期</TableHead>
                    <TableHead>上传人</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outputs.map(output => (
                    <TableRow key={output.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          {output.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{output.version}</Badge>
                      </TableCell>
                      <TableCell>{output.uploadDate}</TableCell>
                      <TableCell>{output.uploader}</TableCell>
                      <TableCell>{output.fileSize}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedOutput(output);
                              setShowVersionHistory(true);
                            }}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            {/* 任务（快速编辑） */}
            <TabsContent value="tasks" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">阶段任务</h4>
                <Button size="sm" onClick={() => setShowAddTask(true)}>
                  <Plus className="w-4 h-4 mr-1" />添加任务
                </Button>
              </div>
              
              {/* 添加任务行 */}
              {showAddTask && (
                <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-dashed">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-2">
                      <Input 
                        placeholder="任务名称" 
                        value={newTask.name}
                        onChange={e => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <Select 
                      value={newTask.owner} 
                      onValueChange={v => setNewTask(prev => ({ ...prev, owner: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="负责人" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      type="date" 
                      value={newTask.plannedDate}
                      onChange={e => setNewTask(prev => ({ ...prev, plannedDate: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddTask}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddTask(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务名称</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>计划日期</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        {editingTaskId === task.id ? (
                          <Input 
                            value={task.name}
                            onChange={e => handleUpdateTask(task.id, 'name', e.target.value)}
                          />
                        ) : (
                          <span className="font-medium">{task.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTaskId === task.id ? (
                          <Select 
                            value={task.owner}
                            onValueChange={v => handleUpdateTask(task.id, 'owner', v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          task.owner
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTaskId === task.id ? (
                          <Input 
                            type="date"
                            value={task.plannedDate}
                            onChange={e => handleUpdateTask(task.id, 'plannedDate', e.target.value)}
                            className="w-[140px]"
                          />
                        ) : (
                          task.plannedDate
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTaskId === task.id ? (
                          <Select 
                            value={task.status}
                            onValueChange={v => handleUpdateTask(task.id, 'status', v)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {taskStatusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={task.status === 'COMPLETED' ? 'default' : 'outline'}>
                            {taskStatusOptions.find(o => o.value === task.status)?.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingTaskId === task.id ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => handleSaveTask(task.id)}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingTaskId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingTaskId(task.id)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* 文档智能 Tab */}
            <TabsContent value="documents" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {activeStage} 阶段文档管理
                </h3>
                <DocumentSearchDialog
                  projectId={projectId}
                  stageCode={activeStage}
                />
              </div>

              {/* 文档完备性全览 */}
              <ProjectDocumentOverview
                projectId={projectId}
                currentStage={activeStage}
                onStageClick={(code) => setActiveStage(code)}
              />

              {/* AI推荐面板 */}
              <DocumentRecommendationPanel
                projectId={projectId}
                stageCode={activeStage}
              />

              {/* 文档检查清单 */}
              <StageDocumentChecklist
                projectId={projectId}
                stageCode={activeStage}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 上传文件对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传输出物</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">文件名称</label>
              <Input 
                placeholder="输入文件名称"
                value={newOutput.name}
                onChange={e => setNewOutput(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">选择文件</label>
              <Input 
                type="file"
                onChange={e => setNewOutput(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">版本说明</label>
              <Textarea placeholder="描述本次上传的变更内容..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>取消</Button>
            <Button onClick={handleUploadOutput}>上传</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本历史对话框 */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>版本历史 - {selectedOutput?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>版本</TableHead>
                  <TableHead>上传日期</TableHead>
                  <TableHead>上传人</TableHead>
                  <TableHead>变更说明</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versionHistory.map((v, i) => (
                  <TableRow key={v.version}>
                    <TableCell>
                      <Badge variant={i === 0 ? 'default' : 'outline'}>{v.version}</Badge>
                      {i === 0 && <span className="ml-2 text-xs text-muted-foreground">当前</span>}
                    </TableCell>
                    <TableCell>{v.date}</TableCell>
                    <TableCell>{v.uploader}</TableCell>
                    <TableCell>{v.changes}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        {i !== 0 && (
                          <Button variant="ghost" size="sm">
                            <History className="w-4 h-4" />回滚
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
