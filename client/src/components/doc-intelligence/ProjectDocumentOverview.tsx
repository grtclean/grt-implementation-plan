/**
 * 项目文档全览组件
 * 显示M0-M12各阶段的文档完备性热力图
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface ProjectDocumentOverviewProps {
  projectId: number;
  currentStage?: string;
  language?: "zh" | "en";
  onStageClick?: (stageCode: string) => void;
}

export default function ProjectDocumentOverview({
  projectId,
  currentStage,
  language = "zh",
  onStageClick,
}: ProjectDocumentOverviewProps) {
  const { data, isLoading } = trpc.docIntelligence.getProjectDocumentOverview.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {Array.from({ length: 13 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          {language === "zh" ? "文档完备性全览" : "Document Completeness Overview"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* M0-M12 管线视图 */}
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
          {data.map((stage: any) => {
            const isCurrent = stage.stageCode === currentStage;
            const rate = stage.mandatoryCompletionRate ?? 0;
            const bgColor =
              rate === 100
                ? "bg-green-500/20 border-green-500/40 text-green-500"
                : rate >= 50
                ? "bg-orange-500/20 border-orange-500/40 text-orange-500"
                : rate > 0
                ? "bg-red-500/20 border-red-500/40 text-red-500"
                : "bg-muted border-border text-muted-foreground";

            return (
              <button
                key={stage.stageCode}
                onClick={() => onStageClick?.(stage.stageCode)}
                className={cn(
                  "flex flex-col items-center justify-center p-1.5 rounded border text-center transition-all hover:shadow-sm",
                  bgColor,
                  isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  onStageClick && "cursor-pointer hover:scale-105"
                )}
              >
                <span className="text-[10px] font-bold">{stage.stageCode}</span>
                <span className="text-lg font-bold leading-tight">{rate}%</span>
                {rate === 100 ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : stage.requirements?.some((r: any) => r.requirement?.isMandatory && !r.fulfilled) ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <div className="w-3 h-3" />
                )}
              </button>
            );
          })}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/40" />
            {language === "zh" ? "完成" : "Complete"}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-orange-500/20 border border-orange-500/40" />
            {language === "zh" ? "部分" : "Partial"}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/40" />
            {language === "zh" ? "缺失" : "Missing"}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
            {language === "zh" ? "未定义" : "N/A"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
