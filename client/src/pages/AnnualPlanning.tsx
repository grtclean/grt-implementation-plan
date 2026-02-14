import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3,
  Calendar, 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  Copy, 
  FileText, 
  GraduationCap, 
  Link2,
  Loader2, 
  PartyPopper, 
  Plus, 
  RefreshCw, 
  Settings, 
  Sparkles, 
  Trash2,
  Users 
} from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";

// Category icons and colors
const categoryConfig = {
  culture: { icon: PartyPopper, color: "bg-pink-500/20 text-pink-400", label: "企业文化" },
  training: { icon: GraduationCap, color: "bg-blue-500/20 text-blue-400", label: "培训计划" },
  meeting: { icon: Users, color: "bg-green-500/20 text-green-400", label: "会议安排" },
  event: { icon: Calendar, color: "bg-purple-500/20 text-purple-400", label: "活动事件" },
  other: { icon: FileText, color: "bg-gray-500/20 text-gray-400", label: "其他" },
};

const statusConfig = {
  pending: { color: "bg-yellow-500/20 text-yellow-400", label: "待开始" },
  in_progress: { color: "bg-blue-500/20 text-blue-400", label: "进行中" },
  completed: { color: "bg-green-500/20 text-green-400", label: "已完成" },
  cancelled: { color: "bg-red-500/20 text-red-400", label: "已取消" },
};

const frequencyLabels: Record<string, string> = {
  once: "一次性",
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
  quarterly: "每季度",
  yearly: "每年",
};

