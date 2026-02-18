/**
 * 简道云集成管理页面
 * 提供应用浏览、表单查看、数据同步、定时任务、权限映射等功能
 */

import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Table2, 
  ArrowRight,
  Loader2,
  Building2,
  Users,
  FolderOpen,
  Clock,
  Shield,
  Play,
  Pause,
  Trash2,
  Plus,
  History,
  RotateCcw,
  Settings,
  Zap
} from "lucide-react";

// 组织架构Tab组件
function OrgStructureTab() {
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);

  // 获取部门列表
  const { data: deptData, isLoading: deptLoading } = trpc.jiandaoyun.getDepartments.useQuery(
    { deptNo: 1 }
  );

  // 获取成员列表
  const { data: memberData, isLoading: memberLoading } = trpc.jiandaoyun.getMembers.useQuery(
    { deptNo: selectedDept || 1 }
  );

  // 获取角色列表
  const { data: roleData, isLoading: roleLoading } = trpc.jiandaoyun.getRoles.useQuery();

  // 获取选中角色的成员
  const { data: roleMembersData, isLoading: roleMembersLoading } = trpc.jiandaoyun.getRoleMembersLive.useQuery(
    { roleNo: expandedRole! },
    { enabled: !!expandedRole }
  );

  // 同步角色成员
  const syncRoleMembersMutation = trpc.jiandaoyun.syncRoleMembers.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`角色成员同步完成: 新增${(result as any).created || 0}, 更新${(result as any).updated || 0}`);
      } else {
        toast.error(`同步失败: ${(result as any).error}`);
      }
    },
    onError: (error) => {
      toast.error(`同步错误: ${error.message}`);
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 部门列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            部门结构
          </CardTitle>
          <CardDescription>
            共 {deptData?.departments?.length || 0} 个部门
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deptLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : deptData?.error ? (
            <div className="text-center py-4 text-red-500">
              <XCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{deptData.error}</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {deptData?.departments?.map((dept) => (
                  <div
                    key={dept.dept_no}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedDept === dept.dept_no ? 'border-primary bg-primary/5 border' : 'border border-transparent'
                    }`}
                    onClick={() => setSelectedDept(dept.dept_no)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{dept.dept_no}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 成员列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            成员列表
          </CardTitle>
          <CardDescription>
            {selectedDept ? `部门 #${selectedDept} 的成员` : '全部成员'} ({memberData?.members?.length || 0} 人)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : memberData?.error ? (
            <div className="text-center py-4 text-red-500">
              <XCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{memberData.error}</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {memberData?.members?.map((member) => (
                  <div
                    key={member.username}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.username}</p>
                        </div>
                      </div>
                      <Badge variant={member.status === 1 ? 'default' : 'secondary'}>
                        {member.status === 1 ? '已加入' : '未确认'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.departments.map((deptNo) => (
                        <Badge key={deptNo} variant="outline" className="text-xs">
                          部门#{deptNo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 角色列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                角色列表
              </CardTitle>
              <CardDescription>
                共 {roleData?.roles?.length || 0} 个角色（点击展开成员）
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncRoleMembersMutation.mutate()}
              disabled={syncRoleMembersMutation.isPending}
            >
              {syncRoleMembersMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              同步角色成员
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roleLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : roleData?.error ? (
            <div className="text-center py-4 text-red-500">
              <XCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{roleData.error}</p>
            </div>
          ) : roleData?.roles?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无角色数据</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {roleData?.roles?.map((role) => (
                  <div key={role.role_no}>
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        expandedRole === role.role_no ? 'border-primary bg-primary/5' : 'bg-card'
                      }`}
                      onClick={() => setExpandedRole(expandedRole === role.role_no ? null : role.role_no)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowRight className={`w-4 h-4 transition-transform ${expandedRole === role.role_no ? 'rotate-90' : ''}`} />
                          <span className="font-medium">{role.name}</span>
                        </div>
                        <Badge variant="outline">组#{role.group_no}</Badge>
                      </div>
                    </div>
                    {expandedRole === role.role_no && (
                      <div className="ml-6 mt-1 space-y-1">
                        {roleMembersLoading ? (
                          <div className="p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : roleMembersData?.error ? (
                          <p className="text-xs text-red-500 p-2">{roleMembersData.error}</p>
                        ) : roleMembersData?.members?.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2">该角色暂无成员</p>
                        ) : (
                          roleMembersData?.members?.map((member) => (
                            <div key={member.username} className="p-2 rounded border bg-muted/30 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                                {member.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.username}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 定时任务Tab组件
function SyncTasksTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    taskName: '',
    taskType: 'user' as 'user' | 'department' | 'role' | 'role_members' | 'form_data' | 'full',
    syncDirection: 'jdy_to_grt' as 'jdy_to_grt' | 'grt_to_jdy' | 'bidirectional',
    cronExpression: '0 0 2 * * *',
    isEnabled: true,
  });

  const utils = trpc.useUtils();

  // 获取同步任务列表
  const { data: tasksData, isLoading: tasksLoading } = trpc.jiandaoyun.getSyncTasks.useQuery();

  // 获取同步统计
  const { data: statsData } = trpc.jiandaoyun.getSyncStats.useQuery();

  // 创建默认任务
  const createDefaultTasksMutation = trpc.jiandaoyun.createDefaultTasks.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`成功创建 ${result.taskIds?.length || 0} 个默认任务`);
        utils.jiandaoyun.getSyncTasks.invalidate();
      } else {
        toast.error(`创建失败: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`创建错误: ${error.message}`);
    },
  });

  // 创建任务
  const createTaskMutation = trpc.jiandaoyun.createSyncTask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('任务创建成功');
        setShowCreateDialog(false);
        utils.jiandaoyun.getSyncTasks.invalidate();
      } else {
        toast.error(`创建失败: ${result.error}`);
      }
    },
  });

  // 更新任务状态
  const updateStatusMutation = trpc.jiandaoyun.updateTaskStatus.useMutation({
    onSuccess: () => {
      toast.success('状态已更新');
      utils.jiandaoyun.getSyncTasks.invalidate();
    },
  });

  // 执行任务
  const executeTaskMutation = trpc.jiandaoyun.executeSyncTask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`执行完成: 成功${(result as any).successCount}条，失败${(result as any).failedCount}条`);
        utils.jiandaoyun.getSyncTasks.invalidate();
        utils.jiandaoyun.getSyncLogs.invalidate();
      } else {
        toast.error(`执行失败: ${result.error}`);
      }
    },
  });

  // 删除任务
  const deleteTaskMutation = trpc.jiandaoyun.deleteSyncTask.useMutation({
    onSuccess: () => {
      toast.success('任务已删除');
      utils.jiandaoyun.getSyncTasks.invalidate();
    },
  });

  const taskTypeLabels: Record<string, string> = {
    user: '用户同步',
    department: '部门同步',
    role: '角色同步',
    role_members: '角色成员同步',
    form_data: '表单数据',
    full: '全量同步',
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总任务数</p>
              <p className="text-lg font-semibold">{statsData?.stats?.totalTasks || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">已启用</p>
              <p className="text-lg font-semibold">{statsData?.stats?.enabledTasks || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">成功执行</p>
              <p className="text-lg font-semibold">{statsData?.stats?.successfulExecutions || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">失败执行</p>
              <p className="text-lg font-semibold">{statsData?.stats?.failedExecutions || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          onClick={() => createDefaultTasksMutation.mutate()}
          disabled={createDefaultTasksMutation.isPending}
        >
          {createDefaultTasksMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          一键初始化默认任务
        </Button>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              新建任务
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建同步任务</DialogTitle>
              <DialogDescription>
                配置定时同步任务，自动同步简道云数据到GRT系统
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>任务名称</Label>
                <Input
                  value={newTask.taskName}
                  onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                  placeholder="例如：每日用户同步"
                />
              </div>
              <div className="space-y-2">
                <Label>任务类型</Label>
                <Select
                  value={newTask.taskType}
                  onValueChange={(v) => setNewTask({ ...newTask, taskType: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">用户同步</SelectItem>
                    <SelectItem value="department">部门同步</SelectItem>
                    <SelectItem value="role">角色同步</SelectItem>
                    <SelectItem value="role_members">角色成员同步</SelectItem>
                    <SelectItem value="form_data">表单数据</SelectItem>
                    <SelectItem value="full">全量同步</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>同步方向</Label>
                <Select
                  value={newTask.syncDirection}
                  onValueChange={(v) => setNewTask({ ...newTask, syncDirection: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jdy_to_grt">简道云 → GRT</SelectItem>
                    <SelectItem value="grt_to_jdy">GRT → 简道云</SelectItem>
                    <SelectItem value="bidirectional">双向同步</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cron表达式</Label>
                <Input
                  value={newTask.cronExpression}
                  onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                  placeholder="0 0 2 * * *"
                />
                <p className="text-xs text-muted-foreground">
                  默认：每天凌晨2点执行
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label>立即启用</Label>
                <Switch
                  checked={newTask.isEnabled}
                  onCheckedChange={(v) => setNewTask({ ...newTask, isEnabled: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={createTaskMutation.isPending || !newTask.taskName}
              >
                {createTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            同步任务列表
          </CardTitle>
          <CardDescription>
            管理定时同步任务，支持启用/禁用和手动执行
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : tasksData?.tasks?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无同步任务</p>
              <p className="text-sm mt-2">点击"一键初始化默认任务"快速创建</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {tasksData?.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${task.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                          {task.isEnabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{task.taskName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{taskTypeLabels[task.taskType] || task.taskType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {task.cronExpression}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.isEnabled}
                          onCheckedChange={(v) => updateStatusMutation.mutate({ taskId: task.id, enabled: v })}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeTaskMutation.mutate({ taskId: task.id })}
                          disabled={executeTaskMutation.isPending}
                        >
                          {executeTaskMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (confirm('确定要删除此任务吗？')) {
                              deleteTaskMutation.mutate({ taskId: task.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {task.lastRunAt && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        上次执行: {new Date(task.lastRunAt).toLocaleString()}
                        {task.lastRunStatus && (
                          <Badge
                            variant={task.lastRunStatus === 'success' ? 'default' : 'destructive'}
                            className="ml-2"
                          >
                            {task.lastRunStatus === 'success' ? '成功' : '失败'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 权限映射Tab组件
function PermissionMappingTab() {
  const utils = trpc.useUtils();

  // 获取GRT角色列表
  const { data: rolesData, isLoading: rolesLoading } = trpc.jiandaoyun.getGrtRoles.useQuery();

  // 获取映射统计
  const { data: mappingStats } = trpc.jiandaoyun.getMappingStats.useQuery();

  // 自动映射
  const autoMapMutation = trpc.jiandaoyun.autoMapRoles.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`自动映射完成: ${(result as any).mapped}个成功, ${(result as any).skipped}个跳过`);
        utils.jiandaoyun.getMappingStats.invalidate();
      } else {
        toast.error(`映射失败: ${result.error}`);
      }
    },
  });

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总角色数</p>
              <p className="text-lg font-semibold">{mappingStats?.stats?.totalRoles || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">已映射</p>
              <p className="text-lg font-semibold">{mappingStats?.stats?.mappedRoles || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">待映射</p>
              <p className="text-lg font-semibold">{mappingStats?.stats?.unmappedRoles || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          onClick={() => autoMapMutation.mutate()}
          disabled={autoMapMutation.isPending}
        >
          {autoMapMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          自动映射角色
        </Button>
      </div>

      {/* GRT角色列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            GRT系统角色
          </CardTitle>
          <CardDescription>
            系统预定义的角色和权限配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {rolesData?.roles?.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <Badge variant="outline">
                        {role.permissionCount} 权限
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 角色分布 */}
      {mappingStats?.stats?.roleDistribution && Object.keys(mappingStats.stats.roleDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>角色分布</CardTitle>
            <CardDescription>
              已映射角色的分布情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(mappingStats.stats.roleDistribution).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>{role}</span>
                  <Badge>{count as number} 人</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 同步日志Tab组件
function SyncLogsTab() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>(undefined);

  const utils = trpc.useUtils();

  // 获取任务列表（用于筛选）
  const { data: tasksData } = trpc.jiandaoyun.getSyncTasks.useQuery();

  // 获取同步日志
  const { data: logsData, isLoading: logsLoading } = trpc.jiandaoyun.getSyncLogs.useQuery({
    taskId: selectedTaskId,
    limit: 100,
  });

  // 重试失败任务
  const retryMutation = trpc.jiandaoyun.executeSyncTask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('重试成功');
        utils.jiandaoyun.getSyncLogs.invalidate();
      } else {
        toast.error(`重试失败: ${result.error}`);
      }
    },
  });

  const statusColors: Record<string, string> = {
    success: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
    running: 'bg-blue-500/10 text-blue-500',
    pending: 'bg-yellow-500/10 text-yellow-500',
  };

  const statusLabels: Record<string, string> = {
    success: '成功',
    failed: '失败',
    running: '执行中',
    pending: '等待中',
  };

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <div className="flex gap-4">
        <Select
          value={selectedTaskId?.toString() || 'all'}
          onValueChange={(v) => setSelectedTaskId(v === 'all' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="选择任务" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部任务</SelectItem>
            {tasksData?.tasks?.map((task) => (
              <SelectItem key={task.id} value={task.id.toString()}>
                {task.taskName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => utils.jiandaoyun.getSyncLogs.invalidate()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            同步日志
          </CardTitle>
          <CardDescription>
            查看同步任务的执行历史和结果
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logsData?.logs?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无同步日志</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {logsData?.logs?.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${statusColors[log.status] || 'bg-gray-500/10'}`}>
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">任务 #{log.taskId}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.startedAt).toLocaleString()}
                            {log.completedAt && ` - ${new Date(log.completedAt).toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                          {statusLabels[log.status] || log.status}
                        </Badge>
                        {log.status === 'failed' && log.taskId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate({ taskId: log.taskId })}
                            disabled={retryMutation.isPending}
                          >
                            {retryMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">成功: </span>
                        <span className="text-green-500 font-medium">{log.successCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">失败: </span>
                        <span className="text-red-500 font-medium">{log.failedCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">触发: </span>
                        <span>{log.triggeredBy === 'manual' ? '手动' : log.triggeredBy === 'cron' ? '定时' : log.triggeredBy}</span>
                      </div>
                    </div>
                    {log.errorMessage && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 text-red-500 text-sm">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JiandaoyunIntegration() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<{ appId: string; formId: string } | null>(null);

  // 获取配置状态
  const { data: status, isLoading: statusLoading } = trpc.jiandaoyun.getStatus.useQuery();

  // 获取应用列表
  const { data: appsData, isLoading: appsLoading, refetch: refetchApps } = trpc.jiandaoyun.getApps.useQuery();

  // 获取表单列表
  const { data: formsData, isLoading: formsLoading } = trpc.jiandaoyun.getForms.useQuery(
    { appId: selectedApp! },
    { enabled: !!selectedApp }
  );

  // 获取表单字段
  const { data: fieldsData, isLoading: fieldsLoading } = trpc.jiandaoyun.getFormFields.useQuery(
    { appId: selectedForm?.appId!, formId: selectedForm?.formId! },
    { enabled: !!selectedForm }
  );

  // 获取表单数据
  const { data: formDataResult, isLoading: dataLoading } = trpc.jiandaoyun.getFormData.useQuery(
    { appId: selectedForm?.appId!, formId: selectedForm?.formId!, limit: 20 },
    { enabled: !!selectedForm }
  );

  // 测试连接
  const testConnectionMutation = trpc.jiandaoyun.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`连接成功！发现 ${result.apps} 个应用`);
      } else {
        toast.error(`连接失败: ${result.message}`);
      }
    },
    onError: (error) => {
      toast.error(`连接错误: ${error.message}`);
    },
  });

  // 全量同步
  const fullSyncMutation = trpc.jiandaoyun.fullSync.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`同步完成！${result.apps} 个应用，${result.totalRecords} 条记录`);
        refetchApps();
      } else {
        toast.error(`同步失败: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`同步错误: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Database}
          title="简道云集成"
          description="连接简道云平台，同步组织架构、人员角色和业务数据"
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                测试连接
              </Button>
              <Button
                onClick={() => fullSyncMutation.mutate()}
                disabled={fullSyncMutation.isPending}
              >
                {fullSyncMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                全量同步
              </Button>
            </>
          }
        />

        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${status?.configured ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {status?.configured ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">连接状态</p>
                <p className="text-lg font-semibold">{status?.configured ? '已连接' : '未配置'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">应用数量</p>
                <p className="text-lg font-semibold">{status?.stats?.totalApps || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">表单数量</p>
                <p className="text-lg font-semibold">{status?.stats?.totalForms || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                <Table2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">数据记录</p>
                <p className="text-lg font-semibold">{status?.stats?.totalRecords || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="apps" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="apps">应用列表</TabsTrigger>
            <TabsTrigger value="forms" disabled={!selectedApp}>表单结构</TabsTrigger>
            <TabsTrigger value="data" disabled={!selectedForm}>数据预览</TabsTrigger>
            <TabsTrigger value="org">组织架构</TabsTrigger>
            <TabsTrigger value="tasks">定时任务</TabsTrigger>
            <TabsTrigger value="permissions">权限映射</TabsTrigger>
            <TabsTrigger value="logs">同步日志</TabsTrigger>
          </TabsList>

          {/* 应用列表 */}
          <TabsContent value="apps">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  简道云应用
                </CardTitle>
                <CardDescription>
                  选择一个应用查看其表单结构和数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : appsData?.error ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p>加载失败: {appsData.error}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {appsData?.apps.map((app) => (
                        <div
                          key={app.app_id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                            selectedApp === app.app_id ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => setSelectedApp(app.app_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FolderOpen className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium">{app.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{app.app_id}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 表单结构 */}
          <TabsContent value="forms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  表单列表
                </CardTitle>
                <CardDescription>
                  选择表单查看字段结构和数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                {formsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : formsData?.error ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>加载失败: {formsData.error}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formsData?.forms.map((form) => (
                      <div
                        key={form.entry_id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                          selectedForm?.formId === form.entry_id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => setSelectedForm({ appId: selectedApp!, formId: form.entry_id })}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{form.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{form.entry_id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 字段结构 */}
            {selectedForm && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>字段结构</CardTitle>
                </CardHeader>
                <CardContent>
                  {fieldsLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <div className="space-y-2">
                      {fieldsData?.fields?.map((field, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                          <Badge variant="outline">{field.type}</Badge>
                          <span className="font-medium">{field.label}</span>
                          <span className="text-muted-foreground text-sm">({field.name})</span>
                          {field.required && <Badge variant="destructive" className="text-xs">必填</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 数据预览 */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="w-5 h-5" />
                  数据预览
                </CardTitle>
                <CardDescription>
                  显示前20条记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : formDataResult?.error ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>加载失败: {formDataResult.error}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {formDataResult?.data?.map((record, index) => (
                        <div key={record._id || index} className="p-3 rounded-lg border bg-card">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(record, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 组织架构 */}
          <TabsContent value="org">
            <OrgStructureTab />
          </TabsContent>

          {/* 定时任务 */}
          <TabsContent value="tasks">
            <SyncTasksTab />
          </TabsContent>

          {/* 权限映射 */}
          <TabsContent value="permissions">
            <PermissionMappingTab />
          </TabsContent>

          {/* 同步日志 */}
          <TabsContent value="logs">
            <SyncLogsTab />
          </TabsContent>
        </Tabs>
      </div>
  );
}
