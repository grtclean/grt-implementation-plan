/**
 * 数据同步平台审批流程查看器
 * Tab 1: 模板视图 — 卡片 + 步骤流水线
 * Tab 2: 实例视图 — 表格 + 展开步骤时间线
 * Tab 3: 统计视图 — 通过率、平均处理时间等
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  GitBranch, Loader2, ChevronDown, ChevronRight, CheckCircle2,
  XCircle, Clock, User, FileText, BarChart3, ArrowRight
} from "lucide-react";

type ViewTab = 'templates' | 'instances' | 'stats';

export default function ExternalSyncWorkflowViewer() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<ViewTab>('templates');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6" />
          {t("admin.extSyncWorkflow.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("admin.extSyncWorkflow.subtitle")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <TabBtn label={t("admin.extSyncWorkflow.tabTemplates")} icon={FileText} active={tab === 'templates'} onClick={() => setTab('templates')} />
        <TabBtn label={t("admin.extSyncWorkflow.tabInstances")} icon={GitBranch} active={tab === 'instances'} onClick={() => setTab('instances')} />
        <TabBtn label={t("admin.extSyncWorkflow.tabStats")} icon={BarChart3} active={tab === 'stats'} onClick={() => setTab('stats')} />
      </div>

      {tab === 'templates' && <TemplatesView />}
      {tab === 'instances' && <InstancesView />}
      {tab === 'stats' && <StatsView />}
    </div>
  );
}

function TabBtn({ label, icon: Icon, active, onClick }: { label: string; icon: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
        active ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ===== Tab 1: 模板视图 =====
function TemplatesView() {
  const { t } = useLanguage();
  const templatesQuery = trpc.externalSync.getApprovalTemplates.useQuery();

  if (templatesQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const templates = templatesQuery.data || [];

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>{t("admin.extSyncWorkflow.noTemplates")}</p>
        <p className="text-xs mt-1">{t("admin.extSyncWorkflow.noTemplatesHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((tpl: any) => (
        <Card key={tpl.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tpl.template_name}</CardTitle>
              <Badge variant="outline">{tpl.instance_count} {t("admin.extSyncWorkflow.instances")}</Badge>
            </div>
            <CardDescription>
              <code className="text-xs">{tpl.template_code}</code>
              {' | '}{t("admin.extSyncWorkflow.type")} {tpl.business_type || 'general'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step pipeline visualization */}
            <div className="flex items-center gap-1 flex-wrap">
              {(tpl.steps || []).map((step: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    <span className="font-medium">{step.stepNumber || idx + 1}</span>
                    <span>{step.stepName}</span>
                  </div>
                  {idx < (tpl.steps || []).length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              ))}
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium dark:bg-green-900 dark:text-green-300">
                  {t("admin.extSyncWorkflow.completed")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ===== Tab 2: 实例视图 =====
function InstancesView() {
  const { t } = useLanguage();
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const instancesQuery = trpc.externalSync.getApprovalInstances.useQuery({
    templateId: filterTemplate !== 'all' ? Number(filterTemplate) : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    limit: 50,
  });

  const templatesQuery = trpc.externalSync.getApprovalTemplates.useQuery();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterTemplate} onValueChange={setFilterTemplate}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("admin.extSyncWorkflow.filterByTemplate")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.extSyncWorkflow.allTemplates")}</SelectItem>
            {(templatesQuery.data || []).map((t: any) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.template_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("admin.extSyncWorkflow.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.extSyncWorkflow.allStatuses")}</SelectItem>
            <SelectItem value="pending">{t("admin.extSyncWorkflow.pending")}</SelectItem>
            <SelectItem value="approved">{t("admin.extSyncWorkflow.approved")}</SelectItem>
            <SelectItem value="rejected">{t("admin.extSyncWorkflow.rejected")}</SelectItem>
            <SelectItem value="cancelled">{t("admin.extSyncWorkflow.cancelled")}</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground self-center ml-auto">
          {t("admin.extSyncWorkflow.totalRecords")} {instancesQuery.data?.total || 0}
        </span>
      </div>

      {/* Table */}
      {instancesQuery.isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="w-8 px-2 py-2"></th>
                <th className="px-3 py-2 text-left">{t("admin.extSyncWorkflow.colNumber")}</th>
                <th className="px-3 py-2 text-left">{t("admin.extSyncWorkflow.colTitle")}</th>
                <th className="px-3 py-2 text-left">{t("admin.extSyncWorkflow.colApplicant")}</th>
                <th className="px-3 py-2 text-center">{t("admin.extSyncWorkflow.colStatus")}</th>
                <th className="px-3 py-2 text-center">{t("admin.extSyncWorkflow.colSteps")}</th>
                <th className="px-3 py-2 text-right">{t("admin.extSyncWorkflow.colCreatedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {(instancesQuery.data?.instances || []).map((inst: any) => (
                <InstanceRow
                  key={inst.id}
                  instance={inst}
                  expanded={expandedId === inst.id}
                  onToggle={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
                />
              ))}
              {(instancesQuery.data?.instances || []).length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{t("admin.extSyncWorkflow.noData")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InstanceRow({ instance, expanded, onToggle }: { instance: any; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-t hover:bg-muted/30 cursor-pointer" onClick={onToggle}>
        <td className="px-2 py-2 text-center">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </td>
        <td className="px-3 py-2 font-mono text-xs">{instance.instance_code}</td>
        <td className="px-3 py-2 max-w-[200px] truncate">{instance.business_title || '-'}</td>
        <td className="px-3 py-2">{instance.applicant_name || '-'}</td>
        <td className="px-3 py-2 text-center">
          <StatusBadge status={instance.status} />
        </td>
        <td className="px-3 py-2 text-center">{instance.total_steps || 1}</td>
        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
          {instance.created_at ? new Date(instance.created_at).toLocaleDateString() : '-'}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-muted/20 px-6 py-3">
            <StepTimeline instanceId={instance.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function StepTimeline({ instanceId }: { instanceId: number }) {
  const { t } = useLanguage();
  const stepsQuery = trpc.externalSync.getApprovalStepRecords.useQuery({ instanceId });

  if (stepsQuery.isLoading) return <div className="text-xs text-muted-foreground">{t("admin.extSyncWorkflow.loadingSteps")}</div>;

  const steps = stepsQuery.data || [];
  if (steps.length === 0) return <div className="text-xs text-muted-foreground">{t("admin.extSyncWorkflow.noStepRecords")}</div>;

  return (
    <div className="space-y-2">
      {steps.map((step: any) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="mt-0.5">
            {step.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {step.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
            {step.status === 'pending' && <Clock className="h-4 w-4 text-amber-500" />}
            {!['approved', 'rejected', 'pending'].includes(step.status) && <Clock className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{t("admin.extSyncWorkflow.step")}{step.step_number}: {step.step_name}</span>
              <StatusBadge status={step.status} size="sm" />
            </div>
            <div className="text-muted-foreground mt-0.5">
              {step.approver_name && (
                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {step.approver_name}</span>
              )}
              {step.completed_at && <span className="ml-3">{new Date(step.completed_at).toLocaleString()}</span>}
              {step.comment && <span className="ml-3 italic">"{step.comment}"</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Tab 3: 统计视图 =====
function StatsView() {
  const { t } = useLanguage();
  const statsQuery = trpc.externalSync.getApprovalStats.useQuery();

  if (statsQuery.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const stats = statsQuery.data;
  if (!stats) return <p className="text-center text-muted-foreground py-8">{t("admin.extSyncWorkflow.noStatsData")}</p>;

  const approvalRate = stats.totalInstances > 0
    ? Math.round((stats.approvedCount / stats.totalInstances) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("admin.extSyncWorkflow.totalApprovals")} value={stats.totalInstances} />
        <StatCard label={t("admin.extSyncWorkflow.approvalRate")} value={`${approvalRate}%`} color={approvalRate > 70 ? 'green' : 'amber'} />
        <StatCard label={t("admin.extSyncWorkflow.avgProcessingTime")} value={`${stats.avgProcessingMinutes} ${t("admin.extSyncWorkflow.minutes")}`} />
        <StatCard label={t("admin.extSyncWorkflow.pendingCount")} value={stats.pendingCount} color="amber" />
      </div>

      {/* Status distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.extSyncWorkflow.statusDistribution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-sm font-medium">{count as number}</span>
              </div>
            ))}
          </div>
          {/* Simple bar chart */}
          <div className="mt-4 space-y-2">
            {Object.entries(stats.statusDistribution).map(([status, count]) => {
              const pct = stats.totalInstances > 0 ? ((count as number) / stats.totalInstances) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-right">{status}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColor(status)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs w-12">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.extSyncWorkflow.topTemplates")}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topTemplates.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("admin.extSyncWorkflow.noData")}</p>
          ) : (
            <div className="space-y-2">
              {stats.topTemplates.map((tpl: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm">{tpl.name}</span>
                  <Badge variant="secondary">{tpl.count} {t("admin.extSyncWorkflow.instances")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Shared =====
function StatusBadge({ status, size }: { status: string; size?: 'sm' | 'default' }) {
  const { t } = useLanguage();
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'outline', label: t("admin.extSyncWorkflow.pending") },
    approved: { variant: 'default', label: t("admin.extSyncWorkflow.approved") },
    rejected: { variant: 'destructive', label: t("admin.extSyncWorkflow.rejected") },
    cancelled: { variant: 'secondary', label: t("admin.extSyncWorkflow.cancelled") },
  };
  const c = config[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={c.variant} className={size === 'sm' ? 'text-[10px] px-1 py-0' : ''}>{c.label}</Badge>;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`text-2xl font-bold ${color ? colorMap[color] || '' : ''}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    cancelled: 'bg-gray-400',
  };
  return colors[status] || 'bg-blue-400';
}
