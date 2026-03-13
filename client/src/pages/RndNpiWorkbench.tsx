/**
 * R&D NPI/NPD Workbench — 新产品导入与开发工作台
 *
 * 6-tab workbench:
 * 1. Portfolio (项目组合) — project cards + stage pipeline
 * 2. Gate Reviews (阶段门) — Concept→EVT→DVT→PVT→MP timeline
 * 3. Sandbox BOM (研发BOM) — version tree, components, AVL gauge
 * 4. V&V Testing (验证测试) — heatmap, dynamic metrics, auto-eval
 * 5. Assembly Routing (装配路线) — step editor (≥ PVT)
 * 6. Analytics (分析看板) — portfolio dashboard, healthcards
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  TestTube, Plus, ChevronRight, CheckCircle, XCircle, Clock,
  AlertTriangle, Package, BarChart3, ArrowRight, Lock, Unlock,
  Upload, Eye, Layers, Settings,
} from "lucide-react";

const STAGES = ["concept", "evt", "dvt", "pvt", "mass_production"] as const;
const STAGE_LABELS: Record<string, Record<string, string>> = {
  concept: { zh: "概念", en: "Concept" },
  evt: { zh: "EVT", en: "EVT" },
  dvt: { zh: "DVT", en: "DVT" },
  pvt: { zh: "PVT", en: "PVT" },
  mass_production: { zh: "量产", en: "MP" },
};
const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  robotics: { zh: "机器人", en: "Robotics" },
  vision_ai: { zh: "视觉AI", en: "Vision AI" },
  fluid_mechanics: { zh: "流体力学", en: "Fluid Mech." },
  mechatronics: { zh: "机电一体化", en: "Mechatronics" },
  software: { zh: "软件", en: "Software" },
};
const VERDICT_COLORS: Record<string, string> = {
  pass: "bg-green-500",
  fail: "bg-red-500",
  conditional: "bg-yellow-500",
  not_run: "bg-gray-300",
};

export default function RndNpiWorkbench() {
  const { language } = useLanguage();
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [stageFilter, setStageFilter] = useState<string>("__all__");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // ─── Queries ────────────────────────────────────────────
  const projectsQuery = trpc.rndNpi.project.list.useQuery({
    category: categoryFilter === "__all__" ? undefined : categoryFilter,
    stage: stageFilter === "__all__" ? undefined : stageFilter,
    limit: 100,
  });

  const selectedProject = trpc.rndNpi.project.getById.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const gateReviews = trpc.rndNpi.gate.listByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const sandboxBoms = trpc.rndNpi.sandboxBom.listByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const testRecords = trpc.rndNpi.testing.listByProject.useQuery(
    { projectId: selectedProjectId!, limit: 200 },
    { enabled: !!selectedProjectId }
  );

  const vvMatrix = trpc.rndNpi.testing.getVVMatrix.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const routings = trpc.rndNpi.routing.listByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const dashboard = trpc.rndNpi.analytics.portfolioDashboard.useQuery();

  const healthcard = trpc.rndNpi.analytics.projectHealthcard.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  // ─── Mutations ──────────────────────────────────────────
  const defaultNewProject = { name: "", nameEn: "", category: "robotics" as const, description: "", budget: "", riskLevel: "medium" };
  const createProject = trpc.rndNpi.project.create.useMutation({
    onSuccess: (data) => {
      projectsQuery.refetch();
      setShowCreateDialog(false);
      setNewProject(defaultNewProject);
      toast.success(`项目 ${data.projectCode} 创建成功`);
    },
    onError: (err) => {
      toast.error(`创建失败: ${err.message}`);
    },
  });

  // ─── Create Form State ─────────────────────────────────
  const [newProject, setNewProject] = useState(defaultNewProject);

  const projects = projectsQuery.data?.items ?? [];

  // ═══════════════════════════════════════════════════════
  // TAB 1: Portfolio
  // ═══════════════════════════════════════════════════════

  const renderPortfolio = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("全部分类", "All Categories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("全部", "All")}</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v[language === "en" ? "en" : "zh"]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("全部阶段", "All Stages")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("全部", "All")}</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s][language === "en" ? "en" : "zh"]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />{t("新建项目", "New Project")}
        </Button>
      </div>

      {/* Stage Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("研发阶段管线", "R&D Stage Pipeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 items-center">
            {STAGES.map((stage, i) => {
              const stageProjects = projects.filter((p) => p.currentStage === stage);
              return (
                <div key={stage} className="flex items-center">
                  <div className="text-center min-w-[80px]">
                    <div className="text-xs font-medium">{STAGE_LABELS[stage][language === "en" ? "en" : "zh"]}</div>
                    <div className={`mx-auto mt-1 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-sm ${
                      stageProjects.length > 0 ? "bg-blue-600" : "bg-gray-300"
                    }`}>
                      {stageProjects.length}
                    </div>
                  </div>
                  {i < STAGES.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400 mx-1" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Card
            key={p.id}
            className={`cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
              selectedProjectId === p.id ? "ring-2 ring-blue-600" : ""
            }`}
            onClick={() => setSelectedProjectId(p.id)}
          >
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.projectCode}</div>
                </div>
                <Badge variant={p.status === "active" ? "default" : "secondary"}>
                  {p.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{CATEGORY_LABELS[p.category]?.[language === "en" ? "en" : "zh"] ?? p.category}</Badge>
                <Badge variant="outline">{STAGE_LABELS[p.currentStage ?? "concept"]?.[language === "en" ? "en" : "zh"]}</Badge>
              </div>
              <Progress value={p.completionPercent ?? 0} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("预算", "Budget")}: ¥{parseFloat(p.budget ?? "0").toLocaleString()}</span>
                <span>{p.completionPercent ?? 0}%</span>
              </div>
              {p.ctoSignoffRequired && (
                <div className="flex gap-1 text-xs">
                  <Badge variant="outline" className="text-[10px]">CTO{t("签批", " Sign-off")}</Badge>
                  {p.ceoSignoffRequired && <Badge variant="outline" className="text-[10px]">CEO{t("签批", " Sign-off")}</Badge>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            {t("暂无R&D项目", "No R&D projects yet")}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("新建R&D项目", "Create R&D Project")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("项目名称", "Project Name")}</Label>
              <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("英文名称", "English Name")}</Label>
              <Input value={newProject.nameEn} onChange={(e) => setNewProject({ ...newProject, nameEn: e.target.value })} />
            </div>
            <div>
              <Label>{t("技术分类", "Category")}</Label>
              <Select value={newProject.category} onValueChange={(v) => setNewProject({ ...newProject, category: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v[language === "en" ? "en" : "zh"]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("预算 (CNY)", "Budget (CNY)")}</Label>
              <Input type="number" value={newProject.budget} onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })} />
            </div>
            <div>
              <Label>{t("描述", "Description")}</Label>
              <Textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("取消", "Cancel")}</Button>
            <Button
              onClick={() => createProject.mutate(newProject)}
              disabled={!newProject.name || createProject.isPending}
            >
              {t("创建", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ═══════════════════════════════════════════════════════
  // TAB 2: Gate Reviews
  // ═══════════════════════════════════════════════════════

  const renderGateReviews = () => {
    if (!selectedProjectId) return <EmptyProjectPrompt t={t} />;
    const reviews = gateReviews.data ?? [];
    const project = selectedProject.data;
    return (
      <div className="space-y-4">
        {/* Stage Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("阶段门审查时间线", "Gate Review Timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center flex-wrap">
              {STAGES.map((stage, i) => {
                const stageReviews = reviews.filter((r) => r.gateStage === stage);
                const latestDecision = stageReviews[0]?.decision;
                const isCurrent = project?.currentStage === stage;
                return (
                  <div key={stage} className="flex items-center">
                    <div className={`p-2 rounded-lg border-2 min-w-[100px] text-center ${
                      isCurrent ? "border-blue-600 bg-blue-50" :
                      latestDecision === "approved" ? "border-green-500 bg-green-50" :
                      latestDecision === "rejected" ? "border-red-500 bg-red-50" :
                      "border-gray-200"
                    }`}>
                      <div className="text-xs font-medium">{STAGE_LABELS[stage][language === "en" ? "en" : "zh"]}</div>
                      {latestDecision && (
                        <Badge variant={latestDecision === "approved" ? "default" : latestDecision === "rejected" ? "destructive" : "secondary"} className="mt-1 text-[10px]">
                          {latestDecision}
                        </Badge>
                      )}
                      {stageReviews[0]?.ctoApproved && <Badge variant="outline" className="mt-1 text-[10px] ml-1">CTO</Badge>}
                      {stageReviews[0]?.ceoApproved && <Badge variant="outline" className="mt-1 text-[10px] ml-1">CEO</Badge>}
                    </div>
                    {i < STAGES.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Review History */}
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {STAGE_LABELS[r.gateStage]?.[language === "en" ? "en" : "zh"]} — {t("第", "Round ")}
                    {r.reviewRound}{t("轮", "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.reviewerName} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                  </div>
                  {r.conditions && <div className="text-xs text-yellow-600 mt-1">{t("条件", "Conditions")}: {r.conditions}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {r.checklistTotal != null && r.checklistTotal > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {r.checklistPassed}/{r.checklistTotal} {t("通过", "passed")}
                    </span>
                  )}
                  <DecisionBadge decision={r.decision ?? "pending"} />
                </div>
              </CardContent>
            </Card>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("暂无门审查记录", "No gate reviews yet")}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // TAB 3: Sandbox BOM
  // ═══════════════════════════════════════════════════════

  const renderSandboxBom = () => {
    if (!selectedProjectId) return <EmptyProjectPrompt t={t} />;
    const boms = sandboxBoms.data ?? [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boms.map((bom) => (
            <Card key={bom.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <div className="font-semibold text-sm">{bom.bomCode}</div>
                  <Badge variant={bom.status === "frozen" ? "default" : bom.status === "promoted" ? "secondary" : "outline"}>
                    {bom.status === "frozen" && <Lock className="w-3 h-3 mr-1" />}
                    {bom.status === "draft" && <Unlock className="w-3 h-3 mr-1" />}
                    {bom.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{bom.versionLabel}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t("组件数", "Components")}:</span> {bom.totalComponents ?? 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">AVL:</span> {bom.avlApprovedCount ?? 0}/{bom.totalComponents ?? 0}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t("估算成本", "Est. Cost")}:</span> ¥{parseFloat(bom.totalEstimatedCost ?? "0").toLocaleString()}
                  </div>
                </div>
                {/* AVL Compliance Gauge */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t("AVL合规率", "AVL Compliance")}</span>
                    <span>{bom.totalComponents && (bom.totalComponents as number) > 0
                      ? ((((bom.avlApprovedCount ?? 0) as number) / ((bom.totalComponents ?? 1) as number)) * 100).toFixed(0)
                      : 0}%</span>
                  </div>
                  <Progress
                    value={bom.totalComponents && (bom.totalComponents as number) > 0
                      ? (((bom.avlApprovedCount ?? 0) as number) / ((bom.totalComponents ?? 1) as number)) * 100
                      : 0}
                    className="h-2"
                  />
                </div>
                {bom.frozenForGate && (
                  <Badge variant="outline" className="text-[10px]">
                    {t("冻结于", "Frozen for")} {STAGE_LABELS[bom.frozenForGate]?.[language === "en" ? "en" : "zh"]}
                  </Badge>
                )}
                {bom.promotedToBomMasterId && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("已推广至生产BOM", "Promoted")} #{bom.promotedToBomMasterId}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
          {boms.length === 0 && (
            <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
              {t("暂无研发BOM", "No sandbox BOMs yet")}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // TAB 4: V&V Testing
  // ═══════════════════════════════════════════════════════

  const renderTesting = () => {
    if (!selectedProjectId) return <EmptyProjectPrompt t={t} />;
    const matrix = vvMatrix.data;
    const tests = testRecords.data?.items ?? [];
    const testTypes = ["unit_test", "integration_test", "stress_test", "environmental", "compliance", "performance"];
    return (
      <div className="space-y-4">
        {/* V&V Heatmap */}
        {matrix && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("V&V 验证矩阵", "V&V Verification Matrix")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-1">{t("阶段/类型", "Stage/Type")}</th>
                      {testTypes.map((tt) => (
                        <th key={tt} className="p-1 text-center">{tt.replace("_", " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.map((stage) => (
                      <tr key={stage}>
                        <td className="p-1 font-medium">{STAGE_LABELS[stage][language === "en" ? "en" : "zh"]}</td>
                        {testTypes.map((tt) => {
                          const cell = matrix[stage]?.[tt];
                          if (!cell || cell.total === 0) return <td key={tt} className="p-1 text-center">-</td>;
                          const pct = cell.total > 0 ? Math.round((cell.pass / cell.total) * 100) : 0;
                          return (
                            <td key={tt} className="p-1 text-center">
                              <div className={`inline-block rounded px-2 py-0.5 text-white ${
                                pct === 100 ? "bg-green-500" : pct > 50 ? "bg-yellow-500" : pct > 0 ? "bg-red-500" : "bg-gray-300"
                              }`}>
                                {cell.pass}/{cell.total}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Records */}
        <div className="space-y-2">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardContent className="pt-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{test.testCode} — {test.testName}</div>
                  <div className="text-xs text-muted-foreground">
                    {STAGE_LABELS[test.gateStage]?.[language === "en" ? "en" : "zh"]} · {test.testType?.replace("_", " ")}
                    {test.isMandatory && <Badge variant="destructive" className="ml-2 text-[10px]">{t("必须", "Mandatory")}</Badge>}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${VERDICT_COLORS[test.verdict ?? "not_run"]}`} title={test.verdict ?? "not_run"} />
              </CardContent>
            </Card>
          ))}
          {tests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("暂无测试记录", "No test records yet")}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // TAB 5: Assembly Routing
  // ═══════════════════════════════════════════════════════

  const renderRouting = () => {
    if (!selectedProjectId) return <EmptyProjectPrompt t={t} />;
    const allRoutings = routings.data ?? [];
    const project = selectedProject.data;
    const stageIdx = STAGES.indexOf((project?.currentStage ?? "concept") as typeof STAGES[number]);
    const pvtIdx = STAGES.indexOf("pvt");
    const isRoutingEnabled = stageIdx >= pvtIdx;
    return (
      <div className="space-y-4">
        {!isRoutingEnabled && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {t("装配路线需要项目达到PVT阶段或更高", "Assembly routings require PVT stage or later")}
              </span>
            </CardContent>
          </Card>
        )}
        <div className="space-y-2">
          {allRoutings.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{r.routingCode} {r.version}</div>
                    <div className="text-xs text-muted-foreground">{r.routingName}</div>
                  </div>
                  <Badge variant={r.status === "active" ? "default" : "outline"}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t("总工时", "Total Cycle")}: {parseFloat(r.totalCycleTimeMinutes ?? "0").toFixed(1)} min
                </div>
              </CardContent>
            </Card>
          ))}
          {allRoutings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("暂无装配路线", "No routings yet")}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // TAB 6: Analytics
  // ═══════════════════════════════════════════════════════

  const renderAnalytics = () => {
    const d = dashboard.data;
    const h = healthcard.data;
    return (
      <div className="space-y-4">
        {/* Portfolio Dashboard */}
        {d && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t("总项目数", "Total Projects")} value={d.totalProjects} icon={<Layers className="w-4 h-4" />} />
            <StatCard label={t("门审查总数", "Gate Reviews")} value={d.totalGateReviews} icon={<CheckCircle className="w-4 h-4" />} />
            <StatCard label={t("门通过率", "Gate Pass Rate")} value={`${d.gatePassRate}%`} icon={<BarChart3 className="w-4 h-4" />} />
            <StatCard
              label={t("按阶段", "By Stage")}
              value={Object.entries(d.byStage).map(([k, v]) => `${STAGE_LABELS[k]?.[language === "en" ? "en" : "zh"] ?? k}: ${v}`).join(", ")}
              icon={<ArrowRight className="w-4 h-4" />}
              isText
            />
          </div>
        )}

        {/* Project Healthcard */}
        {h && selectedProjectId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("项目健康度", "Project Healthcard")} — {h.project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">{t("BOM成熟度", "BOM Maturity")}</div>
                  <div className="font-semibold">{h.bomMaturity}%</div>
                  <Progress value={h.bomMaturity} className="h-1.5 mt-1" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{t("测试覆盖率", "Test Coverage")}</div>
                  <div className="font-semibold">{h.testCoverage}%</div>
                  <Progress value={h.testCoverage} className="h-1.5 mt-1" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{t("测试通过率", "Test Pass Rate")}</div>
                  <div className="font-semibold">{h.testPassRate}%</div>
                  <Progress value={h.testPassRate} className="h-1.5 mt-1" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">{t("预算使用", "Budget Used")}</div>
                  <div className="font-semibold">{h.budgetUsedPercent}%</div>
                  <Progress value={h.budgetUsedPercent} className="h-1.5 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <TestTube className="w-6 h-6 text-purple-600" />
        <h1 className="text-xl font-bold">{t("NPI/NPD 新产品开发工作台", "NPI/NPD Workbench")}</h1>
        {selectedProject.data && (
          <Badge variant="outline" className="ml-auto">
            {selectedProject.data.projectCode} — {selectedProject.data.name}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="portfolio">{t("项目组合", "Portfolio")}</TabsTrigger>
          <TabsTrigger value="gates">{t("阶段门", "Gates")}</TabsTrigger>
          <TabsTrigger value="bom">{t("研发BOM", "BOM")}</TabsTrigger>
          <TabsTrigger value="testing">{t("验证测试", "V&V")}</TabsTrigger>
          <TabsTrigger value="routing">{t("装配路线", "Routing")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("分析看板", "Analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">{renderPortfolio()}</TabsContent>
        <TabsContent value="gates">{renderGateReviews()}</TabsContent>
        <TabsContent value="bom">{renderSandboxBom()}</TabsContent>
        <TabsContent value="testing">{renderTesting()}</TabsContent>
        <TabsContent value="routing">{renderRouting()}</TabsContent>
        <TabsContent value="analytics">{renderAnalytics()}</TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────

function EmptyProjectPrompt({ t }: { t: (zh: string, en: string) => string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{t("请先在「项目组合」标签页中选择一个项目", "Please select a project from the Portfolio tab first")}</p>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    approved: "default",
    conditional: "secondary",
    rejected: "destructive",
    deferred: "outline",
    pending: "outline",
  };
  const icons: Record<string, React.ReactNode> = {
    approved: <CheckCircle className="w-3 h-3 mr-1" />,
    rejected: <XCircle className="w-3 h-3 mr-1" />,
    pending: <Clock className="w-3 h-3 mr-1" />,
    conditional: <AlertTriangle className="w-3 h-3 mr-1" />,
    deferred: <Clock className="w-3 h-3 mr-1" />,
  };
  return (
    <Badge variant={variants[decision] ?? "outline"}>
      {icons[decision]}{decision}
    </Badge>
  );
}

function StatCard({ label, value, icon, isText }: { label: string; value: string | number; icon: React.ReactNode; isText?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}{label}</div>
        <div className={isText ? "text-xs font-medium" : "text-xl font-bold"}>{value}</div>
      </CardContent>
    </Card>
  );
}
