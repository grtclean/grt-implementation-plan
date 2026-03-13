/**
 * 相似项目搜索 (Similar Project Finder)
 * Phase D: AI语义检索 · 项目经验复用 · 参数匹配
 *
 * Rewrites the former mock HistoricalCases page with real AI-powered search.
 */
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BookOpen, Search, Sparkles, Star, Loader2, ChevronDown, ChevronUp,
  Factory, Wrench, Beaker,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchForm {
  industry: string;
  equipment: string;
  workpiece: string;
  material: string;
  standard: string;
  description: string;
}

interface SimilarMatch {
  caseId: string;
  customer: string;
  industry: string;
  equipment: string;
  similarity: number;
  explanation: string;
}

const EMPTY_FORM: SearchForm = {
  industry: "",
  equipment: "",
  workpiece: "",
  material: "",
  standard: "",
  description: "",
};

export default function HistoricalCases() {
  const { t } = useLanguage();
  const [form, setForm] = useState<SearchForm>(EMPTY_FORM);
  const [results, setResults] = useState<SimilarMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());
  const [taskId, setTaskId] = useState<number | null>(null);

  const searchMutation = trpc.projectIntelligence.findSimilar.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
    },
    onError: () => {
      setResults([]);
      setSearched(true);
    },
  });

  const taskQuery = trpc.projectIntelligence.getTaskResult.useQuery(
    { taskId: taskId! },
    {
      enabled: !!taskId,
      refetchInterval: (query) =>
        query.state.data?.taskStatus === "completed" || query.state.data?.taskStatus === "failed"
          ? false
          : 2000,
    },
  );

  useEffect(() => {
    if (!taskQuery.data || !taskId) return;
    if (taskQuery.data.taskStatus === "completed") {
      const data = taskQuery.data.result as { matches: SimilarMatch[] };
      setResults((data.matches || []) as SimilarMatch[]);
      setSearched(true);
      setTaskId(null);
    } else if (taskQuery.data.taskStatus === "failed") {
      setResults([]);
      setSearched(true);
      setTaskId(null);
    }
  }, [taskQuery.data, taskId]);

  const handleSearch = () => {
    const hasInput = Object.values(form).some((v) => v.trim());
    if (!hasInput || searchMutation.isPending || !!taskId) return;
    searchMutation.mutate(form);
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setResults([]);
    setSearched(false);
  };

  const toggleExpand = (idx: number) => {
    setExpandedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const severityColor = (similarity: number) => {
    if (similarity >= 80) return "bg-green-500/20 text-green-400";
    if (similarity >= 60) return "bg-blue-500/20 text-blue-400";
    if (similarity >= 40) return "bg-yellow-500/20 text-yellow-400";
    return "bg-muted text-muted-foreground";
  };

  const maxSimilarity = results.length > 0 ? Math.max(...results.map((r) => r.similarity)) : 0;

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={BookOpen}
          title={t("common.historicalCases.title")}
          description={t("common.historicalCases.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("common.historicalCases.aiEnhancedSearch")}
            </Badge>
          }
        />

        {/* Search form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-5 w-5 text-primary" />
              {t("common.historicalCases.searchCriteria")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("common.historicalCases.industry")}</label>
                <Input
                  placeholder={t("common.historicalCases.industryPlaceholder")}
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("common.historicalCases.equipmentModel")}</label>
                <Input
                  placeholder={t("common.historicalCases.equipmentPlaceholder")}
                  value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("common.historicalCases.workpiece")}</label>
                <Input
                  placeholder={t("common.historicalCases.workpiecePlaceholder")}
                  value={form.workpiece}
                  onChange={(e) => setForm({ ...form, workpiece: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("common.historicalCases.material")}</label>
                <Input
                  placeholder={t("common.historicalCases.materialPlaceholder")}
                  value={form.material}
                  onChange={(e) => setForm({ ...form, material: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("common.historicalCases.standard")}</label>
                <Input
                  placeholder={t("common.historicalCases.standardPlaceholder")}
                  value={form.standard}
                  onChange={(e) => setForm({ ...form, standard: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("common.historicalCases.freeDescription")}</label>
              <Textarea
                placeholder={t("common.historicalCases.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                {t("common.historicalCases.reset")}
              </Button>
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending || !!taskId || !Object.values(form).some((v) => v.trim())}
              >
                {searchMutation.isPending || !!taskId ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {t("common.historicalCases.aiSearch")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        {searched && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Factory className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-xs text-muted-foreground">{t("common.historicalCases.matchHits")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Star className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {maxSimilarity > 0 ? `${maxSimilarity}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("common.historicalCases.highestSimilarity")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Wrench className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {results.length > 0 ? results[0].equipment : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("common.historicalCases.recommendedModel")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((r, idx) => (
                <Card key={idx} className={idx === 0 ? "border-primary" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary/20 flex flex-col items-center justify-center">
                        <span className="text-xs text-muted-foreground">{t("common.historicalCases.similarity")}</span>
                        <span className="text-xl font-bold text-primary">{r.similarity}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={idx === 0 ? "default" : "secondary"}>
                            TOP {idx + 1}
                          </Badge>
                          <span className="font-mono text-sm">{r.caseId}</span>
                          <Badge variant="outline">{r.equipment}</Badge>
                          <Badge className={severityColor(r.similarity)}>
                            {r.industry}
                          </Badge>
                          {idx === 0 && (
                            <Badge className="bg-green-500/20 text-green-400 gap-1">
                              <Sparkles className="h-3 w-3" />
                              {t("common.historicalCases.bestMatch")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1">{r.customer}</p>
                        <button
                          onClick={() => toggleExpand(idx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-foreground"
                        >
                          {t("common.historicalCases.aiAnalysis")}
                          {expandedIdx.has(idx) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                        {expandedIdx.has(idx) && (
                          <p className="text-sm mt-2 p-3 rounded bg-muted">
                            {r.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Beaker className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>{t("common.historicalCases.noResults")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
  );
}
