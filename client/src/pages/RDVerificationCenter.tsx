/**
 * 研发验证中心 - R&D Verification Center
 * M0-M12 阶段门禁管控、检查项配置、评审管理、拉动信号
 *
 * Deep optimization: real tRPC integration, stat cards from DB,
 * pipeline visualization, stage detail drill-down.
 */
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  STAGES, STAGE_MAP, STAGE_CATEGORIES,
  M3_DIMENSIONS, M4_CARRIAGES, GATE_STATUSES,
  type StageCategory,
} from "@shared/stage-definitions";
import { PageHeader, StatCard } from "@/components/grt";
import {
  Shield, CheckCircle, AlertTriangle, Zap, FolderKanban, FileCheck,
  ClipboardList, Settings, ChevronRight, Home, Workflow, Search,
  Inbox, Target, Clock, XCircle, ArrowRight, Sparkles,
  Lightbulb, Factory, Circle, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================================
// StagePipeline - inline M0-M12 pipeline visualization
// =====================================================================

type StageState = "completed" | "current" | "future";

function getStageState(id: string, cur: string, done: string[]): StageState {
  if (done.includes(id)) return "completed";
  if (id === cur) return "current";
  return "future";
}

function StagePipeline({
  currentStage,
  completedStages,
  onStageClick,
  compact = false,
}: {
  currentStage: string;
  completedStages: string[];
  onStageClick?: (stageId: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto pb-2", "flex-wrap sm:flex-nowrap")}>
      {STAGES.map((stage, index) => {
        const state = getStageState(stage.id, currentStage, completedStages);
        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => onStageClick?.(stage.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
                onStageClick && "cursor-pointer hover:bg-muted/50",
                !onStageClick && "cursor-default",
              )}
            >
              {state === "completed" && (
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              )}
              {state === "current" && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <Circle className="w-5 h-5 text-white fill-white" />
                </div>
              )}
              {state === "future" && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                  <Circle className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <span className={cn(
                "text-[10px] font-medium",
                state === "completed" && "text-green-500",
                state === "current" && "text-blue-500",
                state === "future" && "text-muted-foreground",
              )}>
                {stage.id}
              </span>
              {!compact && (
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">{stage.name}</span>
              )}
            </button>
            {index < STAGES.length - 1 && (
              <div className={cn("w-4 h-0.5 flex-shrink-0", state === "completed" ? "bg-green-500" : "bg-muted-foreground/20")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Tab 1: ProjectOverviewTab
// =====================================================================

function ProjectOverviewTab() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const { data: projectStages, isLoading } = trpc.projectGate.getProjectStages.useQuery({});
  const { data: stageStats } = trpc.projectGate.getStageStats.useQuery();

  const projects = useMemo(() => {
    if (!projectStages) return [];
    if (!search.trim()) return projectStages;
    const q = search.toLowerCase();
    return projectStages.filter((p: any) =>
      p.projectName?.toLowerCase().includes(q) ||
      p.projectNo?.toLowerCase().includes(q)
    );
  }, [projectStages, search]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stage distribution */}
      {stageStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(STAGE_CATEGORIES) as [StageCategory, typeof STAGE_CATEGORIES[StageCategory]][]).map(([key, cat]) => {
            const stageCount = cat.stages.reduce((sum, code) => {
              const found = stageStats.byStage?.find((s: any) => s.code === code);
              return sum + (found?.count ?? 0);
            }, 0);
            return (
              <Card key={key} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className={cn("w-3 h-3 rounded-full mb-2", cat.color)} />
                  <p className="font-medium text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.stages.join(", ")}</p>
                  <p className="text-lg font-bold mt-1">{stageCount} <span className="text-xs font-normal text-muted-foreground">{t("rnd.verification.projects")}</span></p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* M0-M12 bar chart */}
      {stageStats?.byStage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />{t("rnd.verification.m0m12Distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {STAGES.map((stage) => {
                const found = stageStats.byStage.find((s: any) => s.code === stage.id);
                const c = found?.count ?? 0;
                const total = stageStats.totalProjects || 1;
                const rate = Math.round((c / total) * 100);
                return (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className="w-12 font-medium text-sm">{stage.id}</div>
                    <div className="w-20 text-xs text-muted-foreground">{stage.name}</div>
                    <div className="flex-1"><Progress value={rate} className="h-2" /></div>
                    <div className="w-16 text-right text-sm">{c} {t("rnd.verification.projects")}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t("rnd.verification.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Project pipeline cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderKanban className="w-5 h-5" />{t("rnd.verification.projectPipeline")}</CardTitle>
          <CardDescription>{t("rnd.verification.projectPipelineDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>{t("rnd.verification.noMatchingProjects")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {projects.map((project: any) => {
                const completed = (project.stages || []).filter((s: any) => s.status === "COMPLETED").map((s: any) => s.code);
                return (
                  <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{project.projectName}</span>
                          <Badge variant="outline" className="text-xs">{project.currentStage}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.projectNo} -- {t("rnd.verification.progress")}: {project.stageProgress}%
                        </p>
                      </div>
                      <Link href={`/pos/projects/${project.projectId}`}>
                        <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                      </Link>
                    </div>
                    <StagePipeline currentStage={project.currentStage} completedStages={completed} compact />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// Tab 2: GateManagementTab
// =====================================================================

function GateManagementTab() {
  const { t } = useLanguage();
  const [selectedStage, setSelectedStage] = useState("M5");
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);
  const { data: projectStages } = trpc.projectGate.getProjectStages.useQuery({});
  const { data: checklist, isLoading } = trpc.projectGate.getGateChecklist.useQuery(
    { projectId: selectedProject ?? 0, stageCode: selectedStage },
    { enabled: !!selectedProject },
  );
  const utils = trpc.useUtils();
  const updateMut = trpc.projectGate.updateChecklistItem.useMutation({
    onSuccess: () => {
      toast.success(t("rnd.verification.checkUpdated"));
      utils.projectGate.getGateChecklist.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const currentStage = STAGES.find(s => s.id === selectedStage);
  const items = checklist ?? [];
  const passCount = items.filter((i: any) => i.status === "PASSED").length;
  const progress = items.length > 0 ? Math.round((passCount / items.length) * 100) : 0;
  const hasMandFail = items.some((i: any) => i.isRequired && i.status === "FAILED");

  // Auto-select first project
  const projectList = projectStages ?? [];
  useEffect(() => {
    if (!selectedProject && projectList.length > 0) {
      setSelectedProject((projectList[0] as any).projectId);
    }
  }, [projectList, selectedProject]);

  return (
    <div className="space-y-4">
      {/* Project selector */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedProject ? String(selectedProject) : ""}
          onValueChange={(v) => setSelectedProject(Number(v))}
        >
          <SelectTrigger className="w-64"><SelectValue placeholder={t("rnd.verification.selectProject")} /></SelectTrigger>
          <SelectContent>
            {projectList.map((p: any) => (
              <SelectItem key={p.projectId} value={String(p.projectId)}>{p.projectName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stage selector strip */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <button
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px]",
                    selectedStage === stage.id ? "bg-primary/20 border border-primary" : "bg-muted/30 hover:bg-muted/50",
                  )}
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    selectedStage === stage.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {stage.id}
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground whitespace-nowrap">{stage.name}</span>
                </button>
                {index < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{currentStage?.id} - {currentStage?.name}</h3>
          <p className="text-sm text-muted-foreground">{currentStage?.description}</p>
        </div>
        <Link href="/gate-checklist-settings">
          <Button variant="outline" size="sm"><Settings className="w-4 h-4 mr-1" />{t("rnd.verification.checkItemConfig")}</Button>
        </Link>
      </div>

      {/* Progress */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">{t("rnd.verification.stageCompletion")}</span>
            <span className="text-sm font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {hasMandFail && (
            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />{t("rnd.verification.mandatoryFailed")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* M3 Dimensions card */}
      {selectedStage === "M3" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("rnd.verification.m3Review")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {M3_DIMENSIONS.map((dim) => (
                <div key={dim.id} className="p-3 border rounded-lg text-center hover:shadow-md transition-shadow">
                  <div className="font-medium text-sm">{dim.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{dim.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* M4 Carriages card */}
      {selectedStage === "M4" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("rnd.verification.m4Review")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {M4_CARRIAGES.map((car) => (
                <div key={car.id} className={cn("p-3 border rounded-lg hover:shadow-md transition-shadow border-l-4")} style={{ borderLeftColor: car.color.replace("bg-", "").includes("blue") ? "#3b82f6" : car.color.includes("yellow") ? "#eab308" : car.color.includes("green") ? "#22c55e" : car.color.includes("purple") ? "#a855f7" : "#f97316" }}>
                  <div className="font-medium text-sm">{car.name}</div>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {car.checkItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-muted-foreground/40" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist items */}
      {!selectedProject ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>{t("rnd.verification.selectProjectFirst")}</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>{t("rnd.verification.noCheckItems")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => {
            const statusColor = item.status === "PASSED"
              ? "border-l-green-500"
              : item.status === "FAILED" ? "border-l-red-500" : "border-l-yellow-500";
            return (
              <Card key={item.id} className={cn("border-l-4 hover:shadow-md transition-shadow", statusColor)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{item.checkItem}</span>
                        {item.isRequired && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                            <Shield className="w-3 h-3 mr-1" />{t("rnd.verification.veto")}
                          </Badge>
                        )}
                        <Badge variant="outline" className={
                          item.status === "PASSED" ? "bg-green-500/20 text-green-400" :
                          item.status === "FAILED" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }>
                          {item.status === "PASSED" ? t("rnd.verification.statusPassed") : item.status === "FAILED" ? t("rnd.verification.statusFailed") : t("rnd.verification.statusPending")}
                        </Badge>
                      </div>
                      {item.evidence && <p className="text-xs text-muted-foreground mt-1">{item.evidence}</p>}
                    </div>
                    <div className="flex gap-1">
                      {item.status !== "PASSED" && (
                        <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ checklistId: item.id, status: "PASSED" })}>
                          <CheckCircle className="w-3 h-3 mr-1" />{t("rnd.verification.passBtn")}
                        </Button>
                      )}
                      {item.status !== "FAILED" && (
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateMut.mutate({ checklistId: item.id, status: "FAILED" })}>
                          <XCircle className="w-3 h-3 mr-1" />{t("rnd.verification.rejectBtn")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Tab 3: ReviewManagementTab
// =====================================================================

const AI_STAGES = [
  { phase: "M1", name: "需求确认", desc: "基于历史项目推荐SOP和工艺流程" },
  { phase: "M2", name: "方案设计", desc: "推荐标准化清洗方案和BOM模板" },
  { phase: "M4", name: "方案冻结", desc: "推荐设计规范和评审文档模板" },
];

function ReviewManagementTab() {
  const { t } = useLanguage();
  const { data: projectStages } = trpc.projectGate.getProjectStages.useQuery({});
  const { data: upcomingGates } = trpc.projectGate.getUpcomingGates.useQuery({ days: 14 });

  // Build a review list from project gates
  const reviews = useMemo(() => {
    if (!projectStages) return [];
    return projectStages.flatMap((p: any) =>
      (p.stages || [])
        .filter((s: any) => s.status === "IN_PROGRESS" || s.status === "COMPLETED" || s.status === "FAILED")
        .map((s: any) => ({
          projectName: p.projectName,
          projectNo: p.projectNo,
          gatePhase: s.code,
          gateName: STAGE_MAP[s.code]?.name ?? s.code,
          status: s.status === "COMPLETED" ? "approved" : s.status === "FAILED" ? "rejected" : "in_review",
          score: s.score,
          completedDate: s.completedDate,
        }))
    );
  }, [projectStages]);

  return (
    <div className="space-y-6">
      {/* Upcoming gates */}
      {upcomingGates && upcomingGates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-orange-400" />{t("rnd.verification.upcomingGates")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingGates.map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-orange-500/5">
                  <div>
                    <span className="font-medium">{g.projectName}</span>
                    <span className="text-muted-foreground mx-2">-</span>
                    <Badge>{g.currentStage}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{t("rnd.verification.completionRate")}: {g.completionRate}%</span>
                    <Badge variant={g.daysRemaining <= 3 ? "destructive" : "secondary"}>
                      {g.daysRemaining}{t("rnd.verification.days")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />{t("rnd.verification.gateApprovalRecords")}</CardTitle>
          <CardDescription>{t("rnd.verification.gateApprovalRecordsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>{t("rnd.verification.noApprovalRecords")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review: any, idx: number) => {
                const gateStatus = GATE_STATUSES[review.status] || GATE_STATUSES.pending;
                const StatusIcon = review.status === "approved" ? CheckCircle : review.status === "rejected" ? XCircle : Clock;
                return (
                  <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", gateStatus.color)}>
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{review.projectName} - {review.gatePhase}</div>
                          <div className="text-sm text-muted-foreground">{review.projectNo} - {review.gateName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={gateStatus.color}>{gateStatus.label}</Badge>
                        {review.score != null && <span className="text-sm font-medium">{review.score}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />{t("rnd.verification.aiRecommendation")}</CardTitle>
          <CardDescription>{t("rnd.verification.aiRecommendationDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">{t("rnd.verification.aiFeatureExplain")}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t("rnd.verification.aiFeatureExplainDesc")}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_STAGES.map((def) => (
                <div key={def.phase} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary">{def.phase}</Badge>
                    <span className="font-medium">{def.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{def.desc}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="w-4 h-4" />{t("rnd.verification.aiSupported")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// Tab 4: PullSignalsTab
// =====================================================================

interface PullSignal {
  id: number;
  upstreamGate: string;
  triggerEvent: string;
  targetAasId: string;
  status: "pending" | "triggered" | "confirmed" | "expired";
  actionPayload: Record<string, unknown>;
}

const INITIAL_SIGNALS: PullSignal[] = [
  { id: 1, upstreamGate: "M6", triggerEvent: "JIS订单到达", targetAasId: "AAS-GRT501-CL01", status: "triggered", actionPayload: { action: "start_production", line: "A3" } },
  { id: 2, upstreamGate: "M7", triggerEvent: "装配完成信号", targetAasId: "AAS-GRT501-TST01", status: "pending", actionPayload: { action: "start_test", protocol: "FAT" } },
  { id: 3, upstreamGate: "M9", triggerEvent: "发货确认", targetAasId: "AAS-GRT502-INS01", status: "confirmed", actionPayload: { action: "prepare_installation", site: "客户现场" } },
  { id: 4, upstreamGate: "M4", triggerEvent: "方案冻结完成", targetAasId: "AAS-GRT503-PRO01", status: "pending", actionPayload: { action: "start_procurement", priority: "high" } },
];

const SIGNAL_STATUS_CONFIG: Record<string, { labelKey: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { labelKey: "rnd.verification.pendingTrigger", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  triggered: { labelKey: "rnd.verification.triggered", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Zap },
  confirmed: { labelKey: "rnd.verification.confirmed", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  expired: { labelKey: "rnd.verification.expired", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

function PullSignalsTab() {
  const { t } = useLanguage();
  const [signals, setSignals] = useState(INITIAL_SIGNALS);

  const handleTrigger = (id: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "triggered" as const } : s));
    toast.success(t("rnd.verification.signalTriggered"));
  };
  const handleConfirm = (id: number) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, status: "confirmed" as const } : s));
    toast.success(t("rnd.verification.signalConfirmed"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("rnd.verification.pullSignals")}</h3>
          <p className="text-sm text-muted-foreground">{t("rnd.verification.pullSignalsDesc")}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("rnd.verification.pendingTrigger")}: {signals.filter(s => s.status === "pending").length}</span>
          <span>{t("rnd.verification.triggered")}: {signals.filter(s => s.status === "triggered").length}</span>
          <span>{t("rnd.verification.confirmed")}: {signals.filter(s => s.status === "confirmed").length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {signals.map((signal) => {
          const sc = SIGNAL_STATUS_CONFIG[signal.status] ?? SIGNAL_STATUS_CONFIG.pending;
          const StatusIcon = sc.icon;
          return (
            <Card key={signal.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-400">{signal.upstreamGate}</Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{signal.triggerEvent}</span>
                      <Badge variant="outline" className={sc.color}><StatusIcon className="w-3 h-3 mr-1" />{t(sc.labelKey)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Factory className="w-4 h-4" />{t("rnd.verification.target")}: {signal.targetAasId}</span>
                    </div>
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono">
                      {JSON.stringify(signal.actionPayload, null, 2)}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {signal.status === "pending" && (
                      <Button size="sm" onClick={() => handleTrigger(signal.id)}><Zap className="w-4 h-4 mr-1" />{t("rnd.verification.trigger")}</Button>
                    )}
                    {signal.status === "triggered" && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirm(signal.id)}><CheckCircle className="w-4 h-4 mr-1" />{t("rnd.verification.confirm")}</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// Main Page Component
// =====================================================================

export default function RDVerificationCenter() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const { data: stageStats, isLoading: statsLoading } = trpc.projectGate.getStageStats.useQuery();

  const totalProjects = stageStats?.totalProjects ?? 0;
  const avgProgress = stageStats?.avgProgress ?? 0;
  const onTrack = stageStats?.byStatus?.onTrack ?? 0;
  const atRisk = stageStats?.byStatus?.atRisk ?? 0;
  const gatePassRate = totalProjects > 0
    ? Math.round(((stageStats?.byStatus?.completed ?? 0) + onTrack) / totalProjects * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />{t("rnd.verification.home")}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{t("rnd.verification.breadcrumb")}</span>
      </nav>

      {/* Page Header */}
      <PageHeader icon={Shield} title={t("rnd.verification.title")} description={t("rnd.verification.description")} />

      {/* M0-M12 Pipeline Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Workflow className="w-4 h-4" />{t("rnd.verification.stageProgress")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StagePipeline
            currentStage="M4"
            completedStages={["M0", "M1", "M2", "M3"]}
          />
        </CardContent>
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label={t("rnd.verification.totalProjects")}
          value={statsLoading ? "..." : totalProjects}
          subtitle={`${t("rnd.verification.active")}: ${onTrack + atRisk}`}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          icon={Workflow}
          label={t("rnd.verification.stageDistribution")}
          value={statsLoading ? "..." : `${stageStats?.byStage?.filter((s: any) => s.count > 0).length ?? 0} ${t("rnd.verification.stages")}`}
          subtitle={`${t("rnd.verification.avgProgress")}: ${avgProgress}%`}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <StatCard
          icon={CheckCircle}
          label={t("rnd.verification.gatePassRate")}
          value={statsLoading ? "..." : `${gatePassRate}%`}
          subtitle={t("rnd.verification.completedOnTrack")}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("rnd.verification.riskProjects")}
          value={statsLoading ? "..." : atRisk + (stageStats?.byStatus?.delayed ?? 0)}
          subtitle={`${t("rnd.verification.delayed")}: ${stageStats?.byStatus?.delayed ?? 0}`}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview"><FolderKanban className="w-4 h-4 mr-2" />{t("rnd.verification.tabOverview")}</TabsTrigger>
          <TabsTrigger value="gates"><FileCheck className="w-4 h-4 mr-2" />{t("rnd.verification.tabGates")}</TabsTrigger>
          <TabsTrigger value="reviews"><ClipboardList className="w-4 h-4 mr-2" />{t("rnd.verification.tabReviews")}</TabsTrigger>
          <TabsTrigger value="signals"><Zap className="w-4 h-4 mr-2" />{t("rnd.verification.tabSignals")}</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />{t("rnd.verification.tabSettings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><ProjectOverviewTab /></TabsContent>
        <TabsContent value="gates" className="mt-6"><GateManagementTab /></TabsContent>
        <TabsContent value="reviews" className="mt-6"><ReviewManagementTab /></TabsContent>
        <TabsContent value="signals" className="mt-6"><PullSignalsTab /></TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{t("rnd.verification.settingsTitle")}</h3>
              <p className="text-muted-foreground mb-4">{t("rnd.verification.settingsDesc")}</p>
              <Link href="/gate-checklist-settings" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Settings className="w-4 h-4" />{t("rnd.verification.openCheckConfig")}
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
