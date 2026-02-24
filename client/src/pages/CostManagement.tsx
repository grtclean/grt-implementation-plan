import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle,
  ArrowDownRight, 
  ArrowUpRight, 
  Bell,
  Calculator, 
  DollarSign, 
  FileText, 
  Loader2, 
  PieChart, 
  Plus, 
  Settings,
  TrendingDown, 
  TrendingUp,
  Users,
  Database,
  Download,
  History,
  GitCompare,
  RotateCcw,
  ChevronRight,
  Eye,
  Library,
  Copy,
  Save,
  Sparkles
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import ProcessNotebook from "@/components/ProcessNotebook";
import FeatureGuide from "@/components/FeatureGuide";
import { toast } from "sonner";

export default function CostManagement() {
  const { t, tpl } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [showAddBudgetDialog, setShowAddBudgetDialog] = useState(false);
  const [showVersionHistoryDialog, setShowVersionHistoryDialog] = useState(false);
  const [selectedRuleForVersion, setSelectedRuleForVersion] = useState<number | null>(null);
  const [compareVersions, setCompareVersions] = useState<{v1: number, v2: number} | null>(null);
  
  // Batch version management state
  const [selectedRulesForBatch, setSelectedRulesForBatch] = useState<number[]>([]);
  const [showBatchVersionDialog, setShowBatchVersionDialog] = useState(false);
  const [batchRollbackDate, setBatchRollbackDate] = useState<string>("");
  const [batchExportFormat, setBatchExportFormat] = useState<"json" | "csv">("json");
  
  // Template library state
  const [showTemplateLibraryDialog, setShowTemplateLibraryDialog] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<"all" | "budget" | "performance" | "cost" | "risk">("all");
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
  const [ruleToSaveAsTemplate, setRuleToSaveAsTemplate] = useState<number | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState<"budget" | "performance" | "cost" | "risk">("budget");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery();
  
  // Fetch cost categories
  const { data: categories } = trpc.cost.getCategories.useQuery();
  
  // Fetch cost summary for selected project
  const { data: costSummary, isLoading: summaryLoading } = trpc.cost.getSummary.useQuery(
    undefined,
    { enabled: !!selectedProjectId }
  );

  // Fetch cost records for selected project
  const { data: costRecords } = trpc.cost.getRecords.useQuery(
    undefined,
    { enabled: !!selectedProjectId }
  );

  // Fetch budgets for selected project
  const { data: budgets } = trpc.cost.getBudgets.useQuery(
    undefined,
    { enabled: !!selectedProjectId }
  );

  // Fetch labor costs for selected project
  const { data: laborCosts } = trpc.cost.getLaborCosts.useQuery(
    undefined,
    { enabled: !!selectedProjectId }
  );

  // Fetch alert logs for selected project
  const { data: alertLogs, isLoading: alertLogsLoading } = trpc.costAlert.getProjectLogs.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  // Fetch alert rules
  const { data: alertRules } = trpc.costAlert.getActiveRules.useQuery();

  // Mutations
  const utils = trpc.useUtils();
  
  const createRecordMutation = trpc.cost.createRecord.useMutation({
    onSuccess: () => {
      toast.success(t("finance.cost.recordCreatedMsg"));
      setShowAddRecordDialog(false);
      utils.cost.getRecords.invalidate();
      utils.cost.getSummary.invalidate();
    },
    onError: (error) => {
      toast.error(t("finance.cost.createFailedMsg") + ": " + error.message);
    },
  });

  const initCategoriesMutation = trpc.cost.initCategories.useMutation({
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(result.message);
        utils.cost.getCategories.invalidate();
      } else {
        toast.error(result?.message || t("finance.cost.initFailedMsg"));
      }
    },
    onError: (error) => {
      toast.error(t("finance.cost.initFailedMsg") + ": " + error.message);
    },
  });

  const createBudgetMutation = trpc.cost.createBudget.useMutation({
    onSuccess: () => {
      toast.success(t("finance.cost.budgetCreatedMsg"));
      setShowAddBudgetDialog(false);
      utils.cost.getBudgets.invalidate();
      utils.cost.getSummary.invalidate();
    },
    onError: (error) => {
      toast.error(t("finance.cost.createFailedMsg") + ": " + error.message);
    },
  });

  // Batch import/export for cost alert rules
  const batchImportMutation = trpc.costAlert.batchImport.useMutation({
    onSuccess: () => {
      utils.costAlert.getActiveRules.invalidate();
    },
  });
  const exportCSVMutation = trpc.costAlert.exportCSV.useMutation();

  // Rule version management queries and mutations
  const { data: ruleVersions, isLoading: versionsLoading } = trpc.ruleVersion.getAll.useQuery(
    undefined,
    { enabled: !!selectedRuleForVersion }
  );

  const { data: versionComparison } = trpc.ruleVersion.compare.useQuery(
    { ruleId: selectedRuleForVersion!, version1: compareVersions?.v1 || 0, version2: compareVersions?.v2 || 0 },
    { enabled: !!selectedRuleForVersion && !!compareVersions }
  );
  
  const rollbackMutation = trpc.ruleVersion.rollback.useMutation({
    onSuccess: () => {
      toast.success(t("finance.cost.rollbackSuccessMsg"));
      utils.costAlert.getActiveRules.invalidate();
      utils.ruleVersion.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(t("finance.cost.rollbackFailedMsg") + ": " + error.message);
    },
  });
  
  // Template library queries and mutations
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.ruleTemplate.getAll.useQuery(
    undefined,
    { enabled: showTemplateLibraryDialog }
  );
  
  const initBuiltinTemplatesMutation = trpc.ruleTemplate.initBuiltin.useMutation({
    onSuccess: (result) => {
      toast.success(tpl("finance.cost.initCompleted", { msg: result.message }));
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(t("finance.cost.initFailedMsg") + ": " + error.message);
    },
  });
  
  const createRuleFromTemplateMutation = trpc.ruleTemplate.createRule.useMutation({
    onSuccess: () => {
      toast.success(t("finance.cost.ruleCreatedMsg"));
      utils.costAlert.getActiveRules.invalidate();
      setShowTemplateLibraryDialog(false);
    },
    onError: (error) => {
      toast.error(t("finance.cost.createFailedMsg") + ": " + error.message);
    },
  });
  
  const saveAsTemplateMutation = trpc.ruleTemplate.saveAsTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("finance.cost.templateSavedMsg"));
      setShowSaveAsTemplateDialog(false);
      setRuleToSaveAsTemplate(null);
      setNewTemplateName("");
      setNewTemplateDescription("");
    },
    onError: (error) => {
      toast.error(t("finance.cost.saveFailed") + ": " + error.message);
    },
  });
  
  // Batch version management functions
  const toggleRuleSelection = (ruleId: number) => {
    setSelectedRulesForBatch(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };
  
  const selectAllRules = () => {
    if (alertRules) {
      setSelectedRulesForBatch(alertRules.map(r => r.id));
    }
  };
  
  const clearRuleSelection = () => {
    setSelectedRulesForBatch([]);
  };
  
  const handleBatchExport = () => {
    if (selectedRulesForBatch.length === 0) {
      toast.error(t("finance.cost.selectRules"));
      return;
    }

    const selectedRulesData = alertRules?.filter(r => selectedRulesForBatch.includes(r.id)) || [];

    if (batchExportFormat === "json") {
      const exportData = {
        exportTime: new Date().toISOString(),
        rules: selectedRulesData.map(r => ({
          name: r.name,
          description: r.description,
          scope: r.scope,
          alertType: r.alertType,
          threshold: r.threshold,
          alertLevel: r.alertLevel,
          isActive: r.isActive,
        })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alert-rules-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tpl("finance.cost.exportedCount", { count: selectedRulesData.length }));
    } else {
      const csvHeaders = t("finance.cost.csvHeaders");
      const rows = selectedRulesData.map(r => [
        r.name,
        r.description || "",
        r.scope,
        r.alertType,
        r.threshold,
        r.alertLevel,
        r.isActive ? t("finance.cost.csvEnabled") : t("finance.cost.csvDisabled"),
      ]);
      const csv = [csvHeaders, ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alert-rules-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tpl("finance.cost.exportedCount", { count: selectedRulesData.length }));
    }
  };
  
  const handleBatchRollback = async () => {
    if (selectedRulesForBatch.length === 0 || !batchRollbackDate) {
      toast.error(t("finance.cost.selectRulesAndDate"));
      return;
    }
    
    const targetDate = new Date(batchRollbackDate);
    let successCount = 0;
    let failCount = 0;
    
    for (const ruleId of selectedRulesForBatch) {
      try {
        // Find the latest version before the target date
        const versions = await utils.ruleVersion.getAll.fetch();
        const targetVersion = versions?.find(v => new Date(v.changedAt) <= targetDate);
        
        if (targetVersion) {
          await rollbackMutation.mutateAsync({ ruleId, versionNumber: targetVersion.versionNumber });
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(tpl("finance.cost.rollbackedCount", { count: successCount }));
    }
    if (failCount > 0) {
      toast.warning(tpl("finance.cost.rollbackFailedCount", { count: failCount }));
    }
    
    setShowBatchVersionDialog(false);
    setSelectedRulesForBatch([]);
    setBatchRollbackDate("");
  };

  // Export functions
  const handleExportPDF = () => {
    if (!selectedProjectId || !costSummary) {
      toast.error(t("finance.cost.selectProjectMsg"));
      return;
    }

    // Generate PDF content
    const selectedProject = projects?.find(p => p.id === selectedProjectId);
    const content = `
${t("finance.cost.costReportLabel")} - ${selectedProject?.name || t("finance.cost.unknownProject")}
${t("finance.cost.generatedTimeLabel")}: ${new Date().toLocaleString()}

${t("finance.cost.costOverviewLabel")}
---------
${t("finance.cost.totalBudgetLabel")}: ${formatCurrency(costSummary.summary.totalBudget || 0)}
${t("finance.cost.actualCostLabel")}: ${formatCurrency(costSummary.summary.totalSpent || 0)}
${t("finance.cost.budgetUsageLabel")}: ${costSummary.summary.totalBudget ? ((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100).toFixed(1) : 0}%
CPI: ${costSummary.summary.totalSpent > 0 ? (costSummary.summary.totalBudget / costSummary.summary.totalSpent).toFixed(2) : 'N/A'}

${t("finance.cost.costDetailLabel")}
---------
${costRecords?.map(r => `${(r as any).costCode || r.categoryId} - ${r.description}: ${formatCurrency((r as any).amount || r.amount)}`).join('\n') || t("finance.cost.noRecordsLabel")}
    `.trim();

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t("finance.cost.costReportFilename")}_${selectedProject?.name || 'project'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("finance.cost.exportSuccessMsg"));
  };

  const handleExportExcel = () => {
    if (!selectedProjectId || !costSummary) {
      toast.error(t("finance.cost.selectProjectMsg"));
      return;
    }

    const selectedProject = projects?.find(p => p.id === selectedProjectId);

    // Generate CSV content (Excel compatible)
    let csv = '\uFEFF'; // BOM for Excel UTF-8
    csv += `${t("finance.cost.csvReportLabel")},\n`;
    csv += `${t("finance.cost.csvProjectName")},${selectedProject?.name || ''}\n`;
    csv += `${t("finance.cost.csvGeneratedTime")},${new Date().toLocaleString()}\n`;
    csv += '\n';
    csv += `${t("finance.cost.csvCostOverview")},\n`;
    csv += `${t("finance.cost.csvTotalBudget")},${(costSummary.summary.totalBudget || 0) / 100}\n`;
    csv += `${t("finance.cost.csvActualCost")},${(costSummary.summary.totalSpent || 0) / 100}\n`;
    csv += `${t("finance.cost.csvBudgetUsage")},${costSummary.summary.totalBudget ? ((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100).toFixed(1) : 0}%\n`;
    csv += `CPI,${costSummary.summary.totalSpent > 0 ? (costSummary.summary.totalBudget / costSummary.summary.totalSpent).toFixed(2) : 'N/A'}\n`;
    csv += '\n';
    csv += `${t("finance.cost.csvCostDetail")},\n`;
    csv += `${t("finance.cost.csvCatIdDescAmount")}\n`;
    costRecords?.forEach(r => {
      csv += `${r.categoryId},${r.description},${r.amount / 100}\n`;
    });

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t("finance.cost.csvReportFilename")}_${selectedProject?.name || 'project'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("finance.cost.exportExcelMsg"));
  };

  // Form states
  const [recordForm, setRecordForm] = useState({
    categoryId: 0,
    costCode: "",
    description: "",
    amount: 0,
    vendor: "",
    invoiceNo: "",
    phaseCode: "",
    remark: "",
  });

  const [budgetForm, setBudgetForm] = useState({
    categoryId: 0,
    budgetYear: new Date().getFullYear(),
    budgetMonth: undefined as number | undefined,
    budgetAmount: 0,
    remark: "",
  });

  const handleCreateRecord = () => {
    if (!selectedProjectId || !recordForm.categoryId || !recordForm.costCode || !recordForm.description) {
      toast.error(t("finance.cost.fillRequiredMsg"));
      return;
    }
    createRecordMutation.mutate({
      projectId: selectedProjectId,
      categoryId: recordForm.categoryId,
      costCode: recordForm.costCode,
      description: recordForm.description,
      amount: recordForm.amount * 100, // Convert to cents
      costDate: new Date().toISOString(),
      vendor: recordForm.vendor || undefined,
      invoiceNo: recordForm.invoiceNo || undefined,
      phaseCode: recordForm.phaseCode || undefined,
      remark: recordForm.remark || undefined,
    });
  };

  const handleCreateBudget = () => {
    if (!selectedProjectId || !budgetForm.categoryId || !budgetForm.budgetAmount) {
      toast.error(t("finance.cost.fillRequiredMsg"));
      return;
    }
    createBudgetMutation.mutate({
      projectId: selectedProjectId,
      categoryId: budgetForm.categoryId,
      budgetYear: budgetForm.budgetYear,
      budgetMonth: budgetForm.budgetMonth,
      budgetAmount: budgetForm.budgetAmount * 100, // Convert to cents
      remark: budgetForm.remark || undefined,
    });
  };

  // Format currency (from cents to yuan)
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "CNY",
    }).format(cents / 100);
  };

  return (
      <>
      <FeatureGuide
        featureId="cost-management"
        title={t("finance.cost.titleLabel")}
        description={t("finance.cost.descLabel")}
        steps={[
          { title: t("finance.cost.featureProjectSelect"), description: t("finance.cost.featureProjectSelectDesc") },
          { title: t("finance.cost.featureBudgetMgmt"), description: t("finance.cost.featureBudgetMgmtDesc") },
          { title: t("finance.cost.featureCostRecord"), description: t("finance.cost.featureCostRecordDesc") },
          { title: t("finance.cost.featureVariance"), description: t("finance.cost.featureVarianceDesc") },
          { title: t("finance.cost.featureAlert"), description: t("finance.cost.featureAlertDesc") },
          { title: t("finance.cost.featureVersion"), description: t("finance.cost.featureVersionDesc") }
        ]}
      />
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Calculator}
          title={t("finance.cost.titleLabel")}
          description={t("finance.cost.descLabel")}
          actions={
            <>
              {/* Initialize Categories Button - only show when no categories exist */}
              {(!categories || categories.length === 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => initCategoriesMutation.mutate()}
                  disabled={initCategoriesMutation.isPending}
                >
                  {initCategoriesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-1" />
                  )}
                  {t("finance.cost.initCategories2")}
                </Button>
              )}
              <Select
                value={selectedProjectId?.toString() || ""}
                onValueChange={(value) => setSelectedProjectId(parseInt(value))}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder={t("finance.cost.selectProjectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Buttons */}
              {selectedProjectId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    {t("finance.cost.exportReportBtn")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {t("finance.cost.exportExcelBtn")}
                  </Button>
                </>
              )}
            </>
          }
        />

        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">{t("finance.cost.selectProject")}</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">{t("finance.cost.selectProjectHint")}</p>
            </CardContent>
          </Card>
        ) : summaryLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Top-level tab navigation */}
            <Tabs defaultValue="project-cost" className="space-y-6">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="project-cost" className="gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  {t("finance.cost.projectCostTab")}
                </TabsTrigger>
                <TabsTrigger value="cost-analysis" className="gap-1.5">
                  <PieChart className="w-4 h-4" />
                  {t("finance.cost.costAnalysisTab")}
                </TabsTrigger>
                <TabsTrigger value="cost-budget" className="gap-1.5">
                  <Calculator className="w-4 h-4" />
                  {t("finance.cost.costBudgetTab")}
                </TabsTrigger>
              </TabsList>

              {/* ========== Tab 1: 项目成本 ========== */}
              <TabsContent value="project-cost" className="space-y-4">
                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard icon={Calculator} label={t("finance.cost.totalBudget")} value={formatCurrency(costSummary?.summary.totalBudget || 0)} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
                  <StatCard icon={DollarSign} label={t("finance.cost.totalSpent")} value={formatCurrency(costSummary?.summary.totalSpent || 0)} iconColor="text-green-500" iconBg="bg-green-500/10" />
                  <StatCard
                    icon={((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) >= 0 ? TrendingDown : TrendingUp}
                    label={t("finance.cost.varianceLabel")}
                    value={formatCurrency(Math.abs((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)))}
                    iconColor={((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) >= 0 ? "text-emerald-500" : "text-red-500"}
                    iconBg={((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
                  />
                  <StatCard icon={PieChart} label={t("finance.cost.cpiLabel")} value={costSummary?.summary.totalSpent ? (costSummary.summary.totalBudget / costSummary.summary.totalSpent).toFixed(2) : "1.00"} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
                </div>

                {/* Cost Records */}
                <div className="flex items-center justify-end">
                  <Dialog open={showAddRecordDialog} onOpenChange={setShowAddRecordDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        {t("finance.cost.addCostRecord")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("finance.cost.addCostRecord")}</DialogTitle>
                        <DialogDescription>{t("finance.cost.recordActualSpend")}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("finance.cost.categoryLabel")} *</Label>
                            <Select
                              value={recordForm.categoryId.toString()}
                              onValueChange={(value) => setRecordForm({ ...recordForm, categoryId: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("finance.cost.selectCategory")} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t("finance.cost.costCodeLabel")} *</Label>
                            <Input
                              value={recordForm.costCode}
                              onChange={(e) => setRecordForm({ ...recordForm, costCode: e.target.value })}
                              placeholder={t("finance.cost.costCodePlaceholder")}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("finance.cost.descriptionLabel")} *</Label>
                          <Textarea
                            value={recordForm.description}
                            onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                            placeholder={t("finance.cost.costDescPlaceholder")}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("finance.cost.amountYuan")} *</Label>
                            <Input
                              type="number"
                              value={recordForm.amount}
                              onChange={(e) => setRecordForm({ ...recordForm, amount: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("finance.cost.vendorLabel")}</Label>
                            <Input
                              value={recordForm.vendor}
                              onChange={(e) => setRecordForm({ ...recordForm, vendor: e.target.value })}
                              placeholder={t("finance.cost.vendorPlaceholder")}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("finance.cost.invoiceLabel")}</Label>
                            <Input
                              value={recordForm.invoiceNo}
                              onChange={(e) => setRecordForm({ ...recordForm, invoiceNo: e.target.value })}
                              placeholder={t("finance.cost.invoicePlaceholder")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("finance.cost.phaseLabel")}</Label>
                            <Select
                              value={recordForm.phaseCode}
                              onValueChange={(value) => setRecordForm({ ...recordForm, phaseCode: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("finance.cost.selectPhase")} />
                              </SelectTrigger>
                              <SelectContent>
                                {["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"].map((phase) => (
                                  <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("finance.cost.remarkLabel")}</Label>
                          <Textarea
                            value={recordForm.remark}
                            onChange={(e) => setRecordForm({ ...recordForm, remark: e.target.value })}
                            placeholder={t("finance.cost.remarkPlaceholder")}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddRecordDialog(false)}>
                          {t("finance.cost.cancelBtn")}
                        </Button>
                        <Button onClick={handleCreateRecord} disabled={createRecordMutation.isPending}>
                          {createRecordMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          {t("finance.cost.createBtn")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {t("finance.cost.costRecordList")}
                    </CardTitle>
                    <CardDescription>
                      {tpl("finance.cost.totalRecords", { count: costRecords?.length || 0 })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {costRecords && costRecords.length > 0 ? (
                      <div className="space-y-3">
                        {costRecords.map((record, idx) => {
                          const rec = record as any;
                          return (
                          <div
                            key={rec.id || idx}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <DollarSign className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{record.description}</p>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <span className="font-mono">{rec.costCode || record.categoryId}</span>
                                  {rec.vendor && <span>• {rec.vendor}</span>}
                                  {rec.phaseCode && (
                                    <Badge variant="outline" className="text-xs">{rec.phaseCode}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(Number(rec.amount || record.amount))}</p>
                              <Badge variant="outline" className={
                                rec.status === "approved" ? "bg-green-500/20 text-green-400" :
                                rec.status === "paid" ? "bg-blue-500/20 text-blue-400" :
                                rec.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                "bg-yellow-500/20 text-yellow-400"
                              }>
                                {rec.status === "approved" ? t("finance.cost.statusApproved") :
                                 rec.status === "paid" ? t("finance.cost.statusPaid") :
                                 rec.status === "rejected" ? t("finance.cost.statusRejected") : t("finance.cost.statusPending")}
                              </Badge>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("finance.cost.noCostRecords")}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Labor Costs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("finance.cost.laborCostTitle")}
                    </CardTitle>
                    <CardDescription>
                      {tpl("finance.cost.totalLaborRecords", { count: laborCosts?.length || 0 })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {laborCosts && laborCosts.length > 0 ? (
                      <div className="space-y-3">
                        {laborCosts.map((labor) => {
                          const lb = labor as any;
                          return (
                          <div
                            key={labor.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card"
                          >
                            <div>
                              <p className="font-medium">{lb.description || tpl("finance.cost.laborDesc", { id: labor.employeeId })}</p>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <span>{tpl("finance.cost.hoursLabel", { hours: labor.hours })}</span>
                                <span>• {tpl("finance.cost.hourlyRateLabel", { rate: formatCurrency(lb.hourlyRate || labor.rate) })}</span>
                                {lb.phaseCode && (
                                  <Badge variant="outline" className="text-xs">{lb.phaseCode}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(Number(lb.totalCost || labor.total))}</p>
                              <Badge variant="outline" className={
                                lb.status === "approved" ? "bg-green-500/20 text-green-400" :
                                lb.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                "bg-yellow-500/20 text-yellow-400"
                              }>
                                {lb.status === "approved" ? t("finance.cost.statusApproved") :
                                 lb.status === "rejected" ? t("finance.cost.statusRejected") : t("finance.cost.statusPending")}
                              </Badge>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("finance.cost.noLaborRecords")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== Tab 2: 成本分析 ========== */}
              <TabsContent value="cost-analysis" className="space-y-4">
                {/* Budget Utilization Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("finance.cost.budgetUsageTitle")}</CardTitle>
                    <CardDescription>
                      {tpl("finance.cost.budgetUsagePercent", { percent: costSummary?.summary.totalBudget ? Math.round((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100) : 0 })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress
                      value={costSummary?.summary.totalBudget ? Math.round((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100) : 0}
                      className="h-3"
                    />
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                      <span>{tpl("finance.cost.usedLabel", { amount: formatCurrency(costSummary?.summary.totalSpent || 0) })}</span>
                      <span>{tpl("finance.cost.remainingLabel", { amount: formatCurrency((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) })}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {t("finance.cost.alertRulesTitle")}
                      </CardTitle>
                      <CardDescription>
                        {t("finance.cost.alertRulesDesc")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateLibraryDialog(true)}
                      className="gap-2"
                    >
                      <Library className="w-4 h-4" />
                      {t("finance.cost.templateLibBtn")}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Default Alert Rules */}
                      <div className="space-y-3">
                        {/* Rule 1: 80% Budget Warning */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-yellow-500/20">
                              <Bell className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-medium">{t("finance.cost.rule80Title")}</p>
                              <p className="text-sm text-muted-foreground">{t("finance.cost.rule80Desc")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">{t("finance.cost.warningBadge")}</Badge>
                            <Switch defaultChecked />
                          </div>
                        </div>

                        {/* Rule 2: 95% Budget Warning */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-orange-500/20">
                              <AlertTriangle className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-medium">{t("finance.cost.rule95Title")}</p>
                              <p className="text-sm text-muted-foreground">{t("finance.cost.rule95Desc")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-orange-500/20 text-orange-400">{t("finance.cost.criticalBadge")}</Badge>
                            <Switch defaultChecked />
                          </div>
                        </div>

                        {/* Rule 3: 100% Budget Alert */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-red-500/20">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                              <p className="font-medium">{t("finance.cost.rule100Title")}</p>
                              <p className="text-sm text-muted-foreground">{t("finance.cost.rule100Desc")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-red-500/20 text-red-400">{t("finance.cost.emergencyBadge")}</Badge>
                            <Switch defaultChecked />
                          </div>
                        </div>

                        {/* Rule 4: CPI < 0.9 Warning */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-purple-500/20">
                              <TrendingDown className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                              <p className="font-medium">{t("finance.cost.ruleCpi09Title")}</p>
                              <p className="text-sm text-muted-foreground">{t("finance.cost.ruleCpi09Desc")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-purple-500/20 text-purple-400">{t("finance.cost.warningBadge")}</Badge>
                            <Switch defaultChecked />
                          </div>
                        </div>

                        {/* Rule 5: CPI < 0.8 Critical */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-red-500/20">
                              <TrendingDown className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                              <p className="font-medium">{t("finance.cost.ruleCpi08Title")}</p>
                              <p className="text-sm text-muted-foreground">{t("finance.cost.ruleCpi08Desc")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-red-500/20 text-red-400">{t("finance.cost.criticalBadge")}</Badge>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      {/* Alert Settings */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          {t("finance.cost.notificationSettings")}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{t("finance.cost.emailNotification")}</span>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{t("finance.cost.systemNotification")}</span>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      {/* Alert History */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {t("finance.cost.alertHistory")}
                        </h4>
                        {alertLogsLoading ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : alertLogs && alertLogs.length > 0 ? (
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {alertLogs.map((log: any) => (
                              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-full ${
                                    log.severity === 'critical' ? 'bg-red-500/20' :
                                    log.severity === 'warning' ? 'bg-yellow-500/20' :
                                    'bg-orange-500/20'
                                  }`}>
                                    <AlertTriangle className={`w-4 h-4 ${
                                      log.severity === 'critical' ? 'text-red-500' :
                                      log.severity === 'warning' ? 'text-yellow-500' :
                                      'text-orange-500'
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{log.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(log.triggeredAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${
                                    log.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                    log.status === 'acknowledged' ? 'bg-blue-500/20 text-blue-400' :
                                    log.status === 'ignored' ? 'bg-gray-500/20 text-gray-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {log.status === 'resolved' ? t("finance.cost.statusResolved") :
                                     log.status === 'acknowledged' ? t("finance.cost.statusAcknowledged") :
                                     log.status === 'ignored' ? t("finance.cost.statusIgnored") : t("finance.cost.statusPendingAlert")}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>{t("finance.cost.noAlertLogs")}</p>
                            <p className="text-xs mt-1">{t("finance.cost.alertLogsHint")}</p>
                          </div>
                        )}
                      </div>

                      {/* Batch Import/Export */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          {t("finance.cost.batchImportExport")}
                        </h4>
                        <div className="flex gap-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                {t("finance.cost.batchImportRules")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{t("finance.cost.batchImportTitle")}</DialogTitle>
                                <DialogDescription>
                                  {t("finance.cost.batchImportDesc")}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 rounded-lg border bg-muted/50">
                                  <p className="text-sm font-medium mb-2">{t("finance.cost.csvFormatDesc")}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t("finance.cost.csvRequiredCols")}<br/>
                                    {t("finance.cost.csvOptionalCols")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const content = await file.text();
                                        // Parse and import
                                        try {
                                          const importResult = await batchImportMutation.mutateAsync({ rules: [{ csvContent: content }] });
                                          if (importResult.success) {
                                            toast.success(tpl("finance.cost.importCompleted", { msg: importResult.message }));
                                          } else {
                                            toast.error(importResult.message || t("finance.cost.importFailed"));
                                          }
                                        } catch (error) {
                                          toast.error(t("finance.cost.importFormatError"));
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <a 
                                    href="/templates/cost-alert-rules-template.csv" 
                                    download="cost_alert_rules_template.csv"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    {t("finance.cost.downloadCsvTemplate")}
                                  </a>
                                  <span className="text-muted-foreground/50">|</span>
                                  <a 
                                    href="#" 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      // Generate Excel template with more examples
                                      const template = `项目ID,规则名称,规则类型,阈值,预警级别,是否启用,备注
1,材料成本超支预警,budget_exceed,80,warning,是,当材料成本超过预算80%时触发预警
1,人工成本超支预警,budget_exceed,90,critical,是,当人工成本超过预算90%时触发严重预警
2,设备成本超支预警,budget_exceed,85,warning,是,当设备成本超过预算85%时触发预警
2,总成本超支预警,budget_exceed,95,critical,是,当总成本超过预算95%时触发严重预警
3,成本增长预警,cost_increase,15,warning,是,当月度成本增长超过15%时触发预警
3,里程碑延迟预警,milestone_delay,7,warning,是,当里程碑延迟超过7天时触发预警`;
                                      const BOM = '\uFEFF';
                                      const blob = new Blob([BOM + template], { type: "text/csv;charset=utf-8;" });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = "cost_alert_rules_template_with_examples.csv";
                                      a.click();
                                      toast.success(t("finance.cost.templateDownloaded"));
                                    }}
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    {t("finance.cost.downloadWithExamples")}
                                  </a>
                                  <span className="text-muted-foreground/50">|</span>
                                  <a 
                                    href="/docs/cost-alert-rules-template-guide.md" 
                                    target="_blank"
                                    className="text-primary hover:underline"
                                  >
                                    {t("finance.cost.viewImportGuide")}
                                  </a>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              try {
                                const result = await exportCSVMutation.mutateAsync();
                                if (result.url) {
                                  const a = document.createElement("a");
                                  a.href = result.url;
                                  a.download = `cost_alert_rules_${new Date().toISOString().split("T")[0]}.csv`;
                                  a.click();
                                  toast.success(t("finance.cost.exportOk"));
                                }
                              } catch (error) {
                                toast.error(t("finance.cost.exportFail"));
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {t("finance.cost.exportRules")}
                          </Button>
                        </div>
                      </div>

                      {/* Version Management */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <History className="w-4 h-4" />
                          {t("finance.cost.versionMgmt")}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t("finance.cost.versionMgmtDesc")}
                        </p>
                        
                        {/* Batch Operations Toolbar */}
                        <div className="flex items-center justify-between mb-4 p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {tpl("finance.cost.selectedCount", { count: selectedRulesForBatch.length })}
                            </span>
                            <Button variant="ghost" size="sm" onClick={selectAllRules}>
                              {t("finance.cost.selectAllBtn")}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearRuleSelection}>
                              {t("finance.cost.clearBtn")}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowBatchVersionDialog(true)}
                              disabled={selectedRulesForBatch.length === 0}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              {t("finance.cost.batchRollbackBtn")}
                            </Button>
                            <Select
                              value={batchExportFormat}
                              onValueChange={(v) => setBatchExportFormat(v as "json" | "csv")}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="csv">CSV</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleBatchExport}
                              disabled={selectedRulesForBatch.length === 0}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              {t("finance.cost.exportSelected")}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Rule List with Version History Button */}
                        <div className="space-y-2">
                          {alertRules && alertRules.length > 0 ? (
                            alertRules.map((rule: any) => (
                              <div 
                                key={rule.id} 
                                className={`flex items-center justify-between p-3 rounded-lg border bg-card cursor-pointer transition-colors ${
                                  selectedRulesForBatch.includes(rule.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                                }`}
                                onClick={() => toggleRuleSelection(rule.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedRulesForBatch.includes(rule.id)}
                                    onChange={() => toggleRuleSelection(rule.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-border"
                                  />
                                  <div className={`p-1.5 rounded-full ${
                                    rule.alertLevel === 'emergency' ? 'bg-red-500/20' :
                                    rule.alertLevel === 'critical' ? 'bg-orange-500/20' :
                                    'bg-yellow-500/20'
                                  }`}>
                                    <AlertTriangle className={`w-4 h-4 ${
                                      rule.alertLevel === 'emergency' ? 'text-red-500' :
                                      rule.alertLevel === 'critical' ? 'text-orange-500' :
                                      'text-yellow-500'
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{rule.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {rule.alertType === 'budget_percent' ? t("finance.cost.alertTypeBudgetPercent") :
                                       rule.alertType === 'absolute_amount' ? t("finance.cost.alertTypeAbsoluteAmount") : t("finance.cost.alertTypeCpi")}
                                      : {rule.threshold}{rule.alertType === 'budget_percent' ? '%' : ''}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRuleForVersion(rule.id);
                                    setShowVersionHistoryDialog(true);
                                    setCompareVersions(null);
                                  }}
                                >
                                  <History className="w-4 h-4 mr-1" />
                                  {t("finance.cost.versionHistoryBtn")}
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <History className="w-6 h-6 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">{t("finance.cost.noAlertRules")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Version History Dialog */}
                <Dialog open={showVersionHistoryDialog} onOpenChange={setShowVersionHistoryDialog}>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        {t("finance.cost.versionHistoryTitle")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("finance.cost.versionHistoryDesc")}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {versionsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : ruleVersions && ruleVersions.length > 0 ? (
                        <>
                          {/* Version List */}
                          <div className="space-y-2">
                            {ruleVersions.map((version: any, index: number) => {
                              const ruleData = JSON.parse(version.ruleData);
                              const isLatest = index === 0;
                              return (
                                <div
                                  key={version.id}
                                  className={`p-4 rounded-lg border ${
                                    isLatest ? 'border-primary bg-primary/5' : 'bg-card'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{tpl("finance.cost.versionLabel", { num: version.versionNumber })}</span>
                                        {isLatest && (
                                          <Badge variant="outline" className="bg-primary/20 text-primary text-xs">
                                            {t("finance.cost.currentVersion")}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {new Date(version.changedAt).toLocaleString()}
                                        {version.changeSummary && ` - ${version.changeSummary}`}
                                      </p>
                                      <div className="text-sm space-y-1">
                                        <p><span className="text-muted-foreground">{t("finance.cost.ruleNameLabel")}</span> {ruleData.name}</p>
                                        <p><span className="text-muted-foreground">{t("finance.cost.thresholdLabel")}</span> {ruleData.threshold}{ruleData.alertType === 'budget_percent' ? '%' : ''}</p>
                                        <p><span className="text-muted-foreground">{t("finance.cost.alertLevelLabel")}</span> {
                                          ruleData.alertLevel === 'emergency' ? t("finance.cost.levelEmergency") :
                                          ruleData.alertLevel === 'critical' ? t("finance.cost.levelCritical") : t("finance.cost.levelWarning")
                                        }</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!isLatest && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm(tpl("finance.cost.confirmRollback", { version: version.versionNumber }))) {
                                              rollbackMutation.mutate({
                                                ruleId: selectedRuleForVersion!,
                                                versionNumber: version.versionNumber
                                              });
                                            }
                                          }}
                                          disabled={rollbackMutation.isPending}
                                        >
                                          <RotateCcw className="w-4 h-4 mr-1" />
                                          {t("finance.cost.rollbackBtn")}
                                        </Button>
                                      )}
                                      {ruleVersions.length > 1 && index < ruleVersions.length - 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setCompareVersions({
                                              v1: ruleVersions[index + 1].versionNumber,
                                              v2: version.versionNumber
                                            });
                                          }}
                                        >
                                          <GitCompare className="w-4 h-4 mr-1" />
                                          {t("finance.cost.comparePrev")}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Version Comparison */}
                          {compareVersions && versionComparison && (
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <GitCompare className="w-4 h-4" />
                                {tpl("finance.cost.versionCompare", { v1: compareVersions.v1, v2: compareVersions.v2 })}
                              </h4>
                              {(versionComparison.comparison as any[])?.length > 0 ? (
                                <div className="space-y-2">
                                  {(versionComparison.comparison as any[]).map((diff: any, i: number) => (
                                    <div key={i} className="p-3 rounded-lg border bg-muted/50">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className={`text-xs ${
                                          diff.changeType === 'added' ? 'bg-green-500/20 text-green-400' :
                                          diff.changeType === 'removed' ? 'bg-red-500/20 text-red-400' :
                                          'bg-blue-500/20 text-blue-400'
                                        }`}>
                                          {diff.changeType === 'added' ? t("finance.cost.changeAdded") :
                                           diff.changeType === 'removed' ? t("finance.cost.changeRemoved") : t("finance.cost.changeModified")}
                                        </Badge>
                                        <span className="font-medium text-sm">{diff.fieldLabel}</span>
                                      </div>
                                      <div className="text-sm">
                                        {diff.changeType !== 'added' && (
                                          <p className="text-red-400 line-through">
                                            {tpl("finance.cost.oldValue", { val: JSON.stringify(diff.oldValue) })}
                                          </p>
                                        )}
                                        {diff.changeType !== 'removed' && (
                                          <p className="text-green-400">
                                            {tpl("finance.cost.newValue", { val: JSON.stringify(diff.newValue) })}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  {t("finance.cost.noDifference")}
                                </p>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => setCompareVersions(null)}
                              >
                                {t("finance.cost.closeCompare")}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>{t("finance.cost.noVersionHistory")}</p>
                          <p className="text-xs mt-1">{t("finance.cost.versionAutoSaveHint")}</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Batch Rollback Dialog */}
                <Dialog open={showBatchVersionDialog} onOpenChange={setShowBatchVersionDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" />
                        {t("finance.cost.batchRollbackTitle")}
                      </DialogTitle>
                      <DialogDescription>
                        {tpl("finance.cost.batchRollbackDesc", { count: selectedRulesForBatch.length })}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="text-sm font-medium mb-2">{t("finance.cost.selectedRulesLabel")}</h4>
                        <div className="flex flex-wrap gap-1">
                          {alertRules?.filter(r => selectedRulesForBatch.includes(r.id)).map(r => (
                            <Badge key={r.id} variant="outline" className="text-xs">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t("finance.cost.rollbackToDate")}</Label>
                        <Input
                          type="datetime-local"
                          value={batchRollbackDate}
                          onChange={(e) => setBatchRollbackDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("finance.cost.rollbackToDateHint")}
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowBatchVersionDialog(false)}
                        >
                          {t("finance.cost.cancelBtn")}
                        </Button>
                        <Button
                          onClick={handleBatchRollback}
                          disabled={!batchRollbackDate || rollbackMutation.isPending}
                        >
                          {rollbackMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              {t("finance.cost.rollingBack")}
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              {t("finance.cost.confirmRollbackBtn")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Template Library Dialog */}
                <Dialog open={showTemplateLibraryDialog} onOpenChange={setShowTemplateLibraryDialog}>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Library className="w-5 h-5" />
                        {t("finance.cost.templateLibTitle")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("finance.cost.templateLibDesc")}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Category Filter */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {(["all", "budget", "performance", "cost", "risk"] as const).map((cat) => (
                            <Button
                              key={cat}
                              variant={selectedTemplateCategory === cat ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTemplateCategory(cat)}
                            >
                              {cat === "all" ? t("finance.cost.catAll") :
                               cat === "budget" ? t("finance.cost.catBudget") :
                               cat === "performance" ? t("finance.cost.catPerformance") :
                               cat === "cost" ? t("finance.cost.catCost") : t("finance.cost.catRisk")}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => initBuiltinTemplatesMutation.mutate()}
                          disabled={initBuiltinTemplatesMutation.isPending}
                        >
                          {initBuiltinTemplatesMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-1" />
                          )}
                          {t("finance.cost.initBuiltinTemplates")}
                        </Button>
                      </div>
                      
                      {/* Template List */}
                      <div className="space-y-3">
                        {templatesLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : templates && templates.length > 0 ? (
                          templates.map((template) => {
                            let config: any = {};
                            try {
                              config = JSON.parse(template.ruleConfig);
                            } catch {}
                            
                            return (
                              <div
                                key={template.id}
                                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-full ${
                                    template.category === "budget" ? "bg-blue-500/20" :
                                    template.category === "performance" ? "bg-green-500/20" :
                                    template.category === "cost" ? "bg-yellow-500/20" : "bg-red-500/20"
                                  }`}>
                                    {template.category === "budget" ? <DollarSign className="w-5 h-5 text-blue-500" /> :
                                     template.category === "performance" ? <TrendingUp className="w-5 h-5 text-green-500" /> :
                                     template.category === "cost" ? <Calculator className="w-5 h-5 text-yellow-500" /> :
                                     <AlertTriangle className="w-5 h-5 text-red-500" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{template.name}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {template.templateType === "builtin" ? t("finance.cost.templateBuiltin") : t("finance.cost.templateCustom")}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {config.alertType === "budget_percent" ? t("finance.cost.alertTypeBudgetPercentLabel") :
                                         config.alertType === "cpi" ? t("finance.cost.alertTypeCpiLabel") : t("finance.cost.alertTypeAbsoluteLabel")}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {tpl("finance.cost.thresholdValueLabel", { val: config.alertType === "cpi" ? (config.threshold / 100).toFixed(2) : config.threshold })}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {tpl("finance.cost.usedCount", { count: template.usageCount })}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => createRuleFromTemplateMutation.mutate({ templateId: template.id })}
                                  disabled={createRuleFromTemplateMutation.isPending}
                                >
                                  {createRuleFromTemplateMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Copy className="w-4 h-4 mr-1" />
                                  )}
                                  {t("finance.cost.useTemplate")}
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>{t("finance.cost.noTemplates")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Save As Template Dialog */}
                <Dialog open={showSaveAsTemplateDialog} onOpenChange={setShowSaveAsTemplateDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        {t("finance.cost.saveAsTemplateTitle")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("finance.cost.saveAsTemplateDesc")}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("finance.cost.templateNameLabel")}</Label>
                        <Input
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder={t("finance.cost.templateNamePlaceholder")}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t("finance.cost.templateCategoryLabel")}</Label>
                        <Select
                          value={newTemplateCategory}
                          onValueChange={(v) => setNewTemplateCategory(v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="budget">{t("finance.cost.catBudgetType")}</SelectItem>
                            <SelectItem value="performance">{t("finance.cost.catPerformanceType")}</SelectItem>
                            <SelectItem value="cost">{t("finance.cost.catCostType")}</SelectItem>
                            <SelectItem value="risk">{t("finance.cost.catRiskType")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t("finance.cost.templateDescLabel")}</Label>
                        <Textarea
                          value={newTemplateDescription}
                          onChange={(e) => setNewTemplateDescription(e.target.value)}
                          placeholder={t("finance.cost.templateDescPlaceholder")}
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowSaveAsTemplateDialog(false);
                            setRuleToSaveAsTemplate(null);
                            setNewTemplateName("");
                            setNewTemplateDescription("");
                          }}
                        >
                          {t("finance.cost.cancelBtn")}
                        </Button>
                        <Button
                          onClick={() => {
                            if (ruleToSaveAsTemplate && newTemplateName) {
                              saveAsTemplateMutation.mutate({
                                ruleId: ruleToSaveAsTemplate,
                                templateName: newTemplateName,
                                category: newTemplateCategory,
                                description: newTemplateDescription || undefined,
                              });
                            }
                          }}
                          disabled={!newTemplateName || saveAsTemplateMutation.isPending}
                        >
                          {saveAsTemplateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          {t("finance.cost.saveTemplateBtn")}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {/* Notebook */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("finance.cost.costNotebookTitle")}</CardTitle>
                    <CardDescription>
                      {t("finance.cost.costNotebookDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedProjectId && (
                      <ProcessNotebook
                        processType="cost_budget"
                        processId={selectedProjectId.toString()}
                        processStep={t("finance.cost.costNotebookStep")}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== Tab 3: 成本预算 ========== */}
              <TabsContent value="cost-budget" className="space-y-4">
                <div className="flex items-center justify-end">
                  <Dialog open={showAddBudgetDialog} onOpenChange={setShowAddBudgetDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        {t("finance.cost.addBudgetBtn")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("finance.cost.addBudgetTitle")}</DialogTitle>
                        <DialogDescription>{t("finance.cost.setBudgetDesc")}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t("finance.cost.categoryLabel")} *</Label>
                          <Select
                            value={budgetForm.categoryId.toString()}
                            onValueChange={(value) => setBudgetForm({ ...budgetForm, categoryId: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("finance.cost.selectCategory")} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("finance.cost.budgetYearLabel")} *</Label>
                            <Input
                              type="number"
                              value={budgetForm.budgetYear}
                              onChange={(e) => setBudgetForm({ ...budgetForm, budgetYear: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("finance.cost.budgetMonthLabel")}</Label>
                            <Select
                              value={budgetForm.budgetMonth?.toString() || ""}
                              onValueChange={(value) => setBudgetForm({ ...budgetForm, budgetMonth: value ? parseInt(value) : undefined })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("finance.cost.annualBudget")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">{t("finance.cost.annualBudget")}</SelectItem>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                  <SelectItem key={month} value={month.toString()}>{tpl("finance.cost.monthLabel", { month })}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("finance.cost.budgetAmountYuan")} *</Label>
                          <Input
                            type="number"
                            value={budgetForm.budgetAmount}
                            onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("finance.cost.remarkLabel")}</Label>
                          <Textarea
                            value={budgetForm.remark}
                            onChange={(e) => setBudgetForm({ ...budgetForm, remark: e.target.value })}
                            placeholder={t("finance.cost.remarkPlaceholder")}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddBudgetDialog(false)}>
                          {t("finance.cost.cancelBtn")}
                        </Button>
                        <Button onClick={handleCreateBudget} disabled={createBudgetMutation.isPending}>
                          {createBudgetMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          {t("finance.cost.createBtn")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Budget List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      {t("finance.cost.budgetListTitle")}
                    </CardTitle>
                    <CardDescription>
                      {tpl("finance.cost.totalBudgets", { count: budgets?.length || 0 })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {budgets && budgets.length > 0 ? (
                      <div className="space-y-3">
                        {budgets.map((budget, idx) => {
                          const bgt = budget as any;
                          const budgetAmount = bgt.budgetAmount || budget.budget || 0;
                          const usedAmount = bgt.usedAmount || budget.spent || 0;
                          const utilization = budgetAmount > 0
                            ? Math.round((Number(usedAmount) / Number(budgetAmount)) * 100)
                            : 0;
                          return (
                            <div
                              key={bgt.id || idx}
                              className="p-4 rounded-lg border bg-card"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-medium">{budget.projectName || t("finance.cost.uncategorized")}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {bgt.budgetYear ? tpl("finance.cost.yearSuffix", { year: bgt.budgetYear }) : ""} {bgt.budgetMonth ? tpl("finance.cost.monthSuffix", { month: bgt.budgetMonth }) : t("finance.cost.annualBudget")}
                                  </p>
                                </div>
                                <Badge variant="outline" className={
                                  bgt.status === "approved" ? "bg-green-500/20 text-green-400" :
                                  bgt.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                  bgt.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-muted text-muted-foreground"
                                }>
                                  {bgt.status === "approved" ? t("finance.cost.statusApproved2") :
                                   bgt.status === "rejected" ? t("finance.cost.statusRejected2") :
                                   bgt.status === "pending" ? t("finance.cost.statusPendingApproval") : t("finance.cost.statusDraft")}
                                </Badge>
                              </div>
                              <Progress value={utilization} className="h-2 mb-2" />
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {tpl("finance.cost.usedBudget", { amount: formatCurrency(Number(usedAmount)), percent: utilization })}
                                </span>
                                <span className="font-medium">
                                  {tpl("finance.cost.budgetTotal", { amount: formatCurrency(Number(budgetAmount)) })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("finance.cost.noBudgetData")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      </>
  );
}
