/**
 * StageGateDashboard - M0-M12 Stage Gate Management
 * Main page: stat cards, project selector, 4-tab layout
 */
import { useState, Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatCard } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  CheckSquare, ClipboardCheck, XCircle, Radio, BarChart3,
  LayoutDashboard, List, Zap, Loader2,
} from "lucide-react";

const OverviewTab = lazy(() => import("./stage-gate/OverviewTab"));
const ChecklistsTab = lazy(() => import("./stage-gate/ChecklistsTab"));
const PullSignalsTab = lazy(() => import("./stage-gate/PullSignalsTab"));
const AnalyticsTab = lazy(() => import("./stage-gate/AnalyticsTab"));

// Mock project list (to be replaced with real data)
const MOCK_PROJECTS = [
  { id: 1, name: "CL-2024-001 清洗机项目" },
  { id: 2, name: "CL-2024-002 超声波清洗线" },
  { id: 3, name: "CL-2024-003 汽车零部件清洗机" },
  { id: 4, name: "CL-2024-004 半导体清洗设备" },
  { id: 5, name: "CL-2024-005 通用清洗平台" },
];

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function StageGateDashboard() {
  const { t } = useLanguage();
  const [selectedProject, setSelectedProject] = useState<string>("1");
  const [activeTab, setActiveTab] = useState("overview");
  const projectId = parseInt(selectedProject);

  // Stats query
  const { data: statsData, isLoading: statsLoading } = trpc.stageGate.getStats.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Compute stat card values from raw stats
  const totalChecklists = statsData?.gates
    ? (statsData.gates as any[]).reduce((sum: number, g: any) => sum + g.count, 0)
    : 0;

  const passedChecklists = statsData?.gates
    ? (statsData.gates as any[])
        .filter((g: any) => g.status === "pass" || g.status === "waived")
        .reduce((sum: number, g: any) => sum + g.count, 0)
    : 0;

  const failedMandatory = statsData?.gates
    ? (statsData.gates as any[])
        .filter((g: any) => g.status === "fail")
        .reduce((sum: number, g: any) => sum + g.count, 0)
    : 0;

  const totalSignals = statsData?.signals
    ? (statsData.signals as any[]).reduce((sum: number, s: any) => sum + s.count, 0)
    : 0;

  return (
      <div className="space-y-6">
        <PageHeader
          icon={CheckSquare}
          title={t("projects.stageGate.title")}
          description={t("projects.stageGate.description")}
          actions={
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={t("projects.stageGate.selectProject")} />
              </SelectTrigger>
              <SelectContent>
                {MOCK_PROJECTS.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardCheck}
            label={t("projects.stageGate.totalChecks")}
            value={statsLoading ? "..." : totalChecklists}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={CheckSquare}
            label={t("projects.stageGate.passed")}
            value={statsLoading ? "..." : passedChecklists}
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
          />
          <StatCard
            icon={XCircle}
            label={t("projects.stageGate.failed")}
            value={statsLoading ? "..." : failedMandatory}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
          <StatCard
            icon={Radio}
            label={t("projects.stageGate.pullSignals")}
            value={statsLoading ? "..." : totalSignals}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard className="w-4 h-4" />{t("projects.stageGate.tabOverview")}
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-1.5">
              <List className="w-4 h-4" />{t("projects.stageGate.tabChecklists")}
            </TabsTrigger>
            <TabsTrigger value="signals" className="gap-1.5">
              <Zap className="w-4 h-4" />{t("projects.stageGate.tabSignals")}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />{t("projects.stageGate.tabAnalytics")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Suspense fallback={<TabLoading />}>
              <OverviewTab projectId={projectId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="checklists">
            <Suspense fallback={<TabLoading />}>
              <ChecklistsTab projectId={projectId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="signals">
            <Suspense fallback={<TabLoading />}>
              <PullSignalsTab projectId={projectId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics">
            <Suspense fallback={<TabLoading />}>
              <AnalyticsTab statsData={statsData as any} isLoading={statsLoading} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
  );
}
