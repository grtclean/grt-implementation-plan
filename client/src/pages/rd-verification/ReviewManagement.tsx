/**
 * 评审管理 Tab - 阶段评审流程 + AI智能建议
 * 来源: ProjectGate(reviews + AI)
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { STAGES, GATE_STATUSES } from "../../../../shared/stage-definitions";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  FileText, Sparkles, Lightbulb, Inbox,
} from "lucide-react";

const statusIcons: Record<string, any> = {
  pending: Clock,
  in_review: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  conditional: AlertTriangle,
};

export default function ReviewManagement() {
  // 获取评审数据
  const { data: gateReviewsData, isLoading: reviewsLoading } = (trpc.projectGate as any).getGateReviews.useQuery({});
  const gateReviews = Array.isArray(gateReviewsData) ? gateReviewsData : (gateReviewsData?.reviews || []);

  // 获取阶段门定义 (用于AI推荐)
  const { data: gateDefinitionsData, isLoading: defsLoading } = (trpc.projectGate as any).getGateDefinitions.useQuery();
  const gateDefinitions = Array.isArray(gateDefinitionsData) ? gateDefinitionsData : (gateDefinitionsData?.definitions || []);

  return (
    <div className="space-y-6">
      {/* 审批记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            阶段门审批记录
          </CardTitle>
          <CardDescription>所有项目的阶段门审批历史</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : gateReviews.length > 0 ? (
            <div className="space-y-3">
              {gateReviews.map((review: any) => {
                const status = GATE_STATUSES[review.status] || GATE_STATUSES.pending;
                const StatusIcon = statusIcons[review.status] || Clock;
                return (
                  <div key={review.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.color}`}>
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {review.project_name} - {review.gate_phase}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {review.project_code} · {review.gate_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={status.color}>{status.label}</Badge>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {review.review_notes && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                        {review.review_notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无审批记录</p>
              <p className="text-sm mt-2">项目提交阶段门审批后将在此显示</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI推荐标准化方案 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI推荐标准化方案
          </CardTitle>
          <CardDescription>
            在M1、M2、M4阶段，AI将根据历史项目数据推荐标准化的SOP、工艺流程和BOM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* AI推荐说明 */}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">AI推荐功能说明</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    系统会在特定阶段门自动分析历史项目数据，推荐相似项目的标准化方案，包括：
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>- <strong>SOP</strong>：标准操作流程</li>
                    <li>- <strong>工艺流程</strong>：清洗工艺参数和流程</li>
                    <li>- <strong>BOM</strong>：物料清单模板</li>
                    <li>- <strong>文档模板</strong>：评审文档和报告模板</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 支持AI推荐的阶段 */}
            {defsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div>
                <h4 className="font-medium mb-3">支持AI推荐的阶段</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {gateDefinitions?.filter((d: any) => d.aiRecommendation).map((def: any) => (
                    <div key={def.phase} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary">{def.phase}</Badge>
                        <span className="font-medium">{def.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{def.description}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                        <Sparkles className="w-4 h-4" />
                        支持AI推荐
                      </div>
                    </div>
                  ))}
                  {gateDefinitions?.filter((d: any) => d.aiRecommendation).length === 0 && (
                    <div className="col-span-3 text-center py-8 text-muted-foreground">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>暂无已启用AI推荐的阶段</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 推荐类型 */}
            <div>
              <h4 className="font-medium mb-3">推荐类型</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { type: 'sop', name: 'SOP推荐', desc: '标准操作流程' },
                  { type: 'process', name: '工艺推荐', desc: '清洗工艺流程' },
                  { type: 'bom', name: 'BOM推荐', desc: '物料清单模板' },
                  { type: 'document', name: '文档推荐', desc: '评审文档模板' },
                ].map((item) => (
                  <div key={item.type} className="p-3 border rounded-lg text-center hover:shadow-md transition-shadow">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
