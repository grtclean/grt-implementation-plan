import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Database, CheckCircle2, Clock, AlertCircle, Pause, Play, 
  RefreshCw, Edit2, Trash2, Plus, ArrowUpDown, Filter,
  ChevronRight, FileText, Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "paused";
type TaskPriority = "high" | "medium" | "low";

interface MigrationTask {
  id: number;
  moduleId: string;
  moduleName: string;
  sourceTable: string;
  targetTable: string;
  totalRecords: number;
  migratedRecords: number;
  validatedRecords: number;
  errorRecords: number;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  notes: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function MigrationTasks() {
  const { language } = useLanguage();
  const [selectedTask, setSelectedTask] = useState<MigrationTask | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("pending");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("priority");

  // tRPC queries
  const { data: tasks, isLoading, refetch } = trpc.migration.list.useQuery();
  const initMutation = trpc.migration.init.useMutation({
    onSuccess: () => {
      toast.success(language === "zh" ? "初始化成功" : "Initialized successfully");
      refetch();
    },
  });
  const updateMutation = trpc.migration.update.useMutation({
    onSuccess: () => {
      toast.success(language === "zh" ? "更新成功" : "Updated successfully");
      refetch();
      setEditDialogOpen(false);
    },
  });

  // Initialize default tasks if empty
  useEffect(() => {
    if (tasks && tasks.length === 0) {
      initMutation.mutate();
    }
  }, [tasks]);

  // Status config
  const statusConfig: Record<TaskStatus, { label: string; labelEn: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "待处理", labelEn: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <Clock className="w-4 h-4" /> },
    in_progress: { label: "进行中", labelEn: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: <Play className="w-4 h-4" /> },
    completed: { label: "已完成", labelEn: "Completed", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: <CheckCircle2 className="w-4 h-4" /> },
    failed: { label: "失败", labelEn: "Failed", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: <AlertCircle className="w-4 h-4" /> },
    paused: { label: "已暂停", labelEn: "Paused", color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: <Pause className="w-4 h-4" /> },
  };

  const priorityConfig: Record<TaskPriority, { label: string; labelEn: string; color: string }> = {
    high: { label: "高", labelEn: "High", color: "bg-red-500/10 text-red-500 border-red-500/20" },
    medium: { label: "中", labelEn: "Medium", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    low: { label: "低", labelEn: "Low", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  };

  // Filter and sort tasks
  const filteredTasks = (tasks || [])
    .filter(task => filterStatus === "all" || task.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === "progress") {
        const progressA = a.totalRecords > 0 ? a.migratedRecords / a.totalRecords : 0;
        const progressB = b.totalRecords > 0 ? b.migratedRecords / b.totalRecords : 0;
        return progressB - progressA;
      }
      return 0;
    });

  // Calculate overall stats
  const stats = {
    total: tasks?.length || 0,
    completed: tasks?.filter(t => t.status === "completed").length || 0,
    inProgress: tasks?.filter(t => t.status === "in_progress").length || 0,
    totalRecords: tasks?.reduce((sum, t) => sum + t.totalRecords, 0) || 0,
    migratedRecords: tasks?.reduce((sum, t) => sum + t.migratedRecords, 0) || 0,
    validatedRecords: tasks?.reduce((sum, t) => sum + t.validatedRecords, 0) || 0,
    errorRecords: tasks?.reduce((sum, t) => sum + t.errorRecords, 0) || 0,
  };

  const overallProgress = stats.totalRecords > 0 ? Math.round((stats.migratedRecords / stats.totalRecords) * 100) : 0;

  // Handle task actions
  const handleStatusChange = (task: MigrationTask, newStatus: TaskStatus) => {
    const updateData: any = { id: task.id, status: newStatus };
    
    if (newStatus === "in_progress" && !task.startedAt) {
      updateData.startedAt = new Date();
    }
    if (newStatus === "completed") {
      updateData.completedAt = new Date();
      updateData.migratedRecords = task.totalRecords;
      updateData.validatedRecords = task.totalRecords;
    }
    
    updateMutation.mutate(updateData);
  };

