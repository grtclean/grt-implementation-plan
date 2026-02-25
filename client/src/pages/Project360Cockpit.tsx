/**
 * Project 360 Cockpit — CEO-level single-page project snapshot
 *
 * Architecture: Mock-First (Phase 0)
 *   - Typed interfaces define the contract for all 6 data slices
 *   - Realistic mock data powers the layout for CEO review
 *   - tRPC overlay merges live data when backend slices respond
 *   - Each section is null-safe — shows "No data" gracefully
 *
 * Phase 2: Replace mock fallback with Redis-cached tRPC data
 * Phase 3: PII desensitization filter before render
 */

import { useState, useMemo } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Factory,
  DollarSign,
  ShieldCheck,
  FolderOpen,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";

// ─── Typed Interfaces (Contract for Phase 2 Redis cache) ────────────

interface ProjectSlice {
  id: number;
  name: string;
  status: string;
  currentPhase: string | null;
  healthStatus: string | null;
  budget: number | null;
  actualCost: number | null;
  completionPercent: number | null;
}

interface CostSlice {
  budget: number;
  spent: number;
  remaining: number;
}

interface ProductionStage {
  code: string;
  status: string;
  completion: number;
}

interface ProductionSlice {
  stages: ProductionStage[];
  completed: number;
  inProgress: number;
  blocked: number;
}

interface VaultSlice {
  totalFiles: number;
  byType: Record<string, number>;
  ecoTotal: number;
  ecoDraft: number;
}

interface QualitySlice {
  fmeaCount: number;
  maxRpn: number;
  open8Ds: number;
  overdueCapas: number;
}

interface AcceptanceSlice {
  fatTotal: number;
  fatCompleted: number;
  satTotal: number;
  satCompleted: number;
}

interface CockpitData {
  project: ProjectSlice | null;
  cost: CostSlice | null;
  production: ProductionSlice | null;
  vault: VaultSlice | null;
  quality: QualitySlice | null;
  acceptance: AcceptanceSlice | null;
}

// ─── Mock Data (realistic GRT cleaning equipment project) ───────────

const MOCK_PROJECTS = [
  { id: 1, name: "P2025-001 Semiconductor Wafer Cleaner" },
  { id: 2, name: "P2025-002 Automotive Parts Washing Line" },
  { id: 3, name: "P2025-003 Pharma CIP System" },
];

