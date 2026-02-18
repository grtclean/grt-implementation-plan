/**
 * 模型训练调度管理前端页面
 * v2.5.8 - 定时任务管理、模型版本管理、训练报告查看
 */

import { useState } from 'react';
import { PageHeader, StatCard } from '@/components/grt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Rocket,
  RotateCcw,
  FileText,
  Settings,
  TrendingUp,
  Database,
  Cpu,
  Timer,
  History,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Download
} from 'lucide-react';

// ==================== 类型定义 ====================

type ModelType = 'cost_prediction' | 'demand_forecast' | 'anomaly_detection' | 'capability_assessment';
type ScheduleStatus = 'enabled' | 'disabled' | 'running';
type VersionStatus = 'training' | 'completed' | 'failed' | 'deployed' | 'archived';

interface Schedule {
  id: string;
  name: string;
  modelType: ModelType;
  cronExpression: string;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
}

interface ModelVersion {
  id: string;
  modelType: ModelType;
  version: string;
  status: VersionStatus;
  accuracy: number;
  trainedAt: number;
  deployedAt?: number;
}

interface TrainingReport {
  id: string;
  scheduleId: string;
  version: string;
  modelType: ModelType;
  generatedAt: number;
  improvement: number;
  dataQuality: string;
}

// ==================== 模拟数据 ====================

const mockSchedules: Schedule[] = [
  { id: 's1', name: '成本预测模型日训练', modelType: 'cost_prediction', cronExpression: '0 2 * * *', enabled: true, lastRunAt: Date.now() - 86400000, nextRunAt: Date.now() + 43200000 },
  { id: 's2', name: '需求预测模型周训练', modelType: 'demand_forecast', cronExpression: '0 3 * * 0', enabled: true, lastRunAt: Date.now() - 604800000, nextRunAt: Date.now() + 259200000 },
  { id: 's3', name: '异常检测模型小时训练', modelType: 'anomaly_detection', cronExpression: '0 * * * *', enabled: false },
  { id: 's4', name: '能力评估模型月训练', modelType: 'capability_assessment', cronExpression: '0 4 1 * *', enabled: true, lastRunAt: Date.now() - 2592000000, nextRunAt: Date.now() + 1296000000 }
];

const mockVersions: ModelVersion[] = [
  { id: 'v1', modelType: 'cost_prediction', version: '3.2.1', status: 'deployed', accuracy: 0.92, trainedAt: Date.now() - 86400000, deployedAt: Date.now() - 43200000 },
  { id: 'v2', modelType: 'cost_prediction', version: '3.2.0', status: 'archived', accuracy: 0.89, trainedAt: Date.now() - 172800000 },
  { id: 'v3', modelType: 'cost_prediction', version: '3.1.0', status: 'archived', accuracy: 0.87, trainedAt: Date.now() - 604800000 },
  { id: 'v4', modelType: 'demand_forecast', version: '2.1.0', status: 'deployed', accuracy: 0.88, trainedAt: Date.now() - 604800000, deployedAt: Date.now() - 518400000 },
  { id: 'v5', modelType: 'capability_assessment', version: '1.5.0', status: 'deployed', accuracy: 0.85, trainedAt: Date.now() - 2592000000, deployedAt: Date.now() - 2505600000 }
];

const mockReports: TrainingReport[] = [
  { id: 'r1', scheduleId: 's1', version: '3.2.1', modelType: 'cost_prediction', generatedAt: Date.now() - 86400000, improvement: 3.4, dataQuality: 'excellent' },
  { id: 'r2', scheduleId: 's1', version: '3.2.0', modelType: 'cost_prediction', generatedAt: Date.now() - 172800000, improvement: 2.1, dataQuality: 'good' },
  { id: 'r3', scheduleId: 's2', version: '2.1.0', modelType: 'demand_forecast', generatedAt: Date.now() - 604800000, improvement: 5.2, dataQuality: 'good' },
  { id: 'r4', scheduleId: 's4', version: '1.5.0', modelType: 'capability_assessment', generatedAt: Date.now() - 2592000000, improvement: 1.8, dataQuality: 'fair' }
];

// ==================== 配置 ====================

const modelTypeLabels: Record<ModelType, string> = {
  cost_prediction: '成本预测',
  demand_forecast: '需求预测',
  anomaly_detection: '异常检测',
  capability_assessment: '能力评估'
};

