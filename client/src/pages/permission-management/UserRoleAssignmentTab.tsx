/**
 * User Role Assignment Tab
 * - User search combobox
 * - Current roles with status badges (Active/Expired/Scheduled) and Revoke
 * - Assign new role with optional effective period (start/end date pickers)
 * - Effective permissions collapsible section grouped by module
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, X, ChevronDown, ChevronRight, UserCheck, Calendar, Shield } from 'lucide-react';

export function UserRoleAssignmentTab() {
  const utils = trpc.useUtils();
  const [userSearch, setUserSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showEffective, setShowEffective] = useState(false);

  const { data: usersData } = trpc.users.getAll.useQuery(undefined, { retry: false });
  const { data: rolesData } = trpc.permission.getAllRoles.useQuery();
  const { data: userRolesData, isLoading: loadingUserRoles } = trpc.permission.getUserRoles.useQuery(
    { userId: selectedUser?.id ?? '' },
    { enabled: !!selectedUser }
  );
  const { data: effectivePerms } = trpc.permission.getUserEffectivePermissions.useQuery(
    { userId: selectedUser?.id ?? '' },
    { enabled: !!selectedUser && showEffective }
  );

  const assignMutation = trpc.permission.assignRoleToUser.useMutation({
    onSuccess: () => {
      utils.permission.getUserRoles.invalidate();
      utils.permission.getRoleMemberCounts.invalidate();
      utils.permission.getUserEffectivePermissions.invalidate();
      setSelectedRoleId('');
      setStartDate('');
      setEndDate('');
      setUseDateRange(false);
    },
  });

  const revokeMutation = trpc.permission.revokeRoleFromUser.useMutation({
    onSuccess: () => {
      utils.permission.getUserRoles.invalidate();
      utils.permission.getRoleMemberCounts.invalidate();
      utils.permission.getUserEffectivePermissions.invalidate();
    },
  });

  // Filter users for combobox
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(usersData)) return [];
    const q = userSearch.toLowerCase();
    if (!q) return usersData.slice(0, 20);
    return usersData.filter((u: any) =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.openId?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [usersData, userSearch]);

  // Group effective permissions by module
  const groupedPerms = useMemo(() => {
    if (!effectivePerms?.permissions) return {};
    const map: Record<string, any[]> = {};
    for (const p of effectivePerms.permissions) {
      const mod = p.module || 'other';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [effectivePerms]);

  const getRoleStatus = (ur: any): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (!ur.isActive) return { label: 'Revoked', variant: 'destructive' };
    const now = new Date();
    if (ur.startDate && new Date(ur.startDate) > now) return { label: 'Scheduled', variant: 'outline' };
    if (ur.endDate && new Date(ur.endDate) < now) return { label: 'Expired', variant: 'secondary' };
    return { label: 'Active', variant: 'default' };
  };

  const handleAssign = () => {
    if (!selectedUser || !selectedRoleId) return;
    assignMutation.mutate({
      userId: selectedUser.id,
      roleId: Number(selectedRoleId),
      startDate: useDateRange && startDate ? startDate : undefined,
      endDate: useDateRange && endDate ? endDate : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
          <CardDescription>Search and select a user to manage their roles</CardDescription>
        </CardHeader>
        <CardContent>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Search className="mr-2 h-4 w-4" />
                {selectedUser ? (
                  <span>{selectedUser.name} {selectedUser.email && <span className="text-muted-foreground">({selectedUser.email})</span>}</span>
                ) : (
                  <span className="text-muted-foreground">Search users...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by name, email, or ID..." value={userSearch} onValueChange={setUserSearch} />
                <CommandList>
                  <CommandEmpty>No users found</CommandEmpty>
                  <CommandGroup>
                    {filteredUsers.map((u: any) => (
                      <CommandItem
                        key={u.openId || u.id}
                        value={`${u.name} ${u.email} ${u.openId}`}
                        onSelect={() => {
                          setSelectedUser({ id: u.openId || String(u.id), name: u.name || 'Unknown', email: u.email });
                          setComboOpen(false);
                          setUserSearch('');
                        }}
                      >
                        <div>
                          <p className="font-medium">{u.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{u.email || u.openId}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedUser && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                <UserCheck className="w-3 h-3 mr-1" />
                {selectedUser.name}
              </Badge>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setSelectedUser(null); setShowEffective(false); }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          {/* Current Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Current Roles</CardTitle>
              <CardDescription>Roles assigned to {selectedUser.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUserRoles ? (
                <p className="text-sm text-muted-foreground py-4">Loading roles...</p>
              ) : !userRolesData?.userRoles?.length ? (
                <p className="text-sm text-muted-foreground py-4">No roles assigned</p>
              ) : (
                <div className="space-y-2">
                  {userRolesData.userRoles.map((ur: any) => {
                    const status = getRoleStatus(ur);
                    return (
                      <div key={ur.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ur.roleDisplayName}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-mono">{ur.roleName}</span>
                            {ur.startDate && <span>From: {new Date(ur.startDate).toLocaleDateString()}</span>}
                            {ur.endDate && <span>Until: {new Date(ur.endDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {ur.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeMutation.mutate({ userId: selectedUser.id, roleId: ur.roleId })}
                            disabled={revokeMutation.isPending}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign New Role */}
          <Card>
            <CardHeader>
              <CardTitle>Assign New Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a role..." /></SelectTrigger>
                  <SelectContent>
                    {rolesData?.roles?.map((r: any) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.displayName} ({r.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={useDateRange} onCheckedChange={setUseDateRange} />
                <Label>Set effective period</Label>
              </div>

              {useDateRange && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <Button onClick={handleAssign} disabled={!selectedRoleId || assignMutation.isPending}>
                <UserCheck className="w-4 h-4 mr-2" />
                {assignMutation.isPending ? 'Assigning...' : 'Assign Role'}
              </Button>
              {assignMutation.error && (
                <p className="text-sm text-red-600">{assignMutation.error.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Effective Permissions */}
          <Collapsible open={showEffective} onOpenChange={setShowEffective}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    {showEffective ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <CardTitle>
                      <Shield className="w-4 h-4 inline mr-1" />
                      Effective Permissions
                    </CardTitle>
                  </div>
                  <CardDescription>All permissions derived from active roles</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {!effectivePerms?.permissions?.length ? (
                    <p className="text-sm text-muted-foreground">No effective permissions</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{effectivePerms.permissions.length} permissions from active roles</p>
                      {Object.keys(groupedPerms).sort().map(mod => (
                        <div key={mod}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{mod} ({groupedPerms[mod].length})</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {groupedPerms[mod].map((p: any) => (
                              <Badge key={p.id} variant="outline" className="text-xs font-mono">{p.code}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}
    </div>
  );
}
