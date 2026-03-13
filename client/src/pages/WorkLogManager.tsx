/**
 * 工时打卡记录管理页面 (Work Log Manager)
 * 工人打卡记录追踪与管理
 * v2.5.24
 */

import { useState } from 'react';
import { PageHeader, StatCard } from '@/components/grt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  Play,
  Square,
  User,
  Calendar,
  Timer,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  MapPin,
  MessageSquare,
  TrendingUp,
  Users,
  ClipboardList,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// 打卡状态
type LogStatus = 'Active' | 'Completed' | 'Cancelled';

// 模拟打卡数据
const mockLogs = [
  {
    id: 'LOG-001',
    taskId: 'TASK-003',
    taskName: '清洗舱框架组装',
    workerId: 'W001',
    workerName: '吴卫成', // demo
    startTime: Date.now() - 3 * 60 * 60 * 1000,
    endTime: undefined,
    duration: 3,
    status: 'Active' as LogStatus,
    comments: '正在进行框架焊接',
    location: { latitude: 31.2304, longitude: 121.4737, accuracy: 10 }
  },
  {
    id: 'LOG-002',
    taskId: 'TASK-002',
    taskName: '清洗舱B区管路连接',
    workerId: 'W002',
    workerName: '韩保程', // demo
    startTime: Date.now() - 8 * 60 * 60 * 1000,
    endTime: Date.now() - 1 * 60 * 60 * 1000,
    duration: 7,
    status: 'Completed' as LogStatus,
    comments: '管路连接完成，等待质检',
    location: { latitude: 31.2304, longitude: 121.4737, accuracy: 10 }
  },
  {
    id: 'LOG-003',
    taskId: 'TASK-001',
    taskName: '清洗舱A区管路连接',
    workerId: 'W001',
    workerName: '吴卫成', // demo
    startTime: Date.now() - 24 * 60 * 60 * 1000,
    endTime: Date.now() - 16 * 60 * 60 * 1000,
    duration: 8,
    status: 'Completed' as LogStatus,
    comments: '',
    location: { latitude: 31.2304, longitude: 121.4737, accuracy: 10 }
  },
  {
    id: 'LOG-004',
    taskId: 'TASK-006',
    taskName: '电气系统联调',
    workerId: 'W003',
    workerName: '王磊',
    startTime: Date.now() - 5 * 60 * 60 * 1000,
    endTime: Date.now() - 2 * 60 * 60 * 1000,
    duration: 3,
    status: 'Completed' as LogStatus,
    comments: '联调测试通过',
    location: { latitude: 31.2304, longitude: 121.4737, accuracy: 10 }
  },
  {
    id: 'LOG-005',
    taskId: 'TASK-003',
    taskName: '清洗舱框架组装',
    workerId: 'W004',
    workerName: '赵刚',
    startTime: Date.now() - 2 * 60 * 60 * 1000,
    endTime: undefined,
    duration: 2,
    status: 'Active' as LogStatus,
    comments: '协助框架组装',
    location: { latitude: 31.2304, longitude: 121.4737, accuracy: 10 }
  },
  {
    id: 'LOG-006',
    taskId: 'TASK-002',
    taskName: '清洗舱B区管路连接',
    workerId: 'W005',
    workerName: '陈明',
    startTime: Date.now() - 10 * 60 * 60 * 1000,
    endTime: Date.now() - 9 * 60 * 60 * 1000,
    duration: 1,
    status: 'Cancelled' as LogStatus,
    comments: '取消原因: 任务重新分配',
    location: { latitude: 31.2304, longitude: 121.4737, accuracy: 10 }
  }
];

// 状态配置
const statusConfig: Record<LogStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Active': { label: '进行中', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <Play className="w-4 h-4" /> },
  'Completed': { label: '已完成', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  'Cancelled': { label: '已取消', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle className="w-4 h-4" /> }
};

