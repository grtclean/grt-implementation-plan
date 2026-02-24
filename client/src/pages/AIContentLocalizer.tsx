/**
 * AI内容本地化 (AI Content Localizer)
 * 翻译本地化 · 术语管理 · 质量评分 · 文化适配
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Loader2, Sparkles, AlertTriangle, CheckCircle, BookOpen, Copy, Languages,
} from "lucide-react";

const LANGUAGES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "英文" },
  { value: "de", label: "德文" },
  { value: "fr", label: "法文" },
];

const CONTENT_TYPES = [
  { value: "技术文档", label: "技术文档" },
  { value: "报价单", label: "报价单" },
  { value: "安全警示", label: "安全警示" },
  { value: "用户手册", label: "用户手册" },
  { value: "营销材料", label: "营销材料" },
];

const INDUSTRIES = [
  { value: "汽车", label: "汽车" },
  { value: "半导体", label: "半导体" },
  { value: "工业通用", label: "工业通用" },
];

interface LocalizationResult {
  translatedContent: string;
  terminology: Array<{ source: string; target: string; notes: string }>;
  qualityScore: number;
  culturalNotes: string[];
  warnings: string[];
  alternatives: string[];
}

export default function AIContentLocalizer() {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("zh");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [contentType, setContentType] = useState("技术文档");
  const [industry, setIndustry] = useState("汽车");
  const [result, setResult] = useState<LocalizationResult | null>(null);

  const mutation = trpc.regionalCompliance.localizeContent.useMutation({
    onSuccess: (data) => setResult(data as LocalizationResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!content.trim() || mutation.isPending) return;
    mutation.mutate({
      content,
      sourceLanguage,
      targetLanguage,
      contentType,
      industry,
    });
  };

  const handleCopy = () => {
    if (result?.translatedContent) {
      navigator.clipboard.writeText(result.translatedContent);
    }
  };

  const qualityScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (score >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const qualityScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const qualityScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Globe}
          title={t("ai.localizer.title")}
          description={t("ai.localizer.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.localizer.aiLocalize")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-primary" />
              {t("ai.localizer.settings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("ai.localizer.content")}</label>
              <Textarea
                rows={8}
                placeholder={t("ai.localizer.contentPlaceholder")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.localizer.sourceLang")}</label>
                <Select value={sourceLanguage} onValueChange={(v) => setSourceLanguage(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.localizer.selectSourceLang")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.localizer.targetLang")}</label>
                <Select value={targetLanguage} onValueChange={(v) => setTargetLanguage(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.localizer.selectTargetLang")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.localizer.contentType")}</label>
                <Select value={contentType} onValueChange={(v) => setContentType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.localizer.selectContentType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.localizer.industry")}</label>
                <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.localizer.selectIndustry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!content.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.localizer.aiLocalize")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Quality Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("ai.localizer.qualityScore")}</p>
                    <p className={`text-5xl font-bold ${qualityScoreTextColor(result.qualityScore)}`}>{result.qualityScore}</p>
                  </div>
                  <Badge className={`text-lg px-4 py-2 ${qualityScoreColor(result.qualityScore)}`}>
                    {result.qualityScore >= 80 ? t("ai.localizer.excellent") : result.qualityScore >= 60 ? t("ai.localizer.good") : result.qualityScore >= 40 ? t("ai.localizer.fair") : t("ai.localizer.needsImprovement")}
                  </Badge>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${qualityScoreBarColor(result.qualityScore)}`}
                    style={{ width: `${result.qualityScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Translated Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Languages className="h-5 w-5 text-primary" />
                    {t("ai.localizer.translationResult")}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                    <Copy className="h-4 w-4" />
                    {t("ai.localizer.copy")}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={8}
                  readOnly
                  value={result.translatedContent}
                  className="bg-muted/50"
                />
              </CardContent>
            </Card>

            {/* Terminology Table */}
            {result.terminology.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {t("ai.localizer.terminology")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.localizer.sourceTerm")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.localizer.targetTerm")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.localizer.notes")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.terminology.map((term, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{term.source}</td>
                            <td className="py-2">{term.target}</td>
                            <td className="py-2 text-muted-foreground">{term.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cultural Notes */}
            {result.culturalNotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="h-5 w-5 text-blue-400" />
                    {t("ai.localizer.culturalNotes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.culturalNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-400">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    {t("ai.localizer.warnings")} ({result.warnings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-400">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Alternative Translations */}
            {result.alternatives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {t("ai.localizer.alternatives")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.alternatives.map((alt, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{alt}</span>
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
