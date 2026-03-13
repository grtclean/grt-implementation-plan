/**
 * 数据同步平台全量导入管理页面
 * 5步向导式界面：预检 → 表单发现 → 配置 → 导入进度 → 验证
 */

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  ChevronRight, ChevronLeft, AlertTriangle, Download, Eye, HardDrive
} from "lucide-react";

// 阶段配置
const PHASE_KEYS = ['org', 'user', 'discovery', 'project', 'approval', 'knowledge', 'form_data_cache'] as const;
const PHASE_ICONS: Record<string, any> = { org: Database, user: Users, discovery: FolderSearch, project: FileText, approval: GitBranch, knowledge: Download, form_data_cache: HardDrive };
const PHASE_I18N_LABEL: Record<string, string> = {
  org: "admin.extSyncImport.phaseOrg", user: "admin.extSyncImport.phaseUser", discovery: "admin.extSyncImport.phaseDiscovery",
  project: "admin.extSyncImport.phaseProject", approval: "admin.extSyncImport.phaseApproval", knowledge: "admin.extSyncImport.phaseKnowledge",
  form_data_cache: "admin.extSyncImport.phaseFormDataCache",
};
const PHASE_I18N_DESC: Record<string, string> = {
  org: "admin.extSyncImport.phaseOrgDesc", user: "admin.extSyncImport.phaseUserDesc", discovery: "admin.extSyncImport.phaseDiscoveryDesc",
  project: "admin.extSyncImport.phaseProjectDesc", approval: "admin.extSyncImport.phaseApprovalDesc", knowledge: "admin.extSyncImport.phaseKnowledgeDesc",
  form_data_cache: "admin.extSyncImport.phaseFormDataCacheDesc",
};

type WizardStep = 'precheck' | 'discovery' | 'config' | 'progress' | 'verify';

