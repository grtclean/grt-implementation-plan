import Layout from "@/components/Layout";
import AISuggestionPanelWithMode from "@/components/AISuggestionPanelWithMode";
import ProcessNotebook from "@/components/ProcessNotebook";
import FeatureGuide from "@/components/FeatureGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Plus, FolderKanban, Users, FileText, 
  CheckCircle2, Clock, Pause, XCircle,
  ChevronRight, Target, TrendingUp, DollarSign
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Status badge colors
const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  planning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  on_hold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  planning: <Clock className="w-3 h-3" />,
  active: <TrendingUp className="w-3 h-3" />,
  on_hold: <Pause className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const typeColors: Record<string, string> = {
  standard: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  key: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  strategic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

export default function ProjectManagement() {
  const { t } = useLanguage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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
    <Layout>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-primary" />
              {t("projects.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("projects.desc")}
            </p>
          </div>
          
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

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-primary/10 text-primary">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("projects.stats.total")}</p>
                    <p className="text-2xl font-bold">{statistics.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-green-500/10 text-green-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("projects.stats.active")}</p>
                    <p className="text-2xl font-bold">{statistics.byStatus.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("projects.stats.completed")}</p>
                    <p className="text-2xl font-bold">{statistics.byStatus.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-orange-500/10 text-orange-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("projects.stats.totalBudget")}</p>
                    <p className="text-2xl font-bold">{statistics.totalBudget}{t("projects.budgetUnit")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                            <Badge variant="outline" className={typeColors[project.type]}>
                              {t(`projects.type.${project.type}`)}
                            </Badge>
                            <Badge variant="outline" className={statusColors[project.status]}>
                              {statusIcons[project.status]}
                              <span className="ml-1">
                                {t(`projects.status.${project.status}`)}
                              </span>
                            </Badge>
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
                            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[project.priority]}`}>
                              {t(`projects.priority.${project.priority}`)}
                            </span>
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
                        <Badge variant="outline" className={statusColors.active}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {t("projects.status.active")}
                        </Badge>
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
                        <Badge variant="outline" className={statusColors.draft}>
                          <FileText className="w-3 h-3 mr-1" />
                          {t("projects.status.draft")}
                        </Badge>
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
                        <Badge variant="outline" className={statusColors.completed}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t("projects.status.completed")}
                        </Badge>
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
    </Layout>
  );
}
