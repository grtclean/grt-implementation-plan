/**
 * 评审管理 Tab - 阶段评审流程 + AI智能建议
 * 使用Mock数据
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GATE_STATUSES } from "../../../../shared/stage-definitions";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  FileText, Sparkles, Lightbulb, Inbox,
} from "lucide-react";

interface MockReview {
  id: number;
  projectName: string;
  projectCode: string;
  gatePhase: string;
  gateName: string;
  status: string;
  reviewer: string;
  reviewNotes?: string;
  createdAt: string;
}

const MOCK_REVIEWS: MockReview[] = [
  { id: 1, projectName: "汽车动力总成超声波清洗线", projectCode: "GRT-2026-001", gatePhase: "M3", gateName: "立项评审", status: "approved", reviewer: "张总", reviewNotes: "商业价值明确，资源充足，批准立项", createdAt: "2026-01-15" },
  { id: 2, projectName: "半导体晶圆精密清洗设备", projectCode: "GRT-2026-002", gatePhase: "M5", gateName: "详细设计评审", status: "conditional", reviewer: "李工", reviewNotes: "BOM一致性需修正后重新提交", createdAt: "2026-02-01" },
  { id: 3, projectName: "医疗器械超声波清洗系统", projectCode: "GRT-2026-003", gatePhase: "M2", gateName: "方案设计评审", status: "in_review", reviewer: "王经理", createdAt: "2026-02-10" },
  { id: 4, projectName: "航空发动机叶片清洗线", projectCode: "GRT-2026-004", gatePhase: "M8", gateName: "FAT验收", status: "pending", reviewer: "赵工", createdAt: "2026-02-12" },
];

const statusIconMap: Record<string, React.ComponentType<{className?: string}>> = {
  pending: Clock, in_review: Clock, approved: CheckCircle2, rejected: XCircle, conditional: AlertTriangle,
};

const AI_STAGES = [
  { phase: "M1", name: "需求确认", desc: "基于历史项目推荐SOP和工艺流程" },
  { phase: "M2", name: "方案设计", desc: "推荐标准化清洗方案和BOM模板" },
  { phase: "M4", name: "方案冻结", desc: "推荐设计规范和评审文档模板" },
];

export default function ReviewManagement() {
  return (
    <div className="space-y-6">
      {/* 审批记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />阶段门审批记录</CardTitle>
          <CardDescription>所有项目的阶段门审批历史</CardDescription>
        </CardHeader>
        <CardContent>
          {MOCK_REVIEWS.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>暂无审批记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {MOCK_REVIEWS.map((review) => {
                const status = GATE_STATUSES[review.status] || GATE_STATUSES.pending;
                const StatusIcon = statusIconMap[review.status] || Clock;
                return (
                  <div key={review.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={"w-10 h-10 rounded-full flex items-center justify-center " + status.color}>
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{review.projectName} - {review.gatePhase}</div>
                          <div className="text-sm text-muted-foreground">{review.projectCode} · {review.gateName} · {review.reviewer}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={status.color}>{status.label}</Badge>
                        <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    {review.reviewNotes && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">{review.reviewNotes}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI推荐标准化方案 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />AI推荐标准化方案</CardTitle>
          <CardDescription>AI根据历史项目数据推荐标准化方案</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">AI推荐功能说明</h4>
                  <p className="text-sm text-muted-foreground mt-1">系统在特定阶段门自动分析历史数据，推荐SOP、工艺流程、BOM和文档模板。</p>
                </div>
              </div>
            </div>

            <h4 className="font-medium mb-3">支持AI推荐的阶段</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_STAGES.map((def) => (
                <div key={def.phase} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary">{def.phase}</Badge>
                    <span className="font-medium">{def.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{def.desc}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="w-4 h-4" />支持AI推荐
                  </div>
                </div>
              ))}
            </div>

            <h4 className="font-medium mb-3">推荐类型</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: "sop", name: "SOP推荐", desc: "标准操作流程" },
                { type: "process", name: "工艺推荐", desc: "清洗工艺流程" },
                { type: "bom", name: "BOM推荐", desc: "物料清单模板" },
                { type: "document", name: "文档推荐", desc: "评审文档模板" },
              ].map((item) => (
                <div key={item.type} className="p-3 border rounded-lg text-center hover:shadow-md transition-shadow">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
