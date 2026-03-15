import { useSandboxPageEnhancements } from "@/components/Sandbox/useSandboxPageEnhancements";
import ShortcutOverlay from "@/components/Sandbox/ShortcutOverlay";
import AISuggestionPanelWithMode from "@/components/AISuggestionPanelWithMode";
import ProcessNotebook from "@/components/ProcessNotebook";
import FeatureGuide from "@/components/FeatureGuide";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import SandboxFileImport from "@/components/Sandbox/SandboxFileImport";
import {
  Plus, FolderKanban, Users, FileText,
  CheckCircle2, Clock, Pause, XCircle,
  ChevronRight, Target, TrendingUp, DollarSign
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Status badge colors
const statusColors = createStatusColorMap({
  draft: "slate",
  planning: "blue",
  active: "green",
  on_hold: "yellow",
  completed: "emerald",
  cancelled: "red",
});

const statusIcons: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  planning: <Clock className="w-3 h-3" />,
  active: <TrendingUp className="w-3 h-3" />,
  on_hold: <Pause className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const typeColors = createStatusColorMap({
  standard: "slate",
  key: "orange",
  strategic: "purple",
});

const priorityColors = createStatusColorMap({
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "green",
});

export default function ProjectManagement() {
  const { t } = useLanguage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // ── Sandbox enhancements ──
  const { shortcutOverlayOpen, setShortcutOverlayOpen, shortcuts, lastSaved, isSaving } = useSandboxPageEnhancements({
    sandboxShortcuts: [
      { key: "ctrl+g", label: "过门评审", labelEn: "Pass gate", action: () => { if (selectedProject) toast.info("过门评审已触发 Gate review initiated"); else toast.warning("请先选择项目 Select a project first"); } },
    ],
    autoSave: {
      data: { isCreateDialogOpen },
      onSave: async (d) => { localStorage.setItem("grt-sb-project", JSON.stringify(d)); },
    },
  });
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  
  // Form state
  const [newProject, setNewProject] = useState({
    name: "",
    shortName: "",
    type: "standard" as "standard" | "key" | "strategic",
    priority: "medium" as "critical" | "high" | "medium" | "low",
    budget: "",
    description: "",
  });

  // Queries
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = trpc.project.list.useQuery();
  const { data: statistics } = trpc.project.statistics.useQuery();
  const { data: projectDetail } = trpc.project.getById.useQuery(
    { id: selectedProject! },
    { enabled: !!selectedProject }
  );

  // Mutations
  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      toast.success(t("projects.createSuccess"));
      setIsCreateDialogOpen(false);
      setNewProject({ name: "", shortName: "", type: "standard", priority: "medium", budget: "", description: "" });
      refetchProjects();
    },
    onError: (error) => {
      const msg = error.data?.code === "UNAUTHORIZED"
        ? t("common.pleaseLogin")
        : error.message;
      toast.error(`${t("projects.createFailed")}: ${msg}`);
    },
  });

  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast.error(t("projects.enterName"));
      return;
    }
    createProjectMutation.mutate({
      name: newProject.name,
      shortName: newProject.shortName || undefined,
      type: newProject.type,
      priority: newProject.priority,
      budget: newProject.budget ? parseInt(newProject.budget) : undefined,
      description: newProject.description || undefined,
    });
  };

  return (
      <>
      <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} commonShortcuts={shortcuts.commonShortcuts} sandboxShortcuts={shortcuts.sandboxShortcuts} sandboxTitle="项目管理" />
      <FeatureGuide
        featureId="project-management"
        title={t("projects.guide.title")}
        description={t("projects.guide.desc")}
        steps={[
          { title: t("projects.guide.step1"), description: t("projects.guide.step1.desc") },
          { title: t("projects.guide.step2"), description: t("projects.guide.step2.desc") },
          { title: t("projects.guide.step3"), description: t("projects.guide.step3.desc") },
          { title: t("projects.guide.step4"), description: t("projects.guide.step4.desc") },
          { title: t("projects.guide.step5"), description: t("projects.guide.step5.desc") },
          { title: t("projects.guide.step6"), description: t("projects.guide.step6.desc") }
        ]}
      />
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={FolderKanban}
          title={t("projects.title")}
          description={t("projects.desc")}
          actions={
            <div className="flex items-center gap-2">
              <SandboxFileImport
                accept=".csv,.xlsx"
                label="导入项目计划"
                onImport={(rows, fileName) => { toast.success(`已导入 ${rows.length} 行项目数据 (${fileName})`); refetchProjects(); }}
              />
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("projects.new")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t("projects.createTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("projects.createDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("projects.name")} *</Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder={t("projects.namePlaceholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shortName">{t("projects.shortName")}</Label>
                    <Input
                      id="shortName"
                      value={newProject.shortName}
                      onChange={(e) => setNewProject({ ...newProject, shortName: e.target.value })}
                      placeholder={t("projects.shortNamePlaceholder")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("projects.type")}</Label>
                      <Select
                        value={newProject.type}
                        onValueChange={(value: "standard" | "key" | "strategic") =>
                          setNewProject({ ...newProject, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">{t("projects.type.standard")}</SelectItem>
                          <SelectItem value="key">{t("projects.type.key")}</SelectItem>
                          <SelectItem value="strategic">{t("projects.type.strategic")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("projects.priority")}</Label>
                      <Select
                        value={newProject.priority}
                        onValueChange={(value: "critical" | "high" | "medium" | "low") =>
                          setNewProject({ ...newProject, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">{t("projects.priority.critical")}</SelectItem>
                          <SelectItem value="high">{t("projects.priority.high")}</SelectItem>
                          <SelectItem value="medium">{t("projects.priority.medium")}</SelectItem>
                          <SelectItem value="low">{t("projects.priority.low")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="budget">{t("projects.budget")}</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                      placeholder={t("projects.budgetPlaceholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">{t("projects.description")}</Label>
                    <Textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder={t("projects.descPlaceholder")}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? t("projects.creating") : t("projects.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          }
        />

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={FolderKanban} label={t("projects.stats.total")} value={statistics.total} />
            <StatCard icon={TrendingUp} label={t("projects.stats.active")} value={statistics.byStatus.active} iconColor="text-green-400" iconBg="bg-green-500/10" />
            <StatCard icon={CheckCircle2} label={t("projects.stats.completed")} value={statistics.byStatus.completed} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
            <StatCard icon={DollarSign} label={t("projects.stats.totalBudget")} value={`${statistics.totalBudget}${t("projects.budgetUnit")}`} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
          </div>
        )}

        {/* Projects List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">{t("projects.tabs.all")}</TabsTrigger>
            <TabsTrigger value="active">{t("projects.tabs.active")}</TabsTrigger>
            <TabsTrigger value="planning">{t("projects.tabs.planning")}</TabsTrigger>
            <TabsTrigger value="completed">{t("projects.tabs.completed")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {projectsLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t("projects.loading")}</div>
            ) : projects && projects.length > 0 ? (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card 
                    key={project.id} 
                    className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-muted-foreground">{project.projectCode}</span>
                            <StatusBadge color={typeColors[project.type]}>
                              {t(`projects.type.${project.type}`)}
                            </StatusBadge>
                            <StatusBadge color={statusColors[project.status]} icon={statusIcons[project.status]}>
                              {t(`projects.status.${project.status}`)}
                            </StatusBadge>
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {project.currentPhase || "M0"}
                            </span>
                            {project.budget && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {project.budget}{t("projects.budgetUnit")}
                              </span>
                            )}
                            <StatusBadge color={priorityColors[project.priority]}>
                              {t(`projects.priority.${project.priority}`)}
                            </StatusBadge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/50 border-border border-dashed">
                <CardContent className="p-8 text-center">
                  <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("projects.noProjects")}</h3>
                  <p className="text-muted-foreground mb-4">{t("projects.noProjectsDesc")}</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("projects.new")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active">
            {projects?.filter(p => p.status === "active").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("projects.noActiveProjects")}</div>
            ) : (
              <div className="grid gap-4">
                {projects?.filter(p => p.status === "active").map((project) => (
                  <Card key={project.id} className="bg-card/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono text-muted-foreground">{project.projectCode}</span>
                          <h3 className="font-semibold">{project.name}</h3>
                        </div>
                        <StatusBadge color={statusColors.active} icon={<TrendingUp className="w-3 h-3" />}>
                          {t("projects.status.active")}
                        </StatusBadge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="planning">
            {projects?.filter(p => p.status === "draft").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("projects.noPlanningProjects")}</div>
            ) : (
              <div className="grid gap-4">
                {projects?.filter(p => p.status === "draft").map((project) => (
                  <Card key={project.id} className="bg-card/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono text-muted-foreground">{project.projectCode}</span>
                          <h3 className="font-semibold">{project.name}</h3>
                        </div>
                        <StatusBadge color={statusColors.draft} icon={<FileText className="w-3 h-3" />}>
                          {t("projects.status.draft")}
                        </StatusBadge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {projects?.filter(p => p.status === "completed").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("projects.noCompletedProjects")}</div>
            ) : (
              <div className="grid gap-4">
                {projects?.filter(p => p.status === "completed").map((project) => (
                  <Card key={project.id} className="bg-card/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono text-muted-foreground">{project.projectCode}</span>
                          <h3 className="font-semibold">{project.name}</h3>
                        </div>
                        <StatusBadge color={statusColors.completed} icon={<CheckCircle2 className="w-3 h-3" />}>
                          {t("projects.status.completed")}
                        </StatusBadge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* AI Suggestion Panel */}
        <AISuggestionPanelWithMode
          processType="project-management"
          processId="list"
          assistantType="project"
        />
        
        {/* Process Notebook */}
        <ProcessNotebook processType="project-management" processId="list" />
      </div>
      </>
  );
}
