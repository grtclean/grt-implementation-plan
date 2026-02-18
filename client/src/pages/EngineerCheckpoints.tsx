import { useState } from 'react';
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Settings,
  Wrench,
  TestTube,
  Package,
  Truck
} from 'lucide-react';

// 工程师确认检查点定义
interface EngineerCheckpoint {
  id: string;
  phase: string;
  phaseName: string;
  checkpointName: string;
  description: string;
  requiredDocuments: string[];
  verificationItems: string[];
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'conditional';
  assignedEngineer?: string;
  dueDate?: string;
  completedDate?: string;
  remarks?: string;
  attachments?: string[];
}

// M0-M12阶段的工程师确认检查点
const ENGINEER_CHECKPOINTS: EngineerCheckpoint[] = [
  // Phase 1: 需求确认与方案设计 (M0-M3)
  {
    id: 'CP-001',
    phase: 'M0',
    phaseName: '项目启动',
    checkpointName: '清洗需求规格确认',
    description: '确认客户清洗需求规格，包括零件特征、清洁度要求、产能需求等',
    requiredDocuments: ['客户需求规格书', '零件图纸', '清洁度标准'],
    verificationItems: [
      '零件特征类型识别完成',
      '清洁度等级确认',
      '产能需求明确',
      '特殊要求记录',
    ],
    status: 'approved',
    assignedEngineer: '张工',
    completedDate: '2024-01-15',
  },
  {
    id: 'CP-002',
    phase: 'M1',
    phaseName: '概念设计',
    checkpointName: '清洗策略方案确认',
    description: '确认清洗策略方案，包括清洗工艺路线、设备选型、喷嘴配置等',
    requiredDocuments: ['清洗策略方案书', '设备选型报告', '喷嘴配置方案'],
    verificationItems: [
      '清洗工艺路线合理',
      '设备选型符合需求',
      '喷嘴配置覆盖所有特征',
      '清洗参数初步确定',
    ],
    status: 'approved',
    assignedEngineer: '李工',
    completedDate: '2024-02-01',
  },
  {
    id: 'CP-003',
    phase: 'M2',
    phaseName: '详细设计',
    checkpointName: '技术方案评审',
    description: '技术方案评审，确认设计方案的可行性和完整性',
    requiredDocuments: ['详细设计图纸', '技术规格书', 'BOM清单'],
    verificationItems: [
      '设计图纸完整',
      '技术参数合理',
      'BOM清单准确',
      '风险评估完成',
    ],
    status: 'in_progress',
    assignedEngineer: '王工',
    dueDate: '2024-02-20',
  },
  {
    id: 'CP-004',
    phase: 'M3',
    phaseName: '设计冻结',
    checkpointName: '设计冻结确认',
    description: '设计冻结前的最终确认，确保所有设计变更已完成',
    requiredDocuments: ['设计冻结清单', '变更记录', '客户确认书'],
    verificationItems: [
      '所有设计变更已关闭',
      '客户确认无异议',
      '生产准备就绪',
      '供应商确认',
    ],
    status: 'pending',
    dueDate: '2024-03-01',
  },

  // Phase 2: 制造与调试 (M4-M6)
  {
    id: 'CP-005',
    phase: 'M4',
    phaseName: '零部件采购',
    checkpointName: '关键零部件验收',
    description: '关键零部件到货验收，确认符合设计要求',
    requiredDocuments: ['采购订单', '到货检验报告', '合格证'],
    verificationItems: [
      '喷嘴规格符合要求',
      '泵组性能达标',
      '控制系统完整',
      '材质证明齐全',
    ],
    status: 'pending',
    dueDate: '2024-03-15',
  },
  {
    id: 'CP-006',
    phase: 'M5',
    phaseName: '设备组装',
    checkpointName: '组装质量确认',
    description: '设备组装完成后的质量确认，包括机械、电气、管路等',
    requiredDocuments: ['组装检查表', '电气测试报告', '管路压力测试报告'],
    verificationItems: [
      '机械组装精度达标',
      '电气接线正确',
      '管路无泄漏',
      '安全防护完整',
    ],
    status: 'pending',
    dueDate: '2024-04-01',
  },
  {
    id: 'CP-007',
    phase: 'M6',
    phaseName: '单机调试',
    checkpointName: '单机调试确认',
    description: '单机调试完成确认，验证各功能模块正常工作',
    requiredDocuments: ['调试记录', 'PLC程序', 'HMI界面'],
    verificationItems: [
      '运动控制正常',
      '喷嘴动作准确',
      '传感器信号正确',
      '安全联锁有效',
    ],
    status: 'pending',
    dueDate: '2024-04-15',
  },

  // Phase 3: 验证与优化 (M7-M9)
  {
    id: 'CP-008',
    phase: 'M7',
    phaseName: '牙膏试验',
    checkpointName: '牙膏试验验证',
    description: '牙膏试验验证，确认清洗轨迹覆盖所有关键区域',
    requiredDocuments: ['牙膏试验报告', '残留位置图', '调整记录'],
    verificationItems: [
      '所有盲孔清洗到位',
      '加强筋根部无残留',
      '密封面清洁度达标',
      '深腔底部清洗彻底',
    ],
    status: 'pending',
    dueDate: '2024-05-01',
  },
  {
    id: 'CP-009',
    phase: 'M8',
    phaseName: '清洁度验证',
    checkpointName: '清洁度检测确认',
    description: '正式清洁度检测，确认达到客户要求的清洁度等级',
    requiredDocuments: ['清洁度检测报告', '颗粒分析报告', '对比数据'],
    verificationItems: [
      '颗粒数量符合标准',
      '颗粒尺寸符合要求',
      '重复性验证通过',
      '客户样件验证通过',
    ],
    status: 'pending',
    dueDate: '2024-05-15',
  },
  {
    id: 'CP-010',
    phase: 'M9',
    phaseName: '参数优化',
    checkpointName: '最优参数确认',
    description: '清洗参数优化完成，确认最优工艺参数组合',
    requiredDocuments: ['参数优化报告', 'DOE分析', '参数锁定表'],
    verificationItems: [
      '压力参数优化完成',
      '温度参数优化完成',
      '时间参数优化完成',
      '参数稳定性验证',
    ],
    status: 'pending',
    dueDate: '2024-06-01',
  },

  // Phase 4: 交付与验收 (M10-M12)
  {
    id: 'CP-011',
    phase: 'M10',
    phaseName: 'FAT测试',
    checkpointName: 'FAT测试确认',
    description: '工厂验收测试（FAT）确认，客户现场见证',
    requiredDocuments: ['FAT测试报告', '客户签字确认', '问题清单'],
    verificationItems: [
      '功能测试全部通过',
      '性能指标达标',
      '安全测试通过',
      '客户确认无异议',
    ],
    status: 'pending',
    dueDate: '2024-06-15',
  },
  {
    id: 'CP-012',
    phase: 'M11',
    phaseName: '现场安装',
    checkpointName: '现场安装确认',
    description: '设备现场安装完成确认，包括定位、接口、调试等',
    requiredDocuments: ['安装检查表', '接口确认书', '调试记录'],
    verificationItems: [
      '设备定位准确',
      '水电气接口正确',
      '与产线对接正常',
      '现场调试完成',
    ],
    status: 'pending',
    dueDate: '2024-07-01',
  },
  {
    id: 'CP-013',
    phase: 'M12',
    phaseName: 'SAT验收',
    checkpointName: 'SAT验收确认',
    description: '现场验收测试（SAT）确认，项目正式交付',
    requiredDocuments: ['SAT测试报告', '验收证书', '培训记录', '维护手册'],
    verificationItems: [
      '连续生产验证通过',
      '清洁度稳定达标',
      '操作人员培训完成',
      '文档资料移交完成',
    ],
    status: 'pending',
    dueDate: '2024-07-15',
  },
];