export default function WorkLogManager() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');

  // 获取唯一员工列表
  const workers = Array.from(new Set(mockLogs.map(l => l.workerId)))
    .map(id => {
      const log = mockLogs.find(l => l.workerId === id);
      return { id, name: log?.workerName || id };
    });

  // 过滤记录
  const filteredLogs = mockLogs.filter(log => {
    if (searchKeyword && !log.taskName.includes(searchKeyword) && !log.workerName.includes(searchKeyword)) {
      return false;
    }
    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }
    if (workerFilter !== 'all' && log.workerId !== workerFilter) {
      return false;
    }
    return true;
  });

  // 统计数据
  const stats = {
    total: mockLogs.length,
    active: mockLogs.filter(l => l.status === 'Active').length,
    completed: mockLogs.filter(l => l.status === 'Completed').length,
    cancelled: mockLogs.filter(l => l.status === 'Cancelled').length,
    totalHours: mockLogs.filter(l => l.status === 'Completed').reduce((sum, l) => sum + l.duration, 0),
    activeWorkers: new Set(mockLogs.filter(l => l.status === 'Active').map(l => l.workerId)).size
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化时长
  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分钟`;
    }
    return `${hours.toFixed(1)}小时`;
  };

  // 计算实时时长
  const getActiveDuration = (startTime: number) => {
    const hours = (Date.now() - startTime) / (1000 * 60 * 60);
    return formatDuration(hours);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Clock}
        title="工时打卡管理"
        description="工人打卡记录追踪与工时统计"
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button size="sm">
              <Play className="w-4 h-4 mr-2" />
              手动打卡
            </Button>
          </>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          icon={ClipboardList}
          label="总记录"
          value={stats.total}
        />
        <StatCard
          icon={Play}
          label="进行中"
          value={stats.active}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="已完成"
          value={stats.completed}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          icon={XCircle}
          label="已取消"
          value={stats.cancelled}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
        />
        <StatCard
          icon={Timer}
          label="总工时"
          value={`${stats.totalHours}h`}
        />
        <StatCard
          icon={Users}
          label="在岗人数"
          value={stats.activeWorkers}
          iconColor="text-yellow-500"
          iconBg="bg-yellow-500/10"
        />
      </div>

      {/* 当前在岗人员 */}
      {stats.active > 0 && (
        <Card className="bg-card/50 border-border border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              当前在岗人员
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {mockLogs.filter(l => l.status === 'Active').map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-green-500/20 text-green-500">
                      {log.workerName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{log.workerName}</p>
                    <p className="text-xs text-muted-foreground">{log.taskName}</p>
                    <p className="text-xs text-green-500">已工作 {getActiveDuration(log.startTime)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-2">
                    <Square className="w-3 h-3 mr-1" />
                    结束
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 过滤器 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索任务名称或员工姓名..."
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
                  <SelectItem value="Active">进行中</SelectItem>
                  <SelectItem value="Completed">已完成</SelectItem>
                  <SelectItem value="Cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>

              <Select value={workerFilter} onValueChange={setWorkerFilter}>
                <SelectTrigger className="w-[120px] bg-background/50">
                  <SelectValue placeholder="员工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部员工</SelectItem>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 打卡记录列表 */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => {
              const statusConf = statusConfig[log.status];

              return (
                <div 
                  key={log.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* 员工头像 */}
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={log.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-muted'}>
                        {log.workerName.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>

                    {/* 记录信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.workerName}</span>
                        <Badge variant="outline" className={statusConf.color}>
                          {statusConf.icon}
                          <span className="ml-1">{statusConf.label}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" />
                          {log.taskName}
                        </span>
                        <span className="font-mono">{log.id}</span>
                      </div>
                    </div>

                    {/* 时间信息 */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatTime(log.startTime)}</span>
                        {log.endTime && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span>{formatTime(log.endTime)}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Timer className="w-3 h-3" />
                        {log.status === 'Active' 
                          ? <span className="text-green-500">{getActiveDuration(log.startTime)}</span>
                          : <span>{formatDuration(log.duration)}</span>
                        }
                      </div>
                    </div>

                    {/* 备注 */}
                    {log.comments && (
                      <div className="max-w-[200px]">
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{log.comments}</span>
                        </div>
                      </div>
                    )}

                    {/* 操作 */}
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">暂无符合条件的打卡记录</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
