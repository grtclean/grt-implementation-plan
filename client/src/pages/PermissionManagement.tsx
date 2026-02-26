/**
 * Permission Management page — thin shell with 4 tabs
 */

import { usePermission } from '@/_core/hooks/usePermission';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/grt';
import { RolesTab } from './permission-management/RolesTab';
import { PermissionsBrowserTab } from './permission-management/PermissionsBrowserTab';
import { UserRoleAssignmentTab } from './permission-management/UserRoleAssignmentTab';
import { AuditLogsTab } from './permission-management/AuditLogsTab';

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
        title="Permission Management"
        description="Manage system roles, permissions, and user assignments"
      />

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignment</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <RolesTab />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionsBrowserTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserRoleAssignmentTab />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
