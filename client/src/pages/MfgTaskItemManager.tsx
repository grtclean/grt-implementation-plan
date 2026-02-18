/**
 * 制造任务项管理页面 (Manufacturing Task Item Manager)
 * 工序级原子任务管理界面
 * v2.5.24
 */

import { useState } from 'react';
import { toast } from 'sonner';

const showPlaceholder = (featureName: string) => {
  toast.info('功能完善中', { description: `${featureName}功能正在开发完善中，敬请期待` });
};
import { PageHeader, StatCard } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Wrench,
  Cpu,
  Zap,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ChevronRight,
  Timer,
  Users,
  ClipboardCheck,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

// 任务类型
type MfgTaskType = 'Mech_Sub_Assy' | 'Mech_Assy' | 'Mech_Final_Assy' | 'Elec_Assy';
type MfgTaskStatus = 'Pending' | 'Started' | 'Paused' | 'QC_Review' | 'Finished';
type AssignedTeam = 'Team_A' | 'Team_B' | 'Elec_Team';

// 模拟任务数据
const mockTasks = [
  {
    id: 'TASK-001',
    workOrderId: 'WO-001',
    taskType: 'Mech_Sub_Assy' as MfgTaskType,
    taskName: '清洗舱A区管路连接',
    bomModuleName: 'M-PIPE-A01',
    assignedTeam: 'Team_A' as AssignedTeam,
    estimatedHours: 8,
    actualHours: 7.5,
    efficiencyRate: 1.07,
    status: 'Finished' as MfgTaskStatus,
    issueLogIds: [],
    sequence: 1
  },
  {
    id: 'TASK-002',
    workOrderId: 'WO-001',
    taskType: 'Mech_Sub_Assy' as MfgTaskType,
    taskName: '清洗舱B区管路连接',
    bomModuleName: 'M-PIPE-B01',
    assignedTeam: 'Team_A' as AssignedTeam,
    estimatedHours: 8,
    actualHours: 9,
    efficiencyRate: 0.89,
    status: 'Finished' as MfgTaskStatus,
    issueLogIds: ['ISS-001'],
    sequence: 2
  },
  {
    id: 'TASK-003',
    workOrderId: 'WO-001',
    taskType: 'Mech_Assy' as MfgTaskType,
    taskName: '清洗舱框架组装',
    bomModuleName: 'M-FRAME-01',
    assignedTeam: 'Team_B' as AssignedTeam,
    estimatedHours: 16,
    actualHours: 12,
    efficiencyRate: 0,
    status: 'Started' as MfgTaskStatus,
    issueLogIds: [],
    sequence: 3
  },
  {
    id: 'TASK-004',
    workOrderId: 'WO-001',
    taskType: 'Elec_Assy' as MfgTaskType,
    taskName: '控制柜布线',
    bomModuleName: 'E-CTRL-01',
    assignedTeam: 'Elec_Team' as AssignedTeam,
    estimatedHours: 12,
    actualHours: 0,
    efficiencyRate: 0,
    status: 'Pending' as MfgTaskStatus,
    issueLogIds: [],
    sequence: 4
  },
  {
    id: 'TASK-005',
    workOrderId: 'WO-001',
    taskType: 'Mech_Final_Assy' as MfgTaskType,
    taskName: '整机总装调试',
    bomModuleName: 'M-FINAL-01',
    assignedTeam: 'Team_A' as AssignedTeam,
    estimatedHours: 24,
    actualHours: 0,
    efficiencyRate: 0,
    status: 'Pending' as MfgTaskStatus,
    issueLogIds: [],
    sequence: 5
  },
  {
    id: 'TASK-006',
    workOrderId: 'WO-001',
    taskType: 'Elec_Assy' as MfgTaskType,
    taskName: '电气系统联调',
    bomModuleName: 'E-SYS-01',
    assignedTeam: 'Elec_Team' as AssignedTeam,
    estimatedHours: 8,
    actualHours: 0,
    efficiencyRate: 0,
    status: 'QC_Review' as MfgTaskStatus,
    issueLogIds: [],
    sequence: 6
  }
];

// 任务类型配置
const taskTypeConfig: Record<MfgTaskType, { label: string; icon: React.ReactNode; color: string }> = {
  'Mech_Sub_Assy': { label: '机械分装', icon: <Package className="w-4 h-4" />, color: 'text-blue-500' },
  'Mech_Assy': { label: '机械组装', icon: <Wrench className="w-4 h-4" />, color: 'text-green-500' },
  'Mech_Final_Assy': { label: '机械总装', icon: <Cpu className="w-4 h-4" />, color: 'text-purple-500' },
  'Elec_Assy': { label: '电气组装', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-500' }
};

// 状态配置
const statusConfig: Record<MfgTaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Pending': { label: '待开始', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: <Clock className="w-4 h-4" /> },
  'Started': { label: '进行中', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Play className="w-4 h-4" /> },
  'Paused': { label: '已暂停', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <Pause className="w-4 h-4" /> },
  'QC_Review': { label: '质检中', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <ClipboardCheck className="w-4 h-4" /> },
  'Finished': { label: '已完成', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle2 className="w-4 h-4" /> }
};

