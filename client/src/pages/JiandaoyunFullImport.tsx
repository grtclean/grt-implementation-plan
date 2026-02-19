/**
 * 简道云全量导入管理页面
 * 5步向导式界面：预检 → 表单发现 → 配置 → 导入进度 → 验证
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2, XCircle, Loader2, Play, Square, RefreshCw,
  Database, Users, FolderSearch, FileText, GitBranch,
  ChevronRight, ChevronLeft, AlertTriangle, Download, Eye
} from "lucide-react";

// 阶段配置
const PHASES = [
  { key: 'org' as const, label: '组织架构同步', icon: Database, description: '同步部门、成员、角色到映射表' },
  { key: 'user' as const, label: '用户创建', icon: Users, description: '创建GRT用户和员工档案' },
  { key: 'discovery' as const, label: '表单发现', icon: FolderSearch, description: '扫描JDY应用表单，分类并映射' },
  { key: 'project' as const, label: '项目数据导入', icon: FileText, description: '导入项目、任务、里程碑、阶段、成员' },
  { key: 'approval' as const, label: '审批流程导入', icon: GitBranch, description: '导入审批模板和实例（多步骤）' },
  { key: 'knowledge' as const, label: '知识库导入', icon: Download, description: '从表单元数据生成知识文档' },
];

type WizardStep = 'precheck' | 'discovery' | 'config' | 'progress' | 'verify';

export default function JiandaoyunFullImport() {
  const [step, setStep] = useState<WizardStep>('precheck');
  const [selectedPhases, setSelectedPhases] = useState<string[]>(['org', 'user', 'discovery', 'project', 'approval', 'knowledge']);
  const [dryRun, setDryRun] = useState(false);
  const [runCode, setRunCode] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // tRPC queries
  const connectionTest = trpc.jiandaoyun.testConnection.useMutation();
  const statusQuery = trpc.jiandaoyun.getStatus.useQuery();
  const isRunningQuery = trpc.jiandaoyun.isImportRunning.useQuery(undefined, {
    refetchInterval: step === 'progress' ? 2000 : false,
  });
  const importRunsQuery = trpc.jiandaoyun.getImportRuns.useQuery();
  const formMappingsQuery = trpc.jiandaoyun.getFormMappings.useQuery({});
  const verificationQuery = trpc.jiandaoyun.getImportVerification.useQuery(undefined, {
    enabled: step === 'verify',
  });
  const progressQuery = trpc.jiandaoyun.getImportProgress.useQuery(
    { runCode: runCode || '' },
    { enabled: !!runCode && step === 'progress', refetchInterval: 2000 }
  );

  // tRPC mutations
  const startImport = trpc.jiandaoyun.startFullImport.useMutation();
  const cancelImport = trpc.jiandaoyun.cancelImport.useMutation();
  const discoverForms = trpc.jiandaoyun.discoverForms.useMutation();
  const updateMapping = trpc.jiandaoyun.updateFormMapping.useMutation();

  // Auto-advance to verify when import completes
  useEffect(() => {
    if (progressQuery.data?.status === 'completed' || progressQuery.data?.status === 'failed') {
      // Stop polling
    }
  }, [progressQuery.data?.status]);

  const handleTestConnection = useCallback(() => {
    connectionTest.mutate();
  }, [connectionTest]);

  const handleDiscoverForms = useCallback(() => {
    discoverForms.mutate(undefined, {
      onSuccess: () => {
        formMappingsQuery.refetch();
      },
    });
  }, [discoverForms, formMappingsQuery]);

  const handleStartImport = useCallback(() => {
    startImport.mutate(
      { phases: selectedPhases as any[], dryRun },
      {
        onSuccess: (data) => {
          setRunCode(data.runCode);
          setStep('progress');
        },
      }
    );
  }, [startImport, selectedPhases, dryRun]);

  const handleCancelImport = useCallback(() => {
    cancelImport.mutate();
  }, [cancelImport]);

  const handleConfirmMapping = useCallback((id: number, isConfirmed: boolean) => {
    updateMapping.mutate(
      { id, isConfirmed },
      { onSuccess: () => formMappingsQuery.refetch() }
    );
  }, [updateMapping, formMappingsQuery]);

  const handleUpdateTargetEntity = useCallback((id: number, targetEntity: string) => {
    updateMapping.mutate(
      { id, targetEntity },
      { onSuccess: () => formMappingsQuery.refetch() }
    );
  }, [updateMapping, formMappingsQuery]);

  const togglePhase = (phaseKey: string) => {
    setSelectedPhases(prev =>
      prev.includes(phaseKey)
        ? prev.filter(p => p !== phaseKey)
        : [...prev, phaseKey]
    );
  };

  // Wizard navigation
  const steps: WizardStep[] = ['precheck', 'discovery', 'config', 'progress', 'verify'];
  const stepLabels: Record<WizardStep, string> = {
    precheck: '1. 预检',
    discovery: '2. 表单发现',
    config: '3. 导入配置',
    progress: '4. 导入进度',
    verify: '5. 结果验证',
  };

  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">简道云全量导入</h1>
        <p className="text-muted-foreground mt-1">
          将简道云系统数据一次性全量导入GRT系统
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, idx) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              s === step
                ? 'bg-primary text-primary-foreground'
                : idx < currentStepIdx
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {idx < currentStepIdx && <CheckCircle2 className="h-3.5 w-3.5" />}
            {stepLabels[s]}
          </button>
        ))}
      </div>

      {/* Step Content */}
      {step === 'precheck' && (
        <PrecheckStep
          statusQuery={statusQuery}
          connectionTest={connectionTest}
          importRuns={importRunsQuery.data}
          onTestConnection={handleTestConnection}
          onNext={() => setStep('discovery')}
        />
      )}

      {step === 'discovery' && (
        <DiscoveryStep
          formMappings={formMappingsQuery.data || []}
          isDiscovering={discoverForms.isPending}
          onDiscoverForms={handleDiscoverForms}
          onConfirmMapping={handleConfirmMapping}
          onUpdateTargetEntity={handleUpdateTargetEntity}
          onBack={() => setStep('precheck')}
          onNext={() => setStep('config')}
        />
      )}

      {step === 'config' && (
        <ConfigStep
          selectedPhases={selectedPhases}
          dryRun={dryRun}
          onTogglePhase={togglePhase}
          onSetDryRun={setDryRun}
          isStarting={startImport.isPending}
          onStart={handleStartImport}
          onBack={() => setStep('discovery')}
        />
      )}

      {step === 'progress' && (
        <ProgressStep
          progress={progressQuery.data}
          isLoading={progressQuery.isLoading}
          onCancel={handleCancelImport}
          onNext={() => { setStep('verify'); verificationQuery.refetch(); }}
        />
      )}

      {step === 'verify' && (
        <VerifyStep
          verification={verificationQuery.data}
          isLoading={verificationQuery.isLoading}
          onRefresh={() => verificationQuery.refetch()}
          onBack={() => setStep('progress')}
        />
      )}
    </div>
  );
}

