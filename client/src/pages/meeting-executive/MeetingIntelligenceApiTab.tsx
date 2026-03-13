import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Key, Plus, Trash2, RefreshCw, Copy, BarChart3, Shield, Globe,
  Activity, Eye, EyeOff, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const SCOPES = [
  { value: "read_analytics", label: "Analytics", desc: "Dashboard & effectiveness" },
  { value: "read_contributions", label: "Contributions", desc: "Meeting contributions & trends" },
  { value: "read_signals", label: "HR Signals", desc: "HR signal data" },
  { value: "write_webhooks", label: "Webhooks", desc: "Trigger webhook events" },
];

const API_ENDPOINTS = [
  { method: "GET", path: "/analytics/dashboard", scope: "read_analytics", desc: "Aggregated meeting analytics dashboard" },
  { method: "GET", path: "/contributions/:meetingId", scope: "read_contributions", desc: "Contribution breakdown for a meeting" },
  { method: "GET", path: "/effectiveness/:meetingId", scope: "read_analytics", desc: "Effectiveness scores for a meeting" },
  { method: "GET", path: "/employee/:employeeId/trend", scope: "read_contributions", desc: "Employee contribution trend over time" },
  { method: "GET", path: "/hr-signals", scope: "read_signals", desc: "List detected HR signals" },
  { method: "GET", path: "/department/:departmentId/rollup", scope: "read_analytics", desc: "Department-level analytics rollup" },
  { method: "POST", path: "/webhooks/trigger", scope: "write_webhooks", desc: "Dispatch a webhook event" },
  { method: "GET", path: "/meetings/effectiveness-list", scope: "read_analytics", desc: "List meetings with effectiveness scores" },
];

