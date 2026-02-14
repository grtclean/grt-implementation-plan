/**
 * Annual Planning and Change Management System
 * Main component for managing annual KPIs, organization structure, and process improvements
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText, BarChart3, GitBranch } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PageHeader } from "@/components/grt";
import Layout from "@/components/Layout";

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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={BarChart3}
          title="Annual Planning & Change Management"
          description="Manage annual KPIs, organization structure, and process improvements with AI assistance"
          actions={
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          }
        />
        {/* Status Overview */}
        {dashboardQuery.data?.dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">KPIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardQuery.data.dashboard.kpiCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Defined for {selectedYear}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardQuery.data.dashboard.departmentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Organization changes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardQuery.data.dashboard.processCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Improvements identified</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="input">Data Input</TabsTrigger>
            <TabsTrigger value="interpretation">AI Analysis</TabsTrigger>
            <TabsTrigger value="confirmation">Confirmation</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Annual Planning Process</CardTitle>
                <CardDescription>
                  Follow these steps to complete your annual planning and implement changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      step: 1,
                      title: 'Data Input',
                      description: 'Enter KPIs, organization structure, and process improvements',
                      icon: FileText
                    },
                    {
                      step: 2,
                      title: 'AI Interpretation',
                      description: 'AI analyzes your input and generates insights and recommendations',
                      icon: BarChart3
                    },
                    {
                      step: 3,
                      title: 'Multi-level Confirmation',
                      description: 'Review and approve changes through 4 confirmation levels',
                      icon: CheckCircle2
                    },
                    {
                      step: 4,
                      title: 'Change Execution',
                      description: 'Authorized AI engineers execute approved changes',
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
                <CardTitle>Quick Start</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={() => setActiveTab('input')}>
                  Start Data Input
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('input')}>
                  Upload Planning Document
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Input Tab */}
          <TabsContent value="input" className="space-y-6">
            <Tabs defaultValue="kpi" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="kpi">KPIs</TabsTrigger>
                <TabsTrigger value="org">Organization</TabsTrigger>
                <TabsTrigger value="process">Processes</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
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
                    <p className="text-muted-foreground">Analyzing your input with AI...</p>
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
                    Submit data or upload a document to see AI interpretation results
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
    </Layout>
  );
}
