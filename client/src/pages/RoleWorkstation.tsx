/**
 * GRT 5.0 岗位工作站 — 军团管理
 *
 * 公用电脑员工登录后的岗位着陆页，显示：
 * 1. 岗位职责 + AI助理等级
 * 2. 即将开展的BOM工作任务SOP
 * 3. 全部工作任务SOP
 * 4. 质量要求
 * 5. 工作要求（日常/周度/月度清单）
 * 6. 公司规范（GRT GS标准）
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile, ROLE_CONFIGS, type UserRole } from "@/contexts/UserProfileContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  User, Shield, BookOpen, CheckCircle2, ClipboardList, Factory,
  FileText, AlertTriangle, Star, Clock, Calendar, Briefcase,
  Zap, ChevronRight, ExternalLink, Bot, Award, Target,
  ShieldCheck, ScrollText, Gauge, ArrowRight,
} from "lucide-react";

// ── Loading skeleton ──
function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

// ── Priority badge ──
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    normal: "bg-gray-100 text-gray-600 border-gray-300",
  };
  const labels: Record<string, string> = { critical: "Critical", high: "High", normal: "Normal" };
  return (
    <Badge variant="outline" className={`text-xs ${colors[priority] || colors.normal}`}>
      {labels[priority] || priority}
    </Badge>
  );
}

// ── Frequency badge ──
function FrequencyBadge({ frequency }: { frequency: string }) {
  const colors: Record<string, string> = {
    daily: "bg-blue-100 text-blue-700",
    weekly: "bg-purple-100 text-purple-700",
    monthly: "bg-green-100 text-green-700",
    per_project: "bg-amber-100 text-amber-700",
    per_event: "bg-rose-100 text-rose-700",
    per_task: "bg-cyan-100 text-cyan-700",
    per_gate: "bg-indigo-100 text-indigo-700",
  };
  const labels: Record<string, string> = {
    daily: "每日", weekly: "每周", monthly: "每月",
    per_project: "每项目", per_event: "每事件", per_task: "每任务", per_gate: "每Gate",
  };
  return (
    <Badge className={`text-xs ${colors[frequency] || "bg-gray-100 text-gray-600"}`}>
      {labels[frequency] || frequency}
    </Badge>
  );
}

// ── Level color ──
function getLevelColor(level: number): string {
  const map: Record<number, string> = {
    1: "bg-gray-500", 2: "bg-blue-500", 3: "bg-green-500", 4: "bg-purple-500", 5: "bg-amber-500",
  };
  return map[level] || "bg-gray-500";
}

function getLevelBorder(level: number): string {
  const map: Record<number, string> = {
    1: "border-gray-300", 2: "border-blue-300", 3: "border-green-300", 4: "border-purple-300", 5: "border-amber-300",
  };
  return map[level] || "border-gray-300";
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════

export default function RoleWorkstation() {
  const { effectiveRole, userName } = useUserProfile();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const { data: config, isLoading } = trpc.roleAgent.getWorkstationConfig.useQuery(
    { role: effectiveRole },
    { staleTime: 60_000 }
  );

  const { data: sopData } = trpc.roleAgent.getRoleSOPs.useQuery(
    { role: effectiveRole },
    { staleTime: 60_000 }
  );

  const roleLabel = ROLE_CONFIGS[effectiveRole as UserRole]?.label || effectiveRole;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <SectionSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {isEn ? "Unable to load workstation config" : "无法加载工作站配置"}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header: Identity + AI Level ── */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl ${getLevelColor(config.defaultAgentLevel)} flex items-center justify-center text-white shadow-md`}>
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {userName || user?.name || (isEn ? "Employee" : "员工")}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{isEn ? config.roleNameEn : config.roleName}</Badge>
              <Badge className={`${getLevelColor(config.defaultAgentLevel)} text-white`}>
                M{config.defaultAgentLevel} {config.aiAssistant?.levelLabel || ""}
              </Badge>
            </div>
          </div>
        </div>

        {/* AI Assistant Card */}
        <Card className={`border-2 ${getLevelBorder(config.defaultAgentLevel)} min-w-[280px]`}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${getLevelColor(config.defaultAgentLevel)} flex items-center justify-center text-white`}>
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {config.aiAssistant?.label || "AI Assistant"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isEn ? `Autonomy: ${config.aiAssistant?.autonomy}` : `自主度: ${config.aiAssistant?.autonomy}`}
                {" | "}
                {isEn ? `Max tasks: ${config.aiAssistant?.maxConcurrentTasks}` : `最大并发: ${config.aiAssistant?.maxConcurrentTasks}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick System Routes ── */}
      <div className="flex flex-wrap gap-2">
        {config.keySystemRoutes.map((route) => (
          <Link key={route.path} href={route.path}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              {isEn ? route.labelEn : route.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="responsibilities" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="responsibilities" className="text-xs px-2 py-1.5">
            <Briefcase className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Duties" : "岗位职责"}
          </TabsTrigger>
          <TabsTrigger value="bom-sop" className="text-xs px-2 py-1.5">
            <ClipboardList className="w-3.5 h-3.5 mr-1" />
            {isEn ? "BOM SOPs" : "BOM SOP"}
          </TabsTrigger>
          <TabsTrigger value="all-sop" className="text-xs px-2 py-1.5">
            <ScrollText className="w-3.5 h-3.5 mr-1" />
            {isEn ? "All SOPs" : "全部SOP"}
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs px-2 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Quality" : "质量要求"}
          </TabsTrigger>
          <TabsTrigger value="work-req" className="text-xs px-2 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Work Tasks" : "工作要求"}
          </TabsTrigger>
          <TabsTrigger value="standards" className="text-xs px-2 py-1.5">
            <Shield className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Standards" : "公司规范"}
          </TabsTrigger>
        </TabsList>

        {/* ──────── Tab 1: 岗位职责 ──────── */}
        <TabsContent value="responsibilities" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-5 h-5 text-blue-500" />
                {isEn ? config.responsibilities.titleEn : config.responsibilities.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {(isEn ? config.responsibilities.itemsEn : config.responsibilities.items).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* AI Assistant Detail */}
          {config.aiAssistant && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="w-5 h-5 text-purple-500" />
                  {isEn ? "AI Assistant Configuration" : "AI助理配置"}
                  <Badge className={`${getLevelColor(config.defaultAgentLevel)} text-white ml-2`}>
                    L{config.defaultAgentLevel}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{config.aiAssistant.maxConcurrentTasks}</div>
                    <div className="text-xs text-muted-foreground">{isEn ? "Max Concurrent" : "最大并发任务"}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold capitalize">{config.aiAssistant.dataScope}</div>
                    <div className="text-xs text-muted-foreground">{isEn ? "Data Scope" : "数据范围"}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold capitalize">{config.aiAssistant.autonomy?.replace("_", " ")}</div>
                    <div className="text-xs text-muted-foreground">{isEn ? "Autonomy" : "自主度"}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{config.aiAssistant.capabilities?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">{isEn ? "Capabilities" : "能力数"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">{isEn ? "Focus Areas" : "专注领域"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {config.aiAssistant.focusAreas?.map((area: string) => (
                      <Badge key={area} variant="outline" className="text-xs">{area}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">{isEn ? "Knowledge Domains" : "知识领域"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {config.aiAssistant.knowledgeDomains?.map((domain: string) => (
                      <Badge key={domain} variant="secondary" className="text-xs">{domain.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ──────── Tab 2: BOM SOP ──────── */}
        <TabsContent value="bom-sop" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                {isEn ? "BOM-Related SOPs" : "BOM相关工作SOP"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {config.bomSOPs && config.bomSOPs.length > 0 ? (
                <div className="space-y-3">
                  {config.bomSOPs.map((sop: any) => (
                    <div key={sop.code} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{sop.code}</span>
                          <PriorityBadge priority={sop.priority} />
                          {sop.processCode && (
                            <Badge variant="outline" className="text-xs">{sop.processCode}</Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium mt-0.5">
                          {isEn ? sop.titleEn : sop.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {isEn ? "No BOM SOPs assigned to this role" : "该岗位无BOM相关SOP"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Tab 3: 全部SOP ──────── */}
        <TabsContent value="all-sop" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="w-5 h-5 text-blue-500" />
                {isEn ? "All Work Task SOPs" : "全部工作任务SOP"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.sopReferences.map((sop: any) => (
                  <div key={sop.code} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      sop.category === "bom" ? "bg-amber-100" :
                      sop.category === "quality" ? "bg-red-100" :
                      sop.category === "safety" ? "bg-orange-100" :
                      sop.category === "design" ? "bg-cyan-100" :
                      sop.category === "production" ? "bg-green-100" :
                      sop.category === "service" ? "bg-purple-100" :
                      "bg-gray-100"
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        sop.category === "bom" ? "text-amber-600" :
                        sop.category === "quality" ? "text-red-600" :
                        sop.category === "safety" ? "text-orange-600" :
                        sop.category === "design" ? "text-cyan-600" :
                        sop.category === "production" ? "text-green-600" :
                        sop.category === "service" ? "text-purple-600" :
                        "text-gray-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{sop.code}</span>
                        <PriorityBadge priority={sop.priority} />
                        <Badge variant="secondary" className="text-xs capitalize">{sop.category}</Badge>
                        {sop.processCode && (
                          <Badge variant="outline" className="text-xs">{sop.processCode}</Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium mt-0.5">
                        {isEn ? sop.titleEn : sop.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DB-sourced SOPs */}
              {sopData?.dbSOPs && sopData.dbSOPs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    {isEn ? `${sopData.dbSOPs.length} SOPs from database` : `数据库中 ${sopData.dbSOPs.length} 条SOP记录`}
                  </h3>
                  <div className="space-y-2">
                    {sopData.dbSOPs.slice(0, 10).map((sop: any) => (
                      <div key={sop.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/30 transition-colors">
                        <Badge variant="outline" className="text-xs font-mono">{sop.code}</Badge>
                        <span className="text-sm flex-1 truncate">{sop.title}</span>
                        <Badge variant="secondary" className="text-xs">{sop.category}</Badge>
                        {sop.isActive && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                      </div>
                    ))}
                    {sopData.dbSOPs.length > 10 && (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        +{sopData.dbSOPs.length - 10} {isEn ? "more" : "更多"}...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Tab 4: 质量要求 ──────── */}
        <TabsContent value="quality" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                {isEn ? "Quality Requirements" : "质量要求"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.qualityRequirements.map((req: any, i: number) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">{req.standard}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{req.clause}</span>
                      <FrequencyBadge frequency={req.checkFrequency} />
                    </div>
                    <p className="text-sm">
                      {isEn ? req.descriptionEn : req.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Tab 5: 工作要求 ──────── */}
        <TabsContent value="work-req" className="mt-4 space-y-4">
          {/* Daily Tasks */}
          {config.dailyTasks && config.dailyTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                  {isEn ? "Daily Tasks" : "每日工作清单"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {config.dailyTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {isEn ? task.taskEn : task.task}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isEn ? "Tools: " : "工具:"}{task.tools.join(", ")}
                        </div>
                      </div>
                      {task.route && (
                        <Link href={task.route}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Work Requirements grouped by frequency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-green-500" />
                {isEn ? "Full Work Requirements" : "完整工作要求"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {["daily", "weekly", "monthly", "per_project", "per_event"].map((freq) => {
                const tasks = config.workRequirements.filter((w: any) => w.frequency === freq);
                if (tasks.length === 0) return null;
                const freqLabels: Record<string, string> = {
                  daily: isEn ? "Daily" : "每日",
                  weekly: isEn ? "Weekly" : "每周",
                  monthly: isEn ? "Monthly" : "每月",
                  per_project: isEn ? "Per Project" : "每项目",
                  per_event: isEn ? "Per Event" : "每事件",
                };
                return (
                  <div key={freq} className="mb-4 last:mb-0">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {freqLabels[freq] || freq}
                    </h4>
                    <div className="space-y-1.5 pl-5">
                      {tasks.map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                          <span className="flex-1">{isEn ? task.taskEn : task.task}</span>
                          {task.route && (
                            <Link href={task.route}>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Tab 6: 公司规范 ──────── */}
        <TabsContent value="standards" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-indigo-500" />
                {isEn ? "GRT Company Standards (GS)" : "GRT公司规范 (GS标准)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.companyStandards.map((std: any) => {
                  const categoryColors: Record<string, string> = {
                    gs_culture: "bg-indigo-100 text-indigo-700",
                    gs_process: "bg-blue-100 text-blue-700",
                    gs_quality: "bg-red-100 text-red-700",
                    gs_safety: "bg-orange-100 text-orange-700",
                    gs_communication: "bg-green-100 text-green-700",
                  };
                  const categoryLabels: Record<string, string> = {
                    gs_culture: isEn ? "Culture" : "企业文化",
                    gs_process: isEn ? "Process" : "流程管理",
                    gs_quality: isEn ? "Quality" : "质量标准",
                    gs_safety: isEn ? "Safety" : "安全生产",
                    gs_communication: isEn ? "Communication" : "沟通规范",
                  };
                  return (
                    <div key={std.code} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs text-muted-foreground">{std.code}</span>
                        <Badge className={`text-xs ${categoryColors[std.category] || "bg-gray-100"}`}>
                          {categoryLabels[std.category] || std.category}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mb-1">
                        {isEn ? std.titleEn : std.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{std.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
