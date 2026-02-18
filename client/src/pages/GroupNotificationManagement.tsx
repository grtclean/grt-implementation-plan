/**
 * 群组通知管理界面
 * 支持群组管理、成员管理、通知配置和发送通知功能
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Bell,
  Plus,
  Settings,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Building2,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 群组类型映射
const GROUP_TYPE_NAMES: Record<string, { label: string; color: string }> = {
  department: { label: "部门群组", color: "bg-blue-500/10 text-blue-500" },
  project: { label: "项目群组", color: "bg-green-500/10 text-green-500" },
  cross_dept: { label: "跨部门群组", color: "bg-purple-500/10 text-purple-500" },
  training: { label: "培训群组", color: "bg-orange-500/10 text-orange-500" },
  announcement: { label: "通告群组", color: "bg-red-500/10 text-red-500" },
  meeting: { label: "会议群组", color: "bg-cyan-500/10 text-cyan-500" },
  custom: { label: "自定义群组", color: "bg-gray-500/10 text-gray-500" },
};

// 通知类型映射
const NOTIFICATION_TYPE_NAMES: Record<string, string> = {
  meeting: "会议通知",
  training: "培训通知",
  announcement: "公告通知",
  reminder: "提醒通知",
  alert: "告警通知",
  custom: "自定义通知",
};

// 通知渠道映射
const CHANNEL_NAMES: Record<string, { label: string; icon: React.ReactNode }> = {
  email: { label: "邮件", icon: <Mail className="w-4 h-4" /> },
  system: { label: "系统", icon: <Bell className="w-4 h-4" /> },
  sms: { label: "短信", icon: <Smartphone className="w-4 h-4" /> },
  wechat: { label: "微信", icon: <MessageSquare className="w-4 h-4" /> },
};

// 优先级映射
const PRIORITY_NAMES: Record<string, { label: string; color: string }> = {
  low: { label: "低", color: "bg-gray-500/10 text-gray-500" },
  normal: { label: "普通", color: "bg-blue-500/10 text-blue-500" },
  high: { label: "高", color: "bg-orange-500/10 text-orange-500" },
  urgent: { label: "紧急", color: "bg-red-500/10 text-red-500" },
};

export default function GroupNotificationManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // 查询群组列表
  const groups = (trpc.permission as any).getGroups.useQuery({ isActive: 1 });

  // 初始化默认群组
  const initGroups = (trpc.permission as any).initDefaultGroups.useMutation({
    onSuccess: (data) => {
      toast.success(`成功初始化 ${data.created} 个群组，跳过 ${data.skipped} 个已存在群组`);
      groups.refetch();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="群组通知管理"
          description="管理部门群组、会议群组、培训群组，配置和发送群组通知"
          actions={
            <>
              <Button variant="outline" onClick={() => groups.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button
                variant="outline"
                onClick={() => initGroups.mutate()}
                disabled={initGroups.isPending}
              >
                <Settings className="w-4 h-4 mr-2" />
                {initGroups.isPending ? "初始化中..." : "初始化默认群组"}
              </Button>
            </>
          }
        />

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              群组管理
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              通知配置
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              发送通知
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              发送记录
            </TabsTrigger>
          </TabsList>

          {/* 群组管理 */}
          <TabsContent value="groups" className="space-y-4">
            <GroupsTab
              groups={groups.data || []}
              isLoading={groups.isLoading}
              onRefresh={() => groups.refetch()}
              onSelectGroup={setSelectedGroupId}
              selectedGroupId={selectedGroupId}
            />
          </TabsContent>

          {/* 通知配置 */}
          <TabsContent value="notifications" className="space-y-4">
            <NotificationConfigsTab
              groups={groups.data || []}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          </TabsContent>

          {/* 发送通知 */}
          <TabsContent value="send" className="space-y-4">
            <SendNotificationTab
              groups={groups.data || []}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          </TabsContent>

          {/* 发送记录 */}
          <TabsContent value="logs" className="space-y-4">
            <NotificationLogsTab
              groups={groups.data || []}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          </TabsContent>
        </Tabs>
      </div>
  );
}

