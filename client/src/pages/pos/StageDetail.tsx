import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Upload, 
  Download, 
  MessageSquare, 
  History, 
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Send,
  User,
  Calendar,
  Target
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

// 阶段配置信息
const STAGE_CONFIG: Record<string, { name: string; description: string; inputs: string[]; outputs: string[]; keyActivities: string[] }> = {
  M0: {
    name: "立项启动",
    description: "项目立项审批，确定项目范围、目标和资源",
    inputs: ["客户需求文档", "初步报价", "项目可行性分析"],
    outputs: ["项目立项报告", "项目章程", "初步项目计划"],
    keyActivities: ["需求初步评估", "资源可用性确认", "风险初步识别", "立项审批会议"]
  },
  M1: {
    name: "需求调研",
    description: "深入了解客户需求，形成详细需求规格书",
    inputs: ["项目立项报告", "客户访谈记录", "现场调研资料"],
    outputs: ["需求规格书", "需求追踪矩阵", "技术可行性报告"],
    keyActivities: ["客户访谈", "现场调研", "需求分析", "需求评审"]
  },
  M2: {
    name: "方案设计",
    description: "制定技术方案，进行AI辅助设计和版本规划",
    inputs: ["需求规格书", "技术可行性报告", "历史项目参考"],
    outputs: ["技术方案", "系统架构图", "AI版本建议", "初步BOM清单"],
    keyActivities: ["方案设计", "AI版本生成", "相似项目分析", "方案内部评审"]
  },
  M3: {
    name: "项目评审",
    description: "项目方案评审，确定最终技术路线和预算",
    inputs: ["技术方案", "BOM清单", "项目计划"],
    outputs: ["评审通过报告", "最终报价", "合同草案"],
    keyActivities: ["技术评审", "商务评审", "风险评审", "客户确认"]
  },
  M4: {
    name: "设计冻结",
    description: "冻结设计基线，启动详细设计",
    inputs: ["评审通过报告", "客户确认函", "合同"],
    outputs: ["设计冻结报告", "设计基线", "变更控制流程"],
    keyActivities: ["设计基线确认", "变更流程建立", "配置管理启动"]
  },
  M5: {
    name: "详细设计",
    description: "完成详细设计，输出生产图纸和工艺文件",
    inputs: ["设计基线", "技术方案", "BOM清单"],
    outputs: ["详细设计图纸", "工艺文件", "最终BOM", "采购清单"],
    keyActivities: ["详细设计", "图纸审核", "工艺编制", "设计评审"]
  },
  M6: {
    name: "采购准备",
    description: "采购物料，准备生产资源",
    inputs: ["采购清单", "供应商信息", "交期要求"],
    outputs: ["采购订单", "物料到货计划", "供应商确认"],
    keyActivities: ["供应商选择", "采购下单", "交期跟踪", "来料检验"]
  },
  M7: {
    name: "生产制造",
    description: "执行生产制造，进行过程质量控制",
    inputs: ["生产图纸", "工艺文件", "物料", "MES工单"],
    outputs: ["生产记录", "质检报告", "半成品"],
    keyActivities: ["生产排程", "过程检验", "质量控制", "进度跟踪"]
  },
  M8: {
    name: "组装调试",
    description: "系统组装和调试，确保功能正常",
    inputs: ["半成品", "组装图纸", "调试规程"],
    outputs: ["组装记录", "调试报告", "成品"],
    keyActivities: ["系统组装", "功能调试", "性能测试", "问题整改"]
  },
  M9: {
    name: "测试验收",
    description: "内部测试验收，确保产品符合规格",
    inputs: ["成品", "测试规程", "验收标准"],
    outputs: ["FAT报告", "测试记录", "问题清单"],
    keyActivities: ["功能测试", "性能测试", "安全测试", "FAT验收"]
  },
  M10: {
    name: "发货交付",
    description: "产品包装发货，准备现场安装",
    inputs: ["FAT报告", "发货清单", "运输方案"],
    outputs: ["发货单", "运输记录", "到货确认"],
    keyActivities: ["包装准备", "发货安排", "运输跟踪", "到货确认"]
  },
  M11: {
    name: "现场安装",
    description: "现场安装调试，进行客户培训",
    inputs: ["到货确认", "安装方案", "培训计划"],
    outputs: ["安装记录", "调试报告", "培训记录"],
    keyActivities: ["现场安装", "系统调试", "客户培训", "试运行"]
  },
  M12: {
    name: "终验收",
    description: "客户最终验收，项目结项",
    inputs: ["安装记录", "验收标准", "SAT规程"],
    outputs: ["SAT报告", "验收证书", "项目结项报告"],
    keyActivities: ["SAT验收", "问题整改", "文档移交", "项目结项"]
  }
};