export function MeetingIntelligenceApiTab() {
  const { t } = useLanguage();
  // Create key form
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read_analytics"]);
  const [rateLimit, setRateLimit] = useState("1000");
  const [rateLimitWindow, setRateLimitWindow] = useState("hourly");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  // View state
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

  // Queries
  const dashboardQuery = trpc.ime.apiDashboard.useQuery();
  const keysQuery = trpc.ime.listApiKeys.useQuery();
  const logsQuery = trpc.ime.apiUsageLogs.useQuery({ limit: 50 });
  const usageStatsQuery = trpc.ime.apiKeyUsageStats.useQuery(
    { apiKeyId: selectedKeyId! },
    { enabled: !!selectedKeyId }
  );

  // Mutations
  const createMut = trpc.ime.createApiKey.useMutation({
    onSuccess: (data) => {
      setNewKey(data.apiKey);
      setKeyName("");
      setDescription("");
      setExpiresAt("");
      keysQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const revokeMut = trpc.ime.revokeApiKey.useMutation({
    onSuccess: () => { keysQuery.refetch(); dashboardQuery.refetch(); },
  });
  const regenMut = trpc.ime.regenerateApiKey.useMutation({
    onSuccess: (data) => { setNewKey(data.apiKey); keysQuery.refetch(); },
  });

  const dashboard = dashboardQuery.data as any;
  const keys = (keysQuery.data || []) as any[];
  const logs = (logsQuery.data || []) as any[];
  const usageStats = usageStatsQuery.data as any;

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = () => {
    if (!keyName.trim() || selectedScopes.length === 0) return;
    createMut.mutate({
      keyName: keyName.trim(),
      scopes: selectedScopes,
      rateLimit: parseInt(rateLimit) || 1000,
      rateLimitWindow,
      description: description.trim() || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const statusColor = (code: number) => {
    if (code < 300) return "text-green-600";
    if (code < 400) return "text-amber-600";
    return "text-red-600";
  };

  const methodBadge = (method: string) => (
    <Badge variant={method === "POST" ? "default" : "secondary"} className="text-xs font-mono">
      {method}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-indigo-500 opacity-70" />
              <div>
                <div className="text-2xl font-bold">{dashboard?.totalKeys ?? "..."}</div>
                <div className="text-xs text-muted-foreground">Total Keys</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500 opacity-70" />
              <div>
                <div className="text-2xl font-bold">{dashboard?.activeKeys ?? "..."}</div>
                <div className="text-xs text-muted-foreground">Active Keys</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-blue-500 opacity-70" />
              <div>
                <div className="text-2xl font-bold">{dashboard?.totalRequests ?? "..."}</div>
                <div className="text-xs text-muted-foreground">Total Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-amber-500 opacity-70" />
              <div>
                <div className="text-2xl font-bold">{dashboard?.requestsToday ?? "..."}</div>
                <div className="text-xs text-muted-foreground">Today's Requests</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-70" />
              <div>
                <div className="text-2xl font-bold">{dashboard?.avgErrorRate ?? "..."}%</div>
                <div className="text-xs text-muted-foreground">Error Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Create API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create API Key
          </CardTitle>
          <CardDescription>Generate a new API key for external system access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Key Name *</label>
              <Input
                placeholder="e.g. Dashboard Integration"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expires At</label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Scopes *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SCOPES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleScope(s.value)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    selectedScopes.includes(s.value)
                      ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Rate Limit</label>
              <Input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Window</label>
              <div className="flex gap-2 mt-1">
                {["hourly", "daily"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setRateLimitWindow(w)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      rateLimitWindow === w
                        ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMut.isPending || !keyName.trim() || selectedScopes.length === 0}
          >
            {createMut.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Key
          </Button>

          {newKey && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
              <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" />
                API Key Created — Copy it now, it won't be shown again!
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-sm break-all">
                  {newKey}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(newKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewKey(null)} className="text-xs">
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead className="text-center">Requests</TableHead>
                  <TableHead className="text-center">Rate Limit</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k: any) => {
                  const scopes = (() => { try { return JSON.parse(k.scopes); } catch { return []; } })();
                  const isRevealed = revealedKeys.has(k.id);
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.key_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono">
                            {isRevealed ? k.key_prefix + "..." : "••••••••••••"}
                          </code>
                          <button
                            onClick={() => setRevealedKeys((prev) => {
                              const next = new Set(prev);
                              if (next.has(k.id)) next.delete(k.id); else next.add(k.id);
                              return next;
                            })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scopes.map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">{s.replace("read_", "").replace("write_", "")}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{k.request_count ?? 0}</TableCell>
                      <TableCell className="text-center text-sm">
                        {k.rate_limit}/{k.rate_limit_window}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={k.is_active ? "default" : "secondary"}>
                          {k.is_active ? "Active" : "Revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedKeyId(selectedKeyId === k.id ? null : k.id)}
                            title="View usage stats"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          {k.is_active && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => regenMut.mutate({ id: k.id })}
                                disabled={regenMut.isPending}
                                title="Regenerate key"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => revokeMut.mutate({ id: k.id })}
                                disabled={revokeMut.isPending}
                                title="Revoke key"
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mb-3 opacity-30" />
              <p>No API keys created yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Usage Stats (when key selected) */}
      {selectedKeyId && usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage Stats — Key #{selectedKeyId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{usageStats.totalRequests}</div>
                <div className="text-xs text-muted-foreground">Total Requests</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{usageStats.successRate}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{usageStats.avgResponseTime}ms</div>
                <div className="text-xs text-muted-foreground">Avg Response Time</div>
              </div>
            </div>

            {usageStats.requestsByDay?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Requests by Day</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={usageStats.requestsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cnt" stroke="#6366f1" strokeWidth={2} name="Requests" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {usageStats.topEndpoints?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Top Endpoints</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-center">Requests</TableHead>
                      <TableHead className="text-center">Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageStats.topEndpoints.map((ep: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{ep.endpoint}</TableCell>
                        <TableCell>{methodBadge(ep.method)}</TableCell>
                        <TableCell className="text-center">{ep.cnt}</TableCell>
                        <TableCell className="text-center">{Math.round(Number(ep.avg_time))}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 5: API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            API Documentation
          </CardTitle>
          <CardDescription>REST API endpoints available at <code>/api/v1/ime</code></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">Authentication</p>
            <p className="text-muted-foreground">
              Include your API key in the <code className="bg-background px-1 py-0.5 rounded">X-API-Key</code> header:
            </p>
            <code className="block mt-2 p-2 bg-background rounded border text-xs font-mono">
              curl -H "X-API-Key: grt_ime_your_key_here" http://localhost:3000/api/v1/ime/analytics/dashboard
            </code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {API_ENDPOINTS.map((ep) => (
              <div key={ep.path} className="p-3 rounded-lg border space-y-1">
                <div className="flex items-center gap-2">
                  {methodBadge(ep.method)}
                  <code className="text-sm font-mono">{ep.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{ep.desc}</p>
                <Badge variant="outline" className="text-xs">{ep.scope}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Recent API Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent API Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Response Time</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.key_name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                    <TableCell>{methodBadge(log.method)}</TableCell>
                    <TableCell className={`text-center font-medium ${statusColor(log.status_code)}`}>
                      {log.status_code}
                    </TableCell>
                    <TableCell className="text-center">{log.response_time_ms}ms</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.requested_at ? new Date(log.requested_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-3 opacity-30" />
              <p>No API activity yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
