/**
 * Permission Management page — thin shell with 4 tabs
 */

import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Shield, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/grt';
import { RolesTab } from './permission-management/RolesTab';
import { PermissionsBrowserTab } from './permission-management/PermissionsBrowserTab';
import { UserRoleAssignmentTab } from './permission-management/UserRoleAssignmentTab';
import { AuditLogsTab } from './permission-management/AuditLogsTab';

export default function PermissionManagement() {
  const { t } = useLanguage();
  const { data, isLoading } = trpc.permission.checkPermission.useQuery(
    { permissionCode: 'system:permissions:assign' }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {t("admin.perm.noPermission")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title={t("admin.perm.title")}
        description={t("admin.perm.description")}
      />

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">{t("admin.perm.tabRoles")}</TabsTrigger>
          <TabsTrigger value="permissions">{t("admin.perm.tabPermissions")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.perm.tabUsers")}</TabsTrigger>
          <TabsTrigger value="audit">{t("admin.perm.tabAudit")}</TabsTrigger>
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
