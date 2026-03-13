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
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

// Color maps (language-independent)
const GROUP_TYPE_COLORS: Record<string, string> = {
  department: "bg-blue-500/10 text-blue-500",
  project: "bg-green-500/10 text-green-500",
  cross_dept: "bg-purple-500/10 text-purple-500",
  training: "bg-orange-500/10 text-orange-500",
  announcement: "bg-red-500/10 text-red-500",
  meeting: "bg-cyan-500/10 text-cyan-500",
  custom: "bg-gray-500/10 text-gray-500",
};

const GROUP_TYPE_I18N: Record<string, string> = {
  department: "admin.groupNotif.typeDepartment",
  project: "admin.groupNotif.typeProject",
  cross_dept: "admin.groupNotif.typeCrossDept",
  training: "admin.groupNotif.typeTraining",
  announcement: "admin.groupNotif.typeAnnouncement",
  meeting: "admin.groupNotif.typeMeeting",
  custom: "admin.groupNotif.typeCustom",
};

const NOTIFICATION_TYPE_I18N: Record<string, string> = {
  meeting: "admin.groupNotif.notifMeeting",
  training: "admin.groupNotif.notifTraining",
  announcement: "admin.groupNotif.notifAnnouncement",
  reminder: "admin.groupNotif.notifReminder",
  alert: "admin.groupNotif.notifAlert",
  custom: "admin.groupNotif.notifCustom",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  system: <Bell className="w-4 h-4" />,
  sms: <Smartphone className="w-4 h-4" />,
  wechat: <MessageSquare className="w-4 h-4" />,
};