// 模拟阶段数据
const getMockStageData = (projectId: string, stageCode: string) => ({
  id: 1,
  projectId: parseInt(projectId),
  stageCode,
  stageName: STAGE_CONFIG[stageCode]?.name || stageCode,
  status: stageCode === 'M6' ? 'InProgress' : stageCode < 'M6' ? 'Completed' : 'NotStarted',
  completionPercent: stageCode === 'M6' ? 65 : stageCode < 'M6' ? 100 : 0,
  plannedStartDate: '2024-01-15',
  plannedEndDate: '2024-02-15',
  actualStartDate: stageCode <= 'M6' ? '2024-01-18' : null,
  actualEndDate: stageCode < 'M6' ? '2024-02-10' : null,
  tasks: [
    { id: 1, title: '任务1: 准备阶段输入文档', status: 'completed', assignee: '张工', dueDate: '2024-01-20' },
    { id: 2, title: '任务2: 执行阶段关键活动', status: 'in_progress', assignee: '李工', dueDate: '2024-02-01' },
    { id: 3, title: '任务3: 输出阶段交付物', status: 'pending', assignee: '王工', dueDate: '2024-02-10' },
    { id: 4, title: '任务4: 阶段评审和确认', status: 'pending', assignee: '赵工', dueDate: '2024-02-15' },
  ],
  documents: [
    { id: 1, name: '技术方案v2.1.docx', type: 'input', uploadedBy: '张工', uploadedAt: '2024-01-18', size: '2.3MB' },
    { id: 2, name: 'BOM清单v1.0.xlsx', type: 'input', uploadedBy: '李工', uploadedAt: '2024-01-20', size: '156KB' },
    { id: 3, name: '设计评审报告.pdf', type: 'output', uploadedBy: '王工', uploadedAt: '2024-02-05', size: '1.8MB' },
  ],
  reviews: [
    { id: 1, reviewer: '技术总监', status: 'approved', comment: '技术方案可行，同意进入下一阶段', reviewedAt: '2024-02-08' },
    { id: 2, reviewer: '项目经理', status: 'approved', comment: '进度符合预期，资源充足', reviewedAt: '2024-02-08' },
  ],
  auditLogs: [
    { id: 1, action: '阶段启动', user: '系统', timestamp: '2024-01-18 09:00:00', details: '阶段状态变更为进行中' },
    { id: 2, action: '文档上传', user: '张工', timestamp: '2024-01-18 10:30:00', details: '上传技术方案v2.1.docx' },
    { id: 3, action: '任务完成', user: '张工', timestamp: '2024-01-20 16:00:00', details: '完成任务1: 准备阶段输入文档' },
    { id: 4, action: '评审通过', user: '技术总监', timestamp: '2024-02-08 14:00:00', details: '技术评审通过' },
  ]
});

