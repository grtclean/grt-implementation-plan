/**
 * 商机→需求转化 (US-016)
 * 商机信息自动转化为结构化技术需求文档
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Target, Loader2, Sparkles, CheckCircle, AlertTriangle, FileText,
  Users, Clock,
} from "lucide-react";

interface ConversionResult {
  requirementDoc: {
    projectName: string;
    customerProfile: string;
    technicalRequirements: string[];
    cleanlinessSpec: string;
    throughputSpec: string;
    budgetRange: string;
    timeline: string;
  };
  riskAssessment: Array<{
    risk: string;
    level: string;
    mitigation: string;
  }>;
  suggestedTeam: Array<{
    role: string;
    responsibility: string;
  }>;
  estimatedEffort: string;
  recommendations: string[];
}

export default function OpportunityConversion() {
  const { t } = useLanguage();
  const [opportunityName, setOpportunityName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [industry, setIndustry] = useState("汽车制造");
  const [productInterest, setProductInterest] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);

  const INDUSTRIES = [
    { value: "汽车制造", label: t("crm.conv.industryAuto") },
    { value: "半导体", label: t("crm.conv.industrySemiconductor") },
    { value: "精密加工", label: t("crm.conv.industryPrecision") },
    { value: "食品医药", label: t("crm.conv.industryFoodPharma") },
    { value: "航空航天", label: t("crm.conv.industryAerospace") },
    { value: "工业通用", label: t("crm.conv.industryGeneral") },
  ];

  const mutation = trpc.serviceSalesAdvanced.convertOpportunity.useMutation({
    onSuccess: (data) => setResult(data as ConversionResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!opportunityName.trim() || !customerName.trim() || !productInterest.trim() || mutation.isPending) return;
    mutation.mutate({
      opportunityName,
      customerName,
      industry,
      productInterest,
      budget: budget || undefined,
      notes: notes || undefined,
    });
  };

  const riskLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t("crm.conv.riskHigh")}</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t("crm.conv.riskMedium")}</Badge>;
      case "low":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t("crm.conv.riskLow")}</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Target}
          title={t("crm.conv.title")}
          description={t("crm.conv.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("crm.conv.aiConversion")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              {t("crm.conv.opportunityInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.conv.oppName")} *</label>
                <Input
                  placeholder={t("crm.conv.oppName")}
                  value={opportunityName}
                  onChange={(e) => setOpportunityName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.conv.customerName")} *</label>
                <Input
                  placeholder={t("crm.conv.customerName")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.conv.industry")} *</label>
                <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.conv.selectIndustry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("crm.conv.budgetRange")}</label>
                <Input
                  placeholder={t("crm.conv.budgetPlaceholder")}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("crm.conv.productInterest")} *</label>
              <Input
                placeholder={t("crm.conv.productPlaceholder")}
                value={productInterest}
                onChange={(e) => setProductInterest(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("crm.conv.notes")}</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                placeholder={t("crm.conv.notes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!opportunityName.trim() || !customerName.trim() || !productInterest.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("crm.conv.aiConvertRequirement")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Requirement Doc */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  {t("crm.conv.techRequirementDoc")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded bg-primary/5 border border-primary/20">
                  <h3 className="text-lg font-bold">{result.requirementDoc.projectName}</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("crm.conv.customerProfile")}</p>
                    <p className="text-sm">{result.requirementDoc.customerProfile}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("crm.conv.techRequirements")}</p>
                    <ul className="space-y-1">
                      {result.requirementDoc.technicalRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{t("crm.conv.cleanlinessStandard")}</p>
                      <p className="text-sm font-medium">{result.requirementDoc.cleanlinessSpec}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{t("crm.conv.throughputRequirement")}</p>
                      <p className="text-sm font-medium">{result.requirementDoc.throughputSpec}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{t("crm.conv.budgetRange")}</p>
                      <p className="text-sm font-medium">{result.requirementDoc.budgetRange}</p>
                    </div>
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{t("crm.conv.deliveryTime")}</p>
                      <p className="text-sm font-medium">{result.requirementDoc.timeline}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            {result.riskAssessment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    {t("crm.conv.riskAssessment")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.conv.risk")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.conv.level")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.conv.mitigation")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.riskAssessment.map((risk, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{risk.risk}</td>
                            <td className="py-2">{riskLevelBadge(risk.level)}</td>
                            <td className="py-2 text-muted-foreground">{risk.mitigation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Team */}
            {result.suggestedTeam.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-blue-400" />
                    {t("crm.conv.suggestedTeam")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.conv.role")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("crm.conv.responsibility")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.suggestedTeam.map((member, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{member.role}</td>
                            <td className="py-2 text-muted-foreground">{member.responsibility}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estimated Effort */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{t("crm.conv.estimatedEffort")}:</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-base px-3 py-1">
                    {result.estimatedEffort}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("crm.conv.aiRecommendations")}
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
