/**
 * 项目报价工作台 — 新项目工时填写 / 报价生成 / 费率管理
 *
 * Tabs:
 *   1. 报价单管理 — 创建/查看报价单列表
 *   2. 报价生成器 — 选项目 → 自动填充工时 → 调整 → 生成报价
 *   3. 费率管理   — 年度工序/工程费率 CRUD
 *   4. 项目效率   — 选定项目的产值/效率分析
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, FileText, Settings, BarChart3, Plus, RefreshCw } from "lucide-react";

function fmt(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `¥${v.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProjectQuotingWorkbench() {
  const [activeTab, setActiveTab] = useState("quotes");

  // ── Quote List ──
  const { data: quotes, refetch: refetchQuotes } = trpc.quotingEngine.listQuotes.useQuery({});

  // ── Rate Configs ──
  const { data: rates, refetch: refetchRates } = trpc.quotingEngine.listRateConfigs.useQuery({ fiscalYear: 2026 });

  // ── Create Quote Form ──
  const [newCustomer, setNewCustomer] = useState("");
  const [newBU, setNewBU] = useState("BU1");
  const [newModel, setNewModel] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newMargin, setNewMargin] = useState("25");
  const createQuote = trpc.quotingEngine.createQuote.useMutation();
  const populateMfg = trpc.quotingEngine.populateFromProcessHours.useMutation();
  const populateEng = trpc.quotingEngine.populateEngineeringDefaults.useMutation();
  const populateOH = trpc.quotingEngine.populateOverheadDefaults.useMutation();
  const recalcTotals = trpc.quotingEngine.recalculateQuoteTotals.useMutation();

  // ── Quote Detail ──
  const [selectedQuoteCode, setSelectedQuoteCode] = useState<string | null>(null);
  const { data: quoteDetail } = trpc.quotingEngine.getQuote.useQuery(
    { quoteCode: selectedQuoteCode ?? "" },
    { enabled: !!selectedQuoteCode }
  );

  // ── Project Efficiency ──
  const [effProject, setEffProject] = useState("GRT-414");
  const { data: efficiency } = trpc.quotingEngine.getProjectEfficiencyAnalysis.useQuery(
    { projectCode: effProject },
    { enabled: !!effProject }
  );

  // ── Seed rates ──
  const seedRates = trpc.quotingEngine.seedDefaultRates.useMutation();

  // ── Project hours list for selection ──
  const { data: projectList } = trpc.processManagement.getProjectHoursSummary.useQuery({});

  async function handleCreateQuote() {
    if (!newCustomer) return;
    const result = await createQuote.mutateAsync({
      customerName: newCustomer, buCode: newBU,
      equipmentModel: newModel || undefined,
      projectCode: newProjectCode || undefined,
      targetMarginPct: Number(newMargin) || 25,
    });
    if (result.quoteCode && newProjectCode) {
      // Find quote ID
      const qs = await refetchQuotes();
      const q = (qs.data as any[])?.find((q: any) => q.quote_code === result.quoteCode);
      if (q?.id) {
        await populateMfg.mutateAsync({ quoteId: q.id, projectCode: newProjectCode, hoursType: "theory" });
        await populateEng.mutateAsync({ quoteId: q.id });
        await populateOH.mutateAsync({ quoteId: q.id });
        await recalcTotals.mutateAsync({ quoteId: q.id });
      }
    }
    await refetchQuotes();
    setSelectedQuoteCode(result.quoteCode);
    setActiveTab("quotes");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          项目报价工作台
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          新项目工时预估 · 报价生成 · 费率管理 · 效率分析
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="quotes"><FileText className="h-3.5 w-3.5 mr-1" />报价单</TabsTrigger>
          <TabsTrigger value="create"><Plus className="h-3.5 w-3.5 mr-1" />新建报价</TabsTrigger>
          <TabsTrigger value="rates"><Settings className="h-3.5 w-3.5 mr-1" />费率管理</TabsTrigger>
          <TabsTrigger value="efficiency"><BarChart3 className="h-3.5 w-3.5 mr-1" />项目效率</TabsTrigger>
        </TabsList>

        {/* Tab 1: Quote List + Detail */}
        <TabsContent value="quotes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">报价单列表</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {quotes?.length === 0 && <p className="text-sm text-muted-foreground">暂无报价单，点击"新建报价"创建</p>}
                {(quotes as any[])?.map((q: any) => (
                  <div key={q.quote_code}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedQuoteCode === q.quote_code ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => setSelectedQuoteCode(q.quote_code)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">{q.quote_code}</span>
                      <Badge variant={q.status === "draft" ? "secondary" : "default"}>{q.status}</Badge>
                    </div>
                    <div className="text-sm mt-1">{q.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{q.equipment_model} · {q.bu_code}</div>
                    <div className="text-sm font-bold mt-1">{fmt(q.quoted_price)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {quoteDetail ? `报价单详情 — ${quoteDetail.quote_code}` : "选择报价单查看详情"}
                </CardTitle>
                {quoteDetail && (
                  <CardDescription>
                    {quoteDetail.customer_name} · {quoteDetail.equipment_model} · 利润率 {quoteDetail.target_margin_pct}%
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {quoteDetail ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                        <div className="text-xs text-blue-600">制造工时 A1</div>
                        <div className="text-lg font-bold">{fmt(quoteDetail.total_mfg_labor_cost)}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                        <div className="text-xs text-green-600">工程工时 A3</div>
                        <div className="text-lg font-bold">{fmt(quoteDetail.total_engineering_cost)}</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                        <div className="text-xs text-amber-600">报价总额</div>
                        <div className="text-lg font-bold">{fmt(quoteDetail.quoted_price)}</div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>类别</TableHead>
                          <TableHead>项目</TableHead>
                          <TableHead className="text-right">工时</TableHead>
                          <TableHead className="text-right">费率</TableHead>
                          <TableHead className="text-right">金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(quoteDetail.lineItems as any[])?.map((li: any) => (
                          <TableRow key={li.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {li.category === "mfg_labor" ? "制造" : li.category === "engineering" ? "工程" :
                                 li.category === "sales_expense" ? "销售" : li.category === "warranty" ? "质保" : "其他"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{li.item_name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {li.estimated_hours ? `${Number(li.estimated_hours).toFixed(0)}h` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              {li.hourly_rate ? `¥${li.hourly_rate}/h` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">{fmt(li.estimated_cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">从左侧列表选择报价单，或新建一个报价</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Create Quote */}
        <TabsContent value="create">
          <Card>
            <CardHeader><CardTitle>新建项目报价</CardTitle><CardDescription>选择参照项目自动填充工时，或手动输入</CardDescription></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>客户名称 *</Label>
                <Input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} placeholder="如：某汽车零部件公司" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>事业部 *</Label>
                  <Select value={newBU} onValueChange={setNewBU}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BU1">事业一部(海外)</SelectItem>
                      <SelectItem value="BU2">事业二部(商用车)</SelectItem>
                      <SelectItem value="BU3">事业三部(乘用车)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>目标利润率 %</Label>
                  <Input value={newMargin} onChange={e => setNewMargin(e.target.value)} type="number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>设备型号</Label>
                <Input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="如：KLT-4200 双工位清洗机" />
              </div>
              <div className="space-y-2">
                <Label>参照项目（自动填充工时）</Label>
                <Select value={newProjectCode} onValueChange={setNewProjectCode}>
                  <SelectTrigger><SelectValue placeholder="选择历史项目作为工时参照" /></SelectTrigger>
                  <SelectContent>
                    {(projectList as any[])?.map((p: any) => (
                      <SelectItem key={p.projectCode} value={p.projectCode}>
                        {p.projectCode} — {Number(p.totalHours).toLocaleString()}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateQuote} disabled={!newCustomer || createQuote.isPending}>
                {createQuote.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                生成报价单
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Rate Management */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>2026年度费率配置</CardTitle>
                  <CardDescription>每年度调整一次，各工序及工程工时费率</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => seedRates.mutateAsync({ fiscalYear: 2026 }).then(() => refetchRates())}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />重置默认
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类别</TableHead>
                    <TableHead>费率代码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="text-right">费率 (¥/h)</TableHead>
                    <TableHead>单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rates as any[])?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {r.category === "mfg_process" ? "制造工序" : "工程工时"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.rate_code}</TableCell>
                      <TableCell>{r.rate_name}</TableCell>
                      <TableCell className="text-right font-mono font-bold">¥{r.hourly_rate}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.rate_unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Project Efficiency */}
        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle className="flex-1">项目效率分析</CardTitle>
                <Select value={effProject} onValueChange={setEffProject}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(projectList as any[])?.slice(0, 20).map((p: any) => (
                      <SelectItem key={p.projectCode} value={p.projectCode}>{p.projectCode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {efficiency && !("error" in efficiency) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">理论总产值</div>
                      <div className="text-lg font-bold">{fmt(efficiency.summary.totalTheoryValue)}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <div className="text-xs text-green-600">实际产值</div>
                      <div className="text-lg font-bold">{fmt(efficiency.summary.totalEffectiveValue)}</div>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">总效率</div>
                      <div className="text-lg font-bold">{efficiency.summary.overallEfficiency}%</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                      <div className="text-xs text-destructive">无效工时成本</div>
                      <div className="text-lg font-bold text-destructive">{fmt(efficiency.summary.invalidCostTotal)}</div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>工序</TableHead>
                        <TableHead className="text-right">理论</TableHead>
                        <TableHead className="text-right">实际</TableHead>
                        <TableHead className="text-right">有效</TableHead>
                        <TableHead className="text-right">无效</TableHead>
                        <TableHead className="text-right">效率</TableHead>
                        <TableHead className="text-right">产值</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {efficiency.processes.map((p: any) => (
                        <TableRow key={p.code}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">{p.theoryHours}h</TableCell>
                          <TableCell className="text-right">{p.actualHours}h</TableCell>
                          <TableCell className="text-right text-green-600">{p.effectiveHours}h</TableCell>
                          <TableCell className="text-right text-destructive">{p.invalidHours > 0 ? `${p.invalidHours}h` : "-"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.efficiency >= 85 ? "outline" : p.efficiency > 0 ? "destructive" : "secondary"}>
                              {p.efficiency > 0 ? `${p.efficiency}%` : "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmt(p.effectiveValue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">选择项目查看效率分析</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
