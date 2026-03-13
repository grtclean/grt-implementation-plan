/**
 * StageDocumentMatrix — Interactive M0-M12 stage × document mapping grid
 *
 * Displays the full mapping of stages → documents → UI pages → SharePoint folders.
 * Each cell is a clickable card showing document info with links to relevant pages.
 */
import React, { useState, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "wouter";
import {
  FileText, FolderOpen, ExternalLink, Filter, CheckCircle,
  AlertTriangle, Lock, Search, ShoppingCart, Wrench, TestTube,
  Truck, Settings, Flag, Lightbulb, ClipboardCheck, Cog,
} from "lucide-react";

interface MappingItem {
  id: number;
  stageCode: string;
  documentTypeKey: string;
  documentName: string;
  documentNameEn: string | null;
  documentCategory: string;
  fileExtensions: string | null;
  uiPagePath: string | null;
  uiPageName: string | null;
  uiPageNameEn: string | null;
  sharepointFolder: string | null;
  sharepointSubfolder: string | null;
  isMandatory: boolean;
  sortOrder: number;
  responsibleRoles: string[] | null;
}

interface StageInfo {
  code: string;
  name: string;
  nameEn: string;
  category: string;
  color: string;
  documentCount: number;
}

interface Props {
  stages: StageInfo[];
  matrix: Record<string, MappingItem[]>;
  stageFilter?: string;
  categoryFilter?: string;
  onStageFilterChange?: (stage: string) => void;
  onCategoryFilterChange?: (category: string) => void;
}

const STAGE_ICONS: Record<string, React.ComponentType<any>> = {
  M0: Search, M1: ClipboardCheck, M2: Lightbulb, M3: FileText,
  M4: Lock, M5: Cog, M6: ShoppingCart, M7: Wrench, M8: TestTube,
  M9: Truck, M10: Settings, M11: CheckCircle, M12: Flag,
};

const CATEGORY_COLORS: Record<string, string> = {
  design: "bg-blue-100 text-blue-800 border-blue-200",
  report: "bg-gray-100 text-gray-800 border-gray-200",
  contract: "bg-orange-100 text-orange-800 border-orange-200",
  manual: "bg-green-100 text-green-800 border-green-200",
  checklist: "bg-purple-100 text-purple-800 border-purple-200",
};

const STAGE_CATEGORY_COLORS: Record<string, string> = {
  concept: "border-l-indigo-500",
  design: "border-l-blue-500",
  validation: "border-l-green-500",
  production: "border-l-orange-500",
  launch: "border-l-purple-500",
};

export default function StageDocumentMatrix({
  stages,
  matrix,
  stageFilter,
  categoryFilter,
  onStageFilterChange,
  onCategoryFilterChange,
}: Props) {
  const { t, language } = useLanguage();

  const filteredStages = useMemo(() => {
    let result = stages;
    if (stageFilter) {
      result = result.filter((s) => s.code === stageFilter);
    }
    return result;
  }, [stages, stageFilter]);

  const getFilteredDocs = (stageCode: string) => {
    const docs = matrix[stageCode] || [];
    if (categoryFilter) {
      return docs.filter((d) => d.documentCategory === categoryFilter);
    }
    return docs;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
            value={stageFilter || ""}
            onChange={(e) => onStageFilterChange?.(e.target.value)}
          >
            <option value="">{t("ido.matrix.allStages")}</option>
            {stages.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} {language === "en" ? s.nameEn : s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
            value={categoryFilter || ""}
            onChange={(e) => onCategoryFilterChange?.(e.target.value)}
          >
            <option value="">{t("ido.matrix.allCategories")}</option>
            <option value="design">{t("ido.category.design")}</option>
            <option value="report">{t("ido.category.report")}</option>
            <option value="contract">{t("ido.category.contract")}</option>
            <option value="manual">{t("ido.category.manual")}</option>
          </select>
        </div>
      </div>

      {/* Stage rows */}
      {filteredStages.map((stage) => {
        const docs = getFilteredDocs(stage.code);
        const StageIcon = STAGE_ICONS[stage.code] || FileText;
        const borderColor = STAGE_CATEGORY_COLORS[stage.category] || "border-l-gray-500";

        return (
          <div
            key={stage.code}
            className={`border rounded-lg border-l-4 ${borderColor} bg-card`}
          >
            {/* Stage header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
              <StageIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="font-semibold text-sm">{stage.code}</span>
                <span className="ml-2 text-sm">
                  {language === "en" ? stage.nameEn : stage.name}
                </span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">
                {docs.length} {language === "en" ? "documents" : "文档"}
              </span>
            </div>

            {/* Document cards */}
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-md p-3 hover:shadow-sm transition-shadow bg-background"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium text-sm leading-tight">
                      {language === "en" && doc.documentNameEn
                        ? doc.documentNameEn
                        : doc.documentName}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                        doc.isMandatory
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {doc.isMandatory ? t("ido.matrix.mandatory") : t("ido.matrix.optional")}
                    </span>
                  </div>

                  <div className={`inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[doc.documentCategory] || CATEGORY_COLORS.report}`}>
                    {t(`ido.category.${doc.documentCategory}`) || doc.documentCategory}
                  </div>

                  {doc.uiPagePath && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                      <ExternalLink className="w-3 h-3" />
                      <Link href={doc.uiPagePath} className="hover:underline truncate">
                        {language === "en" && doc.uiPageNameEn
                          ? doc.uiPageNameEn
                          : doc.uiPageName || doc.uiPagePath}
                      </Link>
                    </div>
                  )}

                  {doc.sharepointFolder && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <FolderOpen className="w-3 h-3" />
                      <span className="truncate">
                        {doc.sharepointFolder}
                        {doc.sharepointSubfolder && `/${doc.sharepointSubfolder}`}
                      </span>
                    </div>
                  )}

                  {doc.responsibleRoles && doc.responsibleRoles.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {doc.responsibleRoles.map((role) => (
                        <span
                          key={role}
                          className="text-[9px] px-1 py-0.5 bg-muted rounded"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {docs.length === 0 && (
                <div className="col-span-full text-center text-sm text-muted-foreground py-4">
                  {language === "en" ? "No documents for this filter" : "当前筛选无文档"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
