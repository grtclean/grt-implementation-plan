import { PageHeader } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GitBranch,
  Layers,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Workflow,
  AlertTriangle,
  TrendingUp,
  ArrowRightLeft,
  FileJson,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
  Copy,
  FileCode,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { 
  formFieldsData, 
  projectPhases, 
  gapAnalysisData, 
  hrmModules as hrmModulesData, 
  erpModules as erpModulesData, 
  systemStats,
  migrationPlanData,
  migrationProgressData,
  validationRules,
  validationResults,
  migrationScripts,
} from "@/data/jiandaoyunData";

// HRM模块图标映射
const hrmModules = hrmModulesData.map((m, i) => ({
  ...m,
  icon: [Users, ArrowRightLeft, Calendar, BarChart3, FileSpreadsheet, ClipboardList, Package, Layers][i] || Users,
}));

// ERP模块图标映射
const erpModules = erpModulesData.map((m, i) => ({
  ...m,
  icon: [ShoppingCart, Package, Settings, Database, FileSpreadsheet][i] || Layers,
}));

// 阶段图标映射
const phaseIcons: Record<string, any> = {
  M0: Users,
  M1: FileText,
  M2: ClipboardList,
  M3: Calendar,
  M4: Settings,
  M5: ShoppingCart,
  M6: Package,
  M7: CheckCircle2,
  M8: Package,
  M9: Settings,
  M10: CheckCircle2,
  M11: Users,
  M12: BarChart3,
};