export default function AnnualPlanning() {
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewConfigDialog, setShowNewConfigDialog] = useState(false);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Form states
  const [newConfig, setNewConfig] = useState({
    year: new Date().getFullYear(),
    version: "v1.0",
    versionName: "",
    notes: "",
  });
  
  const [newItem, setNewItem] = useState({
    category: "other" as "culture" | "training" | "meeting" | "event" | "other",
    name: "",
    description: "",
    tasks: "",
    frequency: "once" as "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    month: 1,
    responsibleUserName: "",
  });
  
  const [copyConfig, setCopyConfig] = useState({
    targetYear: new Date().getFullYear() + 1,
    resetStatus: true,
    adjustDates: true,
    newVersionName: "",
  });
  
  // Dependency management state
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [selectedItemForDependency, setSelectedItemForDependency] = useState<any>(null);
  const [newDependency, setNewDependency] = useState({
    sourceItemId: 0,
    dependencyType: "finish_to_start" as "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish",
    lagDays: 0,
  });
  
  // Dependency line interaction state
  const [selectedDependencyId, setSelectedDependencyId] = useState<number | null>(null);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<number | null>(null);
  const [dependencyDragState, setDependencyDragState] = useState<{
    isDragging: boolean;
    sourceItemId: number | null;
    sourceX: number;
    sourceY: number;
    currentX: number;
    currentY: number;
  }>({
    isDragging: false,
    sourceItemId: null,
    sourceX: 0,
    sourceY: 0,
    currentX: 0,
    currentY: 0,
  });
  
  // Critical path display state
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  
  // Drag state for Gantt chart
  const [dragState, setDragState] = useState<{
    itemId: number | null;
    type: 'move' | 'resize-left' | 'resize-right' | null;
    startX: number;
    originalStart: number;
    originalWidth: number;
    newStart: number;
    newWidth: number;
  }>({
    itemId: null,
    type: null,
    startX: 0,
    originalStart: 0,
    originalWidth: 0,
    newStart: 0,
    newWidth: 0,
  });
  
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: configs, isLoading: configsLoading, refetch: refetchConfigs } = (trpc.annualPlanning.getConfigs as any).useQuery({
    year: selectedYear,
  });
  
  const { data: activeConfig } = (trpc.annualPlanning.getActiveConfig as any).useQuery(
    { year: selectedYear },
    { enabled: !!selectedYear }
  );
  
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = (trpc.annualPlanning.getItems as any).useQuery(
    {
      configId: selectedConfigId || 0,
      ...(categoryFilter !== "all" && { category: categoryFilter as any }),
      ...(statusFilter !== "all" && { status: statusFilter as any }),
    },
    { enabled: !!selectedConfigId }
  );
  
  const { data: updateLogs } = (trpc.annualPlanning.getUpdateLogs as any).useQuery(
    { configId: selectedConfigId || 0 },
    { enabled: !!selectedConfigId }
  );
  
  // Dependencies query for Gantt chart
  const { data: dependencies, refetch: refetchDependencies } = (trpc.planningDependency as any).getAll.useQuery(
    { configId: selectedConfigId || 0 },
    { enabled: !!selectedConfigId }
  );
  
  // Critical path query
  const { data: criticalPathData, refetch: refetchCriticalPath } = (trpc.planningDependency as any).calculateCriticalPath.useQuery(
    { configId: selectedConfigId || 0 },
    { enabled: !!selectedConfigId && showCriticalPath }
  );

  // Mutations
  const createConfigMutation = trpc.annualPlanning.createConfig.useMutation({
    onSuccess: () => {
      toast.success("年度规划配置创建成功");
      setShowNewConfigDialog(false);
      refetchConfigs();
      setNewConfig({ year: new Date().getFullYear(), version: "v1.0", versionName: "", notes: "" });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
  
  const activateConfigMutation = trpc.annualPlanning.activateConfig.useMutation({
    onSuccess: () => {
      toast.success("配置已激活");
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`激活失败: ${error.message}`);
    },
  });
  
  const createItemMutation = trpc.annualPlanning.createItem.useMutation({
    onSuccess: () => {
      toast.success("规划项目创建成功");
      setShowNewItemDialog(false);
      refetchItems();
      setNewItem({
        category: "other",
        name: "",
        description: "",
        tasks: "",
        frequency: "once",
        month: 1,
        responsibleUserName: "",
      });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
  
  const updateItemMutation = trpc.annualPlanning.updateItem.useMutation({
    onSuccess: () => {
      toast.success("状态更新成功");
      refetchItems();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
  
  // Dependency mutations
  const addDependencyMutation = (trpc.planningDependency as any).add.useMutation({
    onSuccess: () => {
      toast.success("依赖关系添加成功");
      refetchDependencies();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });
  
  const removeDependencyMutation = (trpc.planningDependency as any).remove.useMutation({
    onSuccess: () => {
      toast.success("依赖关系已删除");
      refetchDependencies();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
  
  const copyToNewYearMutation = trpc.annualPlanning.copyToNewYear.useMutation({
    onSuccess: (result) => {
      toast.success(`成功复制 ${(result as any)?.copiedItemsCount || 0} 个项目到 ${copyConfig.targetYear} 年`);
      setShowCopyDialog(false);
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`复制失败: ${error.message}`);
    },
  });
  
  const initSampleDataMutation = trpc.annualPlanning.initSampleData.useMutation({
    onSuccess: (result) => {
      toast.success(`初始化成功: 创建了 ${(result as any).itemsCount || 0} 个示例项目`);
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  // Set selected config when configs load
  if (configs && configs.length > 0 && !selectedConfigId) {
    const active = configs.find(c => c.status === "active");
    if (active) {
      setSelectedConfigId(active.id);
    } else {
      setSelectedConfigId(configs[0].id);
    }
  }

  // Group items by month
  const itemsByMonth = items?.reduce((acc, item) => {
    const month = item.month || 0;
    if (!acc[month]) acc[month] = [];
    acc[month].push(item);
    return acc;
  }, {} as Record<number, typeof items>) || {};

  // Statistics
  const stats = {
    total: items?.length || 0,
    pending: items?.filter(i => i.status === "pending").length || 0,
    inProgress: items?.filter(i => i.status === "in_progress").length || 0,
    completed: items?.filter(i => i.status === "completed").length || 0,
    byCategory: {
      culture: items?.filter(i => i.category === "culture").length || 0,
      training: items?.filter(i => i.category === "training").length || 0,
      meeting: items?.filter(i => i.category === "meeting").length || 0,
      event: items?.filter(i => i.category === "event").length || 0,
      other: items?.filter(i => i.category === "other").length || 0,
    },
  };

  const monthNames = ["", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

  // Drag handlers for Gantt chart
  const handleDragStart = useCallback((e: React.DragEvent, item: any, barStart: number, barWidth: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({
      itemId: item.id,
      type: 'move',
      startX: e.clientX,
      originalStart: barStart,
      originalWidth: barWidth,
      newStart: barStart,
      newWidth: barWidth,
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent, item: any) => {
    if (!dragState.itemId || e.clientX === 0) return;
    
    const container = ganttContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.offsetWidth - 192; // Subtract project name column
    const deltaX = e.clientX - dragState.startX;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    let newStart = dragState.originalStart + deltaPercent;
    newStart = Math.max(0, Math.min(100 - dragState.originalWidth, newStart));
    
    setDragState(prev => ({
      ...prev,
      newStart,
    }));
  }, [dragState.itemId, dragState.startX, dragState.originalStart, dragState.originalWidth]);

  const handleDragEnd = useCallback((e: React.DragEvent, item: any) => {
    if (!dragState.itemId) return;
    
    // Calculate new month from percentage
    const newStartMonth = Math.round((dragState.newStart / 100) * 12) + 1;
    const monthSpan = Math.round((dragState.newWidth / 100) * 12);
    const newEndMonth = Math.min(12, newStartMonth + monthSpan - 1);
    
    // Update item with new dates
    if (newStartMonth !== Math.round((dragState.originalStart / 100) * 12) + 1) {
      updateItemMutation.mutate({
        id: item.id,
        month: newStartMonth,
        startDate: new Date(selectedYear, newStartMonth - 1, 1),
        endDate: new Date(selectedYear, newEndMonth - 1, 28),
      });
      toast.success(`已调整 "${item.name}" 到 ${monthNames[newStartMonth]} - ${monthNames[newEndMonth]}`);
    }
    
    // Reset drag state
    setDragState({
      itemId: null,
      type: null,
      startX: 0,
      originalStart: 0,
      originalWidth: 0,
      newStart: 0,
      newWidth: 0,
    });
  }, [dragState, selectedYear, updateItemMutation, monthNames]);

  const handleResizeStart = useCallback((e: React.MouseEvent, item: any, side: 'left' | 'right', barStart: number, barWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const container = ganttContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.offsetWidth - 192;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      if (side === 'left') {
        let newStart = barStart + deltaPercent;
        let newWidth = barWidth - deltaPercent;
        newStart = Math.max(0, Math.min(barStart + barWidth - 8.33, newStart));
        newWidth = Math.max(8.33, barWidth - (newStart - barStart));
        setDragState(prev => ({ ...prev, itemId: item.id, type: 'resize-left', newStart, newWidth }));
      } else {
        let newWidth = barWidth + deltaPercent;
        newWidth = Math.max(8.33, Math.min(100 - barStart, newWidth));
        setDragState(prev => ({ ...prev, itemId: item.id, type: 'resize-right', newStart: barStart, newWidth }));
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Calculate new months
      const finalStart = dragState.newStart || barStart;
      const finalWidth = dragState.newWidth || barWidth;
      const newStartMonth = Math.round((finalStart / 100) * 12) + 1;
      const monthSpan = Math.round((finalWidth / 100) * 12);
      const newEndMonth = Math.min(12, newStartMonth + monthSpan - 1);
      
      // Update item
      updateItemMutation.mutate({
        id: item.id,
        month: newStartMonth,
        startDate: new Date(selectedYear, newStartMonth - 1, 1),
        endDate: new Date(selectedYear, newEndMonth - 1, 28),
      });
      toast.success(`已调整 "${item.name}" 时间范围`);
      
      // Reset drag state
      setDragState({
        itemId: null,
        type: null,
        startX: 0,
        originalStart: 0,
        originalWidth: 0,
        newStart: 0,
        newWidth: 0,
      });
    };
    
    setDragState({
      itemId: item.id,
      type: side === 'left' ? 'resize-left' : 'resize-right',
      startX: e.clientX,
      originalStart: barStart,
      originalWidth: barWidth,
      newStart: barStart,
      newWidth: barWidth,
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dragState, selectedYear, updateItemMutation]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={CalendarDays}
          title="年度规划管理"
          description="管理企业年度规划、培训计划、会议安排和文化活动"
          actions={<>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => initSampleDataMutation.mutate()}>
              <Sparkles className="w-4 h-4 mr-2" />
              初始化示例数据
            </Button>
            <Dialog open={showNewConfigDialog} onOpenChange={setShowNewConfigDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新建年度配置
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建年度规划配置</DialogTitle>
                  <DialogDescription>创建新的年度规划版本</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>年度</Label>
                      <Input
                        type="number"
                        value={newConfig.year}
                        onChange={(e) => setNewConfig({ ...newConfig, year: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>版本号</Label>
                      <Input
                        value={newConfig.version}
                        onChange={(e) => setNewConfig({ ...newConfig, version: e.target.value })}
                        placeholder="v1.0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>版本名称</Label>
                    <Input
                      value={newConfig.versionName}
                      onChange={(e) => setNewConfig({ ...newConfig, versionName: e.target.value })}
                      placeholder="2026年度运营计划"
                    />
                  </div>
                  <div>
                    <Label>备注</Label>
                    <Textarea
                      value={newConfig.notes}
                      onChange={(e) => setNewConfig({ ...newConfig, notes: e.target.value })}
                      placeholder="版本说明..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewConfigDialog(false)}>取消</Button>
                  <Button 
                    onClick={() => createConfigMutation.mutate(newConfig)}
                    disabled={createConfigMutation.isPending}
                  >
                    {createConfigMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    创建
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>}
        />

        {/* Config Selector */}
        {configs && configs.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-card/50 rounded-lg border border-border">
            <Label className="text-muted-foreground">当前配置:</Label>
            <Select 
              value={selectedConfigId?.toString() || ""} 
              onValueChange={(v) => setSelectedConfigId(parseInt(v))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="选择配置版本" />
              </SelectTrigger>
              <SelectContent>
                {configs.map(config => (
                  <SelectItem key={config.id} value={config.id.toString()}>
                    {config.versionName || `${config.year}年 ${config.version}`}
                    {config.status === "active" && " (当前激活)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedConfigId && configs.find(c => c.id === selectedConfigId)?.status !== "active" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => activateConfigMutation.mutate({ id: selectedConfigId })}
                disabled={activateConfigMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                激活此版本
              </Button>
            )}
            <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!selectedConfigId}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制到新年度
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>复制到新年度</DialogTitle>
                  <DialogDescription>将当前年度规划复制到新的年度</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>目标年度</Label>
                    <Input
                      type="number"
                      value={copyConfig.targetYear}
                      onChange={(e) => setCopyConfig({ ...copyConfig, targetYear: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>新版本名称</Label>
                    <Input
                      value={copyConfig.newVersionName}
                      onChange={(e) => setCopyConfig({ ...copyConfig, newVersionName: e.target.value })}
                      placeholder={`${copyConfig.targetYear}年度运营计划`}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={copyConfig.resetStatus}
                        onChange={(e) => setCopyConfig({ ...copyConfig, resetStatus: e.target.checked })}
                      />
                      重置状态为待开始
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={copyConfig.adjustDates}
                        onChange={(e) => setCopyConfig({ ...copyConfig, adjustDates: e.target.checked })}
                      />
                      自动调整日期
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCopyDialog(false)}>取消</Button>
                  <Button 
                    onClick={() => selectedConfigId && copyToNewYearMutation.mutate({
                      sourceConfigId: selectedConfigId,
                      ...copyConfig,
                    })}
                    disabled={copyToNewYearMutation.isPending}
                  >
                    {copyToNewYearMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    复制
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="calendar">日历视图</TabsTrigger>
            <TabsTrigger value="items">项目列表</TabsTrigger>
            <TabsTrigger value="logs">更新日志</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={FileText} label="总项目数" value={stats.total} iconColor="text-primary" iconBg="bg-primary/10" />
              <StatCard icon={Clock} label="待开始" value={stats.pending} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
              <StatCard icon={RefreshCw} label="进行中" value={stats.inProgress} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
              <StatCard icon={CheckCircle2} label="已完成" value={stats.completed} iconColor="text-green-500" iconBg="bg-green-500/10" />
            </div>

            {/* Category Distribution */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>类别分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = stats.byCategory[key as keyof typeof stats.byCategory];
                    return (
                      <div key={key} className="flex items-center gap-3 p-4 rounded-lg bg-background/50">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{config.label}</p>
                          <p className="text-xl font-bold">{count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Items */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>最近项目</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("items")}>
                  查看全部
                </Button>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : items && items.length > 0 ? (
                  <div className="space-y-3">
                    {items.slice(0, 5).map(item => {
                      const catConfig = categoryConfig[item.category as keyof typeof categoryConfig];
                      const statConfig = statusConfig[item.status as keyof typeof statusConfig];
                      const Icon = catConfig?.icon || FileText;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${catConfig?.color || "bg-gray-500/20"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.month ? `${monthNames[item.month]}` : "未指定月份"} · {frequencyLabels[item.frequency]}
                              </p>
                            </div>
                          </div>
                          <Badge className={statConfig?.color}>{statConfig?.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无项目数据，请先创建年度规划配置并添加项目
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            {/* Gantt Chart View */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      {selectedYear} 年度甘特图
                    </CardTitle>
                    <CardDescription>项目时间跨度和依赖关系视图</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showCriticalPath ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowCriticalPath(!showCriticalPath);
                        if (!showCriticalPath) {
                          refetchCriticalPath();
                        }
                      }}
                      className="text-xs"
                    >
                      <BarChart3 className="w-3 h-3 mr-1" />
                      关键路径
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      共 {items?.length || 0} 个项目
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={ganttContainerRef} className="relative overflow-x-auto">
                  {/* Dependency Lines SVG Layer */}
                  <svg 
                    className="absolute inset-0 z-10" 
                    style={{ minWidth: '1000px', height: items ? `${items.length * 36 + 40}px` : '200px' }}
                    onClick={(e) => {
                      // Click on empty area to deselect
                      if ((e.target as SVGElement).tagName === 'svg') {
                        setSelectedDependencyId(null);
                      }
                    }}
                  >
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
                      </marker>
                      <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                      </marker>
                      <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                      </marker>
                    </defs>
                    
                    {/* Drag preview line */}
                    {dependencyDragState.isDragging && (
                      <line
                        x1={dependencyDragState.sourceX}
                        y1={dependencyDragState.sourceY}
                        x2={dependencyDragState.currentX}
                        y2={dependencyDragState.currentY}
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.8"
                      />
                    )}
                    
                    {dependencies && items && dependencies.map((dep: any) => {
                      const sourceItem = items.find((i: any) => i.id === dep.sourceItemId);
                      const targetItem = items.find((i: any) => i.id === dep.targetItemId);
                      if (!sourceItem || !targetItem) return null;
                      
                      const sourceIndex = items.findIndex((i: any) => i.id === dep.sourceItemId);
                      const targetIndex = items.findIndex((i: any) => i.id === dep.targetItemId);
                      
                      const sourceEndMonth = sourceItem.endDate 
                        ? new Date(sourceItem.endDate).getMonth() + 1 
                        : (sourceItem.month || 1);
                      const targetStartMonth = targetItem.startDate 
                        ? new Date(targetItem.startDate).getMonth() + 1 
                        : (targetItem.month || 1);
                      
                      // Calculate positions (accounting for 192px name column)
                      const nameColWidth = 192;
                      const chartWidth = 808; // 1000 - 192
                      const x1 = nameColWidth + (sourceEndMonth / 12) * chartWidth;
                      const y1 = 40 + sourceIndex * 36 + 18; // 40px header + row height + center
                      const x2 = nameColWidth + ((targetStartMonth - 1) / 12) * chartWidth;
                      const y2 = 40 + targetIndex * 36 + 18;
                      
                      // Draw curved path
                      const midX = (x1 + x2) / 2;
                      const controlY1 = y1 + (y2 > y1 ? 20 : -20);
                      const controlY2 = y2 + (y2 > y1 ? -20 : 20);
                      
                      const isSelected = selectedDependencyId === dep.id;
                      const isHovered = hoveredDependencyId === dep.id;
                      const strokeColor = isSelected ? '#22c55e' : isHovered ? '#3b82f6' : '#f97316';
                      const markerEnd = isSelected ? 'url(#arrowhead-selected)' : isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)';
                      
                      const dependencyTypeLabels: Record<string, string> = {
                        'finish_to_start': '完成后开始 (FS)',
                        'start_to_start': '同时开始 (SS)',
                        'finish_to_finish': '同时完成 (FF)',
                        'start_to_finish': '开始后完成 (SF)',
                      };
                      
                      return (
                        <g 
                          key={dep.id}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredDependencyId(dep.id)}
                          onMouseLeave={() => setHoveredDependencyId(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDependencyId(isSelected ? null : dep.id);
                          }}
                        >
                          {/* Invisible wider path for easier clicking */}
                          <path
                            d={`M ${x1} ${y1} C ${midX} ${controlY1}, ${midX} ${controlY2}, ${x2} ${y2}`}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="12"
                          />
                          {/* Visible path */}
                          <path
                            d={`M ${x1} ${y1} C ${midX} ${controlY1}, ${midX} ${controlY2}, ${x2} ${y2}`}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={isSelected || isHovered ? 3 : 2}
                            strokeDasharray={dep.dependencyType === 'finish_to_start' ? '0' : '4,4'}
                            markerEnd={markerEnd}
                            opacity={isSelected || isHovered ? 1 : 0.7}
                            className="transition-all duration-200"
                          />
                          {/* Lag days label */}
                          {dep.lagDays !== 0 && (
                            <text
                              x={midX}
                              y={(y1 + y2) / 2 - 5}
                              fontSize="10"
                              fill={strokeColor}
                              textAnchor="middle"
                            >
                              {dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`}
                            </text>
                          )}
                          {/* Selected state tooltip */}
                          {isSelected && (
                            <foreignObject
                              x={midX - 80}
                              y={(y1 + y2) / 2 + 10}
                              width="160"
                              height="80"
                            >
                              <div className="bg-popover border border-border rounded-md shadow-lg p-2 text-xs">
                                <div className="font-medium mb-1">{sourceItem.name} → {targetItem.name}</div>
                                <div className="text-muted-foreground mb-2">{dependencyTypeLabels[dep.dependencyType] || dep.dependencyType}</div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 w-full text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDependencyMutation.mutate({ id: dep.id });
                                    setSelectedDependencyId(null);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  删除依赖
                                </Button>
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  {/* Month Headers */}
                  <div className="flex border-b border-border pb-2 mb-2 min-w-[1000px]">
                    <div className="w-48 flex-shrink-0 font-medium text-sm">项目名称</div>
                    <div className="flex-1 grid grid-cols-12 gap-0">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                        const currentMonth = new Date().getMonth() + 1;
                        const isCurrentMonth = month === currentMonth && selectedYear === new Date().getFullYear();
                        return (
                          <div 
                            key={month} 
                            className={`text-center text-xs font-medium py-1 ${isCurrentMonth ? "bg-primary/10 text-primary rounded-sm" : "text-muted-foreground"}`}
                          >
                            {monthNames[month]?.slice(0, 2)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Gantt Bars */}
                  <div className="space-y-1 min-w-[1000px]">
                    {items && items.length > 0 ? (
                      items.map((item, index) => {
                        const catConfig = categoryConfig[item.category as keyof typeof categoryConfig];
                        const statConfig = statusConfig[item.status as keyof typeof statusConfig];
                        const Icon = catConfig?.icon || FileText;
                        
                        // Calculate bar position and width based on startDate/endDate or month
                        const startMonth = item.startDate 
                          ? new Date(item.startDate).getMonth() + 1 
                          : (item.month || 1);
                        const endMonth = item.endDate 
                          ? new Date(item.endDate).getMonth() + 1 
                          : startMonth;
                        const barStart = ((startMonth - 1) / 12) * 100;
                        const barWidth = ((endMonth - startMonth + 1) / 12) * 100;
                        
                        // Progress calculation (mock based on status)
                        const progress = item.status === "completed" ? 100 : 
                                        item.status === "in_progress" ? 50 : 0;
                        
                        // Check if item is on critical path
                        const isOnCriticalPath = showCriticalPath && criticalPathData?.criticalPath?.includes(item.id);
                        const criticalPathItem = criticalPathData?.items?.find(cp => cp.id === item.id);
                        
                        return (
                          <div key={item.id} className="flex items-center group hover:bg-muted/30 rounded-sm transition-colors">
                            {/* Project Name */}
                            <div className="w-48 flex-shrink-0 flex items-center gap-2 py-2 px-2">
                              <Icon className={`w-4 h-4 flex-shrink-0 ${catConfig?.color?.split(" ")[1] || "text-gray-400"}`} />
                              <span className="text-sm truncate flex-1" title={item.name}>{item.name}</span>
                              {/* Add Dependency Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  setSelectedItemForDependency(item);
                                  setNewDependency({ sourceItemId: 0, dependencyType: "finish_to_start", lagDays: 0 });
                                  setShowDependencyDialog(true);
                                }}
                                title="设置前置任务"
                              >
                                <Settings className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {/* Gantt Bar Area */}
                            <div className="flex-1 relative h-8">
                              {/* Background Grid */}
                              <div className="absolute inset-0 grid grid-cols-12 gap-0">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                                  const currentMonth = new Date().getMonth() + 1;
                                  const isCurrentMonth = month === currentMonth && selectedYear === new Date().getFullYear();
                                  return (
                                    <div 
                                      key={month} 
                                      className={`border-r border-border/30 ${isCurrentMonth ? "bg-primary/5" : ""}`}
                                    />
                                  );
                                })}
                              </div>
                              
                              {/* Gantt Bar - Draggable */}
                              <div 
                                className={`absolute top-1 h-6 rounded-sm transition-all cursor-grab active:cursor-grabbing group-hover:ring-2 group-hover:ring-primary/30 ${
                                  isOnCriticalPath
                                    ? "bg-red-500/60 ring-2 ring-red-500"
                                    : item.status === "completed" 
                                    ? "bg-green-500/40" 
                                    : item.status === "cancelled"
                                    ? "bg-red-500/40"
                                    : catConfig?.color?.split(" ")[0] || "bg-gray-500/40"
                                } ${dragState.itemId === item.id ? "ring-2 ring-primary shadow-lg z-20" : ""}${isOnCriticalPath ? " animate-pulse" : ""}`}
                                style={{ 
                                  left: dragState.itemId === item.id ? `${dragState.newStart}%` : `${barStart}%`, 
                                  width: dragState.itemId === item.id ? `${dragState.newWidth}%` : `${Math.max(barWidth, 8.33)}%`,
                                }}
                                title={`${item.name}: ${monthNames[startMonth]} - ${monthNames[endMonth]}${isOnCriticalPath ? '\n❗ 关键路径任务' : ''}${criticalPathItem ? `\n总浮动: ${criticalPathItem.totalFloat}天 | 自由浮动: ${criticalPathItem.freeFloat}天` : ''}\n拖拽调整时间`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item, barStart, barWidth)}
                                onDrag={(e) => handleDrag(e, item)}
                                onDragEnd={(e) => handleDragEnd(e, item)}
                              >
                                {/* Left Resize Handle */}
                                <div 
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-sm"
                                  onMouseDown={(e) => handleResizeStart(e, item, 'left', barStart, barWidth)}
                                />
                                
                                {/* Right Resize Handle */}
                                <div 
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-sm"
                                  onMouseDown={(e) => handleResizeStart(e, item, 'right', barStart, barWidth)}
                                />
                                
                                {/* Dependency Connection Point - Right Side */}
                                <div 
                                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center"
                                  title="拖拽创建依赖关系"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const container = ganttContainerRef.current;
                                    if (!container) return;
                                    
                                    const rect = container.getBoundingClientRect();
                                    const nameColWidth = 192;
                                    const chartWidth = container.offsetWidth - nameColWidth;
                                    const endMonth = item.endDate 
                                      ? new Date(item.endDate).getMonth() + 1 
                                      : (item.month || 1);
                                    const sourceX = nameColWidth + (endMonth / 12) * chartWidth;
                                    const sourceY = 40 + index * 36 + 18;
                                    
                                    setDependencyDragState({
                                      isDragging: true,
                                      sourceItemId: item.id,
                                      sourceX,
                                      sourceY,
                                      currentX: sourceX,
                                      currentY: sourceY,
                                    });
                                    
                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                      const currentX = moveEvent.clientX - rect.left + container.scrollLeft;
                                      const currentY = moveEvent.clientY - rect.top + container.scrollTop;
                                      setDependencyDragState(prev => ({
                                        ...prev,
                                        currentX,
                                        currentY,
                                      }));
                                    };
                                    
                                    const handleMouseUp = (upEvent: MouseEvent) => {
                                      document.removeEventListener('mousemove', handleMouseMove);
                                      document.removeEventListener('mouseup', handleMouseUp);
                                      
                                      // Find target item based on drop position
                                      const dropY = upEvent.clientY - rect.top + container.scrollTop;
                                      const targetIndex = Math.floor((dropY - 40) / 36);
                                      
                                      if (items && targetIndex >= 0 && targetIndex < items.length) {
                                        const targetItem = items[targetIndex];
                                        if (targetItem && targetItem.id !== item.id && selectedConfigId) {
                                          addDependencyMutation.mutate({
                                            configId: selectedConfigId,
                                            sourceItemId: item.id,
                                            targetItemId: targetItem.id,
                                            dependencyType: 'finish_to_start',
                                            lagDays: 0,
                                          });
                                        }
                                      }
                                      
                                      setDependencyDragState({
                                        isDragging: false,
                                        sourceItemId: null,
                                        sourceX: 0,
                                        sourceY: 0,
                                        currentX: 0,
                                        currentY: 0,
                                      });
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                  }}
                                >
                                  <Link2 className="w-2 h-2" />
                                </div>
                                
                                {/* Progress Bar */}
                                {progress > 0 && progress < 100 && (
                                  <div 
                                    className="absolute inset-y-0 left-0 bg-green-500/60 rounded-l-sm"
                                    style={{ width: `${progress}%` }}
                                  />
                                )}
                                
                                {/* Bar Label */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-medium truncate px-1">
                                    {item.status === "completed" && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                    {barWidth >= 16.66 ? item.name : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>暂无规划项目</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Today Marker */}
                  {selectedYear === new Date().getFullYear() && items && items.length > 0 && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ 
                        left: `calc(192px + ${((new Date().getMonth() + new Date().getDate() / 30) / 12) * 100}% * (100% - 192px) / 100%)`,
                      }}
                    >
                      <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-sm bg-green-500/40" />
                    <span>已完成</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-sm bg-blue-500/20" />
                    <span>进行中/待开始</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-sm bg-red-500/40" />
                    <span>已取消</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-0.5 h-3 bg-red-500" />
                    <span>今天</span>
                  </div>
                  {showCriticalPath && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <div className="w-3 h-3 rounded-sm bg-red-500/60 ring-1 ring-red-500 animate-pulse" />
                      <span>关键路径 ({criticalPathData?.criticalPath?.length || 0}个任务)</span>
                    </div>
                  )}
                  {showCriticalPath && criticalPathData && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                      <Clock className="w-3 h-3" />
                      <span>项目总工期: {criticalPathData.projectDuration}天</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Timeline View */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  {selectedYear} 年度时间线
                </CardTitle>
                <CardDescription>全年规划项目时间分布视图</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Month Headers */}
                  <div className="grid grid-cols-12 gap-1 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                      <div key={month} className="text-center text-xs font-medium text-muted-foreground">
                        {monthNames[month]?.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  
                  {/* Timeline Bars */}
                  <div className="space-y-2">
                    {Object.entries(categoryConfig).map(([category, config]) => {
                      const categoryItems = items?.filter(item => item.category === category) || [];
                      if (categoryItems.length === 0) return null;
                      
                      const Icon = config.icon;
                      return (
                        <div key={category} className="relative">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${config.color.split(" ")[1]}`} />
                            <span className="text-sm font-medium">{config.label}</span>
                            <Badge variant="outline" className="text-xs">{categoryItems.length}</Badge>
                          </div>
                          <div className="grid grid-cols-12 gap-1 h-8 bg-muted/30 rounded-sm">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                              const monthItems = categoryItems.filter(item => item.month === month);
                              const hasItems = monthItems.length > 0;
                              const completedCount = monthItems.filter(item => item.status === "completed").length;
                              const allCompleted = hasItems && completedCount === monthItems.length;
                              
                              return (
                                <div 
                                  key={month} 
                                  className={`relative rounded-sm transition-colors cursor-pointer group ${
                                    hasItems 
                                      ? allCompleted 
                                        ? "bg-green-500/30 hover:bg-green-500/50" 
                                        : `${config.color.split(" ")[0]} hover:opacity-80`
                                      : "hover:bg-muted/50"
                                  }`}
                                  title={hasItems ? `${monthNames[month]}: ${monthItems.map(i => i.name).join(", ")}` : monthNames[month]}
                                >
                                  {hasItems && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-bold">{monthItems.length}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-green-500/30" />
                      <span>已完成</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-blue-500/20" />
                      <span>进行中/待开始</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-sm bg-muted/30" />
                      <span>无项目</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Monthly Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                const monthItems = itemsByMonth[month] || [];
                const completedCount = monthItems.filter(i => i.status === "completed").length;
                const currentMonth = new Date().getMonth() + 1;
                const isCurrentMonth = month === currentMonth && selectedYear === new Date().getFullYear();
                
                return (
                  <Card key={month} className={`bg-card/50 border-border transition-all ${
                    isCurrentMonth ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10" : ""
                  }`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {monthNames[month]}
                          {isCurrentMonth && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                              当前
                            </Badge>
                          )}
                        </CardTitle>
                        {monthItems.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {completedCount}/{monthItems.length}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {monthItems.length > 0 
                          ? `${completedCount} 已完成 / ${monthItems.length} 总计`
                          : "暂无规划项目"
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {monthItems.length > 0 ? (
                        <div className="space-y-2">
                          {monthItems.slice(0, 4).map(item => {
                            const catConfig = categoryConfig[item.category as keyof typeof categoryConfig];
                            const statConfig = statusConfig[item.status as keyof typeof statusConfig];
                            const Icon = catConfig?.icon || FileText;
                            return (
                              <div key={item.id} className="flex items-center gap-2 text-sm group">
                                <Icon className={`w-3 h-3 flex-shrink-0 ${catConfig?.color?.split(" ")[1] || "text-gray-400"}`} />
                                <span className={`truncate flex-1 ${
                                  item.status === "completed" ? "line-through text-muted-foreground" : ""
                                }`}>
                                  {item.name}
                                </span>
                                {item.status === "completed" && (
                                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                          {monthItems.length > 4 && (
                            <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                              +{monthItems.length - 4} 更多项目
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">暂无项目</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="类别筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类别</SelectItem>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedConfigId}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加项目
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>添加规划项目</DialogTitle>
                    <DialogDescription>添加新的年度规划项目</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>类别</Label>
                        <Select 
                          value={newItem.category} 
                          onValueChange={(v) => setNewItem({ ...newItem, category: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>月份</Label>
                        <Select 
                          value={newItem.month.toString()} 
                          onValueChange={(v) => setNewItem({ ...newItem, month: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                              <SelectItem key={m} value={m.toString()}>{monthNames[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>项目名称</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="例如：年度安全培训"
                      />
                    </div>
                    <div>
                      <Label>描述</Label>
                      <Textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="项目详细描述..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>频率</Label>
                        <Select 
                          value={newItem.frequency} 
                          onValueChange={(v) => setNewItem({ ...newItem, frequency: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(frequencyLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>负责人</Label>
                        <Input
                          value={newItem.responsibleUserName}
                          onChange={(e) => setNewItem({ ...newItem, responsibleUserName: e.target.value })}
                          placeholder="负责人姓名"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>取消</Button>
                    <Button 
                      onClick={() => selectedConfigId && createItemMutation.mutate({
                        configId: selectedConfigId,
                        ...newItem,
                      })}
                      disabled={createItemMutation.isPending || !newItem.name}
                    >
                      {createItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      添加
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Items List */}
            {itemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : items && items.length > 0 ? (
              <div className="space-y-3">
                {items.map(item => {
                  const catConfig = categoryConfig[item.category as keyof typeof categoryConfig];
                  const statConfig = statusConfig[item.status as keyof typeof statusConfig];
                  const Icon = catConfig?.icon || FileText;
                  return (
                    <Card key={item.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${catConfig?.color || "bg-gray-500/20"}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {item.month ? `${monthNames[item.month]}` : "未指定月份"} · {frequencyLabels[item.frequency]}
                                {item.responsibleUserName && ` · 负责人: ${item.responsibleUserName}`}
                              </p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Select 
                              value={item.status} 
                              onValueChange={(v) => updateItemMutation.mutate({ 
                                id: item.id, 
                                status: v as any 
                              })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {selectedConfigId ? "暂无项目数据，点击添加项目创建" : "请先选择或创建年度规划配置"}
              </div>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>更新日志</CardTitle>
                <CardDescription>记录所有年度规划的变更历史</CardDescription>
              </CardHeader>
              <CardContent>
                {updateLogs && updateLogs.length > 0 ? (
                  <div className="space-y-4">
                    {updateLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Settings className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{log.updateType}</p>
                          <p className="text-sm text-muted-foreground">{log.description || '无描述'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString("zh-CN")}
                            {log.operatorId && ` · 操作人ID: ${log.operatorId}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无更新日志
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dependency Management Dialog */}
      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>设置前置任务</DialogTitle>
            <DialogDescription>
              为"{selectedItemForDependency?.name}"设置依赖关系
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Source Item Select */}
            <div className="space-y-2">
              <Label>前置任务</Label>
              <Select
                value={newDependency.sourceItemId.toString()}
                onValueChange={(value) => setNewDependency(prev => ({ ...prev, sourceItemId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择前置任务" />
                </SelectTrigger>
                <SelectContent>
                  {items?.filter((i: any) => i.id !== selectedItemForDependency?.id).map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Dependency Type */}
            <div className="space-y-2">
              <Label>依赖类型</Label>
              <Select
                value={newDependency.dependencyType}
                onValueChange={(value: any) => setNewDependency(prev => ({ ...prev, dependencyType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finish_to_start">完成后开始 (FS)</SelectItem>
                  <SelectItem value="start_to_start">同时开始 (SS)</SelectItem>
                  <SelectItem value="finish_to_finish">同时完成 (FF)</SelectItem>
                  <SelectItem value="start_to_finish">开始后完成 (SF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Lag Days */}
            <div className="space-y-2">
              <Label>延迟天数</Label>
              <Input
                type="number"
                value={newDependency.lagDays}
                onChange={(e) => setNewDependency(prev => ({ ...prev, lagDays: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">正数表示延迟，负数表示提前</p>
            </div>
            
            {/* Existing Dependencies */}
            {dependencies && dependencies.filter((d: any) => d.targetItemId === selectedItemForDependency?.id).length > 0 && (
              <div className="space-y-2">
                <Label>已有依赖</Label>
                <div className="space-y-1">
                  {dependencies.filter((d: any) => d.targetItemId === selectedItemForDependency?.id).map((dep: any) => {
                    const sourceItem = items?.find((i: any) => i.id === dep.sourceItemId);
                    return (
                      <div key={dep.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-sm text-sm">
                        <span>{sourceItem?.name || '未知'} → {dep.dependencyType}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => removeDependencyMutation.mutate({ id: dep.id })}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDependencyDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (selectedConfigId && selectedItemForDependency && newDependency.sourceItemId) {
                  addDependencyMutation.mutate({
                    configId: selectedConfigId,
                    sourceItemId: newDependency.sourceItemId,
                    targetItemId: selectedItemForDependency.id,
                    dependencyType: newDependency.dependencyType,
                    lagDays: newDependency.lagDays,
                  });
                  setShowDependencyDialog(false);
                }
              }}
              disabled={!newDependency.sourceItemId || addDependencyMutation.isPending}
            >
              {addDependencyMutation.isPending ? "添加中..." : "添加依赖"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
