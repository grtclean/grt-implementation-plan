import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Calendar,
  Clock,
  Users,
  Building2,
  Globe,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  CalendarClock,
  Target,
  RefreshCw,
  Plus,
  Loader2,
  Cloud,
  CloudOff,
  Download,
  FileSpreadsheet,
  FileText,
  GripVertical,
  AlertCircle,
  MoveHorizontal,
  BarChart3,
  TrendingUp,
  PieChart
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// 部门列表
const DEPARTMENTS = [
  { id: 'Sales', name: '销售部', nameEn: 'Sales' },
  { id: 'Engineering', name: '工程部', nameEn: 'Engineering' },
  { id: 'Production', name: '生产部', nameEn: 'Production' },
  { id: 'Service', name: '服务部', nameEn: 'Service' },
  { id: 'Finance', name: '财务部', nameEn: 'Finance' },
  { id: 'HR', name: '人力资源部', nameEn: 'HR' },
  { id: 'R&D', name: '研发部', nameEn: 'R&D' },
  { id: 'Quality', name: '质量部', nameEn: 'Quality' },
];

// 里程碑类型
const MILESTONES = [
  { 
    id: 'q4-strategy', 
    name: 'Q4战略规划会议', 
    nameEn: 'Q4 Strategy Planning',
    type: 'Q4_Strategy',
    schedule: '12月第一周',
    scheduleEn: 'First week of December',
    description: '制定下一年度战略目标和预算',
    descriptionEn: 'Define next year strategy targets and budget',
    icon: Target,
    color: 'bg-purple-500'
  },
  { 
    id: 'q1-kickoff', 
    name: 'Q1启动会议', 
    nameEn: 'Q1 Kickoff Meeting',
    type: 'Q1_Kickoff',
    schedule: '1月第一周',
    scheduleEn: 'First week of January',
    description: '启动新年度工作，分解目标到各部门',
    descriptionEn: 'Launch new year work, break down targets to departments',
    icon: RefreshCw,
    color: 'bg-green-500'
  },
  { 
    id: 'monthly-review', 
    name: '月度经营评审', 
    nameEn: 'Monthly Business Review',
    type: 'Monthly_Review',
    schedule: '每月最后一个周五',
    scheduleEn: 'Last Friday of each month',
    description: '回顾月度业绩，调整执行策略',
    descriptionEn: 'Review monthly performance, adjust execution strategy',
    icon: CalendarDays,
    color: 'bg-blue-500'
  },
  { 
    id: 'weekly-check', 
    name: '周例会', 
    nameEn: 'Weekly Check-in',
    type: 'Weekly_Check',
    schedule: '每周一上午9:00',
    scheduleEn: 'Every Monday 9:00 AM',
    description: '检查周计划执行情况，协调资源',
    descriptionEn: 'Check weekly plan execution, coordinate resources',
    icon: CalendarClock,
    color: 'bg-orange-500'
  },
];

// 全球假期数据
const GLOBAL_HOLIDAYS = {
  CN: [
    { name: '春节', nameEn: 'Chinese New Year', date: '2026-01-28', duration: 7 },
    { name: '清明节', nameEn: 'Qingming Festival', date: '2026-04-05', duration: 3 },
    { name: '劳动节', nameEn: 'Labor Day', date: '2026-05-01', duration: 5 },
    { name: '端午节', nameEn: 'Dragon Boat Festival', date: '2026-06-14', duration: 3 },
    { name: '中秋节', nameEn: 'Mid-Autumn Festival', date: '2026-09-21', duration: 3 },
    { name: '国庆节', nameEn: 'National Day', date: '2026-10-01', duration: 7 },
  ],
  US: [
    { name: '新年', nameEn: 'New Year', date: '2026-01-01', duration: 1 },
    { name: '马丁路德金日', nameEn: 'MLK Day', date: '2026-01-19', duration: 1 },
    { name: '总统日', nameEn: 'Presidents Day', date: '2026-02-16', duration: 1 },
    { name: '阵亡将士纪念日', nameEn: 'Memorial Day', date: '2026-05-25', duration: 1 },
    { name: '独立日', nameEn: 'Independence Day', date: '2026-07-04', duration: 1 },
    { name: '劳动节', nameEn: 'Labor Day', date: '2026-09-07', duration: 1 },
    { name: '感恩节', nameEn: 'Thanksgiving', date: '2026-11-26', duration: 1 },
    { name: '圣诞节', nameEn: 'Christmas', date: '2026-12-25', duration: 1 },
  ],
  EU: [
    { name: '新年', nameEn: 'New Year', date: '2026-01-01', duration: 1 },
    { name: '复活节', nameEn: 'Easter', date: '2026-04-05', duration: 2 },
    { name: '劳动节', nameEn: 'Labor Day', date: '2026-05-01', duration: 1 },
    { name: '圣诞节', nameEn: 'Christmas', date: '2026-12-25', duration: 2 },
  ],
};

