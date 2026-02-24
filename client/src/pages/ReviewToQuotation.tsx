/**
 * 评审→报价关联 (US-022)
 * 技术评审结论自动填入报价模板 · 参数映射 · 缺失提醒
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FileCheck, Loader2, Sparkles, CheckCircle, AlertTriangle, FileText,
  ArrowRight, ClipboardList,
} from "lucide-react";

interface QuotationResult {
  quotationDraft: {
    projectName: string;
    productLine: string;
    configuration: string;
    specifications: Array<{ parameter: string; value: string; source: string }>;
    estimatedPrice: string;
    deliveryTime: string;
    warranty: string;
  };
  mappedParameters: Array<{ reviewParam: string; quotationField: string; value: string; confidence: number }>;
  missingInfo: string[];
  recommendations: string[];
}

export default function ReviewToQuotation() {
  const { t } = useLanguage();
  const [reviewId, setReviewId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [reviewConclusions, setReviewConclusions] = useState("");
  const [technicalParameters, setTechnicalParameters] = useState("");
  const [approvedSpecs, setApprovedSpecs] = useState("");
  const [result, setResult] = useState<QuotationResult | null>(null);

  const mutation = trpc.p2Automation.linkReviewToQuotation.useMutation({
    onSuccess: (data) => setResult(data as QuotationResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!reviewId.trim() || !projectName.trim() || !reviewConclusions.trim() || !technicalParameters.trim() || mutation.isPending) return;
    mutation.mutate({
      reviewId,
      projectName,
      reviewConclusions,
      technicalParameters,
      approvedSpecs: approvedSpecs || undefined,
    });
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "bg-green-500";
    if (c >= 0.6) return "bg-blue-500";
    if (c >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  };

  const confidenceBadgeColor = (c: number) => {
    if (c >= 0.8) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (c >= 0.6) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (c >= 0.4) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={FileCheck}
          title={t("crm.review.title")}
          description={t("crm.review.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("crm.review.aiLink")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-5 w-5 text-primary" />
              {t("crm.review.reviewInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.review.reviewId")} *</label>
                <Input placeholder={t("crm.review.reviewIdPlaceholder")} value={reviewId} onChange={(e) => setReviewId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.review.projectName")} *</label>
                <Input placeholder={t("crm.review.projectNamePlaceholder")} value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("crm.review.conclusions")} *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("crm.review.conclusionsPlaceholder")} value={reviewConclusions} onChange={(e) => setReviewConclusions(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("crm.review.techParams")} *</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]" placeholder={t("crm.review.techParamsPlaceholder")} value={technicalParameters} onChange={(e) => setTechnicalParameters(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("crm.review.approvedSpecs")}</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder={t("crm.review.approvedSpecsPlaceholder")} value={approvedSpecs} onChange={(e) => setApprovedSpecs(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!reviewId.trim() || !projectName.trim() || !reviewConclusions.trim() || !technicalParameters.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("crm.review.aiGenerateQuote")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Quotation Draft */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  {t("crm.review.quoteDraft")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("crm.review.projectName")}</p>
                    <p className="text-sm font-medium">{result.quotationDraft.projectName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("crm.review.productLine")}</p>
                    <Badge variant="outline">{result.quotationDraft.productLine}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("crm.review.configPlan")}</p>
                  <p className="text-sm">{result.quotationDraft.configuration}</p>
                </div>

                {/* Specifications Table */}
                {result.quotationDraft.specifications.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t("crm.review.techSpecs")}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.parameter")}</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.value")}</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.source")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.quotationDraft.specifications.map((spec, idx) => (
                            <tr key={idx} className="border-b border-muted/50">
                              <td className="py-2 font-medium">{spec.parameter}</td>
                              <td className="py-2">{spec.value}</td>
                              <td className="py-2 text-muted-foreground">{spec.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">{t("crm.review.estimatedPrice")}</p>
                    <p className="text-lg font-bold text-primary">{result.quotationDraft.estimatedPrice}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">{t("crm.review.deliveryCycle")}</p>
                    <p className="text-lg font-bold">{result.quotationDraft.deliveryTime}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">{t("crm.review.warrantyPeriod")}</p>
                    <p className="text-lg font-bold">{result.quotationDraft.warranty}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parameter Mapping */}
            {result.mappedParameters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    {t("crm.review.paramMapping")} ({result.mappedParameters.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.reviewParam")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground"></th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.quoteField")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.value")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.review.confidence")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.mappedParameters.map((mp, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{mp.reviewParam}</td>
                            <td className="py-2"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                            <td className="py-2">{mp.quotationField}</td>
                            <td className="py-2">{mp.value}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${confidenceColor(mp.confidence)}`}
                                    style={{ width: `${mp.confidence * 100}%` }}
                                  />
                                </div>
                                <Badge className={confidenceBadgeColor(mp.confidence)}>
                                  {Math.round(mp.confidence * 100)}%
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missing Info */}
            {result.missingInfo.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    {t("crm.review.missingInfo")} ({result.missingInfo.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.missingInfo.map((info, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-400">{info}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("crm.review.aiRecommendations")}
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
