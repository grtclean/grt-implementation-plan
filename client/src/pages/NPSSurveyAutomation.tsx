/**
 * NPS满意度自动化 (US-021)
 * 工单关闭自动推送满意度问卷 · NPS评分 · 趋势分析
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle, Loader2, Sparkles, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, ListChecks, BarChart3,
} from "lucide-react";

const SERVICE_TYPES = [
  { value: "设备安装", label: "设备安装" },
  { value: "维修服务", label: "维修服务" },
  { value: "定期维护", label: "定期维护" },
  { value: "技术培训", label: "技术培训" },
];

interface SurveyResult {
  surveyId: string;
  customerName: string;
  questions: Array<{ id: number; question: string; type: string; options?: string[] }>;
  npsQuestion: string;
  trendAnalysis: {
    currentPeriodAvg: number;
    previousPeriodAvg: number;
    trend: string;
    topIssues: string[];
  };
  recommendations: string[];
}

export default function NPSSurveyAutomation() {
  const { t } = useLanguage();
  const [ticketId, setTicketId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [serviceType, setServiceType] = useState("设备安装");
  const [engineerName, setEngineerName] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [historicalNPS, setHistoricalNPS] = useState("");
  const [result, setResult] = useState<SurveyResult | null>(null);

  const mutation = trpc.p2Automation.generateNPSSurvey.useMutation({
    onSuccess: (data) => setResult(data as SurveyResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!ticketId.trim() || !customerName.trim() || !engineerName.trim() || !resolutionSummary.trim() || mutation.isPending) return;
    mutation.mutate({
      ticketId,
      customerName,
      serviceType,
      engineerName,
      resolutionSummary,
      historicalNPS: historicalNPS || undefined,
    });
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-5 w-5 text-green-400" />;
      case "down": return <TrendingDown className="h-5 w-5 text-red-400" />;
      default: return <Minus className="h-5 w-5 text-yellow-400" />;
    }
  };

  const trendLabel = (trend: string) => {
    switch (trend) {
      case "up": return t("afterSales.nps.trendUp");
      case "down": return t("afterSales.nps.trendDown");
      default: return t("afterSales.nps.trendFlat");
    }
  };

  const trendColor = (trend: string) => {
    switch (trend) {
      case "up": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "down": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "rating": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "nps": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "text": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "multiple_choice": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "rating": return t("afterSales.nps.typeRating");
      case "nps": return "NPS";
      case "text": return t("afterSales.nps.typeText");
      case "multiple_choice": return t("afterSales.nps.typeMultiple");
      case "single_choice": return t("afterSales.nps.typeSingle");
      default: return type;
    }
  };

  const npsScoreColor = (score: number) => {
    if (score >= 9) return "text-green-400";
    if (score >= 7) return "text-yellow-400";
    return "text-red-400";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={MessageCircle}
          title={t("afterSales.nps.title")}
          description={t("afterSales.nps.desc")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("afterSales.nps.aiBadge")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-primary" />
              {t("afterSales.nps.serviceInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("afterSales.nps.ticketId")}</label>
                <Input placeholder={t("afterSales.nps.ticketIdPlaceholder")} value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("afterSales.nps.customerName")}</label>
                <Input placeholder={t("afterSales.nps.customerNamePlaceholder")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("afterSales.nps.serviceType")}</label>
                <Select value={serviceType} onValueChange={(v) => setServiceType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("afterSales.nps.selectServiceType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("afterSales.nps.engineerName")}</label>
                <Input placeholder={t("afterSales.nps.engineerNamePlaceholder")} value={engineerName} onChange={(e) => setEngineerName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("afterSales.nps.resolutionSummary")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("afterSales.nps.resolutionSummaryPlaceholder")} value={resolutionSummary} onChange={(e) => setResolutionSummary(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("afterSales.nps.historicalData")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("afterSales.nps.historicalDataPlaceholder")} value={historicalNPS} onChange={(e) => setHistoricalNPS(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!ticketId.trim() || !customerName.trim() || !engineerName.trim() || !resolutionSummary.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("afterSales.nps.generateBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Survey ID + NPS Question */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="text-base px-3 py-1">{t("afterSales.nps.survey")} {result.surveyId}</Badge>
                  <span className="text-sm text-muted-foreground">{t("afterSales.nps.customer")}: {result.customerName}</span>
                </div>
                <div className="p-4 rounded bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t("afterSales.nps.coreQuestion")}</p>
                  <p className="font-medium">{result.npsQuestion}</p>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            {result.questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-5 w-5 text-primary" />
                    {t("afterSales.nps.surveyQuestions")} ({result.questions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.questions.map((q) => (
                      <div key={q.id} className="p-3 rounded border bg-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-muted-foreground">Q{q.id}</span>
                              <Badge className={typeColor(q.type)}>{typeLabel(q.type)}</Badge>
                            </div>
                            <p className="text-sm font-medium">{q.question}</p>
                          </div>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.options.map((opt, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{opt}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trend Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {t("afterSales.nps.trendAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t("afterSales.nps.currentPeriodAvg")}</p>
                    <p className={`text-3xl font-bold ${npsScoreColor(result.trendAnalysis.currentPeriodAvg)}`}>
                      {result.trendAnalysis.currentPeriodAvg}
                    </p>
                  </div>
                  <div className="p-4 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t("afterSales.nps.previousPeriodAvg")}</p>
                    <p className={`text-3xl font-bold ${npsScoreColor(result.trendAnalysis.previousPeriodAvg)}`}>
                      {result.trendAnalysis.previousPeriodAvg}
                    </p>
                  </div>
                  <div className="p-4 rounded bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t("afterSales.nps.trend")}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {trendIcon(result.trendAnalysis.trend)}
                      <Badge className={trendColor(result.trendAnalysis.trend)}>
                        {trendLabel(result.trendAnalysis.trend)}
                      </Badge>
                    </div>
                  </div>
                </div>
                {result.trendAnalysis.topIssues.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("afterSales.nps.topIssues")}</p>
                    <ul className="space-y-2">
                      {result.trendAnalysis.topIssues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("afterSales.nps.aiRecommendations")}
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
