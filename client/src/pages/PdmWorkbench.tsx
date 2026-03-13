/**
 * PDM Workbench — 产品数据管理 (Product Data Management)
 * 8-tab workbench for full lifecycle product data management
 *
 * Tabs: 产品目录 | 配置基线 | 工程变更 | 需求追溯 | 制造就绪 | 实际偏差 | 现场反馈 | PDM仪表板
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Database,
  Package,
  GitBranch,
  FileCheck,
  ClipboardCheck,
  Factory,
  AlertTriangle,
  Wrench,
  BarChart3,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ── Status badge helpers ──

const lifecycleColors: Record<string, string> = {
  concept: "bg-gray-100 text-gray-700",
  design: "bg-blue-100 text-blue-700",
  released: "bg-green-100 text-green-700",
  production: "bg-emerald-100 text-emerald-700",
  service: "bg-yellow-100 text-yellow-700",
  eol: "bg-red-100 text-red-700",
};

const lifecycleLabels: Record<string, string> = {
  concept: "概念", design: "设计", released: "发布",
  production: "生产", service: "服务", eol: "停产",
};

const familyLabels: Record<string, string> = {
  USC: "超声波", SPR: "喷淋", IMM: "浸泡",
};

const severityColors: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-700",
  major: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const readinessLabels: Record<string, string> = {
  bom_approved: "BOM审批",
  plm_released: "PLM发布",
  plc_promoted: "PLC版本",
  eplan_exported: "EPLAN导出",
  standards_validated: "标准验证",
  fmea_completed: "FMEA完成",
  conflict_free: "无设计冲突",
};

// ── Shared loading / error helpers ──

function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      {label ?? "加载中..."}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm">{message ?? "数据加载失败"}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />重试
        </Button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-8 text-muted-foreground">{message}</div>;
}

// ════════════════════════════════════════════
// Tab 1: 产品目录
// ════════════════════════════════════════════

function ProductCatalogTab() {
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState({
    productCode: "",
    productName: "",
    productFamily: "USC" as "USC" | "SPR" | "IMM",
    stationCount: 0,
  });

  const familyValue = familyFilter === "all" ? undefined : familyFilter as "USC" | "SPR" | "IMM";
  const productsQuery = trpc.pdm.product.list.useQuery({
    family: familyValue,
    search: search || undefined,
    limit: 50,
  });

  const statsQuery = trpc.pdm.product.getStats.useQuery();

  const createMutation = trpc.pdm.product.create.useMutation({
    onSuccess: () => {
      productsQuery.refetch();
      statsQuery.refetch();
      setShowCreate(false);
      setNewProduct({ productCode: "", productName: "", productFamily: "USC", stationCount: 0 });
    },
  });

  if (productsQuery.isLoading && statsQuery.isLoading) return <LoadingState label="加载产品目录..." />;
  if (productsQuery.isError) return <ErrorState message="产品目录加载失败" onRetry={() => productsQuery.refetch()} />;

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statsQuery.data?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">产品总数</div>
          </CardContent>
        </Card>
        {statsQuery.data?.byFamily?.map((f) => (
          <Card key={f.family}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{f.count}</div>
              <div className="text-xs text-muted-foreground">{familyLabels[f.family] ?? f.family}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="搜索产品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={familyFilter} onValueChange={setFamilyFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="产品族" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="USC">超声波 USC</SelectItem>
            <SelectItem value="SPR">喷淋 SPR</SelectItem>
            <SelectItem value="IMM">浸泡 IMM</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />新建产品</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建产品</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="产品编码 (如 USC-15-A)"
                value={newProduct.productCode}
                onChange={(e) => setNewProduct({ ...newProduct, productCode: e.target.value })}
              />
              <Input
                placeholder="产品名称"
                value={newProduct.productName}
                onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
              />
              <Select
                value={newProduct.productFamily}
                onValueChange={(v) => setNewProduct({ ...newProduct, productFamily: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USC">超声波 USC</SelectItem>
                  <SelectItem value="SPR">喷淋 SPR</SelectItem>
                  <SelectItem value="IMM">浸泡 IMM</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="工位数"
                value={newProduct.stationCount}
                onChange={(e) => setNewProduct({ ...newProduct, stationCount: parseInt(e.target.value) || 0 })}
              />
              <Button
                className="w-full"
                disabled={!newProduct.productCode || !newProduct.productName || createMutation.isPending}
                onClick={() => createMutation.mutate(newProduct)}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {productsQuery.data?.items?.map((p: any) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.productCode}</CardTitle>
                <Badge className={lifecycleColors[p.lifecycleStatus] ?? ""}>
                  {lifecycleLabels[p.lifecycleStatus] ?? p.lifecycleStatus}
                </Badge>
              </div>
              <CardDescription>{p.productName}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{familyLabels[p.productFamily] ?? p.productFamily}</span>
                <span>{p.stationCount ?? 0}工位</span>
                <span>成熟度 {p.maturityLevel ?? 0}%</span>
              </div>
              {/* Maturity bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${p.maturityLevel ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {productsQuery.data?.items?.length === 0 && <EmptyState message="暂无产品数据，点击【新建产品】添加" />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 2: 配置基线
// ════════════════════════════════════════════

function BaselineTab() {
  const baselinesQuery = trpc.pdm.baseline.list.useQuery({ limit: 50 });

  if (baselinesQuery.isLoading) return <LoadingState label="加载基线数据..." />;
  if (baselinesQuery.isError) return <ErrorState message="基线数据加载失败" onRetry={() => baselinesQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5" />配置基线时间线
        </h3>
      </div>
      <div className="space-y-3">
        {baselinesQuery.data?.items?.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.baselineName}</div>
                  <div className="text-sm text-muted-foreground">
                    Gate: {b.gateStage} | BOM: {b.bomVersion ?? "N/A"} | PLC: {b.plcVersionTag ?? "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    PLM Docs: {Array.isArray(b.plmDocumentIds) ? b.plmDocumentIds.length : 0} |
                    Stations: {Array.isArray(b.stationSnapshot) ? b.stationSnapshot.length : 0}
                  </div>
                </div>
                <Badge variant={b.status === "approved" ? "default" : "secondary"}>
                  {b.status === "approved" ? "已批准" : b.status === "draft" ? "草稿" : "已替代"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {(baselinesQuery.data?.items?.length ?? 0) === 0 && <EmptyState message="暂无基线记录" />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 3: 工程变更
// ════════════════════════════════════════════

function EcoTab() {
  const pendingQuery = trpc.pdm.eco.listPendingApprovals.useQuery();
  const statsQuery = trpc.pdm.eco.getStats.useQuery();

  const stepLabels: Record<string, string> = {
    ecr_submit: "ECR提交", impact_analysis: "影响分析",
    review: "评审", approval: "审批",
    execute: "执行", verify: "验证", close: "关闭",
  };

  if (pendingQuery.isLoading && statsQuery.isLoading) return <LoadingState label="加载工程变更..." />;
  if (pendingQuery.isError) return <ErrorState message="工程变更数据加载失败" onRetry={() => pendingQuery.refetch()} />;

  return (
    <div className="space-y-4">
      {/* ECO stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{statsQuery.data?.totalSteps ?? 0}</div>
            <div className="text-xs text-muted-foreground">总工作流步骤</div>
          </CardContent>
        </Card>
        {statsQuery.data?.byStatus?.map((s: any) => (
          <Card key={s.status}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending approvals */}
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="w-5 h-5" />待审批
      </h3>
      <div className="space-y-2">
        {pendingQuery.data?.map((step: any) => (
          <Card key={step.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">ECO #{step.ecoId}</div>
                <div className="text-sm text-muted-foreground">
                  步骤: {stepLabels[step.stepType] ?? step.stepType}
                </div>
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                待审批
              </Badge>
            </CardContent>
          </Card>
        ))}
        {(pendingQuery.data?.length ?? 0) === 0 && <EmptyState message="无待审批项" />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 4: 需求追溯
// ════════════════════════════════════════════

function RequirementTab() {
  const [projectId] = useState(1);
  const matrixQuery = trpc.pdm.requirement.getMatrix.useQuery({ projectId });
  const coverageQuery = trpc.pdm.requirement.getCoverage.useQuery({ projectId });

  const categoryLabels: Record<string, string> = {
    functional: "功能", performance: "性能", safety: "安全",
    cleanliness: "洁净度", regulatory: "法规",
  };

  if (matrixQuery.isLoading) return <LoadingState label="加载需求追溯..." />;
  if (matrixQuery.isError) return <ErrorState message="需求追溯数据加载失败" onRetry={() => matrixQuery.refetch()} />;

  return (
    <div className="space-y-4">
      {/* Coverage summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{coverageQuery.data?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">需求总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{coverageQuery.data?.designCoverage ?? 0}%</div>
            <div className="text-xs text-muted-foreground">设计覆盖</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{coverageQuery.data?.verificationCoverage ?? 0}%</div>
            <div className="text-xs text-muted-foreground">验证覆盖</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{coverageQuery.data?.passRate ?? 0}%</div>
            <div className="text-xs text-muted-foreground">通过率</div>
          </CardContent>
        </Card>
      </div>

      {/* Traceability matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2">编号</th>
              <th className="text-left p-2">标题</th>
              <th className="text-left p-2">类别</th>
              <th className="text-center p-2">设计</th>
              <th className="text-center p-2">BOM</th>
              <th className="text-center p-2">验证</th>
              <th className="text-center p-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {matrixQuery.data?.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-muted/30">
                <td className="p-2 font-mono text-xs">{r.code}</td>
                <td className="p-2">{r.title}</td>
                <td className="p-2">
                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[r.category] ?? r.category}
                  </Badge>
                </td>
                <td className="p-2 text-center">
                  {r.hasDesignLink ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 inline" />
                  )}
                </td>
                <td className="p-2 text-center">
                  {r.hasBomLink ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 inline" />
                  )}
                </td>
                <td className="p-2 text-center">
                  {r.hasVerification ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 inline" />
                  )}
                </td>
                <td className="p-2 text-center">
                  <Badge
                    variant="outline"
                    className={
                      r.verificationStatus === "passed"
                        ? "text-green-600 border-green-300"
                        : r.verificationStatus === "failed"
                        ? "text-red-600 border-red-300"
                        : "text-gray-500"
                    }
                  >
                    {r.verificationStatus === "passed" ? "通过" :
                     r.verificationStatus === "failed" ? "失败" :
                     r.verificationStatus === "in_progress" ? "进行中" :
                     r.verificationStatus === "waived" ? "豁免" : "未开始"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(matrixQuery.data?.length ?? 0) === 0 && <EmptyState message="暂无需求追溯数据" />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 5: 制造就绪
// ════════════════════════════════════════════

function ReadinessTab() {
  const [projectId] = useState(1);
  const checksQuery = trpc.pdm.readiness.getChecks.useQuery({ projectId });
  const scoreQuery = trpc.pdm.readiness.getReadinessScore.useQuery({ projectId });

  const runChecksMutation = trpc.pdm.readiness.runChecks.useMutation({
    onSuccess: () => {
      checksQuery.refetch();
      scoreQuery.refetch();
    },
  });

  if (checksQuery.isLoading) return <LoadingState label="加载就绪检查..." />;
  if (checksQuery.isError) return <ErrorState message="就绪检查数据加载失败" onRetry={() => checksQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Factory className="w-5 h-5" />M5 制造就绪评审
        </h3>
        <Button
          size="sm"
          onClick={() => runChecksMutation.mutate({ projectId })}
          disabled={runChecksMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${runChecksMutation.isPending ? "animate-spin" : ""}`} />
          运行自动检查
        </Button>
      </div>

      {/* Score gauge */}
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600">{scoreQuery.data?.score ?? 0}%</div>
            <div className="text-sm text-muted-foreground mt-1">就绪分数</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              通过: {scoreQuery.data?.passed ?? 0}
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              失败: {scoreQuery.data?.failed ?? 0}
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-yellow-500" />
              豁免: {scoreQuery.data?.waived ?? 0}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              未检: {scoreQuery.data?.notChecked ?? 0}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check items */}
      <div className="space-y-2">
        {checksQuery.data?.map((check: any) => (
          <Card key={check.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {check.status === "passed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : check.status === "failed" ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : check.status === "waived" ? (
                  <Shield className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">{readinessLabels[check.checkType] ?? check.checkType}</div>
                  <div className="text-xs text-muted-foreground">{check.validationDetails}</div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  check.status === "passed" ? "text-green-600 border-green-300" :
                  check.status === "failed" ? "text-red-600 border-red-300" :
                  check.status === "waived" ? "text-yellow-600 border-yellow-300" :
                  "text-gray-500"
                }
              >
                {check.status === "passed" ? "通过" :
                 check.status === "failed" ? "失败" :
                 check.status === "waived" ? "豁免" : "未检查"}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {(checksQuery.data?.length ?? 0) === 0 && (
          <EmptyState message="点击【运行自动检查】开始制造就绪评审" />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 6: 实际偏差
// ════════════════════════════════════════════

function DeviationTab() {
  const deviationsQuery = trpc.pdm.asBuilt.list.useQuery({ limit: 50 });

  const deviationTypeLabels: Record<string, string> = {
    material_substitution: "物料替代",
    process_change: "工艺变更",
    quantity_change: "数量变更",
  };

  if (deviationsQuery.isLoading) return <LoadingState label="加载偏差数据..." />;
  if (deviationsQuery.isError) return <ErrorState message="偏差数据加载失败" onRetry={() => deviationsQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />实际偏差 (As-Built vs As-Designed)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2">工位</th>
              <th className="text-left p-2">类型</th>
              <th className="text-left p-2">严重度</th>
              <th className="text-left p-2">设计值</th>
              <th className="text-left p-2">实际值</th>
              <th className="text-center p-2">审批</th>
            </tr>
          </thead>
          <tbody>
            {deviationsQuery.data?.items?.map((d: any) => (
              <tr key={d.id} className="border-b hover:bg-muted/30">
                <td className="p-2 font-mono text-xs">{d.stationCode ?? "-"}</td>
                <td className="p-2">{deviationTypeLabels[d.deviationType] ?? d.deviationType}</td>
                <td className="p-2">
                  <Badge className={severityColors[d.severity] ?? ""}>{d.severity}</Badge>
                </td>
                <td className="p-2">{d.designedValue ?? "-"}</td>
                <td className="p-2">{d.actualValue ?? "-"}</td>
                <td className="p-2 text-center">
                  <Badge
                    variant="outline"
                    className={
                      d.approvalStatus === "approved" ? "text-green-600 border-green-300" :
                      d.approvalStatus === "rejected" ? "text-red-600 border-red-300" :
                      "text-orange-500 border-orange-300"
                    }
                  >
                    {d.approvalStatus === "approved" ? "已批准" :
                     d.approvalStatus === "rejected" ? "已拒绝" : "待审批"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(deviationsQuery.data?.items?.length ?? 0) === 0 && <EmptyState message="暂无偏差记录" />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 7: 现场反馈
// ════════════════════════════════════════════

function FieldInsightTab() {
  const insightsQuery = trpc.pdm.fieldInsight.list.useQuery({ limit: 50 });

  const insightTypeLabels: Record<string, string> = {
    recurring_failure: "重复故障",
    design_weakness: "设计缺陷",
    improvement_opportunity: "改进机会",
  };

  const insightStatusLabels: Record<string, string> = {
    open: "待处理", investigating: "调查中",
    eco_created: "已创建ECO", resolved: "已解决", dismissed: "已忽略",
  };

  if (insightsQuery.isLoading) return <LoadingState label="加载现场反馈..." />;
  if (insightsQuery.isError) return <ErrorState message="现场反馈数据加载失败" onRetry={() => insightsQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wrench className="w-5 h-5" />现场反馈 (Service → Design)
      </h3>
      <div className="space-y-3">
        {insightsQuery.data?.items?.map((insight: any) => (
          <Card key={insight.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {insightTypeLabels[insight.insightType] ?? insight.insightType}
                    </Badge>
                    <Badge className={severityColors[insight.severityScore >= 7 ? "critical" : insight.severityScore >= 4 ? "major" : "minor"]}>
                      严重度: {insight.severityScore}/10
                    </Badge>
                  </div>
                  <div className="font-medium mt-1">{insight.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {insight.description ?? ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    发生次数: {insight.occurrenceCount ?? 0}
                  </div>
                </div>
                <Badge variant="outline">
                  {insightStatusLabels[insight.status] ?? insight.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {(insightsQuery.data?.items?.length ?? 0) === 0 && <EmptyState message="暂无现场反馈数据" />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 8: PDM仪表板
// ════════════════════════════════════════════

function DashboardTab() {
  const overviewQuery = trpc.pdm.dashboard.getOverview.useQuery();
  const readinessQuery = trpc.pdm.dashboard.getReadinessSummary.useQuery();

  if (overviewQuery.isLoading) return <LoadingState label="加载PDM仪表板..." />;
  if (overviewQuery.isError) return <ErrorState message="仪表板数据加载失败" onRetry={() => overviewQuery.refetch()} />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />PDM 全局仪表板
      </h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{overviewQuery.data?.products ?? 0}</div>
            <div className="text-xs text-muted-foreground">产品</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <GitBranch className="w-6 h-6 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{overviewQuery.data?.baselines ?? 0}</div>
            <div className="text-xs text-muted-foreground">基线</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileCheck className="w-6 h-6 mx-auto text-purple-500 mb-1" />
            <div className="text-2xl font-bold">{overviewQuery.data?.ecoSteps ?? 0}</div>
            <div className="text-xs text-muted-foreground">ECO步骤</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ClipboardCheck className="w-6 h-6 mx-auto text-indigo-500 mb-1" />
            <div className="text-2xl font-bold">{overviewQuery.data?.requirements ?? 0}</div>
            <div className="text-xs text-muted-foreground">需求</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold">{overviewQuery.data?.deviations ?? 0}</div>
            <div className="text-xs text-muted-foreground">偏差</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="w-6 h-6 mx-auto text-teal-500 mb-1" />
            <div className="text-2xl font-bold">{overviewQuery.data?.fieldInsights ?? 0}</div>
            <div className="text-xs text-muted-foreground">现场反馈</div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">产品生命周期分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {overviewQuery.data?.productsByStatus?.map((s: any) => (
              <div key={s.status} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${lifecycleColors[s.status] ?? "bg-gray-100"}`}>
                  {s.count}
                </div>
                <span className="text-sm">{lifecycleLabels[s.status] ?? s.status}</span>
              </div>
            ))}
            {(overviewQuery.data?.productsByStatus?.length ?? 0) === 0 && (
              <span className="text-sm text-muted-foreground">暂无数据</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Readiness summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">制造就绪汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {readinessQuery.data?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {item.status === "passed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : item.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
                <span>{readinessLabels[item.checkType] ?? item.checkType}</span>
                <span className="font-mono text-xs">x{item.count}</span>
              </div>
            ))}
            {(readinessQuery.data?.length ?? 0) === 0 && (
              <span className="text-sm text-muted-foreground">暂无就绪检查数据</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════
// Main Workbench
// ════════════════════════════════════════════

export default function PdmWorkbench() {
  const { t } = useLanguage();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <Database className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">产品数据管理 PDM</h1>
          <p className="text-sm text-muted-foreground">
            Design → Manufacturing → Delivery → After-Sales 全生命周期产品数据管理
          </p>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="catalog" className="text-xs">
            <Package className="w-3.5 h-3.5 mr-1" />产品目录
          </TabsTrigger>
          <TabsTrigger value="baseline" className="text-xs">
            <GitBranch className="w-3.5 h-3.5 mr-1" />配置基线
          </TabsTrigger>
          <TabsTrigger value="eco" className="text-xs">
            <FileCheck className="w-3.5 h-3.5 mr-1" />工程变更
          </TabsTrigger>
          <TabsTrigger value="requirement" className="text-xs">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />需求追溯
          </TabsTrigger>
          <TabsTrigger value="readiness" className="text-xs">
            <Factory className="w-3.5 h-3.5 mr-1" />制造就绪
          </TabsTrigger>
          <TabsTrigger value="deviation" className="text-xs">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />实际偏差
          </TabsTrigger>
          <TabsTrigger value="insight" className="text-xs">
            <Wrench className="w-3.5 h-3.5 mr-1" />现场反馈
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs">
            <BarChart3 className="w-3.5 h-3.5 mr-1" />PDM仪表板
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog"><ProductCatalogTab /></TabsContent>
        <TabsContent value="baseline"><BaselineTab /></TabsContent>
        <TabsContent value="eco"><EcoTab /></TabsContent>
        <TabsContent value="requirement"><RequirementTab /></TabsContent>
        <TabsContent value="readiness"><ReadinessTab /></TabsContent>
        <TabsContent value="deviation"><DeviationTab /></TabsContent>
        <TabsContent value="insight"><FieldInsightTab /></TabsContent>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
      </Tabs>
    </div>
  );
}
