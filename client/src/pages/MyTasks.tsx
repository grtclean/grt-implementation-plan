/**
 * 我的任务页面
 * 集中展示和管理个人任务 — real tRPC backend
 */

import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
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
  Loader2,
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
// Backend → Frontend mapping
// ============================================================================

const validCategories = new Set(["hr", "procurement", "delivery", "meeting", "performance", "other"]);

function mapBackendTask(raw: any): Task {
  const category = validCategories.has(raw.category) ? raw.category : "other";
  let tags: string[] = [];
  if (Array.isArray(raw.tags)) {
    tags = raw.tags;
  } else if (typeof raw.tags === "string") {
    try {
      const parsed = JSON.parse(raw.tags);
      tags = Array.isArray(parsed) ? parsed : [];
    } catch {
      tags = raw.tags ? raw.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    }
  }
  return {
    id: String(raw.id),
    title: raw.title ?? "",
    description: raw.description ?? "",
    category,
    priority: raw.priority ?? "medium",
    status: raw.status ?? "todo",
    dueDate: raw.dueDate ?? raw.createdAt ?? new Date().toISOString(),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    assignee: raw.assignee,
    tags,
    isStarred: false, // no backend field — local state
    aiSuggestion: raw.aiSuggestion,
    progress: raw.progress,
  };
}

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
  const CategoryIcon = categoryIcons[task.category] ?? ListTodo;
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
  const { level } = useUserProfile();
  const canManage = level >= 3;

  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // 表单状态
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "other" as Task["category"],
    priority: "medium" as Task["priority"],
    dueDate: "",
    tags: "",
  });

  // ---- tRPC queries ----
  const statusFilter = activeTab === "all" || activeTab === "starred" ? undefined : activeTab;
  const tasksQuery = (trpc.taskBoard as any).getMyTasks.useQuery(
    { status: statusFilter, limit: 100 },
    { refetchOnWindowFocus: false }
  );

  const statsQuery = (trpc.taskBoard as any).getStats.useQuery(
    {},
    { refetchOnWindowFocus: false }
  );

  // ---- tRPC mutations ----
  const createMutation = (trpc.taskBoard as any).create.useMutation({
    onSuccess: () => {
      toast.success(t("common.tasks.created"));
      setIsCreateDialogOpen(false);
      setNewTask({ title: "", description: "", category: "other", priority: "medium", dueDate: "", tags: "" });
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "创建失败");
    },
  });

  const moveStatusMutation = (trpc.taskBoard as any).moveStatus.useMutation({
    onSuccess: () => {
      toast.success(t("common.tasks.statusUpdated"));
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "状态更新失败");
    },
  });

  const batchUpdateStatusMutation = (trpc.taskBoard as any).batchUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success(`已完成 ${selectedTasks.size} 个任务`);
      setSelectedTasks(new Set());
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "批量更新失败");
    },
  });

  const deleteMutation = (trpc.taskBoard as any).delete.useMutation({
    onSuccess: () => {
      toast.success("任务已删除");
      tasksQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "删除失败");
    },
  });

  // ---- Map backend data ----
  const allTasks: Task[] = useMemo(() => {
    const rawList = tasksQuery.data ?? [];
    const items = Array.isArray(rawList) ? rawList : (rawList as any).tasks ?? [];
    return items.map((raw: any) => {
      const mapped = mapBackendTask(raw);
      mapped.isStarred = starredIds.has(mapped.id);
      return mapped;
    });
  }, [tasksQuery.data, starredIds]);

  // Filter for starred tab (client-side since starred is local state)
  const filteredTasks = useMemo(() => {
    if (activeTab === "starred") {
      return allTasks.filter((t) => t.isStarred);
    }
    return allTasks;
  }, [allTasks, activeTab]);

  // Stats from backend or fallback to client-side counting
  const stats = statsQuery.data;
  const todoCount = stats?.todo ?? allTasks.filter((t) => t.status === "todo").length;
  const inProgressCount = stats?.inProgress ?? stats?.in_progress ?? allTasks.filter((t) => t.status === "in_progress").length;
  const completedCount = stats?.completed ?? allTasks.filter((t) => t.status === "completed").length;
  const starredCount = allTasks.filter((t) => t.isStarred).length;
  const overdueCount = stats?.overdue ?? allTasks.filter((t) => getDaysUntilDue(t.dueDate) < 0 && t.status !== "completed").length;

  // ---- Handlers ----
  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error(t("common.tasks.titleRequired"));
      return;
    }
    const tagsArray = newTask.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    createMutation.mutate({
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      priority: newTask.priority,
      category: newTask.category,
      dueDate: newTask.dueDate || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      status: "todo",
    });
  };

  const handleToggleStatus = useCallback((id: string) => {
    const task = allTasks.find((t) => t.id === id);
    const newStatus = task?.status === "completed" ? "todo" : "completed";
    moveStatusMutation.mutate({ id: Number(id), status: newStatus });
  }, [allTasks, moveStatusMutation]);

  const handleToggleStar = useCallback((id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    toast.success(t("common.tasks.starUpdated"));
  }, [t]);

  const handleEdit = (task: Task) => {
    toast.info(`编辑任务: ${task.title}`);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleCompleteSelected = () => {
    if (!canManage) {
      toast.error("权限不足，无法批量操作");
      return;
    }
    const ids = Array.from(selectedTasks).map(Number);
    batchUpdateStatusMutation.mutate({ ids, status: "completed" });
  };

  // ---- Loading state ----
  if (tasksQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
                    <Button onClick={handleCreateTask} disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all-tasks" className="text-sm cursor-pointer">
                  {t("common.tasks.selectAll")} ({filteredTasks.length})
                </label>
                {selectedTasks.size > 0 && canManage && (
                  <Button
                    size="sm"
                    onClick={handleCompleteSelected}
                    className="ml-auto"
                    disabled={batchUpdateStatusMutation.isPending}
                  >
                    {batchUpdateStatusMutation.isPending
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4 mr-1" />
                    }
                    {t("common.tasks.completeSelected")} ({selectedTasks.size})
                  </Button>
                )}
              </div>
            )}

            {/* Task List */}
            <div className="space-y-3">
              {tasksQuery.isFetching && !tasksQuery.isLoading && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
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
                      您有 {allTasks.filter((t) => t.priority === "high" && t.status !== "completed").length} 个高优先级待办任务
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-sm font-medium text-blue-400 mb-1">{t("common.tasks.watchDeadline")}</div>
                    <p className="text-xs text-muted-foreground">
                      {allTasks.filter((t) => {
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
