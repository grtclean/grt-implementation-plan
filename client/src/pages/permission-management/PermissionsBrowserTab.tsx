/**
 * Permissions Browser Tab
 * - Search bar (client-side filter on 297 permissions)
 * - Grouped by module with collapsible sections
 * - Each permission shows code badge, name, description, role badges
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

export function PermissionsBrowserTab() {
  const [search, setSearch] = useState('');
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const { data: permissionsData, isLoading: loadingPerms } = trpc.permission.getAllPermissions.useQuery();
  const { data: rolesData } = trpc.permission.getAllRoles.useQuery();
  const { data: mappingsData } = trpc.permission.getAllRolePermissionMappings.useQuery();

  // Build permission → role names map
  const permRoleMap = useMemo(() => {
    if (!mappingsData?.mappings || !rolesData?.roles) return {};
    const roleMap: Record<number, string> = {};
    for (const r of rolesData.roles) {
      roleMap[(r as any).id] = (r as any).displayName || (r as any).name;
    }
    const map: Record<number, string[]> = {};
    for (const m of mappingsData.mappings) {
      if (!map[m.permissionId]) map[m.permissionId] = [];
      const name = roleMap[m.roleId];
      if (name && !map[m.permissionId].includes(name)) {
        map[m.permissionId].push(name);
      }
    }
    return map;
  }, [mappingsData, rolesData]);

  // Filter + group permissions
  const grouped = useMemo(() => {
    if (!permissionsData?.permissions) return {};
    const q = search.toLowerCase();
    const filtered = permissionsData.permissions.filter((p: any) =>
      !q || p.code?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
    const map: Record<string, any[]> = {};
    for (const p of filtered) {
      const mod = (p as any).module || 'other';
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [permissionsData, search]);

  const modules = Object.keys(grouped).sort();

  const toggleModule = (mod: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  };

  const expandAll = () => setOpenModules(new Set(modules));
  const collapseAll = () => setOpenModules(new Set());

  const totalCount = permissionsData?.permissions?.length ?? 0;
  const filteredCount = modules.reduce((sum, m) => sum + grouped[m].length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions Browser</CardTitle>
        <CardDescription>
          {totalCount} permissions across {modules.length} modules
          {search && ` (${filteredCount} matching)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button className="text-xs text-blue-600 hover:underline" onClick={expandAll}>Expand All</button>
          <button className="text-xs text-blue-600 hover:underline" onClick={collapseAll}>Collapse All</button>
        </div>

        {loadingPerms ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No permissions found</div>
        ) : (
          <div className="space-y-2">
            {modules.map(mod => (
              <Collapsible key={mod} open={openModules.has(mod)} onOpenChange={() => toggleModule(mod)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border hover:bg-accent text-left">
                  {openModules.has(mod) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-semibold">{mod}</span>
                  <Badge variant="secondary" className="ml-auto">{grouped[mod].length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 border-l pl-4 mt-1 space-y-2 pb-2">
                    {grouped[mod].map((p: any) => (
                      <div key={p.id} className="flex items-start justify-between p-2 rounded hover:bg-accent/50">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="font-mono text-xs">{p.code}</Badge>
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          {p.description && (
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                          )}
                          {/* Role badges */}
                          {permRoleMap[p.id] && permRoleMap[p.id].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {permRoleMap[p.id].map(roleName => (
                                <Badge key={roleName} variant="outline" className="text-xs">
                                  {roleName}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
