import { useState, useMemo } from "react";
import { findDocContent, type DocContent } from "@/data/knowledge-doc-content";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Search, GraduationCap, Shield, Award, Clock, Eye, Lock,
  FileText, CheckCircle2, AlertTriangle, Star, ChevronRight, Play,
  BarChart3, Target, Layers, Filter, BookMarked, ClipboardCheck,
  Timer, Trophy, ArrowRight, Sparkles, Brain, ListChecks,
} from "lucide-react";

export default function KnowledgeCompliancePlatform() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            企业知识合规平台
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            培训·规范·制度·技术·产品·SOP — 统一学习 · 在线测试 · 技能认证
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="搜索文档、规范、SOP..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs"><BarChart3 className="w-3.5 h-3.5 mr-1" />学习概览</TabsTrigger>
          <TabsTrigger value="library" className="text-xs"><BookMarked className="w-3.5 h-3.5 mr-1" />知识库</TabsTrigger>
          <TabsTrigger value="role-map" className="text-xs"><Target className="w-3.5 h-3.5 mr-1" />岗位要求</TabsTrigger>
          <TabsTrigger value="skill-levels" className="text-xs"><Layers className="w-3.5 h-3.5 mr-1" />技能等级</TabsTrigger>
          <TabsTrigger value="tests" className="text-xs"><ClipboardCheck className="w-3.5 h-3.5 mr-1" />在线测试</TabsTrigger>
          <TabsTrigger value="authorization" className="text-xs"><Lock className="w-3.5 h-3.5 mr-1" />授权管理</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="library"><LibraryTab searchQuery={searchQuery} /></TabsContent>
        <TabsContent value="role-map"><RoleMapTab /></TabsContent>
        <TabsContent value="skill-levels"><SkillLevelsTab /></TabsContent>
        <TabsContent value="tests"><TestsTab /></TabsContent>
        <TabsContent value="authorization"><AuthorizationTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 1: Learning Overview (学习概览)
