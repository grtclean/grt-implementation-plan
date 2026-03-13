import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Bell,
  RefreshCw,
  FileText,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  DollarSign,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/grt";
import { trpc } from "@/lib/trpc";

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string; badge: string }> = {
  critical: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "destructive" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "secondary" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", badge: "outline" },
};

const SEVERITY_LABEL_KEYS: Record<string, string> = {
  critical: "meeting.digest.severityCritical",
  warning: "meeting.digest.severityWarning",
  info: "meeting.digest.severityInfo",
};

const HIGHLIGHT_ICONS: Record<string, any> = {
  cost: DollarSign,
  tension: AlertTriangle,
  action_stale: AlertCircle,
  topic_stalled: AlertCircle,
  hr_signal: Info,
};

export function DigestAlertsTab() {
  const { t } = useLanguage();
  const [digestType, setDigestType] = useState("weekly");
  const [scope, setScope] = useState("organization");
  const [scopeId, setScopeId] = useState("");
  const [expandedDigest, setExpandedDigest] = useState<number | null>(null);

  const generateMutation = trpc.ime.generateDigest.useMutation();
  const { data: history, isLoading: historyLoading } = trpc.ime.digestHistory.useQuery({ digestType, scope });
  const { data: alertsData, isLoading: alertsLoading } = trpc.ime.activeAlerts.useQuery({ scope });

  const activeAlerts = (alertsData as any)?.alerts ?? [];
  const totalCritical = (alertsData as any)?.totalCritical ?? 0;
  const totalWarning = (alertsData as any)?.totalWarning ?? 0;

  const digestHistory = (history ?? []) as any[];
  const generateResult = generateMutation.data as any;

  const handleGenerate = () => {
    generateMutation.mutate({
      digestType,
      scope,
      scopeId: scopeId || undefined,
    });
  };

  const severityLabel = (severity: string) =>
    t(SEVERITY_LABEL_KEYS[severity] || "meeting.digest.severityInfo");

  return (
    <div className="space-y-6">
      {/* Active alerts banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert: any, i: number) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg}`}>
                <Icon className={`h-5 w-5 ${config.color} shrink-0`} />
                <span className="text-sm flex-1">{alert.message}</span>
                <Badge variant={config.badge as any}>
                  {severityLabel(alert.severity)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />
            {t("meeting.digest.title")}
          </CardTitle>
          <CardDescription>{t("meeting.digest.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-1">
              <Button
                variant={digestType === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setDigestType("weekly")}
              >
                {t("meeting.digest.weekly")}
              </Button>
              <Button
                variant={digestType === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setDigestType("monthly")}
              >
                {t("meeting.digest.monthly")}
              </Button>
            </div>
            <Input
              placeholder={t("meeting.digest.scopePlaceholder")}
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="max-w-[200px]"
            />
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {t("meeting.digest.generateBtn")}
            </Button>
          </div>
          {generateMutation.isError && (
            <p className="text-sm text-red-500">{t("meeting.digest.generateFailed")}: {generateMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bell}
          label={t("meeting.digest.activeAlerts")}
          value={alertsLoading ? "..." : activeAlerts.length}
          subtitle={`${totalCritical} ${t("meeting.digest.criticalWarningSubtitle")} / ${totalWarning} ${t("meeting.digest.warningSubtitle")}`}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={BarChart3}
          label={t("meeting.digest.periodMeetings")}
          value={generateResult?.metrics?.meetingCount ?? "—"}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          icon={DollarSign}
          label={t("meeting.digest.periodCost")}
          value={generateResult?.metrics?.totalCost ? `¥${generateResult.metrics.totalCost}` : "—"}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Target}
          label={t("meeting.digest.periodEffectiveness")}
          value={generateResult?.metrics?.avgEffectiveness ? `${generateResult.metrics.avgEffectiveness}%` : "—"}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Generate result */}
      {generateResult && (
        <div className="space-y-4">
          {/* Narrative */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("meeting.digest.aiSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{generateResult.summary}</p>
            </CardContent>
          </Card>

          {/* Highlights */}
          {generateResult.highlights?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("meeting.digest.highlights")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {generateResult.highlights.map((h: any, i: number) => {
                  const Icon = HIGHLIGHT_ICONS[h.type] || Info;
                  const config = SEVERITY_CONFIG[h.severity] || SEVERITY_CONFIG.info;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{h.title}</span>
                        <span className="text-sm text-muted-foreground ml-2">{h.description}</span>
                      </div>
                      <Badge variant={config.badge as any} className="text-xs">
                        {severityLabel(h.severity)}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Generated alerts */}
          {generateResult.alerts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("meeting.digest.alerts")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {generateResult.alerts.map((a: any, i: number) => {
                  const config = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
                  const Icon = config.icon;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                      <span className="text-sm flex-1">{a.message}</span>
                      <Badge variant={config.badge as any}>
                        {severityLabel(a.severity)}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Metrics */}
          {generateResult.metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("meeting.digest.detailedMetrics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.newActionItems")}</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.newActionItems}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.completedActionItems")}</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.completedActionItems}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.overdueActionItems")}</div>
                    <div className="text-lg font-semibold text-red-600">{generateResult.metrics.staleActionItems}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.newTopics")}</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.topicsIntroduced}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.decidedTopics")}</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.topicsDecided}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.stalledTopics")}</div>
                    <div className="text-lg font-semibold text-amber-600">{generateResult.metrics.stalledTopics}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.hrSignals")}</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.hrSignals}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{t("meeting.digest.newPatterns")}</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.patterns}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Digest history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("meeting.digest.historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-center py-6 text-muted-foreground">{t("meeting.digest.loadingText")}</p>
          ) : digestHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.digest.thType")}</TableHead>
                  <TableHead>{t("meeting.digest.thScope")}</TableHead>
                  <TableHead>{t("meeting.digest.thPeriod")}</TableHead>
                  <TableHead className="text-center">{t("meeting.digest.thHighlights")}</TableHead>
                  <TableHead className="text-center">{t("meeting.digest.thAlerts")}</TableHead>
                  <TableHead className="text-center">{t("meeting.digest.thGeneratedAt")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {digestHistory.map((d: any) => (
                  <>
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedDigest(expandedDigest === d.id ? null : d.id)}
                    >
                      <TableCell>
                        <Badge variant="outline">{d.digestType === "weekly" ? t("meeting.digest.weekly") : d.digestType === "monthly" ? t("meeting.digest.monthly") : d.digestType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.scope}</TableCell>
                      <TableCell className="text-sm">{d.period}</TableCell>
                      <TableCell className="text-center">{d.highlights?.length ?? 0}</TableCell>
                      <TableCell className="text-center">
                        {d.alerts?.length > 0 ? (
                          <Badge variant={d.alerts.some((a: any) => a.severity === "critical") ? "destructive" : "secondary"}>
                            {d.alerts.length}
                          </Badge>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {d.generatedAt ? new Date(d.generatedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        {expandedDigest === d.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedDigest === d.id && (
                      <TableRow key={`${d.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="p-4 space-y-4">
                            {d.summary?.narrative && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">{t("meeting.digest.expandedAiSummary")}</h4>
                                <p className="text-sm text-muted-foreground">{d.summary.narrative}</p>
                              </div>
                            )}
                            {d.highlights?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">{t("meeting.digest.expandedHighlights")}</h4>
                                <div className="space-y-1">
                                  {d.highlights.map((h: any, i: number) => {
                                    const config = SEVERITY_CONFIG[h.severity] || SEVERITY_CONFIG.info;
                                    return (
                                      <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${config.bg}`}>
                                        <span className="font-medium">{h.title}:</span>
                                        <span className="text-muted-foreground">{h.description}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {d.alerts?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">{t("meeting.digest.expandedAlerts")}</h4>
                                <div className="space-y-1">
                                  {d.alerts.map((a: any, i: number) => {
                                    const config = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
                                    const Icon = config.icon;
                                    return (
                                      <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${config.bg}`}>
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                        <span>{a.message}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {d.metrics && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">{t("meeting.digest.expandedMetrics")}</h4>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">{t("meeting.digest.metricMeetingCount")}</div>
                                    <div className="font-semibold">{d.metrics.meetingCount}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">{t("meeting.digest.metricTotalCost")}</div>
                                    <div className="font-semibold">{d.metrics.totalCost}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">{t("meeting.digest.metricEffectiveness")}</div>
                                    <div className="font-semibold">{d.metrics.avgEffectiveness}%</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">{t("meeting.digest.metricSentiment")}</div>
                                    <div className="font-semibold">{d.metrics.avgSentiment}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">{t("meeting.digest.metricHrSignals")}</div>
                                    <div className="font-semibold">{d.metrics.hrSignals}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">{t("meeting.digest.metricPatterns")}</div>
                                    <div className="font-semibold">{d.metrics.patterns}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("meeting.digest.noHistoryData")}</p>
              <p className="text-sm">{t("meeting.digest.noHistoryHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
