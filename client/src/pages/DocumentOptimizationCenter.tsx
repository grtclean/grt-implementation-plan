/**
 * DocumentOptimizationCenter — 文档智优中心
 *
 * 4-tab layout:
 *   1. 映射矩阵 — M0-M12 stage × document × UI page × SharePoint folder
 *   2. 存储导航 — SharePoint 12-folder tree with document type affinity
 *   3. 项目文档健康 — Per-project document completion per stage
 *   4. 分析 — Recommendation acceptance rate, engagement metrics
 */
import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import StageDocumentMatrix from "../components/doc-intelligence/StageDocumentMatrix";
import {
  FileText, FolderTree, HeartPulse, BarChart3, RefreshCw,
  FolderOpen, CheckCircle, AlertCircle, ExternalLink, ArrowRight,
  Database, Loader2, AlertTriangle, Download,
} from "lucide-react";

// ── SharePoint 12-folder structure ──────────────────────────────────────
const SP_FOLDERS = [
  { name: "01_Requirements", zh: "需求文档", docs: ["客户需求记录", "详细需求规格书", "技术可行性报告"] },
  { name: "02_Proposal", zh: "提案报价", docs: ["技术方案书", "商务报价单", "立项申请书", "RACI矩阵"] },
  { name: "03_Mechanical_Design", zh: "机械设计", docs: ["机械设计总图", "详细机械图纸", "设计冻结审批表"] },
  { name: "04_Electrical_Design", zh: "电气设计", docs: ["电气原理图", "电气接线图", "PLC程序文档"] },
  { name: "05_BOM_Procurement", zh: "BOM与采购", docs: ["BOM清单(初版)", "BOM清单(终版)", "采购订单汇总", "供应商确认单"] },
  { name: "06_Assembly", zh: "装配调试", docs: ["装配作业指导书", "调试记录表"] },
  { name: "07_Testing_QC", zh: "测试质检", docs: ["FAT测试方案", "质量计划"] },
  { name: "08_FAT_SAT", zh: "FAT/SAT验收", docs: ["FAT测试报告", "客户签字确认单", "SAT测试方案", "SAT测试报告"] },
  { name: "09_Shipping", zh: "发货", docs: ["发货清单"] },
  { name: "10_Site_Installation", zh: "现场安装", docs: ["安装方案", "现场调试报告", "培训记录"] },
  { name: "11_Warranty_Service", zh: "质保服务", docs: ["操作维护手册", "备件清单"] },
  { name: "12_Lessons_Learned", zh: "经验沉淀", docs: ["项目总结报告", "知识沉淀文档"] },
];

