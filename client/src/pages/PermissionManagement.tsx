/**
 * 权限管理页面
 * 管理员可以在此管理角色、权限和用户权限分配
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { usePermission } from '@/_core/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, Plus, Edit2, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/grt";

/**
 * 权限管理主页面
 */
export default function PermissionManagement() {
  const hasPermission = usePermission('permission:admin');

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You do not have permission to access this page
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          icon={Shield}
          title="权限管理"
          description="管理系统角色、权限和用户权限分配"
        />

        {/* 标签页 */}
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="roles">角色管理</TabsTrigger>
            <TabsTrigger value="permissions">权限管理</TabsTrigger>
            <TabsTrigger value="users">用户权限</TabsTrigger>
            <TabsTrigger value="audit">审计日志</TabsTrigger>
          </TabsList>

          {/* 角色管理标签页 */}
          <TabsContent value="roles" className="space-y-4">
            <RolesTab />
          </TabsContent>

          {/* 权限管理标签页 */}
          <TabsContent value="permissions" className="space-y-4">
            <PermissionsTab />
          </TabsContent>

          {/* 用户权限标签页 */}
          <TabsContent value="users" className="space-y-4">
            <UserPermissionsTab />
          </TabsContent>

          {/* 审计日志标签页 */}
          <TabsContent value="audit" className="space-y-4">
            <AuditLogsTab />
          </TabsContent>
        </Tabs>
    </div>
  );
}

/**
 * 角色管理标签页
 */
function RolesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    defaultDataScope: 'self' as const,
  });

  const { data: rolesData, isLoading } = trpc.permission.getAllRoles.useQuery();
  const createRoleMutation = trpc.permission.createRole.useMutation();

  const handleCreateRole = async () => {
    try {
      await createRoleMutation.mutateAsync(newRole);
      setNewRole({
        name: '',
        displayName: '',
        description: '',
        defaultDataScope: 'self',
      });
      setIsCreateOpen(false);
      // 刷新列表
      window.location.reload();
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>角色列表</CardTitle>
          <CardDescription>管理系统中的所有角色</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              创建角色
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新角色</DialogTitle>
              <DialogDescription>
                填写角色信息来创建新的系统角色
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>角色编码</Label>
                <Input
                  value={newRole.name}
                  onChange={(e) =>
                    setNewRole({ ...newRole, name: e.target.value })
                  }
                  placeholder="e.g., admin, editor"
                />
              </div>
              <div>
                <Label>角色名称</Label>
                <Input
                  value={newRole.displayName}
                  onChange={(e) =>
                    setNewRole({ ...newRole, displayName: e.target.value })
                  }
                  placeholder="e.g., Administrator"
                />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                  placeholder="角色描述"
                />
              </div>
              <div>
                <Label>默认数据范围</Label>
                <Select
                  value={newRole.defaultDataScope}
                  onValueChange={(v) =>
                    setNewRole({
                      ...newRole,
                      defaultDataScope: v as any,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择数据范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">全局</SelectItem>
                    <SelectItem value="department">部门</SelectItem>
                    <SelectItem value="team">团队</SelectItem>
                    <SelectItem value="self">个人</SelectItem>
                    <SelectItem value="project">项目</SelectItem>
                    <SelectItem value="customer">客户</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateRole}
                disabled={createRoleMutation.isPending}
              >
                {createRoleMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <div className="space-y-2">
            {rolesData?.roles?.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
              >
                <div>
                  <h3 className="font-semibold">{role.displayName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 权限管理标签页
 */
function PermissionsTab() {
  const { data: permissionsData, isLoading } =
    trpc.permission.getAllPermissions.useQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>权限列表</CardTitle>
        <CardDescription>系统中定义的所有权限</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <div className="space-y-2">
            {permissionsData?.permissions?.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{permission.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {permission.code}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {permission.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {permission.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 用户权限标签页
 */
function UserPermissionsTab() {
  const [userId, setUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const { data: rolesData } = trpc.permission.getAllRoles.useQuery();
  const assignRoleMutation = trpc.permission.assignRoleToUser.useMutation();

  const handleAssignRole = async () => {
    if (!userId || !selectedRoleId) return;

    try {
      await assignRoleMutation.mutateAsync({
        userId,
        roleId: selectedRoleId,
      });
      setUserId('');
      setSelectedRoleId(null);
      // 刷新或显示成功消息
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>分配用户角色</CardTitle>
        <CardDescription>为用户分配或撤销角色</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>用户ID</Label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="输入用户ID"
          />
        </div>
        <div>
          <Label>选择角色</Label>
          <Select
            value={selectedRoleId ? String(selectedRoleId) : undefined}
            onValueChange={(v) => setSelectedRoleId(Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择角色..." />
            </SelectTrigger>
            <SelectContent>
              {rolesData?.roles?.map((role) => (
                <SelectItem key={role.id} value={String(role.id)}>
                  {role.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAssignRole}
          disabled={!userId || !selectedRoleId}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          分配角色
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 审计日志标签页
 */
function AuditLogsTab() {
  const { data: logsData, isLoading } = trpc.permission.getAuditLogs.useQuery({
    limit: 50,
    offset: 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>审计日志</CardTitle>
        <CardDescription>权限操作的完整审计记录</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <div className="space-y-2">
            {logsData?.logs?.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg text-sm"
              >
                <div>
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    操作者: {log.operatorName || log.operatorId}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-semibold ${
                      log.result === 'success'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {log.result}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