// 班组配置
const teamConfig: Record<AssignedTeam, { label: string; color: string }> = {
  'Team_A': { label: 'A班组', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'Team_B': { label: 'B班组', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  'Elec_Team': { label: '电气班组', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
};

export default function MfgTaskItemManager() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // 过滤任务
  const filteredTasks = mockTasks.filter(task => {
    if (searchKeyword && !task.taskName.includes(searchKeyword) && !task.bomModuleName?.includes(searchKeyword)) {
      return false;
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && task.taskType !== typeFilter) {
      return false;
    }
    if (teamFilter !== 'all' && task.assignedTeam !== teamFilter) {
      return false;
    }
    return true;
  });

  // 统计数据
  const stats = {
    total: mockTasks.length,
    finished: mockTasks.filter(t => t.status === 'Finished').length,
    inProgress: mockTasks.filter(t => t.status === 'Started').length,
    pending: mockTasks.filter(t => t.status === 'Pending').length,
    qcReview: mockTasks.filter(t => t.status === 'QC_Review').length,
    withIssues: mockTasks.filter(t => t.issueLogIds.length > 0).length,
    totalEstimated: mockTasks.reduce((sum, t) => sum + t.estimatedHours, 0),
    totalActual: mockTasks.reduce((sum, t) => sum + t.actualHours, 0)
  };

  // 切换选择
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Wrench}
        title="制造任务管理"
        description="工序级原子任务追踪与管理"
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              新建任务
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard icon={ClipboardCheck} label="总任务" value={stats.total} />
        <StatCard icon={CheckCircle2} label="已完成" value={stats.finished} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
        <StatCard icon={Play} label="进行中" value={stats.inProgress} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label="待开始" value={stats.pending} iconColor="text-gray-400" iconBg="bg-gray-500/10" />
        <StatCard icon={Search} label="质检中" value={stats.qcReview} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label="有异常" value={stats.withIssues} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <StatCard icon={Timer} label="预估工时" value={`${stats.totalEstimated}h`} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Timer} label="实际工时" value={`${stats.totalActual}h`} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* 过滤器 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务名称或BOM模块..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="Pending">待开始</SelectItem>
                  <SelectItem value="Started">进行中</SelectItem>
                  <SelectItem value="Paused">已暂停</SelectItem>
                  <SelectItem value="QC_Review">质检中</SelectItem>
                  <SelectItem value="Finished">已完成</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="Mech_Sub_Assy">机械分装</SelectItem>
                  <SelectItem value="Mech_Assy">机械组装</SelectItem>
                  <SelectItem value="Mech_Final_Assy">机械总装</SelectItem>
                  <SelectItem value="Elec_Assy">电气组装</SelectItem>
                </SelectContent>
              </Select>

              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="班组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部班组</SelectItem>
                  <SelectItem value="Team_A">A班组</SelectItem>
                  <SelectItem value="Team_B">B班组</SelectItem>
                  <SelectItem value="Elec_Team">电气班组</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                已选择 {selectedTasks.length} 项
              </span>
            </div>
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => showPlaceholder('批量开始')}>批量开始</Button>
                <Button variant="outline" size="sm" onClick={() => showPlaceholder('批量分配')}>批量分配</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => {
              const typeConf = taskTypeConfig[task.taskType];
              const statusConf = statusConfig[task.status];
              const teamConf = teamConfig[task.assignedTeam];
              const progressPercent = task.estimatedHours > 0 
                ? Math.min(100, Math.round((task.actualHours / task.estimatedHours) * 100))
                : 0;

              return (
                <div 
                  key={task.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                    
                    {/* 序号 */}
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-mono">
                      {task.sequence}
                    </div>

                    {/* 任务信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={typeConf.color}>{typeConf.icon}</span>
                        <span className="font-medium truncate">{task.taskName}</span>
                        {task.issueLogIds.length > 0 && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {task.issueLogIds.length}个异常
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{task.id}</span>
                        <span>BOM: {task.bomModuleName}</span>
                      </div>
                    </div>

                    {/* 班组 */}
                    <Badge variant="outline" className={teamConf.color}>
                      <Users className="w-3 h-3 mr-1" />
                      {teamConf.label}
                    </Badge>

                    {/* 工时 */}
                    <div className="w-32 text-right">
                      <div className="text-sm">
                        <span className="font-mono">{task.actualHours}</span>
                        <span className="text-muted-foreground">/{task.estimatedHours}h</span>
                      </div>
                      {task.efficiencyRate > 0 && (
                        <div className={`text-xs ${task.efficiencyRate >= 1 ? 'text-green-500' : 'text-yellow-500'}`}>
                          效率: {(task.efficiencyRate * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>

                    {/* 状态 */}
                    <Badge variant="outline" className={statusConf.color}>
                      {statusConf.icon}
                      <span className="ml-1">{statusConf.label}</span>
                    </Badge>

                    {/* 操作 */}
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="p-8 text-center">
                <Wrench className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">暂无符合条件的任务</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
