import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Plus, Search, Filter, Clock, CheckCircle2, Circle,
  PlayCircle, PauseCircle, Code, FileText, Bug, RefreshCw,
  TestTube, ChevronRight, ChevronLeft, Copy, Loader2, Edit, MessageSquare,
  Send, User, Calendar, AlertCircle, X, LayoutGrid, List, ArrowUpDown,
  AlertTriangle, Timer,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// ============================================
// Status columns for Kanban board
// ============================================
const statusColumns = [
  { id: "backlog", label: "待办", labelEn: "Backlog", icon: Circle, color: "bg-gray-500" },
  { id: "todo", label: "计划中", labelEn: "Todo", icon: Clock, color: "bg-blue-500" },
  { id: "in_progress", label: "进行中", labelEn: "In Progress", icon: PlayCircle, color: "bg-yellow-500" },
  { id: "review", label: "评审中", labelEn: "Review", icon: PauseCircle, color: "bg-purple-500" },
  { id: "done", label: "已完成", labelEn: "Done", icon: CheckCircle2, color: "bg-green-500" },
];

// ============================================
// Version options (updated for GRT iterations)
// ============================================
const versions = ["v4.5", "v4.6", "v4.7", "v4.8", "v5.0-alpha", "v5.0-beta", "v5.0-rc", "v5.0"];

// ============================================
// Module options (13 modules, aligned with menuConfig.ts)
// ============================================
const modules = [
  { id: "workspace", label: "工作台", labelEn: "Workspace" },
  { id: "sales", label: "销售", labelEn: "Sales" },
  { id: "rd", label: "研发设计", labelEn: "R&D Design" },
  { id: "project", label: "项目管理", labelEn: "Project" },
  { id: "manufacturing", label: "生产制造", labelEn: "Manufacturing" },
  { id: "service", label: "售后服务", labelEn: "Service" },
  { id: "finance", label: "成本财务", labelEn: "Finance" },
  { id: "hr", label: "人力资源", labelEn: "HR" },
  { id: "performance", label: "绩效考核", labelEn: "Performance" },
  { id: "ai", label: "AI智能", labelEn: "AI" },
  { id: "iot", label: "IoT设备", labelEn: "IoT" },
  { id: "system", label: "系统管理", labelEn: "System" },
  { id: "admin", label: "运维管理", labelEn: "Admin" },
];

// Module badge color classes
const moduleBadgeColors: Record<string, string> = {
  workspace: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sales: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
  rd: "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300",
  project: "bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300",
  manufacturing: "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300",
  service: "bg-teal-100 text-teal-700 dark:bg-teal-800 dark:text-teal-300",
  finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300",
  hr: "bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-300",
  performance: "bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300",
  ai: "bg-violet-100 text-violet-700 dark:bg-violet-800 dark:text-violet-300",
  iot: "bg-cyan-100 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-300",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  admin: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300",
};

// Priority left-border colors for Kanban cards
const priorityBorderColors: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-blue-500",
  low: "border-l-gray-400",
};

// ============================================
// Priority options
// ============================================
const priorities = [
  { id: "critical", label: "紧急", labelEn: "Critical", color: "bg-red-500" },
  { id: "high", label: "高", labelEn: "High", color: "bg-orange-500" },
  { id: "medium", label: "中", labelEn: "Medium", color: "bg-blue-500" },
  { id: "low", label: "低", labelEn: "Low", color: "bg-gray-500" },
];

// ============================================
// Assignee preset list (GRT team)
// ============================================
const assignees = [
  { id: "zhao", name: "赵工", nameEn: "Zhao", initials: "赵", avatarColor: "bg-blue-500" },
  { id: "chen", name: "陈工", nameEn: "Chen", initials: "陈", avatarColor: "bg-emerald-500" },
  { id: "li", name: "李工", nameEn: "Li", initials: "李", avatarColor: "bg-violet-500" },
  { id: "zhang", name: "张工", nameEn: "Zhang", initials: "张", avatarColor: "bg-orange-500" },
  { id: "wang", name: "王工", nameEn: "Wang", initials: "王", avatarColor: "bg-pink-500" },
  { id: "liu", name: "刘工", nameEn: "Liu", initials: "刘", avatarColor: "bg-cyan-500" },
  { id: "huang", name: "黄工", nameEn: "Huang", initials: "黄", avatarColor: "bg-amber-500" },
  { id: "zhou", name: "周工", nameEn: "Zhou", initials: "周", avatarColor: "bg-indigo-500" },
];

