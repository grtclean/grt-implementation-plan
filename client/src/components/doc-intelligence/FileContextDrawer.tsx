/**
 * FileContextDrawer — Slide-out drawer showing document context when opening a file
 *
 * Displays:
 * - Current document identification (matched mapping)
 * - Stage progress (completion %)
 * - Related stage documents (fulfilled / missing)
 * - Next actions needed
 * - Links to UI pages for missing docs
 */
import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "wouter";
import {
  X, FileText, CheckCircle, AlertCircle, ExternalLink, BarChart3,
  Clock, ChevronRight, AlertTriangle,
} from "lucide-react";

interface RelatedDoc {
  id: number;
  documentName: string;
  uiPagePath: string | null;
  fulfilled: boolean;
}

interface StageProgress {
  stageCode: string;
  stageName: string;
  totalRequired: number;
  fulfilled: number;
  completionPct: number;
}

interface FileContext {
  currentDoc: {
    documentName: string | null;
    stageCode: string | null;
    stageName: string | null;
    uiPagePath: string | null;
  };
  relatedDocs: RelatedDoc[];
  nextActions: string[];
  stageProgress: StageProgress | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: FileContext | null;
  loading?: boolean;
  fileName?: string;
}

export default function FileContextDrawer({
  open,
  onClose,
  context,
  loading,
  fileName,
}: Props) {
  const { t } = useLanguage();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[380px] max-w-[90vw] bg-background border-l shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm">{t("ido.context.title")}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Clock className="w-5 h-5 mx-auto mb-2 animate-pulse" />
              加载文档上下文...
            </div>
          )}

          {!loading && !context && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              无可用上下文信息
            </div>
          )}

          {!loading && context && (
            <>
              {/* Current document */}
              <div className="border rounded-lg p-3 bg-blue-50/50">
                <div className="text-xs text-muted-foreground mb-1">{t("ido.context.currentDoc")}</div>
                <div className="font-medium text-sm">
                  {fileName || context.currentDoc.documentName || "未识别的文档"}
                </div>
                {context.currentDoc.stageCode && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {context.currentDoc.stageCode} {context.currentDoc.stageName}
                  </div>
                )}
              </div>

              {/* Next actions */}
              {context.nextActions.length > 0 && (
                <div className="border rounded-lg p-3 bg-yellow-50/50 border-yellow-200">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-800 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t("ido.context.actions")}
                  </div>
                  <ul className="space-y-1">
                    {context.nextActions.map((action, i) => (
                      <li key={i} className="text-xs text-yellow-900 flex items-start gap-1.5">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related documents */}
              {context.relatedDocs.length > 0 && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("ido.context.relatedDocs")}
                  </div>
                  <ul className="space-y-1.5">
                    {context.relatedDocs.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-xs">
                        {doc.fulfilled ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        )}
                        <span
                          className={`flex-1 ${doc.fulfilled ? "text-muted-foreground" : "text-foreground"}`}
                        >
                          {doc.documentName}
                        </span>
                        {doc.fulfilled ? (
                          <span className="text-[10px] text-green-600">{t("ido.context.uploaded")}</span>
                        ) : doc.uiPagePath ? (
                          <Link
                            href={doc.uiPagePath}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            {t("ido.context.createIn")}
                            <ChevronRight className="w-2.5 h-2.5" />
                          </Link>
                        ) : (
                          <span className="text-[10px] text-red-500">{t("ido.context.missingDoc")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stage progress */}
              {context.stageProgress && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                      {t("ido.context.stageProgress")}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {context.stageProgress.stageCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          context.stageProgress.completionPct >= 100
                            ? "bg-green-500"
                            : context.stageProgress.completionPct >= 50
                              ? "bg-blue-500"
                              : "bg-orange-500"
                        }`}
                        style={{ width: `${context.stageProgress.completionPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">
                      {context.stageProgress.completionPct}%
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {context.stageProgress.fulfilled}/{context.stageProgress.totalRequired} {t("ido.health.fulfilled")}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