const MOCK_DATA: Record<number, CockpitData> = {
  1: {
    project: {
      id: 1, name: "P2025-001 Semiconductor Wafer Cleaner", status: "active",
      currentPhase: "M5", healthStatus: "green", budget: 1800000, actualCost: 1170000, completionPercent: 65,
    },
    cost: { budget: 1800000, spent: 1170000, remaining: 630000 },
    production: {
      stages: [
        { code: "T1_MACHINING",      status: "COMPLETED",   completion: 100 },
        { code: "T2_COLD_WORK",      status: "COMPLETED",   completion: 100 },
        { code: "T3_SUB_ASSEMBLY",   status: "COMPLETED",   completion: 100 },
        { code: "T4_WELDING",        status: "COMPLETED",   completion: 100 },
        { code: "T5_SURFACE_TREAT",  status: "IN_PROGRESS", completion: 80 },
        { code: "T6_PAINTING",       status: "IN_PROGRESS", completion: 45 },
        { code: "T7_PLUMBING",       status: "NOT_STARTED", completion: 0 },
        { code: "T8_ELECTRICAL",     status: "NOT_STARTED", completion: 0 },
        { code: "T9_PLC_PROGRAM",    status: "NOT_STARTED", completion: 0 },
        { code: "T10_INTEGRATION",   status: "NOT_STARTED", completion: 0 },
        { code: "T11_CLEANING_TEST", status: "NOT_STARTED", completion: 0 },
        { code: "T12_FAT_INTERNAL",  status: "NOT_STARTED", completion: 0 },
        { code: "T13_PACKAGING",     status: "NOT_STARTED", completion: 0 },
        { code: "T14_SHIPPING",      status: "NOT_STARTED", completion: 0 },
        { code: "T15_SAT_ONSITE",    status: "NOT_STARTED", completion: 0 },
      ],
      completed: 4, inProgress: 2, blocked: 0,
    },
    vault: {
      totalFiles: 47,
      byType: { SOLIDWORKS: 18, EPLAN: 12, PDF: 9, WORD: 5, EMAIL_EML: 3 },
      ecoTotal: 5, ecoDraft: 2,
    },
    quality: { fmeaCount: 3, maxRpn: 168, open8Ds: 2, overdueCapas: 1 },
    acceptance: { fatTotal: 8, fatCompleted: 3, satTotal: 6, satCompleted: 0 },
  },
  2: {
    project: {
      id: 2, name: "P2025-002 Automotive Parts Washing Line", status: "active",
      currentPhase: "M8", healthStatus: "yellow", budget: 3200000, actualCost: 2880000, completionPercent: 82,
    },
    cost: { budget: 3200000, spent: 2880000, remaining: 320000 },
    production: {
      stages: [
        { code: "T1_MACHINING",      status: "COMPLETED",   completion: 100 },
        { code: "T2_COLD_WORK",      status: "COMPLETED",   completion: 100 },
        { code: "T3_SUB_ASSEMBLY",   status: "COMPLETED",   completion: 100 },
        { code: "T4_WELDING",        status: "COMPLETED",   completion: 100 },
        { code: "T5_SURFACE_TREAT",  status: "COMPLETED",   completion: 100 },
        { code: "T6_PAINTING",       status: "COMPLETED",   completion: 100 },
        { code: "T7_PLUMBING",       status: "COMPLETED",   completion: 100 },
        { code: "T8_ELECTRICAL",     status: "COMPLETED",   completion: 100 },
        { code: "T9_PLC_PROGRAM",    status: "IN_PROGRESS", completion: 70 },
        { code: "T10_INTEGRATION",   status: "IN_PROGRESS", completion: 30 },
        { code: "T11_CLEANING_TEST", status: "BLOCKED",     completion: 0 },
        { code: "T12_FAT_INTERNAL",  status: "NOT_STARTED", completion: 0 },
        { code: "T13_PACKAGING",     status: "NOT_STARTED", completion: 0 },
        { code: "T14_SHIPPING",      status: "NOT_STARTED", completion: 0 },
        { code: "T15_SAT_ONSITE",    status: "NOT_STARTED", completion: 0 },
      ],
      completed: 8, inProgress: 2, blocked: 1,
    },
    vault: {
      totalFiles: 83,
      byType: { SOLIDWORKS: 32, EPLAN: 22, PDF: 15, WORD: 8, MEETING_RECORD: 6 },
      ecoTotal: 12, ecoDraft: 1,
    },
    quality: { fmeaCount: 5, maxRpn: 224, open8Ds: 1, overdueCapas: 0 },
    acceptance: { fatTotal: 12, fatCompleted: 8, satTotal: 10, satCompleted: 2 },
  },
  3: {
    project: {
      id: 3, name: "P2025-003 Pharma CIP System", status: "draft",
      currentPhase: "M1", healthStatus: "green", budget: 950000, actualCost: 42000, completionPercent: 5,
    },
    cost: { budget: 950000, spent: 42000, remaining: 908000 },
    production: { stages: [], completed: 0, inProgress: 0, blocked: 0 },
    vault: { totalFiles: 4, byType: { PDF: 3, WORD: 1 }, ecoTotal: 0, ecoDraft: 0 },
    quality: { fmeaCount: 0, maxRpn: 0, open8Ds: 0, overdueCapas: 0 },
    acceptance: { fatTotal: 0, fatCompleted: 0, satTotal: 0, satCompleted: 0 },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return "0";
  if (Math.abs(n) >= 10000) return `¥${(n / 10000).toFixed(1)}w`;
  if (Math.abs(n) >= 1000) return `¥${(n / 1000).toFixed(1)}k`;
  return `¥${n}`;
}

const statusColor: Record<string, string> = {
  COMPLETED: "bg-green-500",
  IN_PROGRESS: "bg-blue-500",
  NOT_STARTED: "bg-gray-400",
  BLOCKED: "bg-red-500",
  ON_HOLD: "bg-yellow-500",
};

const statusLabel: Record<string, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In Progress",
  NOT_STARTED: "Pending",
  BLOCKED: "Blocked",
  ON_HOLD: "On Hold",
};

const healthColor: Record<string, string> = {
  green: "text-green-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
};

const healthBadge: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
};