export default function DocumentOptimizationCenter() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"matrix" | "storage" | "health" | "analytics">("matrix");
  const [stageFilter, setStageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Data queries
  const matrixQuery = trpc.ido.mappingMatrix.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const completionQuery = trpc.ido.workflowProjectCompletion.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId, retry: false },
  );

  const analyticsQuery = trpc.ido.analyticsOverview.useQuery(undefined, {
    enabled: activeTab === "analytics",
    retry: false,
  });

  const seedMutation = trpc.ido.mappingSeed.useMutation({
    onSuccess: () => matrixQuery.refetch(),
  });

  const tabs = [
    { key: "matrix" as const, label: t("ido.tab.matrix"), icon: FileText },
    { key: "storage" as const, label: t("ido.tab.storage"), icon: FolderTree },
    { key: "health" as const, label: t("ido.tab.health"), icon: HeartPulse },
    { key: "analytics" as const, label: t("ido.tab.analytics"), icon: BarChart3 },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t("ido.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("ido.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* ═══ Tab 1: Mapping Matrix ═══ */}
        {activeTab === "matrix" && (
          <div>
            {matrixQuery.isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                加载映射数据...
              </div>
            )}

            {!matrixQuery.isLoading && (!matrixQuery.data || matrixQuery.data.totalDocuments === 0) && (
              <div className="text-center py-12">
                <Database className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  {language === "en" ? "No mapping data yet. Seed the default 47 document mappings?" : "暂无映射数据。初始化默认47条文档映射？"}
                </p>
                <button
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {seedMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {language === "en" ? "Initialize Seed Data" : "初始化种子数据"}
                </button>
              </div>
            )}

            {matrixQuery.data && matrixQuery.data.totalDocuments > 0 && (
              <StageDocumentMatrix
                stages={matrixQuery.data.stages}
                matrix={matrixQuery.data.matrix}
                stageFilter={stageFilter}
                categoryFilter={categoryFilter}
                onStageFilterChange={setStageFilter}
                onCategoryFilterChange={setCategoryFilter}
              />
            )}
          </div>
        )}

        {/* ═══ Tab 2: Storage Guide ═══ */}
        {activeTab === "storage" && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">{t("ido.storage.title")}</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {language === "en"
                ? "SharePoint project folder structure with associated document types per folder."
                : "SharePoint项目目录结构，展示每个目录关联的文档类型。"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SP_FOLDERS.map((folder) => (
                <div key={folder.name} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-yellow-600" />
                    <span className="font-mono text-xs font-medium">{folder.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{folder.zh}</div>
                  <div className="space-y-1">
                    {folder.docs.map((doc) => (
                      <div key={doc} className="flex items-center gap-1.5 text-xs">
                        <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Tab 3: Project Document Health ═══ */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-sm">{t("ido.health.title")}</h3>
              <input
                type="number"
                placeholder={t("ido.health.selectProject") + " (ID)"}
                className="text-sm border rounded-md px-2 py-1.5 w-48 bg-background"
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setSelectedProjectId(isNaN(val) ? null : val);
                }}
              />
              {completionQuery.isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {!selectedProjectId && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <HeartPulse className="w-8 h-8 mx-auto mb-3" />
                {language === "en" ? "Enter a project ID to view document health" : "输入项目ID查看文档健康度"}
              </div>
            )}

            {selectedProjectId && completionQuery.data && (
              <div className="space-y-3">
                {completionQuery.data.map((stage: any) => (
                  <div key={stage.stageCode} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stage.color.replace("bg-", "bg-")}`} />
                        <span className="font-medium text-sm">
                          {stage.stageCode} {stage.stageName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stage.fulfilled}/{stage.totalRequired}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.mandatoryCompletionPct >= 100 ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {t("ido.health.gateReady")}
                          </span>
                        ) : stage.totalMandatory > 0 ? (
                          <span className="text-xs text-orange-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t("ido.health.gateNotReady")}
                          </span>
                        ) : null}
                        <span className="text-xs font-medium">{stage.completionPct}%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stage.completionPct >= 100
                            ? "bg-green-500"
                            : stage.completionPct >= 50
                              ? "bg-blue-500"
                              : "bg-orange-500"
                        }`}
                        style={{ width: `${stage.completionPct}%` }}
                      />
                    </div>

                    {/* Missing docs */}
                    {stage.missingDocs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {stage.missingDocs.map((doc: any) => (
                          <div key={doc.mapId} className="flex items-center gap-2 text-xs">
                            <AlertCircle
                              className={`w-3 h-3 shrink-0 ${
                                doc.isMandatory ? "text-red-500" : "text-muted-foreground"
                              }`}
                            />
                            <span className={doc.isMandatory ? "text-red-700 font-medium" : "text-muted-foreground"}>
                              {doc.documentName}
                            </span>
                            {doc.isMandatory && (
                              <span className="text-[9px] px-1 py-0.5 bg-red-50 text-red-600 rounded">
                                {t("ido.matrix.mandatory")}
                              </span>
                            )}
                            {doc.uiPagePath && (
                              <Link
                                href={doc.uiPagePath}
                                className="ml-auto text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                {t("ido.health.createDoc")}
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab 4: Analytics ═══ */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <h3 className="font-medium text-sm">{t("ido.analytics.title")}</h3>

            {analyticsQuery.isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                加载分析数据...
              </div>
            )}

            {analyticsQuery.data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recommendation Stats */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3">{t("ido.analytics.acceptanceRate")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-md">
                      <div className="text-2xl font-bold">{analyticsQuery.data.recommendations.total}</div>
                      <div className="text-xs text-muted-foreground">{t("ido.analytics.total")}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-md">
                      <div className="text-2xl font-bold text-green-600">
                        {analyticsQuery.data.recommendations.acceptanceRate}%
                      </div>
                      <div className="text-xs text-green-600">{t("ido.analytics.accepted")}</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-md">
                      <div className="text-2xl font-bold text-red-600">{analyticsQuery.data.recommendations.rejected}</div>
                      <div className="text-xs text-red-600">{t("ido.analytics.rejected")}</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-md">
                      <div className="text-2xl font-bold text-yellow-600">{analyticsQuery.data.recommendations.pending}</div>
                      <div className="text-xs text-yellow-600">{t("ido.analytics.pending")}</div>
                    </div>
                  </div>
                </div>

                {/* File Open Engagement */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3">{t("ido.analytics.engagementRate")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-md">
                      <div className="text-2xl font-bold">{analyticsQuery.data.fileOpens.total}</div>
                      <div className="text-xs text-muted-foreground">
                        {language === "en" ? "File Opens" : "文件打开次数"}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-md">
                      <div className="text-2xl font-bold text-blue-600">
                        {analyticsQuery.data.fileOpens.engagementRate}%
                      </div>
                      <div className="text-xs text-blue-600">
                        {language === "en" ? "Engaged" : "互动率"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