export default function AnnualAgenda() {
  const { language } = useLanguage();
  const isZh = language === 'zh';
  const [selectedYear] = useState(2026);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isAttendeeDialogOpen, setIsAttendeeDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', reason: '' });
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newAttendee, setNewAttendee] = useState({ name: '', email: '', role: 'participant' });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    nameEn: '',
    eventType: 'Custom' as const,
    frequency: 'monthly' as const,
    startTime: '09:00',
    endTime: '10:00',
    department: 'All',
    description: '',
    descriptionEn: '',
  });
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({
    eventCode: '',
    name: '',
    nameEn: '',
    eventType: 'Custom' as const,
    scheduledDate: '',
    startTime: '09:00',
    endTime: '10:00',
    department: 'All',
    attendeeLevel: 'All',
    location: '',
    description: '',
  });

  const utils = trpc.useUtils();

  // 获取日程列表
  const { data: agendaData, isLoading: isLoadingAgenda } = trpc.annualAgenda.list.useQuery({
    year: selectedYear,
    department: selectedDepartment === 'All' ? undefined : selectedDepartment,
    pageSize: 100,
  });

  // 获取统计数据
  const { data: statsData, isLoading: isLoadingStats } = trpc.annualAgenda.getStats.useQuery({
    year: selectedYear,
  });

  // 获取Graph同步状态
  const { data: graphStatus } = trpc.annualAgenda.getGraphSyncStatus.useQuery();

  // 检测冲突（当选择日期时）
  const { data: conflictData } = trpc.annualAgenda.checkConflicts.useQuery(
    { date: rescheduleData.newDate, excludeId: selectedEvent?.id },
    { enabled: !!rescheduleData.newDate && isRescheduleDialogOpen }
  );

  // 生成年度日程
  const generateMutation = trpc.annualAgenda.generateYearAgenda.useMutation({
    onSuccess: (data) => {
      toast.success(isZh ? `成功生成 ${data.created} 个日程` : `Successfully generated ${data.created} events`);
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '生成失败' : 'Generation failed', {
        description: error.message,
      });
    },
  });

  // 同步到Graph日历
  const syncToGraphMutation = trpc.annualAgenda.syncToGraph.useMutation({
    onSuccess: (data) => {
      toast.success(isZh ? `成功同步 ${(data as any).synced} 个日程到日历` : `Successfully synced ${(data as any).synced} events to calendar`);
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getGraphSyncStatus.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '同步失败' : 'Sync failed', {
        description: error.message,
      });
    },
  });

  // 从Graph拉取日程
  const pullFromGraphMutation = trpc.annualAgenda.pullFromGraph.useMutation({
    onSuccess: (data) => {
      toast.success(isZh ? `成功拉取 ${data.imported} 个日程` : `Successfully pulled ${data.imported} events`);
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '拉取失败' : 'Pull failed', {
        description: error.message,
      });
    },
  });

  // 创建日程
  const createMutation = trpc.annualAgenda.create.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '日程创建成功' : 'Event created successfully');
      setIsCreateDialogOpen(false);
      setNewEvent({
        eventCode: '',
        name: '',
        nameEn: '',
        eventType: 'Custom',
        scheduledDate: '',
        startTime: '09:00',
        endTime: '10:00',
        department: 'All',
        attendeeLevel: 'All',
        location: '',
        description: '',
      });
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '创建失败' : 'Creation failed', {
        description: error.message,
      });
    },
  });

  // 更新日程状态
  const updateStatusMutation = trpc.annualAgenda.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '状态更新成功' : 'Status updated successfully');
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '更新失败' : 'Update failed', {
        description: error.message,
      });
    },
  });

  // 调整日程日期
  const rescheduleMutation = trpc.annualAgenda.reschedule.useMutation({
    onSuccess: (data) => {
      toast.success(
        isZh 
          ? `日程已从 ${data.originalDate} 调整到 ${data.newDate}` 
          : `Event rescheduled from ${data.originalDate} to ${data.newDate}`
      );
      setIsRescheduleDialogOpen(false);
      setSelectedEvent(null);
      setRescheduleData({ newDate: '', reason: '' });
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '调整失败' : 'Reschedule failed', {
        description: error.message,
      });
    },
  });

  // 获取模板列表
  const { data: templatesData, isLoading: isLoadingTemplates } = trpc.annualAgenda.listTemplates.useQuery({});
  const templates = templatesData || [];

  // 获取参与人员列表
  const { data: attendeesData, isLoading: isLoadingAttendees } = trpc.annualAgenda.listAttendees.useQuery(
    { eventId: selectedEvent?.id },
    { enabled: !!selectedEvent?.id && isAttendeeDialogOpen }
  );
  const attendees = attendeesData || [];

  // 从模板生成日程
  const generateFromTemplateMutation = trpc.annualAgenda.generateFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(isZh ? `成功生成 ${data.created} 个日程` : `Successfully generated ${data.created} events`);
      utils.annualAgenda.list.invalidate();
      utils.annualAgenda.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '生成失败' : 'Generation failed', {
        description: error.message,
      });
    },
  });

  // 更新模板
  const updateTemplateMutation = trpc.annualAgenda.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '模板更新成功' : 'Template updated successfully');
      utils.annualAgenda.listTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '更新失败' : 'Update failed', {
        description: error.message,
      });
    },
  });

  // 创建模板
  const createTemplateMutation = trpc.annualAgenda.createTemplate.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '模板创建成功' : 'Template created successfully');
      utils.annualAgenda.listTemplates.invalidate();
      setIsTemplateDialogOpen(false);
      setNewTemplate({
        name: '',
        nameEn: '',
        eventType: 'Custom',
        frequency: 'monthly',
        startTime: '09:00',
        endTime: '10:00',
        department: 'All',
        description: '',
        descriptionEn: '',
      });
    },
    onError: (error) => {
      toast.error(isZh ? '创建失败' : 'Create failed', {
        description: error.message,
      });
    },
  });

  // 删除模板
  const deleteTemplateMutation = trpc.annualAgenda.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '模板删除成功' : 'Template deleted successfully');
      utils.annualAgenda.listTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '删除失败' : 'Delete failed', {
        description: error.message,
      });
    },
  });

  // 添加参与人员
  const addAttendeeMutation = trpc.annualAgenda.addAttendee.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '参与人员添加成功' : 'Attendee added successfully');
      utils.annualAgenda.listAttendees.invalidate();
      setNewAttendee({ name: '', email: '', role: 'participant' });
    },
    onError: (error) => {
      toast.error(isZh ? '添加失败' : 'Add failed', {
        description: error.message,
      });
    },
  });

  // 更新参与人员状态
  const updateAttendeeStatusMutation = trpc.annualAgenda.updateAttendeeStatus.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '状态更新成功' : 'Status updated successfully');
      utils.annualAgenda.listAttendees.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '更新失败' : 'Update failed', {
        description: error.message,
      });
    },
  });

  // 删除参与人员
  const removeAttendeeMutation = trpc.annualAgenda.removeAttendee.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '参与人员删除成功' : 'Attendee removed successfully');
      utils.annualAgenda.listAttendees.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '删除失败' : 'Remove failed', {
        description: error.message,
      });
    },
  });

  // 发送邀请
  const sendInvitationsMutation = trpc.annualAgenda.sendInvitations.useMutation({
    onSuccess: (data) => {
      toast.success(isZh ? `已发送 ${data.sent} 份邀请` : `Sent ${data.sent} invitations`);
      utils.annualAgenda.listAttendees.invalidate();
    },
    onError: (error) => {
      toast.error(isZh ? '发送失败' : 'Send failed', {
        description: error.message,
      });
    },
  });

  const agendaItems = agendaData?.items || [];
  const stats = statsData || { total: 0, completed: 0, pending: 0, cancelled: 0, shifted: 0, synced: 0 };

  const handleCreateEvent = () => {
    if (!newEvent.eventCode || !newEvent.name || !newEvent.scheduledDate) {
      toast.error(isZh ? '请填写必填字段' : 'Please fill in required fields');
      return;
    }
    createMutation.mutate(newEvent);
  };

  const handleGenerateAgenda = () => {
    generateMutation.mutate({ year: selectedYear, includeHolidays: true });
  };

  const handleSyncToGraph = () => {
    syncToGraphMutation.mutate({ year: selectedYear } as any);
  };

  const handlePullFromGraph = () => {
    pullFromGraphMutation.mutate({
      userId: 'current',
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    } as any);
  };

  const handleReschedule = () => {
    if (!selectedEvent || !rescheduleData.newDate || !rescheduleData.reason) {
      toast.error(isZh ? '请填写新日期和调整原因' : 'Please fill in new date and reason');
      return;
    }
    rescheduleMutation.mutate({
      id: selectedEvent.id,
      newDate: rescheduleData.newDate,
      reason: rescheduleData.reason,
    });
  };

  const openRescheduleDialog = (event: any) => {
    setSelectedEvent(event);
    setRescheduleData({ 
      newDate: event.scheduled_date?.split('T')[0] || '', 
      reason: '' 
    });
    setIsRescheduleDialogOpen(true);
  };

  // 导出功能 - 使用tRPC客户端
  const { refetch: fetchExportData } = trpc.annualAgenda.exportAgenda.useQuery(
    { year: selectedYear, format: 'json' },
    { enabled: false }
  );

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      // 构建导出数据
      const events = agendaItems.map((e: any) => ({
        eventCode: e.event_code,
        name: e.name,
        nameEn: e.name_en,
        eventType: e.event_type,
        scheduledDate: e.scheduled_date?.split('T')[0] || e.scheduled_date,
        startTime: e.start_time,
        endTime: e.end_time,
        department: e.department,
        attendeeLevel: e.attendee_level,
        location: e.location,
        description: e.description,
        status: e.status,
        isShifted: e.is_shifted,
        shiftReason: e.shift_reason,
        graphSyncStatus: e.graph_sync_status,
      }));

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = [
          '日程编码', '名称', '英文名称', '类型', '日期', '开始时间', '结束时间',
          '部门', '参与级别', '地点', '描述', '状态', '是否调整', '调整原因', '同步状态'
        ];
        const rows = events.map((e: any) => [
          e.eventCode, e.name, e.nameEn || '', e.eventType, e.scheduledDate,
          e.startTime || '', e.endTime || '', e.department, e.attendeeLevel || '',
          e.location || '', e.description || '', e.status, e.isShifted ? '是' : '否',
          e.shiftReason || '', e.graphSyncStatus || ''
        ]);
        content = [headers.join(','), ...rows.map((r: any) => r.map((c: any) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        filename = `annual-agenda-${selectedYear}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        content = JSON.stringify(events, null, 2);
        filename = `annual-agenda-${selectedYear}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(isZh ? `成功导出 ${events.length} 个日程` : `Successfully exported ${events.length} events`);
    } catch (error) {
      toast.error(isZh ? '导出失败' : 'Export failed');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              {isZh ? '年度企业日程' : 'Annual Corporate Agenda'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isZh 
                ? '基于战略2026-2030的年度日程规划与全球假期协调' 
                : 'Annual agenda planning based on Strategy 2026-2030 with global holiday coordination'}
            </p>
          </div>
          <div className="flex gap-2">
            {/* 导出按钮 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  {isZh ? '导出' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {isZh ? '导出为 Excel/CSV' : 'Export as Excel/CSV'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileText className="w-4 h-4 mr-2" />
                  {isZh ? '导出为 JSON' : 'Export as JSON'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              onClick={handleGenerateAgenda}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {isZh ? '生成日程' : 'Generate'}
            </Button>
            <Button 
              variant="outline"
              onClick={handlePullFromGraph}
              disabled={pullFromGraphMutation.isPending}
            >
              {pullFromGraphMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : graphStatus?.isConfigured ? (
                <Cloud className="w-4 h-4 mr-2" />
              ) : (
                <CloudOff className="w-4 h-4 mr-2" />
              )}
              {isZh ? '拉取日历' : 'Pull Calendar'}
            </Button>
            <Button 
              onClick={handleSyncToGraph}
              disabled={syncToGraphMutation.isPending}
            >
              {syncToGraphMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              {isZh ? '同步日历' : 'Sync Calendar'}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {isZh ? '新建日程' : 'New Event'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{isZh ? '创建新日程' : 'Create New Event'}</DialogTitle>
                  <DialogDescription>
                    {isZh ? '填写日程信息，创建后可同步到Microsoft日历' : 'Fill in event details, can sync to Microsoft Calendar after creation'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isZh ? '日程编码' : 'Event Code'} *</Label>
                      <Input
                        value={newEvent.eventCode}
                        onChange={(e) => setNewEvent({ ...newEvent, eventCode: e.target.value })}
                        placeholder="e.g., MTG-2026-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isZh ? '日程类型' : 'Event Type'}</Label>
                      <Select
                        value={newEvent.eventType}
                        onValueChange={(value: any) => setNewEvent({ ...newEvent, eventType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q4_Strategy">Q4战略会议</SelectItem>
                          <SelectItem value="Q1_Kickoff">Q1启动会议</SelectItem>
                          <SelectItem value="Monthly_Review">月度评审</SelectItem>
                          <SelectItem value="Weekly_Check">周例会</SelectItem>
                          <SelectItem value="Department_Meeting">部门会议</SelectItem>
                          <SelectItem value="Training">培训</SelectItem>
                          <SelectItem value="Holiday">假期</SelectItem>
                          <SelectItem value="Custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isZh ? '日程名称' : 'Event Name'} *</Label>
                    <Input
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      placeholder={isZh ? '请输入日程名称' : 'Enter event name'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isZh ? '英文名称' : 'English Name'}</Label>
                    <Input
                      value={newEvent.nameEn}
                      onChange={(e) => setNewEvent({ ...newEvent, nameEn: e.target.value })}
                      placeholder="Enter English name"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{isZh ? '日期' : 'Date'} *</Label>
                      <Input
                        type="date"
                        value={newEvent.scheduledDate}
                        onChange={(e) => setNewEvent({ ...newEvent, scheduledDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isZh ? '开始时间' : 'Start Time'}</Label>
                      <Input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isZh ? '结束时间' : 'End Time'}</Label>
                      <Input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isZh ? '部门' : 'Department'}</Label>
                      <Select
                        value={newEvent.department}
                        onValueChange={(value) => setNewEvent({ ...newEvent, department: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">{isZh ? '全部' : 'All'}</SelectItem>
                          {DEPARTMENTS.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {isZh ? dept.name : dept.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{isZh ? '地点' : 'Location'}</Label>
                      <Input
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder={isZh ? '会议室/地点' : 'Meeting room/Location'}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isZh ? '描述' : 'Description'}</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder={isZh ? '日程描述...' : 'Event description...'}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {isZh ? '取消' : 'Cancel'}
                  </Button>
                  <Button onClick={handleCreateEvent} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isZh ? '创建' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 调整日程对话框 */}
        <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MoveHorizontal className="w-5 h-5 text-primary" />
                {isZh ? '调整日程日期' : 'Reschedule Event'}
              </DialogTitle>
              <DialogDescription>
                {selectedEvent && (
                  <span className="font-medium text-foreground">
                    {isZh ? selectedEvent.name : (selectedEvent.name_en || selectedEvent.name)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isZh ? '原日期' : 'Original Date'}</Label>
                <Input
                  value={selectedEvent?.scheduled_date?.split('T')[0] || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>{isZh ? '新日期' : 'New Date'} *</Label>
                <Input
                  type="date"
                  value={rescheduleData.newDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                />
              </div>
              
              {/* 冲突警告 */}
              {conflictData?.hasConflicts && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{isZh ? '检测到冲突' : 'Conflicts Detected'}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1">
                      {conflictData.conflicts.map((conflict: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          • {conflict.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label>{isZh ? '调整原因' : 'Reason'} *</Label>
                <Textarea
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  placeholder={isZh ? '请说明调整原因...' : 'Please explain the reason...'}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleReschedule} 
                disabled={rescheduleMutation.isPending || !rescheduleData.newDate || !rescheduleData.reason}
              >
                {rescheduleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isZh ? '确认调整' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Graph API 状态提示 */}
        {graphStatus && !graphStatus.isConfigured && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <CloudOff className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-600">
                  {isZh ? 'Microsoft Graph API 未配置' : 'Microsoft Graph API Not Configured'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isZh 
                    ? '请在设置中配置Azure AD凭据以启用日历同步功能' 
                    : 'Please configure Azure AD credentials in settings to enable calendar sync'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '总日程数' : 'Total Events'}</p>
                <p className="text-2xl font-bold">{isLoadingStats ? '-' : stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '已完成' : 'Completed'}</p>
                <p className="text-2xl font-bold">{isLoadingStats ? '-' : stats.completed || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '待进行' : 'Pending'}</p>
                <p className="text-2xl font-bold">{isLoadingStats ? '-' : stats.pending || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '已调整' : 'Shifted'}</p>
                <p className="text-2xl font-bold">{isLoadingStats ? '-' : stats.shifted || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '已同步' : 'Synced'}</p>
                <p className="text-2xl font-bold">{isLoadingStats ? '-' : stats.synced || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="agenda" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              {isZh ? '日历视图' : 'Calendar View'}
            </TabsTrigger>
            <TabsTrigger value="agenda">
              <CalendarDays className="w-4 h-4 mr-2" />
              {isZh ? '日程列表' : 'Agenda List'}
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              {isZh ? '日程模板' : 'Templates'}
            </TabsTrigger>
            <TabsTrigger value="milestones">
              <Target className="w-4 h-4 mr-2" />
              {isZh ? '里程碑概览' : 'Milestones Overview'}
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <Globe className="w-4 h-4 mr-2" />
              {isZh ? '全球假期' : 'Global Holidays'}
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              {isZh ? '部门视图' : 'Department View'}
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <BarChart3 className="w-4 h-4 mr-2" />
              {isZh ? '统计仪表板' : 'Statistics Dashboard'}
            </TabsTrigger>
          </TabsList>

          {/* 日历视图 */}
          <TabsContent value="calendar" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {isZh ? '日历视图' : 'Calendar View'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    >
                      &lt;
                    </Button>
                    <span className="font-medium min-w-[120px] text-center">
                      {currentMonth.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    >
                      &gt;
                    </Button>
                    <div className="ml-4 flex gap-1">
                      <Button
                        variant={calendarView === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCalendarView('month')}
                      >
                        {isZh ? '月' : 'Month'}
                      </Button>
                      <Button
                        variant={calendarView === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCalendarView('week')}
                      >
                        {isZh ? '周' : 'Week'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 月历视图 */}
                {calendarView === 'month' && (
                  <div className="grid grid-cols-7 gap-1">
                    {/* 周标题 */}
                    {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                      <div key={idx} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
                        {isZh ? day : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
                      </div>
                    ))}
                    {/* 日期格子 */}
                    {(() => {
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const cells = [];
                      
                      // 填充前面的空白
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`} className="p-2 min-h-[100px] bg-muted/20"></div>);
                      }
                      
                      // 填充日期
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = agendaItems.filter((e: any) => {
                          const eventDate = e.scheduled_date?.split('T')[0];
                          return eventDate === dateStr;
                        });
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        
                        cells.push(
                          <div 
                            key={day} 
                            className={`p-2 min-h-[100px] border rounded-md hover:bg-accent/50 cursor-pointer transition-colors ${
                              isToday ? 'bg-primary/10 border-primary' : 'bg-card'
                            }`}
                            onClick={() => {
                              setNewEvent({ ...newEvent, scheduledDate: dateStr });
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>{day}</div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map((event: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className={`text-xs p-1 rounded truncate ${
                                    event.event_type === 'Q4_Strategy' ? 'bg-purple-500/20 text-purple-700' :
                                    event.event_type === 'Q1_Kickoff' ? 'bg-blue-500/20 text-blue-700' :
                                    event.event_type === 'Monthly_Review' ? 'bg-green-500/20 text-green-700' :
                                    event.event_type === 'Holiday' ? 'bg-red-500/20 text-red-700' :
                                    'bg-gray-500/20 text-gray-700'
                                  }`}
                                  title={isZh ? event.name : (event.name_en || event.name)}
                                >
                                  {isZh ? event.name : (event.name_en || event.name)}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} {isZh ? '更多' : 'more'}</div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return cells;
                    })()}
                  </div>
                )}
                
                {/* 周视图 */}
                {calendarView === 'week' && (
                  <div className="space-y-2">
                    {(() => {
                      const startOfWeek = new Date(currentMonth);
                      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                      const days = [];
                      
                      for (let i = 0; i < 7; i++) {
                        const date = new Date(startOfWeek);
                        date.setDate(date.getDate() + i);
                        const dateStr = date.toISOString().split('T')[0];
                        const dayEvents = agendaItems.filter((e: any) => {
                          const eventDate = e.scheduled_date?.split('T')[0];
                          return eventDate === dateStr;
                        });
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        
                        days.push(
                          <div key={i} className={`flex border rounded-md overflow-hidden ${isToday ? 'border-primary' : ''}`}>
                            <div className={`w-24 p-3 flex flex-col items-center justify-center ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <div className="text-xs">
                                {date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { weekday: 'short' })}
                              </div>
                              <div className="text-2xl font-bold">{date.getDate()}</div>
                              <div className="text-xs">
                                {date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short' })}
                              </div>
                            </div>
                            <div className="flex-1 p-3 space-y-2">
                              {dayEvents.length === 0 ? (
                                <div 
                                  className="text-sm text-muted-foreground cursor-pointer hover:text-primary"
                                  onClick={() => {
                                    setNewEvent({ ...newEvent, scheduledDate: dateStr });
                                    setIsCreateDialogOpen(true);
                                  }}
                                >
                                  {isZh ? '点击添加日程' : 'Click to add event'}
                                </div>
                              ) : (
                                dayEvents.map((event: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className={`p-2 rounded-md cursor-pointer hover:opacity-80 ${
                                      event.event_type === 'Q4_Strategy' ? 'bg-purple-500/20' :
                                      event.event_type === 'Q1_Kickoff' ? 'bg-blue-500/20' :
                                      event.event_type === 'Monthly_Review' ? 'bg-green-500/20' :
                                      event.event_type === 'Holiday' ? 'bg-red-500/20' :
                                      'bg-gray-500/20'
                                    }`}
                                    onClick={() => {
                                      setSelectedEvent(event);
                                      setIsAttendeeDialogOpen(true);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{isZh ? event.name : (event.name_en || event.name)}</span>
                                      <Badge variant="outline">{event.start_time || '09:00'} - {event.end_time || '10:00'}</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {event.department} • {event.location || (isZh ? '待定' : 'TBD')}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return days;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 日程模板 */}
          <TabsContent value="templates" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {isZh ? '日程模板' : 'Event Templates'}
                  </CardTitle>
                  <Button onClick={() => setIsTemplateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {isZh ? '创建模板' : 'Create Template'}
                  </Button>
                </div>
                <CardDescription>
                  {isZh ? '使用模板快速生成全年重复日程' : 'Use templates to quickly generate recurring events for the whole year'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template: any) => {
                      const frequencyMap: Record<string, { zh: string; en: string; count: number }> = {
                        'daily': { zh: '每天', en: 'Daily', count: 365 },
                        'weekly': { zh: '每周', en: 'Weekly', count: 52 },
                        'biweekly': { zh: '每两周', en: 'Biweekly', count: 26 },
                        'monthly': { zh: '每月', en: 'Monthly', count: 12 },
                        'quarterly': { zh: '每季', en: 'Quarterly', count: 4 },
                        'yearly': { zh: '每年', en: 'Yearly', count: 1 },
                      };
                      const freq = frequencyMap[template.frequency] || { zh: template.frequency, en: template.frequency, count: 1 };
                      const colorMap: Record<string, string> = {
                        'Monthly_Review': 'bg-green-500',
                        'Weekly_Check': 'bg-blue-500',
                        'Q4_Strategy': 'bg-purple-500',
                        'Training': 'bg-cyan-500',
                        'Department_Meeting': 'bg-red-500',
                        'Custom': 'bg-gray-500',
                      };
                      const color = colorMap[template.event_type] || 'bg-gray-500';
                      
                      return (
                        <Card key={template.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                <CardTitle className="text-lg">{isZh ? template.name : (template.name_en || template.name)}</CardTitle>
                              </div>
                              <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                {template.is_active ? (isZh ? '启用' : 'Active') : (isZh ? '禁用' : 'Inactive')}
                              </Badge>
                            </div>
                            <CardDescription>
                              {isZh ? freq.zh : freq.en} • {freq.count} {isZh ? '个日程/年' : 'events/year'}
                            </CardDescription>
                            <CardDescription className="text-xs">
                              {template.start_time} - {template.end_time} • {template.department}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Button 
                              className="w-full" 
                              variant="outline"
                              disabled={generateFromTemplateMutation.isPending}
                              onClick={() => {
                                generateFromTemplateMutation.mutate({ templateId: template.id, year: selectedYear });
                              }}
                            >
                              {generateFromTemplateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                              )}
                              {isZh ? '生成全年日程' : 'Generate Year Events'}
                            </Button>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => {
                                  updateTemplateMutation.mutate({ id: template.id, isActive: !template.is_active });
                                }}
                              >
                                {template.is_active ? (isZh ? '禁用' : 'Disable') : (isZh ? '启用' : 'Enable')}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex-1 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(isZh ? '确定删除该模板？' : 'Delete this template?')) {
                                    deleteTemplateMutation.mutate({ id: template.id });
                                  }
                                }}
                              >
                                {isZh ? '删除' : 'Delete'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 日程列表 */}
          <TabsContent value="agenda" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{isZh ? '2026年度日程' : '2026 Annual Agenda'}</CardTitle>
                  <select 
                    className="px-3 py-1 rounded-md border bg-background"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="All">{isZh ? '全部部门' : 'All Departments'}</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {isZh ? dept.name : dept.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAgenda ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : agendaItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{isZh ? '暂无日程数据' : 'No agenda data'}</p>
                    <p className="text-sm mt-2">
                      {isZh ? '点击"生成日程"按钮创建2026年度日程' : 'Click "Generate" button to create 2026 annual agenda'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>{isZh ? '日期' : 'Date'}</TableHead>
                        <TableHead>{isZh ? '会议名称' : 'Meeting Name'}</TableHead>
                        <TableHead>{isZh ? '类型' : 'Type'}</TableHead>
                        <TableHead>{isZh ? '部门' : 'Department'}</TableHead>
                        <TableHead>{isZh ? '状态' : 'Status'}</TableHead>
                        <TableHead>{isZh ? '同步' : 'Sync'}</TableHead>
                        <TableHead>{isZh ? '操作' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendaItems.map((item: any) => (
                        <TableRow key={item.id} className={item.is_shifted ? 'bg-yellow-500/5' : ''}>
                          <TableCell>
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell className="font-mono">
                            {item.scheduled_date?.split('T')[0]}
                            {item.is_shifted && (
                              <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-500">
                                {isZh ? '已调整' : 'Shifted'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {isZh ? item.name : (item.name_en || item.name)}
                            </span>
                            {item.shift_reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {isZh ? '原因: ' : 'Reason: '}{item.shift_reason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.event_type}</Badge>
                          </TableCell>
                          <TableCell>{item.department}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={item.status === 'completed' ? 'default' : 'secondary'}
                              className={item.status === 'completed' ? 'bg-green-500' : ''}
                            >
                              {item.status === 'completed' 
                                ? (isZh ? '已完成' : 'Completed')
                                : item.status === 'cancelled'
                                ? (isZh ? '已取消' : 'Cancelled')
                                : item.status === 'shifted'
                                ? (isZh ? '已调整' : 'Shifted')
                                : (isZh ? '待进行' : 'Pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.graph_sync_status === 'synced' ? (
                              <Cloud className="w-4 h-4 text-green-500" />
                            ) : item.graph_sync_status === 'failed' ? (
                              <CloudOff className="w-4 h-4 text-red-500" />
                            ) : (
                              <CloudOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openRescheduleDialog(item)}
                                title={isZh ? '调整日期' : 'Reschedule'}
                              >
                                <MoveHorizontal className="w-4 h-4" />
                              </Button>
                              {item.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'completed' })}
                                  title={isZh ? '标记完成' : 'Mark Complete'}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 里程碑概览 */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MILESTONES.map((milestone) => {
                const Icon = milestone.icon;
                return (
                  <Card key={milestone.id} className="bg-card border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${milestone.color} text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {isZh ? milestone.name : milestone.nameEn}
                          </CardTitle>
                          <CardDescription>
                            {isZh ? milestone.schedule : milestone.scheduleEn}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {isZh ? milestone.description : milestone.descriptionEn}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline">{milestone.type}</Badge>
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {isZh ? '全员参与' : 'All Departments'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 全球假期 */}
          <TabsContent value="holidays" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(GLOBAL_HOLIDAYS).map(([region, holidays]) => (
                <Card key={region} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      {region === 'CN' ? (isZh ? '中国' : 'China') :
                       region === 'US' ? (isZh ? '美国' : 'United States') :
                       (isZh ? '欧洲' : 'Europe')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {holidays.map((holiday, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="font-medium">{isZh ? holiday.name : holiday.nameEn}</p>
                            <p className="text-xs text-muted-foreground">{holiday.date}</p>
                          </div>
                          <Badge variant="outline">
                            {holiday.duration} {isZh ? '天' : 'days'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 部门视图 */}
          <TabsContent value="departments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEPARTMENTS.map((dept) => (
                <Card key={dept.id} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {isZh ? dept.name : dept.nameEn}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isZh ? '周例会' : 'Weekly'}</span>
                        <span className="font-medium">52</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isZh ? '月度评审' : 'Monthly'}</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isZh ? '战略会议' : 'Strategic'}</span>
                        <span className="font-medium">2</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 统计仪表板 */}
          <TabsContent value="statistics" className="space-y-6">
            {/* KPI概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {isZh ? '完成率' : 'Completion Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {statsData ? `${Math.round((statsData.completed / (statsData.total || 1)) * 100)}%` : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statsData ? `${statsData.completed} / ${statsData.total} ${isZh ? '已完成' : 'completed'}` : ''}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    {isZh ? '延期率' : 'Delay Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {statsData ? `${Math.round((statsData.delayed / (statsData.total || 1)) * 100)}%` : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statsData ? `${statsData.delayed} ${isZh ? '个日程延期' : 'events delayed'}` : ''}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {isZh ? '本月日程' : 'This Month'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {statsData?.thisMonth || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isZh ? '个待完成日程' : 'events pending'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    {isZh ? '同步率' : 'Sync Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {(graphStatus as any)?.syncedCount && statsData?.total
                      ? `${Math.round(((graphStatus as any).syncedCount / statsData.total) * 100)}%`
                      : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isZh ? '已同步到日历' : 'synced to calendar'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 部门参与度分析 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {isZh ? '部门参与度分析' : 'Department Participation Analysis'}
                </CardTitle>
                <CardDescription>
                  {isZh ? '各部门日程完成情况和参与度统计' : 'Event completion and participation statistics by department'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DEPARTMENTS.map(dept => {
                    const deptEvents = agendaItems.filter((e: any) => e.department === dept.id || e.department === 'All');
                    const deptCompleted = deptEvents.filter((e: any) => e.status === 'Completed').length;
                    const completionRate = deptEvents.length > 0 ? Math.round((deptCompleted / deptEvents.length) * 100) : 0;
                    return (
                      <div key={dept.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (dept as any).color }} />
                            <span className="font-medium">{isZh ? dept.name : dept.nameEn}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {deptEvents.length} {isZh ? '个日程' : 'events'}
                            </span>
                            <Badge variant={completionRate >= 80 ? 'default' : completionRate >= 50 ? 'secondary' : 'destructive'}>
                              {completionRate}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 月度趋势图 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {isZh ? '月度日程分布' : 'Monthly Event Distribution'}
                </CardTitle>
                <CardDescription>
                  {isZh ? '全年各月日程数量和完成情况' : 'Event count and completion status by month'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthEvents = agendaItems.filter((e: any) => {
                      const eventDate = new Date(e.scheduled_date);
                      return eventDate.getMonth() === i;
                    });
                    const monthCompleted = monthEvents.filter((e: any) => e.status === 'Completed').length;
                    const maxEvents = Math.max(...Array.from({ length: 12 }, (_, j) =>
                      agendaItems.filter((e: any) => new Date(e.scheduled_date).getMonth() === j).length
                    ), 1);
                    const height = Math.max((monthEvents.length / maxEvents) * 100, 10);
                    const completedHeight = monthEvents.length > 0 ? (monthCompleted / monthEvents.length) * height : 0;
                    
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="relative w-full h-24 flex items-end">
                          <div 
                            className="w-full bg-muted rounded-t transition-all"
                            style={{ height: `${height}%` }}
                          >
                            <div 
                              className="w-full bg-primary rounded-t transition-all"
                              style={{ height: `${completedHeight}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {i + 1}{isZh ? '月' : ''}
                        </span>
                        <span className="text-xs font-medium">{monthEvents.length}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded" />
                    <span>{isZh ? '已完成' : 'Completed'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted rounded" />
                    <span>{isZh ? '未完成' : 'Pending'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 事件类型分布 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    {isZh ? '事件类型分布' : 'Event Type Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { type: 'Monthly_Review', label: isZh ? '月度评审' : 'Monthly Review', color: 'bg-green-500' },
                      { type: 'Q4_Strategy', label: isZh ? '季度战略' : 'Quarterly Strategy', color: 'bg-purple-500' },
                      { type: 'Q1_Kickoff', label: isZh ? 'Q1启动' : 'Q1 Kickoff', color: 'bg-blue-500' },
                      { type: 'Holiday', label: isZh ? '假期' : 'Holiday', color: 'bg-red-500' },
                      { type: 'Custom', label: isZh ? '自定义' : 'Custom', color: 'bg-gray-500' },
                    ].map(item => {
                      const count = agendaItems.filter((e: any) => e.event_type === item.type).length;
                      const percentage = agendaItems.length > 0 ? Math.round((count / agendaItems.length) * 100) : 0;
                      return (
                        <div key={item.type} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    {isZh ? '状态分布' : 'Status Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { status: 'Completed', label: isZh ? '已完成' : 'Completed', color: 'bg-green-500' },
                      { status: 'Scheduled', label: isZh ? '已计划' : 'Scheduled', color: 'bg-blue-500' },
                      { status: 'In_Progress', label: isZh ? '进行中' : 'In Progress', color: 'bg-yellow-500' },
                      { status: 'Cancelled', label: isZh ? '已取消' : 'Cancelled', color: 'bg-gray-500' },
                      { status: 'Delayed', label: isZh ? '已延期' : 'Delayed', color: 'bg-red-500' },
                    ].map(item => {
                      const count = agendaItems.filter((e: any) => e.status === item.status).length;
                      const percentage = agendaItems.length > 0 ? Math.round((count / agendaItems.length) * 100) : 0;
                      return (
                        <div key={item.status} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="flex-1 text-sm">{item.label}</span>
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 参与人员管理对话框 */}
        <Dialog open={isAttendeeDialogOpen} onOpenChange={setIsAttendeeDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {isZh ? '参与人员管理' : 'Attendee Management'}
              </DialogTitle>
              <DialogDescription>
                {selectedEvent && (
                  <span className="font-medium text-foreground">
                    {isZh ? selectedEvent.name : (selectedEvent.name_en || selectedEvent.name)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 日程信息 */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">{isZh ? '日期' : 'Date'}</span>
                  <p className="font-medium">{selectedEvent?.scheduled_date?.split('T')[0]}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{isZh ? '时间' : 'Time'}</span>
                  <p className="font-medium">{selectedEvent?.start_time || '09:00'} - {selectedEvent?.end_time || '10:00'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{isZh ? '部门' : 'Department'}</span>
                  <p className="font-medium">{selectedEvent?.department}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{isZh ? '地点' : 'Location'}</span>
                  <p className="font-medium">{selectedEvent?.location || (isZh ? '待定' : 'TBD')}</p>
                </div>
              </div>

              {/* 参与人员列表 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{isZh ? '参与人员' : 'Attendees'}</Label>
                  <Badge variant="outline">
                    {isZh ? '共 3 人' : '3 attendees'}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {/* 示例参与人员 */}
                  {[
                    { name: '张三', email: 'zhangsan@grt.com', role: 'organizer', status: 'accepted' },
                    { name: '李四', email: 'lisi@grt.com', role: 'required', status: 'pending' },
                    { name: '王五', email: 'wangwu@grt.com', role: 'optional', status: 'declined' },
                  ].map((attendee, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {attendee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{attendee.name}</p>
                          <p className="text-xs text-muted-foreground">{attendee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={attendee.role === 'organizer' ? 'default' : 'outline'} className="text-xs">
                          {attendee.role === 'organizer' ? (isZh ? '组织者' : 'Organizer') :
                           attendee.role === 'required' ? (isZh ? '必需' : 'Required') :
                           (isZh ? '可选' : 'Optional')}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            attendee.status === 'accepted' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                            attendee.status === 'declined' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                            'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                          }`}
                        >
                          {attendee.status === 'accepted' ? (isZh ? '已接受' : 'Accepted') :
                           attendee.status === 'declined' ? (isZh ? '已拒绝' : 'Declined') :
                           (isZh ? '待确认' : 'Pending')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 添加参与人员 */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">{isZh ? '添加参与人员' : 'Add Attendee'}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={isZh ? '姓名' : 'Name'}
                    value={newAttendee.name}
                    onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder={isZh ? '邮箱' : 'Email'}
                    value={newAttendee.email}
                    onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={newAttendee.role}
                    onValueChange={(value) => setNewAttendee({ ...newAttendee, role: value })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">{isZh ? '必需' : 'Required'}</SelectItem>
                      <SelectItem value="optional">{isZh ? '可选' : 'Optional'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    disabled={addAttendeeMutation.isPending}
                    onClick={() => {
                      if (newAttendee.name && selectedEvent?.id) {
                        addAttendeeMutation.mutate({
                          eventId: selectedEvent.id,
                          name: newAttendee.name,
                          email: newAttendee.email || undefined,
                          role: newAttendee.role as 'organizer' | 'required' | 'optional',
                        });
                      }
                    }}
                  >
                    {addAttendeeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAttendeeDialogOpen(false)}>
                {isZh ? '关闭' : 'Close'}
              </Button>
              <Button 
                disabled={sendInvitationsMutation.isPending || attendees.length === 0}
                onClick={() => {
                  if (selectedEvent?.id) {
                    sendInvitationsMutation.mutate({ eventId: selectedEvent.id });
                  }
                }}
              >
                {sendInvitationsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4 mr-2" />
                )}
                {isZh ? '发送邀请' : 'Send Invites'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 模板创建对话框 */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {editingTemplate ? (isZh ? '编辑日程模板' : 'Edit Event Template') : (isZh ? '创建日程模板' : 'Create Event Template')}
              </DialogTitle>
              <DialogDescription>
                {isZh ? '创建可复用的日程模板，快速生成全年重复日程' : 'Create reusable templates to quickly generate recurring events'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isZh ? '模板名称 (中文)' : 'Template Name (Chinese)'}</Label>
                  <Input 
                    placeholder={isZh ? '例如：月度评审' : 'e.g., 月度评审'}
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isZh ? '模板名称 (英文)' : 'Template Name (English)'}</Label>
                  <Input 
                    placeholder={isZh ? '例如：Monthly Review' : 'e.g., Monthly Review'}
                    value={newTemplate.nameEn}
                    onChange={(e) => setNewTemplate({ ...newTemplate, nameEn: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isZh ? '事件类型' : 'Event Type'}</Label>
                  <Select 
                    value={newTemplate.eventType}
                    onValueChange={(value: any) => setNewTemplate({ ...newTemplate, eventType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly_Review">{isZh ? '月度评审' : 'Monthly Review'}</SelectItem>
                      <SelectItem value="Weekly_Check">{isZh ? '周例会' : 'Weekly Check'}</SelectItem>
                      <SelectItem value="Q4_Strategy">{isZh ? '季度战略' : 'Quarterly Strategy'}</SelectItem>
                      <SelectItem value="Training">{isZh ? '培训' : 'Training'}</SelectItem>
                      <SelectItem value="Department_Meeting">{isZh ? '部门会议' : 'Department Meeting'}</SelectItem>
                      <SelectItem value="Custom">{isZh ? '自定义' : 'Custom'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isZh ? '重复频率' : 'Frequency'}</Label>
                  <Select 
                    value={newTemplate.frequency}
                    onValueChange={(value: any) => setNewTemplate({ ...newTemplate, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{isZh ? '每天' : 'Daily'}</SelectItem>
                      <SelectItem value="weekly">{isZh ? '每周' : 'Weekly'}</SelectItem>
                      <SelectItem value="biweekly">{isZh ? '每两周' : 'Bi-weekly'}</SelectItem>
                      <SelectItem value="monthly">{isZh ? '每月' : 'Monthly'}</SelectItem>
                      <SelectItem value="quarterly">{isZh ? '每季' : 'Quarterly'}</SelectItem>
                      <SelectItem value="yearly">{isZh ? '每年' : 'Yearly'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isZh ? '开始时间' : 'Start Time'}</Label>
                  <Input 
                    type="time" 
                    value={newTemplate.startTime}
                    onChange={(e) => setNewTemplate({ ...newTemplate, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isZh ? '结束时间' : 'End Time'}</Label>
                  <Input 
                    type="time" 
                    value={newTemplate.endTime}
                    onChange={(e) => setNewTemplate({ ...newTemplate, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isZh ? '部门' : 'Department'}</Label>
                <Select 
                  value={newTemplate.department}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{isZh ? '全部门' : 'All Departments'}</SelectItem>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {isZh ? dept.name : dept.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isZh ? '描述 (中文)' : 'Description (Chinese)'}</Label>
                  <Textarea 
                    placeholder={isZh ? '模板描述...' : 'Template description...'} 
                    rows={2}
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isZh ? '描述 (英文)' : 'Description (English)'}</Label>
                  <Textarea 
                    placeholder={isZh ? 'Template description...' : 'Template description...'} 
                    rows={2}
                    value={newTemplate.descriptionEn}
                    onChange={(e) => setNewTemplate({ ...newTemplate, descriptionEn: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsTemplateDialogOpen(false);
                setEditingTemplate(null);
                setNewTemplate({
                  name: '',
                  nameEn: '',
                  eventType: 'Custom',
                  frequency: 'monthly',
                  startTime: '09:00',
                  endTime: '10:00',
                  department: 'All',
                  description: '',
                  descriptionEn: '',
                });
              }}>
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button 
                disabled={createTemplateMutation.isPending || !newTemplate.name}
                onClick={() => {
                  createTemplateMutation.mutate({
                    templateCode: `TPL-${Date.now()}`,
                    name: newTemplate.name,
                    nameEn: newTemplate.nameEn || newTemplate.name,
                    eventType: newTemplate.eventType,
                    frequency: newTemplate.frequency,
                    startTime: newTemplate.startTime,
                    endTime: newTemplate.endTime,
                    department: newTemplate.department,
                    description: newTemplate.descriptionEn ? `${newTemplate.description}\n---\n${newTemplate.descriptionEn}` : newTemplate.description,
                  } as any);
                }}
              >
                {createTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTemplate ? (isZh ? '保存修改' : 'Save Changes') : (isZh ? '创建模板' : 'Create Template')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