// Task type icons
const typeIcons: Record<string, any> = {
  feature: Code,
  bugfix: Bug,
  refactor: RefreshCw,
  docs: FileText,
  test: TestTube,
};

// Priority colors
const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-gray-500",
};

// Mock comments for demo
interface TaskComment {
  id: string;
  taskId: number;
  author: string;
  content: string;
  createdAt: string;
}

// ============================================
// Helper: check if a task is overdue
// ============================================
function isOverdue(task: any): boolean {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate) < new Date();
}

// ============================================
// Helper: get hours progress percentage
// ============================================
function getHoursProgress(actual: number, estimated: number): number {
  if (!estimated || estimated <= 0) return 0;
  return Math.min(Math.round((actual / estimated) * 100), 100);
}

export default function DevTaskBoard() {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVersion, setFilterVersion] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);

  // View mode: kanban or list
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  // List view sorting
  const [sortField, setSortField] = useState<string>("taskCode");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form state for new/edit task
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    version: "v5.0-alpha",
    module: "project",
    type: "feature" as const,
    priority: "medium" as const,
    status: "backlog" as const,
    estimatedHours: 8,
    actualHours: 0,
    claudePrompt: "",
    acceptanceCriteria: "",
    dueDate: "",
    assignee: "",
  });

  // tRPC queries and mutations
  const { data: tasks, isLoading, refetch } = trpc.devTasks.list.useQuery({
    version: filterVersion === "all" ? undefined : filterVersion,
    module: filterModule === "all" ? undefined : filterModule,
    status: filterStatus === "all" ? undefined : filterStatus,
    priority: filterPriority === "all" ? undefined : filterPriority,
    search: searchTerm || undefined,
  });

  const initMutation = trpc.devTasks.init.useMutation({
    onSuccess: () => {
      toast.success(language === "zh" ? "默认任务已初始化" : "Default tasks initialized");
      refetch();
    },
  });

  const createMutation = trpc.devTasks.create.useMutation({
    onSuccess: () => {
      toast.success(language === "zh" ? "任务创建成功" : "Task created successfully");
      setIsCreateDialogOpen(false);
      resetTaskForm();
      refetch();
    },
  });

  const updateMutation = trpc.devTasks.update.useMutation({
    onSuccess: (_, variables) => {
      toast.success(language === "zh" ? "任务更新成功" : "Task updated successfully");
      setIsEditMode(false);
      // Update selectedTask in-place so the dialog shows new status
      if (selectedTask && (variables as any).id === selectedTask.id) {
        setSelectedTask((prev: any) => prev ? { ...prev, ...variables } : null);
      }
      refetch();
    },
  });

  const deleteMutation = trpc.devTasks.delete.useMutation({
    onSuccess: () => {
      toast.success(language === "zh" ? "任务删除成功" : "Task deleted successfully");
      setSelectedTask(null);
      refetch();
    },
  });

  // Reset form
  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      version: "v5.0-alpha",
      module: "project",
      type: "feature",
      priority: "medium",
      status: "backlog",
      estimatedHours: 8,
      actualHours: 0,
      claudePrompt: "",
      acceptanceCriteria: "",
      dueDate: "",
      assignee: "",
    });
  };

  // Load task into form for editing
  const loadTaskForEdit = (task: any) => {
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      version: task.version || "v5.0-alpha",
      module: task.module || "project",
      type: task.type || "feature",
      priority: task.priority || "medium",
      status: task.status || "backlog",
      estimatedHours: task.estimatedHours || 8,
      actualHours: task.actualHours || 0,
      claudePrompt: task.claudePrompt || "",
      acceptanceCriteria: task.acceptanceCriteria || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      assignee: task.assignee || "",
    });
    setIsEditMode(true);
  };

  // Group tasks by status
  const tasksByStatus = statusColumns.reduce((acc, col) => {
    acc[col.id] = (tasks || []).filter((task: any) => task.status === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  // ============================================
  // Enhanced statistics
  // ============================================
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasksByStatus.done?.length || 0;
  const inProgressTasks = tasksByStatus.in_progress?.length || 0;
  const overdueTasks = (tasks || []).filter((t: any) => isOverdue(t)).length;
  const totalEstimated = (tasks || []).reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0);
  const totalActual = (tasks || []).reduce((sum: number, t: any) => sum + (t.actualHours || 0), 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ============================================
  // Sorted tasks for list view
  // ============================================
  const sortedTasks = useMemo(() => {
    const list = [...(tasks || [])];
    list.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "taskCode": aVal = a.taskCode || ""; bVal = b.taskCode || ""; break;
        case "title": aVal = a.title || ""; bVal = b.title || ""; break;
        case "module": aVal = a.module || ""; bVal = b.module || ""; break;
        case "priority": {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          aVal = order[a.priority] ?? 9; bVal = order[b.priority] ?? 9; break;
        }
        case "status": {
          const order: Record<string, number> = { backlog: 0, todo: 1, in_progress: 2, review: 3, done: 4 };
          aVal = order[a.status] ?? 9; bVal = order[b.status] ?? 9; break;
        }
        case "assignee": aVal = a.assignee || ""; bVal = b.assignee || ""; break;
        case "dueDate": aVal = a.dueDate || "9999"; bVal = b.dueDate || "9999"; break;
        case "estimatedHours": aVal = a.estimatedHours || 0; bVal = b.estimatedHours || 0; break;
        default: aVal = a.taskCode || ""; bVal = b.taskCode || "";
      }
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [tasks, sortField, sortDirection]);

  // Toggle sort
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Copy Claude prompt to clipboard with fallback
  const copyClaudePrompt = async (prompt: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(prompt);
        toast.success(language === "zh" ? "已复制到剪贴板" : "Copied to clipboard");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = prompt;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          toast.success(language === "zh" ? "已复制到剪贴板" : "Copied to clipboard");
        } else {
          throw new Error('Copy failed');
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.info(language === "zh" ? "请手动复制提示词" : "Please copy the prompt manually");
    }
  };

  // Move task to next status
  const moveTaskForward = (task: any) => {
    const currentIndex = statusColumns.findIndex(col => col.id === task.status);
    if (currentIndex < statusColumns.length - 1) {
      const nextStatus = statusColumns[currentIndex + 1].id;
      updateMutation.mutate({
        id: task.id,
        status: nextStatus as any,
        ...(nextStatus === "in_progress" ? { startDate: new Date().toISOString() } : {}),
        ...(nextStatus === "done" ? { completedDate: new Date().toISOString() } : {}),
      });
    }
  };

  // Move task to previous status (reverse)
  const moveTaskBackward = (task: any) => {
    const currentIndex = statusColumns.findIndex(col => col.id === task.status);
    if (currentIndex > 0) {
      const prevStatus = statusColumns[currentIndex - 1].id;
      updateMutation.mutate({
        id: task.id,
        status: prevStatus as any,
      });
    }
  };

  // Quick status change
  const changeTaskStatus = (task: any, newStatus: string) => {
    updateMutation.mutate({
      id: task.id,
      status: newStatus as any,
      ...(newStatus === "in_progress" ? { startDate: new Date().toISOString() } : {}),
      ...(newStatus === "done" ? { completedDate: new Date().toISOString() } : {}),
    });
  };

  // Add comment (mock implementation)
  const addComment = () => {
    if (!newComment.trim() || !selectedTask) return;

    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      taskId: selectedTask.id,
      author: language === "zh" ? "当前用户" : "Current User",
      content: newComment,
      createdAt: new Date().toISOString(),
    };

    setTaskComments(prev => [...prev, comment]);
    setNewComment("");
    toast.success(language === "zh" ? "评论已添加" : "Comment added");
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterVersion("all");
    setFilterModule("all");
    setFilterStatus("all");
    setFilterPriority("all");
  };

  const hasActiveFilters = searchTerm || filterVersion !== "all" || filterModule !== "all" || filterStatus !== "all" || filterPriority !== "all";

  // ============================================
  // Helper sub-components
  // ============================================

  // Assignee avatar circle with individual colors
  const AssigneeAvatar = ({ assigneeId, size = "sm" }: { assigneeId: string; size?: "sm" | "md" }) => {
    const person = assignees.find(a => a.id === assigneeId);
    if (!person) return null;
    const sizeClass = size === "sm" ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-xs";
    return (
      <div
        className={`${sizeClass} rounded-full ${person.avatarColor} text-white flex items-center justify-center font-medium shrink-0`}
        title={language === "zh" ? person.name : person.nameEn}
      >
        {person.initials}
      </div>
    );
  };

  // Hours progress bar
  const HoursProgressBar = ({ actual, estimated }: { actual: number; estimated: number }) => {
    const pct = getHoursProgress(actual, estimated);
    const isOver = actual > estimated && estimated > 0;
    return (
      <div className="flex items-center gap-1.5 w-full">
        <div className="flex-1 bg-muted rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {actual}/{estimated}h
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========== Header ========== */}
      <PageHeader
        icon={Code}
        title={language === "zh" ? "开发任务看板" : "Development Task Board"}
        description={language === "zh"
          ? "管理和追踪Claude Code开发任务"
          : "Manage and track Claude Code development tasks"}
        actions={
        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => initMutation.mutate()}
            disabled={initMutation.isPending}
          >
            {initMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {language === "zh" ? "初始化默认任务" : "Init Default Tasks"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {language === "zh" ? "新建任务" : "New Task"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{language === "zh" ? "创建开发任务" : "Create Development Task"}</DialogTitle>
                <DialogDescription>
                  {language === "zh"
                    ? "添加新的开发任务，包含Claude Code提示词"
                    : "Add a new development task with Claude Code prompt"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{language === "zh" ? "任务标题" : "Task Title"}</Label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder={language === "zh" ? "例如：客户管理CRUD接口" : "e.g., Customer Management CRUD API"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "版本" : "Version"}</Label>
                    <Select value={taskForm.version} onValueChange={(v) => setTaskForm({ ...taskForm, version: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "模块" : "Module"}</Label>
                    <Select value={taskForm.module} onValueChange={(v) => setTaskForm({ ...taskForm, module: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {language === "zh" ? m.label : m.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "类型" : "Type"}</Label>
                    <Select value={taskForm.type} onValueChange={(v: any) => setTaskForm({ ...taskForm, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">{language === "zh" ? "功能" : "Feature"}</SelectItem>
                        <SelectItem value="bugfix">{language === "zh" ? "修复" : "Bugfix"}</SelectItem>
                        <SelectItem value="refactor">{language === "zh" ? "重构" : "Refactor"}</SelectItem>
                        <SelectItem value="docs">{language === "zh" ? "文档" : "Docs"}</SelectItem>
                        <SelectItem value="test">{language === "zh" ? "测试" : "Test"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "优先级" : "Priority"}</Label>
                    <Select value={taskForm.priority} onValueChange={(v: any) => setTaskForm({ ...taskForm, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">{language === "zh" ? "紧急" : "Critical"}</SelectItem>
                        <SelectItem value="high">{language === "zh" ? "高" : "High"}</SelectItem>
                        <SelectItem value="medium">{language === "zh" ? "中" : "Medium"}</SelectItem>
                        <SelectItem value="low">{language === "zh" ? "低" : "Low"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "负责人" : "Assignee"}</Label>
                    <Select value={taskForm.assignee} onValueChange={(v) => setTaskForm({ ...taskForm, assignee: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "zh" ? "选择负责人" : "Select assignee"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">{language === "zh" ? "未分配" : "Unassigned"}</SelectItem>
                        {assignees.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {language === "zh" ? a.name : a.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "预估工时" : "Est. Hours"}</Label>
                    <Input
                      type="number"
                      value={taskForm.estimatedHours}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{language === "zh" ? "截止日期" : "Due Date"}</Label>
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{language === "zh" ? "任务描述" : "Description"}</Label>
                  <Textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder={language === "zh" ? "详细描述任务内容..." : "Describe the task in detail..."}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    {language === "zh" ? "Claude Code 提示词" : "Claude Code Prompt"}
                  </Label>
                  <Textarea
                    value={taskForm.claudePrompt}
                    onChange={(e) => setTaskForm({ ...taskForm, claudePrompt: e.target.value })}
                    placeholder={language === "zh"
                      ? "输入给Claude Code的提示词，例如：实现CRM客户管理的tRPC路由..."
                      : "Enter the prompt for Claude Code, e.g., Implement CRM customer management tRPC routes..."}
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{language === "zh" ? "验收标准" : "Acceptance Criteria"}</Label>
                  <Textarea
                    value={taskForm.acceptanceCriteria}
                    onChange={(e) => setTaskForm({ ...taskForm, acceptanceCriteria: e.target.value })}
                    placeholder={language === "zh"
                      ? "1. 所有CRUD接口可用\n2. 支持筛选和搜索\n3. 通过单元测试"
                      : "1. All CRUD APIs work\n2. Support filtering and search\n3. Pass unit tests"}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {language === "zh" ? "取消" : "Cancel"}
                </Button>
                <Button
                  onClick={() => createMutation.mutate(taskForm)}
                  disabled={!taskForm.title || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {language === "zh" ? "创建任务" : "Create Task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        }
      />

      {/* ========== Enhanced Stats Panel ========== */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            icon={FileText}
            label={language === "zh" ? "总任务" : "Total"}
            value={totalTasks}
          />
          <StatCard
            icon={PlayCircle}
            label={language === "zh" ? "进行中" : "Active"}
            value={inProgressTasks}
            iconColor="text-yellow-500"
            iconBg="bg-yellow-500/10"
          />
          <StatCard
            icon={CheckCircle2}
            label={language === "zh" ? "已完成" : "Done"}
            value={completedTasks}
            iconColor="text-green-500"
            iconBg="bg-green-500/10"
          />
          <StatCard
            icon={AlertTriangle}
            label={language === "zh" ? "逾期" : "Overdue"}
            value={overdueTasks}
            iconColor={overdueTasks > 0 ? "text-red-500" : "text-muted-foreground"}
            iconBg={overdueTasks > 0 ? "bg-red-500/10" : "bg-muted"}
          />
          <StatCard
            icon={Timer}
            label={language === "zh" ? "工时" : "Hours"}
            value={`${totalActual}/${totalEstimated}h`}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
          />
        </div>
        {/* Overall progress bar */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {language === "zh" ? "整体进度" : "Progress"}
          </span>
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-xs font-medium whitespace-nowrap">{completionRate}%</span>
        </div>
      </div>

      {/* ========== Filters ========== */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === "zh" ? "搜索任务..." : "Search tasks..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterVersion} onValueChange={setFilterVersion}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={language === "zh" ? "版本" : "Version"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "zh" ? "全部版本" : "All Versions"}</SelectItem>
              {versions.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={language === "zh" ? "模块" : "Module"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "zh" ? "全部模块" : "All Modules"}</SelectItem>
              {modules.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {language === "zh" ? m.label : m.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Circle className="w-4 h-4 mr-2" />
              <SelectValue placeholder={language === "zh" ? "状态" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "zh" ? "全部状态" : "All Status"}</SelectItem>
              {statusColumns.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {language === "zh" ? s.label : s.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <AlertCircle className="w-4 h-4 mr-2" />
              <SelectValue placeholder={language === "zh" ? "优先级" : "Priority"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "zh" ? "全部优先级" : "All Priorities"}</SelectItem>
              {priorities.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {language === "zh" ? p.label : p.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              {language === "zh" ? "清除筛选" : "Clear Filters"}
            </Button>
          )}
        </div>
      </div>

      {/* ========== Main Content: Kanban or List ========== */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : viewMode === "kanban" ? (
        /* ========== Kanban View ========== */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
          {statusColumns.map((column) => {
            const columnTasks = tasksByStatus[column.id] || [];

            return (
              <div key={column.id} className="min-w-[260px]">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
                  <span className="font-medium text-sm">
                    {language === "zh" ? column.label : column.labelEn}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {columnTasks.length}
                  </Badge>
                </div>

                <div className="space-y-2 min-h-[400px] p-2 bg-muted/30 rounded-lg">
                  {columnTasks.map((task: any) => {
                    const TypeIcon = typeIcons[task.type] || Code;
                    const taskOverdue = isOverdue(task);
                    const currentStatusIdx = statusColumns.findIndex(c => c.id === task.status);

                    return (
                      <Card
                        key={task.id}
                        className={`bg-card border-border hover:border-primary/50 transition-colors cursor-pointer border-l-4 ${priorityBorderColors[task.priority] || "border-l-gray-400"}`}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsEditMode(false);
                          setActiveTab("details");
                          setTaskComments(prev => prev.filter(c => c.taskId === task.id));
                        }}
                      >
                        <CardContent className="p-3 space-y-2">
                          {/* Row 1: Task code + type icon */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-mono">
                                {task.taskCode}
                              </span>
                            </div>
                            {task.assignee && task.assignee !== "unassigned" && (
                              <AssigneeAvatar assigneeId={task.assignee} size="sm" />
                            )}
                          </div>

                          {/* Row 2: Title */}
                          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>

                          {/* Row 3: Version + Module badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {task.version}
                            </Badge>
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 ${moduleBadgeColors[task.module] || "bg-gray-100 text-gray-700"}`}>
                              {modules.find(m => m.id === task.module)?.[language === "zh" ? "label" : "labelEn"] || task.module}
                            </Badge>
                          </div>

                          {/* Row 4: Due date + Overdue warning */}
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 text-[10px] ${taskOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              {taskOverdue && (
                                <span className="ml-1 bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 px-1 rounded text-[9px]">
                                  {language === "zh" ? "逾期" : "OVERDUE"}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Row 5: Hours progress bar */}
                          {(task.estimatedHours > 0) && (
                            <HoursProgressBar actual={task.actualHours || 0} estimated={task.estimatedHours} />
                          )}

                          {/* Row 6: Action buttons */}
                          <div className="flex items-center gap-1 pt-1">
                            {task.claudePrompt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-[10px] h-6 px-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyClaudePrompt(task.claudePrompt);
                                }}
                              >
                                <Copy className="w-3 h-3 mr-0.5" />
                                {language === "zh" ? "提示词" : "Prompt"}
                              </Button>
                            )}
                            {currentStatusIdx > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 px-1.5 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveTaskBackward(task);
                                }}
                              >
                                <ChevronLeft className="w-3 h-3 mr-0.5" />
                                {language === "zh" ? "退回" : "Return"}
                              </Button>
                            )}
                            {column.id !== "done" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-[10px] h-6 px-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveTaskForward(task);
                                }}
                              >
                                {language === "zh" ? "推进" : "Forward"}
                                <ChevronRight className="w-3 h-3 ml-0.5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {language === "zh" ? "暂无任务" : "No tasks"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========== List View ========== */
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {[
                  { key: "taskCode", label: "任务号", labelEn: "Code" },
                  { key: "title", label: "标题", labelEn: "Title" },
                  { key: "module", label: "模块", labelEn: "Module" },
                  { key: "priority", label: "优先级", labelEn: "Priority" },
                  { key: "status", label: "状态", labelEn: "Status" },
                  { key: "assignee", label: "负责人", labelEn: "Assignee" },
                  { key: "dueDate", label: "截止日期", labelEn: "Due Date" },
                  { key: "estimatedHours", label: "工时", labelEn: "Hours" },
                ].map(col => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{language === "zh" ? col.label : col.labelEn}</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === col.key ? "text-primary" : "text-muted-foreground/50"}`} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task: any) => {
                const taskOverdue = isOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${taskOverdue ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                    onClick={() => {
                      setSelectedTask(task);
                      setIsEditMode(false);
                      setActiveTab("details");
                      setTaskComments(prev => prev.filter(c => c.taskId === task.id));
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{task.taskCode}</td>
                    <td className="px-3 py-2 font-medium max-w-[300px] truncate">{task.title}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-[10px] border-0 ${moduleBadgeColors[task.module] || "bg-gray-100 text-gray-700"}`}>
                        {modules.find(m => m.id === task.module)?.[language === "zh" ? "label" : "labelEn"] || task.module}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                        <span className="text-xs">
                          {priorities.find(p => p.id === task.priority)?.[language === "zh" ? "label" : "labelEn"]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {statusColumns.find(s => s.id === task.status)?.[language === "zh" ? "label" : "labelEn"]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {task.assignee && task.assignee !== "unassigned" ? (
                        <div className="flex items-center gap-1.5">
                          <AssigneeAvatar assigneeId={task.assignee} size="sm" />
                          <span className="text-xs">
                            {assignees.find(a => a.id === task.assignee)?.[language === "zh" ? "name" : "nameEn"] || "-"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-xs ${taskOverdue ? "text-red-500 font-medium" : ""}`}>
                      {task.dueDate ? (
                        <span className="flex items-center gap-1">
                          {new Date(task.dueDate).toLocaleDateString()}
                          {taskOverdue && <AlertTriangle className="w-3 h-3" />}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {task.actualHours || 0}/{task.estimatedHours || 0}h
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    {language === "zh" ? "暂无任务" : "No tasks"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== Task Detail Dialog ========== */}
      <Dialog open={!!selectedTask} onOpenChange={() => {
        setSelectedTask(null);
        setIsEditMode(false);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{selectedTask.taskCode}</Badge>
                    <Badge className={priorityColors[selectedTask.priority]}>
                      {priorities.find(p => p.id === selectedTask.priority)?.[language === "zh" ? "label" : "labelEn"]}
                    </Badge>
                    {/* Status quick-switch dropdown */}
                    {!isEditMode ? (
                      <Select
                        value={selectedTask.status}
                        onValueChange={(v) => changeTaskStatus(selectedTask, v)}
                      >
                        <SelectTrigger className="h-6 w-auto px-2 text-xs gap-1 border-dashed">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusColumns.find(s => s.id === selectedTask.status)?.color || "bg-gray-500"}`} />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusColumns.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                                {language === "zh" ? s.label : s.labelEn}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">
                        {statusColumns.find(s => s.id === selectedTask.status)?.[language === "zh" ? "label" : "labelEn"]}
                      </Badge>
                    )}
                    {/* Assignee display */}
                    {selectedTask.assignee && selectedTask.assignee !== "unassigned" && (
                      <div className="flex items-center gap-1">
                        <AssigneeAvatar assigneeId={selectedTask.assignee} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {assignees.find(a => a.id === selectedTask.assignee)?.[language === "zh" ? "name" : "nameEn"]}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isEditMode && (
                    <Button variant="ghost" size="sm" onClick={() => loadTaskForEdit(selectedTask)}>
                      <Edit className="w-4 h-4 mr-1" />
                      {language === "zh" ? "编辑" : "Edit"}
                    </Button>
                  )}
                </div>
                <DialogTitle className="mt-2">
                  {isEditMode ? (
                    <Input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    selectedTask.title
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedTask.version} · {modules.find(m => m.id === selectedTask.module)?.[language === "zh" ? "label" : "labelEn"]}
                  {isOverdue(selectedTask) && (
                    <span className="ml-2 text-red-500 text-xs font-medium">
                      {language === "zh" ? "已逾期" : "OVERDUE"}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">
                    <FileText className="w-4 h-4 mr-2" />
                    {language === "zh" ? "详情" : "Details"}
                  </TabsTrigger>
                  <TabsTrigger value="prompt">
                    <Code className="w-4 h-4 mr-2" />
                    {language === "zh" ? "提示词" : "Prompt"}
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {language === "zh" ? "评论" : "Comments"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {isEditMode ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "版本" : "Version"}</Label>
                          <Select value={taskForm.version} onValueChange={(v) => setTaskForm({ ...taskForm, version: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {versions.map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "模块" : "Module"}</Label>
                          <Select value={taskForm.module} onValueChange={(v) => setTaskForm({ ...taskForm, module: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {modules.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  {language === "zh" ? m.label : m.labelEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "状态" : "Status"}</Label>
                          <Select value={taskForm.status} onValueChange={(v: any) => setTaskForm({ ...taskForm, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {statusColumns.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {language === "zh" ? s.label : s.labelEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "优先级" : "Priority"}</Label>
                          <Select value={taskForm.priority} onValueChange={(v: any) => setTaskForm({ ...taskForm, priority: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {priorities.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {language === "zh" ? p.label : p.labelEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "类型" : "Type"}</Label>
                          <Select value={taskForm.type} onValueChange={(v: any) => setTaskForm({ ...taskForm, type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="feature">{language === "zh" ? "功能" : "Feature"}</SelectItem>
                              <SelectItem value="bugfix">{language === "zh" ? "修复" : "Bugfix"}</SelectItem>
                              <SelectItem value="refactor">{language === "zh" ? "重构" : "Refactor"}</SelectItem>
                              <SelectItem value="docs">{language === "zh" ? "文档" : "Docs"}</SelectItem>
                              <SelectItem value="test">{language === "zh" ? "测试" : "Test"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "负责人" : "Assignee"}</Label>
                          <Select value={taskForm.assignee || "unassigned"} onValueChange={(v) => setTaskForm({ ...taskForm, assignee: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">{language === "zh" ? "未分配" : "Unassigned"}</SelectItem>
                              {assignees.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                  {language === "zh" ? a.name : a.nameEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "截止日期" : "Due Date"}</Label>
                          <Input
                            type="date"
                            value={taskForm.dueDate}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "预估工时" : "Est. Hours"}</Label>
                          <Input
                            type="number"
                            value={taskForm.estimatedHours}
                            onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{language === "zh" ? "实际工时" : "Actual Hours"}</Label>
                          <Input
                            type="number"
                            value={taskForm.actualHours}
                            onChange={(e) => setTaskForm({ ...taskForm, actualHours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>{language === "zh" ? "描述" : "Description"}</Label>
                        <Textarea
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>{language === "zh" ? "验收标准" : "Acceptance Criteria"}</Label>
                        <Textarea
                          value={taskForm.acceptanceCriteria}
                          onChange={(e) => setTaskForm({ ...taskForm, acceptanceCriteria: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedTask.description && (
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "描述" : "Description"}</Label>
                          <p className="mt-1">{selectedTask.description}</p>
                        </div>
                      )}

                      {selectedTask.acceptanceCriteria && (
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "验收标准" : "Acceptance Criteria"}</Label>
                          <pre className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                            {selectedTask.acceptanceCriteria}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "负责人" : "Assignee"}</Label>
                          <div className="mt-1 flex items-center gap-1.5">
                            {selectedTask.assignee && selectedTask.assignee !== "unassigned" ? (
                              <>
                                <AssigneeAvatar assigneeId={selectedTask.assignee} size="md" />
                                <span>{assignees.find(a => a.id === selectedTask.assignee)?.[language === "zh" ? "name" : "nameEn"] || "-"}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "截止日期" : "Due Date"}</Label>
                          <p className={`mt-1 ${isOverdue(selectedTask) ? "text-red-500 font-medium" : ""}`}>
                            {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "-"}
                            {isOverdue(selectedTask) && (
                              <AlertTriangle className="w-3 h-3 inline ml-1" />
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "预估工时" : "Estimated"}</Label>
                          <p className="mt-1">{selectedTask.estimatedHours || "-"} {language === "zh" ? "小时" : "hours"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "实际工时" : "Actual"}</Label>
                          <p className="mt-1">{selectedTask.actualHours || "-"} {language === "zh" ? "小时" : "hours"}</p>
                        </div>
                      </div>

                      {/* Hours progress visualization */}
                      {selectedTask.estimatedHours > 0 && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">{language === "zh" ? "工时进度" : "Hours Progress"}</Label>
                          <HoursProgressBar actual={selectedTask.actualHours || 0} estimated={selectedTask.estimatedHours} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "开始日期" : "Start Date"}</Label>
                          <p className="mt-1">{selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : "-"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{language === "zh" ? "完成日期" : "Completed Date"}</Label>
                          <p className="mt-1">{selectedTask.completedDate ? new Date(selectedTask.completedDate).toLocaleDateString() : "-"}</p>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="prompt" className="space-y-4 mt-4">
                  {isEditMode ? (
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        {language === "zh" ? "Claude Code 提示词" : "Claude Code Prompt"}
                      </Label>
                      <Textarea
                        value={taskForm.claudePrompt}
                        onChange={(e) => setTaskForm({ ...taskForm, claudePrompt: e.target.value })}
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </div>
                  ) : (
                    selectedTask.claudePrompt ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-muted-foreground flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            {language === "zh" ? "Claude Code 提示词" : "Claude Code Prompt"}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyClaudePrompt(selectedTask.claudePrompt)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            {language === "zh" ? "复制" : "Copy"}
                          </Button>
                        </div>
                        <pre className="p-4 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                          {selectedTask.claudePrompt}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {language === "zh" ? "暂无提示词" : "No prompt available"}
                      </div>
                    )
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4 mt-4">
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {taskComments.filter(c => c.taskId === selectedTask.id).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {language === "zh" ? "暂无评论" : "No comments yet"}
                      </div>
                    ) : (
                      taskComments.filter(c => c.taskId === selectedTask.id).map(comment => (
                        <div key={comment.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{comment.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={language === "zh" ? "添加评论..." : "Add a comment..."}
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={addComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-4">
                {isEditMode ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      {language === "zh" ? "取消" : "Cancel"}
                    </Button>
                    <Button
                      onClick={() => {
                        updateMutation.mutate({
                          id: selectedTask.id,
                          ...taskForm,
                          dueDate: (taskForm as any).dueDate || undefined,
                        } as any);
                      }}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {language === "zh" ? "保存更改" : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm(language === "zh" ? "确定要删除此任务吗？" : "Are you sure you want to delete this task?")) {
                          deleteMutation.mutate({ id: selectedTask.id });
                        }
                      }}
                    >
                      {language === "zh" ? "删除任务" : "Delete Task"}
                    </Button>
                    {/* Reverse status button */}
                    {statusColumns.findIndex(c => c.id === selectedTask.status) > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          moveTaskBackward(selectedTask);
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {language === "zh" ? "退回上一阶段" : "Move Back"}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setSelectedTask(null)}>
                      {language === "zh" ? "关闭" : "Close"}
                    </Button>
                    {selectedTask.status !== "done" && (
                      <Button onClick={() => {
                        moveTaskForward(selectedTask);
                      }}>
                        <ChevronRight className="w-4 h-4 mr-1" />
                        {language === "zh" ? "推进到下一阶段" : "Move Forward"}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
