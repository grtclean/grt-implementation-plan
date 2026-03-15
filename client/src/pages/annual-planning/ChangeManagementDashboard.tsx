/**
 * Change Management Dashboard — aggregated view of all planning items
 *
 * Queries all annualPlanningItems grouped by category (kpi/org/process/document).
 * Shows summary cards, progress bar, and recent update logs.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Building2, Workflow, FileText, Loader2, Activity } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ChangeManagementDashboardProps {
  year: number;
}

interface CategorySummary {
  category: string;
  label: string;
  icon: React.ReactNode;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export default function ChangeManagementDashboard({ year }: ChangeManagementDashboardProps) {
  // Query all items
  const itemsQuery = (trpc.annualPlanning as any).getItems.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Query update logs
  const logsQuery = (trpc.annualPlanning as any).getUpdateLogs.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const allItems = (itemsQuery.data ?? []) as any[];
  const allLogs = (logsQuery.data ?? []) as any[];

  // Compute category summaries
  const summaries = useMemo<CategorySummary[]>(() => {
    const categories = [
      { category: 'kpi', label: 'KPI Targets', icon: <Target className="w-5 h-5" /> },
      { category: 'org', label: 'Org Changes', icon: <Building2 className="w-5 h-5" /> },
      { category: 'process', label: 'Process Improvements', icon: <Workflow className="w-5 h-5" /> },
      { category: 'document', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    ];

    return categories.map(({ category, label, icon }) => {
      const catItems = allItems.filter((i: any) => i.category === category);
      return {
        category,
        label,
        icon,
        total: catItems.length,
        pending: catItems.filter((i: any) => i.status === 'pending').length,
        inProgress: catItems.filter((i: any) => i.status === 'in_progress').length,
        completed: catItems.filter((i: any) => i.status === 'completed').length,
      };
    });
  }, [allItems]);

  // Overall progress
  const totalItems = allItems.length;
  const completedItems = allItems.filter((i: any) => i.status === 'completed').length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Recent logs (last 20)
  const recentLogs = allLogs.slice(0, 20);

  const isLoading = itemsQuery.isLoading || logsQuery.isLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {year} Planning Progress
          </CardTitle>
          <CardDescription>
            {completedItems} of {totalItems} items completed ({progressPercent}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span>
            <span>{progressPercent}% Complete</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((s) => (
          <Card key={s.category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {s.icon}
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.total}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {s.pending > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Pending: {s.pending}
                  </Badge>
                )}
                {s.inProgress > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    In Progress: {s.inProgress}
                  </Badge>
                )}
                {s.completed > 0 && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Done: {s.completed}
                  </Badge>
                )}
                {s.total === 0 && (
                  <span className="text-xs text-muted-foreground">No items yet</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Update Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Update Logs</CardTitle>
          <CardDescription>Latest changes across all planning categories</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No update logs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log: any, idx: number) => (
                    <tr key={log.id ?? idx} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant={log.updateType === 'create' ? 'default' : 'outline'} className="text-xs">
                          {log.updateType}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 max-w-md truncate">{log.description}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        User #{log.operatorId ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