export default function JiandaoyunAnalysis() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("project");
  const [expandedPhase, setExpandedPhase] = useState<string | null>("M0");
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "partial":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "pending":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, { zh: string; en: string }> = {
      active: { zh: "已完善", en: "Complete" },
      partial: { zh: "部分完成", en: "Partial" },
      pending: { zh: "待开发", en: "Pending" },
    };
    return language === "zh" ? texts[status]?.zh : texts[status]?.en;
  };

  const getGapStatusColor = (status: string) => {
    switch (status) {
      case "exists":
        return "bg-green-500/20 text-green-400";
      case "partial":
        return "bg-yellow-500/20 text-yellow-400";
      case "missing":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getGapStatusText = (status: string) => {
    const texts: Record<string, { zh: string; en: string }> = {
      exists: { zh: "已具备", en: "Exists" },
      partial: { zh: "部分具备", en: "Partial" },
      missing: { zh: "缺失", en: "Missing" },
    };
    return language === "zh" ? texts[status]?.zh : texts[status]?.en;
  };

  const getMappingStatusColor = (status: string) => {
    switch (status) {
      case "direct":
        return "bg-green-500/20 text-green-400";
      case "transform":
        return "bg-yellow-500/20 text-yellow-400";
      case "lookup":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getMappingStatusText = (status: string) => {
    const texts: Record<string, { zh: string; en: string }> = {
      direct: { zh: "直接映射", en: "Direct" },
      transform: { zh: "需转换", en: "Transform" },
      lookup: { zh: "需查找", en: "Lookup" },
    };
    return language === "zh" ? texts[status]?.zh : texts[status]?.en;
  };

  const getMigrationStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "validating":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getMigrationStatusText = (status: string) => {
    const texts: Record<string, { zh: string; en: string }> = {
      completed: { zh: "已完成", en: "Completed" },
      validating: { zh: "验证中", en: "Validating" },
      in_progress: { zh: "迁移中", en: "In Progress" },
      failed: { zh: "失败", en: "Failed" },
      pending: { zh: "待迁移", en: "Pending" },
    };
    return language === "zh" ? texts[status]?.zh : texts[status]?.en;
  };

  const getMigrationStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "validating":
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case "in_progress":
        return <Play className="w-4 h-4 text-yellow-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "pending":
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 导出差距分析报告为CSV
  const exportGapAnalysisCSV = () => {
    const headers = ["模块", "当前完成度", "功能项", "状态"];
    const rows: string[][] = [];
    
    gapAnalysisData.forEach(item => {
      item.gaps.forEach(gap => {
        rows.push([
          language === "zh" ? item.module : item.moduleEn,
          `${item.current}%`,
          language === "zh" ? gap.item : gap.itemEn,
          getGapStatusText(gap.status),
        ]);
      });
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gap_analysis_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 导出数据迁移规划为JSON
  const exportMigrationPlanJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      migrationPlan: migrationPlanData,
      migrationProgress: migrationProgressData,
      validationResults: validationResults,
      summary: {
        totalModules: migrationPlanData.length,
        highPriority: migrationPlanData.filter(m => m.priority === "high").length,
        totalRecords: migrationPlanData.reduce((sum, m) => sum + m.estimatedRecords, 0),
      },
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `migration_plan_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 导出完整表单结构为CSV
  const exportFormStructureCSV = () => {
    const headers = ["阶段", "表单ID", "表单名称", "字段名称", "字段类型", "是否必填", "说明"];
    const rows: string[][] = [];
    
    projectPhases.forEach(phase => {
      phase.formList.forEach(form => {
        const fields = formFieldsData[form.id];
        if (fields) {
          fields.forEach(field => {
            rows.push([
              phase.id,
              form.id,
              language === "zh" ? form.name : form.nameEn,
              language === "zh" ? field.name : field.nameEn,
              field.type,
              field.required ? "是" : "否",
              field.desc,
            ]);
          });
        } else {
          rows.push([
            phase.id,
            form.id,
            language === "zh" ? form.name : form.nameEn,
            "-",
            "-",
            "-",
            "暂无字段数据",
          ]);
        }
      });
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `form_structure_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 复制脚本到剪贴板
  const copyScript = (scriptId: string, script: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(scriptId);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  // 导出迁移脚本
  const exportMigrationScripts = () => {
    const content = migrationScripts.map(s => 
      `-- ============================================\n-- ${s.name}\n-- ${s.description}\n-- Source: ${s.sourceTable} -> Target: ${s.targetTable}\n-- ============================================\n\n${s.script}\n\n`
    ).join("\n");
    
    const blob = new Blob([content], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `migration_scripts_${new Date().toISOString().split("T")[0]}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 计算总体迁移进度
  const totalProgress = Math.round(
    migrationProgressData.reduce((sum, m) => sum + m.progress, 0) / migrationProgressData.length
  );

  const totalMigrated = migrationProgressData.reduce((sum, m) => sum + m.migratedRecords, 0);
  const totalRecords = migrationProgressData.reduce((sum, m) => sum + m.totalRecords, 0);
  const totalValidated = migrationProgressData.reduce((sum, m) => sum + m.validatedRecords, 0);
  const totalErrors = migrationProgressData.reduce((sum, m) => sum + m.errorRecords, 0);

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/">
              <span className="hover:text-primary cursor-pointer">{language === "zh" ? "总览" : "Overview"}</span>
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{language === "zh" ? "简道云系统分析" : "Jiandaoyun Analysis"}</span>
          </div>

          <PageHeader
            icon={Database}
            title={language === "zh" ? "简道云现有系统分析" : "Jiandaoyun System Analysis"}
            description={language === "zh"
              ? "基于GRT公司简道云平台的完整系统结构提取与分析，为智能系统实施提供数据基础。"
              : "Complete system structure extraction and analysis from GRT's Jiandaoyun platform, providing data foundation for intelligent system implementation."}
            actions={
              <Badge variant="outline" className="self-start px-3 py-1 border-primary/30 text-primary">
                <Database className="w-4 h-4 mr-2" />
                {language === "zh" ? "数据提取完成" : "Data Extracted"}
              </Badge>
            }
          />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: language === "zh" ? "应用总数" : "Total Apps", value: systemStats.totalApps, icon: FolderKanban },
            { label: language === "zh" ? "核心应用" : "Core Apps", value: systemStats.coreApps, icon: Building2 },
            { label: language === "zh" ? "表单数量" : "Forms", value: `${systemStats.totalForms}+`, icon: FileText },
            { label: language === "zh" ? "工作流" : "Workflows", value: systemStats.workflows, icon: Workflow },
            { label: language === "zh" ? "仪表盘" : "Dashboards", value: systemStats.dashboards, icon: BarChart3 },
          ].map((stat, index) => (
            <Card key={index} className="bg-card/50 border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-sm bg-primary/10 text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="project" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FolderKanban className="w-4 h-4 mr-2" />
              {language === "zh" ? "项目管理" : "Project"}
            </TabsTrigger>
            <TabsTrigger value="hrm" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              {language === "zh" ? "人事OA" : "HRM"}
            </TabsTrigger>
            <TabsTrigger value="erp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="w-4 h-4 mr-2" />
              ERP
            </TabsTrigger>
            <TabsTrigger value="gap" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-4 h-4 mr-2" />
              {language === "zh" ? "差距分析" : "Gap"}
            </TabsTrigger>
            <TabsTrigger value="dependency" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GitBranch className="w-4 h-4 mr-2" />
              {language === "zh" ? "依赖关系" : "Dependency"}
            </TabsTrigger>
            <TabsTrigger value="migration" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              {language === "zh" ? "迁移规划" : "Migration"}
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <RefreshCw className="w-4 h-4 mr-2" />
              {language === "zh" ? "迁移进度" : "Progress"}
            </TabsTrigger>
            <TabsTrigger value="validation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4 mr-2" />
              {language === "zh" ? "数据验证" : "Validation"}
            </TabsTrigger>
            <TabsTrigger value="scripts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileCode className="w-4 h-4 mr-2" />
              {language === "zh" ? "迁移脚本" : "Scripts"}
            </TabsTrigger>
          </TabsList>

          {/* Project Management Tab */}
          <TabsContent value="project" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-primary" />
                      {language === "zh" ? "项目全生命周期管理 (M0-M12)" : "Project Lifecycle Management (M0-M12)"}
                    </CardTitle>
                    <CardDescription>
                      {language === "zh"
                        ? "从市场触达到项目收尾的13个阶段，覆盖项目全生命周期管理。"
                        : "13 phases from market outreach to project closure, covering complete project lifecycle management."}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportFormStructureCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    {language === "zh" ? "导出表单结构" : "Export Structure"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectPhases.map((phase) => {
                  const PhaseIcon = phaseIcons[phase.id] || Layers;
                  return (
                    <Collapsible
                      key={phase.id}
                      open={expandedPhase === phase.id}
                      onOpenChange={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="p-4 rounded-sm border border-border bg-background/50 hover:border-primary/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-sm bg-primary/10 text-primary">
                                <PhaseIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{phase.id}</span>
                                  <h4 className="font-medium">{language === "zh" ? phase.name : phase.nameEn}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {phase.formList.length} {language === "zh" ? "个表单" : "forms"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={getStatusColor(phase.status)}>
                                {getStatusText(phase.status)}
                              </Badge>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${expandedPhase === phase.id ? "rotate-180" : ""}`}
                              />
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 mt-2 space-y-2">
                          {phase.formList.map((form) => (
                            <Collapsible
                              key={form.id}
                              open={expandedForm === form.id}
                              onOpenChange={() => setExpandedForm(expandedForm === form.id ? null : form.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="p-3 rounded-sm bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <FileText className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-sm">{language === "zh" ? form.name : form.nameEn}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {form.type}
                                      </Badge>
                                    </div>
                                    {formFieldsData[form.id] && (
                                      <ChevronDown
                                        className={`w-4 h-4 transition-transform ${expandedForm === form.id ? "rotate-180" : ""}`}
                                      />
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              {formFieldsData[form.id] && (
                                <CollapsibleContent>
                                  <div className="ml-4 mt-2 p-3 rounded-sm bg-background/30 border border-border/20">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-muted-foreground">
                                          <th className="pb-2">{language === "zh" ? "字段名" : "Field"}</th>
                                          <th className="pb-2">{language === "zh" ? "类型" : "Type"}</th>
                                          <th className="pb-2">{language === "zh" ? "必填" : "Required"}</th>
                                          <th className="pb-2">{language === "zh" ? "说明" : "Description"}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {formFieldsData[form.id].map((field, idx) => (
                                          <tr key={idx} className="border-t border-border/20">
                                            <td className="py-2">{language === "zh" ? field.name : field.nameEn}</td>
                                            <td className="py-2">
                                              <Badge variant="outline" className="text-xs">
                                                {field.type}
                                              </Badge>
                                            </td>
                                            <td className="py-2">
                                              {field.required ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}
                                            </td>
                                            <td className="py-2 text-muted-foreground">{field.desc}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CollapsibleContent>
                              )}
                            </Collapsible>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HRM Tab */}
          <TabsContent value="hrm" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {language === "zh" ? "人事及OA管理系统" : "HRM & OA Management System"}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "覆盖招聘、考勤、绩效、薪酬等人力资源管理全流程。"
                    : "Covers complete HR management processes including recruitment, attendance, performance, and compensation."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {hrmModules.map((module, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-sm border border-border bg-background/50 hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-sm bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <module.icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-medium">{language === "zh" ? module.name : module.nameEn}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {module.forms} {language === "zh" ? "个表单" : "forms"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ERP Tab */}
          <TabsContent value="erp" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  {language === "zh" ? "ERP模板模块" : "ERP Template Modules"}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "简道云ERP模板的完整模块结构，可作为GRT智能系统的参考架构。"
                    : "Complete module structure of Jiandaoyun ERP template, serving as reference architecture for GRT intelligent system."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {erpModules.map((module, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-sm border border-border bg-background/50 hover:border-primary/50 transition-colors group text-center"
                    >
                      <div className="p-3 rounded-sm bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors inline-block mb-3">
                        <module.icon className="w-6 h-6" />
                      </div>
                      <h4 className="font-medium mb-1">{language === "zh" ? module.name : module.nameEn}</h4>
                      <p className="text-sm text-muted-foreground">
                        {module.forms} {language === "zh" ? "个表单" : "forms"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gap Analysis Tab */}
          <TabsContent value="gap" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      {language === "zh" ? "现有系统与目标系统差距分析" : "Gap Analysis: Current vs Target System"}
                    </CardTitle>
                    <CardDescription>
                      {language === "zh"
                        ? "对比现有简道云系统与GRT智能系统目标之间的功能差距，指导实施优先级。"
                        : "Compare functional gaps between current Jiandaoyun system and GRT intelligent system targets to guide implementation priorities."}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportGapAnalysisCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {language === "zh" ? "导出报告" : "Export Report"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {gapAnalysisData.map((item, index) => (
                  <div key={index} className="p-4 rounded-sm border border-border bg-background/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{language === "zh" ? item.module : item.moduleEn}</h4>
                      <span className="text-sm font-mono text-primary">{item.current}%</span>
                    </div>
                    <Progress value={item.current} className="h-2 mb-4" />
                    <div className="space-y-2">
                      {item.gaps.map((gap, gapIndex) => (
                        <div key={gapIndex} className="flex items-center justify-between text-sm py-1">
                          <div className="flex items-center gap-2">
                            {gap.status === "exists" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                            {gap.status === "partial" && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                            {gap.status === "missing" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                            <span>{language === "zh" ? gap.item : gap.itemEn}</span>
                          </div>
                          <Badge variant="outline" className={getGapStatusColor(gap.status)}>
                            {getGapStatusText(gap.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Summary */}
                <div className="p-4 rounded-sm bg-primary/5 border border-primary/20">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {language === "zh" ? "差距分析总结" : "Gap Analysis Summary"}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-400">4</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "已具备" : "Exists"}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">4</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "部分具备" : "Partial"}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">7</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "缺失" : "Missing"}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">52%</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "平均完成度" : "Avg Completion"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dependency Tab */}
          <TabsContent value="dependency" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-primary" />
                  {language === "zh" ? "系统模块依赖关系图" : "System Module Dependency Map"}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "展示各模块之间的数据流向和依赖关系，帮助理解系统架构。"
                    : "Visualize data flow and dependencies between modules to understand system architecture."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Visual Dependency Graph */}
                <div className="p-6 rounded-sm border border-border bg-background/30 mb-6">
                  <div className="flex flex-col items-center space-y-4">
                    {/* Row 1: CRM */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-sm bg-blue-500/20 border border-blue-500/30 text-blue-400 text-center min-w-[120px]">
                        <Users className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "客户管理" : "Customer"}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="p-3 rounded-sm bg-blue-500/20 border border-blue-500/30 text-blue-400 text-center min-w-[120px]">
                        <FileText className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "商机管理" : "Opportunity"}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="p-3 rounded-sm bg-green-500/20 border border-green-500/30 text-green-400 text-center min-w-[120px]">
                        <ClipboardList className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "售前方案" : "Presales"}</span>
                      </div>
                    </div>
                    
                    {/* Arrow Down */}
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                    
                    {/* Row 2: Contract & Project */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-sm bg-purple-500/20 border border-purple-500/30 text-purple-400 text-center min-w-[120px]">
                        <Calendar className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "合同签订" : "Contract"}</span>
                      </div>
                    </div>
                    
                    {/* Arrow Down Split */}
                    <div className="flex items-center gap-16">
                      <ChevronDown className="w-6 h-6 text-muted-foreground" />
                      <ChevronDown className="w-6 h-6 text-muted-foreground" />
                      <ChevronDown className="w-6 h-6 text-muted-foreground" />
                    </div>
                    
                    {/* Row 3: Execution */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-sm bg-orange-500/20 border border-orange-500/30 text-orange-400 text-center min-w-[120px]">
                        <ShoppingCart className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "采购管理" : "Procurement"}</span>
                      </div>
                      <div className="p-3 rounded-sm bg-orange-500/20 border border-orange-500/30 text-orange-400 text-center min-w-[120px]">
                        <Package className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "库存管理" : "Inventory"}</span>
                      </div>
                      <div className="p-3 rounded-sm bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-center min-w-[120px]">
                        <FileSpreadsheet className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "财务管理" : "Finance"}</span>
                      </div>
                    </div>
                    
                    {/* Arrow Down */}
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                    
                    {/* Row 4: Delivery */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-sm bg-teal-500/20 border border-teal-500/30 text-teal-400 text-center min-w-[120px]">
                        <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "验收交付" : "Delivery"}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="p-3 rounded-sm bg-teal-500/20 border border-teal-500/30 text-teal-400 text-center min-w-[120px]">
                        <Users className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{language === "zh" ? "售后服务" : "After-sales"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Migration Planning Tab */}
          <TabsContent value="migration" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                      {language === "zh" ? "数据迁移规划" : "Data Migration Planning"}
                    </CardTitle>
                    <CardDescription>
                      {language === "zh"
                        ? "基于字段映射分析，生成从简道云到新系统的数据迁移方案。"
                        : "Generate data migration plan from Jiandaoyun to new system based on field mapping analysis."}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportMigrationPlanJSON}>
                    <FileJson className="w-4 h-4 mr-2" />
                    {language === "zh" ? "导出JSON" : "Export JSON"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Migration Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-sm border border-border bg-background/50 text-center">
                    <p className="text-2xl font-bold text-primary">{migrationPlanData.length}</p>
                    <p className="text-xs text-muted-foreground">{language === "zh" ? "迁移模块" : "Modules"}</p>
                  </div>
                  <div className="p-4 rounded-sm border border-border bg-background/50 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {migrationPlanData.filter(m => m.priority === "high").length}
                    </p>
                    <p className="text-xs text-muted-foreground">{language === "zh" ? "高优先级" : "High Priority"}</p>
                  </div>
                  <div className="p-4 rounded-sm border border-border bg-background/50 text-center">
                    <p className="text-2xl font-bold text-yellow-400">
                      {migrationPlanData.reduce((sum, m) => sum + m.estimatedRecords, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{language === "zh" ? "预估记录数" : "Est. Records"}</p>
                  </div>
                  <div className="p-4 rounded-sm border border-border bg-background/50 text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {migrationPlanData.reduce((sum, m) => sum + m.fieldMappings.length, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{language === "zh" ? "字段映射" : "Field Mappings"}</p>
                  </div>
                </div>

                {/* Migration Details */}
                {migrationPlanData.map((plan, index) => (
                  <Collapsible key={index}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 rounded-sm border border-border bg-background/50 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {language === "zh" ? plan.sourceModule : plan.sourceModuleEn}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-primary" />
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-primary" />
                              <span className="font-medium text-primary">
                                {language === "zh" ? plan.targetModule : plan.targetModuleEn}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={
                              plan.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                            }>
                              {plan.priority === "high" 
                                ? (language === "zh" ? "高优先级" : "High") 
                                : (language === "zh" ? "中优先级" : "Medium")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ~{plan.estimatedRecords.toLocaleString()} {language === "zh" ? "条" : "records"}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 p-4 rounded-sm bg-muted/30 border border-border/30">
                        <h5 className="text-sm font-medium mb-3">
                          {language === "zh" ? "字段映射详情" : "Field Mapping Details"}
                        </h5>
                        <div className="space-y-2">
                          {plan.fieldMappings.map((mapping, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-border/20 last:border-0">
                              <div className="flex items-center gap-4 flex-1">
                                <span className="text-muted-foreground min-w-[120px]">{mapping.source}</span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <span className="font-mono text-xs text-primary">{mapping.target}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getMappingStatusColor(mapping.status)}>
                                  {getMappingStatusText(mapping.status)}
                                </Badge>
                                <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                                  {mapping.note}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {/* Migration Steps */}
                <div className="p-4 rounded-sm bg-primary/5 border border-primary/20">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    {language === "zh" ? "建议迁移步骤" : "Recommended Migration Steps"}
                  </h4>
                  <div className="space-y-3">
                    {[
                      { step: 1, title: language === "zh" ? "数据清洗" : "Data Cleansing", desc: language === "zh" ? "清理重复数据、修复格式错误、补充缺失字段" : "Clean duplicates, fix format errors, fill missing fields" },
                      { step: 2, title: language === "zh" ? "主数据迁移" : "Master Data Migration", desc: language === "zh" ? "优先迁移客户、供应商、员工等主数据" : "Migrate customer, vendor, employee master data first" },
                      { step: 3, title: language === "zh" ? "业务数据迁移" : "Transaction Data Migration", desc: language === "zh" ? "按时间顺序迁移合同、订单、项目等业务数据" : "Migrate contracts, orders, projects in chronological order" },
                      { step: 4, title: language === "zh" ? "数据验证" : "Data Validation", desc: language === "zh" ? "对比源系统和目标系统数据，确保完整性和准确性" : "Compare source and target data for completeness and accuracy" },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Migration Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-primary" />
                      {language === "zh" ? "数据迁移进度追踪" : "Migration Progress Tracking"}
                    </CardTitle>
                    <CardDescription>
                      {language === "zh"
                        ? "实时追踪各模块的数据迁移进度和状态。"
                        : "Real-time tracking of data migration progress and status for each module."}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {language === "zh" ? "总进度" : "Total"}: {totalProgress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Progress */}
                <div className="p-4 rounded-sm border border-border bg-background/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{language === "zh" ? "总体迁移进度" : "Overall Migration Progress"}</h4>
                    <span className="text-sm font-mono text-primary">{totalProgress}%</span>
                  </div>
                  <Progress value={totalProgress} className="h-3 mb-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold text-primary">{totalRecords.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "总记录数" : "Total Records"}</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-400">{totalMigrated.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "已迁移" : "Migrated"}</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-400">{totalValidated.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "已验证" : "Validated"}</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-red-400">{totalErrors}</p>
                      <p className="text-xs text-muted-foreground">{language === "zh" ? "错误记录" : "Errors"}</p>
                    </div>
                  </div>
                </div>

                {/* Module Progress */}
                <div className="space-y-4">
                  {migrationProgressData.map((module, index) => (
                    <div key={index} className="p-4 rounded-sm border border-border bg-background/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getMigrationStatusIcon(module.status)}
                          <div>
                            <h4 className="font-medium">{language === "zh" ? module.moduleName : module.moduleNameEn}</h4>
                            <p className="text-xs text-muted-foreground">
                              {language === "zh" ? "最后更新" : "Last updated"}: {module.lastUpdated}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={getMigrationStatusColor(module.status)}>
                          {getMigrationStatusText(module.status)}
                        </Badge>
                      </div>
                      <Progress value={module.progress} className="h-2 mb-3" />
                      <div className="grid grid-cols-4 gap-4 text-center text-sm">
                        <div>
                          <p className="font-mono">{module.totalRecords}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "总数" : "Total"}</p>
                        </div>
                        <div>
                          <p className="font-mono text-yellow-400">{module.migratedRecords}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "已迁移" : "Migrated"}</p>
                        </div>
                        <div>
                          <p className="font-mono text-green-400">{module.validatedRecords}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "已验证" : "Validated"}</p>
                        </div>
                        <div>
                          <p className="font-mono text-red-400">{module.errorRecords}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "错误" : "Errors"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Validation Tab */}
          <TabsContent value="validation" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {language === "zh" ? "数据验证工具" : "Data Validation Tool"}
                </CardTitle>
                <CardDescription>
                  {language === "zh"
                    ? "自动对比源系统和目标系统的数据一致性，确保迁移质量。"
                    : "Automatically compare data consistency between source and target systems to ensure migration quality."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Validation Rules */}
                <div className="p-4 rounded-sm border border-border bg-background/50">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    {language === "zh" ? "验证规则" : "Validation Rules"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {validationRules.map((rule) => (
                      <div key={rule.id} className="p-3 rounded-sm border border-border/50 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                          <Badge variant="outline" className={
                            rule.severity === "error" ? "bg-red-500/20 text-red-400" :
                            rule.severity === "warning" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-blue-500/20 text-blue-400"
                          }>
                            {rule.severity}
                          </Badge>
                        </div>
                        <h5 className="font-medium text-sm mb-1">{language === "zh" ? rule.name : rule.nameEn}</h5>
                        <p className="text-xs text-muted-foreground">{language === "zh" ? rule.description : rule.descriptionEn}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Results */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {language === "zh" ? "验证结果" : "Validation Results"}
                  </h4>
                  {validationResults.map((result, index) => (
                    <div key={index} className="p-4 rounded-sm border border-border bg-background/50">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h5 className="font-medium">{language === "zh" ? result.moduleName : result.moduleNameEn}</h5>
                          <p className="text-xs text-muted-foreground">
                            {language === "zh" ? "验证时间" : "Validated"}: {result.lastValidated}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.failedChecks === 0 ? (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {language === "zh" ? "全部通过" : "All Passed"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/20 text-red-400">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {result.failedChecks} {language === "zh" ? "项失败" : "Failed"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-center mb-4">
                        <div>
                          <p className="text-lg font-bold">{result.totalChecks}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "总检查项" : "Total"}</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-400">{result.passedChecks}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "通过" : "Passed"}</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-400">{result.failedChecks}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "失败" : "Failed"}</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-yellow-400">{result.warningChecks}</p>
                          <p className="text-xs text-muted-foreground">{language === "zh" ? "警告" : "Warnings"}</p>
                        </div>
                      </div>

                      {result.issues.length > 0 && (
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium text-muted-foreground">
                            {language === "zh" ? "问题详情" : "Issue Details"}
                          </h6>
                          {result.issues.map((issue, idx) => (
                            <div key={idx} className="p-3 rounded-sm bg-muted/30 border border-border/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {issue.severity === "error" ? (
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                  )}
                                  <span className="font-medium text-sm">{language === "zh" ? issue.ruleName : issue.ruleNameEn}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {issue.affectedRecords} {language === "zh" ? "条记录" : "records"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {language === "zh" ? "示例" : "Sample"}: {issue.sampleData}
                              </p>
                              <p className="text-xs text-primary">
                                {language === "zh" ? "建议" : "Suggestion"}: {language === "zh" ? issue.suggestion : issue.suggestionEn}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Migration Scripts Tab */}
          <TabsContent value="scripts" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-primary" />
                      {language === "zh" ? "迁移脚本模板" : "Migration Script Templates"}
                    </CardTitle>
                    <CardDescription>
                      {language === "zh"
                        ? "基于字段映射自动生成的SQL/ETL脚本模板，可直接用于数据迁移。"
                        : "Auto-generated SQL/ETL script templates based on field mappings, ready for data migration."}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportMigrationScripts}>
                    <Download className="w-4 h-4 mr-2" />
                    {language === "zh" ? "导出全部脚本" : "Export All Scripts"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {migrationScripts.map((script) => (
                  <Collapsible
                    key={script.id}
                    open={expandedScript === script.id}
                    onOpenChange={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="p-4 rounded-sm border border-border bg-background/50 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-sm bg-primary/10 text-primary">
                              <Code className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">{language === "zh" ? script.name : script.nameEn}</h4>
                              <p className="text-xs text-muted-foreground">
                                {script.sourceTable} → {script.targetTable}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                              {script.type.toUpperCase()}
                            </Badge>
                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedScript === script.id ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 p-4 rounded-sm bg-muted/30 border border-border/30">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-muted-foreground">
                            {language === "zh" ? script.description : script.descriptionEn}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyScript(script.id, script.script)}
                          >
                            {copiedScript === script.id ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                                {language === "zh" ? "已复制" : "Copied"}
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                {language === "zh" ? "复制" : "Copy"}
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="p-4 rounded-sm bg-background/50 border border-border overflow-x-auto text-xs font-mono">
                          <code>{script.script}</code>
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Implementation Suggestions */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              {language === "zh" ? "实施建议" : "Implementation Suggestions"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: language === "zh" ? "复用M0-M12框架" : "Reuse M0-M12 Framework",
                  desc: language === "zh"
                    ? "已有完整的项目阶段定义，可直接作为智能系统的项目管理基础"
                    : "Existing complete project phase definitions can serve as the foundation for intelligent system project management",
                },
                {
                  title: language === "zh" ? "整合CRM与项目管理" : "Integrate CRM & PM",
                  desc: language === "zh"
                    ? "M0模块已有客户管理基础，需要增强BANT评分和销售漏斗功能"
                    : "M0 module has customer management foundation, needs enhanced BANT scoring and sales funnel features",
                },
                {
                  title: language === "zh" ? "扩展AI能力" : "Extend AI Capabilities",
                  desc: language === "zh"
                    ? "在现有AI插件基础上集成Gemini Agent，实现智能销售助手"
                    : "Integrate Gemini Agent on top of existing AI plugins to implement intelligent sales assistant",
                },
                {
                  title: language === "zh" ? "优化财务管理" : "Optimize Finance",
                  desc: language === "zh"
                    ? "参考ERP模板的财务模块，完善项目成本核算和利润分析"
                    : "Reference ERP template finance module to improve project cost accounting and profit analysis",
                },
              ].map((suggestion, index) => (
                <div key={index} className="p-4 rounded-sm border border-border bg-background/50">
                  <h4 className="font-medium mb-2">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground">{suggestion.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center">
          <Link href="/roadmap">
            <Button className="bg-primary hover:bg-primary/90">
              {language === "zh" ? "查看实施路径" : "View Implementation Roadmap"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
  );
}
