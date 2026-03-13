/**
 * O365SyncPanel — Panel showing OneDrive sync status, Planner tasks,
 * and OneNote quick-access within the workspace.
 *
 * Designed to sit alongside the workspace file browser.
 */
import { useState, useEffect } from "react";
import {
  Cloud, CloudUpload, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  ListTodo, BookOpen, FolderSync, ExternalLink, Plus, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const priorityLabels: Record<number, { label: string; color: string }> = {
  0: { label: 紧急", color: "bg-red-500 },
  1: { label: 重要", color: "bg-orange-500 },
  5: { label: 中等", color: "bg-blue-500 },
  9: { label: 低", color: "bg-gray-400 },
};

export default function O365SyncPanel() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Planner
  const plansQuery = trpc.microsoftGraph.planner.getPlans.useQuery(undefined, QUERY_OPTS);
  const tasksQuery = trpc.microsoftGraph.planner.getTasks.useQuery(
    { planId: selectedPlanId! },
    { ...QUERY_OPTS, enabled: !!selectedPlanId },
  );

  // OneNote
  const notebooksQuery = trpc.microsoftGraph.onenote.getNotebooks.useQuery(undefined, QUERY_OPTS);
  const sectionsQuery = trpc.microsoftGraph.onenote.getSections.useQuery(
    { notebookId: selectedNotebookId! },
    { ...QUERY_OPTS, enabled: !!selectedNotebookId },
  );
  const pagesQuery = trpc.microsoftGraph.onenote.getPages.useQuery(
    { sectionId: selectedSectionId! },
    { ...QUERY_OPTS, enabled: !!selectedSectionId },
  );

  // OneDrive sync
  const syncStatusQuery = trpc.microsoftGraph.onedrive.getSyncStatus.useQuery(undefined, QUERY_OPTS);
  const driveFilesQuery = trpc.microsoftGraph.onedrive.listFiles.useQuery(undefined, QUERY_OPTS);

  const plans = plansQuery.data?.plans ?? [];
  const tasks = tasksQuery.data?.tasks ?? [];
  const notebooks = notebooksQuery.data?.notebooks ?? [];
  const sections = sectionsQuery.data?.sections ?? [];
  const pages = pagesQuery.data?.pages ?? [];
  const syncStatus = syncStatusQuery.data;
  const driveFiles = driveFilesQuery.data?.items ?? [];

  // Auto-select first plan/notebook (in useEffect to avoid setState during render)
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);
  useEffect(() => {
    if (notebooks.length > 0 && !selectedNotebookId) setSelectedNotebookId(notebooks[0].id);
  }, [notebooks, selectedNotebookId]);

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="planner" className="flex-1 flex flex-col">
        <TabsList className="shrink-0 w-full">
          <TabsTrigger value="planner" className="flex-1 text-xs">
            <ListTodo className="w-3.5 h-3.5 mr-1" />Planner
          </TabsTrigger>
          <TabsTrigger value="onenote" className="flex-1 text-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1" />OneNote
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex-1 text-xs">
            <FolderSync className="w-3.5 h-3.5 mr-1" />OneDrive
          </TabsTrigger>
        </TabsList>

        {/* ── Planner Tab ── */}
        <TabsContent value="planner" className="flex-1 overflow-y-auto mt-0 p-3 space-y-3">
          {/* Plan selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {plans.map(plan => (
              <Button
                key={plan.id}
                variant={selectedPlanId === plan.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {plan.title}
              </Button>
            ))}
          </div>

          {/* Task list */}
          <div className="space-y-2">
            {tasks.map(task => {
              const pri = priorityLabels[task.priority] ?? priorityLabels[5];
              return (
                <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg border border-[#edebe9] hover:border-[#c8c6c4] bg-white">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${pri.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.percentComplete === 100 ? "line-through text-[#a19f9d]" : "text-[#323130]"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={task.percentComplete} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-[#a19f9d] shrink-0">{task.percentComplete}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#a19f9d]">
                      {task.dueDateTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(task.dueDateTime).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                      {task.assignedTo.length > 0 && (
                        <span>{task.assignedTo.join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <p className="text-xs text-[#a19f9d] text-center py-4">
                {isEn ? "No tasks" : "暂无任务"}
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── OneNote Tab ── */}
        <TabsContent value="onenote" className="flex-1 overflow-y-auto mt-0 p-3 space-y-3">
          {/* Notebook selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {notebooks.map(nb => (
              <Button
                key={nb.id}
                variant={selectedNotebookId === nb.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setSelectedNotebookId(nb.id); setSelectedSectionId(null); }}
              >
                <BookOpen className="w-3 h-3 mr-1" />{nb.displayName}
              </Button>
            ))}
          </div>

          {/* Section chips */}
          {sections.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {sections.map(sec => (
                <Badge
                  key={sec.id}
                  variant={selectedSectionId === sec.id ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setSelectedSectionId(sec.id)}
                >
                  {sec.displayName} ({sec.pageCount})
                </Badge>
              ))}
            </div>
          )}

          {/* Pages */}
          <div className="space-y-1.5">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-2 p-2 rounded border border-[#edebe9] hover:border-[#c8c6c4] bg-white cursor-pointer">
                <BookOpen className="w-3.5 h-3.5 text-[#7719aa] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#323130] truncate">{page.title}</p>
                  <p className="text-[10px] text-[#a19f9d]">
                    {new Date(page.lastModifiedDateTime).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <ExternalLink className="w-3 h-3 text-[#a19f9d]" />
              </div>
            ))}
            {selectedSectionId && pages.length === 0 && (
              <p className="text-xs text-[#a19f9d] text-center py-4">
                {isEn ? "No pages" : "暂无页面"}
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── OneDrive Sync Tab ── */}
        <TabsContent value="sync" className="flex-1 overflow-y-auto mt-0 p-3 space-y-3">
          {/* Sync status card */}
          <Card className="border-[#edebe9]">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-[#0078d4]" />
                {isEn ? "Sync Status" : "同步状态"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#a19f9d]">{isEn ? "Synced" : "已同步"}</span>
                  <p className="font-medium text-[#323130]">{syncStatus?.itemsSynced ?? 0} {isEn ? "files" : "文件"}</p>
                </div>
                <div>
                  <span className="text-[#a19f9d]">{t("workspace.lastSynced") || "上次同步"}</span>
                  <p className="font-medium text-[#323130]">
                    {syncStatus?.lastSyncAt
                      ? new Date(syncStatus.lastSyncAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                {t("workspace.syncFromOneDrive") || "从 OneDrive 同步"}
              </Button>
            </CardContent>
          </Card>

          {/* OneDrive files */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#605e5c]">{isEn ? "OneDrive Files" : "OneDrive 文件"}</p>
            {driveFiles.map((file: any) => (
              <div key={file.id} className="flex items-center gap-2 p-2 rounded border border-[#edebe9] hover:border-[#c8c6c4] bg-white">
                <CloudUpload className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#323130] truncate">{file.name}</p>
                  <p className="text-[10px] text-[#a19f9d]">
                    {(file.size / 1024).toFixed(0)} KB &middot; {file.createdBy}
                  </p>
                </div>
                {file.webUrl && (
                  <a href={file.webUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 text-[#a19f9d] hover:text-[#0078d4]" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
