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

const SEVERITY_CONFIG: Record<string, { color: string; icon: typeof Info; label: string }> = {
  info: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: Info, label: "信息" },
  warning: { color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertTriangle, label: "警告" },
  critical: { color: "text-red-600 bg-red-50 border-red-200", icon: AlertCircle, label: "严重" },
};

const PATTERN_LABELS: Record<string, string> = {
  time_waste: "时间浪费",
  recurring_inefficiency: "持续低效",
  over_meeting: "会议过多",
  optimal_pattern: "最佳模式",
};

export function MeetingPatternsTab() {
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
              <label className="text-sm font-medium">范围</label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">全组织</SelectItem>
                  <SelectItem value="department">部门</SelectItem>
                  <SelectItem value="individual">个人</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope !== "organization" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{scope === "department" ? "部门名" : "员工ID"}</label>
                <Input
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder={scope === "department" ? "研发部" : "employee-id"}
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
              检测模式
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
                {PATTERN_LABELS[type] || type}
                <Badge variant="outline" className="ml-2">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((p: any) => {
                const sev = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.info;
                const SevIcon = sev.icon;
                const isExpanded = expanded === p.id;

                return (
                  <div
                    key={p.id}
                    className={`border rounded-lg p-4 ${sev.color}`}
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
                        <Badge variant="outline" className="text-xs">{sev.label}</Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                        <p className="whitespace-pre-wrap">{p.description}</p>
                        {p.recommendation && (
                          <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                            <span className="font-medium">建议: </span>{p.recommendation}
                          </div>
                        )}
                        {p.metrics && (
                          <div className="text-xs opacity-70">
                            指标: {p.metrics}
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
            <p>暂无检测到的会议模式</p>
            <p className="text-sm">点击"检测模式"开始分析</p>
          </CardContent>
        </Card>
      )}

      {/* Meeting Culture Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            会议文化报告
          </CardTitle>
          <CardDescription>Meeting Culture Health Report</CardDescription>
        </CardHeader>
        <CardContent>
          {culture ? (
            <div className="space-y-4">
              {/* Culture metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.totalMeetings ?? 0}</div>
                  <div className="text-xs text-muted-foreground">总会议数</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.avgEffectiveness ?? 0}%</div>
                  <div className="text-xs text-muted-foreground">平均效能</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.decisionToMeetingRatio ?? 0}</div>
                  <div className="text-xs text-muted-foreground">决策/会议比</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-semibold">{culture.metrics?.uniqueParticipants ?? 0}</div>
                  <div className="text-xs text-muted-foreground">独立参与者</div>
                </div>
              </div>
              {/* AI narrative */}
              {culture.narrative && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-700">AI 分析</span>
                  </div>
                  <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                    {culture.narrative}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">加载中...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
