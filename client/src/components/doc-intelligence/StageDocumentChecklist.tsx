/**
 * 阶段文档检查清单组件
 * 显示指定阶段所需的文档及其完成状态
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, FileText, AlertCircle, Download, ExternalLink,
} from "lucide-react";

interface StageDocumentChecklistProps {
  projectId: number;
  stageCode: string;
  language?: "zh" | "en";
}

export default function StageDocumentChecklist({
  projectId,
  stageCode,
  language = "zh",
}: StageDocumentChecklistProps) {
  const { data, isLoading } = trpc.docIntelligence.getDocumentCompleteness.useQuery({
    projectId,
    stageCode,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const mandatoryItems = data.requirements.filter((r: any) => r.requirement?.isMandatory);
  const optionalItems = data.requirements.filter((r: any) => !r.requirement?.isMandatory);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {language === "zh" ? "文档检查清单" : "Document Checklist"}
            <span className="text-sm font-normal text-muted-foreground">
              {stageCode} - {data.stageName}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={data.mandatoryCompletionRate === 100 ? "default" : "destructive"}
              className="text-xs"
            >
              {language === "zh" ? "必须" : "Mandatory"}: {data.mandatoryCompletionRate}%
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {language === "zh" ? "总计" : "Total"}: {data.completionRate}%
            </Badge>
          </div>
        </div>
        {/* 进度条 */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              data.mandatoryCompletionRate === 100 ? "bg-green-500" : "bg-orange-500"
            )}
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 必须文档 */}
        {mandatoryItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              {language === "zh" ? "必须文档" : "Mandatory Documents"} ({mandatoryItems.length})
            </h4>
            <div className="space-y-2">
              {mandatoryItems.map((item: any, idx: number) => (
                <DocumentRequirementItem
                  key={item.requirement?.id ?? idx}
                  item={item}
                  language={language}
                />
              ))}
            </div>
          </div>
        )}

        {/* 可选文档 */}
        {optionalItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {language === "zh" ? "可选文档" : "Optional Documents"} ({optionalItems.length})
            </h4>
            <div className="space-y-2">
              {optionalItems.map((item: any, idx: number) => (
                <DocumentRequirementItem
                  key={item.requirement?.id ?? idx}
                  item={item}
                  language={language}
                />
              ))}
            </div>
          </div>
        )}

        {data.requirements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {language === "zh"
              ? "该阶段暂无文档需求定义"
              : "No document requirements defined for this stage"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentRequirementItem({
  item,
  language,
}: {
  item: any;
  language: "zh" | "en";
}) {
  const req = item.requirement || {};
  const name =
    language === "en" && req.documentNameEn
      ? req.documentNameEn
      : req.documentName || "";
  const desc =
    language === "en" && req.descriptionEn
      ? req.descriptionEn
      : req.description;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-2 rounded-md border",
        item.fulfilled
          ? "border-green-500/20 bg-green-500/5"
          : "border-border bg-background"
      )}
    >
      {item.fulfilled ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", item.fulfilled && "text-green-600 dark:text-green-400")}>
            {name}
          </span>
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {req.documentType}
          </Badge>
        </div>
        {desc && (
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        )}
        {item.fulfilled && item.matchedDocumentName && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            {item.matchedDocumentName}
          </p>
        )}
      </div>
      {req.templateUrl && !item.fulfilled && (
        <a
          href={req.templateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-primary hover:text-primary/80"
          title={language === "zh" ? "下载模板" : "Download template"}
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
