/**
 * 保养预警仪表盘组件
 * Maintenance Alert Dashboard Component
 * 
 * 功能：
 * - 即将到期设备展示
 * - 逾期设备预警
 * - 预警统计图表
 * - 快捷操作入口
 */

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Wrench,
  Bell,
  ArrowRight,
  RefreshCw,
  Filter,
  Download,
  Mail,
  Phone,
  Building,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';

// 设备保养状态
export type MaintenanceStatus = 'normal' | 'upcoming' | 'due' | 'overdue';

// 设备信息接口
export interface Equipment {
  id: string;
  serialNumber: string;
  model: string;
  clientId: string;
  clientName: string;
  clientContact?: string;
  clientPhone?: string;
  lastMaintenanceDate?: Date;
  nextDueDate: Date;
  maintenanceCycle: number; // 天数
  status: 'active' | 'inactive' | 'scrapped';
  location?: string;
  assignedTo?: string;
}

// 预警统计接口
export interface AlertStats {
  total: number;
  normal: number;
  upcoming: number;
  due: number;
  overdue: number;
  completedThisMonth: number;
  pendingTasks: number;
}

// 预警配置
export interface AlertConfig {
  upcomingDays: number; // 即将到期天数阈值
  dueDays: number; // 到期天数阈值
}

interface MaintenanceAlertDashboardProps {
  equipments?: Equipment[];
  alertConfig?: AlertConfig;
  onCreateTask?: (equipmentId: string) => void;
  onViewDetails?: (equipmentId: string) => void;
  onSendReminder?: (equipmentId: string) => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

// 默认配置
const defaultAlertConfig: AlertConfig = {
  upcomingDays: 30,
  dueDays: 7,
};

// 模拟设备数据
const generateMockEquipments = (): Equipment[] => {
  const models = ['GRT-UC-3000', 'GRT-UC-5000', 'GRT-SC-2000', 'GRT-HC-1000', 'GRT-MC-4000'];
  const clients = [
    { id: 'c1', name: '上海汽车零部件有限公司', contact: '张经理', phone: '13800138001' },
    { id: 'c2', name: '苏州精密制造有限公司', contact: '李工', phone: '13800138002' },
    { id: 'c3', name: '无锡电子科技有限公司', contact: '王主管', phone: '13800138003' },
    { id: 'c4', name: '杭州机械设备有限公司', contact: '陈经理', phone: '13800138004' },
    { id: 'c5', name: '南京航空材料有限公司', contact: '刘工', phone: '13800138005' },
  ];
  
  const equipments: Equipment[] = [];
  const now = new Date();
  
  for (let i = 0; i < 25; i++) {
    const client = clients[i % clients.length];
    const daysOffset = Math.floor(Math.random() * 60) - 15; // -15 到 45 天
    const nextDueDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    
    equipments.push({
      id: `eq_${i + 1}`,
      serialNumber: `SN${String(i + 1).padStart(6, '0')}`,
      model: models[i % models.length],
      clientId: client.id,
      clientName: client.name,
      clientContact: client.contact,
      clientPhone: client.phone,
      lastMaintenanceDate: new Date(now.getTime() - (180 + Math.random() * 30) * 24 * 60 * 60 * 1000),
      nextDueDate,
      maintenanceCycle: 180,
      status: 'active',
      location: `${['上海', '苏州', '无锡', '杭州', '南京'][i % 5]}工厂`,
      assignedTo: `工程师${(i % 5) + 1}`,
    });
  }
  
  return equipments;
};

export default function MaintenanceAlertDashboard({
  equipments: propEquipments,
  alertConfig = defaultAlertConfig,
  onCreateTask,
  onViewDetails,
  onSendReminder,
  onExport,
  onRefresh,
}: MaintenanceAlertDashboardProps) {
  const { t } = useLanguage();
  const [equipments, setEquipments] = useState<Equipment[]>(propEquipments || []);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStatus, setSelectedStatus] = useState<MaintenanceStatus | 'all'>('all');

  // 初始化模拟数据
  useEffect(() => {
    if (!propEquipments) {
      setEquipments(generateMockEquipments());
    }
  }, [propEquipments]);