const statusConfig: Record<VersionStatus, { label: string; color: string; icon: any }> = {
  training: { label: '训练中', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { label: '失败', color: 'bg-red-100 text-red-800', icon: XCircle },
  deployed: { label: '已部署', color: 'bg-purple-100 text-purple-800', icon: Rocket },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-800', icon: History }
};

const dataQualityConfig: Record<string, { label: string; color: string }> = {
  excellent: { label: '优秀', color: 'text-green-600' },
  good: { label: '良好', color: 'text-blue-600' },
  fair: { label: '一般', color: 'text-yellow-600' },
  poor: { label: '较差', color: 'text-red-600' }
};

// ==================== 主组件 ====================

export default function ModelTrainingScheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [versions] = useState<ModelVersion[]>(mockVersions);
  const [reports] = useState<TrainingReport[]>(mockReports);
  const [schedulerRunning, setSchedulerRunning] = useState(true);
  const [selectedModelType, setSelectedModelType] = useState<string>('all');

  // 切换调度启用状态
  const toggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
    toast.success('调度状态已更新');
  };

  // 手动触发训练
  const triggerTraining = (schedule: Schedule) => {
    toast.info(`正在触发 ${schedule.name} 训练...`);
    setTimeout(() => {
      toast.success(`${schedule.name} 训练已启动`);
    }, 1000);
  };

  // 部署版本
  const deployVersion = (version: ModelVersion) => {
    toast.success(`版本 ${version.version} 已部署`);
  };

  // 回滚版本
  const rollbackVersion = (version: ModelVersion) => {
    toast.success(`已回滚到版本 ${version.version}`);
  };

  // 统计数据
  const stats = {
    totalSchedules: schedules.length,
    enabledSchedules: schedules.filter(s => s.enabled).length,
    totalVersions: versions.length,
    deployedVersions: versions.filter(v => v.status === 'deployed').length,
    avgAccuracy: versions.reduce((sum, v) => sum + v.accuracy, 0) / versions.length
  };

  // 过滤版本
  const filteredVersions = selectedModelType === 'all' 
    ? versions 
    : versions.filter(v => v.modelType === selectedModelType);

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Timer}
          title="模型训练调度"
          description="管理模型自动训练任务、版本和报告"
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">调度器</span>
                <Switch
                  checked={schedulerRunning}
                  onCheckedChange={setSchedulerRunning}
                />
                <Badge variant={schedulerRunning ? 'default' : 'secondary'}>
                  {schedulerRunning ? '运行中' : '已停止'}
                </Badge>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新建调度
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新建训练调度</DialogTitle>
                    <DialogDescription>
                      创建新的模型自动训练任务
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>调度名称</Label>
                      <Input placeholder="输入调度名称" />
                    </div>
                    <div className="space-y-2">
                      <Label>模型类型</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(modelTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cron 表达式</Label>
                      <Input placeholder="0 2 * * *" />
                      <p className="text-xs text-muted-foreground">
                        示例: 0 2 * * * (每天凌晨2点)
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">取消</Button>
                    <Button onClick={() => toast.success('调度已创建')}>创建</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Calendar}
            label="总调度数"
            value={stats.totalSchedules}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            icon={Play}
            label="启用调度"
            value={stats.enabledSchedules}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          <StatCard
            icon={Database}
            label="模型版本"
            value={stats.totalVersions}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
          <StatCard
            icon={Rocket}
            label="已部署"
            value={stats.deployedVersions}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
          />
          <StatCard
            icon={TrendingUp}
            label="平均准确率"
            value={`${(stats.avgAccuracy * 100).toFixed(1)}%`}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-100"
          />
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="schedules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              调度管理
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              模型版本
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              训练报告
            </TabsTrigger>
          </TabsList>

          {/* 调度管理 */}
          <TabsContent value="schedules" className="space-y-4">
            {schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${schedule.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{schedule.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Badge variant="outline">{modelTypeLabels[schedule.modelType]}</Badge>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {schedule.cronExpression}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm">
                        {schedule.lastRunAt && (
                          <p className="text-muted-foreground">
                            上次运行: {new Date(schedule.lastRunAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                        {schedule.nextRunAt && schedule.enabled && (
                          <p className="text-primary">
                            下次运行: {new Date(schedule.nextRunAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={() => toggleSchedule(schedule.id)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerTraining(schedule)}
                          disabled={!schedulerRunning}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          立即执行
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 模型版本 */}
          <TabsContent value="versions" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={selectedModelType} onValueChange={setSelectedModelType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="筛选模型类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {Object.entries(modelTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              {filteredVersions.map(version => {
                const StatusIcon = statusConfig[version.status].icon;
                return (
                  <Card key={version.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold font-mono">v{version.version}</p>
                            <Badge variant="outline" className="mt-1">
                              {modelTypeLabels[version.modelType]}
                            </Badge>
                          </div>
                          <div className="h-12 w-px bg-border" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={statusConfig[version.status].color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig[version.status].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              训练时间: {new Date(version.trainedAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">准确率</p>
                            <p className="text-xl font-bold text-primary">
                              {(version.accuracy * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {version.status === 'completed' && (
                              <Button size="sm" onClick={() => deployVersion(version)}>
                                <Rocket className="w-4 h-4 mr-1" />
                                部署
                              </Button>
                            )}
                            {version.status === 'archived' && (
                              <Button size="sm" variant="outline" onClick={() => rollbackVersion(version)}>
                                <RotateCcw className="w-4 h-4 mr-1" />
                                回滚
                              </Button>
                            )}
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 训练报告 */}
          <TabsContent value="reports" className="space-y-4">
            {reports.map(report => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {modelTypeLabels[report.modelType]} v{report.version} 训练报告
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          生成时间: {new Date(report.generatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">性能提升</p>
                        <p className={`text-lg font-bold ${report.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {report.improvement > 0 ? '+' : ''}{report.improvement.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">数据质量</p>
                        <p className={`text-lg font-bold ${dataQualityConfig[report.dataQuality].color}`}>
                          {dataQualityConfig[report.dataQuality].label}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
  );
}
