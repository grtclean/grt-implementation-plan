/**
 * QC通过→客户通知 (QC Pass Notification) — US-025
 * 终检通过自动通知客户 · FAT/SAT验收报告模板 · 排程建议
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle, Loader2, Sparkles, FileText, Mail, Paperclip, ListChecks, Calendar, Users,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EQUIPMENT_MODELS = [
  { value: "碳氢真空清洗机", label: "碳氢真空清洗机" },
  { value: "水基清洗线", label: "水基清洗线" },
  { value: "超声波清洗机", label: "超声波清洗机" },
  { value: "定制设备", label: "定制设备" },
];

interface QCPassResult {
  notificationId: string;
  customerNotification: {
    subject: string;
    body: string;
    attachments: string[];
  };
  acceptanceReport: {
    reportTitle: string;
    projectInfo: string;
    inspectionSummary: string;
    testItems: Array<{
      item: string;
      standard: string;
      result: string;
      status: string;
    }>;
    complianceStatement: string;
    nextSteps: string[];
    signoffRequired: Array<{
      role: string;
      responsibility: string;
    }>;
  };
  scheduleSuggestion: string;
  recommendations: string[];
}

export default function QCPassNotification() {
  const [projectName, setProjectName] = useState("");
  const [inspectionResult, setInspectionResult] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("碳氢真空清洗机");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspector, setInspector] = useState("");
  const [result, setResult] = useState<QCPassResult | null>(null);

  const mutation = trpc.p2Automation.generateAcceptanceNotification.useMutation({
    onSuccess: (data) => setResult(data as QCPassResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!projectName.trim() || !inspectionResult.trim() || !customerName.trim() || !equipmentModel || !inspectionDate || mutation.isPending) return;
    mutation.mutate({
      projectName,
      inspectionResult,
      customerName,
      equipmentModel,
      inspectionDate,
      inspector: inspector || undefined,
    });
  };

  const testStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pass":
      case "通过": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "fail":
      case "不通过": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const testStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "pass": return "通过";
      case "fail": return "不通过";
      default: return status;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={CheckCircle}
          title="QC通过→客户通知"
          description="终检通过自动通知客户 · FAT/SAT验收报告模板 · 排程建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI通知
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-primary" />
              检验信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">项目名称 *</label>
                <Input placeholder="项目名称" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户名称 *</label>
                <Input placeholder="客户名称" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备型号 *</label>
                <Select value={equipmentModel} onValueChange={(v) => setEquipmentModel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择设备型号" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">检验日期 *</label>
                <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">检验员（可选）</label>
                <Input placeholder="检验员" value={inspector} onChange={(e) => setInspector(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">检验结果汇总 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="检验结果汇总"
                value={inspectionResult}
                onChange={(e) => setInspectionResult(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!projectName.trim() || !inspectionResult.trim() || !customerName.trim() || !equipmentModel || !inspectionDate || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                生成通知
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Notification ID */}
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">通知编号</p>
                  <p className="text-3xl font-bold text-primary">{result.notificationId}</p>
                </div>
              </CardContent>
            </Card>

            {/* Customer Notification Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-primary" />
                  客户通知预览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded border bg-muted/10">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-xs text-muted-foreground mb-1">主题</p>
                    <p className="text-sm font-bold">{result.customerNotification.subject}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mb-4">{result.customerNotification.body}</p>
                  {result.customerNotification.attachments.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        附件
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.customerNotification.attachments.map((attachment, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{attachment}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Acceptance Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  验收报告
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-lg font-bold mb-1">{result.acceptanceReport.reportTitle}</p>
                  <p className="text-sm text-muted-foreground">{result.acceptanceReport.projectInfo}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">检验概要</p>
                  <p className="text-sm">{result.acceptanceReport.inspectionSummary}</p>
                </div>

                {/* Test Items Table */}
                {result.acceptanceReport.testItems.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">检验项目</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 pr-4">检验项</th>
                            <th className="text-left py-2 pr-4">标准</th>
                            <th className="text-left py-2 pr-4">结果</th>
                            <th className="text-left py-2">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.acceptanceReport.testItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-muted/50">
                              <td className="py-2 pr-4 font-medium">{item.item}</td>
                              <td className="py-2 pr-4 text-muted-foreground">{item.standard}</td>
                              <td className="py-2 pr-4 font-mono">{item.result}</td>
                              <td className="py-2">
                                <Badge className={testStatusColor(item.status)}>{testStatusLabel(item.status)}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Compliance Statement */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">合规声明</p>
                  <div className="p-3 rounded bg-green-500/5 border border-green-500/20">
                    <p className="text-sm">{result.acceptanceReport.complianceStatement}</p>
                  </div>
                </div>

                {/* Next Steps */}
                {result.acceptanceReport.nextSteps.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">后续步骤</p>
                    <ul className="space-y-2">
                      {result.acceptanceReport.nextSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <ListChecks className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Signoff Required Table */}
                {result.acceptanceReport.signoffRequired.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">需要签字确认</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 pr-4">角色</th>
                            <th className="text-left py-2">职责</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.acceptanceReport.signoffRequired.map((signoff, idx) => (
                            <tr key={idx} className="border-b border-muted/50">
                              <td className="py-2 pr-4 font-medium">{signoff.role}</td>
                              <td className="py-2">{signoff.responsibility}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Suggestion */}
            {result.scheduleSuggestion && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">排程建议</p>
                      <p className="text-sm">{result.scheduleSuggestion}</p>
                    </div>
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
  );
}