  // 计算设备保养状态
  const getMaintenanceStatus = (equipment: Equipment): MaintenanceStatus => {
    const now = new Date();
    const daysUntilDue = Math.ceil(
      (equipment.nextDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= alertConfig.dueDays) return 'due';
    if (daysUntilDue <= alertConfig.upcomingDays) return 'upcoming';
    return 'normal';
  };

  // 计算统计数据
  const stats = useMemo<AlertStats>(() => {
    const activeEquipments = equipments.filter(e => e.status === 'active');
    let normal = 0, upcoming = 0, due = 0, overdue = 0;
    
    for (const eq of activeEquipments) {
      const status = getMaintenanceStatus(eq);
      switch (status) {
        case 'normal': normal++; break;
        case 'upcoming': upcoming++; break;
        case 'due': due++; break;
        case 'overdue': overdue++; break;
      }
    }
    
    return {
      total: activeEquipments.length,
      normal,
      upcoming,
      due,
      overdue,
      completedThisMonth: Math.floor(Math.random() * 10) + 5,
      pendingTasks: due + overdue,
    };
  }, [equipments, alertConfig]);

  // 过滤设备列表
  const filteredEquipments = useMemo(() => {
    return equipments
      .filter(e => e.status === 'active')
      .filter(e => {
        if (selectedStatus === 'all') return true;
        return getMaintenanceStatus(e) === selectedStatus;
      })
      .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
  }, [equipments, selectedStatus]);

  // 刷新数据
  const handleRefresh = async () => {
    setIsLoading(true);
    if (onRefresh) {
      await onRefresh();
    } else {
      // 模拟刷新
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEquipments(generateMockEquipments());
    }
    setIsLoading(false);
  };

  // 状态徽章
  const StatusBadge = ({ status }: { status: MaintenanceStatus }) => {
    const config = {
      normal: { label: '正常', variant: 'secondary' as const, icon: CheckCircle },
      upcoming: { label: '即将到期', variant: 'default' as const, icon: Clock },
      due: { label: '待保养', variant: 'outline' as const, icon: AlertTriangle },
      overdue: { label: '已逾期', variant: 'destructive' as const, icon: XCircle },
    };
    const { label, variant, icon: Icon } = config[status];
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // 统计卡片
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    trend,
    onClick 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    trend?: { value: number; isUp: boolean };
    onClick?: () => void;
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${onClick ? 'hover:border-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
                {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 设备列表项
  const EquipmentItem = ({ equipment }: { equipment: Equipment }) => {
    const status = getMaintenanceStatus(equipment);
    const daysUntilDue = Math.ceil(
      (equipment.nextDueDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
    );
    
    return (
      <div className="p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{equipment.model}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground">
              SN: {equipment.serialNumber}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                {equipment.clientName}
              </span>
              {equipment.clientContact && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {equipment.clientContact}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span>
                保养到期: {equipment.nextDueDate.toLocaleDateString()}
                {daysUntilDue < 0 
                  ? <span className="text-destructive ml-1">(已逾期 {Math.abs(daysUntilDue)} 天)</span>
                  : daysUntilDue <= 7 
                    ? <span className="text-yellow-500 ml-1">(还剩 {daysUntilDue} 天)</span>
                    : <span className="text-muted-foreground ml-1">(还剩 {daysUntilDue} 天)</span>
                }
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCreateTask?.(equipment.id)}
            >
              <Wrench className="w-3 h-3 mr-1" />
              {t("maintenance.createTask")}
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onSendReminder?.(equipment.id)}
            >
              <Mail className="w-3 h-3 mr-1" />
              {t("maintenance.sendReminder")}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("maintenance.title")}</h2>
          <p className="text-muted-foreground">{t("maintenance.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" />
            {t("maintenance.export")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {t("maintenance.refresh")}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t("maintenance.overdue")}
          value={stats.overdue}
          icon={XCircle}
          color="bg-red-500"
          onClick={() => setSelectedStatus('overdue')}
        />
        <StatCard
          title={t("maintenance.due")}
          value={stats.due}
          icon={AlertTriangle}
          color="bg-yellow-500"
          onClick={() => setSelectedStatus('due')}
        />
        <StatCard
          title={t("maintenance.upcoming")}
          value={stats.upcoming}
          icon={Clock}
          color="bg-blue-500"
          onClick={() => setSelectedStatus('upcoming')}
        />
        <StatCard
          title={t("maintenance.normal")}
          value={stats.normal}
          icon={CheckCircle}
          color="bg-green-500"
          onClick={() => setSelectedStatus('normal')}
        />
      </div>

      {/* 进度条 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("maintenance.completionRate")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("maintenance.completedThisMonth")}</span>
              <span>{stats.completedThisMonth} / {stats.completedThisMonth + stats.pendingTasks}</span>
            </div>
            <Progress 
              value={(stats.completedThisMonth / (stats.completedThisMonth + stats.pendingTasks)) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("maintenance.overview")}</TabsTrigger>
          <TabsTrigger value="list">{t("maintenance.equipmentList")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("maintenance.calendarView")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 紧急预警 */}
          {(stats.overdue > 0 || stats.due > 0) && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  {t("maintenance.urgentAlert")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" dangerouslySetInnerHTML={{
                  __html: t("maintenance.urgentAlertText")
                    .replace("{overdue}", `<span class="font-bold text-destructive">${stats.overdue}</span>`)
                    .replace("{due}", `<span class="font-bold text-yellow-500">${stats.due}</span>`)
                }} />
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setSelectedStatus('overdue')}
                >
                  {t("maintenance.handleNow")}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("maintenance.batchCreateTask")}</p>
                  <p className="text-xs text-muted-foreground">{t("maintenance.batchCreateTaskDesc")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("maintenance.sendReminder")}</p>
                  <p className="text-xs text-muted-foreground">{t("maintenance.sendReminderDesc")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("maintenance.scheduling")}</p>
                  <p className="text-xs text-muted-foreground">{t("maintenance.schedulingDesc")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("maintenance.viewReport")}</p>
                  <p className="text-xs text-muted-foreground">{t("maintenance.viewReportDesc")}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 最近预警设备 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("maintenance.needAttention")}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('list')}>
                  {t("maintenance.viewAll")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {filteredEquipments
                  .filter(e => ['overdue', 'due', 'upcoming'].includes(getMaintenanceStatus(e)))
                  .slice(0, 5)
                  .map(equipment => (
                    <EquipmentItem key={equipment.id} equipment={equipment} />
                  ))}
                {filteredEquipments.filter(e => ['overdue', 'due', 'upcoming'].includes(getMaintenanceStatus(e))).length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>{t("maintenance.allNormal")}</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("maintenance.equipmentList")}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('all')}
                  >
                    {t("maintenance.all")} ({stats.total})
                  </Button>
                  <Button
                    variant={selectedStatus === 'overdue' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('overdue')}
                  >
                    {t("maintenance.overdue")} ({stats.overdue})
                  </Button>
                  <Button
                    variant={selectedStatus === 'due' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('due')}
                  >
                    {t("maintenance.due")} ({stats.due})
                  </Button>
                  <Button
                    variant={selectedStatus === 'upcoming' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus('upcoming')}
                  >
                    {t("maintenance.upcoming")} ({stats.upcoming})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredEquipments.map(equipment => (
                  <EquipmentItem key={equipment.id} equipment={equipment} />
                ))}
                {filteredEquipments.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("maintenance.noEquipment")}</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("maintenance.maintenanceCalendar")}</CardTitle>
              <CardDescription>{t("maintenance.calendarDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 简化的日历视图 */}
              <div className="grid grid-cols-7 gap-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - date.getDay() + i);
                  const equipmentsOnDate = filteredEquipments.filter(e => 
                    e.nextDueDate.toDateString() === date.toDateString()
                  );
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={i}
                      className={`p-2 min-h-[80px] border rounded-md ${
                        isToday ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>
                        {date.getDate()}
                      </div>
                      {equipmentsOnDate.slice(0, 2).map(eq => (
                        <div
                          key={eq.id}
                          className={`text-xs truncate mt-1 px-1 rounded ${
                            getMaintenanceStatus(eq) === 'overdue' ? 'bg-red-100 text-red-700' :
                            getMaintenanceStatus(eq) === 'due' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {eq.model}
                        </div>
                      ))}
                      {equipmentsOnDate.length > 2 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          +{equipmentsOnDate.length - 2} 更多
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 导出类型
export type { MaintenanceAlertDashboardProps };
