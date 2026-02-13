/**
 * 阶段门管理 Tab - 检查清单CRUD、状态管理、自动验证
 * M5设计评审门：五大类别雷达视图 + 按类别分组检查项
 * 来源: StageGate(checklists)
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  STAGES, CHECKLIST_STATUSES,
  M5_REVIEW_CATEGORIES, M5_DESIGN_CHECKLIST,
} from "../../../../shared/stage-definitions";
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Plus, Shield,
  FileCheck, RefreshCw, ArrowRight, Inbox, Wrench, Zap,
  ClipboardCheck, TestTube, Cog, Download, Target,
} from "lucide-react";

// Icon lookup for M5 review categories
const CATEGORY_ICONS: Record<string, any> = {
  Wrench, Zap, ClipboardCheck, FileCheck, TestTube, Cog,
};

export default function GateManagement() {
  const [selectedStage, setSelectedStage] = useState<string>("M5");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    gateStage: "M5",
    checkItem: "",
    isMandatory: false,
    autoVerifySource: "",
  });

  // tRPC queries
  const { data: checklists, isLoading, refetch: refetchChecklists } = trpc.stageGate.getGateChecklists.useQuery({
    gateStage: selectedStage as any,
  });

  // M5-specific queries (only fetch when M5 is selected)
  const { data: m5Definitions } = trpc.stageGate.getM5DesignReviewDefinitions.useQuery(undefined, {
    enabled: selectedStage === "M5",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: m5Summary, refetch: refetchM5Summary } = trpc.stageGate.getM5DesignReviewSummary.useQuery(
    { projectId: 1 },
    {
      enabled: selectedStage === "M5",
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // tRPC mutations
  const createChecklistMutation = trpc.stageGate.createGateChecklist.useMutation({
    onSuccess: () => {
      toast.success("检查项已添加");
      setShowAddDialog(false);
      setNewChecklist({ gateStage: "M5", checkItem: "", isMandatory: false, autoVerifySource: "" });
      refetchChecklists();
      if (selectedStage === "M5") refetchM5Summary();
    },
    onError: (error: any) => toast.error(`添加失败: ${error.message}`),
  });

  const updateStatusMutation = trpc.stageGate.updateGateChecklistStatus.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      refetchChecklists();
      if (selectedStage === "M5") refetchM5Summary();
    },
    onError: (error: any) => toast.error(`更新失败: ${error.message}`),
  });

  const initM5Mutation = trpc.stageGate.initializeM5DesignReview.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        refetchChecklists();
        refetchM5Summary();
      } else {
        toast.info(data.message);
      }
    },
    onError: (error: any) => toast.error(`初始化失败: ${error.message}`),
  });

  const calculateProgress = (items: any[]) => {
    if (!items?.length) return 0;
    return (items.filter(i => i.status === "pass").length / items.length) * 100;
  };

  const hasMandatoryFail = (items: any[]) =>
    items?.some(i => i.is_mandatory && i.status === "fail");

  const getStatusBadge = (status: string) => {
    const config = CHECKLIST_STATUSES[status as keyof typeof CHECKLIST_STATUSES];
    const icons: Record<string, any> = { pending: Clock, pass: CheckCircle, fail: XCircle };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant="outline" className={config?.color || ""}>
        <Icon className="w-3 h-3 mr-1" />
        {config?.label || status}
      </Badge>
    );
  };

  const currentStage = STAGES.find(s => s.id === selectedStage);

  // Group checklist items by category for M5
  const groupedByCategory = (() => {
    if (selectedStage !== "M5" || !checklists?.items?.length) return null;
    const groups: Record<string, any[]> = {};
    for (const item of checklists.items) {
      const cat = item.category || "未分类";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  })();

  const isM5 = selectedStage === "M5";

  return (
    <div className="space-y-4">
      {/* 阶段选择器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <button
                  className={`
                    flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px]
                    ${selectedStage === stage.id
                      ? "bg-primary/20 border border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                    }
                    ${stage.id === "M5" ? "ring-1 ring-cyan-500/30" : ""}
                  `}
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${selectedStage === stage.id
                      ? "bg-primary text-primary-foreground"
                      : stage.id === "M5"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-muted text-muted-foreground"
                    }
                  `}>
                    {stage.id}
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground whitespace-nowrap">{stage.name}</span>
                </button>
                {index < STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 检查项列表头 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {currentStage?.id} - {currentStage?.name}
            {isM5 && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                <Cog className="w-3 h-3 mr-1" />
                设计评审门
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{currentStage?.description}</p>
        </div>
        <div className="flex gap-2">
          {isM5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => initM5Mutation.mutate({ projectId: 1 })}
              disabled={initM5Mutation.isPending}
            >
              <Download className="w-4 h-4 mr-1" />
              {initM5Mutation.isPending ? "初始化中..." : "初始化M5模板"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { refetchChecklists(); if (isM5) refetchM5Summary(); }}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                添加检查项
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加门径检查项</DialogTitle>
                <DialogDescription>为当前阶段添加新的检查项</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>所属阶段</Label>
                  <Select
                    value={newChecklist.gateStage}
                    onValueChange={(v) => setNewChecklist({ ...newChecklist, gateStage: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.id} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>检查项名称</Label>
                  <Input
                    value={newChecklist.checkItem}
                    onChange={(e) => setNewChecklist({ ...newChecklist, checkItem: e.target.value })}
                    placeholder="如: 模具PO已下达"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>一票否决权</Label>
                    <p className="text-xs text-muted-foreground">此项未通过将阻止阶段推进</p>
                  </div>
                  <Switch
                    checked={newChecklist.isMandatory}
                    onCheckedChange={(v) => setNewChecklist({ ...newChecklist, isMandatory: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>自动验证源 (可选)</Label>
                  <Input
                    value={newChecklist.autoVerifySource}
                    onChange={(e) => setNewChecklist({ ...newChecklist, autoVerifySource: e.target.value })}
                    placeholder="如: ERP_PO_Table 或 PLM_Drawing_Status"
                  />
                  <p className="text-xs text-muted-foreground">配置后系统将自动从指定数据源验证此项</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
                <Button
                  onClick={() => createChecklistMutation.mutate({
                    projectId: 1,
                    gateStage: newChecklist.gateStage as any,
                    checkItem: newChecklist.checkItem,
                    isMandatory: newChecklist.isMandatory,
                    autoVerifySource: newChecklist.autoVerifySource || undefined,
                  } as any)}
                  disabled={createChecklistMutation.isPending || !newChecklist.checkItem}
                >
                  {createChecklistMutation.isPending ? "添加中..." : "添加"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ============ M5 设计评审门特有面板 ============ */}
      {isM5 && (
        <M5DesignReviewPanel
          m5Summary={m5Summary}
          m5Definitions={m5Definitions}
          isLoading={isLoading}
        />
      )}

      {/* 阶段进度 */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          {isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{isM5 ? "M5 设计评审总完成度" : "阶段完成度"}</span>
                <span className="text-sm font-bold">
                  {isM5 && m5Summary?.overall
                    ? `${m5Summary.overall.overallRate}%`
                    : `${calculateProgress(checklists?.items || []).toFixed(0)}%`
                  }
                </span>
              </div>
              <Progress
                value={
                  isM5 && m5Summary?.overall
                    ? m5Summary.overall.overallRate
                    : calculateProgress(checklists?.items || [])
                }
                className="h-2"
              />
              {hasMandatoryFail(checklists?.items || []) && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  存在一票否决项未通过，无法推进到下一阶段
                </div>
              )}
              {isM5 && m5Summary?.overall && !m5Summary.overall.gatePassable && !hasMandatoryFail(checklists?.items || []) && (
                <div className="mt-2 flex items-center gap-2 text-orange-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  尚有 {m5Summary.overall.totalMandatory - m5Summary.overall.mandatoryPassed} 项必检项未通过
                </div>
              )}
              {isM5 && m5Summary?.overall?.gatePassable && (
                <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  M5设计评审门条件已满足，可推进至M6采购制造阶段
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 检查项列表 - M5 uses grouped accordion view, others use flat list */}
      {isM5 && groupedByCategory && Object.keys(groupedByCategory).length > 0 ? (
        <M5GroupedChecklist
          groupedByCategory={groupedByCategory}
          getStatusBadge={getStatusBadge}
          updateStatusMutation={updateStatusMutation}
        />
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : checklists?.items?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无检查项</p>
                <p className="text-sm mt-2">
                  {isM5
                    ? '点击"初始化M5模板"从设计评审模板导入检查项'
                    : '点击"添加检查项"创建门径检查清单'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            checklists?.items?.map((item: any) => (
              <ChecklistItemCard
                key={item.id}
                item={item}
                getStatusBadge={getStatusBadge}
                updateStatusMutation={updateStatusMutation}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// M5 Design Review Panel - Category summary cards
// ============================================================
function M5DesignReviewPanel({
  m5Summary,
  m5Definitions,
  isLoading,
}: {
  m5Summary: any;
  m5Definitions: any;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const categories = m5Summary?.categorySummary || M5_REVIEW_CATEGORIES.map(c => ({
    ...c,
    total: 0, passed: 0, failed: 0, pending: 0,
    mandatoryTotal: 0, mandatoryPassed: 0,
    completionRate: 0, meetsTarget: false, mandatoryAllPassed: true,
  }));

  return (
    <div className="space-y-3">
      {/* Category progress cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {categories.map((cat: any) => {
          const IconComp = CATEGORY_ICONS[cat.icon] || Cog;
          const rateColor = cat.completionRate >= cat.targetScore
            ? "text-green-400"
            : cat.completionRate >= 50
              ? "text-yellow-400"
              : "text-red-400";

          return (
            <Card key={cat.id} className={`
              border-t-2 hover:shadow-md transition-shadow
              ${cat.meetsTarget ? "border-t-green-500" : cat.completionRate > 0 ? "border-t-yellow-500" : "border-t-muted"}
            `}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${cat.color}/20`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium truncate">{cat.name}</span>
                </div>
                <div className={`text-2xl font-bold ${rateColor}`}>
                  {cat.completionRate}%
                </div>
                <Progress value={cat.completionRate} className="h-1.5 mt-2" />
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{cat.passed}/{cat.total} 通过</span>
                  <span>目标 {cat.targetScore}%</span>
                </div>
                {!cat.mandatoryAllPassed && cat.mandatoryTotal > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-red-400">
                    <Shield className="w-3 h-3" />
                    必检项 {cat.mandatoryPassed}/{cat.mandatoryTotal}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall gate status */}
      {m5Summary?.overall && (
        <Card className={`
          border-l-4
          ${m5Summary.overall.gatePassable ? "border-l-green-500 bg-green-500/5" : "border-l-orange-500 bg-orange-500/5"}
        `}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5" />
                <div>
                  <span className="font-medium">M5 设计评审门状态</span>
                  <div className="text-sm text-muted-foreground">
                    总检查项 {m5Summary.overall.totalItems} | 通过 {m5Summary.overall.totalPassed} | 未通过 {m5Summary.overall.totalFailed} | 待检 {m5Summary.overall.totalPending}
                  </div>
                </div>
              </div>
              <Badge className={m5Summary.overall.gatePassable
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
              }>
                {m5Summary.overall.gatePassable ? "可通过" : "未满足"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// M5 Grouped Checklist - Accordion by category
// ============================================================
function M5GroupedChecklist({
  groupedByCategory,
  getStatusBadge,
  updateStatusMutation,
}: {
  groupedByCategory: Record<string, any[]>;
  getStatusBadge: (status: string) => React.ReactNode;
  updateStatusMutation: any;
}) {
  // Match category names to M5_REVIEW_CATEGORIES for icon/color
  const getCategoryDef = (categoryName: string) => {
    return M5_REVIEW_CATEGORIES.find(c => c.name === categoryName);
  };

  return (
    <Accordion type="multiple" defaultValue={Object.keys(groupedByCategory)} className="space-y-2">
      {Object.entries(groupedByCategory).map(([categoryName, items]) => {
        const catDef = getCategoryDef(categoryName);
        const IconComp = catDef ? (CATEGORY_ICONS[catDef.icon] || Cog) : FileCheck;
        const passedCount = items.filter(i => i.status === "pass" || i.status === "waived").length;
        const catRate = items.length > 0 ? Math.round((passedCount / items.length) * 100) : 0;

        return (
          <AccordionItem key={categoryName} value={categoryName} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 w-full pr-4">
                <div className={`p-2 rounded-lg ${catDef?.color || 'bg-muted'}/20`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{categoryName}</div>
                  {catDef && (
                    <div className="text-xs text-muted-foreground">{catDef.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {passedCount}/{items.length}
                  </span>
                  <Badge variant="outline" className={
                    catRate >= (catDef?.targetScore || 90)
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : catRate >= 50
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                  }>
                    {catRate}%
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {items.map((item: any) => (
                  <ChecklistItemCard
                    key={item.id}
                    item={item}
                    getStatusBadge={getStatusBadge}
                    updateStatusMutation={updateStatusMutation}
                    compact
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// ============================================================
// Shared ChecklistItemCard
// ============================================================
function ChecklistItemCard({
  item,
  getStatusBadge,
  updateStatusMutation,
  compact = false,
}: {
  item: any;
  getStatusBadge: (status: string) => React.ReactNode;
  updateStatusMutation: any;
  compact?: boolean;
}) {
  return (
    <Card className={`
      border-l-4 hover:shadow-md transition-shadow
      ${item.status === "pass" ? "border-l-green-500" : ""}
      ${item.status === "fail" ? "border-l-red-500" : ""}
      ${item.status === "pending" ? "border-l-yellow-500" : ""}
      ${item.status === "waived" ? "border-l-gray-500" : ""}
    `}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-medium ${compact ? "text-sm" : ""}`}>{item.check_item}</span>
              {item.is_mandatory && (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  一票否决
                </Badge>
              )}
              {getStatusBadge(item.status)}
            </div>
            {item.description && !compact && (
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            )}
            {item.auto_verify_source && (
              <p className="text-xs text-muted-foreground">
                自动验证源: {item.auto_verify_source}
              </p>
            )}
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            {item.status === "pending" && (
              <>
                <Button
                  size="sm" variant="outline"
                  className="text-green-400 hover:text-green-300"
                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: "pass" })}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />通过
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => updateStatusMutation.mutate({ id: item.id, status: "fail" })}
                >
                  <XCircle className="w-4 h-4 mr-1" />不通过
                </Button>
              </>
            )}
            {item.status !== "pending" && (
              <Button
                size="sm" variant="outline"
                onClick={() => updateStatusMutation.mutate({ id: item.id, status: "pending" })}
              >
                <RefreshCw className="w-4 h-4 mr-1" />重置
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
