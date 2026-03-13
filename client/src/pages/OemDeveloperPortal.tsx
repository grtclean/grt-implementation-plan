/**
 * OEM Developer Portal — B2B Open Gateway
 *
 * Stripe/AWS-style developer console for OEM customers to manage
 * API keys, webhook subscriptions, and monitor API usage analytics.
 *
 * 4 tabs: Credentials | Webhooks | Analytics | Event Log
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Key, Webhook, BarChart3, ScrollText, Copy, RotateCcw, Trash2, Play,
  ShieldCheck, Clock, Zap, AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff,
  Plus, RefreshCw, Code2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Theme ────────────────────────────────────────────────────

const OEM_BG = "bg-[#0a0e1a]";
const OEM_CARD = "bg-[#111827] border-[#1f2937]";
const OEM_TEXT = "text-[#e2e8f0]";
const OEM_MUTED = "text-[#64748b]";
const OEM_INPUT = "bg-[#0f172a] border-[#334155] text-[#e2e8f0] placeholder:text-[#475569]";

// ── Demo Data ────────────────────────────────────────────────

const DEMO_KEYS = [
  { id: 1, keyName: "Production API Key", keyPrefix: "grt_7f3a2b9c", scopes: ["read:cleanliness", "read:oee", "read:equipment"], status: "active" as const, rateLimitPerHour: 5000, lastUsedAt: "2026-03-11T08:23:15Z", createdAt: "2026-01-15T10:00:00Z", revokedAt: null },
  { id: 2, keyName: "Staging / Test Key", keyPrefix: "grt_e4d19c8b", scopes: ["read:cleanliness", "read:oee"], status: "active" as const, rateLimitPerHour: 1000, lastUsedAt: "2026-03-10T15:42:00Z", createdAt: "2026-02-20T14:30:00Z", revokedAt: null },
  { id: 3, keyName: "Legacy Integration (Deprecated)", keyPrefix: "grt_1a8b3f02", scopes: ["read:oee"], status: "revoked" as const, rateLimitPerHour: 500, lastUsedAt: "2026-02-01T09:00:00Z", createdAt: "2025-11-01T08:00:00Z", revokedAt: "2026-03-01T12:00:00Z" },
];

const DEMO_WEBHOOKS = [
  { id: 1, endpointUrl: "https://mes.volkswagen.com/api/grt/webhook", events: ["batch.cleaned", "machine.fault", "oee.snapshot"], secretPrefix: "whsec_a3b2c1", status: "active" as const, failureCount: 0, lastTriggeredAt: "2026-03-11T07:45:00Z", createdAt: "2026-01-20T09:00:00Z" },
  { id: 2, endpointUrl: "https://quality-hub.bmw-group.net/inbound/grt", events: ["batch.cleaned"], secretPrefix: "whsec_d4e5f6", status: "active" as const, failureCount: 2, lastTriggeredAt: "2026-03-11T06:30:00Z", createdAt: "2026-02-14T11:00:00Z" },
];

const DEMO_ANALYTICS = {
  totalCalls: 12847,
  successRate: 99.3,
  avgLatency: 127,
  activeWebhooks: 2,
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-02-${String(10 + i).padStart(2, "0")}`,
    total: 300 + Math.floor(Math.random() * 200),
    success: 295 + Math.floor(Math.random() * 200),
    errors: Math.floor(Math.random() * 8),
  })),
  byEndpoint: [
    { endpoint: "getBatchCleanlinessReport", total: 5200, avgLatency: 145, errorRate: 0.5 },
    { endpoint: "getMachineOee", total: 4100, avgLatency: 98, errorRate: 0.3 },
    { endpoint: "getEquipmentStatus", total: 2300, avgLatency: 72, errorRate: 0.1 },
    { endpoint: "getProjectMilestones", total: 1247, avgLatency: 185, errorRate: 1.2 },
  ],
};

const DEMO_EVENTS = [
  { id: 1, timestamp: "2026-03-11T08:23:15Z", type: "api.call", endpoint: "getBatchCleanlinessReport", status: "success" as const, detail: "200 OK — 132ms", statusCode: 200 },
  { id: 2, timestamp: "2026-03-11T08:20:42Z", type: "webhook.delivered", endpoint: "mes.volkswagen.com", status: "success" as const, detail: "batch.cleaned — 200 OK", statusCode: 200 },
  { id: 3, timestamp: "2026-03-11T08:15:33Z", type: "api.call", endpoint: "getMachineOee", status: "success" as const, detail: "200 OK — 89ms", statusCode: 200 },
  { id: 4, timestamp: "2026-03-11T07:58:10Z", type: "webhook.delivered", endpoint: "quality-hub.bmw-group.net", status: "success" as const, detail: "batch.cleaned — 200 OK", statusCode: 200 },
  { id: 5, timestamp: "2026-03-11T07:45:22Z", type: "api.call", endpoint: "getEquipmentStatus", status: "success" as const, detail: "200 OK — 65ms", statusCode: 200 },
  { id: 6, timestamp: "2026-03-11T07:30:15Z", type: "api.call", endpoint: "getBatchCleanlinessReport", status: "error" as const, detail: "429 Rate Limited", statusCode: 429 },
  { id: 7, timestamp: "2026-03-11T07:12:48Z", type: "webhook.failed", endpoint: "quality-hub.bmw-group.net", status: "error" as const, detail: "batch.cleaned — 503 Service Unavailable", statusCode: 503 },
  { id: 8, timestamp: "2026-03-11T06:55:33Z", type: "api.call", endpoint: "getProjectMilestones", status: "success" as const, detail: "200 OK — 178ms", statusCode: 200 },
  { id: 9, timestamp: "2026-03-11T06:40:19Z", type: "api.call", endpoint: "getMachineOee", status: "success" as const, detail: "200 OK — 92ms", statusCode: 200 },
  { id: 10, timestamp: "2026-03-11T06:22:05Z", type: "webhook.delivered", endpoint: "mes.volkswagen.com", status: "success" as const, detail: "oee.snapshot — 200 OK", statusCode: 200 },
  { id: 11, timestamp: "2026-03-11T06:10:41Z", type: "api.call", endpoint: "getBatchCleanlinessReport", status: "success" as const, detail: "200 OK — 148ms", statusCode: 200 },
  { id: 12, timestamp: "2026-03-11T05:55:28Z", type: "api.call", endpoint: "getEquipmentStatus", status: "success" as const, detail: "200 OK — 58ms", statusCode: 200 },
  { id: 13, timestamp: "2026-03-11T05:30:12Z", type: "webhook.delivered", endpoint: "mes.volkswagen.com", status: "success" as const, detail: "machine.fault — 200 OK", statusCode: 200 },
  { id: 14, timestamp: "2026-03-11T05:15:55Z", type: "api.call", endpoint: "getMachineOee", status: "error" as const, detail: "401 Unauthorized — expired key", statusCode: 401 },
  { id: 15, timestamp: "2026-03-11T04:50:03Z", type: "api.call", endpoint: "getBatchCleanlinessReport", status: "success" as const, detail: "200 OK — 136ms", statusCode: 200 },
];

const AVAILABLE_SCOPES = [
  { value: "read:cleanliness", label: "Cleanliness Reports", desc: "Batch cleanliness QC data" },
  { value: "read:oee", label: "Machine OEE", desc: "OEE snapshots & shift logs" },
  { value: "read:equipment", label: "Equipment Status", desc: "Equipment registry & IoT status" },
  { value: "read:project", label: "Project Milestones", desc: "T1-T15 milestones & phases" },
];

const AVAILABLE_EVENTS = [
  { value: "batch.cleaned", label: "Batch Cleaned" },
  { value: "machine.fault", label: "Machine Fault" },
  { value: "oee.snapshot", label: "OEE Snapshot" },
  { value: "equipment.alert", label: "Equipment Alert" },
];

// ── Components ───────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = "text-emerald-400" }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string;
}) {
  return (
    <Card className={`${OEM_CARD} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-medium ${OEM_MUTED} uppercase tracking-wider`}>{label}</p>
            <p className={`text-2xl font-bold ${color} mt-1 font-mono`}>{value}</p>
            {sub && <p className={`text-xs ${OEM_MUTED} mt-0.5`}>{sub}</p>}
          </div>
          <Icon className={`h-8 w-8 ${OEM_MUTED} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    "read:cleanliness": "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
    "read:oee": "bg-blue-900/50 text-blue-300 border-blue-700/50",
    "read:equipment": "bg-amber-900/50 text-amber-300 border-amber-700/50",
    "read:project": "bg-purple-900/50 text-purple-300 border-purple-700/50",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[scope] || "bg-gray-800 text-gray-300"}`}>
      {scope.replace("read:", "")}
    </Badge>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "active" ? "bg-emerald-400" : status === "paused" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-1.5`} />;
}

function timeAgo(ts: string | null): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Tab: Credentials ─────────────────────────────────────────

function CredentialsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const keys = DEMO_KEYS;

  const handleCreate = () => {
    const fakeKey = `grt_${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;
    setCreatedKey(fakeKey);
    toast.success("API key created");
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${OEM_TEXT}`}>API Keys</h3>
          <p className={`text-sm ${OEM_MUTED}`}>Manage API credentials for programmatic access</p>
        </div>
        <Button size="sm" onClick={() => { setShowCreateDialog(true); setCreatedKey(null); setNewKeyName(""); setSelectedScopes([]); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Generate New Key
        </Button>
      </div>

      <div className="space-y-2">
        {keys.map(k => (
          <Card key={k.id} className={`${OEM_CARD} border`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-400" />
                    <span className={`font-medium ${OEM_TEXT}`}>{k.keyName}</span>
                    <Badge variant={k.status === "active" ? "default" : "destructive"}
                      className={k.status === "active" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}>
                      {k.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <code className={`text-sm font-mono ${OEM_MUTED}`}>{k.keyPrefix}••••••••</code>
                    <span className={`text-xs ${OEM_MUTED}`}>Rate: {k.rateLimitPerHour.toLocaleString()}/hr</span>
                    <span className={`text-xs ${OEM_MUTED}`}>Last used: {timeAgo(k.lastUsedAt)}</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {(k.scopes as string[]).map(s => <ScopeBadge key={s} scope={s} />)}
                  </div>
                </div>
                <div className="flex gap-1">
                  {k.status === "active" && (
                    <>
                      <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
                        onClick={() => toast.info("Rotate key flow would open here")}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => toast.warning("Key revocation requires confirmation")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className={`${OEM_BG} border border-[#1f2937] ${OEM_TEXT} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className={OEM_TEXT}>Generate New API Key</DialogTitle>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" /> Save this key — it will not be shown again
                </div>
              </div>
              <div className="bg-[#0f172a] rounded-lg p-3 flex items-center gap-2">
                <code className="text-emerald-400 text-xs font-mono flex-1 break-all">{createdKey}</code>
                <Button size="sm" variant="ghost" onClick={copyKey} className="text-emerald-400 hover:text-emerald-300">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowCreateDialog(false)} className="bg-emerald-600 hover:bg-emerald-700">
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className={OEM_MUTED}>Key Name</Label>
                <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key" className={`mt-1 ${OEM_INPUT}`} />
              </div>
              <div>
                <Label className={OEM_MUTED}>Scopes</Label>
                <div className="mt-2 space-y-2">
                  {AVAILABLE_SCOPES.map(s => (
                    <label key={s.value} className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={selectedScopes.includes(s.value)}
                        onCheckedChange={c => {
                          setSelectedScopes(c ? [...selectedScopes, s.value] : selectedScopes.filter(x => x !== s.value));
                        }}
                        className="mt-0.5 border-[#475569]" />
                      <div>
                        <span className={`text-sm ${OEM_TEXT}`}>{s.label}</span>
                        <span className={`text-xs ${OEM_MUTED} block`}>{s.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className={OEM_MUTED}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newKeyName || selectedScopes.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Generate Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Webhooks ────────────────────────────────────────────

function WebhooksTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState<Record<number, boolean>>({});

  const webhooks = DEMO_WEBHOOKS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${OEM_TEXT}`}>Webhook Subscriptions</h3>
          <p className={`text-sm ${OEM_MUTED}`}>Configure real-time data push to your systems</p>
        </div>
        <Button size="sm" onClick={() => { setShowAddDialog(true); setNewUrl(""); setSelectedEvents([]); }}
          className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Webhook
        </Button>
      </div>

      <div className="space-y-2">
        {webhooks.map(w => (
          <Card key={w.id} className={`${OEM_CARD} border`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-blue-400" />
                    <code className={`text-sm font-mono ${OEM_TEXT}`}>{w.endpointUrl}</code>
                    <StatusDot status={w.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex gap-1">
                      {(w.events as string[]).map(e => (
                        <Badge key={e} variant="outline" className="text-[10px] bg-blue-900/30 text-blue-300 border-blue-700/50">
                          {e}
                        </Badge>
                      ))}
                    </div>
                    <span className={`text-xs ${OEM_MUTED}`}>
                      {w.failureCount > 0 && <span className="text-amber-400">{w.failureCount} failures</span>}
                      {w.failureCount === 0 && <span className="text-emerald-400">Healthy</span>}
                    </span>
                    <span className={`text-xs ${OEM_MUTED}`}>Last: {timeAgo(w.lastTriggeredAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className={`text-xs font-mono ${OEM_MUTED}`}>
                      {showSecret[w.id] ? `${w.secretPrefix}${"•".repeat(36)}` : `${w.secretPrefix}••••••`}
                    </code>
                    <Button size="sm" variant="ghost" className={`h-5 w-5 p-0 ${OEM_MUTED}`}
                      onClick={() => setShowSecret(p => ({ ...p, [w.id]: !p[w.id] }))}>
                      {showSecret[w.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                    onClick={() => toast.info("Test webhook delivery triggered")}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => toast.warning("Webhook deletion requires confirmation")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Webhook Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className={`${OEM_BG} border border-[#1f2937] ${OEM_TEXT} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className={OEM_TEXT}>Add Webhook Endpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={OEM_MUTED}>Endpoint URL</Label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://your-mes.example.com/webhook" className={`mt-1 ${OEM_INPUT} font-mono text-sm`} />
            </div>
            <div>
              <Label className={OEM_MUTED}>Subscribe to Events</Label>
              <div className="mt-2 space-y-2">
                {AVAILABLE_EVENTS.map(e => (
                  <label key={e.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={selectedEvents.includes(e.value)}
                      onCheckedChange={c => {
                        setSelectedEvents(c ? [...selectedEvents, e.value] : selectedEvents.filter(x => x !== e.value));
                      }}
                      className="border-[#475569]" />
                    <span className={`text-sm ${OEM_TEXT}`}>{e.label}</span>
                    <code className={`text-xs ${OEM_MUTED}`}>{e.value}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-[#0f172a] rounded p-3">
              <p className={`text-xs ${OEM_MUTED}`}>A signing secret will be automatically generated. Use it to verify webhook payloads via HMAC-SHA256.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)} className={OEM_MUTED}>Cancel</Button>
            <Button disabled={!newUrl || selectedEvents.length === 0}
              onClick={() => { setShowAddDialog(false); toast.success("Webhook created with signing secret"); }}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Analytics ────────────────────────────────────────────

function AnalyticsTab() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { totalCalls, successRate, avgLatency, activeWebhooks, daily, byEndpoint } = DEMO_ANALYTICS;

  const maxDaily = useMemo(() => Math.max(...daily.map(d => d.total)), [daily]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${OEM_TEXT}`}>API Analytics</h3>
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as const).map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "ghost"}
              onClick={() => setPeriod(p)}
              className={period === p ? "bg-blue-600 text-white" : `${OEM_MUTED} hover:text-white`}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Calls" value={totalCalls.toLocaleString()} sub="This month" icon={Zap} color="text-blue-400" />
        <StatCard label="Success Rate" value={`${successRate}%`} sub="2xx responses" icon={CheckCircle2} />
        <StatCard label="Avg Latency" value={`${avgLatency}ms`} sub="P95: 240ms" icon={Clock} color="text-amber-400" />
        <StatCard label="Active Webhooks" value={activeWebhooks} sub="0 failures" icon={Webhook} color="text-purple-400" />
      </div>

      {/* Daily Volume Chart (CSS bars) */}
      <Card className={`${OEM_CARD} border`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm ${OEM_MUTED}`}>Daily API Call Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[2px] h-32">
            {daily.map((d, i) => {
              const h = maxDaily > 0 ? (d.total / maxDaily) * 100 : 0;
              const errH = maxDaily > 0 ? (d.errors / maxDaily) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" title={`${d.date}: ${d.total} calls, ${d.errors} errors`}>
                  <div className="w-full rounded-t" style={{ height: `${h}%`, minHeight: 2, background: "linear-gradient(to top, #1e40af, #3b82f6)" }} />
                  {errH > 0 && <div className="w-full bg-red-500/60 rounded-b" style={{ height: `${errH}%`, minHeight: 1 }} />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-[10px] ${OEM_MUTED}`}>{daily[0]?.date}</span>
            <span className={`text-[10px] ${OEM_MUTED}`}>{daily[daily.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint Breakdown */}
      <Card className={`${OEM_CARD} border`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm ${OEM_MUTED}`}>Endpoint Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className={`grid grid-cols-5 gap-2 text-xs ${OEM_MUTED} font-medium pb-1 border-b border-[#1f2937]`}>
              <span className="col-span-2">Endpoint</span>
              <span className="text-right">Calls</span>
              <span className="text-right">Avg Latency</span>
              <span className="text-right">Error Rate</span>
            </div>
            {byEndpoint.map(ep => (
              <div key={ep.endpoint} className={`grid grid-cols-5 gap-2 text-sm py-1.5 ${OEM_TEXT}`}>
                <code className="col-span-2 text-xs font-mono text-blue-300 truncate">{ep.endpoint}</code>
                <span className="text-right font-mono">{ep.total.toLocaleString()}</span>
                <span className="text-right font-mono">{ep.avgLatency}ms</span>
                <span className={`text-right font-mono ${ep.errorRate > 1 ? "text-amber-400" : "text-emerald-400"}`}>
                  {ep.errorRate}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Event Log ───────────────────────────────────────────

function EventLogTab() {
  const events = DEMO_EVENTS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${OEM_TEXT}`}>Event Log</h3>
        <Button size="sm" variant="ghost" className={OEM_MUTED}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className={`${OEM_CARD} border`}>
        <CardContent className="p-0">
          <div className={`grid grid-cols-[140px_120px_1fr_1fr_80px] gap-2 text-xs ${OEM_MUTED} font-medium p-3 border-b border-[#1f2937]`}>
            <span>Timestamp</span>
            <span>Type</span>
            <span>Target</span>
            <span>Detail</span>
            <span className="text-right">Status</span>
          </div>
          {events.map(ev => (
            <div key={ev.id} className={`grid grid-cols-[140px_120px_1fr_1fr_80px] gap-2 text-sm p-3 border-b border-[#1f2937]/50 hover:bg-[#1f2937]/20 ${OEM_TEXT}`}>
              <span className={`text-xs font-mono ${OEM_MUTED}`}>
                {new Date(ev.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span>
                <Badge variant="outline" className={`text-[10px] ${
                  ev.type === "api.call" ? "bg-blue-900/30 text-blue-300 border-blue-700/50" :
                  ev.type === "webhook.delivered" ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/50" :
                  "bg-red-900/30 text-red-300 border-red-700/50"
                }`}>
                  {ev.type.replace(".", " ")}
                </Badge>
              </span>
              <code className={`text-xs font-mono ${OEM_MUTED} truncate`}>{ev.endpoint}</code>
              <span className={`text-xs ${OEM_MUTED}`}>{ev.detail}</span>
              <span className="text-right">
                {ev.status === "success"
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" />
                  : <XCircle className="h-4 w-4 text-red-400 inline" />}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function OemDeveloperPortal() {
  return (
    <div className={`min-h-screen ${OEM_BG} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${OEM_TEXT}`}>OEM Developer Hub</h1>
            <p className={`text-sm ${OEM_MUTED}`}>B2B Open Gateway — Manage API access & integrations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-700/50">
            <ShieldCheck className="h-3 w-3 mr-1" /> Production
          </Badge>
          <Badge variant="outline" className={`${OEM_MUTED} border-[#334155]`}>
            v2.0
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Active API Keys" value={DEMO_KEYS.filter(k => k.status === "active").length} icon={Key} />
        <StatCard label="Webhook Endpoints" value={DEMO_WEBHOOKS.length} icon={Webhook} color="text-blue-400" />
        <StatCard label="API Calls Today" value="487" sub="99.4% success" icon={Zap} color="text-amber-400" />
        <StatCard label="Webhook Deliveries" value="23" sub="0 failures" icon={ScrollText} color="text-purple-400" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList className="bg-[#111827] border border-[#1f2937]">
          <TabsTrigger value="credentials" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Key className="h-4 w-4 mr-1.5" /> Credentials
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Webhook className="h-4 w-4 mr-1.5" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-1.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <ScrollText className="h-4 w-4 mr-1.5" /> Event Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials"><CredentialsTab /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="events"><EventLogTab /></TabsContent>
      </Tabs>
    </div>
  );
}
