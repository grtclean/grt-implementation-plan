import { useState } from "react";
import {
  Search,
  AlertTriangle,
  Info,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

const SEVERITY_ICON: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-blue-600 bg-blue-50 border-blue-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  critical: "text-red-600 bg-red-50 border-red-200",
};

const PATTERN_LABEL_KEYS: Record<string, string> = {
  time_waste: "meeting.patterns.timeWaste",
  recurring_inefficiency: "meeting.patterns.recurringInefficiency",
  over_meeting: "meeting.patterns.overMeeting",
  optimal_pattern: "meeting.patterns.optimalPattern",
};

const SEVERITY_LABEL_KEYS: Record<string, string> = {
  info: "meeting.patterns.severityInfo",
  warning: "meeting.patterns.severityWarning",
  critical: "meeting.patterns.severityCritical",
};

export function MeetingPatternsTab() {
  const { t } = useLanguage();
  const [scope, setScope] = useState("organization");
  const [scopeId, setScopeId] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const insightsQuery = trpc.ime.patternInsights.useQuery(
    { scope: scope !== "organization" ? scope : undefined, scopeId: scopeId || undefined }
  );
  const cultureQuery = trpc.ime.meetingCultureReport.useQuery({});
  const detectMutation = trpc.ime.detectPatterns.useMutation({
    onSuccess: () => insightsQuery.refetch(),
  });

  const patterns = (insightsQuery.data ?? []) as any[];
  const culture = cultureQuery.data as any;

  // Group patterns by type
  const grouped: Record<string, any[]> = {};
  for (const p of patterns) {
    const type = p.pattern_type || "other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(p);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("meeting.patterns.scope")}</label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">{t("meeting.patterns.orgScope")}</SelectItem>
                  <SelectItem value="department">{t("meeting.patterns.deptScope")}</SelectItem>
                  <SelectItem value="individual">{t("meeting.patterns.individualScope")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope !== "organization" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{scope === "department" ? t("meeting.patterns.deptName") : t("meeting.patterns.employeeId")}</label>
                <Input
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder={scope === "department" ? t("meeting.patterns.deptPlaceholder") : t("meeting.patterns.employeePlaceholder")}
                  className="w-[160px]"
                />
              </div>
            )}
            <Button
              onClick={() => detectMutation.mutate({ scope, scopeId: scopeId || undefined })}
              disabled={detectMutation.isPending}
            >
              {detectMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {t("meeting.patterns.detect")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Cards grouped by type */}
      {Object.entries(grouped).length > 0 ? (
        Object.entries(grouped).map(([type, items]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {t(PATTERN_LABEL_KEYS[type] || `meeting.patterns.${type}`)}
                <Badge variant="outline" className="ml-2">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((p: any) => {
                const sevColor = SEVERITY_COLORS[p.severity] || SEVERITY_COLORS.info;
                const SevIcon = SEVERITY_ICON[p.severity] || Info;
                const isExpanded = expanded === p.id;

                return (
                  <div
                    key={p.id}
                    className={`border rounded-lg p-4 ${sevColor}`}
                  >
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : p.id)}
                    >
                      <div className="flex items-start gap-3">
                        <SevIcon className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-medium text-sm">{p.title}</h4>
                          <p className="text-xs mt-1 opacity-80">
                            {p.scope}{p.scope_id ? ` · ${p.scope_id}` : ""} · {new Date(p.detected_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{t(SEVERITY_LABEL_KEYS[p.severity] || "meeting.patterns.severityInfo")}</Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                        <p className="whitespace-pre-wrap">{p.description}</p>
                        {p.recommendation && (
                          <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                            <span className="font-medium">{t("meeting.patterns.suggestion")}: </span>{p.recommendation}
                          </div>
                        )}
                        {p.metrics && (
                          <div className="text-xs opacity-70">
                            {t("meeting.patterns.metrics")}: {p.metrics}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("meeting.patterns.noPatterns")}</p>
            <p className="text-sm">{t("meeting.patterns.pleaseDetect")}</p>
          </CardContent>
        </Card>
      )}

      {/* Meeting Culture Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            {t("meeting.patterns.cultureReport")}
          </CardTitle>
          <CardDescription>{t("meeting.patterns.cultureReportDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {culture ? (
            <div className="space-y-4">
              {/* Culture metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.totalMeetings ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{t("meeting.patterns.totalMeetings")}</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.avgEffectiveness ?? 0}%</div>
                  <div className="text-xs text-muted-foreground">{t("meeting.patterns.avgEffectiveness")}</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.decisionToMeetingRatio ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{t("meeting.patterns.decisionRatio")}</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.uniqueParticipants ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{t("meeting.patterns.uniqueParticipants")}</div>
                </div>
              </div>
              {/* AI narrative */}
              {culture.narrative && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-700">{t("meeting.patterns.aiAnalysis")}</span>
                  </div>
                  <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                    {culture.narrative}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">{t("meeting.patterns.loading")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