export default function ExternalSyncFullImport() {
  const { t } = useLanguage();
  const [step, setStep] = useState<WizardStep>('precheck');
  const [selectedPhases, setSelectedPhases] = useState<string[]>(['org', 'user', 'discovery', 'project', 'approval', 'knowledge', 'form_data_cache']);
  const [dryRun, setDryRun] = useState(false);
  const [runCode, setRunCode] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // tRPC queries
  const connectionTest = trpc.externalSync.testConnection.useMutation();
  const statusQuery = trpc.externalSync.getStatus.useQuery();
  const isRunningQuery = trpc.externalSync.isImportRunning.useQuery(undefined, {
    refetchInterval: step === 'progress' ? 2000 : false,
  });
  const importRunsQuery = trpc.externalSync.getImportRuns.useQuery();
  const formMappingsQuery = trpc.externalSync.getFormMappings.useQuery({});
  const verificationQuery = trpc.externalSync.getImportVerification.useQuery(undefined, {
    enabled: step === 'verify',
  });
  const progressQuery = trpc.externalSync.getImportProgress.useQuery(
    { runCode: runCode || '' },
    { enabled: !!runCode && step === 'progress', refetchInterval: 2000 }
  );

  // tRPC mutations
  const startImport = trpc.externalSync.startFullImport.useMutation();
  const cancelImport = trpc.externalSync.cancelImport.useMutation();
  const discoverForms = trpc.externalSync.discoverForms.useMutation();
  const updateMapping = trpc.externalSync.updateFormMapping.useMutation();

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
    precheck: t("admin.extSyncImport.stepPrecheck"),
    discovery: t("admin.extSyncImport.stepDiscovery"),
    config: t("admin.extSyncImport.stepConfig"),
    progress: t("admin.extSyncImport.stepProgress"),
    verify: t("admin.extSyncImport.stepVerify"),
  };

  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("admin.extSyncImport.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("admin.extSyncImport.subtitle")}
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
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.extSyncImport.apiConnectionTest")}</CardTitle>
          <CardDescription>{t("admin.extSyncImport.apiConnectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("admin.extSyncImport.configStatus")}</span>
                {statusQuery.data?.configured ? (
                  <Badge variant="default" className="bg-green-500">{t("admin.extSyncImport.configured")}</Badge>
                ) : connectionTest.data?.mode === 'local' ? (
                  <Badge variant="default" className="bg-blue-500">本地模式</Badge>
                ) : (
                  <Badge variant="destructive">{t("admin.extSyncImport.notConfigured")}</Badge>
                )}
              </div>
              {statusQuery.data?.corpId && (
                <p className="text-xs text-muted-foreground mt-1">{t("admin.extSyncImport.corpId")} {statusQuery.data.corpId}</p>
              )}
            </div>
            <Button onClick={onTestConnection} disabled={connectionTest.isPending}>
              {connectionTest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("admin.extSyncImport.testConnection")}
            </Button>
          </div>

          {connectionTest.data && (
            connectionTest.data.mode === 'local' ? (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{connectionTest.data.message}</span>
                </div>
                {connectionTest.data.localStats && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    部门: {connectionTest.data.localStats.departments} | 用户: {connectionTest.data.localStats.users} | 角色: {connectionTest.data.localStats.roles}
                  </p>
                )}
              </div>
            ) : (
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
                  <p className="text-xs mt-1 text-muted-foreground">{connectionTest.data.apps} {t("admin.extSyncImport.appsFound")}</p>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* GRT数据统计 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.extSyncImport.grtExistingData")}</CardTitle>
          <CardDescription>{t("admin.extSyncImport.grtExistingDataDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t("admin.extSyncImport.extSyncStats")} value={statusQuery.data?.stats?.totalApps || 0} sub={t("admin.extSyncImport.appCount")} />
            <StatCard label={t("admin.extSyncImport.formCount")} value={statusQuery.data?.stats?.totalForms || 0} sub={t("admin.extSyncImport.discovered")} />
            <StatCard label={t("admin.extSyncImport.totalRecords")} value={statusQuery.data?.stats?.totalRecords || 0} sub={t("admin.extSyncImport.total")} />
            <StatCard label={t("admin.extSyncImport.lastSync")} value={statusQuery.data?.stats?.lastSyncTime ? new Date(statusQuery.data.stats.lastSyncTime).toLocaleDateString() : t("admin.extSyncImport.never")} sub="" />
          </div>
        </CardContent>
      </Card>

      {/* 历史导入记录 */}
      {importRuns && importRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.extSyncImport.importHistory")}</CardTitle>
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
                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : t("admin.extSyncImport.notStarted")}
                    {' | '}{t("admin.extSyncImport.created")}: {run.totalCreated} {t("admin.extSyncImport.updated")}: {run.totalUpdated} {t("admin.extSyncImport.failed")}: {run.totalFailed}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!statusQuery.data?.configured && connectionTest.data?.mode !== 'local'}>
          {t("admin.extSyncImport.next")} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ===== Step 2: Discovery =====
function DiscoveryStep({ formMappings, isDiscovering, onDiscoverForms, onConfirmMapping, onUpdateTargetEntity, onBack, onNext }: any) {
  const { t } = useLanguage();
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
            <span>{t("admin.extSyncImport.formDiscoveryMapping")}</span>
            <Button onClick={onDiscoverForms} disabled={isDiscovering}>
              {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderSearch className="h-4 w-4 mr-2" />}
              {isDiscovering ? t("admin.extSyncImport.scanning") : t("admin.extSyncImport.executeScan")}
            </Button>
          </CardTitle>
          <CardDescription>
            {t("admin.extSyncImport.scanDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formMappings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FolderSearch className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>{t("admin.extSyncImport.noFormsYet")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span>{t("admin.extSyncImport.totalForms")} {formMappings.length}</span>
                <span>{t("admin.extSyncImport.confirmed")} {formMappings.filter((m: any) => m.is_confirmed).length}</span>
                <span>{t("admin.extSyncImport.classifiedCount")} {formMappings.filter((m: any) => m.target_entity).length}</span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">{t("admin.extSyncImport.colAppForm")}</th>
                      <th className="px-3 py-2 text-left">{t("admin.extSyncImport.colTargetEntity")}</th>
                      <th className="px-3 py-2 text-right">{t("admin.extSyncImport.colRecordCount")}</th>
                      <th className="px-3 py-2 text-center">{t("admin.extSyncImport.colMappedFields")}</th>
                      <th className="px-3 py-2 text-center">{t("admin.extSyncImport.colConfirm")}</th>
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
                            <div className="font-medium">{mapping.ext_form_name}</div>
                            <div className="text-xs text-muted-foreground">{mapping.ext_app_name}</div>
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
                            <Badge variant="outline">{Object.keys(fieldMap).length}</Badge>
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
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("admin.extSyncImport.prev")}
        </Button>
        <Button onClick={onNext}>
          {t("admin.extSyncImport.next")} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ===== Step 3: Config =====
function ConfigStep({ selectedPhases, dryRun, onTogglePhase, onSetDryRun, isStarting, onStart, onBack }: any) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.extSyncImport.importConfig")}</CardTitle>
          <CardDescription>{t("admin.extSyncImport.importConfigDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phase selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t("admin.extSyncImport.importPhases")}</Label>
            {PHASE_KEYS.map((phaseKey) => {
              const PhaseIcon = PHASE_ICONS[phaseKey];
              return (
              <div
                key={phaseKey}
                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPhases.includes(phaseKey)
                    ? 'bg-primary/5 border-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onTogglePhase(phaseKey)}
              >
                <Switch
                  checked={selectedPhases.includes(phaseKey)}
                  onCheckedChange={() => onTogglePhase(phaseKey)}
                />
                <PhaseIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{t(PHASE_I18N_LABEL[phaseKey])}</div>
                  <div className="text-xs text-muted-foreground">{t(PHASE_I18N_DESC[phaseKey])}</div>
                </div>
              </div>
            );
            })}
          </div>

          {/* Dry run option */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-amber-600" />
              <div>
                <Label className="font-medium">{t("admin.extSyncImport.dryRunMode")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t("admin.extSyncImport.dryRunDesc")}</p>
              </div>
            </div>
            <Switch checked={dryRun} onCheckedChange={onSetDryRun} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("admin.extSyncImport.prev")}
        </Button>
        <Button
          onClick={onStart}
          disabled={isStarting || selectedPhases.length === 0}
          className={dryRun ? 'bg-amber-600 hover:bg-amber-700' : ''}
        >
          {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {dryRun ? t("admin.extSyncImport.startPreview") : t("admin.extSyncImport.startImport")}
        </Button>
      </div>
    </div>
  );
}

// ===== Step 4: Progress =====
function ProgressStep({ progress, isLoading, onCancel, onNext }: any) {
  const { t } = useLanguage();
  const isActive = progress?.status === 'running' || progress?.status === 'pending';
  const isDone = progress?.status === 'completed' || progress?.status === 'failed' || progress?.status === 'cancelled';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{t("admin.extSyncImport.importProgress")}</span>
              {progress && <ImportStatusBadge status={progress.status} />}
            </div>
            {isActive && (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <Square className="h-3.5 w-3.5 mr-1" /> {t("admin.extSyncImport.cancel")}
              </Button>
            )}
          </CardTitle>
          {progress?.runCode && (
            <CardDescription>
              {t("admin.extSyncImport.runCode")} {progress.runCode}
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
                  <span>{progress.currentPhase || t("admin.extSyncImport.waitingToStart")}</span>
                  <span>{progress.progressPercent}%</span>
                </div>
                <Progress value={progress.progressPercent} className="h-3" />
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniStatCard label={t("admin.extSyncImport.statCreated")} value={progress.totalCreated} color="green" />
                <MiniStatCard label={t("admin.extSyncImport.statUpdated")} value={progress.totalUpdated} color="blue" />
                <MiniStatCard label={t("admin.extSyncImport.statSkipped")} value={progress.totalSkipped} color="gray" />
                <MiniStatCard label={t("admin.extSyncImport.statFailed")} value={progress.totalFailed} color="red" />
                <MiniStatCard label={t("admin.extSyncImport.statProcessed")} value={progress.totalProcessed} color="default" />
              </div>

              {/* Phase results */}
              {progress.phaseResults && Object.keys(progress.phaseResults).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("admin.extSyncImport.phaseDetails")}</Label>
                  {Object.entries(progress.phaseResults).map(([phase, result]: [string, any]) => (
                    <div key={phase} className="p-3 rounded-lg bg-muted text-sm">
                      <div className="font-medium mb-1">{PHASE_I18N_LABEL[phase] ? t(PHASE_I18N_LABEL[phase]) : phase}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("admin.extSyncImport.statCreated")}: {result?.created || 0} | {t("admin.extSyncImport.statUpdated")}: {result?.updated || 0} | {t("admin.extSyncImport.statSkipped")}: {result?.skipped || 0} | {t("admin.extSyncImport.statFailed")}: {result?.failed || 0}
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
                    {t("admin.extSyncImport.errorList")} ({progress.errors.length})
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
            <p className="text-muted-foreground text-center py-8">{t("admin.extSyncImport.noImportData")}</p>
          )}
        </CardContent>
      </Card>

      {isDone && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            {t("admin.extSyncImport.viewVerification")} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Step 5: Verify =====
function VerifyStep({ verification, isLoading, onRefresh, onBack }: any) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("admin.extSyncImport.importVerification")}</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t("admin.extSyncImport.refresh")}
            </Button>
          </CardTitle>
          <CardDescription>{t("admin.extSyncImport.importVerificationDesc")}</CardDescription>
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
                  title={t("admin.extSyncImport.deptSync")}
                  items={[
                    { label: t("admin.extSyncImport.extDeptCount"), value: verification.departments?.extCount || 0 },
                  ]}
                />

                {/* Users */}
                <VerifyCard
                  title={t("admin.extSyncImport.userSync")}
                  items={[
                    { label: t("admin.extSyncImport.extMemberCount"), value: verification.users?.extCount || 0 },
                    { label: t("admin.extSyncImport.linkedGrtUsers"), value: verification.users?.linkedCount || 0 },
                    { label: t("admin.extSyncImport.matchRate"), value: verification.users?.extCount > 0
                      ? `${Math.round((verification.users.linkedCount / verification.users.extCount) * 100)}%`
                      : 'N/A' },
                  ]}
                />

                {/* Projects */}
                <VerifyCard
                  title={t("admin.extSyncImport.projectImportVerify")}
                  items={[
                    { label: t("admin.extSyncImport.importedProjects"), value: verification.projects?.importedCount || 0 },
                  ]}
                />

                {/* Approvals */}
                <VerifyCard
                  title={t("admin.extSyncImport.approvalImportVerify")}
                  items={[
                    { label: t("admin.extSyncImport.importedApprovals"), value: verification.approvals?.importedCount || 0 },
                  ]}
                />
              </div>

              {/* Orphan check */}
              {verification.orphanedReferences?.count > 0 && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">{t("admin.extSyncImport.orphanCheck")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("admin.extSyncImport.orphanRefFound")} {verification.orphanedReferences.count} {t("admin.extSyncImport.orphanRefSuffix")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t("admin.extSyncImport.noVerificationData")}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("admin.extSyncImport.backToProgress")}
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
  const { t } = useLanguage();
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; labelKey: string }> = {
    pending: { variant: 'outline', labelKey: 'admin.extSyncImport.statusPending' },
    running: { variant: 'default', labelKey: 'admin.extSyncImport.statusRunning' },
    completed: { variant: 'secondary', labelKey: 'admin.extSyncImport.statusCompleted' },
    failed: { variant: 'destructive', labelKey: 'admin.extSyncImport.statusFailed' },
    cancelled: { variant: 'outline', labelKey: 'admin.extSyncImport.statusCancelled' },
  };
  const c = config[status];
  return <Badge variant={c?.variant || 'outline'}>{c ? t(c.labelKey) : status}</Badge>;
}

