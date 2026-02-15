/**
 * BOM冻结→生产联动 (BOM Freeze Automation) — US-024
 * BOM冻结自动通知生产部门 · 排程任务创建 · 物料就绪检查
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Lock, Loader2, Sparkles, CheckCircle, AlertTriangle, Calendar, Users, Package, Mail,
} from "lucide-react";

interface BOMFreezeResult {
  notificationId: string;
  bomId: string;
  projectName: string;
  schedulingTask: {
    priority: string;
    suggestedStartDate: string;
    estimatedDuration: string;
    prerequisites: string[];
  };
  materialReadiness: Array<{
    material: string;
    status: string;
    leadTime: string;
    action: string;
  }>;
  longLeadItems: string[];
  notificationContent: string;
  recipients: Array<{
    role: string;
    name: string;
  }>;
  recommendations: string[];
}

export default function BOMFreezeAutomation() {
  const [bomId, setBomId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [bomVersion, setBomVersion] = useState("");
  const [frozenBy, setFrozenBy] = useState("");
  const [materialCount, setMaterialCount] = useState("");
  const [criticalParts, setCriticalParts] = useState("");
  const [result, setResult] = useState<BOMFreezeResult | null>(null);

  const mutation = trpc.p2Automation.triggerBOMFreezeNotification.useMutation({
    onSuccess: (data) => setResult(data as BOMFreezeResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!bomId.trim() || !projectName.trim() || !bomVersion.trim() || !frozenBy.trim() || !materialCount || mutation.isPending) return;
    mutation.mutate({
      bomId,
      projectName,
      bomVersion,
      frozenBy,
      materialCount: Number(materialCount),
      criticalParts: criticalParts || undefined,
    });
  };

  const priorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
      case "高": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
      case "中": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
      case "低": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const materialStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready":
      case "就绪": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "ordering":
      case "订购中": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "critical":
      case "紧急": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const materialStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready": return "就绪";
      case "ordering": return "订购中";
      case "critical": return "紧急";
      default: return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Lock}
          title="BOM冻结→生产联动"
          description="BOM冻结自动通知生产部门 · 排程任务创建 · 物料就绪检查"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI联动
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-primary" />
              BOM冻结信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">BOM编号 *</label>
                <Input placeholder="BOM编号" value={bomId} onChange={(e) => setBomId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">项目名称 *</label>
                <Input placeholder="项目名称" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">BOM版本 *</label>
                <Input placeholder="如: V3.2" value={bomVersion} onChange={(e) => setBomVersion(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">冻结人 *</label>
                <Input placeholder="冻结人" value={frozenBy} onChange={(e) => setFrozenBy(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">物料行数 *</label>
                <Input type="number" placeholder="物料行数" value={materialCount} onChange={(e) => setMaterialCount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">关键长周期物料（可选）</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                placeholder="关键长周期物料"
                value={criticalParts}
                onChange={(e) => setCriticalParts(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!bomId.trim() || !projectName.trim() || !bomVersion.trim() || !frozenBy.trim() || !materialCount || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                触发冻结联动
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Notification ID + BOM Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">通知编号</p>
                    <p className="text-3xl font-bold text-primary">{result.notificationId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-sm">BOM: {result.bomId}</Badge>
                    <Badge variant="outline" className="text-sm">{result.projectName}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling Task */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-primary" />
                  排程任务
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">优先级</p>
                    <Badge className={priorityColor(result.schedulingTask.priority)}>
                      {result.schedulingTask.priority}
                    </Badge>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">建议开始日期</p>
                    <p className="text-lg font-bold">{result.schedulingTask.suggestedStartDate}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">预计工期</p>
                    <p className="text-lg font-bold">{result.schedulingTask.estimatedDuration}</p>
                  </div>
                </div>
                {result.schedulingTask.prerequisites.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">前置条件</p>
                    <ul className="space-y-2">
                      {result.schedulingTask.prerequisites.map((prereq, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Material Readiness Table */}
            {result.materialReadiness.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-primary" />
                    物料就绪状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">物料</th>
                          <th className="text-left py-2 pr-4">状态</th>
                          <th className="text-left py-2 pr-4">交期</th>
                          <th className="text-left py-2">所需行动</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.materialReadiness.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.material}</td>
                            <td className="py-2 pr-4">
                              <Badge className={materialStatusColor(item.status)}>{materialStatusLabel(item.status)}</Badge>
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{item.leadTime}</td>
                            <td className="py-2">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Long Lead Items Warning */}
            {result.longLeadItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    长周期物料预警
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.longLeadItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm p-2 rounded border border-red-500/30 bg-red-500/5">
                        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Notification Content Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-primary" />
                  通知内容预览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded border bg-muted/10">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-xs text-muted-foreground">发送通知</p>
                    <p className="text-sm font-medium">BOM冻结通知 - {result.projectName}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{result.notificationContent}</p>
                </div>
              </CardContent>
            </Card>

            {/* Recipients Table */}
            {result.recipients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    通知接收人
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">角色</th>
                          <th className="text-left py-2">姓名</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.recipients.map((recipient, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{recipient.role}</td>
                            <td className="py-2">{recipient.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    AI建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
