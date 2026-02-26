/**
 * Audit Logs Tab
 * - Filter bar: action type dropdown + date range + user search
 * - Table: Time, Action, Operator, Target, Result (color-coded)
 * - Pagination: "Load More" with offset tracking
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Filter, RotateCcw } from 'lucide-react';

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'grant_permission', label: 'Grant Permission' },
  { value: 'revoke_permission', label: 'Revoke Permission' },
  { value: 'create_role', label: 'Create Role' },
  { value: 'update_role', label: 'Update Role' },
  { value: 'delete_role', label: 'Delete Role' },
  { value: 'assign_role', label: 'Assign Role' },
  { value: 'revoke_role', label: 'Revoke Role' },
  { value: 'access_denied', label: 'Access Denied' },
  { value: 'data_access', label: 'Data Access' },
];

const PAGE_SIZE = 50;

export function AuditLogsTab() {
  const [actionType, setActionType] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);

  const queryInput = {
    limit: PAGE_SIZE,
    offset,
    ...(actionType ? { actionType } : {}),
    ...(userId ? { userId } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data, isLoading, isFetching } = trpc.permission.getAuditLogs.useQuery(queryInput);

  const resetFilters = () => {
    setActionType('');
    setUserId('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const resultColor = (result: string) => {
    switch (result) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'denied': return 'text-orange-600 bg-orange-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const logs = data?.logs ?? [];
  const hasMore = logs.length === PAGE_SIZE;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>Complete audit trail of permission operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">Action Type</Label>
            <Select value={actionType || '_all'} onValueChange={v => { setActionType(v === '_all' ? '' : v); setOffset(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(t => (
                  <SelectItem key={t.value || '_all'} value={t.value || '_all'}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Operator ID</Label>
            <Input
              className="w-[180px]"
              placeholder="Filter by user..."
              value={userId}
              onChange={e => { setUserId(e.target.value); setOffset(0); }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" className="w-[160px]" value={startDate} onChange={e => { setStartDate(e.target.value); setOffset(0); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" className="w-[160px]" value={endDate} onChange={e => { setEndDate(e.target.value); setOffset(0); }} />
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4 mr-1" />Reset
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.actionType || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.operatorName || log.operatorId}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.targetUserId && <span>User: {log.targetUserId} </span>}
                      {log.targetRoleId && <span>Role: {log.targetRoleId} </span>}
                      {log.targetPermissionId && <span>Perm: {log.targetPermissionId}</span>}
                      {!log.targetUserId && !log.targetRoleId && !log.targetPermissionId && '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${resultColor(log.result)}`}>
                        {log.result}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{offset + logs.length}
              </p>
              <div className="flex gap-2">
                {offset > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                    Previous
                  </Button>
                )}
                {hasMore && (
                  <Button variant="outline" size="sm" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={isFetching}>
                    {isFetching ? 'Loading...' : 'Load More'}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