export default function StageDetail() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const params = useParams();
  const [, setLocation] = useLocation();
  
  const projectId = (params as any).projectId || '1';
  const stageCode = (params as any).stageCode || 'M0';
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  
  // 获取阶段数据（使用模拟数据）
  const stageData = getMockStageData(projectId, stageCode);
  const stageConfig = STAGE_CONFIG[stageCode] || STAGE_CONFIG.M0;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">已完成</Badge>;
      case 'InProgress':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">进行中</Badge>;
      case 'NotStarted':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">未开始</Badge>;
      case 'OnHold':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">暂停</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
      <div className="space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          <Link href={`/pos/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回项目
            </Button>
          </Link>
          <Badge variant="outline" className="text-primary border-primary">
            {stageCode}
          </Badge>
          {getStatusBadge(stageData.status)}
        </div>

        <PageHeader
          icon={Target}
          title={`${stageCode} - ${stageConfig.name}`}
          description={stageConfig.description}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                上传文档
              </Button>
              <Button size="sm" onClick={() => setShowReviewDialog(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                提交评审
              </Button>
            </>
          }
        />
        {/* 阶段进度概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              阶段进度
            </CardTitle>
            <CardDescription>{stageConfig.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">完成进度</span>
                <span className="text-sm font-medium">{stageData.completionPercent}%</span>
              </div>
              <Progress value={stageData.completionPercent} className="h-2" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">计划开始</p>
                  <p className="text-sm font-medium">{stageData.plannedStartDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">计划结束</p>
                  <p className="text-sm font-medium">{stageData.plannedEndDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">实际开始</p>
                  <p className="text-sm font-medium">{stageData.actualStartDate || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">实际结束</p>
                  <p className="text-sm font-medium">{stageData.actualEndDate || '-'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="tasks">任务</TabsTrigger>
            <TabsTrigger value="documents">文档</TabsTrigger>
            <TabsTrigger value="reviews">评审</TabsTrigger>
            <TabsTrigger value="audit">审计日志</TabsTrigger>
          </TabsList>

          {/* 概览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 阶段输入 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    阶段输入
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {stageConfig.inputs.map((input, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {input}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* 阶段输出 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-green-500" />
                    阶段输出
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {stageConfig.outputs.map((output, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {output}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* 关键活动 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  关键活动
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stageConfig.keyActivities.map((activity, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm">{activity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 任务 */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">阶段任务</h3>
              <Button size="sm" onClick={() => setShowTaskDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加任务
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stageData.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getTaskStatusIcon(task.status)}
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {task.assignee}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'}>
                          {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待处理'}
                        </Badge>
                        <Button variant="ghost" size="icon"
                          onClick={() => toast.info(`编辑任务: ${task.title}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 文档 */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">阶段文档</h3>
              <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                上传文档
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 输入文档 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">输入文档</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {stageData.documents.filter(d => d.type === 'input').map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 输出文档 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">输出文档</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {stageData.documents.filter(d => d.type === 'output').map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 评审 */}
          <TabsContent value="reviews" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">阶段评审</h3>
              <Button size="sm" onClick={() => setShowReviewDialog(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                提交评审
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stageData.reviews.map((review) => (
                    <div key={review.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{review.reviewer}</span>
                        </div>
                        <Badge className={review.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {review.status === 'approved' ? '通过' : '驳回'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                      <p className="text-xs text-muted-foreground">{review.reviewedAt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 审计日志 */}
          <TabsContent value="audit" className="space-y-4">
            <h3 className="text-lg font-semibold">审计日志</h3>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stageData.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <History className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{log.action}</p>
                          <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{log.details}</p>
                        <p className="text-xs text-muted-foreground mt-1">操作人: {log.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 阶段导航 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">阶段导航</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STAGE_CONFIG).map(([code, config]) => (
                <Link key={code} href={`/pos/projects/${projectId}/stages/${code}`}>
                  <Button
                    variant={code === stageCode ? 'default' : 'outline'}
                    size="sm"
                    className={code === stageCode ? '' : 'hover:bg-primary/10'}
                  >
                    {code}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

      {/* 评审对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交阶段评审</DialogTitle>
            <DialogDescription>
              请对当前阶段进行评审，并提供评审意见
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>评审决定</Label>
              <Select value={reviewDecision} onValueChange={(v) => setReviewDecision(v as 'approved' | 'rejected')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">通过</SelectItem>
                  <SelectItem value="rejected">驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>评审意见</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="请输入评审意见..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>取消</Button>
            <Button onClick={() => {
              // TODO: 提交评审
              setShowReviewDialog(false);
              setReviewComment('');
            }}>
              <Send className="w-4 h-4 mr-2" />
              提交评审
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传文档对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传文档</DialogTitle>
            <DialogDescription>
              上传阶段相关文档
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>文档类型</Label>
              <Select defaultValue="input">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">输入文档</SelectItem>
                  <SelectItem value="output">输出文档</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>选择文件</Label>
              <Input type="file" />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea placeholder="文档说明（可选）" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>取消</Button>
            <Button onClick={() => {
              // TODO: 上传文档
              setShowUploadDialog(false);
            }}>
              <Upload className="w-4 h-4 mr-2" />
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加任务对话框 */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加任务</DialogTitle>
            <DialogDescription>
              为当前阶段添加新任务
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>任务标题</Label>
              <Input placeholder="请输入任务标题" />
            </div>
            <div className="space-y-2">
              <Label>负责人</Label>
              <Input placeholder="请输入负责人" />
            </div>
            <div className="space-y-2">
              <Label>截止日期</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>任务描述</Label>
              <Textarea placeholder="任务描述（可选）" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>取消</Button>
            <Button onClick={() => {
              // TODO: 添加任务
              setShowTaskDialog(false);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