// 群组管理标签页
function GroupsTab({
  groups,
  isLoading,
  onRefresh,
  onSelectGroup,
  selectedGroupId,
}: {
  groups: any[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectGroup: (id: number | null) => void;
  selectedGroupId: number | null;
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    groupCode: "",
    name: "",
    type: "custom" as const,
    description: "",
  });

  const createGroup = (trpc.permission as any).createGroup.useMutation({
    onSuccess: () => {
      toast.success("群组创建成功");
      setShowCreateDialog(false);
      setNewGroup({ groupCode: "", name: "", type: "custom", description: "" });
      onRefresh();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const deleteGroup = (trpc.permission as any).deleteGroup.useMutation({
    onSuccess: () => {
      toast.success("群组已删除");
      onRefresh();
      if (selectedGroupId) onSelectGroup(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 按类型分组
  const groupsByType = groups.reduce((acc, group) => {
    if (!acc[group.type]) acc[group.type] = [];
    acc[group.type].push(group);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 群组列表 */}
      <Card className="bg-card/50 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                群组列表
              </CardTitle>
              <CardDescription>共 {groups.length} 个群组</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  创建群组
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新群组</DialogTitle>
                  <DialogDescription>填写群组信息创建新的通知群组</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>群组代码</Label>
                    <Input
                      placeholder="例如: grp_custom_001"
                      value={newGroup.groupCode}
                      onChange={(e) => setNewGroup({ ...newGroup, groupCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>群组名称</Label>
                    <Input
                      placeholder="例如: 项目A团队群组"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>群组类型</Label>
                    <Select
                      value={newGroup.type}
                      onValueChange={(v: any) => setNewGroup({ ...newGroup, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GROUP_TYPE_NAMES).map(([value, { label }]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea
                      placeholder="群组描述..."
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={() => createGroup.mutate(newGroup)}
                    disabled={createGroup.isPending || !newGroup.groupCode || !newGroup.name}
                  >
                    {createGroup.isPending ? "创建中..." : "创建"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无群组，请点击"初始化默认群组"创建预定义群组
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupsByType) as [string, any[]][]).map(([type, typeGroups]) => (
                <div key={type}>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className={GROUP_TYPE_NAMES[type]?.color}>
                      {GROUP_TYPE_NAMES[type]?.label || type}
                    </Badge>
                    <span>({typeGroups.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {typeGroups.map((group: any) => (
                      <div
                        key={group.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedGroupId === group.id
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/30 border-border hover:border-primary/50"
                        }`}
                        onClick={() => onSelectGroup(group.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{group.groupCode}</p>
                            {group.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {group.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("确定要删除此群组吗？")) {
                                deleteGroup.mutate({ id: group.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 群组详情/成员管理 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            群组成员
          </CardTitle>
          <CardDescription>
            {selectedGroupId ? "管理群组成员" : "选择一个群组查看成员"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedGroupId ? (
            <GroupMembersPanel groupId={selectedGroupId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              请从左侧选择一个群组
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 群组成员管理面板
function GroupMembersPanel({ groupId }: { groupId: number }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    memberType: "user" as "user" | "role" | "department",
    userId: undefined as number | undefined,
    roleId: "",
    departmentId: "",
    isAdmin: false,
  });

  const members = (trpc.permission as any).getGroupMembers.useQuery({ groupId });

  const addMember = (trpc.permission as any).addGroupMember.useMutation({
    onSuccess: () => {
      toast.success("成员添加成功");
      setShowAddDialog(false);
      members.refetch();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  const removeMember = (trpc.permission as any).removeGroupMember.useMutation({
    onSuccess: () => {
      toast.success("成员已移除");
      members.refetch();
    },
    onError: (error) => {
      toast.error(`移除失败: ${error.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          共 {members.data?.length || 0} 个成员
        </span>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加群组成员</DialogTitle>
              <DialogDescription>选择成员类型并添加到群组</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>成员类型</Label>
                <Select
                  value={newMember.memberType}
                  onValueChange={(v: any) => setNewMember({ ...newMember, memberType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">指定用户</SelectItem>
                    <SelectItem value="role">按角色</SelectItem>
                    <SelectItem value="department">按部门</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newMember.memberType === "user" && (
                <div className="space-y-2">
                  <Label>用户ID</Label>
                  <Input
                    type="number"
                    placeholder="输入用户ID"
                    onChange={(e) => setNewMember({ ...newMember, userId: parseInt(e.target.value) || undefined })}
                  />
                </div>
              )}
              {newMember.memberType === "role" && (
                <div className="space-y-2">
                  <Label>角色</Label>
                  <Select
                    value={newMember.roleId}
                    onValueChange={(v) => setNewMember({ ...newMember, roleId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">普通员工</SelectItem>
                      <SelectItem value="team_lead">组长/主管</SelectItem>
                      <SelectItem value="dept_manager">部门经理</SelectItem>
                      <SelectItem value="hr_specialist">HR专员</SelectItem>
                      <SelectItem value="hr_manager">HR经理</SelectItem>
                      <SelectItem value="finance_specialist">财务专员</SelectItem>
                      <SelectItem value="finance_manager">财务经理</SelectItem>
                      <SelectItem value="director">总监</SelectItem>
                      <SelectItem value="admin">系统管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newMember.memberType === "department" && (
                <div className="space-y-2">
                  <Label>部门</Label>
                  <Select
                    value={newMember.departmentId}
                    onValueChange={(v) => setNewMember({ ...newMember, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">销售部</SelectItem>
                      <SelectItem value="tech">技术服务部</SelectItem>
                      <SelectItem value="production">生产部</SelectItem>
                      <SelectItem value="procurement">采购部</SelectItem>
                      <SelectItem value="quality">品管部</SelectItem>
                      <SelectItem value="finance">财务部</SelectItem>
                      <SelectItem value="hr">人力资源部</SelectItem>
                      <SelectItem value="admin">行政部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isAdmin"
                  checked={newMember.isAdmin}
                  onCheckedChange={(checked) => setNewMember({ ...newMember, isAdmin: !!checked })}
                />
                <Label htmlFor="isAdmin">设为群组管理员</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button
                onClick={() => addMember.mutate({
                  groupId,
                  memberType: newMember.memberType,
                  userId: newMember.userId,
                  roleId: newMember.roleId || undefined,
                  departmentId: newMember.departmentId || undefined,
                  isAdmin: newMember.isAdmin,
                })}
                disabled={addMember.isPending}
              >
                {addMember.isPending ? "添加中..." : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {members.isLoading ? (
        <div className="text-center py-4 text-muted-foreground">加载中...</div>
      ) : members.data?.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">暂无成员</div>
      ) : (
        <div className="space-y-2">
          {members.data?.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  member.memberType === "user" ? "bg-blue-500/10" :
                  member.memberType === "role" ? "bg-green-500/10" :
                  "bg-orange-500/10"
                }`}>
                  {member.memberType === "user" ? (
                    <Users className="w-4 h-4 text-blue-500" />
                  ) : member.memberType === "role" ? (
                    <Building2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Building2 className="w-4 h-4 text-orange-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {member.memberType === "user" ? `用户 #${member.userId}` :
                     member.memberType === "role" ? `角色: ${member.roleId}` :
                     `部门: ${member.departmentId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.isAdmin && <Badge variant="secondary" className="mr-2">管理员</Badge>}
                    {new Date(member.joinedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeMember.mutate({ id: member.id })}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 通知配置标签页
function NotificationConfigsTab({
  groups,
  selectedGroupId,
  onSelectGroup,
}: {
  groups: any[];
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    notificationType: "announcement" as const,
    titleTemplate: "",
    contentTemplate: "",
    cronExpression: "",
    channels: ["system"] as ("email" | "system" | "sms" | "wechat")[],
    priority: "normal" as const,
  });

  const configs = (trpc.permission as any).getGroupNotificationConfigs.useQuery(
    { groupId: selectedGroupId! },
    { enabled: !!selectedGroupId }
  );

  const createConfig = (trpc.permission as any).createGroupNotificationConfig.useMutation({
    onSuccess: () => {
      toast.success("通知配置创建成功");
      setShowCreateDialog(false);
      configs.refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const deleteConfig = (trpc.permission as any).deleteGroupNotificationConfig.useMutation({
    onSuccess: () => {
      toast.success("配置已删除");
      configs.refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 群组选择 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm">选择群组</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedGroupId === group.id
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                <p className="font-medium text-sm">{group.name}</p>
                <Badge variant="outline" className={`mt-1 text-xs ${GROUP_TYPE_NAMES[group.type]?.color}`}>
                  {GROUP_TYPE_NAMES[group.type]?.label}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 通知配置列表 */}
      <Card className="bg-card/50 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                通知配置 {selectedGroup && `- ${selectedGroup.name}`}
              </CardTitle>
              <CardDescription>
                {selectedGroupId ? "配置群组的通知规则" : "请先选择一个群组"}
              </CardDescription>
            </div>
            {selectedGroupId && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    添加配置
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>创建通知配置</DialogTitle>
                    <DialogDescription>为群组配置通知规则</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>通知类型</Label>
                      <Select
                        value={newConfig.notificationType}
                        onValueChange={(v: any) => setNewConfig({ ...newConfig, notificationType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(NOTIFICATION_TYPE_NAMES).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>标题模板</Label>
                      <Input
                        placeholder="例如: [会议通知] {{meetingTitle}}"
                        value={newConfig.titleTemplate}
                        onChange={(e) => setNewConfig({ ...newConfig, titleTemplate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>内容模板</Label>
                      <Textarea
                        placeholder="通知内容模板，支持变量..."
                        value={newConfig.contentTemplate}
                        onChange={(e) => setNewConfig({ ...newConfig, contentTemplate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cron表达式（可选，用于定时通知）</Label>
                      <Input
                        placeholder="例如: 0 9 * * 1 (每周一9点)"
                        value={newConfig.cronExpression}
                        onChange={(e) => setNewConfig({ ...newConfig, cronExpression: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>通知渠道</Label>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(CHANNEL_NAMES).map(([value, { label, icon }]) => (
                          <div key={value} className="flex items-center gap-2">
                            <Checkbox
                              id={`channel-${value}`}
                              checked={newConfig.channels.includes(value as any)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewConfig({ ...newConfig, channels: [...newConfig.channels, value as any] });
                                } else {
                                  setNewConfig({ ...newConfig, channels: newConfig.channels.filter((c) => c !== value) });
                                }
                              }}
                            />
                            <Label htmlFor={`channel-${value}`} className="flex items-center gap-1">
                              {icon} {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>优先级</Label>
                      <Select
                        value={newConfig.priority}
                        onValueChange={(v: any) => setNewConfig({ ...newConfig, priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_NAMES).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => createConfig.mutate({
                        groupId: selectedGroupId!,
                        ...newConfig,
                      })}
                      disabled={createConfig.isPending || !newConfig.titleTemplate}
                    >
                      {createConfig.isPending ? "创建中..." : "创建"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedGroupId ? (
            <div className="text-center py-8 text-muted-foreground">
              请从左侧选择一个群组
            </div>
          ) : configs.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : configs.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无通知配置
            </div>
          ) : (
            <div className="space-y-3">
              {configs.data?.map((config: any) => (
                <div
                  key={config.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {NOTIFICATION_TYPE_NAMES[config.notificationType]}
                        </Badge>
                        <Badge variant="outline" className={PRIORITY_NAMES[config.priority]?.color}>
                          {PRIORITY_NAMES[config.priority]?.label}
                        </Badge>
                        {config.isEnabled ? (
                          <Badge className="bg-green-500/10 text-green-500">启用</Badge>
                        ) : (
                          <Badge variant="secondary">禁用</Badge>
                        )}
                      </div>
                      <p className="font-medium mt-2">{config.titleTemplate}</p>
                      {config.contentTemplate && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {config.contentTemplate}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          渠道: {(config.channels as string[]).map((c) => CHANNEL_NAMES[c]?.label).join(", ")}
                        </span>
                        {config.cronExpression && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {config.cronExpression}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("确定要删除此配置吗？")) {
                          deleteConfig.mutate({ id: config.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 发送通知标签页
function SendNotificationTab({
  groups,
  selectedGroupId,
  onSelectGroup,
}: {
  groups: any[];
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
}) {
  const [notification, setNotification] = useState({
    notificationType: "announcement" as const,
    title: "",
    content: "",
    channels: ["system"] as ("email" | "system" | "sms" | "wechat")[],
    priority: "normal" as const,
  });

  const sendNotification = (trpc.permission as any).sendGroupNotification.useMutation({
    onSuccess: (data) => {
      toast.success(`通知发送成功！共发送给 ${data.totalRecipients} 人`);
      setNotification({
        notificationType: "announcement",
        title: "",
        content: "",
        channels: ["system"],
        priority: "normal",
      });
    },
    onError: (error) => {
      toast.error(`发送失败: ${error.message}`);
    },
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 群组选择 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm">选择目标群组</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedGroupId === group.id
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                <p className="font-medium text-sm">{group.name}</p>
                <Badge variant="outline" className={`mt-1 text-xs ${GROUP_TYPE_NAMES[group.type]?.color}`}>
                  {GROUP_TYPE_NAMES[group.type]?.label}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 发送表单 */}
      <Card className="bg-card/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            发送通知 {selectedGroup && `- ${selectedGroup.name}`}
          </CardTitle>
          <CardDescription>
            {selectedGroupId ? "填写通知内容并发送给群组成员" : "请先选择一个目标群组"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedGroupId ? (
            <div className="text-center py-8 text-muted-foreground">
              请从左侧选择一个目标群组
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>通知类型</Label>
                  <Select
                    value={notification.notificationType}
                    onValueChange={(v: any) => setNotification({ ...notification, notificationType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NOTIFICATION_TYPE_NAMES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select
                    value={notification.priority}
                    onValueChange={(v: any) => setNotification({ ...notification, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_NAMES).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>通知标题</Label>
                <Input
                  placeholder="输入通知标题..."
                  value={notification.title}
                  onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>通知内容</Label>
                <Textarea
                  placeholder="输入通知内容..."
                  rows={5}
                  value={notification.content}
                  onChange={(e) => setNotification({ ...notification, content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>发送渠道</Label>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(CHANNEL_NAMES).map(([value, { label, icon }]) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`send-channel-${value}`}
                        checked={notification.channels.includes(value as any)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNotification({ ...notification, channels: [...notification.channels, value as any] });
                          } else {
                            setNotification({ ...notification, channels: notification.channels.filter((c) => c !== value) });
                          }
                        }}
                      />
                      <Label htmlFor={`send-channel-${value}`} className="flex items-center gap-1">
                        {icon} {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => sendNotification.mutate({
                    groupId: selectedGroupId,
                    ...notification,
                  })}
                  disabled={sendNotification.isPending || !notification.title || notification.channels.length === 0}
                >
                  {sendNotification.isPending ? (
                    <>发送中...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      发送通知
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 通知记录标签页
function NotificationLogsTab({
  groups,
  selectedGroupId,
  onSelectGroup,
}: {
  groups: any[];
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
}) {
  const logs = (trpc.permission as any).getGroupNotificationLogs.useQuery({
    groupId: selectedGroupId || undefined,
    limit: 50,
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs">筛选群组</Label>
              <Select
                value={selectedGroupId?.toString() || "all"}
                onValueChange={(v) => onSelectGroup(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="全部群组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部群组</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              共 {logs.data?.total || 0} 条记录
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            发送记录 {selectedGroup && `- ${selectedGroup.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : logs.data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无发送记录</div>
          ) : (
            <div className="space-y-3">
              {logs.data?.logs.map((log: any) => {
                const group = groups.find((g) => g.id === log.groupId);
                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {NOTIFICATION_TYPE_NAMES[log.notificationType]}
                          </Badge>
                          <Badge variant="outline" className={CHANNEL_NAMES[log.channel] ? "" : "bg-muted"}>
                            {CHANNEL_NAMES[log.channel]?.icon}
                            <span className="ml-1">{CHANNEL_NAMES[log.channel]?.label || log.channel}</span>
                          </Badge>
                          {group && (
                            <Badge variant="secondary">{group.name}</Badge>
                          )}
                        </div>
                        <p className="font-medium mt-2">{log.title}</p>
                        {log.content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {log.content}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {log.recipientCount} 人
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            成功 {log.successCount}
                          </span>
                          {log.failedCount > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              失败 {log.failedCount}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          log.status === "completed" ? "default" :
                          log.status === "failed" ? "destructive" :
                          "secondary"
                        }
                      >
                        {log.status === "completed" ? "已完成" :
                         log.status === "failed" ? "失败" :
                         log.status === "sending" ? "发送中" :
                         "待发送"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