// 状态颜色和图标映射
const STATUS_CONFIG = {
  pending: { color: 'bg-gray-500', icon: Clock, label: '待处理', textColor: 'text-gray-500' },
  in_progress: { color: 'bg-blue-500', icon: Settings, label: '进行中', textColor: 'text-blue-500' },
  approved: { color: 'bg-green-500', icon: CheckCircle2, label: '已通过', textColor: 'text-green-500' },
  rejected: { color: 'bg-red-500', icon: XCircle, label: '已拒绝', textColor: 'text-red-500' },
  conditional: { color: 'bg-yellow-500', icon: AlertTriangle, label: '有条件通过', textColor: 'text-yellow-500' },
};

// 阶段图标映射
const PHASE_ICONS: Record<string, React.ComponentType<any>> = {
  M0: FileText,
  M1: FileText,
  M2: FileText,
  M3: FileText,
  M4: Package,
  M5: Wrench,
  M6: Settings,
  M7: TestTube,
  M8: ClipboardCheck,
  M9: Settings,
  M10: ClipboardCheck,
  M11: Truck,
  M12: CheckCircle2,
};

export default function EngineerCheckpoints() {
  const [checkpoints, setCheckpoints] = useState<EngineerCheckpoint[]>(ENGINEER_CHECKPOINTS);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<EngineerCheckpoint | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  // 过滤检查点
  const filteredCheckpoints = checkpoints.filter((cp) => {
    if (selectedPhase !== 'all' && cp.phase !== selectedPhase) return false;
    if (selectedStatus !== 'all' && cp.status !== selectedStatus) return false;
    return true;
  });

  // 统计数据
  const stats = {
    total: checkpoints.length,
    approved: checkpoints.filter((cp) => cp.status === 'approved').length,
    inProgress: checkpoints.filter((cp) => cp.status === 'in_progress').length,
    pending: checkpoints.filter((cp) => cp.status === 'pending').length,
    rejected: checkpoints.filter((cp) => cp.status === 'rejected').length,
  };

  // 处理审批
  const handleApproval = (status: 'approved' | 'rejected' | 'conditional') => {
    if (!selectedCheckpoint) return;

    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === selectedCheckpoint.id
          ? {
              ...cp,
              status,
              remarks: approvalRemarks,
              completedDate: status === 'approved' ? new Date().toISOString().split('T')[0] : undefined,
            }
          : cp
      )
    );

    toast.success(`检查点 ${selectedCheckpoint.id} 已${STATUS_CONFIG[status].label}`);
    setIsApprovalDialogOpen(false);
    setApprovalRemarks('');
    setSelectedCheckpoint(null);
  };

  // 开始审批
  const startApproval = (checkpoint: EngineerCheckpoint) => {
    setSelectedCheckpoint(checkpoint);
    setIsApprovalDialogOpen(true);
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={ClipboardCheck}
          title="工程师确认检查点"
          description="M0-M12项目生命周期工程师确认检查点管理"
          actions={
            <Badge variant="outline" className="text-lg px-4 py-2">
              进度: {stats.approved}/{stats.total}
            </Badge>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={FileText} label="总检查点" value={stats.total} iconColor="text-muted-foreground" iconBg="bg-muted" />
          <StatCard icon={CheckCircle2} label="已通过" value={stats.approved} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Settings} label="进行中" value={stats.inProgress} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Clock} label="待处理" value={stats.pending} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
          <StatCard icon={XCircle} label="已拒绝" value={stats.rejected} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* 过滤器 */}
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedPhase} onValueChange={setSelectedPhase}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="选择阶段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有阶段</SelectItem>
              {Array.from(new Set(checkpoints.map((cp) => cp.phase))).map((phase) => (
                <SelectItem key={phase} value={phase}>
                  {phase}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 检查点列表 */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">列表视图</TabsTrigger>
            <TabsTrigger value="timeline">时间线视图</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {filteredCheckpoints.map((checkpoint) => {
              const StatusIcon = STATUS_CONFIG[checkpoint.status].icon;
              const PhaseIcon = PHASE_ICONS[checkpoint.phase] || FileText;

              return (
                <Card key={checkpoint.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${STATUS_CONFIG[checkpoint.status].color}/10`}>
                          <PhaseIcon className={`w-6 h-6 ${STATUS_CONFIG[checkpoint.status].textColor}`} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {checkpoint.phase}
                            </Badge>
                            <span className="font-medium">{checkpoint.checkpointName}</span>
                            <Badge className={`${STATUS_CONFIG[checkpoint.status].color} text-white`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_CONFIG[checkpoint.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{checkpoint.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {checkpoint.assignedEngineer && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {checkpoint.assignedEngineer}
                              </span>
                            )}
                            {checkpoint.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                截止: {checkpoint.dueDate}
                              </span>
                            )}
                            {checkpoint.completedDate && (
                              <span className="flex items-center gap-1 text-green-500">
                                <CheckCircle2 className="w-3 h-3" />
                                完成: {checkpoint.completedDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              查看详情
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Badge variant="outline">{checkpoint.phase}</Badge>
                                {checkpoint.checkpointName}
                              </DialogTitle>
                              <DialogDescription>{checkpoint.description}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">所需文档</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                  {checkpoint.requiredDocuments.map((doc, i) => (
                                    <li key={i}>{doc}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">验证项目</h4>
                                <ul className="space-y-1">
                                  {checkpoint.verificationItems.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {checkpoint.remarks && (
                                <div>
                                  <h4 className="font-medium mb-2">备注</h4>
                                  <p className="text-sm text-muted-foreground">{checkpoint.remarks}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {(checkpoint.status === 'pending' || checkpoint.status === 'in_progress') && (
                          <Button size="sm" onClick={() => startApproval(checkpoint)}>
                            审批
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="relative">
              {/* 时间线 */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

              {filteredCheckpoints.map((checkpoint, index) => {
                const StatusIcon = STATUS_CONFIG[checkpoint.status].icon;
                const PhaseIcon = PHASE_ICONS[checkpoint.phase] || FileText;

                return (
                  <div key={checkpoint.id} className="relative flex items-start gap-6 pb-8">
                    {/* 时间线节点 */}
                    <div
                      className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center ${STATUS_CONFIG[checkpoint.status].color}`}
                    >
                      <PhaseIcon className="w-8 h-8 text-white" />
                    </div>

                    {/* 内容 */}
                    <Card className="flex-1 bg-card border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge variant="outline">{checkpoint.phase}</Badge>
                            {checkpoint.checkpointName}
                          </CardTitle>
                          <Badge className={`${STATUS_CONFIG[checkpoint.status].color} text-white`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {STATUS_CONFIG[checkpoint.status].label}
                          </Badge>
                        </div>
                        <CardDescription>{checkpoint.phaseName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{checkpoint.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {checkpoint.assignedEngineer && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {checkpoint.assignedEngineer}
                            </span>
                          )}
                          {checkpoint.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {checkpoint.dueDate}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* 审批对话框 */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>检查点审批</DialogTitle>
              <DialogDescription>
                {selectedCheckpoint && (
                  <>
                    审批检查点: {selectedCheckpoint.phase} - {selectedCheckpoint.checkpointName}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">审批备注</label>
                <Textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="请输入审批备注..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={() => handleApproval('rejected')}>
                <XCircle className="w-4 h-4 mr-1" />
                拒绝
              </Button>
              <Button variant="secondary" onClick={() => handleApproval('conditional')}>
                <AlertTriangle className="w-4 h-4 mr-1" />
                有条件通过
              </Button>
              <Button onClick={() => handleApproval('approved')}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                通过
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