const CHANNEL_I18N: Record<string, string> = {
  email: "admin.groupNotif.channelEmail",
  system: "admin.groupNotif.channelSystem",
  sms: "admin.groupNotif.channelSms",
  wechat: "admin.groupNotif.channelWechat",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-500",
  normal: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

const PRIORITY_I18N: Record<string, string> = {
  low: "admin.groupNotif.priorityLow",
  normal: "admin.groupNotif.priorityNormal",
  high: "admin.groupNotif.priorityHigh",
  urgent: "admin.groupNotif.priorityUrgent",
};

export default function GroupNotificationManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // 查询群组列表
  const groups = (trpc.permission as any).getGroups.useQuery({ isActive: 1 });

  // 初始化默认群组
  const initGroups = (trpc.permission as any).initDefaultGroups.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("admin.groupNotif.initSuccess")} ${data.created}, ${data.skipped} ${t("admin.groupNotif.initSkipped")}`);
      groups.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.initFailed")}: ${error.message}`);
    },
  });

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title={t("admin.groupNotif.title")}
          description={t("admin.groupNotif.description")}
          actions={
            <>
              <Button variant="outline" onClick={() => groups.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("admin.groupNotif.refresh")}
              </Button>
              <Button
                variant="outline"
                onClick={() => initGroups.mutate()}
                disabled={initGroups.isPending}
              >
                <Settings className="w-4 h-4 mr-2" />
                {initGroups.isPending ? t("admin.groupNotif.initializing") : t("admin.groupNotif.initDefaultGroups")}
              </Button>
            </>
          }
        />

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("admin.groupNotif.tabGroups")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t("admin.groupNotif.tabNotifications")}
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {t("admin.groupNotif.tabSend")}
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t("admin.groupNotif.tabLogs")}
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
  const { t } = useLanguage();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    groupCode: "",
    name: "",
    type: "custom" as const,
    description: "",
  });

  const createGroup = (trpc.permission as any).createGroup.useMutation({
    onSuccess: () => {
      toast.success(t("admin.groupNotif.createSuccess"));
      setShowCreateDialog(false);
      setNewGroup({ groupCode: "", name: "", type: "custom", description: "" });
      onRefresh();
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.createFailed")}: ${error.message}`);
    },
  });

  const deleteGroup = (trpc.permission as any).deleteGroup.useMutation({
    onSuccess: () => {
      toast.success(t("admin.groupNotif.deleteSuccess"));
      onRefresh();
      if (selectedGroupId) onSelectGroup(null);
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.deleteFailed")}: ${error.message}`);
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
                {t("admin.groupNotif.groupList")}
              </CardTitle>
              <CardDescription>{groups.length} {t("admin.groupNotif.tabGroups")}</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("admin.groupNotif.createGroup")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.groupNotif.createNewGroup")}</DialogTitle>
                  <DialogDescription>{t("admin.groupNotif.createNewGroupDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("admin.groupNotif.groupCode")}</Label>
                    <Input
                      placeholder={t("admin.groupNotif.groupCodePlaceholder")}
                      value={newGroup.groupCode}
                      onChange={(e) => setNewGroup({ ...newGroup, groupCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.groupNotif.groupName")}</Label>
                    <Input
                      placeholder={t("admin.groupNotif.groupNamePlaceholder")}
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.groupNotif.groupType")}</Label>
                    <Select
                      value={newGroup.type}
                      onValueChange={(v: any) => setNewGroup({ ...newGroup, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GROUP_TYPE_I18N).map(([value, key]) => (
                          <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.groupNotif.descriptionLabel")}</Label>
                    <Textarea
                      placeholder={t("admin.groupNotif.descriptionPlaceholder")}
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    {t("admin.groupNotif.cancel")}
                  </Button>
                  <Button
                    onClick={() => createGroup.mutate(newGroup)}
                    disabled={createGroup.isPending || !newGroup.groupCode || !newGroup.name}
                  >
                    {createGroup.isPending ? t("admin.groupNotif.creating") : t("admin.groupNotif.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("admin.groupNotif.loading")}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.groupNotif.noGroupsHint")}
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupsByType) as [string, any[]][]).map(([type, typeGroups]) => (
                <div key={type}>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className={GROUP_TYPE_COLORS[type]}>
                      {GROUP_TYPE_I18N[type] ? t(GROUP_TYPE_I18N[type]) : type}
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
                              if (confirm(t("admin.groupNotif.deleteConfirm"))) {
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
            {t("admin.groupNotif.groupMembers")}
          </CardTitle>
          <CardDescription>
            {selectedGroupId ? t("admin.groupNotif.manageMembers") : t("admin.groupNotif.selectGroupHint")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedGroupId ? (
            <GroupMembersPanel groupId={selectedGroupId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.groupNotif.selectFromLeft")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 群组成员管理面板
function GroupMembersPanel({ groupId }: { groupId: number }) {
  const { t } = useLanguage();
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
      toast.success(t("admin.groupNotif.addSuccess"));
      setShowAddDialog(false);
      members.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.addFailed")}: ${error.message}`);
    },
  });

  const removeMember = (trpc.permission as any).removeGroupMember.useMutation({
    onSuccess: () => {
      toast.success(t("admin.groupNotif.removeSuccess"));
      members.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.removeFailed")}: ${error.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {members.data?.length || 0} {t("admin.groupNotif.recipientCount")}
        </span>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.groupNotif.addMember")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.groupNotif.addGroupMember")}</DialogTitle>
              <DialogDescription>{t("admin.groupNotif.addGroupMemberDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.groupNotif.memberType")}</Label>
                <Select
                  value={newMember.memberType}
                  onValueChange={(v: any) => setNewMember({ ...newMember, memberType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("admin.groupNotif.specifyUser")}</SelectItem>
                    <SelectItem value="role">{t("admin.groupNotif.byRole")}</SelectItem>
                    <SelectItem value="department">{t("admin.groupNotif.byDepartment")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newMember.memberType === "user" && (
                <div className="space-y-2">
                  <Label>{t("admin.groupNotif.userId")}</Label>
                  <Input
                    type="number"
                    placeholder={t("admin.groupNotif.userIdPlaceholder")}
                    onChange={(e) => setNewMember({ ...newMember, userId: parseInt(e.target.value) || undefined })}
                  />
                </div>
              )}
              {newMember.memberType === "role" && (
                <div className="space-y-2">
                  <Label>{t("admin.groupNotif.role")}</Label>
                  <Select
                    value={newMember.roleId}
                    onValueChange={(v) => setNewMember({ ...newMember, roleId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.groupNotif.selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t("admin.groupNotif.roleEmployee")}</SelectItem>
                      <SelectItem value="team_lead">{t("admin.groupNotif.roleTeamLead")}</SelectItem>
                      <SelectItem value="dept_manager">{t("admin.groupNotif.roleDeptManager")}</SelectItem>
                      <SelectItem value="hr_specialist">{t("admin.groupNotif.roleHrSpecialist")}</SelectItem>
                      <SelectItem value="hr_manager">{t("admin.groupNotif.roleHrManager")}</SelectItem>
                      <SelectItem value="finance_specialist">{t("admin.groupNotif.roleFinanceSpec")}</SelectItem>
                      <SelectItem value="finance_manager">{t("admin.groupNotif.roleFinanceMgr")}</SelectItem>
                      <SelectItem value="director">{t("admin.groupNotif.roleDirector")}</SelectItem>
                      <SelectItem value="admin">{t("admin.groupNotif.roleAdminUser")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newMember.memberType === "department" && (
                <div className="space-y-2">
                  <Label>{t("admin.groupNotif.department")}</Label>
                  <Select
                    value={newMember.departmentId}
                    onValueChange={(v) => setNewMember({ ...newMember, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.groupNotif.selectDepartment")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">{t("admin.groupNotif.deptSales")}</SelectItem>
                      <SelectItem value="tech">{t("admin.groupNotif.deptTech")}</SelectItem>
                      <SelectItem value="production">{t("admin.groupNotif.deptProduction")}</SelectItem>
                      <SelectItem value="procurement">{t("admin.groupNotif.deptProcurement")}</SelectItem>
                      <SelectItem value="quality">{t("admin.groupNotif.deptQuality")}</SelectItem>
                      <SelectItem value="finance">{t("admin.groupNotif.deptFinance")}</SelectItem>
                      <SelectItem value="hr">{t("admin.groupNotif.deptHr")}</SelectItem>
                      <SelectItem value="admin">{t("admin.groupNotif.deptAdmin")}</SelectItem>
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
                <Label htmlFor="isAdmin">{t("admin.groupNotif.setAsAdmin")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t("admin.groupNotif.cancel")}
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
                {addMember.isPending ? t("admin.groupNotif.adding") : t("admin.groupNotif.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {members.isLoading ? (
        <div className="text-center py-4 text-muted-foreground">{t("admin.groupNotif.loading")}</div>
      ) : members.data?.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">{t("admin.groupNotif.noMembers")}</div>
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
                    {member.memberType === "user" ? `${t("admin.groupNotif.userPrefix")}${member.userId}` :
                     member.memberType === "role" ? `${t("admin.groupNotif.rolePrefix")} ${member.roleId}` :
                     `${t("admin.groupNotif.deptIdPrefix")} ${member.departmentId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.isAdmin && <Badge variant="secondary" className="mr-2">{t("admin.groupNotif.admin")}</Badge>}
                    {new Date(member.joinedAt).toLocaleDateString()}
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
  const { t } = useLanguage();
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
      toast.success(t("admin.groupNotif.configCreated"));
      setShowCreateDialog(false);
      configs.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.configCreateFailed")}: ${error.message}`);
    },
  });

  const deleteConfig = (trpc.permission as any).deleteGroupNotificationConfig.useMutation({
    onSuccess: () => {
      toast.success(t("admin.groupNotif.configDeleted"));
      configs.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.configDeleteFailed")}: ${error.message}`);
    },
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 群组选择 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm">{t("admin.groupNotif.selectGroup")}</CardTitle>
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
                <Badge variant="outline" className={`mt-1 text-xs ${GROUP_TYPE_COLORS[group.type]}`}>
                  {GROUP_TYPE_I18N[group.type] ? t(GROUP_TYPE_I18N[group.type]) : group.type}
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
                {t("admin.groupNotif.notifConfig")} {selectedGroup && `- ${selectedGroup.name}`}
              </CardTitle>
              <CardDescription>
                {selectedGroupId ? t("admin.groupNotif.configRules") : t("admin.groupNotif.selectGroupFirst")}
              </CardDescription>
            </div>
            {selectedGroupId && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("admin.groupNotif.addConfig")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("admin.groupNotif.createNotifConfig")}</DialogTitle>
                    <DialogDescription>{t("admin.groupNotif.createNotifConfigDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("admin.groupNotif.notifType")}</Label>
                      <Select
                        value={newConfig.notificationType}
                        onValueChange={(v: any) => setNewConfig({ ...newConfig, notificationType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(NOTIFICATION_TYPE_I18N).map(([value, key]) => (
                            <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.groupNotif.titleTemplate")}</Label>
                      <Input
                        placeholder={t("admin.groupNotif.titleTemplatePlaceholder")}
                        value={newConfig.titleTemplate}
                        onChange={(e) => setNewConfig({ ...newConfig, titleTemplate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.groupNotif.contentTemplate")}</Label>
                      <Textarea
                        placeholder={t("admin.groupNotif.contentTemplatePlaceholder")}
                        value={newConfig.contentTemplate}
                        onChange={(e) => setNewConfig({ ...newConfig, contentTemplate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.groupNotif.cronExpression")}</Label>
                      <Input
                        placeholder={t("admin.groupNotif.cronPlaceholder")}
                        value={newConfig.cronExpression}
                        onChange={(e) => setNewConfig({ ...newConfig, cronExpression: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.groupNotif.channels")}</Label>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(CHANNEL_I18N).map(([value, key]) => (
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
                              {CHANNEL_ICONS[value]} {t(key)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.groupNotif.priority")}</Label>
                      <Select
                        value={newConfig.priority}
                        onValueChange={(v: any) => setNewConfig({ ...newConfig, priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_I18N).map(([value, key]) => (
                            <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      {t("admin.groupNotif.cancel")}
                    </Button>
                    <Button
                      onClick={() => createConfig.mutate({
                        groupId: selectedGroupId!,
                        ...newConfig,
                      })}
                      disabled={createConfig.isPending || !newConfig.titleTemplate}
                    >
                      {createConfig.isPending ? t("admin.groupNotif.creating") : t("admin.groupNotif.create")}
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
              {t("admin.groupNotif.selectFromLeft")}
            </div>
          ) : configs.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("admin.groupNotif.loading")}</div>
          ) : configs.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.groupNotif.noConfigs")}
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
                          {NOTIFICATION_TYPE_I18N[config.notificationType] ? t(NOTIFICATION_TYPE_I18N[config.notificationType]) : config.notificationType}
                        </Badge>
                        <Badge variant="outline" className={PRIORITY_COLORS[config.priority]}>
                          {PRIORITY_I18N[config.priority] ? t(PRIORITY_I18N[config.priority]) : config.priority}
                        </Badge>
                        {config.isEnabled ? (
                          <Badge className="bg-green-500/10 text-green-500">{t("admin.groupNotif.enabled")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("admin.groupNotif.disabled")}</Badge>
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
                          {t("admin.groupNotif.channelLabel")} {(config.channels as string[]).map((c) => CHANNEL_I18N[c] ? t(CHANNEL_I18N[c]) : c).join(", ")}
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
                        if (confirm(t("admin.groupNotif.deleteConfigConfirm"))) {
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
  const { t } = useLanguage();
  const [notification, setNotification] = useState({
    notificationType: "announcement" as const,
    title: "",
    content: "",
    channels: ["system"] as ("email" | "system" | "sms" | "wechat")[],
    priority: "normal" as const,
  });

  const sendNotification = (trpc.permission as any).sendGroupNotification.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("admin.groupNotif.sendSuccess")} ${data.totalRecipients} ${t("admin.groupNotif.totalRecipients")}`);
      setNotification({
        notificationType: "announcement",
        title: "",
        content: "",
        channels: ["system"],
        priority: "normal",
      });
    },
    onError: (error) => {
      toast.error(`${t("admin.groupNotif.sendFailed")}: ${error.message}`);
    },
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 群组选择 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm">{t("admin.groupNotif.selectTargetGroup")}</CardTitle>
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
                <Badge variant="outline" className={`mt-1 text-xs ${GROUP_TYPE_COLORS[group.type]}`}>
                  {GROUP_TYPE_I18N[group.type] ? t(GROUP_TYPE_I18N[group.type]) : group.type}
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
            {t("admin.groupNotif.sendNotification")} {selectedGroup && `- ${selectedGroup.name}`}
          </CardTitle>
          <CardDescription>
            {selectedGroupId ? t("admin.groupNotif.sendDesc") : t("admin.groupNotif.selectTargetFirst")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedGroupId ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.groupNotif.selectTargetFromLeft")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.groupNotif.notifType")}</Label>
                  <Select
                    value={notification.notificationType}
                    onValueChange={(v: any) => setNotification({ ...notification, notificationType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NOTIFICATION_TYPE_I18N).map(([value, key]) => (
                        <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.groupNotif.priority")}</Label>
                  <Select
                    value={notification.priority}
                    onValueChange={(v: any) => setNotification({ ...notification, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_I18N).map(([value, key]) => (
                        <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.groupNotif.notifTitle")}</Label>
                <Input
                  placeholder={t("admin.groupNotif.notifTitlePlaceholder")}
                  value={notification.title}
                  onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.groupNotif.notifContent")}</Label>
                <Textarea
                  placeholder={t("admin.groupNotif.notifContentPlaceholder")}
                  rows={5}
                  value={notification.content}
                  onChange={(e) => setNotification({ ...notification, content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.groupNotif.sendChannels")}</Label>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(CHANNEL_I18N).map(([value, key]) => (
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
                        {CHANNEL_ICONS[value]} {t(key)}
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
                    <>{t("admin.groupNotif.sending")}</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t("admin.groupNotif.sendBtn")}
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
  const { t } = useLanguage();
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
              <Label className="text-xs">{t("admin.groupNotif.filterGroup")}</Label>
              <Select
                value={selectedGroupId?.toString() || "all"}
                onValueChange={(v) => onSelectGroup(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("admin.groupNotif.allGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.groupNotif.allGroups")}</SelectItem>
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
              {logs.data?.total || 0} {t("admin.groupNotif.totalRecords")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t("admin.groupNotif.sendRecords")} {selectedGroup && `- ${selectedGroup.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("admin.groupNotif.loading")}</div>
          ) : logs.data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("admin.groupNotif.noSendRecords")}</div>
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
                            {NOTIFICATION_TYPE_I18N[log.notificationType] ? t(NOTIFICATION_TYPE_I18N[log.notificationType]) : log.notificationType}
                          </Badge>
                          <Badge variant="outline" className={CHANNEL_I18N[log.channel] ? "" : "bg-muted"}>
                            {CHANNEL_ICONS[log.channel]}
                            <span className="ml-1">{CHANNEL_I18N[log.channel] ? t(CHANNEL_I18N[log.channel]) : log.channel}</span>
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
                            {log.recipientCount} {t("admin.groupNotif.recipientCount")}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {t("admin.groupNotif.successCount")} {log.successCount}
                          </span>
                          {log.failedCount > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              {t("admin.groupNotif.failedCount")} {log.failedCount}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString()}
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
                        {log.status === "completed" ? t("admin.groupNotif.statusCompleted") :
                         log.status === "failed" ? t("admin.groupNotif.statusFailed") :
                         log.status === "sending" ? t("admin.groupNotif.statusSending") :
                         t("admin.groupNotif.statusPending")}
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
