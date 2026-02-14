import { useState } from "react";
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

const HIGHLIGHT_ICONS: Record<string, any> = {
  cost: DollarSign,
  tension: AlertTriangle,
  action_stale: AlertCircle,
  topic_stalled: AlertCircle,
  hr_signal: Info,
};

export function DigestAlertsTab() {
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
                  {alert.severity === "critical" ? "严重" : alert.severity === "warning" ? "警告" : "信息"}
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
            摘要与警报
          </CardTitle>
          <CardDescription>生成周报/月报摘要，查看活跃警报</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-1">
              <Button
                variant={digestType === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setDigestType("weekly")}
              >
                周报
              </Button>
              <Button
                variant={digestType === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setDigestType("monthly")}
              >
                月报
              </Button>
            </div>
            <Input
              placeholder="范围ID (可选)"
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
              生成报告
            </Button>
          </div>
          {generateMutation.isError && (
            <p className="text-sm text-red-500">生成失败: {generateMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bell}
          label="活跃警报"
          value={alertsLoading ? "..." : activeAlerts.length}
          subtitle={`${totalCritical} 严重 / ${totalWarning} 警告`}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={BarChart3}
          label="本期会议"
          value={generateResult?.metrics?.meetingCount ?? "—"}
          subtitle="Meetings This Period"
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          icon={DollarSign}
          label="本期花费"
          value={generateResult?.metrics?.totalCost ? `¥${generateResult.metrics.totalCost}` : "—"}
          subtitle="Total Cost"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={Target}
          label="本期效能"
          value={generateResult?.metrics?.avgEffectiveness ? `${generateResult.metrics.avgEffectiveness}%` : "—"}
          subtitle="Avg Effectiveness"
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
              <CardTitle className="text-base">AI 摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{generateResult.summary}</p>
            </CardContent>
          </Card>

          {/* Highlights */}
          {generateResult.highlights?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">重点事项</CardTitle>
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
                        {h.severity === "critical" ? "严重" : h.severity === "warning" ? "警告" : "信息"}
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
                <CardTitle className="text-base">警报</CardTitle>
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
                        {a.severity === "critical" ? "严重" : a.severity === "warning" ? "警告" : "信息"}
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
                <CardTitle className="text-base">详细指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">新建行动项</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.newActionItems}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">完成行动项</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.completedActionItems}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">逾期行动项</div>
                    <div className="text-lg font-semibold text-red-600">{generateResult.metrics.staleActionItems}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">新增议题</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.topicsIntroduced}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">已决议题</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.topicsDecided}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">停滞议题</div>
                    <div className="text-lg font-semibold text-amber-600">{generateResult.metrics.stalledTopics}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">HR信号</div>
                    <div className="text-lg font-semibold">{generateResult.metrics.hrSignals}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">新模式</div>
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
          <CardTitle className="text-base">历史报告</CardTitle>
          <CardDescription>Digest History</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-center py-6 text-muted-foreground">加载中...</p>
          ) : digestHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>范围</TableHead>
                  <TableHead>时段</TableHead>
                  <TableHead className="text-center">重点事项</TableHead>
                  <TableHead className="text-center">警报数</TableHead>
                  <TableHead className="text-center">生成时间</TableHead>
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
                        <Badge variant="outline">{d.digestType === "weekly" ? "周报" : d.digestType === "monthly" ? "月报" : d.digestType}</Badge>
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
                            {/* Narrative */}
                            {d.summary?.narrative && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">AI 摘要</h4>
                                <p className="text-sm text-muted-foreground">{d.summary.narrative}</p>
                              </div>
                            )}

                            {/* Highlights */}
                            {d.highlights?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">重点事项</h4>
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

                            {/* Alerts */}
                            {d.alerts?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">警报</h4>
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

                            {/* Metrics */}
                            {d.metrics && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">指标</h4>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">会议数</div>
                                    <div className="font-semibold">{d.metrics.meetingCount}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">总花费</div>
                                    <div className="font-semibold">¥{d.metrics.totalCost}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">效能</div>
                                    <div className="font-semibold">{d.metrics.avgEffectiveness}%</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">情感</div>
                                    <div className="font-semibold">{d.metrics.avgSentiment}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">HR信号</div>
                                    <div className="font-semibold">{d.metrics.hrSignals}</div>
                                  </div>
                                  <div className="p-2 rounded bg-background text-center">
                                    <div className="text-muted-foreground">新模式</div>
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
              <p>暂无历史报告</p>
              <p className="text-sm">请点击"生成报告"创建第一份摘要</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