// ══════════════════════════════════════════════════════════════════
function OverviewTab() {
  const overview = trpc.knowledgeCompliance.dashboard.getMyOverview.useQuery();
  const progressStats = trpc.knowledgeCompliance.progress.getMyStats.useQuery();

  const data = overview.data;
  const totalReq = data?.requirements.length ?? 0;
  const completedProgress = data?.progress.filter((p: any) => p.status === "completed" || p.status === "tested").length ?? 0;
  const inProgress = data?.progress.filter((p: any) => p.status === "in_progress").length ?? 0;
  const testsPassed = data?.testAttempts.filter((t: any) => t.passed).length ?? 0;

  // Group requirements by category
  const byCategory = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { code: string; name: string; color: string; count: number; completed: number }>();
    for (const cat of data.categories) {
      map.set(cat.code, { code: cat.code, name: cat.name, color: cat.color ?? "#6b7280", count: 0, completed: 0 });
    }
    for (const req of data.requirements) {
      const cat = map.get(req.categoryCode ?? "");
      if (cat) {
        cat.count++;
        const prog = data.progress.find((p: any) =>
          p.docSourceType === req.docSourceType && p.docSourceId === req.docSourceId);
        if (prog && (prog.status === "completed" || prog.status === "tested")) cat.completed++;
      }
    }
    return Array.from(map.values()).filter(c => c.count > 0);
  }, [data]);

  if (overview.isLoading) return <div className="py-12 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<FileText className="w-5 h-5" />} label="应学文档" value={String(totalReq)} color="blue" />
        <SummaryCard icon={<CheckCircle2 className="w-5 h-5" />} label="已完成" value={String(completedProgress)} sub={totalReq > 0 ? `${(completedProgress / totalReq * 100).toFixed(0)}%` : ""} color="green" />
        <SummaryCard icon={<Play className="w-5 h-5" />} label="学习中" value={String(inProgress)} color="orange" />
        <SummaryCard icon={<Trophy className="w-5 h-5" />} label="测试通过" value={String(testsPassed)} color="yellow" />
      </div>

      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">整体学习进度</CardTitle></CardHeader>
        <CardContent>
          <Progress value={totalReq > 0 ? (completedProgress / totalReq * 100) : 0} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">已完成 {completedProgress}/{totalReq} 项必学内容</p>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">分类学习进度</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {byCategory.map(cat => (
            <div key={cat.code} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
              <span className="text-xs font-medium w-24 truncate">{cat.name}</span>
              <div className="flex-1">
                <Progress value={cat.count > 0 ? (cat.completed / cat.count * 100) : 0} className="h-2" />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">{cat.completed}/{cat.count}</span>
            </div>
          ))}
          {byCategory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">暂无岗位学习要求数据</p>}
        </CardContent>
      </Card>

      {/* Recent test attempts */}
      {(data?.testAttempts ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">最近测试记录</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.testAttempts ?? []).slice(0, 5).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 text-xs border-b pb-2">
                {t.passed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className="flex-1">第{t.attemptNumber}次</span>
                <span className="font-semibold">{t.score}/{t.totalPoints}</span>
                <Badge variant={t.passed ? "default" : "destructive"} className="text-[10px]">{t.passed ? "通过" : "未通过"}</Badge>
                <span className="text-muted-foreground">{t.durationMinutes}分钟</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 2: Knowledge Library (知识库浏览)
// ══════════════════════════════════════════════════════════════════
function LibraryTab({ searchQuery }: { searchQuery: string }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const categories = trpc.knowledgeCompliance.category.list.useQuery();
  const requirements = trpc.knowledgeCompliance.requirement.getMyRequirements.useQuery({ skillLevel: 5 });
  const myProgress = trpc.knowledgeCompliance.progress.getMyProgress.useQuery({});

  // Reading state
  const [readingDoc, setReadingDoc] = useState<{ req: any; doc: DocContent | null } | null>(null);
  const [readComplete, setReadComplete] = useState(false);

  const filtered = useMemo(() => {
    let items = requirements.data ?? [];
    if (selectedCategory) items = items.filter((r: any) => r.categoryCode === selectedCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r: any) => r.docTitle.toLowerCase().includes(q) || (r.categoryCode ?? "").toLowerCase().includes(q));
    }
    return items;
  }, [requirements.data, selectedCategory, searchQuery]);

  const progressMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of (myProgress.data ?? []) as any[]) {
      map.set(`${p.docSourceType}:${p.docSourceId}`, p);
    }
    return map;
  }, [myProgress.data]);

  const utils = trpc.useUtils();
  const upsertProgress = trpc.knowledgeCompliance.progress.upsertProgress.useMutation({
    onSuccess: () => utils.knowledgeCompliance.progress.getMyProgress.invalidate(),
  });

  const levelColors: Record<string, string> = { must_know: "bg-red-100 text-red-700", should_know: "bg-yellow-100 text-yellow-700", nice_to_know: "bg-blue-100 text-blue-700" };
  const levelLabels: Record<string, string> = { must_know: "必学", should_know: "应学", nice_to_know: "选学" };
  const masteryLabels: Record<string, string> = { aware: "了解", understand: "理解", apply: "应用", analyze: "分析", master: "精通" };
  const catNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of (categories.data ?? []) as any[]) m.set(cat.code, cat.name);
    return m;
  }, [categories.data]);

  function openDoc(req: any) {
    const doc = findDocContent(req.docTitle);
    setReadingDoc({ req, doc });
    setReadComplete(false);
    // Auto mark as in_progress
    const prog = progressMap.get(`${req.docSourceType}:${req.docSourceId}`);
    if (!prog || prog.status === "not_started") {
      upsertProgress.mutate({
        docSourceType: req.docSourceType, docSourceId: req.docSourceId ?? undefined,
        docTitle: req.docTitle, categoryCode: req.categoryCode ?? undefined, status: "in_progress",
      });
    }
  }

  function handleContentScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setReadComplete(true);
    }
  }

  function markCompleted() {
    if (!readingDoc) return;
    const { req } = readingDoc;
    upsertProgress.mutate({
      docSourceType: req.docSourceType, docSourceId: req.docSourceId ?? undefined,
      docTitle: req.docTitle, categoryCode: req.categoryCode ?? undefined,
      status: "completed", progressPercent: 100,
    });
    setReadingDoc(null);
  }

  const statusLabel = (s: string) => s === "not_started" ? "未开始" : s === "in_progress" ? "学习中" : s === "completed" ? "已完成" : "已测试";
  const statusColor = (s: string) => s === "completed" || s === "tested" ? "text-green-600" : s === "in_progress" ? "text-blue-600" : "";

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Category sidebar */}
      <div className="col-span-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Filter className="w-3.5 h-3.5" />文档分类</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div
                className={`px-3 py-2 cursor-pointer border-b hover:bg-muted/50 text-xs ${!selectedCategory ? "bg-primary/5 font-bold" : ""}`}
                onClick={() => setSelectedCategory("")}
              >
                全部分类 ({requirements.data?.length ?? 0})
              </div>
              {(categories.data ?? []).map((cat: any) => {
                const cnt = (requirements.data ?? []).filter((r: any) => r.categoryCode === cat.code).length;
                if (cnt === 0) return null;
                return (
                  <div
                    key={cat.code}
                    className={`px-3 py-2 cursor-pointer border-b hover:bg-muted/50 flex items-center gap-2 ${selectedCategory === cat.code ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                    onClick={() => setSelectedCategory(cat.code)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: cat.color ?? "#6b7280" }} />
                    <span className="text-xs flex-1">{cat.name}</span>
                    <span className="text-[10px] text-muted-foreground">{cnt}</span>
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Document list */}
      <div className="col-span-9 space-y-2">
        <div className="text-xs text-muted-foreground mb-1">
          {selectedCategory ? `${catNameMap.get(selectedCategory) ?? selectedCategory} · ` : ""}共 {filtered.length} 份文档 · 点击文档标题进入学习
        </div>
        {filtered.map((req: any) => {
          const prog = progressMap.get(`${req.docSourceType}:${req.docSourceId}`);
          const hasContent = !!findDocContent(req.docTitle);
          const doc = findDocContent(req.docTitle);
          return (
            <Card
              key={req.id}
              className={`transition-colors cursor-pointer ${hasContent ? "hover:border-primary/40 hover:shadow-sm" : "hover:bg-muted/30"}`}
              onClick={() => openDoc(req)}
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 p-1.5 rounded ${prog?.status === "completed" || prog?.status === "tested" ? "bg-green-100" : hasContent ? "bg-primary/10" : "bg-muted"}`}>
                    {prog?.status === "completed" || prog?.status === "tested"
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <FileText className={`w-4 h-4 ${hasContent ? "text-primary" : "text-muted-foreground"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-medium ${hasContent ? "text-primary underline underline-offset-2 decoration-dotted" : ""}`}>
                        {req.docTitle}
                      </h4>
                      {doc && <Badge variant="outline" className="text-[9px] font-mono">{doc.code}</Badge>}
                      <Badge className={`text-[10px] ${levelColors[req.requirementLevel]}`}>{levelLabels[req.requirementLevel]}</Badge>
                      <Badge variant="outline" className="text-[10px]">Lv{req.skillLevelRequired}</Badge>
                      {req.hasTest && <Badge variant="outline" className="text-[10px] text-purple-600"><ClipboardCheck className="w-3 h-3 mr-0.5" />有测试</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{catNameMap.get(req.categoryCode) ?? req.categoryCode}</span>
                      <span>·</span>
                      <span>掌握要求: {masteryLabels[req.masteryExpectation]}</span>
                    </div>
                    {prog && (
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={prog.progressPercent ?? 0} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{prog.progressPercent ?? 0}%</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(prog.status)}`}>
                          {statusLabel(prog.status)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-xs">暂无匹配文档</CardContent></Card>
        )}
      </div>

      {/* ── Reading Dialog ── */}
      <Dialog open={!!readingDoc} onOpenChange={(open) => { if (!open) setReadingDoc(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          {readingDoc?.doc ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{readingDoc.doc.code}</Badge>
                  <Badge className="text-[10px] bg-blue-100 text-blue-700">{readingDoc.doc.category}</Badge>
                  <Badge className={`text-[10px] ${levelColors[readingDoc.req.requirementLevel]}`}>
                    {levelLabels[readingDoc.req.requirementLevel]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">Lv{readingDoc.req.skillLevelRequired}</Badge>
                  {(() => {
                    const prog = progressMap.get(`${readingDoc.req.docSourceType}:${readingDoc.req.docSourceId}`);
                    if (prog && (prog.status === "completed" || prog.status === "tested")) {
                      return <Badge className="text-[10px] bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-0.5" />{statusLabel(prog.status)}</Badge>;
                    }
                    return <Badge className="text-[10px] bg-blue-100 text-blue-700"><Play className="w-3 h-3 mr-0.5" />学习中</Badge>;
                  })()}
                </div>
                <DialogTitle className="text-lg">{readingDoc.doc.title}</DialogTitle>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-[300px]" onScrollCapture={handleContentScroll}>
                <div className="border rounded-lg p-5 bg-muted/20">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {readingDoc.doc.content.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={i} className="h-2" />;
                      if (/^\d+\.\s/.test(trimmed) && !/^\d+\.\d/.test(trimmed)) {
                        return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{trimmed}</h3>;
                      }
                      if (/^\d+\.\d+\s/.test(trimmed)) {
                        return <p key={i} className="font-semibold mt-2 mb-1">{trimmed}</p>;
                      }
                      if (/^[a-z]\)\s/.test(trimmed) || /^-\s/.test(trimmed)) {
                        return <p key={i} className="ml-6 text-sm">{trimmed}</p>;
                      }
                      return <p key={i} className="text-sm leading-relaxed">{trimmed}</p>;
                    })}
                  </div>
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  {readComplete ? (
                    <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />已阅读完毕</span>
                  ) : (
                    <span className="flex items-center gap-1 animate-pulse"><ArrowRight className="w-3.5 h-3.5" />请滚动至底部完成阅读</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {readComplete && (() => {
                    const prog = progressMap.get(`${readingDoc.req.docSourceType}:${readingDoc.req.docSourceId}`);
                    if (!prog || prog.status !== "completed") {
                      return (
                        <Button size="sm" onClick={markCompleted} className="gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />学习完成
                        </Button>
                      );
                    }
                    return null;
                  })()}
                  <Button size="sm" variant="outline" onClick={() => setReadingDoc(null)}>关闭</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">文档内容待录入</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium mb-1">"{readingDoc?.req?.docTitle}"</p>
                <p className="text-xs">该文档内容尚未录入系统，请联系知识管理员补充。</p>
              </div>
              <DialogFooter>
                <Button size="sm" variant="outline" onClick={() => setReadingDoc(null)}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 3: Role Requirements Map (岗位文档要求)
// ══════════════════════════════════════════════════════════════════

function RoleMapTab() {
  const [selectedRole, setSelectedRole] = useState("production_engineer");
  const [filterLevel, setFilterLevel] = useState<number | undefined>(undefined);
  const [viewingDoc, setViewingDoc] = useState<DocContent | null>(null);
  const [viewingReqTitle, setViewingReqTitle] = useState<string>("");

  const roles = trpc.knowledgeCompliance.requirement.listRoles.useQuery();
  const requirements = trpc.knowledgeCompliance.requirement.getByRole.useQuery({
    role: selectedRole, skillLevel: filterLevel, });
  const stats = trpc.knowledgeCompliance.requirement.getStats.useQuery({ role: selectedRole });

  const roleLabels: Record<string, string> = {
    production_engineer: "生产工程师", quality_inspector: "品质检验员", ALL: "全员通用",
    project_manager: "项目经理", sales_engineer: "销售工程师", hr_specialist: "人事专员",
    finance_specialist: "财务专员", service_engineer: "售后工程师", rnd_engineer: "研发工程师",
  };

  // Group by skill level
  const grouped = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const req of (requirements.data ?? [])) {
      const level = req.skillLevelRequired ?? 1;
      if (!map.has(level)) map.set(level, []);
      map.get(level)!.push(req);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [requirements.data]);

  const levelNames = ["", "初级 (Lv1)", "中级 (Lv2)", "高级 (Lv3)", "专家 (Lv4)", "大师 (Lv5)"];
  const levelColors = ["", "#6b7280", "#3b82f6", "#22c55e", "#a855f7", "#eab308"];

  function handleDocClick(title: string) {
    const doc = findDocContent(title);
    setViewingReqTitle(title);
    setViewingDoc(doc);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(roles.data ?? []).map((r: any) => (
              <SelectItem key={r.role} value={r.role}>{roleLabels[r.role] ?? r.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLevel ? String(filterLevel) : "all"} onValueChange={v => setFilterLevel(v === "all" ? undefined : Number(v))}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            {[1, 2, 3, 4, 5].map(l => <SelectItem key={l} value={String(l)}>≤ Lv{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">共 {requirements.data?.length ?? 0} 项 · 点击文档名称可查看全文</span>
      </div>

      {/* Stats bar */}
      {stats.data && stats.data.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(stats.data as any[]).map((s: any) => (
            <Badge key={s.categoryCode} variant="outline" className="text-[10px]">{s.categoryCode}: {s.count}项</Badge>
          ))}
        </div>
      )}

      {/* Grouped by level */}
      {grouped.map(([level, items]) => (
        <Card key={level} className="border-l-4" style={{ borderLeftColor: levelColors[level] ?? "#6b7280" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: levelColors[level] }} />
              {levelNames[level] || `Lv${level}`}
              <Badge variant="outline" className="text-[10px]">{items.length}项</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {items.map((req: any) => {
                const hasContent = !!findDocContent(req.docTitle);
                return (
                  <div
                    key={req.id}
                    className={`flex items-center gap-2 text-xs border rounded-lg px-3 py-2 transition-colors ${
                      hasContent
                        ? "cursor-pointer hover:bg-primary/10 hover:border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleDocClick(req.docTitle)}
                  >
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${hasContent ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`flex-1 truncate ${hasContent ? "text-primary font-medium underline underline-offset-2 decoration-dotted" : ""}`}>
                      {req.docTitle}
                    </span>
                    <Badge className={`text-[9px] ${req.requirementLevel === "must_know" ? "bg-red-100 text-red-700" : req.requirementLevel === "should_know" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                      {req.requirementLevel === "must_know" ? "必学" : req.requirementLevel === "should_know" ? "应学" : "选学"}
                    </Badge>
                    {req.hasTest && <ClipboardCheck className="w-3 h-3 text-purple-500" />}
                    {hasContent && <Eye className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      {grouped.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground text-xs">该岗位暂无文档要求配置</CardContent></Card>}

      {/* ── Document Viewer Dialog ── */}
      <Dialog open={!!viewingDoc || !!viewingReqTitle} onOpenChange={(open) => { if (!open) { setViewingDoc(null); setViewingReqTitle(""); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          {viewingDoc ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{viewingDoc.code}</Badge>
                  <Badge className="text-[10px] bg-blue-100 text-blue-700">{viewingDoc.category}</Badge>
                </div>
                <DialogTitle className="text-lg">{viewingDoc.title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 min-h-[300px] border rounded-lg p-4 bg-muted/20">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {viewingDoc.content.split("\n").map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={i} className="h-2" />;
                    if (/^\d+\.\s/.test(trimmed) && !/^\d+\.\d/.test(trimmed)) {
                      return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{trimmed}</h3>;
                    }
                    if (/^\d+\.\d+\s/.test(trimmed)) {
                      return <p key={i} className="font-semibold mt-2 mb-1">{trimmed}</p>;
                    }
                    if (/^[a-z]\)\s/.test(trimmed) || /^-\s/.test(trimmed) || /^（/.test(trimmed)) {
                      return <p key={i} className="ml-6 text-sm">{trimmed}</p>;
                    }
                    return <p key={i} className="text-sm leading-relaxed">{trimmed}</p>;
                  })}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setViewingDoc(null); setViewingReqTitle(""); }}>关闭</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">文档暂未录入</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium mb-1">"{viewingReqTitle}"</p>
                <p className="text-xs">该文档内容尚未录入系统，请联系知识管理员补充。</p>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setViewingDoc(null); setViewingReqTitle(""); }}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 4: Skill Level Standards (技能等级标准)
// ══════════════════════════════════════════════════════════════════
function SkillLevelsTab() {
  const [selectedRole, setSelectedRole] = useState("production_engineer");
  const roles = trpc.knowledgeCompliance.skillLevel.listRoles.useQuery();
  const levels = trpc.knowledgeCompliance.skillLevel.getByRole.useQuery({ role: selectedRole });

  const roleLabels: Record<string, string> = {
    production_engineer: "生产工程师", quality_inspector: "品质检验员",
    project_manager: "项目经理", sales_engineer: "销售工程师",
  };

  const levelColors = ["", "bg-gray-100", "bg-blue-50", "bg-green-50", "bg-purple-50", "bg-yellow-50"];

  return (
    <div className="space-y-4">
      <Select value={selectedRole} onValueChange={setSelectedRole}>
        <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(roles.data ?? []).map((r: any) => (
            <SelectItem key={r.role} value={r.role}>{roleLabels[r.role] ?? r.role}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Level cards — progressive staircase */}
      <div className="space-y-4">
        {(levels.data ?? []).map((level: any, i: number) => (
          <Card key={level.id} className={`${levelColors[level.skillLevel] ?? ""} border-l-4`} style={{ borderLeftColor: ["", "#6b7280", "#3b82f6", "#22c55e", "#a855f7", "#eab308"][level.skillLevel] }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-2xl font-black" style={{ color: ["", "#6b7280", "#3b82f6", "#22c55e", "#a855f7", "#eab308"][level.skillLevel] }}>
                    Lv{level.skillLevel}
                  </span>
                  {level.levelName} {level.levelNameEn && <span className="text-muted-foreground text-sm">({level.levelNameEn})</span>}
                </CardTitle>
                <div className="flex gap-2 text-xs">
                  {level.theoryTestRequired && <Badge variant="outline"><ClipboardCheck className="w-3 h-3 mr-1" />理论测试 ≥{level.minTestScore}分</Badge>}
                  {level.practicalAssessmentRequired && <Badge variant="outline"><Award className="w-3 h-3 mr-1" />实操考核</Badge>}
                  <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />培训{level.trainingHoursRequired}h</Badge>
                  {level.minKpiScore && <Badge variant="outline"><Target className="w-3 h-3 mr-1" />KPI≥{level.minKpiScore}</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{level.description}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Knowledge */}
                <div>
                  <h5 className="text-[11px] font-semibold mb-1 flex items-center gap-1"><Brain className="w-3 h-3" />知识要求</h5>
                  <ul className="space-y-0.5">
                    {(level.knowledgeRequirements ?? []).map((k: string, j: number) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{k}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Skills */}
                <div>
                  <h5 className="text-[11px] font-semibold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />技能要求</h5>
                  <ul className="space-y-0.5">
                    {(level.skillRequirements ?? []).map((s: string, j: number) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Performance */}
                <div>
                  <h5 className="text-[11px] font-semibold mb-1 flex items-center gap-1"><Target className="w-3 h-3" />绩效标准</h5>
                  <ul className="space-y-0.5">
                    {(level.performanceStandards ?? []).map((p: string, j: number) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{p}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Example tasks */}
                <div>
                  <h5 className="text-[11px] font-semibold mb-1 flex items-center gap-1"><ListChecks className="w-3 h-3" />典型任务</h5>
                  <ul className="space-y-0.5">
                    {(level.exampleTasks ?? []).map((t: string, j: number) => (
                      <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Certifications */}
              {(level.certificationRequired ?? []).length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">所需认证:</span>
                  {(level.certificationRequired as string[]).map((c: string, j: number) => (
                    <Badge key={j} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              )}
              {/* Promotion criteria */}
              {level.minMonthsAtPreviousLevel > 0 && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  晋升条件: 上一级别至少 {level.minMonthsAtPreviousLevel} 个月
                  {level.minKpiScore && ` · KPI ≥ ${level.minKpiScore}`}
                  {level.theoryTestRequired && ` · 理论测试 ≥ ${level.minTestScore}分`}
                  {level.practicalAssessmentRequired && " · 实操通过"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(levels.data ?? []).length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground text-xs">该岗位暂无技能等级标准</CardContent></Card>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 5: Online Tests (在线测试)
// ══════════════════════════════════════════════════════════════════
function TestsTab() {
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [takingTest, setTakingTest] = useState(false);

  const tests = trpc.knowledgeCompliance.test.list.useQuery({});
  const myAttempts = trpc.knowledgeCompliance.test.getMyAttempts.useQuery({});

  return (
    <div className="space-y-4">
      {takingTest && selectedTest ? (
        <TestTakingUI testId={selectedTest} onFinish={() => { setTakingTest(false); setSelectedTest(null); }} />
      ) : (
        <>
          {/* Test list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(tests.data ?? []).map((test: any) => {
              const attempts = (myAttempts.data ?? []).filter((a: any) => a.testId === test.id);
              const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.score)) : null;
              const hasPassed = attempts.some((a: any) => a.passed);
              return (
                <Card key={test.id} className={`cursor-pointer hover:border-primary/30 ${hasPassed ? "border-green-200" : ""}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium">{test.title}</h4>
                      {hasPassed && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3">{test.description}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant="outline" className="text-[10px]"><Timer className="w-3 h-3 mr-1" />{test.timeLimitMinutes}分钟</Badge>
                      <Badge variant="outline" className="text-[10px]">满分{test.totalPoints}</Badge>
                      <Badge variant="outline" className="text-[10px]">及格{test.passingScore}</Badge>
                      <Badge variant="outline" className="text-[10px]">Lv{test.skillLevelRequired}</Badge>
                      {test.maxAttempts > 0 && <Badge variant="outline" className="text-[10px]">限{test.maxAttempts}次</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        已考{attempts.length}次{bestScore !== null && ` · 最高${bestScore}分`}
                      </span>
                      <Button size="sm" className="h-7 text-[10px]" disabled={hasPassed && test.maxAttempts > 0 && attempts.length >= test.maxAttempts}
                        onClick={() => { setSelectedTest(test.id); setTakingTest(true); }}>
                        {hasPassed ? "再次测试" : "开始测试"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {(tests.data ?? []).length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground text-xs">暂无可用测试</CardContent></Card>}
        </>
      )}
    </div>
  );
}

// Test-taking interface
function TestTakingUI({ testId, onFinish }: { testId: number; onFinish: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [startedAt] = useState(new Date().toISOString());

  const test = trpc.knowledgeCompliance.test.getForTaking.useQuery({ testId });
  const submitMut = trpc.knowledgeCompliance.test.submitTest.useMutation({
    onSuccess: (data) => { setResult(data); setSubmitted(true); },
  });

  if (test.isLoading) return <div className="py-8 text-center">加载试卷中...</div>;
  if (test.error) return <div className="py-8 text-center text-red-500">{test.error.message}</div>;
  const td = test.data!;

  const handleSingleAnswer = (qId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [String(qId)]: answer }));
  };

  const handleMultiAnswer = (qId: number, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[String(qId)] ?? []) as string[];
      const next = checked ? [...current, option] : current.filter(o => o !== option);
      return { ...prev, [String(qId)]: next };
    });
  };

  if (submitted && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.passed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <AlertTriangle className="w-6 h-6 text-red-500" />}
            {result.passed ? "恭喜通过！" : "未通过"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-3xl font-bold">{result.score}</div><div className="text-xs text-muted-foreground">得分 / {result.totalPoints}</div></div>
            <div><div className="text-3xl font-bold">{result.passingScore}</div><div className="text-xs text-muted-foreground">及格线</div></div>
            <div><div className="text-3xl font-bold">{result.durationMinutes}'</div><div className="text-xs text-muted-foreground">用时</div></div>
          </div>
          {/* Question results */}
          <div className="space-y-2">
            {(result.questionResults ?? []).map((qr: any, i: number) => {
              const exp = result.explanations?.find((e: any) => e.questionId === qr.questionId);
              return (
                <div key={i} className={`flex items-center gap-2 text-xs border rounded px-3 py-2 ${qr.correct ? "bg-green-50" : "bg-red-50"}`}>
                  {qr.correct ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span>题{qr.questionId}: {qr.correct ? "正确" : "错误"} ({qr.pointsEarned}分)</span>
                  {!qr.correct && exp?.explanation && <span className="text-muted-foreground ml-2">— {exp.explanation}</span>}
                </div>
              );
            })}
          </div>
          <Button onClick={onFinish}>返回测试列表</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{td.title} — 第{td.attemptNumber}次</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline"><Timer className="w-3 h-3 mr-1" />{td.timeLimitMinutes}分钟</Badge>
            <Badge variant="outline">满分{td.totalPoints}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {td.questions.map((q: any, i: number) => (
          <div key={q.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-sm font-bold text-primary">{i + 1}.</span>
              <span className="text-sm">{q.question}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{q.points}分</Badge>
            </div>

            {q.type === "single" && q.options && (
              <RadioGroup value={answers[String(q.id)] as string ?? ""} onValueChange={v => handleSingleAnswer(q.id, v)}>
                {q.options.map((opt: string) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} />
                    <Label htmlFor={`q${q.id}-${opt}`} className="text-xs cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === "multiple" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt: string) => (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      checked={((answers[String(q.id)] ?? []) as string[]).includes(opt)}
                      onCheckedChange={(checked) => handleMultiAnswer(q.id, opt, !!checked)}
                    />
                    <span className="text-xs">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {q.type === "truefalse" && (
              <RadioGroup value={answers[String(q.id)] as string ?? ""} onValueChange={v => handleSingleAnswer(q.id, v)}>
                <div className="flex items-center gap-2"><RadioGroupItem value="true" id={`q${q.id}-t`} /><Label htmlFor={`q${q.id}-t`} className="text-xs">正确</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="false" id={`q${q.id}-f`} /><Label htmlFor={`q${q.id}-f`} className="text-xs">错误</Label></div>
              </RadioGroup>
            )}

            {q.type === "fillblank" && (
              <Input className="h-8 text-xs w-64" placeholder="请输入答案..." value={answers[String(q.id)] as string ?? ""}
                onChange={e => handleSingleAnswer(q.id, e.target.value)} />
            )}
          </div>
        ))}

        <div className="flex gap-3">
          <Button onClick={() => submitMut.mutate({ testId, answers, startedAt })}
            disabled={submitMut.isPending}>
            {submitMut.isPending ? "提交中..." : "提交答卷"}
          </Button>
          <Button variant="outline" onClick={onFinish}>放弃</Button>
          <span className="text-xs text-muted-foreground ml-auto">
            已答 {Object.keys(answers).length}/{td.questions.length} 题
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// Tab 6: Authorization Management (授权管理)
// ══════════════════════════════════════════════════════════════════
function AuthorizationTab() {
  const [reqDocTitle, setReqDocTitle] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqAuthType, setReqAuthType] = useState("time_limited");

  const myAuths = trpc.knowledgeCompliance.access.listMy.useQuery({});
  const pendingAuths = trpc.knowledgeCompliance.access.listPending.useQuery();
  const utils = trpc.useUtils();

  const requestMut = trpc.knowledgeCompliance.access.requestAccess.useMutation({
    onSuccess: () => { utils.knowledgeCompliance.access.listMy.invalidate(); setReqDocTitle(""); setReqReason(""); },
  });
  const approveMut = trpc.knowledgeCompliance.access.approve.useMutation({
    onSuccess: () => { utils.knowledgeCompliance.access.listPending.invalidate(); utils.knowledgeCompliance.access.listMy.invalidate(); },
  });
  const rejectMut = trpc.knowledgeCompliance.access.reject.useMutation({
    onSuccess: () => utils.knowledgeCompliance.access.listPending.invalidate(),
  });

  const statusLabels: Record<string, string> = { pending: "待审批", active: "已授权", expired: "已过期", exhausted: "次数用尽", revoked: "已撤销" };
  const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", active: "bg-green-100 text-green-700", expired: "bg-gray-100 text-gray-600", exhausted: "bg-orange-100 text-orange-700", revoked: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      {/* Request form */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">申请文档授权</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input className="h-8 text-xs" placeholder="文档标题" value={reqDocTitle} onChange={e => setReqDocTitle(e.target.value)} />
            <Select value={reqAuthType} onValueChange={setReqAuthType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="time_limited">限时授权</SelectItem>
                <SelectItem value="count_limited">限次授权</SelectItem>
                <SelectItem value="time_and_count">限时限次</SelectItem>
                <SelectItem value="unlimited">无限制</SelectItem>
              </SelectContent>
            </Select>
            <Input className="h-8 text-xs" placeholder="申请原因" value={reqReason} onChange={e => setReqReason(e.target.value)} />
          </div>
          <Button size="sm" disabled={!reqDocTitle || requestMut.isPending} onClick={() => requestMut.mutate({
            docSourceType: "org_doc", docTitle: reqDocTitle, authType: reqAuthType as any, requestReason: reqReason || undefined,
          })}>
            提交申请
          </Button>
        </CardContent>
      </Card>

      {/* Pending approvals (for managers) */}
      {(pendingAuths.data ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" />待审批 ({pendingAuths.data?.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(pendingAuths.data ?? []).map((auth: any) => (
              <div key={auth.id} className="flex items-center gap-3 text-xs border rounded-lg px-3 py-2">
                <span className="font-medium">{auth.userName}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="flex-1 truncate">{auth.docTitle}</span>
                <Badge variant="outline" className="text-[10px]">{auth.authType === "time_limited" ? "限时" : auth.authType === "count_limited" ? "限次" : auth.authType === "time_and_count" ? "限时限次" : "无限"}</Badge>
                <span className="text-muted-foreground truncate max-w-32">{auth.requestReason}</span>
                <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={() => approveMut.mutate({ id: auth.id })}>批准</Button>
                <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => rejectMut.mutate({ id: auth.id, reason: "不符合授权条件" })}>拒绝</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My authorizations */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">我的授权记录</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(myAuths.data ?? []).map((auth: any) => (
            <div key={auth.id} className="flex items-center gap-3 text-xs border-b pb-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">{auth.docTitle}</span>
              <Badge className={`text-[10px] ${statusColors[auth.status]}`}>{statusLabels[auth.status]}</Badge>
              {auth.authType !== "unlimited" && (
                <span className="text-muted-foreground">
                  {auth.authType.includes("count") ? `${auth.currentAccessCount}/${auth.maxAccessCount ?? "∞"}次` : ""}
                  {auth.validUntil ? ` 至${new Date(auth.validUntil).toLocaleDateString()}` : ""}
                </span>
              )}
              {auth.approvedByName && <span className="text-muted-foreground">审批: {auth.approvedByName}</span>}
            </div>
          ))}
          {(myAuths.data ?? []).length === 0 && <div className="py-4 text-center text-muted-foreground text-xs">暂无授权记录</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  const cls = color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : color === "orange" ? "text-orange-500" : color === "yellow" ? "text-yellow-600" : "";
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">{icon}<span className="text-[11px]">{label}</span></div>
        <div className={`text-xl font-bold ${cls}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
