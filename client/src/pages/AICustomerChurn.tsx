/**
 * AI客户流失预测 (AI Customer Churn Prediction)
 * Phase G: 流失概率 · 健康评分 · 风险因子 · 挽留策略
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UserCheck, Loader2, Sparkles, AlertTriangle, Shield, Heart,
} from "lucide-react";

const INDUSTRIES = ["汽车制造", "半导体", "工业通用", "食品医药", "航空航天"];
const ORDER_FREQUENCIES = [
  { value: "季度", label: "季度" },
  { value: "半年", label: "半年" },
  { value: "年度", label: "年度" },
  { value: "不定期", label: "不定期" },
];

interface ChurnResult {
  churnProbability: number;
  riskLevel: string;
  churnFactors: Array<{ factor: string; weight: number; description: string }>;
  retentionActions: Array<{ action: string; priority: string; expectedImpact: string; timeline: string }>;
  customerHealthScore: number;
  recommendations: string[];
}

export default function AICustomerChurn() {
  const [customerName, setCustomerName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [contractValue, setContractValue] = useState("");
  const [lastOrderDate, setLastOrderDate] = useState("");
  const [orderFrequency, setOrderFrequency] = useState("年度");
  const [satisfactionScore, setSatisfactionScore] = useState("");
  const [complaintCount, setComplaintCount] = useState("");
  const [competitorActivity, setCompetitorActivity] = useState("");
  const [result, setResult] = useState<ChurnResult | null>(null);

  const mutation = trpc.salesFinanceIntelligence.predictChurn.useMutation({
    onSuccess: (data) => setResult(data as ChurnResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!customerName.trim() || !contractValue || !lastOrderDate || mutation.isPending) return;
    mutation.mutate({
      customerName,
      industry,
      contractValue: Number(contractValue),
      lastOrderDate,
      orderFrequency,
      satisfactionScore: satisfactionScore ? Number(satisfactionScore) : undefined,
      complaintCount: complaintCount ? Number(complaintCount) : undefined,
      competitorActivity: competitorActivity || undefined,
    });
  };

  const riskLevelConfig = (level: string) => {
    switch (level) {
      case "high": return { label: "高风险", color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "medium": return { label: "中风险", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
      case "low": return { label: "低风险", color: "bg-green-500/20 text-green-400 border-green-500/30" };
      default: return { label: level, color: "bg-muted text-muted-foreground" };
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) { case "high": return "紧急"; case "medium": return "重要"; case "low": return "一般"; default: return p; }
  };

  const churnColor = (prob: number) => {
    if (prob >= 70) return "text-red-400";
    if (prob >= 40) return "text-yellow-400";
    return "text-green-400";
  };

  const healthColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={UserCheck}
          title="AI客户流失预测"
          description="流失概率 · 健康评分 · 风险因子 · 挽留策略"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI预测
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-5 w-5 text-primary" />
              客户信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">客户名称</label>
                <Input placeholder="如: 上海大众汽车有限公司" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">所属行业</label>
                <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择行业" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">合同金额 (万元)</label>
                <Input type="number" placeholder="如: 200" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">最近订单日期</label>
                <Input type="date" value={lastOrderDate} onChange={(e) => setLastOrderDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">订单频率</label>
                <Select value={orderFrequency} onValueChange={(v) => setOrderFrequency(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择频率" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">满意度评分 1-10（可选）</label>
                <Input type="number" min={1} max={10} placeholder="如: 8" value={satisfactionScore} onChange={(e) => setSatisfactionScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">投诉次数（可选）</label>
                <Input type="number" min={0} placeholder="如: 2" value={complaintCount} onChange={(e) => setComplaintCount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">竞品动态（可选）</label>
              <Textarea placeholder="如: 某竞争对手近期在该客户所在区域推出低价促销活动..." value={competitorActivity} onChange={(e) => setCompetitorActivity(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!customerName.trim() || !contractValue || !lastOrderDate || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI预测
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Churn Probability + Health Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">流失概率</p>
                  <p className={`text-5xl font-bold ${churnColor(result.churnProbability)}`}>{result.churnProbability}%</p>
                  <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.churnProbability >= 70 ? "bg-red-500" : result.churnProbability >= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${result.churnProbability}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">风险等级</p>
                  <Badge className={`text-2xl px-4 py-2 mt-2 ${riskLevelConfig(result.riskLevel).color}`}>
                    {riskLevelConfig(result.riskLevel).label}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">客户健康评分</p>
                  <p className={`text-5xl font-bold ${healthColor(result.customerHealthScore)}`}>{result.customerHealthScore}</p>
                  <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.customerHealthScore >= 80 ? "bg-green-500" : result.customerHealthScore >= 60 ? "bg-blue-500" : result.customerHealthScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${result.customerHealthScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Churn Factors */}
            {result.churnFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    流失风险因子
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.churnFactors.map((f, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{f.factor}</span>
                          <span className="text-sm text-muted-foreground">{f.weight}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${f.weight}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Retention Actions */}
            {result.retentionActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="h-5 w-5 text-pink-400" />
                    挽留措施
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-muted-foreground font-medium">措施</th>
                          <th className="text-center py-2 text-muted-foreground font-medium">优先级</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">预期效果</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">时间线</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.retentionActions.map((a, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2">{a.action}</td>
                            <td className="py-2 text-center">
                              <Badge className={priorityColor(a.priority)}>{priorityLabel(a.priority)}</Badge>
                            </td>
                            <td className="py-2">{a.expectedImpact}</td>
                            <td className="py-2 text-right text-muted-foreground">{a.timeline}</td>
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
                    <Shield className="h-5 w-5 text-primary" />
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
