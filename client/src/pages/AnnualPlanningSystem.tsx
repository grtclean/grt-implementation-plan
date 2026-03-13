/**
 * Annual Planning and Change Management System
 * Main component for managing annual KPIs, organization structure, and process improvements
 */

import React, { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText, BarChart3, GitBranch } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PageHeader } from "@/components/grt";

// Sub-components
import KPIInputForm from './annual-planning/KPIInputForm';
import OrgStructureForm from './annual-planning/OrgStructureForm';
import ProcessImprovementForm from './annual-planning/ProcessImprovementForm';
import DocumentUploadArea from './annual-planning/DocumentUploadArea';
import InterpretationResults from './annual-planning/InterpretationResults';
import ConfirmationWorkflow from './annual-planning/ConfirmationWorkflow';
import ChangeManagementDashboard from './annual-planning/ChangeManagementDashboard';

interface PlanningBatch {
  id: string;
  year: number;
  status: 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Executing' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
  kpiCount: number;
  departmentCount: number;
  processCount: number;
}

interface InterpretationState {
  isLoading: boolean;
  data: any;
  error?: string;
}

export default function AnnualPlanningSystem() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [planningBatch, setPlanningBatch] = useState<PlanningBatch | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationState>({
    isLoading: false,
    data: null
  });

  // Get dashboard data
  const dashboardQuery = (trpc.annualPlanning as any).getAnnualPlanningDashboard.useQuery(
    { year: selectedYear },
    { enabled: !!selectedYear }
  );

  const handleGenerateInterpretation = async (content: string, documentType: string) => {
    setInterpretation({ isLoading: true, data: null });
    try {
      // This would call the backend API
      // const result = await trpc.annualPlanning.generateInterpretation.mutate({
      //   content,
      //   documentType
      // });
      // setInterpretation({ isLoading: false, data: result });
    } catch (error) {
      setInterpretation({
        isLoading: false,
        data: null,
        error: 'Failed to generate interpretation'
      });
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={BarChart3}
          title={t("admin.planning.title")}
          description={t("admin.planning.description")}
          actions={
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("admin.planning.selectYear")} />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        {/* Status Overview */}
        {dashboardQuery.data?.dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.planning.kpis")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardQuery.data.dashboard.kpiCount}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("admin.planning.definedFor").replace("{year}", String(selectedYear))}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.planning.departments")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardQuery.data.dashboard.departmentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("admin.planning.orgChanges")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.planning.processes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardQuery.data.dashboard.processCount}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("admin.planning.improvementsIdentified")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.planning.status")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">{dashboardQuery.data.dashboard.confirmationStatus}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">{t("admin.planning.overview")}</TabsTrigger>
            <TabsTrigger value="input">{t("admin.planning.dataInput")}</TabsTrigger>
            <TabsTrigger value="interpretation">{t("admin.planning.aiAnalysis")}</TabsTrigger>
            <TabsTrigger value="confirmation">{t("admin.planning.confirmation")}</TabsTrigger>
            <TabsTrigger value="execution">{t("admin.planning.execution")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.planning.processTitle")}</CardTitle>
                <CardDescription>
                  {t("admin.planning.processDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      step: 1,
                      title: t("admin.planning.step1Title"),
                      description: t("admin.planning.step1Desc"),
                      icon: FileText
                    },
                    {
                      step: 2,
                      title: t("admin.planning.step2Title"),
                      description: t("admin.planning.step2Desc"),
                      icon: BarChart3
                    },
                    {
                      step: 3,
                      title: t("admin.planning.step3Title"),
                      description: t("admin.planning.step3Desc"),
                      icon: CheckCircle2
                    },
                    {
                      step: 4,
                      title: t("admin.planning.step4Title"),
                      description: t("admin.planning.step4Desc"),
                      icon: GitBranch
                    }
                  ].map(({ step, title, description, icon: Icon }) => (
                    <div key={step} className="flex gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {step}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.planning.quickStart")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={() => setActiveTab('input')}>
                  {t("admin.planning.startDataInput")}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('input')}>
                  {t("admin.planning.uploadDocument")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Input Tab */}
          <TabsContent value="input" className="space-y-6">
            <Tabs defaultValue="kpi" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="kpi">{t("admin.planning.kpis")}</TabsTrigger>
                <TabsTrigger value="org">{t("admin.planning.organization")}</TabsTrigger>
                <TabsTrigger value="process">{t("admin.planning.processes")}</TabsTrigger>
                <TabsTrigger value="upload">{t("admin.planning.upload")}</TabsTrigger>
              </TabsList>

              {/* KPI Input */}
              <TabsContent value="kpi">
                <KPIInputForm year={selectedYear} onSubmit={handleGenerateInterpretation} />
              </TabsContent>

              {/* Organization Structure Input */}
              <TabsContent value="org">
                <OrgStructureForm year={selectedYear} onSubmit={handleGenerateInterpretation} />
              </TabsContent>

              {/* Process Improvement Input */}
              <TabsContent value="process">
                <ProcessImprovementForm year={selectedYear} onSubmit={handleGenerateInterpretation} />
              </TabsContent>

              {/* Document Upload */}
              <TabsContent value="upload">
                <DocumentUploadArea year={selectedYear} onUpload={handleGenerateInterpretation} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* AI Interpretation Tab */}
          <TabsContent value="interpretation" className="space-y-6">
            {interpretation.isLoading && (
              <Card>
                <CardContent className="py-12 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">{t("admin.planning.aiAnalyzing")}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {interpretation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{interpretation.error}</AlertDescription>
              </Alert>
            )}

            {interpretation.data && (
              <InterpretationResults
                interpretation={interpretation.data}
                onApprove={() => setActiveTab('confirmation')}
              />
            )}

            {!interpretation.isLoading && !interpretation.data && !interpretation.error && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {t("admin.planning.submitPrompt")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Confirmation Tab */}
          <TabsContent value="confirmation" className="space-y-6">
            <ConfirmationWorkflow
              interpretation={interpretation.data}
              year={selectedYear}
              onComplete={() => setActiveTab('execution')}
            />
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution" className="space-y-6">
            <ChangeManagementDashboard year={selectedYear} />
          </TabsContent>
        </Tabs>
      </div>
  );
}