  const handleEditTask = (task: MigrationTask) => {
    setSelectedTask(task);
    setEditNotes(task.notes || "");
    setEditStatus(task.status);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedTask) {
      updateMutation.mutate({
        id: selectedTask.id,
        status: editStatus,
        notes: editNotes,
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              {language === "zh" ? "迁移任务管理" : "Migration Task Management"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === "zh" 
                ? "管理和追踪简道云数据迁移进度" 
                : "Manage and track Jiandaoyun data migration progress"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {language === "zh" ? "刷新" : "Refresh"}
            </Button>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Download className="w-4 h-4" />
              {language === "zh" ? "导出报告" : "Export Report"}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-mono uppercase">
                    {language === "zh" ? "总体进度" : "Overall Progress"}
                  </p>
                  <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Database className="w-6 h-6 text-primary" />
                </div>
              </div>
              <Progress value={overallProgress} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-mono uppercase">
                {language === "zh" ? "任务状态" : "Task Status"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-green-500">{stats.completed}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-xl font-bold">{stats.total}</span>
                <span className="text-sm text-muted-foreground">
                  {language === "zh" ? "已完成" : "completed"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.inProgress} {language === "zh" ? "进行中" : "in progress"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-mono uppercase">
                {language === "zh" ? "记录统计" : "Record Stats"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-primary">{stats.migratedRecords.toLocaleString()}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-lg">{stats.totalRecords.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.validatedRecords.toLocaleString()} {language === "zh" ? "已验证" : "validated"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-mono uppercase">
                {language === "zh" ? "错误记录" : "Error Records"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${stats.errorRecords > 0 ? "text-red-500" : "text-green-500"}`}>
                  {stats.errorRecords}
                </span>
                <span className="text-sm text-muted-foreground">
                  {language === "zh" ? "条错误" : "errors"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.errorRecords === 0 
                  ? (language === "zh" ? "暂无错误" : "No errors") 
                  : (language === "zh" ? "需要处理" : "Needs attention")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={language === "zh" ? "状态筛选" : "Filter Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "zh" ? "全部状态" : "All Status"}</SelectItem>
                <SelectItem value="pending">{language === "zh" ? "待处理" : "Pending"}</SelectItem>
                <SelectItem value="in_progress">{language === "zh" ? "进行中" : "In Progress"}</SelectItem>
                <SelectItem value="completed">{language === "zh" ? "已完成" : "Completed"}</SelectItem>
                <SelectItem value="failed">{language === "zh" ? "失败" : "Failed"}</SelectItem>
                <SelectItem value="paused">{language === "zh" ? "已暂停" : "Paused"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={language === "zh" ? "排序方式" : "Sort By"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">{language === "zh" ? "按优先级" : "By Priority"}</SelectItem>
                <SelectItem value="progress">{language === "zh" ? "按进度" : "By Progress"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {language === "zh" ? "暂无迁移任务" : "No migration tasks"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const progress = task.totalRecords > 0 
                ? Math.round((task.migratedRecords / task.totalRecords) * 100) 
                : 0;
              const statusInfo = statusConfig[task.status];
              const priorityInfo = priorityConfig[task.priority];

              return (
                <Card key={task.id} className="bg-card/50 border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={`p-3 rounded-lg ${statusInfo.color}`}>
                        {statusInfo.icon}
                      </div>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-heading font-bold text-lg">{task.moduleName}</h3>
                          <Badge variant="outline" className={statusInfo.color}>
                            {language === "zh" ? statusInfo.label : statusInfo.labelEn}
                          </Badge>
                          <Badge variant="outline" className={priorityInfo.color}>
                            {language === "zh" ? priorityInfo.label : priorityInfo.labelEn}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="font-mono">{task.sourceTable}</span>
                          <ChevronRight className="w-4 h-4" />
                          <span className="font-mono">{task.targetTable}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {task.migratedRecords.toLocaleString()} / {task.totalRecords.toLocaleString()} 
                              {language === "zh" ? " 条记录" : " records"}
                            </span>
                            <span className="font-mono text-primary">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Notes */}
                        {task.notes && (
                          <div className="mt-3 p-2 bg-secondary/30 rounded text-sm text-muted-foreground flex items-start gap-2">
                            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{task.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {task.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange(task, "in_progress")}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            {language === "zh" ? "开始" : "Start"}
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStatusChange(task, "paused")}
                              className="gap-1"
                            >
                              <Pause className="w-3 h-3" />
                              {language === "zh" ? "暂停" : "Pause"}
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-500 hover:bg-green-600 gap-1"
                              onClick={() => handleStatusChange(task, "completed")}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {language === "zh" ? "完成" : "Complete"}
                            </Button>
                          </>
                        )}
                        {task.status === "paused" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange(task, "in_progress")}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            {language === "zh" ? "继续" : "Resume"}
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEditTask(task)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "zh" ? "编辑任务" : "Edit Task"}: {selectedTask?.moduleName}
              </DialogTitle>
              <DialogDescription>
                {language === "zh" 
                  ? "更新任务状态和备注信息" 
                  : "Update task status and notes"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === "zh" ? "状态" : "Status"}
                </label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{language === "zh" ? "待处理" : "Pending"}</SelectItem>
                    <SelectItem value="in_progress">{language === "zh" ? "进行中" : "In Progress"}</SelectItem>
                    <SelectItem value="completed">{language === "zh" ? "已完成" : "Completed"}</SelectItem>
                    <SelectItem value="failed">{language === "zh" ? "失败" : "Failed"}</SelectItem>
                    <SelectItem value="paused">{language === "zh" ? "已暂停" : "Paused"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === "zh" ? "备注" : "Notes"}
                </label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={language === "zh" ? "添加任务备注..." : "Add task notes..."}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                {language === "zh" ? "取消" : "Cancel"}
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending 
                  ? (language === "zh" ? "保存中..." : "Saving...") 
                  : (language === "zh" ? "保存" : "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
