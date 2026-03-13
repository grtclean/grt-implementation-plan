/**
 * 数据同步平台集成管理页面
 * 提供应用浏览、表单查看、数据同步、定时任务、权限映射等功能
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);

  // 获取部门列表
  const { data: deptData, isLoading: deptLoading } = trpc.externalSync.getDepartments.useQuery(
    { deptNo: 1 }
  );

  // 获取成员列表
  const { data: memberData, isLoading: memberLoading } = trpc.externalSync.getMembers.useQuery(
    { deptNo: selectedDept || 1 }
  );

  // 获取角色列表
  const { data: roleData, isLoading: roleLoading } = trpc.externalSync.getRoles.useQuery();

  // 获取选中角色的成员（从本地DB读取映射数据）
  const { data: roleMembersData, isLoading: roleMembersLoading } = trpc.externalSync.getRoleMemberMappings.useQuery(
    { roleNo: expandedRole! },
    { enabled: !!expandedRole }
  );

  // 同步角色成员
  const syncRoleMembersMutation = trpc.externalSync.syncRoleMembers.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${t("admin.extSyncInteg.roleSyncDone")}: ${t("admin.extSyncInteg.newCount")}${(result as any).created || 0}, ${t("admin.extSyncInteg.updateCount")}${(result as any).updated || 0}`);
      } else {
        toast.error(`${t("admin.extSyncInteg.syncFail")}: ${(result as any).error}`);
      }
    },
    onError: (error) => {
      toast.error(`${t("admin.extSyncInteg.syncError")}: ${error.message}`);
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 部门列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t("admin.extSyncInteg.deptStructure")}
          </CardTitle>
          <CardDescription>
            {deptData?.departments?.length || 0} {t("admin.extSyncInteg.deptCount")}
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
            {t("admin.extSyncInteg.memberList")}
          </CardTitle>
          <CardDescription>
            {selectedDept ? `${t("admin.extSyncInteg.deptOfPrefix")}${selectedDept} ${t("admin.extSyncInteg.deptMembersSuffix")}` : t("admin.extSyncInteg.allMembers")} ({memberData?.members?.length || 0} {t("admin.extSyncInteg.personUnit")})
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
                        {member.status === 1 ? t("admin.extSyncInteg.joined") : t("admin.extSyncInteg.unconfirmed")}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.departments.map((deptNo) => (
                        <Badge key={deptNo} variant="outline" className="text-xs">
                          {t("admin.extSyncInteg.deptPrefix")}{deptNo}
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
                {t("admin.extSyncInteg.roleList")}
              </CardTitle>
              <CardDescription>
                {roleData?.roles?.length || 0} ({t("admin.extSyncInteg.clickExpandMembers")})
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
              {t("admin.extSyncInteg.syncRoleMembers")}
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
              <p>{t("admin.extSyncInteg.noRoleData")}</p>
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
                        <Badge variant="outline">{t("admin.extSyncInteg.groupPrefix")}{role.group_no}</Badge>
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
                        ) : roleMembersData?.mappings?.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2">{t("admin.extSyncInteg.noRoleMembers")}</p>
                        ) : (
                          roleMembersData?.mappings?.map((member: any) => (
                            <div key={member.username || member.roleNo} className="p-2 rounded border bg-muted/30 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                                {(member.name || member.username || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{member.name || member.username}</p>
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
  const { t } = useLanguage();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    taskName: '',
    taskType: 'user' as 'user' | 'department' | 'role' | 'role_members' | 'form_data' | 'full',
    syncDirection: 'ext_to_grt' as 'ext_to_grt' | 'grt_to_ext' | 'bidirectional',
    cronExpression: '0 0 2 * * *',
    isEnabled: true,
  });

  const utils = trpc.useUtils();

  // 获取同步任务列表
  const { data: tasksData, isLoading: tasksLoading } = trpc.externalSync.getSyncTasks.useQuery();

  // 获取同步统计
  const { data: statsData } = trpc.externalSync.getSyncStats.useQuery();

  // 创建默认任务
  const createDefaultTasksMutation = trpc.externalSync.createDefaultTasks.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${t("admin.extSyncInteg.createDefaultSuccess")}: ${result.taskIds?.length || 0}`);
        utils.externalSync.getSyncTasks.invalidate();
      } else {
        toast.error(`${t("admin.extSyncInteg.createFail")}: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`${t("admin.extSyncInteg.createError")}: ${error.message}`);
    },
  });

  // 创建任务
  const createTaskMutation = trpc.externalSync.createSyncTask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t("admin.extSyncInteg.taskCreateSuccess"));
        setShowCreateDialog(false);
        utils.externalSync.getSyncTasks.invalidate();
      } else {
        toast.error(`${t("admin.extSyncInteg.createFail")}: ${result.error}`);
      }
    },
  });

  // 更新任务状态
  const updateStatusMutation = trpc.externalSync.updateTaskStatus.useMutation({
    onSuccess: () => {
      toast.success(t("admin.extSyncInteg.statusUpdated"));
      utils.externalSync.getSyncTasks.invalidate();
    },
  });

  // 执行任务
  const executeTaskMutation = trpc.externalSync.executeSyncTask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${t("admin.extSyncInteg.execDone")}: ${t("admin.extSyncInteg.successCountLabel")}${(result as any).successCount}, ${t("admin.extSyncInteg.failCountLabel")}${(result as any).failedCount}`);
        utils.externalSync.getSyncTasks.invalidate();
        utils.externalSync.getSyncLogs.invalidate();
      } else {
        toast.error(`${t("admin.extSyncInteg.execFail")}: ${result.error}`);
      }
    },
  });

  // 删除任务
  const deleteTaskMutation = trpc.externalSync.deleteSyncTask.useMutation({
    onSuccess: () => {
      toast.success(t("admin.extSyncInteg.taskDeleted"));
      utils.externalSync.getSyncTasks.invalidate();
    },
  });

  const taskTypeLabels: Record<string, string> = {
    user: t("admin.extSyncInteg.taskTypeUser"),
    department: t("admin.extSyncInteg.taskTypeDept"),
    role: t("admin.extSyncInteg.taskTypeRole"),
    role_members: t("admin.extSyncInteg.taskTypeRoleMembers"),
    form_data: t("admin.extSyncInteg.taskTypeFormData"),
    full: t("admin.extSyncInteg.taskTypeFull"),
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.totalTaskCount")}</p>
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.enabledCount")}</p>
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.successExec")}</p>
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.failedExec")}</p>
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
          {t("admin.extSyncInteg.initDefaultTasks")}
        </Button>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.extSyncInteg.newTask")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.extSyncInteg.createSyncTask")}</DialogTitle>
              <DialogDescription>
                {t("admin.extSyncInteg.createSyncTaskDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("admin.extSyncInteg.taskNameLabel")}</Label>
                <Input
                  value={newTask.taskName}
                  onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                  placeholder={t("admin.extSyncInteg.taskNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.extSyncInteg.taskType")}</Label>
                <Select
                  value={newTask.taskType}
                  onValueChange={(v) => setNewTask({ ...newTask, taskType: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("admin.extSyncInteg.taskTypeUser")}</SelectItem>
                    <SelectItem value="department">{t("admin.extSyncInteg.taskTypeDept")}</SelectItem>
                    <SelectItem value="role">{t("admin.extSyncInteg.taskTypeRole")}</SelectItem>
                    <SelectItem value="role_members">{t("admin.extSyncInteg.taskTypeRoleMembers")}</SelectItem>
                    <SelectItem value="form_data">{t("admin.extSyncInteg.taskTypeFormData")}</SelectItem>
                    <SelectItem value="full">{t("admin.extSyncInteg.taskTypeFull")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.extSyncInteg.syncDirection")}</Label>
                <Select
                  value={newTask.syncDirection}
                  onValueChange={(v) => setNewTask({ ...newTask, syncDirection: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ext_to_grt">{t("admin.extSyncInteg.dirExtToGrt")}</SelectItem>
                    <SelectItem value="grt_to_ext">{t("admin.extSyncInteg.dirGrtToExt")}</SelectItem>
                    <SelectItem value="bidirectional">{t("admin.extSyncInteg.dirBidirectional")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.extSyncInteg.cronExpression")}</Label>
                <Input
                  value={newTask.cronExpression}
                  onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                  placeholder="0 0 2 * * *"
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.extSyncInteg.cronDefault")}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("admin.extSyncInteg.enableNow")}</Label>
                <Switch
                  checked={newTask.isEnabled}
                  onCheckedChange={(v) => setNewTask({ ...newTask, isEnabled: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t("admin.extSyncInteg.cancelBtn")}
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={createTaskMutation.isPending || !newTask.taskName}
              >
                {createTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("admin.extSyncInteg.createBtn")}
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
            {t("admin.extSyncInteg.syncTaskList")}
          </CardTitle>
          <CardDescription>
            {t("admin.extSyncInteg.syncTaskListDesc")}
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
              <p>{t("admin.extSyncInteg.noSyncTasks")}</p>
              <p className="text-sm mt-2">{t("admin.extSyncInteg.initQuickHint")}</p>
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
                            if (confirm(t("admin.extSyncInteg.deleteTaskConfirm"))) {
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
                        {t("admin.extSyncInteg.lastExec")}: {new Date(task.lastRunAt).toLocaleString()}
                        {task.lastRunStatus && (
                          <Badge
                            variant={task.lastRunStatus === 'success' ? 'default' : 'destructive'}
                            className="ml-2"
                          >
                            {task.lastRunStatus === 'success' ? t("admin.extSyncInteg.lastRunSuccess") : t("admin.extSyncInteg.lastRunFail")}
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
  const { t } = useLanguage();
  const utils = trpc.useUtils();

  // 获取GRT角色列表
  const { data: rolesData, isLoading: rolesLoading } = trpc.externalSync.getGrtRoles.useQuery();

  // 获取映射统计
  const { data: mappingStats } = trpc.externalSync.getMappingStats.useQuery();

  // 自动映射
  const autoMapMutation = trpc.externalSync.autoMapRoles.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${t("admin.extSyncInteg.autoMapDone")}: ${(result as any).mapped}${t("admin.extSyncInteg.mapSuccess")}, ${(result as any).skipped}${t("admin.extSyncInteg.mapSkipped")}`);
        utils.externalSync.getMappingStats.invalidate();
      } else {
        toast.error(`${t("admin.extSyncInteg.mapFail")}: ${result.error}`);
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.totalRoles")}</p>
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.mappedRoles")}</p>
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
              <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.unmappedRoles")}</p>
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
          {t("admin.extSyncInteg.autoMapRoles")}
        </Button>
      </div>

      {/* GRT角色列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("admin.extSyncInteg.grtRoles")}
          </CardTitle>
          <CardDescription>
            {t("admin.extSyncInteg.grtRolesDesc")}
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
                        {role.permissionCount} {t("admin.extSyncInteg.permCount")}
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
            <CardTitle>{t("admin.extSyncInteg.roleDistribution")}</CardTitle>
            <CardDescription>
              {t("admin.extSyncInteg.roleDistributionDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(mappingStats.stats.roleDistribution).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>{role}</span>
                  <Badge>{count as number} {t("admin.extSyncInteg.personCount")}</Badge>
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
  const { t } = useLanguage();
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>(undefined);

  const utils = trpc.useUtils();

  // 获取任务列表（用于筛选）
  const { data: tasksData } = trpc.externalSync.getSyncTasks.useQuery();

  // 获取同步日志
  const { data: logsData, isLoading: logsLoading } = trpc.externalSync.getSyncLogs.useQuery({
    taskId: selectedTaskId,
    limit: 100,
  });

  // 重试失败任务
  const retryMutation = trpc.externalSync.executeSyncTask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t("admin.extSyncInteg.retrySuccess"));
        utils.externalSync.getSyncLogs.invalidate();
      } else {
        toast.error(`${t("admin.extSyncInteg.retryFail")}: ${result.error}`);
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
    success: t("admin.extSyncInteg.lastRunSuccess"),
    failed: t("admin.extSyncInteg.lastRunFail"),
    running: t("admin.extSyncInteg.statusUpdated"),
    pending: t("admin.extSyncImport.statusPending"),
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
            <SelectValue placeholder={t("admin.extSyncInteg.selectTask")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.extSyncInteg.allTasks")}</SelectItem>
            {tasksData?.tasks?.map((task) => (
              <SelectItem key={task.id} value={task.id.toString()}>
                {task.taskName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => utils.externalSync.getSyncLogs.invalidate()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("admin.extSyncInteg.refreshBtn")}
        </Button>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t("admin.extSyncInteg.syncLogs")}
          </CardTitle>
          <CardDescription>
            {t("admin.extSyncInteg.syncLogsDesc")}
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
              <p>{t("admin.extSyncInteg.noSyncLogs")}</p>
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
                          <p className="font-medium">{t("admin.extSyncInteg.taskId")} #{log.taskId}</p>
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
                        <span className="text-muted-foreground">{t("admin.extSyncInteg.successCountLabel")}: </span>
                        <span className="text-green-500 font-medium">{log.successCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("admin.extSyncInteg.failCountLabel")}: </span>
                        <span className="text-red-500 font-medium">{log.failedCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("admin.extSyncInteg.trigger")}: </span>
                        <span>{log.triggeredBy === 'manual' ? t("admin.extSyncInteg.triggerManual") : log.triggeredBy === 'cron' ? t("admin.extSyncInteg.triggerCron") : log.triggeredBy}</span>
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

export default function ExternalSyncIntegration() {
  const { t } = useLanguage();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<{ appId: string; formId: string } | null>(null);

  // 获取配置状态
  const { data: status, isLoading: statusLoading } = trpc.externalSync.getStatus.useQuery();

  // 获取应用列表
  const { data: appsData, isLoading: appsLoading, refetch: refetchApps } = trpc.externalSync.getApps.useQuery();

  // 获取表单列表
  const { data: formsData, isLoading: formsLoading } = trpc.externalSync.getForms.useQuery(
    { appId: selectedApp! },
    { enabled: !!selectedApp }
  );

  // 获取表单字段
  const { data: fieldsData, isLoading: fieldsLoading } = trpc.externalSync.getFormFields.useQuery(
    { appId: selectedForm?.appId!, formId: selectedForm?.formId! },
    { enabled: !!selectedForm }
  );

  // 获取表单数据
  const { data: formDataResult, isLoading: dataLoading } = trpc.externalSync.getFormData.useQuery(
    { appId: selectedForm?.appId!, formId: selectedForm?.formId!, limit: 20 },
    { enabled: !!selectedForm }
  );

  // 测试连接
  const testConnectionMutation = trpc.externalSync.testConnection.useMutation({
    onSuccess: (result) => {
      if ((result as any).mode === 'local') {
        const stats = (result as any).localStats;
        toast.info(`本地模式 — 部门${stats?.departments || 0} / 用户${stats?.users || 0} / 角色${stats?.roles || 0}`);
      } else if (result.success) {
        toast.success(`${t("admin.extSyncInteg.connectionSuccess")} ${result.apps} ${t("admin.extSyncInteg.appsFound")}`);
      } else {
        toast.error(`${t("admin.extSyncInteg.connectionFail")}: ${result.message}`);
      }
    },
    onError: (error) => {
      toast.error(`${t("admin.extSyncInteg.connectionError")}: ${error.message}`);
    },
  });

  // 全量同步
  const fullSyncMutation = trpc.externalSync.fullSync.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${t("admin.extSyncInteg.fullSyncDone")} ${result.apps} ${t("admin.extSyncInteg.fullSyncApps")}, ${result.totalRecords} ${t("admin.extSyncInteg.fullSyncRecords")}`);
        refetchApps();
      } else {
        toast.error(`${t("admin.extSyncInteg.fullSyncFail")}: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`${t("admin.extSyncInteg.fullSyncError")}: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Database}
          title={t("admin.extSyncInteg.title")}
          description={t("admin.extSyncInteg.description")}
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
                {t("admin.extSyncInteg.testConnection")}
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
                {t("admin.extSyncInteg.fullSync")}
              </Button>
            </>
          }
        />

        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              {(testConnectionMutation.data as any)?.mode === 'local' ? (
                <>
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.connectionStatus")}</p>
                    <p className="text-lg font-semibold text-blue-600">本地模式</p>
                    <p className="text-xs text-muted-foreground">
                      部门{(testConnectionMutation.data as any).localStats?.departments || 0} / 用户{(testConnectionMutation.data as any).localStats?.users || 0} / 角色{(testConnectionMutation.data as any).localStats?.roles || 0}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-3 rounded-lg ${status?.configured ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {status?.configured ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.connectionStatus")}</p>
                    <p className="text-lg font-semibold">{status?.configured ? t("admin.extSyncInteg.connected") : t("admin.extSyncInteg.notConfigured")}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.appCount")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.formCount")}</p>
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
                <p className="text-sm text-muted-foreground">{t("admin.extSyncInteg.dataRecords")}</p>
                <p className="text-lg font-semibold">{status?.stats?.totalRecords || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <Tabs defaultValue="apps" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="apps">{t("admin.extSyncInteg.tabApps")}</TabsTrigger>
            <TabsTrigger value="forms" disabled={!selectedApp}>{t("admin.extSyncInteg.tabForms")}</TabsTrigger>
            <TabsTrigger value="data" disabled={!selectedForm}>{t("admin.extSyncInteg.tabData")}</TabsTrigger>
            <TabsTrigger value="org">{t("admin.extSyncInteg.tabOrg")}</TabsTrigger>
            <TabsTrigger value="tasks">{t("admin.extSyncInteg.tabTasks")}</TabsTrigger>
            <TabsTrigger value="permissions">{t("admin.extSyncInteg.tabPermissions")}</TabsTrigger>
            <TabsTrigger value="logs">{t("admin.extSyncInteg.tabLogs")}</TabsTrigger>
          </TabsList>

          {/* 应用列表 */}
          <TabsContent value="apps">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t("admin.extSyncInteg.extApps")}
                </CardTitle>
                <CardDescription>
                  {t("admin.extSyncInteg.selectAppHint")}
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
                    <p>{t("admin.extSyncInteg.loadFail")}: {appsData.error}</p>
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
                  {t("admin.extSyncInteg.formList")}
                </CardTitle>
                <CardDescription>
                  {t("admin.extSyncInteg.selectFormHint")}
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
                    <p>{t("admin.extSyncInteg.loadFail")}: {formsData.error}</p>
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
                  <CardTitle>{t("admin.extSyncInteg.fieldStructure")}</CardTitle>
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
                          {field.required && <Badge variant="destructive" className="text-xs">{t("admin.extSyncInteg.required")}</Badge>}
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
                  {t("admin.extSyncInteg.dataPreview")}
                </CardTitle>
                <CardDescription>
                  {t("admin.extSyncInteg.first20Records")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : formDataResult?.error ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("admin.extSyncInteg.loadFail")}: {formDataResult.error}</p>
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
