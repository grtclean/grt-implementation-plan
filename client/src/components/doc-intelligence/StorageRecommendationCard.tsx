/**
 * StorageRecommendationCard — Shows smart storage recommendation during file upload
 *
 * Compact card displayed after file selection showing:
 * - Recommended SharePoint folder path
 * - Matched UI page link
 * - Confidence score
 * - Accept / Change / Skip actions
 */
import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "wouter";
import {
  Lightbulb, FolderOpen, ExternalLink, Check, Edit2, X, Loader2,
} from "lucide-react";

interface StorageRecommendation {
  recommendedPath: string;
  sharepointFolder: string | null;
  sharepointSubfolder: string | null;
  uiPagePath: string | null;
  uiPageName: string | null;
  matchedMapId: number | null;
  confidence: number;
  reasoning: string;
}

interface Props {
  recommendation: StorageRecommendation | null;
  loading?: boolean;
  onAccept?: () => void;
  onReject?: (customPath?: string) => void;
  onSkip?: () => void;
}

export default function StorageRecommendationCard({
  recommendation,
  loading,
  onAccept,
  onReject,
  onSkip,
}: Props) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="border rounded-lg p-3 bg-blue-50/50 border-blue-200 flex items-center gap-2 text-sm text-blue-700">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>分析文件类型.../span>
      </div>
    );
  }

  if (!recommendation) return null;

  const confidenceColor =
    recommendation.confidence >= 80
      ? "text-green-600 bg-green-50"
      : recommendation.confidence >= 50
        ? "text-yellow-600 bg-yellow-50"
        : "text-gray-500 bg-gray-50";

  return (
    <div className="border rounded-lg p-3 bg-blue-50/50 border-blue-200">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-900">
            {t("ido.recommend.title")}
          </div>

          {/* Recommended path */}
          <div className="mt-1.5 flex items-center gap-1.5 text-sm">
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border truncate">
              {recommendation.recommendedPath}
            </span>
          </div>

          {/* Matched UI page */}
          {recommendation.uiPagePath && recommendation.uiPageName && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600">
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span>{t("ido.recommend.matchedPage")}:</span>
              <Link href={recommendation.uiPagePath} className="hover:underline">
                {recommendation.uiPageName}
              </Link>
            </div>
          )}

          {/* Confidence badge */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceColor}`}>
              {t("ido.recommend.confidence")}: {recommendation.confidence}%
            </span>
          </div>

          {/* Reasoning */}
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {recommendation.reasoning}
          </div>

          {/* Action buttons */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onAccept}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Check className="w-3 h-3" />
              {t("ido.recommend.accept")}
            </button>
            <button
              onClick={() => onReject?.()}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border bg-white hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              {t("ido.recommend.change")}
            </button>
            <button
              onClick={onSkip}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              {t("ido.recommend.skip")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
