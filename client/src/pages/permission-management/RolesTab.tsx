/**
 * Roles Management Tab
 * - Table with Name, Display Name, Level, Category, Member Count, Actions
 * - Expandable rows showing permissions grouped by module
 * - Create / Edit / Delete dialogs
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { RolePermissionEditor } from './RolePermissionEditor';

export function RolesTab() {
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [permEditorRoleId, setPermEditorRoleId] = useState<number | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    defaultDataScope: 'self' as const,
  });

  const { data: rolesData, isLoading } = trpc.permission.getAllRoles.useQuery();
  const { data: memberData } = trpc.permission.getRoleMemberCounts.useQuery();
  const createMutation = trpc.permission.createRole.useMutation({
    onSuccess: () => {
      utils.permission.getAllRoles.invalidate();
      setIsCreateOpen(false);
      setNewRole({ name: '', displayName: '', description: '', defaultDataScope: 'self' });
    },
  });
  const updateMutation = trpc.permission.updateRole.useMutation({
    onSuccess: () => {
      utils.permission.getAllRoles.invalidate();
      setEditingRole(null);
    },
  });
  const deleteMutation = trpc.permission.deleteRole.useMutation({
    onSuccess: () => {
      utils.permission.getAllRoles.invalidate();
      utils.permission.getRoleMemberCounts.invalidate();
      setDeleteConfirmId(null);
    },
  });

  const counts = memberData?.counts ?? {};

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Manage system roles and their permissions</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Create Role</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>Define a new system role</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Code</Label>
                  <Input value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. team_lead" />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input value={newRole.displayName} onChange={e => setNewRole({ ...newRole, displayName: e.target.value })} placeholder="e.g. Team Lead" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} />
                </div>
                <div>
                  <Label>Default Data Scope</Label>
                  <Select value={newRole.defaultDataScope} onValueChange={v => setNewRole({ ...newRole, defaultDataScope: v as any })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createMutation.mutate(newRole)} disabled={createMutation.isPending || !newRole.name || !newRole.displayName}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesData?.roles?.map((role: any) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    memberCount={counts[role.id] ?? 0}
                    isExpanded={expandedRoleId === role.id}
                    onToggle={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                    onEdit={() => setEditingRole(role)}
                    onDelete={() => setDeleteConfirmId(role.id)}
                    onEditPermissions={() => setPermEditorRoleId(role.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={open => !open && setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role: {editingRole?.displayName}</DialogTitle>
          </DialogHeader>
          {editingRole && (
            <EditRoleForm
              role={editingRole}
              onSave={(data) => updateMutation.mutate({ roleId: editingRole.id, ...data })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Roles with assigned members cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate({ roleId: deleteConfirmId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
          {deleteMutation.error && (
            <p className="text-sm text-red-600">{deleteMutation.error.message}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Permission Editor Dialog */}
      {permEditorRoleId !== null && (
        <RolePermissionEditor
          roleId={permEditorRoleId}
          open={true}
          onClose={() => setPermEditorRoleId(null)}
        />
      )}
    </>
  );
}

function RoleRow({
  role,
  memberCount,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onEditPermissions,
}: {
  role: any;
  memberCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditPermissions: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-accent" onClick={onToggle}>
        <TableCell>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </TableCell>
        <TableCell className="font-mono text-sm">{role.name}</TableCell>
        <TableCell className="font-medium">{role.displayName}</TableCell>
        <TableCell><Badge variant="outline">{role.level ?? 1}</Badge></TableCell>
        <TableCell><Badge variant="secondary">{role.category ?? 'general'}</Badge></TableCell>
        <TableCell>{memberCount}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={onEditPermissions} title="Edit Permissions">
              <Shield className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-0">
            <ExpandedRolePermissions roleId={role.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ExpandedRolePermissions({ roleId }: { roleId: number }) {
  const { data, isLoading } = trpc.permission.getRolePermissions.useQuery({ roleId });

  const grouped = useMemo(() => {
    if (!data?.permissions) return {};
    const map: Record<string, any[]> = {};
    for (const p of data.permissions) {
      const mod = p.module || 'other';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [data]);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading permissions...</div>;

  const modules = Object.keys(grouped).sort();
  if (modules.length === 0) return <div className="p-4 text-sm text-muted-foreground">No permissions assigned</div>;

  return (
    <div className="p-4 space-y-2">
      {modules.map(mod => (
        <div key={mod}>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{mod} ({grouped[mod].length})</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {grouped[mod].map((p: any) => (
              <Badge key={p.permissionId} variant="outline" className="text-xs">{p.code}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditRoleForm({ role, onSave, isPending }: { role: any; onSave: (data: any) => void; isPending: boolean }) {
  const [displayName, setDisplayName] = useState(role.displayName || '');
  const [description, setDescription] = useState(role.description || '');

  return (
    <div className="space-y-4">
      <div>
        <Label>Display Name</Label>
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <Button onClick={() => onSave({ displayName, description })} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