// ===== Step 1: Precheck =====
function PrecheckStep({ statusQuery, connectionTest, importRuns, onTestConnection, onNext }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>API连接检测</CardTitle>
          <CardDescription>测试与简道云API的连通性</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">配置状态:</span>
                {statusQuery.data?.configured ? (
                  <Badge variant="default" className="bg-green-500">已配置</Badge>
                ) : (
                  <Badge variant="destructive">未配置</Badge>
                )}
              </div>
              {statusQuery.data?.corpId && (
                <p className="text-xs text-muted-foreground mt-1">企业ID: {statusQuery.data.corpId}</p>
              )}
            </div>
            <Button onClick={onTestConnection} disabled={connectionTest.isPending}>
              {connectionTest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              测试连接
            </Button>
          </div>

          {connectionTest.data && (
            <div className={`p-3 rounded-lg ${connectionTest.data.success ? 'bg-green-50 dark:bg-green-950 border border-green-200' : 'bg-red-50 dark:bg-red-950 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {connectionTest.data.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">{connectionTest.data.message}</span>
              </div>
              {connectionTest.data.apps && (
                <p className="text-xs mt-1 text-muted-foreground">发现 {connectionTest.data.apps} 个应用</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GRT数据统计 */}
      <Card>
        <CardHeader>
          <CardTitle>GRT现有数据</CardTitle>
          <CardDescription>当前GRT系统中的数据统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="JDY同步统计" value={statusQuery.data?.stats?.totalApps || 0} sub="应用数" />
            <StatCard label="表单数" value={statusQuery.data?.stats?.totalForms || 0} sub="已发现" />
            <StatCard label="记录数" value={statusQuery.data?.stats?.totalRecords || 0} sub="总计" />
            <StatCard label="上次同步" value={statusQuery.data?.stats?.lastSyncTime ? new Date(statusQuery.data.stats.lastSyncTime).toLocaleDateString() : '从未'} sub="" />
          </div>
        </CardContent>
      </Card>

      {/* 历史导入记录 */}
      {importRuns && importRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>历史导入记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importRuns.slice(0, 5).map((run: any) => (
                <div key={run.runCode} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{run.runCode}</code>
                    <ImportStatusBadge status={run.status} />
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : '未开始'}
                    {' | '}创建: {run.totalCreated} 更新: {run.totalUpdated} 失败: {run.totalFailed}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!statusQuery.data?.configured}>
          下一步 <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ===== Step 2: Discovery =====
function DiscoveryStep({ formMappings, isDiscovering, onDiscoverForms, onConfirmMapping, onUpdateTargetEntity, onBack, onNext }: any) {
  const targetEntities = [
    'project', 'projectTask', 'projectMilestone', 'projectPhase', 'projectTeamMember',
    'approval_instance', 'approval_template',
    'crmCustomer', 'crmContact', 'crmOpportunity', 'crmLead', 'crmFollowUp',
    'hrmEmployee', 'hrmCandidate', 'hrmTraining', 'hrmPerformance', 'hrmSalary',
    'productionWorkOrder', 'qualityInspection', 'bom', 'inventory',
    'salesOrder', 'purchaseOrder', 'quotation',
    'knowledgeDocument', 'issueRecord', 'other',
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>表单发现与映射</span>
            <Button onClick={onDiscoverForms} disabled={isDiscovering}>
              {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderSearch className="h-4 w-4 mr-2" />}
              {isDiscovering ? '扫描中...' : '执行扫描'}
            </Button>
          </CardTitle>
          <CardDescription>
            扫描简道云应用表单，自动分类并预览字段映射。确认后将在导入阶段使用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formMappings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FolderSearch className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>尚未发现表单，请点击"执行扫描"</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span>共 {formMappings.length} 个表单</span>
                <span>已确认: {formMappings.filter((m: any) => m.is_confirmed).length}</span>
                <span>已分类: {formMappings.filter((m: any) => m.target_entity).length}</span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">应用/表单</th>
                      <th className="px-3 py-2 text-left">目标实体</th>
                      <th className="px-3 py-2 text-right">记录数</th>
                      <th className="px-3 py-2 text-center">映射字段</th>
                      <th className="px-3 py-2 text-center">确认</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formMappings.map((mapping: any) => {
                      const fieldMap = typeof mapping.field_mapping === 'string'
                        ? JSON.parse(mapping.field_mapping || '{}')
                        : mapping.field_mapping || {};
                      return (
                        <tr key={mapping.id} className="border-t hover:bg-muted/50">
                          <td className="px-3 py-2">
                            <div className="font-medium">{mapping.jdy_form_name}</div>
                            <div className="text-xs text-muted-foreground">{mapping.jdy_app_name}</div>
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={mapping.target_entity || 'other'}
                              onValueChange={(val) => onUpdateTargetEntity(mapping.id, val)}
                            >
                              <SelectTrigger className="h-8 w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {targetEntities.map(entity => (
                                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-right">{mapping.record_count || 0}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="outline">{Object.keys(fieldMap).length} 个</Badge>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Switch
                              checked={mapping.is_confirmed}
                              onCheckedChange={(checked) => onConfirmMapping(mapping.id, checked)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
        </Button>
        <Button onClick={onNext}>
          下一步 <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ===== Step 3: Config =====
function ConfigStep({ selectedPhases, dryRun, onTogglePhase, onSetDryRun, isStarting, onStart, onBack }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>导入配置</CardTitle>
          <CardDescription>选择要执行的导入阶段，配置导入选项</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phase selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">导入阶段</Label>
            {PHASES.map((phase) => (
              <div
                key={phase.key}
                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPhases.includes(phase.key)
                    ? 'bg-primary/5 border-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onTogglePhase(phase.key)}
              >
                <Switch
                  checked={selectedPhases.includes(phase.key)}
                  onCheckedChange={() => onTogglePhase(phase.key)}
                />
                <phase.icon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{phase.label}</div>
                  <div className="text-xs text-muted-foreground">{phase.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Dry run option */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-amber-600" />
              <div>
                <Label className="font-medium">Dry Run 模式</Label>
                <p className="text-xs text-muted-foreground mt-0.5">只预览不实际写入数据，用于验证映射是否正确</p>
              </div>
            </div>
            <Switch checked={dryRun} onCheckedChange={onSetDryRun} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
        </Button>
        <Button
          onClick={onStart}
          disabled={isStarting || selectedPhases.length === 0}
          className={dryRun ? 'bg-amber-600 hover:bg-amber-700' : ''}
        >
          {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {dryRun ? '开始预览' : '开始导入'}
        </Button>
      </div>
    </div>
  );
}

// ===== Step 4: Progress =====
function ProgressStep({ progress, isLoading, onCancel, onNext }: any) {
  const isActive = progress?.status === 'running' || progress?.status === 'pending';
  const isDone = progress?.status === 'completed' || progress?.status === 'failed' || progress?.status === 'cancelled';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>导入进度</span>
              {progress && <ImportStatusBadge status={progress.status} />}
            </div>
            {isActive && (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <Square className="h-3.5 w-3.5 mr-1" /> 取消
              </Button>
            )}
          </CardTitle>
          {progress?.runCode && (
            <CardDescription>
              运行编号: {progress.runCode}
              {progress.currentStep && ` | ${progress.currentStep}`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && !progress ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : progress ? (
            <>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{progress.currentPhase || '等待开始'}</span>
                  <span>{progress.progressPercent}%</span>
                </div>
                <Progress value={progress.progressPercent} className="h-3" />
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniStatCard label="已创建" value={progress.totalCreated} color="green" />
                <MiniStatCard label="已更新" value={progress.totalUpdated} color="blue" />
                <MiniStatCard label="已跳过" value={progress.totalSkipped} color="gray" />
                <MiniStatCard label="已失败" value={progress.totalFailed} color="red" />
                <MiniStatCard label="已处理" value={progress.totalProcessed} color="default" />
              </div>

              {/* Phase results */}
              {progress.phaseResults && Object.keys(progress.phaseResults).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">阶段详情</Label>
                  {Object.entries(progress.phaseResults).map(([phase, result]: [string, any]) => (
                    <div key={phase} className="p-3 rounded-lg bg-muted text-sm">
                      <div className="font-medium mb-1">{phaseLabel(phase)}</div>
                      <div className="text-xs text-muted-foreground">
                        创建: {result?.created || 0} | 更新: {result?.updated || 0} | 跳过: {result?.skipped || 0} | 失败: {result?.failed || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {progress.errors && progress.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    错误列表 ({progress.errors.length})
                  </Label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {progress.errors.map((err: any, idx: number) => (
                      <div key={idx} className="px-3 py-1.5 text-xs border-b last:border-0 text-red-600">
                        [{err.phase || '-'}] {err.entity ? `${err.entity}: ` : ''}{err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">暂无导入数据</p>
          )}
        </CardContent>
      </Card>

      {isDone && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            查看验证结果 <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Step 5: Verify =====
function VerifyStep({ verification, isLoading, onRefresh, onBack }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>导入验证</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 刷新
            </Button>
          </CardTitle>
          <CardDescription>验证导入数据的完整性和一致性</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : verification ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Departments */}
                <VerifyCard
                  title="部门同步"
                  items={[
                    { label: 'JDY部门数', value: verification.departments?.jdyCount || 0 },
                  ]}
                />

                {/* Users */}
                <VerifyCard
                  title="用户同步"
                  items={[
                    { label: 'JDY成员数', value: verification.users?.jdyCount || 0 },
                    { label: '已关联GRT用户', value: verification.users?.linkedCount || 0 },
                    { label: '匹配率', value: verification.users?.jdyCount > 0
                      ? `${Math.round((verification.users.linkedCount / verification.users.jdyCount) * 100)}%`
                      : 'N/A' },
                  ]}
                />

                {/* Projects */}
                <VerifyCard
                  title="项目导入"
                  items={[
                    { label: '已导入项目数', value: verification.projects?.importedCount || 0 },
                  ]}
                />

                {/* Approvals */}
                <VerifyCard
                  title="审批导入"
                  items={[
                    { label: '已导入审批数', value: verification.approvals?.importedCount || 0 },
                  ]}
                />
              </div>

              {/* Orphan check */}
              {verification.orphanedReferences?.count > 0 && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">孤立引用检测</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    发现 {verification.orphanedReferences.count} 个项目引用了不存在的用户ID
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">无验证数据</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 返回进度
        </Button>
      </div>
    </div>
  );
}

// ===== Shared Components =====
function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    gray: 'text-gray-500',
    default: '',
  };
  return (
    <div className="p-2.5 rounded-lg border text-center">
      <div className={`text-xl font-bold ${colorMap[color] || ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function VerifyCard({ title, items }: { title: string; items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="p-4 rounded-lg border">
      <div className="font-medium mb-2">{title}</div>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'outline', label: '等待中' },
    running: { variant: 'default', label: '运行中' },
    completed: { variant: 'secondary', label: '已完成' },
    failed: { variant: 'destructive', label: '失败' },
    cancelled: { variant: 'outline', label: '已取消' },
  };
  const c = config[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    org: '组织架构同步',
    user: '用户创建',
    discovery: '表单发现',
    project: '项目数据导入',
    approval: '审批流程导入',
    knowledge: '知识库导入',
  };
  return labels[phase] || phase;
}
