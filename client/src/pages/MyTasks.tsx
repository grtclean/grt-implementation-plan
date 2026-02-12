/**
 * 我的任务页面
 * 集中展示和管理个人任务
 */

import { useState } from "react";
import Layout from "@/components/Layout";
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

const categoryLabels: Record<string, string> = {
  hr: "人力资源",
  procurement: "采购",
  delivery: "交付",
  meeting: "会议",
  performance: "绩效",
  other: "其他",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

const priorityLabels: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const statusColors: Record<string, string> = {
  todo: "bg-slate-500/20 text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-gray-500/20 text-gray-400",
};

const statusLabels: Record<string, string> = {
  todo: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
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
                    {priorityLabels[task.priority]}
                  </Badge>
                  {task.aiSuggestion && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      AI建议
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
                      {categoryLabels[task.category]}
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
                      <span>进度</span>
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
                  title={task.isStarred ? "取消收藏" : "收藏"}
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
      toast.error("请输入任务标题");
      return;
    }
    toast.success("任务已创建");
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
    toast.success("任务状态已更新");
  };

  const handleToggleStar = (id: string) => {
    toast.success("已更新收藏状态");
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
    <Layout>
      <FeatureGuide
        featureId="my-tasks"
        title="我的任务"
        description="集中展示和管理个人任务，提高工作效率"
        steps={[
          { title: "查看任务", description: "浏览所有待办和进行中的任务" },
          { title: "创建任务", description: "快速创建新任务" },
          { title: "跟踪进度", description: "更新任务进度和状态" },
          { title: "完成任务", description: "标记任务完成" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <ListTodo className="w-6 h-6 text-primary" />
              我的任务
            </h1>
            <p className="text-muted-foreground mt-1">
              {todoCount} 个待办 · {inProgressCount} 个进行中
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  新建任务
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>创建新任务</DialogTitle>
                  <DialogDescription>
                    填写任务信息，AI 可以帮助您优化任务描述
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">任务标题 *</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="任务标题"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">任务描述</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="任务详细描述"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">分类</Label>
                      <Select
                        value={newTask.category}
                        onValueChange={(value: any) => setNewTask({ ...newTask, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hr">人力资源</SelectItem>
                          <SelectItem value="procurement">采购</SelectItem>
                          <SelectItem value="delivery">交付</SelectItem>
                          <SelectItem value="meeting">会议</SelectItem>
                          <SelectItem value="performance">绩效</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="priority">优先级</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">截止日期</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tags">标签</Label>
                    <Input
                      id="tags"
                      value={newTask.tags}
                      onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                      placeholder="用逗号分隔多个标签"
                    />
                  </div>

                  <div className="flex items-center space-x-2 p-3 bg-purple-500/10 rounded-lg">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-purple-400">
                      AI 可以帮助您优化任务描述和预估完成时间
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateTask}>
                    创建任务
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待处理</p>
                  <p className="text-2xl font-bold">{todoCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <ListTodo className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">进行中</p>
                  <p className="text-2xl font-bold text-purple-400">{inProgressCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <ArrowRight className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold text-green-400">{completedCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已收藏</p>
                  <p className="text-2xl font-bold text-yellow-400">{starredCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已逾期</p>
                  <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-4">
          {/* Left: Task List */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-card/50 border border-border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                    全部
                  </TabsTrigger>
                  <TabsTrigger value="todo" className="data-[state=active]:bg-primary/20">
                    待处理 {todoCount > 0 && <Badge className="ml-2">{todoCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="data-[state=active]:bg-primary/20">
                    进行中 {inProgressCount > 0 && <Badge className="ml-2">{inProgressCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-primary/20">
                    已完成
                  </TabsTrigger>
                  <TabsTrigger value="starred" className="data-[state=active]:bg-primary/20">
                    已收藏
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2 ml-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="搜索任务..." className="pl-10 w-64" />
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
                  全选 ({filteredTasks.length} 个任务)
                </label>
                {selectedTasks.size > 0 && (
                  <Button size="sm" onClick={handleCompleteSelected} className="ml-auto">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    完成选中 ({selectedTasks.size})
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
                    <h3 className="text-lg font-medium mb-2">暂无任务</h3>
                    <p className="text-muted-foreground">
                      {activeTab === "all" ? "点击「新建任务」开始创建" : "该分类下暂无任务"}
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
                <CardTitle className="text-lg">快捷操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/hr/offboarding"}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  离职审批
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/hr/probation"}>
                  <Target className="w-4 h-4 mr-2" />
                  转正评估
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/delivery/gate"}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Gate检查
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = "/procurement/orders"}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  采购订单
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  AI 建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <div className="text-sm font-medium text-purple-400 mb-1">优先处理高优先级任务</div>
                    <p className="text-xs text-muted-foreground">
                      您有 {mockTasks.filter(t => t.priority === "high" && t.status !== "completed").length} 个高优先级待办任务
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-sm font-medium text-blue-400 mb-1">关注即将到期的任务</div>
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
    </Layout>
  );
}
