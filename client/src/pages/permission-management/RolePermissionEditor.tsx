/**
 * Role Permission Editor
 * - Dialog component opened from RolesTab
 * - Fetches all permissions, groups by module
 * - Collapsible module sections with checkboxes + "Select All" per module
 * - Pre-checks current role's permissions
 * - Save calls assignPermissionToRole({ roleId, permissionIds[] })
 */

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Save } from 'lucide-react';

interface Props {
  roleId: number;
  open: boolean;
  onClose: () => void;
}

export function RolePermissionEditor({ roleId, open, onClose }: Props) {
  const utils = trpc.useUtils();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  const { data: allPermsData, isLoading: loadingPerms } = trpc.permission.getAllPermissions.useQuery();
  const { data: rolePermsData, isLoading: loadingRolePerms } = trpc.permission.getRolePermissions.useQuery({ roleId });

  const saveMutation = trpc.permission.assignPermissionToRole.useMutation({
    onSuccess: () => {
      utils.permission.getRolePermissions.invalidate({ roleId });
      utils.permission.getAllRolePermissionMappings.invalidate();
      utils.permission.getUserEffectivePermissions.invalidate();
      onClose();
    },
  });

  // Group all permissions by module
  const grouped = useMemo(() => {
    if (!allPermsData?.permissions) return {};
    const map: Record<string, any[]> = {};
    for (const p of allPermsData.permissions) {
      const mod = (p as any).module || 'other';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [allPermsData]);

  const modules = Object.keys(grouped).sort();

  // Initialize selection from current role permissions
  useEffect(() => {
    if (rolePermsData?.permissions && !initialized) {
      const ids = new Set<number>(rolePermsData.permissions.map((p: any) => p.permissionId as number));
      setSelectedIds(ids);
      setInitialized(true);
    }
  }, [rolePermsData, initialized]);

  // Reset on roleId change
  useEffect(() => {
    setInitialized(false);
    setSelectedIds(new Set());
  }, [roleId]);

  const togglePermission = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (mod: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  };

  const selectAllInModule = (mod: string) => {
    const ids = grouped[mod].map((p: any) => p.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const isModuleAllSelected = (mod: string) => grouped[mod].every((p: any) => selectedIds.has(p.id));
  const isModulePartial = (mod: string) => {
    const perms = grouped[mod];
    const count = perms.filter((p: any) => selectedIds.has(p.id)).length;
    return count > 0 && count < perms.length;
  };

  const handleSave = () => {
    saveMutation.mutate({
      roleId,
      permissionIds: Array.from(selectedIds),
    });
  };

  const isLoading = loadingPerms || loadingRolePerms;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Role Permissions</DialogTitle>
          <DialogDescription>
            {selectedIds.size} of {allPermsData?.permissions?.length ?? 0} permissions selected
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-1">
                {modules.map(mod => (
                  <Collapsible key={mod} open={openModules.has(mod)} onOpenChange={() => toggleModule(mod)}>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isModuleAllSelected(mod)}
                        data-state={isModulePartial(mod) ? 'indeterminate' : undefined}
                        onCheckedChange={() => selectAllInModule(mod)}
                      />
                      <CollapsibleTrigger className="flex items-center gap-2 flex-1 py-2 hover:bg-accent rounded px-2">
                        {openModules.has(mod) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium text-sm">{mod}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {grouped[mod].filter((p: any) => selectedIds.has(p.id)).length}/{grouped[mod].length}
                        </Badge>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-8 space-y-1 pb-2">
                        {grouped[mod].map((p: any) => (
                          <label key={p.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedIds.has(p.id)}
                              onCheckedChange={() => togglePermission(p.id)}
                            />
                            <Badge variant="outline" className="font-mono text-xs">{p.code}</Badge>
                            <span className="text-muted-foreground">{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
            {saveMutation.error && (
              <p className="text-sm text-red-600">{saveMutation.error.message}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
