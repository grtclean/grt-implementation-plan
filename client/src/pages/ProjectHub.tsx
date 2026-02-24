/**
 * 项目中心 - 项目向导、需求编辑、交付审批、甘特图、M0-M12状态机
 */
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const showPlaceholder = (featureName: string, t: (key: string) => string) => {
  toast.info(t("projects.hub.featureWip"), { description: `${featureName}${t("projects.hub.featureWipDesc")}` });
};
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderKanban, FileText, CheckSquare, BarChart3, Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

type Project = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  progress: number;
  status: string;
  pmName: string;
};

type Deliverable = {
  id: string;
  name: string;
  type: string;
  status: string;
  reviewer: string;
};

const INITIAL_PROJECTS: Project[] = [
  { id: "prj_001", name: "上汽清洗线项目", customer: "上汽大众", stage: "M5", progress: 65, status: "on_track", pmName: "张工" },
  { id: "prj_002", name: "一汽喷涂线项目", customer: "一汽集团", stage: "M7", progress: 85, status: "at_risk", pmName: "李工" },
  { id: "prj_003", name: "比亚迪装配线", customer: "比亚迪", stage: "M3", progress: 35, status: "on_track", pmName: "王工" },
];

const INITIAL_DELIVERABLES: Deliverable[] = [
  { id: "del_001", name: "设计方案书", type: "design_doc", status: "approved", reviewer: "技术总监" },
  { id: "del_002", name: "BOM清单", type: "bom", status: "pending", reviewer: "采购经理" },
  { id: "del_003", name: "PPAP文件包", type: "ppap", status: "rejected", reviewer: "质量经理" },
];

const STAGE_OPTIONS = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];

const DEFAULT_FORM = { name: "", customer: "", stage: "M0", pmName: "" };

export default function ProjectHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("projects");
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(INITIAL_DELIVERABLES);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track": case "approved": return "bg-green-500/20 text-green-400";
      case "at_risk": case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "delayed": case "rejected": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const handleCreateProject = () => {
    if (!form.name.trim() || !form.customer.trim() || !form.pmName.trim()) {
      toast.error(t("projects.hub.fillRequired"), { description: t("projects.hub.fillRequiredDesc") });
      return;
    }
    const newProject: Project = {
      id: `prj_${Date.now()}`,
      name: form.name.trim(),
      customer: form.customer.trim(),
      stage: form.stage,
      progress: 0,
      status: "on_track",
      pmName: form.pmName.trim(),
    };
    setProjects(prev => [newProject, ...prev]);
    setCreateOpen(false);
    setForm(DEFAULT_FORM);
    toast.success(t("projects.createSuccess"), { description: `${t("projects.hub.projectCreatedDesc")}${newProject.name}` });
  };

  const handleApprove = (del: Deliverable) => {
    setDeliverables(prev =>
      prev.map(d => d.id === del.id ? { ...d, status: "approved" } : d)
    );
    toast.success(t("projects.hub.approved"), { description: `${del.name} ${t("projects.hub.approvedDesc")}` });
  };

  const handleReject = (del: Deliverable) => {
    setDeliverables(prev =>
      prev.map(d => d.id === del.id ? { ...d, status: "rejected" } : d)
    );
    toast.success(t("projects.hub.rejected"), { description: `${del.name} ${t("projects.hub.rejectedDesc")}` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title={t("projects.hub.title")}
        description={t("projects.hub.description")}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />{t("projects.new")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{t("projects.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="proj-name">{t("projects.name")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-name"
                    placeholder={t("projects.enterName")}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-customer">{t("projects.hub.customerName")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-customer"
                    placeholder={t("projects.hub.enterCustomer")}
                    value={form.customer}
                    onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-stage">{t("projects.hub.currentStage")}</Label>
                  <Select value={form.stage} onValueChange={val => setForm(f => ({ ...f, stage: val }))}>
                    <SelectTrigger id="proj-stage">
                      <SelectValue placeholder={t("projects.hub.selectStage")} />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-pm">{t("projects.hub.projectManager")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-pm"
                    placeholder={t("projects.hub.enterPM")}
                    value={form.pmName}
                    onChange={e => setForm(f => ({ ...f, pmName: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(DEFAULT_FORM); }}>{t("projects.hub.cancel")}</Button>
                  <Button onClick={handleCreateProject}>{t("projects.create")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label={t("projects.hub.activeProjects")} value={12} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label={t("projects.hub.onTrack")} value={8} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label={t("projects.hub.atRisk")} value={3} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={CheckSquare} label={t("projects.hub.pendingDeliverables")} value={5} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="projects"><FolderKanban className="w-4 h-4 mr-2" />{t("projects.hub.tabProjects")}</TabsTrigger>
          <TabsTrigger value="requirements"><FileText className="w-4 h-4 mr-2" />{t("projects.hub.tabRequirements")}</TabsTrigger>
          <TabsTrigger value="deliverables"><CheckSquare className="w-4 h-4 mr-2" />{t("projects.hub.tabDeliverables")}</TabsTrigger>
          <TabsTrigger value="gantt"><BarChart3 className="w-4 h-4 mr-2" />{t("projects.hub.tabGantt")}</TabsTrigger>
          <TabsTrigger value="commissioning"><Clock className="w-4 h-4 mr-2" />{t("projects.hub.tabCommissioning")}</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status === "on_track" ? t("projects.hub.statusOnTrack") : project.status === "at_risk" ? t("projects.hub.statusAtRisk") : t("projects.hub.statusDelayed")}
                    </Badge>
                  </div>
                  <CardDescription>{project.customer} · PM: {project.pmName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t("projects.hub.currentStage")}: <Badge variant="outline">{project.stage}</Badge></span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("projects.hub.techRequirements")}</CardTitle><CardDescription>{t("projects.hub.techRequirementsDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[{t("projects.hub.requirementsEditor")}]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("projects.hub.deliverableApproval")}</CardTitle><CardDescription>{t("projects.hub.deliverableApprovalDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deliverables.map((del) => (
                  <div key={del.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium">{del.name}</p>
                        <p className="text-sm text-muted-foreground">{t("projects.hub.reviewer")}: {del.reviewer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(del.status)}>
                        {del.status === "approved" ? t("projects.hub.statusApproved") : del.status === "pending" ? t("projects.hub.statusPending") : t("projects.hub.statusRejected")}
                      </Badge>
                      {del.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => handleApprove(del)}>{t("projects.hub.approve")}</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(del)}>{t("projects.hub.reject")}</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("projects.hub.ganttChart")}</CardTitle><CardDescription>{t("projects.hub.ganttChartDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">[{t("projects.hub.ganttPlaceholder")}]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissioning" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("projects.hub.commissioningRecords")}</CardTitle><CardDescription>{t("projects.hub.commissioningDesc")}</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[{t("projects.hub.commissioningPlaceholder")}]</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
