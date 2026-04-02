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
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SandboxFileImport from "@/components/Sandbox/SandboxFileImport";
import {
  Plus, FolderKanban, Users, FileText,
  CheckCircle2, Clock, Pause, XCircle, Trash2,
  ChevronRight, Target, TrendingUp, DollarSign,
  AlertTriangle, ShieldCheck, ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// 事业部经理及以上角色
const DIRECTOR_AND_ABOVE_ROLES = [
  "admin", "ceo", "cto", "cfo", "director", "hr_director", "bu_gm",
];

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

const requestStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待审批", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  approved: { label: "已批准", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  rejected: { label: "已驳回", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  auto_approved: { label: "自动批准", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
};

export default function ProjectManagement() {
  const { t } = useLanguage();
  const { currentUserRole } = useUserProfile();
  const isDirectorOrAbove = DIRECTOR_AND_ABOVE_ROLES.includes(currentUserRole);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; projectCode: string | null; createdAt: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Delete requests dialog
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);

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
  const [, navigate] = useLocation();
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

  // 直接删除（事业部经理及以上）
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success("项目已删除");
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      setDeleteReason("");
      refetchProjects();
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  });

  // 申请删除
  const requestDeleteMutation = trpc.project.requestDelete.useMutation({
    onSuccess: (result) => {
      if (result.autoApproved) {
        toast.success(result.message);
        refetchProjects();
      } else {
        toast.info(result.message);
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      setDeleteReason("");
    },
    onError: (err) => toast.error(`申请失败: ${err.message}`),
  });

  // 删除申请列表
  const deleteRequestsMutation = trpc.project.listDeleteRequests.useMutation();

  // 一键清理 demo 项目
  const cleanupDemoMutation = trpc.project.cleanupDemoProjects.useMutation({
    onSuccess: (result) => {
      if (result.deletedCount > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
      refetchProjects();
    },
    onError: (err) => toast.error(`清理失败: ${err.message}`),
  });

  // 审批删除
  const approveDeleteMutation = trpc.project.approveDeleteRequest.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      deleteRequestsMutation.mutate({ status: "all" });
      refetchProjects();
    },
    onError: (err) => toast.error(`操作失败: ${err.message}`),
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

  const handleOpenDelete = (e: React.MouseEvent, project: { id: number; name: string; projectCode: string | null; createdAt: string }) => {
    e.stopPropagation();
    setDeleteTarget(project);
    setDeleteReason("");
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget || !deleteReason.trim()) {
      toast.error("请填写删除原因");
      return;
    }

    if (isDirectorOrAbove) {
      // 事业部经理及以上：直接删除
      deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason });
    } else {
      // 普通人员：申请删除
      requestDeleteMutation.mutate({ projectId: deleteTarget.id, reason: deleteReason });
    }
  };

  const handleOpenRequests = () => {
    setIsRequestsOpen(true);
    deleteRequestsMutation.mutate({ status: "all" });
  };

  // 计算是否在2分钟窗口内
  const isWithinGrace = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff <= 2 * 60 * 1000;
  };

  const renderProjectCard = (project: any) => (
    <Card
      key={project.id}
      className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer group"
      onClick={() => navigate(`/pos/projects/${project.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">{project.projectCode}</span>
              <StatusBadge color={typeColors[project.type as keyof typeof typeColors]}>
                {t(`projects.type.${project.type}`)}
              </StatusBadge>
              <StatusBadge color={statusColors[project.status as keyof typeof statusColors]} icon={statusIcons[project.status as keyof typeof statusIcons]}>
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
              <StatusBadge color={priorityColors[project.priority as keyof typeof priorityColors]}>
                {t(`projects.priority.${project.priority}`)}
              </StatusBadge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => handleOpenDelete(e, {
                id: project.id,
                name: project.name,
                projectCode: project.projectCode,
                createdAt: project.createdAt,
              })}
              title="删除项目"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
              {/* 删除申请审批入口（事业部经理及以上可见） */}
              {isDirectorOrAbove && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { if (confirm("确认清理所有 Demo / 乱码 / 旧系统遗留项目？")) cleanupDemoMutation.mutate(); }}
                    disabled={cleanupDemoMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {cleanupDemoMutation.isPending ? "清理中..." : "清理Demo"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenRequests}>
                    <ClipboardList className="w-4 h-4 mr-1" />
                    删除审批
                  </Button>
                </>
              )}
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
                {projects.map(renderProjectCard)}
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
                {projects?.filter(p => p.status === "active").map(renderProjectCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="planning">
            {projects?.filter(p => p.status === "draft").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("projects.noPlanningProjects")}</div>
            ) : (
              <div className="grid gap-4">
                {projects?.filter(p => p.status === "draft").map(renderProjectCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {projects?.filter(p => p.status === "completed").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("projects.noCompletedProjects")}</div>
            ) : (
              <div className="grid gap-4">
                {projects?.filter(p => p.status === "completed").map(renderProjectCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── 删除/申请删除 Dialog ── */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isDirectorOrAbove ? (
                  <><Trash2 className="w-5 h-5 text-destructive" />删除项目</>
                ) : (
                  <><AlertTriangle className="w-5 h-5 text-yellow-500" />申请删除项目</>
                )}
              </DialogTitle>
              <DialogDescription>
                {deleteTarget && (
                  <span className="font-mono text-xs">{deleteTarget.projectCode}</span>
                )}
                {" — "}
                {deleteTarget?.name}
              </DialogDescription>
            </DialogHeader>

            {deleteTarget && (
              <div className="space-y-4">
                {/* 2分钟窗口提示 */}
                {!isDirectorOrAbove && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    isWithinGrace(deleteTarget.createdAt)
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  }`}>
                    {isWithinGrace(deleteTarget.createdAt) ? (
                      <>
                        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>该项目创建不到2分钟，提交后将自动批准删除</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>该项目已超过2分钟免审窗口，删除申请需要上级审批</span>
                      </>
                    )}
                  </div>
                )}

                {isDirectorOrAbove && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>您是事业部经理及以上人员，可直接执行删除</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>删除原因 *</Label>
                  <Textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="请说明删除原因，如：重复项目号、误建等"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>取消</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!deleteReason.trim() || deleteMutation.isPending || requestDeleteMutation.isPending}
              >
                {(deleteMutation.isPending || requestDeleteMutation.isPending) ? "处理中..." : (
                  isDirectorOrAbove ? "确认删除" : (
                    deleteTarget && isWithinGrace(deleteTarget.createdAt) ? "确认删除" : "提交删除申请"
                  )
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── 删除申请审批列表 Dialog ── */}
        <Dialog open={isRequestsOpen} onOpenChange={setIsRequestsOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                项目删除申请
              </DialogTitle>
              <DialogDescription>审批项目工程师提交的删除申请</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {deleteRequestsMutation.isPending ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : (deleteRequestsMutation.data?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无删除申请</div>
              ) : (
                deleteRequestsMutation.data?.map((req: any) => {
                  const statusInfo = requestStatusMap[req.status] || { label: req.status, color: "" };
                  return (
                    <Card key={req.id} className="bg-card/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{req.projectCode}</span>
                            <span className="font-medium">{req.projectName}</span>
                          </div>
                          <Badge variant="outline" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>申请人: {req.requestedByName || `#${req.requestedBy}`}</span>
                          <span className="mx-2">|</span>
                          <span>时间: {new Date(req.createdAt).toLocaleString("zh-CN")}</span>
                          {req.isWithinGracePeriod === 1 && (
                            <Badge variant="outline" className="ml-2 text-[10px] text-blue-400 border-blue-500/30">2分钟内</Badge>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">原因: </span>
                          {req.reason}
                        </div>
                        {req.approvalNote && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">审批备注: </span>
                            {req.approvalNote}
                          </div>
                        )}

                        {/* 待审批的显示审批按钮 */}
                        {req.status === "pending" && isDirectorOrAbove && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => approveDeleteMutation.mutate({ requestId: req.id, approved: true, approvalNote: "批准删除" })}
                              disabled={approveDeleteMutation.isPending}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />批准删除
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveDeleteMutation.mutate({ requestId: req.id, approved: false, approvalNote: "驳回" })}
                              disabled={approveDeleteMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" />驳回
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

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
