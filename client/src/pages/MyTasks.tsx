/**
 * 我的任务页面
 * 集中展示和管理个人任务
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import FeatureGuide from "@/components/FeatureGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  UserPlus,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  Filter,
  Search,
  Star,
  MoreHorizontal,
  Bot,
  ArrowRight,
  Tag,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatCard } from "@/components/grt";

// ============================================================================
// 类型定义
// ============================================================================

interface Task {
  id: string;
  title: string;
  description: string;
  category: "hr" | "procurement" | "delivery" | "meeting" | "performance" | "other";
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "completed" | "cancelled";
  dueDate: string;
  createdAt: string;
  assignee?: string;
  tags: string[];
  isStarred: boolean;
  aiSuggestion?: string;
  progress?: number; // 0-100
}

// ============================================================================
// 模拟数据
// ============================================================================

const mockTasks: Task[] = [
  {
    id: "1",
    title: "审批李四的离职申请",
    description: "销售部员工李四提交了离职申请，最后工作日为2024-03-10，需要审核离职原因。",
    category: "hr",
    priority: "high",
    status: "todo",
    dueDate: "2024-02-13",
    createdAt: "2024-02-11",
    tags: ["离职管理", "审批"],
    isStarred: true,
    aiSuggestion: "建议与部门主管沟通后审批",
  },
  {
    id: "2",
    title: "完成张三的90天转正评估",
    description: "技术部张三的90天试用期评估将在5天后到期，需要完成绩效评估和面谈。",
    category: "hr",
    priority: "high",
    status: "in_progress",
    dueDate: "2024-02-15",
    createdAt: "2024-02-10",
    tags: ["转正评估", "绩效"],
    isStarred: true,
    progress: 60,
  },
  {
    id: "3",
    title: "处理采购订单 PO-2024-048",
    description: "供应商B的采购订单需要确认交期和价格。",
    category: "procurement",
    priority: "medium",
    status: "todo",
    dueDate: "2024-02-14",
    createdAt: "2024-02-11",
    tags: ["采购", "订单"],
    isStarred: false,
    aiSuggestion: "建议对比历史价格后再确认",
  },
  {
    id: "4",
    title: "准备比亚迪项目M9终验收资料",
    description: "DEL-2024-003项目即将进入M9终验收，需要准备验收报告和文档。",
    category: "delivery",
    priority: "high",
    status: "in_progress",
    dueDate: "2024-02-16",
    createdAt: "2024-02-10",
    tags: ["交付", "验收"],
    isStarred: true,
    progress: 40,
    aiSuggestion: "AI建议使用自动文档生成功能",
  },
  {
    id: "5",
    title: "参加项目周会",
    description: "每周一14:00在会议室A进行项目周会，汇报本周工作进展。",
    category: "meeting",
    priority: "medium",
    status: "todo",
    dueDate: "2024-02-12",
    createdAt: "2024-02-11",
    tags: ["会议", "汇报"],
    isStarred: false,
  },
  {
    id: "6",
    title: "查看1月度个人绩效报告",
    description: "1月度的个人绩效已发布，需要查看详细报告并制定改进计划。",
    category: "performance",
    priority: "low",
    status: "todo",
    dueDate: "2024-02-15",
    createdAt: "2024-02-10",
    tags: ["绩效", "改进"],
    isStarred: false,
  },
  {
    id: "7",
    title: "处理超声波换能器库存预警",
    description: "超声波换能器库存不足，需要及时补货。",
    category: "procurement",
    priority: "high",
    status: "todo",
    dueDate: "2024-02-12",
    createdAt: "2024-02-10",
    tags: ["库存", "补货"],
    isStarred: false,
    aiSuggestion: "建议批量采购以获得更好价格",
  },
  {
    id: "8",
    title: "完成设备维护计划",
    description: "制定下一季度的设备维护计划，包括维护内容和时间安排。",
    category: "other",
    priority: "low",
    status: "todo",
    dueDate: "2024-02-20",
    createdAt: "2024-02-09",
    tags: ["维护", "计划"],
    isStarred: false,
  },
];

// ============================================================================
// 辅助函数和组件
// ============================================================================

const categoryIcons: Record<string, any> = {
  hr: UserPlus,
  procurement: ShoppingCart,
  delivery: Truck,
  meeting: Calendar,
  performance: Target,
  other: ListTodo,
};

const categoryColors: Record<string, string> = {
  hr: "bg-blue-500/20 text-blue-400",
  procurement: "bg-purple-500/20 text-purple-400",
  delivery: "bg-orange-500/20 text-orange-400",
  meeting: "bg-green-500/20 text-green-400",
  performance: "bg-pink-500/20 text-pink-400",
  other: "bg-gray-500/20 text-gray-400",
};

const categoryLabelKeys: Record<string, string> = {
  hr: "common.tasks.catHr",
  procurement: "common.tasks.catProcurement",
  delivery: "common.tasks.catDelivery",
  meeting: "common.tasks.catMeeting",
  performance: "common.tasks.catPerformance",
  other: "common.tasks.catOther",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

const priorityLabelKeys: Record<string, string> = {
  high: "common.tasks.highPriority",
  medium: "common.tasks.mediumPriority",
  low: "common.tasks.lowPriority",
};

const statusColors: Record<string, string> = {
  todo: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-gray-500/20 text-gray-400",
};

const statusLabelKeys: Record<string, string> = {
  todo: "common.tasks.todo",
  in_progress: "common.tasks.inProgress",
  completed: "common.tasks.completed",
  cancelled: "common.tasks.cancelled",
};

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function TaskCard({ task, onToggleStatus, onToggleStar, onEdit }: {
  task: Task;
  onToggleStatus: (id: string) => void;
  onToggleStar: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const { t } = useLanguage();
  const CategoryIcon = categoryIcons[task.category];
  const daysUntilDue = getDaysUntilDue(task.dueDate);

  return (
    <Card className={`bg-card/50 border-border hover:border-primary/50 transition-colors ${task.status === "completed" ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={() => onToggleStatus(task.id)}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </h3>
                  <Badge className={priorityColors[task.priority]}>
                    {t(priorityLabelKeys[task.priority])}
                  </Badge>
                  {task.aiSuggestion && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {t("common.tasks.aiSuggestLabel")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {task.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Meta info */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    <span className={`px-2 py-0.5 rounded ${categoryColors[task.category]}`}>
                      {t(categoryLabelKeys[task.category])}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 ${daysUntilDue < 0 ? "text-red-400" : daysUntilDue <= 3 ? "text-yellow-400" : ""}`}>
                    <Calendar className="w-3 h-3" />
                    <span>
                      {daysUntilDue < 0
                        ? `逾期 ${Math.abs(daysUntilDue)} 天`
                        : daysUntilDue === 0
                        ? "今天到期"
                        : `${daysUntilDue} 天后`}
                    </span>
                  </div>
                </div>

                {/* Progress for in_progress tasks */}
                {task.status === "in_progress" && task.progress !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{t("common.tasks.progress")}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-1" />
                  </div>
                )}

                {/* AI Suggestion */}
                {task.aiSuggestion && (
                  <div className="mt-3 p-2 bg-purple-500/10 rounded-lg flex items-start gap-2">
                    <Bot className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-purple-400">{task.aiSuggestion}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleStar(task.id)}
                  title={task.isStarred ? t("common.tasks.removeStar") : t("common.tasks.addStar")}
                >
                  <Star className={`w-4 h-4 ${task.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(task)}
                  title="编辑"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function MyTasks() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // 表单状态
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "other" as Task["category"],
    priority: "medium" as Task["priority"],
    dueDate: "",
    tags: "",
  });

  // 根据标签筛选任务
  const getFilteredTasks = () => {
    switch (activeTab) {
      case "todo":
        return mockTasks.filter(t => t.status === "todo");
      case "in_progress":
        return mockTasks.filter(t => t.status === "in_progress");
      case "completed":
        return mockTasks.filter(t => t.status === "completed");
      case "starred":
        return mockTasks.filter(t => t.isStarred);
      default:
        return mockTasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const todoCount = mockTasks.filter(t => t.status === "todo").length;
  const inProgressCount = mockTasks.filter(t => t.status === "in_progress").length;
  const completedCount = mockTasks.filter(t => t.status === "completed").length;
  const starredCount = mockTasks.filter(t => t.isStarred).length;
  const overdueCount = mockTasks.filter(t => getDaysUntilDue(t.dueDate) < 0 && t.status !== "completed").length;

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error(t("common.tasks.titleRequired"));
      return;
    }
    toast.success(t("common.tasks.created"));
    setIsCreateDialogOpen(false);
    setNewTask({
      title: "",
      description: "",
      category: "other",
      priority: "medium",
      dueDate: "",
      tags: "",
    });
  };

  const handleToggleStatus = (id: string) => {
    toast.success(t("common.tasks.statusUpdated"));
  };

  const handleToggleStar = (id: string) => {
    toast.success(t("common.tasks.starUpdated"));
  };

  const handleEdit = (task: Task) => {
    toast.info(`编辑任务: ${task.title}`);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleCompleteSelected = () => {
    toast.success(`已完成 ${selectedTasks.size} 个任务`);
    setSelectedTasks(new Set());
  };

  return (
      <>
      <FeatureGuide
        featureId="my-tasks"
        title={t("common.tasks.title")}
        description={t("common.tasks.description")}
        steps={[
          { title: t("common.tasks.stepView"), description: t("common.tasks.stepViewDesc") },
          { title: t("common.tasks.stepCreate"), description: t("common.tasks.stepCreateDesc") },
          { title: t("common.tasks.stepTrack"), description: t("common.tasks.stepTrackDesc") },
          { title: t("common.tasks.stepComplete"), description: t("common.tasks.stepCompleteDesc") },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={ListTodo}
          title={t("common.tasks.title")}
          description={`${todoCount} ${t("common.tasks.todo")} · ${inProgressCount} ${t("common.tasks.inProgress")}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                {t("common.tasks.filter")}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("common.tasks.newTask")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{t("common.tasks.createNewTask")}</DialogTitle>
                    <DialogDescription>
                      {t("common.tasks.createNewTaskDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">{t("common.tasks.taskTitle")}</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder={t("common.tasks.taskTitlePlaceholder")}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description">{t("common.tasks.taskDescription")}</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder={t("common.tasks.taskDescPlaceholder")}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category">{t("common.tasks.category")}</Label>
                        <Select
                          value={newTask.category}
                          onValueChange={(value: any) => setNewTask({ ...newTask, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hr">{t("common.tasks.catHr")}</SelectItem>
                            <SelectItem value="procurement">{t("common.tasks.catProcurement")}</SelectItem>
                            <SelectItem value="delivery">{t("common.tasks.catDelivery")}</SelectItem>
                            <SelectItem value="meeting">{t("common.tasks.catMeeting")}</SelectItem>
                            <SelectItem value="performance">{t("common.tasks.catPerformance")}</SelectItem>
                            <SelectItem value="other">{t("common.tasks.catOther")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="priority">{t("common.tasks.priority")}</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">{t("common.tasks.highPriority")}</SelectItem>
                            <SelectItem value="medium">{t("common.tasks.mediumPriority")}</SelectItem>
                            <SelectItem value="low">{t("common.tasks.lowPriority")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">{t("common.tasks.dueDate")}</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="tags">{t("common.tasks.tagsLabel")}</Label>
                      <Input
                        id="tags"
                        value={newTask.tags}
                        onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                        placeholder={t("common.tasks.tagsPlaceholder")}
                      />
                    </div>

                    <div className="flex items-center space-x-2 p-3 bg-purple-500/10 rounded-lg">
                      <Bot className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-purple-400">
                        {t("common.tasks.aiOptimizeHint")}
                      </span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleCreateTask}>
                      {t("common.tasks.newTask")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={ListTodo} label={t("common.tasks.todo")} value={todoCount} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
          <StatCard icon={ArrowRight} label={t("common.tasks.inProgress")} value={inProgressCount} iconColor="text-purple-400" iconBg="bg-purple-500/10" />
          <StatCard icon={CheckCircle2} label={t("common.tasks.completed")} value={completedCount} iconColor="text-green-400" iconBg="bg-green-500/10" />
          <StatCard icon={Star} label={t("common.tasks.starred")} value={starredCount} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
          <StatCard icon={AlertTriangle} label={t("common.tasks.overdue")} value={overdueCount} iconColor="text-red-400" iconBg="bg-red-500/10" />
        </div>

        {/* Main Tabs */}
        <div className="flex gap-4">
          {/* Left: Task List */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-card/50 border border-border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                    {t("common.tasks.all")}
                  </TabsTrigger>
                  <TabsTrigger value="todo" className="data-[state=active]:bg-primary/20">
                    {t("common.tasks.todo")} {todoCount > 0 && <Badge className="ml-2">{todoCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="data-[state=active]:bg-primary/20">
                    {t("common.tasks.inProgress")} {inProgressCount > 0 && <Badge className="ml-2">{inProgressCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-primary/20">
                    {t("common.tasks.completed")}
                  </TabsTrigger>
                  <TabsTrigger value="starred" className="data-[state=active]:bg-primary/20">
                    {t("common.tasks.starred")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2 ml-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("common.tasks.searchPlaceholder")} className="pl-10 w-64" />
                </div>
              </div>
            </div>

            {/* Select All Checkbox */}
            {filteredTasks.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
                <Checkbox
                  id="select-all-tasks"
                  checked={selectedTasks.size === filteredTasks.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all-tasks" className="text-sm cursor-pointer">
                  {t("common.tasks.selectAll")} ({filteredTasks.length})
                </label>
                {selectedTasks.size > 0 && (
                  <Button size="sm" onClick={handleCompleteSelected} className="ml-auto">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {t("common.tasks.completeSelected")} ({selectedTasks.size})
                  </Button>
                )}
              </div>
            )}

            {/* Task List */}
            <div className="space-y-3">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={handleToggleStatus}
                    onToggleStar={handleToggleStar}
                    onEdit={handleEdit}
                  />
                ))
              ) : (
                <Card className="bg-card/50 border-border">
                  <CardContent className="p-8 text-center">
                    <ListTodo className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <h3 className="text-lg font-medium mb-2">{t("common.tasks.noTasks")}</h3>
                    <p className="text-muted-foreground">
                      {activeTab === "all" ? t("common.tasks.noTasksAll") : t("common.tasks.noTasksFiltered")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="w-64 hidden lg:block">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("common.tasks.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/offboarding"}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("common.tasks.offboardingApproval")}
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/employee-management"}>
                  <Target className="w-4 h-4 mr-2" />
                  {t("common.tasks.probationReview")}
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/stage-gate"}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t("common.tasks.gateCheck")}
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/pos/procurement"}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t("common.tasks.purchaseOrder")}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  {t("common.tasks.aiSuggestions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <div className="text-sm font-medium text-purple-400 mb-1">{t("common.tasks.prioritizeHigh")}</div>
                    <p className="text-xs text-muted-foreground">
                      您有 {mockTasks.filter(t => t.priority === "high" && t.status !== "completed").length} 个高优先级待办任务
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-sm font-medium text-blue-400 mb-1">{t("common.tasks.watchDeadline")}</div>
                    <p className="text-xs text-muted-foreground">
                      {mockTasks.filter(t => {
                        const days = getDaysUntilDue(t.dueDate);
                        return days >= 0 && days <= 3 && t.status !== "completed";
                      }).length} 个任务将在3天内到期
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </>
  );
}
