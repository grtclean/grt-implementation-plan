/**
 * 文档推荐面板组件
 * 显示AI推荐的参考文档和缺失文档
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles, FileText, AlertTriangle, ThumbsUp, ThumbsDown,
  BookOpen, ChevronDown, ChevronUp, Lightbulb, RefreshCw,
} from "lucide-react";

interface DocumentRecommendationPanelProps {
  projectId: number;
  stageCode: string;
  language?: "zh" | "en";
}

export default function DocumentRecommendationPanel({
  projectId,
  stageCode,
  language = "zh",
}: DocumentRecommendationPanelProps) {
  const [showAiReasoning, setShowAiReasoning] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, refetch, isFetching } = trpc.docIntelligence.getStageRecommendations.useQuery(
    {
      projectId,
      stageCode,
      includeAiReasoning: showAiReasoning,
    },
    {
      enabled: !!projectId && !!stageCode,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasMissing = data.missingDocuments.length > 0;
  const hasReferences = data.referenceDocuments.length > 0;

  return (
    <Card className={cn(hasMissing && "border-orange-500/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {language === "zh" ? "AI 文档推荐" : "AI Document Recommendations"}
            <span className="text-sm font-normal text-muted-foreground">
              {stageCode} - {data.stageName}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* 缺失文档 */}
          {hasMissing && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-orange-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {language === "zh"
                  ? `缺失文档 (${data.missingDocuments.length})`
                  : `Missing Documents (${data.missingDocuments.length})`}
              </h4>
              <div className="space-y-1.5">
                {data.missingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-orange-500/5 border border-orange-500/20"
                  >
                    <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">
                        {language === "en" && doc.documentNameEn
                          ? doc.documentNameEn
                          : doc.documentName}
                      </span>
                      <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                        {doc.isMandatory
                          ? language === "zh" ? "必须" : "Required"
                          : language === "zh" ? "可选" : "Optional"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI推荐理由 */}
          {!showAiReasoning && hasMissing && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAiReasoning(true)}
            >
              <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
              {language === "zh" ? "获取AI建议" : "Get AI Suggestions"}
            </Button>
          )}

          {data.aiReasoning && (
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                {language === "zh" ? "AI 建议" : "AI Suggestion"}
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {data.aiReasoning}
              </p>
            </div>
          )}

          {/* 参考文档（来自历史项目） */}
          {hasReferences && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                {language === "zh"
                  ? `参考文档 (${data.referenceDocuments.length})`
                  : `Reference Documents (${data.referenceDocuments.length})`}
              </h4>
              <div className="space-y-1.5">
                {data.referenceDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/20"
                  >
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate">{doc.documentTitle}</span>
                      {doc.stageCode && (
                        <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
                          {doc.stageCode}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {Math.round(doc.similarity * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无推荐时 */}
          {!hasMissing && !hasReferences && (
            <div className="text-center py-4">
              <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {language === "zh"
                  ? "该阶段文档已完备，无缺失项"
                  : "All documents for this stage are complete"}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
