import Layout from "@/components/Layout";
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
  const { t } = useLanguage();
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
      toast.success("成本记录已创建");
      setShowAddRecordDialog(false);
      utils.cost.getRecords.invalidate();
      utils.cost.getSummary.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });

  const initCategoriesMutation = trpc.cost.initCategories.useMutation({
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(result.message);
        utils.cost.getCategories.invalidate();
      } else {
        toast.error(result?.message || "初始化失败");
      }
    },
    onError: (error) => {
      toast.error("初始化失败: " + error.message);
    },
  });

  const createBudgetMutation = trpc.cost.createBudget.useMutation({
    onSuccess: () => {
      toast.success("预算已创建");
      setShowAddBudgetDialog(false);
      utils.cost.getBudgets.invalidate();
      utils.cost.getSummary.invalidate();
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
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
      toast.success("规则已回滚到选定版本");
      utils.costAlert.getActiveRules.invalidate();
      utils.ruleVersion.getAll.invalidate();
    },
    onError: (error) => {
      toast.error("回滚失败: " + error.message);
    },
  });
  
  // Template library queries and mutations
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.ruleTemplate.getAll.useQuery(
    undefined,
    { enabled: showTemplateLibraryDialog }
  );
  
  const initBuiltinTemplatesMutation = trpc.ruleTemplate.initBuiltin.useMutation({
    onSuccess: (result) => {
      toast.success(`初始化完成: ${result.message}`);
      refetchTemplates();
    },
    onError: (error) => {
      toast.error("初始化失败: " + error.message);
    },
  });
  
  const createRuleFromTemplateMutation = trpc.ruleTemplate.createRule.useMutation({
    onSuccess: () => {
      toast.success("已从模板创建规则");
      utils.costAlert.getActiveRules.invalidate();
      setShowTemplateLibraryDialog(false);
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });
  
  const saveAsTemplateMutation = trpc.ruleTemplate.saveAsTemplate.useMutation({
    onSuccess: () => {
      toast.success("规则已保存为模板");
      setShowSaveAsTemplateDialog(false);
      setRuleToSaveAsTemplate(null);
      setNewTemplateName("");
      setNewTemplateDescription("");
    },
    onError: (error) => {
      toast.error("保存失败: " + error.message);
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
      toast.error("请先选择要导出的规则");
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
      toast.success(`已导出 ${selectedRulesData.length} 条规则`);
    } else {
      const headers = ["名称", "描述", "适用范围", "预警类型", "阈值", "预警级别", "启用状态"];
      const rows = selectedRulesData.map(r => [
        r.name,
        r.description || "",
        r.scope,
        r.alertType,
        r.threshold,
        r.alertLevel,
        r.isActive ? "是" : "否",
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alert-rules-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${selectedRulesData.length} 条规则`);
    }
  };
  
  const handleBatchRollback = async () => {
    if (selectedRulesForBatch.length === 0 || !batchRollbackDate) {
      toast.error("请选择规则和回滚日期");
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
      toast.success(`成功回滚 ${successCount} 条规则`);
    }
    if (failCount > 0) {
      toast.warning(`${failCount} 条规则回滚失败（无匹配版本）`);
    }
    
    setShowBatchVersionDialog(false);
    setSelectedRulesForBatch([]);
    setBatchRollbackDate("");
  };

  // Export functions
  const handleExportPDF = () => {
    if (!selectedProjectId || !costSummary) {
      toast.error("请先选择项目");
      return;
    }
    
    // Generate PDF content
    const selectedProject = projects?.find(p => p.id === selectedProjectId);
    const content = `
成本报表 - ${selectedProject?.name || '未知项目'}
生成时间: ${new Date().toLocaleString('zh-CN')}

成本概览
---------
总预算: ${formatCurrency(costSummary.summary.totalBudget || 0)}
实际成本: ${formatCurrency(costSummary.summary.totalSpent || 0)}
预算使用率: ${costSummary.summary.totalBudget ? ((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100).toFixed(1) : 0}%
CPI: ${costSummary.summary.totalSpent > 0 ? (costSummary.summary.totalBudget / costSummary.summary.totalSpent).toFixed(2) : 'N/A'}

成本明细
---------
${costRecords?.map(r => `${(r as any).costCode || r.categoryId} - ${r.description}: ${formatCurrency((r as any).amount || r.actualAmount)}`).join('\n') || '无记录'}
    `.trim();
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `成本报表_${selectedProject?.name || 'project'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("报表已导出");
  };

  const handleExportExcel = () => {
    if (!selectedProjectId || !costSummary) {
      toast.error("请先选择项目");
      return;
    }
    
    const selectedProject = projects?.find(p => p.id === selectedProjectId);
    
    // Generate CSV content (Excel compatible)
    let csv = '\uFEFF'; // BOM for Excel UTF-8
    csv += '成本报表,\n';
    csv += `项目名称,${selectedProject?.name || ''}\n`;
    csv += `生成时间,${new Date().toLocaleString('zh-CN')}\n`;
    csv += '\n';
    csv += '成本概览,\n';
    csv += `总预算,${(costSummary.summary.totalBudget || 0) / 100}\n`;
    csv += `实际成本,${(costSummary.summary.totalSpent || 0) / 100}\n`;
    csv += `预算使用率,${costSummary.summary.totalBudget ? ((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100).toFixed(1) : 0}%\n`;
    csv += `CPI,${costSummary.summary.totalSpent > 0 ? (costSummary.summary.totalBudget / costSummary.summary.totalSpent).toFixed(2) : 'N/A'}\n`;
    csv += '\n';
    csv += '成本明细,\n';
    csv += '类别ID,描述,金额(元)\n';
    costRecords?.forEach(r => {
      csv += `${r.categoryId},${r.description},${r.actualAmount / 100}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `成本报表_${selectedProject?.name || 'project'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("报表已导出为Excel格式");
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
      toast.error("请填写必填字段");
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
      toast.error("请填写必填字段");
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
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(cents / 100);
  };

  return (
    <Layout>
      <FeatureGuide
        featureId="cost-management"
        title="成本管理"
        description="项目成本预算、实际成本跟踪和偏差分析"
        steps={[
          { title: "项目选择", description: "选择项目查看成本数据，支持多项目对比" },
          { title: "预算管理", description: "设置项目预算，按分类分配资金" },
          { title: "成本记录", description: "记录实际成本，支持多种成本类型" },
          { title: "偏差分析", description: "自动计算预算与实际偏差，生成分析报告" },
          { title: "告警规则", description: "设置成本超支告警，自动发送通知" },
          { title: "版本历史", description: "查看规则修改历史，支持版本对比和回滚" }
        ]}
      />
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Calculator}
          title={t("cost.title") || "成本管理"}
          description={t("cost.desc") || "项目成本预算、实际成本追踪与分析"}
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
                  初始化成本类别
                </Button>
              )}
              <Select
                value={selectedProjectId?.toString() || ""}
                onValueChange={(value) => setSelectedProjectId(parseInt(value))}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="选择项目" />
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
                    导出报表
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    导出Excel
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
              <h3 className="text-lg font-medium text-muted-foreground">请选择一个项目</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">选择项目后可查看和管理成本数据</p>
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
                  项目成本
                </TabsTrigger>
                <TabsTrigger value="cost-analysis" className="gap-1.5">
                  <PieChart className="w-4 h-4" />
                  成本分析
                </TabsTrigger>
                <TabsTrigger value="cost-budget" className="gap-1.5">
                  <Calculator className="w-4 h-4" />
                  成本预算
                </TabsTrigger>
              </TabsList>

              {/* ========== Tab 1: 项目成本 ========== */}
              <TabsContent value="project-cost" className="space-y-4">
                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard icon={Calculator} label="总预算" value={formatCurrency(costSummary?.summary.totalBudget || 0)} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
                  <StatCard icon={DollarSign} label="实际成本" value={formatCurrency(costSummary?.summary.totalSpent || 0)} iconColor="text-green-500" iconBg="bg-green-500/10" />
                  <StatCard
                    icon={((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) >= 0 ? TrendingDown : TrendingUp}
                    label="成本偏差"
                    value={formatCurrency(Math.abs((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)))}
                    iconColor={((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) >= 0 ? "text-emerald-500" : "text-red-500"}
                    iconBg={((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0)) >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
                  />
                  <StatCard icon={PieChart} label="CPI 成本绩效指数" value={costSummary?.summary.totalSpent ? (costSummary.summary.totalBudget / costSummary.summary.totalSpent).toFixed(2) : "1.00"} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
                </div>

                {/* Cost Records */}
                <div className="flex items-center justify-end">
                  <Dialog open={showAddRecordDialog} onOpenChange={setShowAddRecordDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        添加成本记录
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加成本记录</DialogTitle>
                        <DialogDescription>记录项目的实际支出</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>成本类别 *</Label>
                            <Select
                              value={recordForm.categoryId.toString()}
                              onValueChange={(value) => setRecordForm({ ...recordForm, categoryId: parseInt(value) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择类别" />
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
                            <Label>成本编号 *</Label>
                            <Input
                              value={recordForm.costCode}
                              onChange={(e) => setRecordForm({ ...recordForm, costCode: e.target.value })}
                              placeholder="如: COST-2026-001"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>描述 *</Label>
                          <Textarea
                            value={recordForm.description}
                            onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                            placeholder="成本描述..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>金额 (元) *</Label>
                            <Input
                              type="number"
                              value={recordForm.amount}
                              onChange={(e) => setRecordForm({ ...recordForm, amount: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>供应商</Label>
                            <Input
                              value={recordForm.vendor}
                              onChange={(e) => setRecordForm({ ...recordForm, vendor: e.target.value })}
                              placeholder="供应商名称"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>发票号</Label>
                            <Input
                              value={recordForm.invoiceNo}
                              onChange={(e) => setRecordForm({ ...recordForm, invoiceNo: e.target.value })}
                              placeholder="发票编号"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>所属阶段</Label>
                            <Select
                              value={recordForm.phaseCode}
                              onValueChange={(value) => setRecordForm({ ...recordForm, phaseCode: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择阶段" />
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
                          <Label>备注</Label>
                          <Textarea
                            value={recordForm.remark}
                            onChange={(e) => setRecordForm({ ...recordForm, remark: e.target.value })}
                            placeholder="备注信息..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddRecordDialog(false)}>
                          取消
                        </Button>
                        <Button onClick={handleCreateRecord} disabled={createRecordMutation.isPending}>
                          {createRecordMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          创建
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      成本记录列表
                    </CardTitle>
                    <CardDescription>
                      共 {costRecords?.length || 0} 条记录
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
                              <p className="font-bold text-lg">{formatCurrency(Number(rec.amount || record.actualAmount))}</p>
                              <Badge variant="outline" className={
                                rec.status === "approved" ? "bg-green-500/20 text-green-400" :
                                rec.status === "paid" ? "bg-blue-500/20 text-blue-400" :
                                rec.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                "bg-yellow-500/20 text-yellow-400"
                              }>
                                {rec.status === "approved" ? "已审核" :
                                 rec.status === "paid" ? "已支付" :
                                 rec.status === "rejected" ? "已驳回" : "待审核"}
                              </Badge>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无成本记录
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Labor Costs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      人工成本
                    </CardTitle>
                    <CardDescription>
                      共 {laborCosts?.length || 0} 条工时记录
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
                              <p className="font-medium">{lb.description || `工时记录 (${labor.employeeId})`}</p>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <span>{labor.hours} 小时</span>
                                <span>• 时薪: {formatCurrency(lb.hourlyRate || labor.rate)}</span>
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
                                {lb.status === "approved" ? "已审核" :
                                 lb.status === "rejected" ? "已驳回" : "待审核"}
                              </Badge>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无人工成本记录
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
                    <CardTitle className="text-lg">预算使用情况</CardTitle>
                    <CardDescription>
                      已使用 {costSummary?.summary.totalBudget ? Math.round((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100) : 0}% 的总预算
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress
                      value={costSummary?.summary.totalBudget ? Math.round((costSummary.summary.totalSpent / costSummary.summary.totalBudget) * 100) : 0}
                      className="h-3"
                    />
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                      <span>已使用: {formatCurrency(costSummary?.summary.totalSpent || 0)}</span>
                      <span>剩余: {formatCurrency((costSummary?.summary.totalBudget || 0) - (costSummary?.summary.totalSpent || 0))}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        成本预警规则
                      </CardTitle>
                      <CardDescription>
                        配置成本超支预警规则，当触发条件时自动发送通知
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateLibraryDialog(true)}
                      className="gap-2"
                    >
                      <Library className="w-4 h-4" />
                      模板库
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
                              <p className="font-medium">预算使用率 80% 警告</p>
                              <p className="text-sm text-muted-foreground">当项目成本达到预算的80%时发送警告</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">警告</Badge>
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
                              <p className="font-medium">预算使用率 95% 严重警告</p>
                              <p className="text-sm text-muted-foreground">当项目成本达到预算的95%时发送严重警告</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-orange-500/20 text-orange-400">严重</Badge>
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
                              <p className="font-medium">预算超支紧急警报</p>
                              <p className="text-sm text-muted-foreground">当项目成本超过预算时立即发送紧急警报</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-red-500/20 text-red-400">紧急</Badge>
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
                              <p className="font-medium">CPI 低于 0.9 警告</p>
                              <p className="text-sm text-muted-foreground">当成本绩效指数(CPI)低于0.9时发送警告</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-purple-500/20 text-purple-400">警告</Badge>
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
                              <p className="font-medium">CPI 低于 0.8 严重警告</p>
                              <p className="text-sm text-muted-foreground">当成本绩效指数(CPI)低于0.8时发送严重警告</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-red-500/20 text-red-400">严重</Badge>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      {/* Alert Settings */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          通知设置
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">邮件通知</span>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">系统通知</span>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      {/* Alert History */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          预警历史记录
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
                                      {new Date(log.triggeredAt).toLocaleString('zh-CN')}
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
                                    {log.status === 'resolved' ? '已解决' :
                                     log.status === 'acknowledged' ? '已确认' :
                                     log.status === 'ignored' ? '已忽略' : '待处理'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>暂无预警记录</p>
                            <p className="text-xs mt-1">当触发预警条件时，记录将显示在这里</p>
                          </div>
                        )}
                      </div>

                      {/* Batch Import/Export */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          批量导入/导出
                        </h4>
                        <div className="flex gap-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                批量导入规则
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>批量导入预警规则</DialogTitle>
                                <DialogDescription>
                                  上传CSV文件批量导入预警规则，支持中英文列名
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 rounded-lg border bg-muted/50">
                                  <p className="text-sm font-medium mb-2">CSV格式说明：</p>
                                  <p className="text-xs text-muted-foreground">
                                    必填列：规则名称, 预警类型(预算百分比/绝对金额/CPI指数), 阈值, 预警级别(警告/严重/紧急)<br/>
                                    可选列：描述, 适用范围(所有项目/指定项目/指定类别), 项目ID, 类别ID, 通知方式, 是否启用
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
                                            toast.success(`导入完成: ${importResult.message}`);
                                          } else {
                                            toast.error(importResult.message || "导入失败");
                                          }
                                        } catch (error) {
                                          toast.error("导入失败，请检查CSV格式");
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
                                    下载CSV模板
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
                                      toast.success("模板已下载，包含示例数据");
                                    }}
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    下载带示例的模板
                                  </a>
                                  <span className="text-muted-foreground/50">|</span>
                                  <a 
                                    href="/docs/cost-alert-rules-template-guide.md" 
                                    target="_blank"
                                    className="text-primary hover:underline"
                                  >
                                    查看导入说明
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
                                  toast.success("导出成功");
                                }
                              } catch (error) {
                                toast.error("导出失败");
                              }
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            导出规则
                          </Button>
                        </div>
                      </div>

                      {/* Version Management */}
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <History className="w-4 h-4" />
                          版本管理
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          查看规则的历史版本，支持版本对比和回滚操作
                        </p>
                        
                        {/* Batch Operations Toolbar */}
                        <div className="flex items-center justify-between mb-4 p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              已选择 {selectedRulesForBatch.length} 条规则
                            </span>
                            <Button variant="ghost" size="sm" onClick={selectAllRules}>
                              全选
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearRuleSelection}>
                              清除
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
                              批量回滚
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
                              导出选中
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
                                      {rule.alertType === 'budget_percent' ? '预算百分比' :
                                       rule.alertType === 'absolute_amount' ? '绝对金额' : 'CPI指数'}
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
                                  版本历史
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <History className="w-6 h-6 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">暂无预警规则</p>
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
                        规则版本历史
                      </DialogTitle>
                      <DialogDescription>
                        查看规则的所有历史版本，可以对比不同版本或回滚到指定版本
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
                                        <span className="font-medium">版本 {version.versionNumber}</span>
                                        {isLatest && (
                                          <Badge variant="outline" className="bg-primary/20 text-primary text-xs">
                                            当前版本
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {new Date(version.changedAt).toLocaleString('zh-CN')}
                                        {version.changeSummary && ` - ${version.changeSummary}`}
                                      </p>
                                      <div className="text-sm space-y-1">
                                        <p><span className="text-muted-foreground">规则名称:</span> {ruleData.name}</p>
                                        <p><span className="text-muted-foreground">阈值:</span> {ruleData.threshold}{ruleData.alertType === 'budget_percent' ? '%' : ''}</p>
                                        <p><span className="text-muted-foreground">预警级别:</span> {
                                          ruleData.alertLevel === 'emergency' ? '紧急' :
                                          ruleData.alertLevel === 'critical' ? '严重' : '警告'
                                        }</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!isLatest && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            if (confirm(`确定要回滚到版本 ${version.versionNumber} 吗？`)) {
                                              rollbackMutation.mutate({
                                                ruleId: selectedRuleForVersion!,
                                                versionNumber: version.versionNumber
                                              });
                                            }
                                          }}
                                          disabled={rollbackMutation.isPending}
                                        >
                                          <RotateCcw className="w-4 h-4 mr-1" />
                                          回滚
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
                                          对比上一版本
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
                                版本对比: v{compareVersions.v1} → v{compareVersions.v2}
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
                                          {diff.changeType === 'added' ? '新增' :
                                           diff.changeType === 'removed' ? '删除' : '修改'}
                                        </Badge>
                                        <span className="font-medium text-sm">{diff.fieldLabel}</span>
                                      </div>
                                      <div className="text-sm">
                                        {diff.changeType !== 'added' && (
                                          <p className="text-red-400 line-through">
                                            旧值: {JSON.stringify(diff.oldValue)}
                                          </p>
                                        )}
                                        {diff.changeType !== 'removed' && (
                                          <p className="text-green-400">
                                            新值: {JSON.stringify(diff.newValue)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  两个版本之间没有差异
                                </p>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => setCompareVersions(null)}
                              >
                                关闭对比
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>暂无版本历史</p>
                          <p className="text-xs mt-1">规则修改后会自动保存版本</p>
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
                        批量回滚规则
                      </DialogTitle>
                      <DialogDescription>
                        将选中的 {selectedRulesForBatch.length} 条规则回滚到指定日期之前的版本
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="text-sm font-medium mb-2">已选择的规则：</h4>
                        <div className="flex flex-wrap gap-1">
                          {alertRules?.filter(r => selectedRulesForBatch.includes(r.id)).map(r => (
                            <Badge key={r.id} variant="outline" className="text-xs">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>回滚到日期</Label>
                        <Input
                          type="datetime-local"
                          value={batchRollbackDate}
                          onChange={(e) => setBatchRollbackDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          将回滚到此日期之前的最新版本
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowBatchVersionDialog(false)}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleBatchRollback}
                          disabled={!batchRollbackDate || rollbackMutation.isPending}
                        >
                          {rollbackMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              回滚中...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              确认回滚
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
                        预警规则模板库
                      </DialogTitle>
                      <DialogDescription>
                        从预置模板快速创建预警规则，或保存自定义模板
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
                              {cat === "all" ? "全部" : 
                               cat === "budget" ? "预算" : 
                               cat === "performance" ? "绩效" : 
                               cat === "cost" ? "成本" : "风险"}
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
                          初始化内置模板
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
                                        {template.templateType === "builtin" ? "内置" : "自定义"}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {config.alertType === "budget_percent" ? "预算百分比" :
                                         config.alertType === "cpi" ? "CPI指数" : "绝对金额"}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        阈值: {config.alertType === "cpi" ? (config.threshold / 100).toFixed(2) : config.threshold}%
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        已使用 {template.usageCount} 次
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
                                  使用模板
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>暂无模板，点击"初始化内置模板"创建预置模板</p>
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
                        保存为模板
                      </DialogTitle>
                      <DialogDescription>
                        将当前规则保存为自定义模板，方便后续复用
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>模板名称</Label>
                        <Input
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="输入模板名称"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>模板分类</Label>
                        <Select
                          value={newTemplateCategory}
                          onValueChange={(v) => setNewTemplateCategory(v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="budget">预算类</SelectItem>
                            <SelectItem value="performance">绩效类</SelectItem>
                            <SelectItem value="cost">成本类</SelectItem>
                            <SelectItem value="risk">风险类</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>模板描述</Label>
                        <Textarea
                          value={newTemplateDescription}
                          onChange={(e) => setNewTemplateDescription(e.target.value)}
                          placeholder="输入模板描述（可选）"
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
                          取消
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
                          保存模板
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {/* Notebook */}
                <Card>
                  <CardHeader>
                    <CardTitle>成本管理笔记</CardTitle>
                    <CardDescription>
                      记录成本相关的注意事项、沟通记录和AI建议
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedProjectId && (
                      <ProcessNotebook
                        processType="cost_budget"
                        processId={selectedProjectId.toString()}
                        processStep="成本管理"
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
                        添加预算
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加预算</DialogTitle>
                        <DialogDescription>设置项目预算</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>成本类别 *</Label>
                          <Select
                            value={budgetForm.categoryId.toString()}
                            onValueChange={(value) => setBudgetForm({ ...budgetForm, categoryId: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择类别" />
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
                            <Label>预算年度 *</Label>
                            <Input
                              type="number"
                              value={budgetForm.budgetYear}
                              onChange={(e) => setBudgetForm({ ...budgetForm, budgetYear: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>预算月份</Label>
                            <Select
                              value={budgetForm.budgetMonth?.toString() || ""}
                              onValueChange={(value) => setBudgetForm({ ...budgetForm, budgetMonth: value ? parseInt(value) : undefined })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="年度预算" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">年度预算</SelectItem>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                  <SelectItem key={month} value={month.toString()}>{month}月</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>预算金额 (元) *</Label>
                          <Input
                            type="number"
                            value={budgetForm.budgetAmount}
                            onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>备注</Label>
                          <Textarea
                            value={budgetForm.remark}
                            onChange={(e) => setBudgetForm({ ...budgetForm, remark: e.target.value })}
                            placeholder="备注信息..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddBudgetDialog(false)}>
                          取消
                        </Button>
                        <Button onClick={handleCreateBudget} disabled={createBudgetMutation.isPending}>
                          {createBudgetMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                          创建
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
                      预算列表
                    </CardTitle>
                    <CardDescription>
                      共 {budgets?.length || 0} 项预算
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
                                  <p className="font-medium">{budget.projectName || "未分类"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {bgt.budgetYear ? `${bgt.budgetYear}年` : ""} {bgt.budgetMonth ? `${bgt.budgetMonth}月` : "年度预算"}
                                  </p>
                                </div>
                                <Badge variant="outline" className={
                                  bgt.status === "approved" ? "bg-green-500/20 text-green-400" :
                                  bgt.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                  bgt.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-muted text-muted-foreground"
                                }>
                                  {bgt.status === "approved" ? "已批准" :
                                   bgt.status === "rejected" ? "已驳回" :
                                   bgt.status === "pending" ? "待审批" : "草稿"}
                                </Badge>
                              </div>
                              <Progress value={utilization} className="h-2 mb-2" />
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  已使用: {formatCurrency(Number(usedAmount))} ({utilization}%)
                                </span>
                                <span className="font-medium">
                                  预算: {formatCurrency(Number(budgetAmount))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无预算数据
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}
