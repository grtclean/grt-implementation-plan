/**
 * 机械配置标准治理工作台
 * Mechanical Configuration Standards Governance Workbench
 *
 * 7 tabs: 标准库 / 客户配置 / 配置清单 / 知识图谱 / 报价合规 / 阶段评审 / 验收追踪
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Wrench, Building2, ListChecks, Network, FileCheck2, ClipboardCheck, ThumbsUp,
  Search, Plus, Lock, Unlock, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ExternalLink, Filter,
} from "lucide-react";

const ORIGIN_LABELS: Record<string, string> = {
  GRT_INTERNAL: "GRT内部", ISO: "ISO", DIN: "DIN", EN: "EN", GB: "国标",
  ASME: "ASME", JIS: "JIS", OEM_CUSTOMER: "OEM客户", INDUSTRY: "行业",
};

const CATEGORY_LABELS: Record<string, string> = {
  structural_frame: "结构框架", material_selection: "材料选型", surface_treatment: "表面处理",
  welding: "焊接工艺", fastener: "紧固件", sealing: "密封",
  pneumatic_hydraulic: "气动液压", piping_routing: "管路布线", thermal_management: "热管理",
  noise_vibration: "噪声振动", ergonomic_access: "人机工程", safety_guarding: "安全防护",
  appearance_paint: "外观涂装", packaging_shipping: "包装运输",
};

const ORIGIN_COLORS: Record<string, string> = {
  GRT_INTERNAL: "bg-blue-100 text-blue-800", ISO: "bg-green-100 text-green-800",
  DIN: "bg-yellow-100 text-yellow-800", EN: "bg-purple-100 text-purple-800",
  GB: "bg-red-100 text-red-800", ASME: "bg-orange-100 text-orange-800",
  OEM_CUSTOMER: "bg-pink-100 text-pink-800", INDUSTRY: "bg-gray-100 text-gray-800",
};

const RESULT_BADGES: Record<string, { color: string; label: string }> = {
  ACCEPTED: { color: "bg-green-100 text-green-800", label: "通过" },
  CONDITIONAL: { color: "bg-yellow-100 text-yellow-800", label: "有条件通过" },
  REJECTED: { color: "bg-red-100 text-red-800", label: "拒绝" },
  PENDING: { color: "bg-gray-100 text-gray-800", label: "待检" },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PASS: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  FAIL: <XCircle className="h-4 w-4 text-red-600" />,
  WAIVED: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  NOT_CHECKED: <span className="h-4 w-4 text-gray-400">-</span>,
  N_A: <span className="text-xs text-gray-400">N/A</span>,
};

export default function MechanicalConfigWorkbench() {
  const [activeTab, setActiveTab] = useState("standards");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Wrench className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">机械配置标准治理</h1>
          <p className="text-sm text-muted-foreground">Mechanical Configuration Standards Governance — GRT / OEM / ISO</p>
        </div>
      </div>

      <DashboardKPIs />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="standards" className="gap-1"><Wrench className="h-3.5 w-3.5" />标准库</TabsTrigger>
          <TabsTrigger value="configs" className="gap-1"><Building2 className="h-3.5 w-3.5" />客户配置</TabsTrigger>
          <TabsTrigger value="lineItems" className="gap-1"><ListChecks className="h-3.5 w-3.5" />配置清单</TabsTrigger>
          <TabsTrigger value="graph" className="gap-1"><Network className="h-3.5 w-3.5" />知识图谱</TabsTrigger>
          <TabsTrigger value="quotation" className="gap-1"><FileCheck2 className="h-3.5 w-3.5" />报价合规</TabsTrigger>
          <TabsTrigger value="phase" className="gap-1"><ClipboardCheck className="h-3.5 w-3.5" />阶段评审</TabsTrigger>
          <TabsTrigger value="acceptance" className="gap-1"><ThumbsUp className="h-3.5 w-3.5" />验收追踪</TabsTrigger>
        </TabsList>

        <TabsContent value="standards"><StandardsLibraryTab /></TabsContent>
        <TabsContent value="configs"><CustomerConfigsTab /></TabsContent>
        <TabsContent value="lineItems"><ConfigLineItemsTab /></TabsContent>
        <TabsContent value="graph"><KnowledgeGraphTab /></TabsContent>
        <TabsContent value="quotation"><QuotationComplianceTab /></TabsContent>
        <TabsContent value="phase"><PhaseChecklistTab /></TabsContent>
        <TabsContent value="acceptance"><AcceptanceTrackingTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Dashboard KPIs ─────────────────────────────────────────────

function DashboardKPIs() {
  const { data } = trpc.mechanicalConfig.dashboard.overview.useQuery();
  const kpis = [
    { label: "有效标准", value: data?.activeStandardCount ?? 0, color: "text-blue-600" },
    { label: "客户配置", value: data?.customerConfigCount ?? 0, color: "text-green-600" },
    { label: "项目选型", value: data?.projectSelectionCount ?? 0, color: "text-purple-600" },
    { label: "知识图谱边", value: data?.knowledgeGraphEdges ?? 0, color: "text-cyan-600" },
    { label: "待验收", value: data?.pendingAcceptanceCount ?? 0, color: "text-orange-600" },
    { label: "被拒绝", value: data?.rejectedAcceptanceCount ?? 0, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {kpis.map((k) => (
        <Card key={k.label} className="p-3">
          <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          <div className="text-xs text-muted-foreground">{k.label}</div>
        </Card>
      ))}
    </div>
  );
}

// ── Tab 1: Standards Library ───────────────────────────────────

function StandardsLibraryTab() {
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedStd, setSelectedStd] = useState<any>(null);

  const { data: standards = [] } = trpc.mechanicalConfig.standards.list.useQuery({
    origin: originFilter !== "all" ? originFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索标准..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={originFilter} onValueChange={setOriginFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="来源" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部来源</SelectItem>
            {Object.entries(ORIGIN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="类别" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类别</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{standards.length} 条标准</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {standards.map((std: any) => (
          <Card key={std.id} className="cursor-pointer hover:ring-2 ring-blue-300 transition-all" onClick={() => setSelectedStd(std)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className={ORIGIN_COLORS[std.origin] || "bg-gray-100"}>{ORIGIN_LABELS[std.origin] || std.origin}</Badge>
                <Badge variant="outline">{std.version}</Badge>
              </div>
              <CardTitle className="text-sm mt-1">{std.code}</CardTitle>
              <CardDescription className="text-xs">{std.title}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[std.category] || std.category}</Badge>
                {std.toleranceClass && <Badge variant="outline" className="text-[10px]">{std.toleranceClass}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStd && (
        <Dialog open={!!selectedStd} onOpenChange={() => setSelectedStd(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedStd.code} — {selectedStd.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {selectedStd.titleEn && <p className="text-muted-foreground">{selectedStd.titleEn}</p>}
              <div className="flex gap-2 flex-wrap">
                <Badge className={ORIGIN_COLORS[selectedStd.origin]}>{ORIGIN_LABELS[selectedStd.origin]}</Badge>
                <Badge variant="secondary">{CATEGORY_LABELS[selectedStd.category]}</Badge>
                <Badge variant="outline">v{selectedStd.version}</Badge>
                {selectedStd.toleranceClass && <Badge variant="outline">{selectedStd.toleranceClass}</Badge>}
              </div>
              {selectedStd.description && <p>{selectedStd.description}</p>}
              {selectedStd.keyRequirements?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">关键要求</h4>
                  <ul className="list-disc list-inside space-y-0.5 text-sm">
                    {selectedStd.keyRequirements.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {selectedStd.inspectionMethods?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">检验方法</h4>
                  <ul className="list-disc list-inside space-y-0.5 text-sm">
                    {selectedStd.inspectionMethods.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
              {selectedStd.applicableMaterials?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <span className="text-muted-foreground">适用材料:</span>
                  {selectedStd.applicableMaterials.map((m: string) => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                </div>
              )}
              {selectedStd.applicableRegions?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <span className="text-muted-foreground">适用地区:</span>
                  {selectedStd.applicableRegions.map((r: string) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Tab 2: Customer Configs ────────────────────────────────────

function CustomerConfigsTab() {
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const { data: configs = [] } = trpc.mechanicalConfig.customerConfig.list.useQuery();

  const configFields = [
    { key: "frameMaterial", label: "框架材料" },
    { key: "surfaceFinish", label: "表面处理" },
    { key: "weldingStandard", label: "焊接标准" },
    { key: "toleranceGrade", label: "公差等级" },
    { key: "ipRating", label: "防护等级" },
    { key: "cleanroomClass", label: "洁净室等级" },
    { key: "pneumaticsBrand", label: "气动品牌" },
    { key: "paintColorCode", label: "涂装色号" },
    { key: "noiseLimit", label: "噪声限值" },
    { key: "vibrationLimit", label: "振动限值" },
    { key: "safetyGuardSpec", label: "安全防护" },
    { key: "fastenerStandard", label: "紧固件标准" },
    { key: "packagingSpec", label: "包装规范" },
    { key: "cableRoutingSpec", label: "管路布线" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">客户机械配置档案 ({configs.length})</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {configs.map((cfg: any) => (
          <Card key={cfg.id} className="cursor-pointer hover:ring-2 ring-green-300" onClick={() => setSelectedConfig(cfg)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{cfg.customerName}</CardTitle>
                <Badge variant="outline">{cfg.region}</Badge>
              </div>
              {cfg.customerCode && <CardDescription>{cfg.customerCode}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {configFields.slice(0, 6).map((f) => cfg[f.key] && (
                  <div key={f.key}><span className="text-muted-foreground">{f.label}:</span> {cfg[f.key]}</div>
                ))}
              </div>
              {cfg.specialRequirements && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                  <span className="font-medium">特殊要求: </span>{cfg.specialRequirements.slice(0, 100)}...
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedConfig && (
        <Dialog open={!!selectedConfig} onOpenChange={() => setSelectedConfig(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedConfig.customerName} — 机械配置档案</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {configFields.map((f) => (
                <div key={f.key} className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="font-medium">{selectedConfig[f.key] || "—"}</div>
                </div>
              ))}
            </div>
            {selectedConfig.specialRequirements && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <h4 className="font-medium text-sm mb-1">特殊要求</h4>
                <p className="text-sm">{selectedConfig.specialRequirements}</p>
              </div>
            )}
            {selectedConfig.documentLanguages?.length > 0 && (
              <div className="flex gap-1 items-center">
                <span className="text-sm text-muted-foreground">文档语言:</span>
                {selectedConfig.documentLanguages.map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Tab 3: Config Line Items ───────────────────────────────────

function ConfigLineItemsTab() {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const { data: configs = [] } = trpc.mechanicalConfig.customerConfig.list.useQuery();
  const { data: lineItems = [] } = trpc.mechanicalConfig.lineItem.listByConfig.useQuery(
    { configId: selectedConfigId! },
    { enabled: !!selectedConfigId }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedConfigId?.toString() ?? ""} onValueChange={(v) => setSelectedConfigId(Number(v))}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="选择客户配置..." /></SelectTrigger>
          <SelectContent>
            {configs.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.customerName} ({c.customerCode})</SelectItem>)}
          </SelectContent>
        </Select>
        {lineItems.length > 0 && <Badge>{lineItems.length} 项配置</Badge>}
      </div>

      {selectedConfigId && lineItems.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">序号</TableHead>
              <TableHead className="w-[100px]">编码</TableHead>
              <TableHead>项目名称</TableHead>
              <TableHead className="w-[100px]">类别</TableHead>
              <TableHead>规格要求</TableHead>
              <TableHead className="w-[100px]">品牌</TableHead>
              <TableHead className="w-[60px]">必选</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item: any, idx: number) => (
              <TableRow key={item.id}>
                <TableCell className="text-center">{idx + 1}</TableCell>
                <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[item.category]}</Badge></TableCell>
                <TableCell className="text-xs">{item.specification}</TableCell>
                <TableCell className="text-xs">{item.brand || "—"}</TableCell>
                <TableCell className="text-center">{item.isMandatory ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selectedConfigId && lineItems.length === 0 && (
        <div className="text-center text-muted-foreground py-12">该客户暂无配置清单项</div>
      )}
    </div>
  );
}

// ── Tab 4: Knowledge Graph ─────────────────────────────────────

function KnowledgeGraphTab() {
  const { data: graph } = trpc.mechanicalConfig.knowledgeGraph.getFullGraph.useQuery();

  const linkTypeLabels: Record<string, string> = {
    derives_from: "源自", supersedes: "取代", conflicts_with: "冲突",
    requires: "依赖", references: "参考", complements: "补充",
  };

  const linkTypeColors: Record<string, string> = {
    derives_from: "bg-blue-100 text-blue-800", supersedes: "bg-red-100 text-red-800",
    conflicts_with: "bg-orange-100 text-orange-800", requires: "bg-purple-100 text-purple-800",
    references: "bg-green-100 text-green-800", complements: "bg-cyan-100 text-cyan-800",
  };

  const nodeMap = useMemo(() => {
    if (!graph?.nodes) return {};
    return Object.fromEntries(graph.nodes.map((n: any) => [n.id, n]));
  }, [graph?.nodes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">标准知识图谱 — 关联关系</h3>
        {graph && <Badge variant="outline">{graph.nodes?.length ?? 0} 节点 / {graph.edges?.length ?? 0} 边</Badge>}
      </div>

      {/* Legend */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(linkTypeLabels).map(([k, v]) => (
          <Badge key={k} className={linkTypeColors[k]}>{v}</Badge>
        ))}
      </div>

      {graph?.edges && graph.edges.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>源标准</TableHead>
              <TableHead className="w-[100px] text-center">关系</TableHead>
              <TableHead>目标标准</TableHead>
              <TableHead className="w-[80px] text-center">强度</TableHead>
              <TableHead>描述</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {graph.edges.map((edge: any) => (
              <TableRow key={edge.id}>
                <TableCell className="font-mono text-xs">{nodeMap[edge.sourceId]?.code ?? `#${edge.sourceId}`}</TableCell>
                <TableCell className="text-center">
                  <Badge className={linkTypeColors[edge.linkType]}>{linkTypeLabels[edge.linkType]}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{nodeMap[edge.targetId]?.code ?? `#${edge.targetId}`}</TableCell>
                <TableCell className="text-center">
                  <Progress value={edge.strength} className="h-2 w-16 mx-auto" />
                  <span className="text-[10px] text-muted-foreground">{edge.strength}%</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{edge.description || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Tab 5: Quotation Compliance ────────────────────────────────

function QuotationComplianceTab() {
  const [projectCode, setProjectCode] = useState("GRT-312");
  const { data: checks = [] } = trpc.mechanicalConfig.quotation.listByProject.useQuery({ projectCode });
  const { data: summary = [] } = trpc.mechanicalConfig.quotation.summary.useQuery({ projectCode });

  const totalChecks = summary.reduce((s: number, r: any) => s + r.count, 0);
  const passCount = summary.find((r: any) => r.status === "PASS")?.count ?? 0;
  const complianceRate = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="项目编号" className="w-[200px]" />
        {totalChecks > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={complianceRate} className="w-32 h-3" />
            <span className="text-sm font-medium">{complianceRate}% 合规率</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {summary.map((s: any) => (
          <Badge key={s.status} variant="outline">{s.status}: {s.count}</Badge>
        ))}
      </div>

      {checks.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>检查项</TableHead>
              <TableHead className="w-[100px]">类别</TableHead>
              <TableHead>客户要求</TableHead>
              <TableHead>GRT方案</TableHead>
              <TableHead className="w-[80px]">状态</TableHead>
              <TableHead>偏差</TableHead>
              <TableHead className="w-[80px]">成本影响</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((chk: any) => (
              <TableRow key={chk.id}>
                <TableCell className="font-medium text-sm">{chk.checkItem}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[chk.category]}</Badge></TableCell>
                <TableCell className="text-xs">{chk.customerRequirement || "—"}</TableCell>
                <TableCell className="text-xs">{chk.grtProposal || "—"}</TableCell>
                <TableCell>{STATUS_ICONS[chk.complianceStatus]}</TableCell>
                <TableCell className="text-xs text-red-600">{chk.deviationNote || "—"}</TableCell>
                <TableCell className="text-xs">{chk.costImpact || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {checks.length === 0 && <div className="text-center text-muted-foreground py-12">该项目暂无报价合规检查数据</div>}
    </div>
  );
}

// ── Tab 6: Phase Checklists ────────────────────────────────────

function PhaseChecklistTab() {
  const [projectCode, setProjectCode] = useState("GRT-312");
  const { data: reviewRules = [] } = trpc.mechanicalConfig.reviewRule.list.useQuery();
  const { data: checklists = [] } = trpc.mechanicalConfig.phaseChecklist.getByProjectPhase.useQuery({ projectCode });

  const phaseGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const rule of reviewRules) {
      const phase = rule.phase as string;
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(rule);
    }
    return groups;
  }, [reviewRules]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="项目编号" className="w-[200px]" />
        <Badge variant="outline">{reviewRules.length} 条评审规则</Badge>
        {checklists.length > 0 && <Badge>{checklists.length} 项检查</Badge>}
      </div>

      {/* Review Rules by Phase */}
      <div className="space-y-4">
        {Object.entries(phaseGroups).sort().map(([phase, rules]) => (
          <Card key={phase}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{phase} 阶段评审</CardTitle>
                <Badge variant="outline">{rules.length} 规则</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {rules.map((rule: any) => (
                <div key={rule.id} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={rule.isBlocking ? "destructive" : "secondary"} className="text-[10px]">
                      {rule.isBlocking ? "阻塞" : "建议"}
                    </Badge>
                    <Badge className={ORIGIN_COLORS[rule.origin]}>{ORIGIN_LABELS[rule.origin]}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{rule.ruleCode}</span>
                  </div>
                  <div className="font-medium text-sm">{rule.title}</div>
                  {rule.checklistTemplate && (
                    <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {(rule.checklistTemplate as string[]).map((item, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab 7: Acceptance Tracking ─────────────────────────────────

function AcceptanceTrackingTab() {
  const [projectCode, setProjectCode] = useState("GRT-312");
  const { data: records = [] } = trpc.mechanicalConfig.acceptance.listByProject.useQuery({ projectCode });
  const { data: satisfaction } = trpc.mechanicalConfig.acceptance.satisfactionSummary.useQuery({ projectCode });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="项目编号" className="w-[200px]" />
        {satisfaction && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">平均满意度:</span>
              <span className={`text-lg font-bold ${satisfaction.averageScore >= 80 ? "text-green-600" : satisfaction.averageScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                {satisfaction.averageScore.toFixed(1)}%
              </span>
            </div>
            {satisfaction.byResult?.map((r: any) => (
              <Badge key={r.result} className={RESULT_BADGES[r.result]?.color}>{RESULT_BADGES[r.result]?.label}: {r.count}</Badge>
            ))}
          </div>
        )}
      </div>

      {records.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>项目</TableHead>
              <TableHead>客户</TableHead>
              <TableHead>阶段</TableHead>
              <TableHead>检查项</TableHead>
              <TableHead className="w-[100px]">类别</TableHead>
              <TableHead className="w-[100px]">结果</TableHead>
              <TableHead className="w-[60px]">评分</TableHead>
              <TableHead>客户评论</TableHead>
              <TableHead>整改措施</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((rec: any) => (
              <TableRow key={rec.id}>
                <TableCell className="font-mono text-xs">{rec.projectCode}</TableCell>
                <TableCell className="text-sm">{rec.customerName}</TableCell>
                <TableCell><Badge variant="outline">{rec.acceptancePhase}</Badge></TableCell>
                <TableCell className="font-medium text-sm">{rec.checkItem}</TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[rec.category]}</Badge></TableCell>
                <TableCell>
                  <Badge className={RESULT_BADGES[rec.result]?.color}>{RESULT_BADGES[rec.result]?.label}</Badge>
                </TableCell>
                <TableCell className={`font-bold ${(rec.score ?? 0) >= 80 ? "text-green-600" : (rec.score ?? 0) >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                  {rec.score ?? "—"}
                </TableCell>
                <TableCell className="text-xs">{rec.customerComment || "—"}</TableCell>
                <TableCell className="text-xs text-blue-600">{rec.correctiveAction || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {records.length === 0 && <div className="text-center text-muted-foreground py-12">该项目暂无验收记录</div>}
    </div>
  );
}