function NoData({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function Project360Cockpit() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Live data — optional overlay. Will return null slices if tables aren't populated.
  const { data: liveProjects } = trpc.project.list.useQuery();
  const { data: liveData, isFetching: liveFetching } = trpc.project360.overview.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId },
  );

  // Merge: live data takes priority, mock fills gaps
  const projectOptions = useMemo(() => {
    const live = Array.isArray(liveProjects) ? liveProjects : (liveProjects as any)?.items;
    if (live && live.length > 0) return live.map((p: any) => ({ id: p.id, name: p.name }));
    return MOCK_PROJECTS;
  }, [liveProjects]);

  const isUsingMock = !liveData || Object.values(liveData).every((v) => v === null);

  const data: CockpitData | null = useMemo(() => {
    if (!selectedProjectId) return null;
    const mock = MOCK_DATA[selectedProjectId] ?? null;
    if (!liveData) return mock;
    // Merge: use live slice if non-null, otherwise fall back to mock slice
    return {
      project: liveData.project ?? mock?.project ?? null,
      cost: liveData.cost ?? mock?.cost ?? null,
      production: liveData.production ?? mock?.production ?? null,
      vault: liveData.vault ?? mock?.vault ?? null,
      quality: liveData.quality ?? mock?.quality ?? null,
      acceptance: liveData.acceptance ?? mock?.acceptance ?? null,
    };
  }, [selectedProjectId, liveData]);

  return (
    <div className="space-y-6 p-6">
      {/* ─── Header ─── */}
      <PageHeader
        icon={LayoutDashboard}
        title="Project 360 Cockpit"
        description="Cross-module project snapshot — progress, cost, quality, vault, acceptance"
        actions={
          <div className="flex items-center gap-3">
            {/* Data source indicator */}
            <Badge
              variant="outline"
              className={`text-xs gap-1.5 ${isUsingMock && selectedProjectId ? "border-yellow-400 text-yellow-600" : "border-green-400 text-green-600"}`}
            >
              {!selectedProjectId ? (
                <><Database className="w-3 h-3" /> Ready</>
              ) : isUsingMock ? (
                <><WifiOff className="w-3 h-3" /> Demo Data</>
              ) : (
                <><Wifi className="w-3 h-3" /> Live</>
              )}
            </Badge>
            <Select
              value={selectedProjectId?.toString() ?? ""}
              onValueChange={(v) => setSelectedProjectId(Number(v))}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* ─── Empty state ─── */}
      {!selectedProjectId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <LayoutDashboard className="w-12 h-12 opacity-20" />
            <p className="text-lg font-medium">Select a project to view its 360 cockpit</p>
            <p className="text-sm">All modules aggregated in one view — progress, cost, quality, vault, acceptance</p>
          </CardContent>
        </Card>
      )}

      {/* ─── Loading overlay ─── */}
      {selectedProjectId && liveFetching && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* ─── Dashboard ─── */}
      {data && (
        <>
          {/* Project health banner */}
          {data.project && (
            <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 rounded-lg border">
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{data.project.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Status: {data.project.status} | Phase: {data.project.currentPhase ?? "-"}
                </p>
              </div>
              {data.project.healthStatus && (
                <Badge className={`${healthBadge[data.project.healthStatus] ?? "bg-gray-100 text-gray-800"} px-3 py-1 text-sm`}>
                  {data.project.healthStatus === "green" ? "Healthy" : data.project.healthStatus === "yellow" ? "At Risk" : "Critical"}
                </Badge>
              )}
              <div className="text-right">
                <p className="text-2xl font-bold">{data.project.completionPercent ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Overall</p>
              </div>
            </div>
          )}

          {/* Stat Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Factory}
              label="Phase / Progress"
              value={data.project ? `${data.project.currentPhase ?? "-"} / ${data.project.completionPercent ?? 0}%` : "-"}
              subtitle={
                data.production
                  ? `${data.production.completed} done, ${data.production.inProgress} active, ${data.production.blocked} blocked`
                  : "No stages"
              }
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
            <StatCard
              icon={DollarSign}
              label="Cost"
              value={data.cost ? `${fmt(data.cost.spent)} / ${fmt(data.cost.budget)}` : "-"}
              subtitle={data.cost ? `Remaining: ${fmt(data.cost.remaining)}` : "-"}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
            />
            <StatCard
              icon={ShieldCheck}
              label="Quality"
              value={data.quality ? `${data.quality.open8Ds} open 8D` : "-"}
              subtitle={data.quality ? `FMEA: ${data.quality.fmeaCount} | Max RPN: ${data.quality.maxRpn}` : "-"}
              iconColor="text-orange-600"
              iconBg="bg-orange-100"
            />
            <StatCard
              icon={FolderOpen}
              label="Vault"
              value={data.vault ? `${data.vault.totalFiles} files` : "-"}
              subtitle={data.vault ? `ECO: ${data.vault.ecoTotal} (${data.vault.ecoDraft} draft)` : "-"}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
          </div>

          {/* ─── Tabs ─── */}
          <Tabs defaultValue="production" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="cost">Cost</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
              <TabsTrigger value="vault">Vault</TabsTrigger>
              <TabsTrigger value="acceptance">Acceptance</TabsTrigger>
            </TabsList>

            {/* ── Production Tab ── */}
            <TabsContent value="production">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="w-5 h-5" />
                    Production Stages (T1-T15)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!data.production ? (
                    <NoData label="No production data available" />
                  ) : data.production.stages.length === 0 ? (
                    <NoData label="No stages initialized — project may be in early planning (M0-M2)" />
                  ) : (
                    <>
                      <div className="flex gap-6 mb-6 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-green-500" />
                          <span>Completed: <strong>{data.production.completed}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>In Progress: <strong>{data.production.inProgress}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          <span>Blocked: <strong>{data.production.blocked}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-gray-400" />
                          <span>Pending: <strong>{data.production.stages.length - data.production.completed - data.production.inProgress - data.production.blocked}</strong></span>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {data.production.stages.map((s, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-[160px] text-sm font-mono truncate text-muted-foreground">{s.code}</span>
                            <div className="flex-1 relative">
                              <Progress value={s.completion} className="h-5" />
                              {s.completion > 8 && (
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                                  {s.completion}%
                                </span>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`w-[100px] justify-center text-xs gap-1 ${
                                s.status === "COMPLETED" ? "border-green-300 text-green-700" :
                                s.status === "IN_PROGRESS" ? "border-blue-300 text-blue-700" :
                                s.status === "BLOCKED" ? "border-red-300 text-red-700" :
                                "border-gray-200 text-gray-500"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusColor[s.status] ?? "bg-gray-400"}`} />
                              {statusLabel[s.status] ?? s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Cost Tab ── */}
            <TabsContent value="cost">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Budget vs Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!data.cost ? (
                    <NoData label="No cost data available" />
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Spent: {fmt(data.cost.spent)}</span>
                          <span className="text-muted-foreground">Budget: {fmt(data.cost.budget)}</span>
                        </div>
                        <div className="relative">
                          <Progress
                            value={data.cost.budget > 0 ? Math.min(100, (data.cost.spent / data.cost.budget) * 100) : 0}
                            className="h-6"
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                            {data.cost.budget > 0 ? Math.round((data.cost.spent / data.cost.budget) * 100) : 0}% utilized
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4 text-center">
                            <p className="text-2xl font-bold text-emerald-600">{fmt(data.cost.budget)}</p>
                            <p className="text-sm text-muted-foreground">Budget</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4 text-center">
                            <p className="text-2xl font-bold">{fmt(data.cost.spent)}</p>
                            <p className="text-sm text-muted-foreground">Spent</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4 text-center">
                            <p className={`text-2xl font-bold ${data.cost.remaining < 0 ? "text-red-600" : "text-blue-600"}`}>
                              {fmt(data.cost.remaining)}
                            </p>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Quality Tab ── */}
            <TabsContent value="quality">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Quality Summary — FMEA / 8D / CAPA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!data.quality ? (
                    <NoData label="No quality data available" />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-muted/50 border-l-4 border-l-blue-500">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold">{data.quality.fmeaCount}</p>
                          <p className="text-sm text-muted-foreground mt-1">FMEA Documents</p>
                        </CardContent>
                      </Card>
                      <Card className={`bg-muted/50 border-l-4 ${data.quality.maxRpn >= 200 ? "border-l-red-500" : data.quality.maxRpn >= 100 ? "border-l-yellow-500" : "border-l-green-500"}`}>
                        <CardContent className="pt-4 text-center">
                          <p className={`text-3xl font-bold ${data.quality.maxRpn >= 200 ? "text-red-600" : data.quality.maxRpn >= 100 ? "text-orange-500" : "text-green-600"}`}>
                            {data.quality.maxRpn}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Max RPN</p>
                          {data.quality.maxRpn >= 100 && (
                            <Badge variant="destructive" className="mt-2 text-xs">
                              {data.quality.maxRpn >= 200 ? "Critical" : "Needs Action"}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                      <Card className={`bg-muted/50 border-l-4 ${data.quality.open8Ds > 0 ? "border-l-orange-500" : "border-l-green-500"}`}>
                        <CardContent className="pt-4 text-center">
                          <p className={`text-3xl font-bold ${data.quality.open8Ds > 0 ? "text-orange-600" : "text-green-600"}`}>
                            {data.quality.open8Ds}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Open 8D Reports</p>
                        </CardContent>
                      </Card>
                      <Card className={`bg-muted/50 border-l-4 ${data.quality.overdueCapas > 0 ? "border-l-red-500" : "border-l-green-500"}`}>
                        <CardContent className="pt-4 text-center">
                          <p className={`text-3xl font-bold ${data.quality.overdueCapas > 0 ? "text-red-600" : "text-green-600"}`}>
                            {data.quality.overdueCapas}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Open CAPAs</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Vault Tab ── */}
            <TabsContent value="vault">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Cloud Vault & Engineering Change Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!data.vault ? (
                    <NoData label="No vault data available" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-3">Files by Type</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Object.entries(data.vault.byType).map(([type, cnt]) => (
                            <Badge key={type} variant="secondary" className="text-sm px-3 py-1.5">
                              {type}: <strong className="ml-1">{cnt}</strong>
                            </Badge>
                          ))}
                          {Object.keys(data.vault.byType).length === 0 && (
                            <span className="text-sm text-muted-foreground">No files uploaded</span>
                          )}
                        </div>
                        <div className="px-4 py-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Files</p>
                          <p className="text-3xl font-bold">{data.vault.totalFiles}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-3">Engineering Change Orders</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4 text-center">
                              <p className="text-3xl font-bold">{data.vault.ecoTotal}</p>
                              <p className="text-sm text-muted-foreground">Total ECOs</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4 text-center">
                              <p className="text-3xl font-bold text-yellow-600">{data.vault.ecoDraft}</p>
                              <p className="text-sm text-muted-foreground">Draft</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Acceptance Tab ── */}
            <TabsContent value="acceptance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    FAT / SAT Acceptance Testing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!data.acceptance ? (
                    <NoData label="No acceptance data available" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-muted/50 border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">FAT (Factory Acceptance Test)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Completed: <strong>{data.acceptance.fatCompleted}</strong></span>
                            <span>Total: <strong>{data.acceptance.fatTotal}</strong></span>
                          </div>
                          <div className="relative">
                            <Progress
                              value={data.acceptance.fatTotal > 0 ? (data.acceptance.fatCompleted / data.acceptance.fatTotal) * 100 : 0}
                              className="h-4"
                            />
                            {data.acceptance.fatTotal > 0 && (
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                                {Math.round((data.acceptance.fatCompleted / data.acceptance.fatTotal) * 100)}%
                              </span>
                            )}
                          </div>
                          {data.acceptance.fatTotal === 0 && (
                            <p className="text-xs text-muted-foreground mt-2">No FAT plans created yet</p>
                          )}
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50 border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">SAT (Site Acceptance Test)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Completed: <strong>{data.acceptance.satCompleted}</strong></span>
                            <span>Total: <strong>{data.acceptance.satTotal}</strong></span>
                          </div>
                          <div className="relative">
                            <Progress
                              value={data.acceptance.satTotal > 0 ? (data.acceptance.satCompleted / data.acceptance.satTotal) * 100 : 0}
                              className="h-4"
                            />
                            {data.acceptance.satTotal > 0 && (
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                                {Math.round((data.acceptance.satCompleted / data.acceptance.satTotal) * 100)}%
                              </span>
                            )}
                          </div>
                          {data.acceptance.satTotal === 0 && (
                            <p className="text-xs text-muted-foreground mt-2">No SAT plans created yet</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
