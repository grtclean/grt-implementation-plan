/**
 * AI助手中心 - Unified AI Assistant Hub
 *
 * A navigation hub page that consolidates all AI assistants
 * scattered across the application into a single entry point.
 * Grouped by: 通用AI (General AI), 业务AI (Business AI), 系统管理 (System Admin)
 *
 * Live stats from trpc.aiTask.stats, admin-only gating on 系统管理 group.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Gauge,
  Cpu,
  Stethoscope,
  Activity,
  Network,
  Timer,
  Calculator,
  Lightbulb,
  CalendarClock,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface AssistantEntry {
  nameKey: string;
  descKey: string;
  path: string;
  icon: LucideIcon;
  color: string;
  adminOnly?: boolean;
}

interface AssistantGroup {
  titleKey: string;
  adminOnly?: boolean;
  entries: AssistantEntry[];
}

const assistantGroups: AssistantGroup[] = [
  {
    titleKey: "ai.hubPage.generalAI",
    entries: [
      { nameKey: "ai.hubPage.chatAssistant", descKey: "ai.hubPage.chatAssistantDesc", path: "/ai-assistant", icon: Bot, color: "bg-blue-500/10 text-blue-500" },
      { nameKey: "ai.hubPage.kpiAssistant", descKey: "ai.hubPage.kpiAssistantDesc", path: "/ai/kpi-assistant", icon: Gauge, color: "bg-purple-500/10 text-purple-500" },
      { nameKey: "ai.hubPage.digitalAssistant", descKey: "ai.hubPage.digitalAssistantDesc", path: "/digital-assistants", icon: Cpu, color: "bg-cyan-500/10 text-cyan-500" },
      { nameKey: "ai.hubPage.diagnostic", descKey: "ai.hubPage.diagnosticDesc", path: "/ai-diagnostic", icon: Stethoscope, color: "bg-rose-500/10 text-rose-500" },
      { nameKey: "ai.hubPage.effectiveness", descKey: "ai.hubPage.effectivenessDesc", path: "/ai-effectiveness", icon: Activity, color: "bg-emerald-500/10 text-emerald-500" },
    ],
  },
  {
    titleKey: "ai.hubPage.businessAI",
    entries: [
      { nameKey: "ai.hubPage.quotationAssistant", descKey: "ai.hubPage.quotationAssistantDesc", path: "/ai/quotation-assistant", icon: Calculator, color: "bg-emerald-500/10 text-emerald-500" },
      { nameKey: "ai.hubPage.solutionAssistant", descKey: "ai.hubPage.solutionAssistantDesc", path: "/ai/solution-assistant", icon: Lightbulb, color: "bg-amber-500/10 text-amber-500" },
      { nameKey: "ai.hubPage.planningAssistant", descKey: "ai.hubPage.planningAssistantDesc", path: "/ai/planning-assistant", icon: CalendarClock, color: "bg-blue-500/10 text-blue-500" },
    ],
  },
  {
    titleKey: "ai.hubPage.systemAdmin",
    adminOnly: true,
    entries: [
      { nameKey: "ai.hubPage.modelMonitor", descKey: "ai.hubPage.modelMonitorDesc", path: "/model-performance-monitor", icon: Activity, color: "bg-orange-500/10 text-orange-500", adminOnly: true },
      { nameKey: "ai.hubPage.knowledgeGraph", descKey: "ai.hubPage.knowledgeGraphDesc", path: "/knowledge-graph-approval", icon: Network, color: "bg-indigo-500/10 text-indigo-500", adminOnly: true },
      { nameKey: "ai.hubPage.modelTraining", descKey: "ai.hubPage.modelTrainingDesc", path: "/model-training-scheduler", icon: Timer, color: "bg-pink-500/10 text-pink-500", adminOnly: true },
      { nameKey: "ai.hubPage.agentManagement", descKey: "ai.hubPage.agentManagementDesc", path: "/agent-unit-management", icon: Cpu, color: "bg-teal-500/10 text-teal-500", adminOnly: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({ t }: { t: (key: string) => string }) {
  const { data: stats, isLoading } = (trpc.aiTask as any).stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card/50 border-border">
            <div className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={ClipboardList}
        label={t("ai.hubPage.statsTotal")}
        value={stats.total ?? 0}
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10"
      />
      <StatCard
        icon={Clock}
        label={t("ai.hubPage.statsPending")}
        value={stats.pending ?? 0}
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
      />
      <StatCard
        icon={CheckCircle2}
        label={t("ai.hubPage.statsCompleted")}
        value={stats.completed ?? 0}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10"
      />
      <StatCard
        icon={AlertTriangle}
        label={t("ai.hubPage.statsFailed")}
        value={stats.failed ?? 0}
        iconColor="text-red-500"
        iconBg="bg-red-500/10"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function AssistantCard({
  entry,
  t,
  isAdmin,
}: {
  entry: AssistantEntry;
  t: (key: string) => string;
  isAdmin: boolean;
}) {
  const Icon = entry.icon;

  return (
    <Link href={entry.path}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 h-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${entry.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base group-hover:text-primary transition-colors">
                  {t(entry.nameKey)}
                </CardTitle>
                {entry.adminOnly && isAdmin && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    管理员
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{t(entry.descKey)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AiAssistantHubPage() {
  const { t } = useLanguage();
  const { level } = useUserProfile();
  const isAdmin = level >= 7;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <PageHeader icon={Bot} title={t("ai.hubPage.title")} description={t("ai.hubPage.description")} />

      {/* Live stats summary */}
      <StatsBar t={t} />

      {/* Groups */}
      {assistantGroups
        .filter((group) => !group.adminOnly || isAdmin)
        .map((group) => (
          <section key={group.titleKey}>
            <h2 className="text-lg font-semibold mb-4">
              {t(group.titleKey)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.entries.map((entry) => (
                <AssistantCard key={entry.path} entry={entry} t={t} isAdmin={isAdmin} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
