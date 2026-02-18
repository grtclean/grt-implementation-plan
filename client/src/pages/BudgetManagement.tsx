import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calculator,
  ChevronRight,
  DollarSign,
  FileText,
  PieChart,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// ── Types ──
interface BudgetStandard {
  id: string;
  region: string;
  cityTier: string;
  employeeLevel: string;
  accommodation: number;
  meal: number;
  transport: number;
  other: number;
}

// ── Display labels ──
const REGION_LABELS: Record<string, string> = { domestic: "国内", apac: "亚太", emea: "欧美" };
const TIER_LABELS: Record<string, string> = { tier1: "一线城市", tier2: "二线城市", tier3: "三线城市" };
const LEVEL_LABELS: Record<string, string> = { staff: "员工", manager: "经理", director: "总监" };

// ── Default standards (used to seed localStorage on first visit) ──
const DEFAULT_STANDARDS: BudgetStandard[] = [
  { id: "1", region: "domestic", cityTier: "tier1", employeeLevel: "staff", accommodation: 500, meal: 150, transport: 200, other: 100 },
  { id: "2", region: "domestic", cityTier: "tier1", employeeLevel: "manager", accommodation: 800, meal: 200, transport: 300, other: 150 },
  { id: "3", region: "domestic", cityTier: "tier2", employeeLevel: "staff", accommodation: 350, meal: 120, transport: 150, other: 80 },
  { id: "4", region: "apac", cityTier: "tier1", employeeLevel: "staff", accommodation: 1200, meal: 300, transport: 400, other: 200 },
  { id: "5", region: "emea", cityTier: "tier1", employeeLevel: "staff", accommodation: 2000, meal: 500, transport: 600, other: 300 },
];

const LS_KEY = "grt_budget_standards";

function loadStandards(): BudgetStandard[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_STANDARDS));
  return DEFAULT_STANDARDS;
}

function saveStandards(standards: BudgetStandard[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(standards));
}

// ── Warning projects (static display, no backend) ──
const WARNING_PROJECTS = [
  { id: 1, name: "上海客户拜访", budget: 15000, actual: 14200, status: "warning", rate: 94.7 },
  { id: 2, name: "深圳展会参展", budget: 25000, actual: 26500, status: "exceeded", rate: 106 },
  { id: 3, name: "北京技术培训", budget: 8000, actual: 7600, status: "warning", rate: 95 },
  { id: 4, name: "广州设备安装", budget: 12000, actual: 10800, status: "normal", rate: 90 },
];

export default function BudgetManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<BudgetStandard | null>(null);

  // localStorage-backed standards
  const [budgetStandards, setBudgetStandards] = useState<BudgetStandard[]>(loadStandards);

  const persistStandards = useCallback((next: BudgetStandard[]) => {
    setBudgetStandards(next);
    saveStandards(next);
  }, []);

  // Budget calculator form
  const [calcForm, setCalcForm] = useState({
    region: "domestic",
    cityTier: "tier1",
    employeeLevel: "staff",
    days: 3,
  });

  // Standard form (create / edit)
  const emptyForm = () => ({
    region: "domestic",
    cityTier: "tier1",
    employeeLevel: "staff",
    accommodation: 500,
    meal: 150,
    transport: 200,
    other: 100,
  });
  const [standardForm, setStandardForm] = useState(emptyForm);

  // Open create dialog
  const openCreateDialog = () => {
    setEditingStandard(null);
    setStandardForm(emptyForm());
    setStandardDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (standard: BudgetStandard) => {
    setEditingStandard(standard);
    setStandardForm({
      region: standard.region,
      cityTier: standard.cityTier,
      employeeLevel: standard.employeeLevel,
      accommodation: standard.accommodation,
      meal: standard.meal,
      transport: standard.transport,
      other: standard.other,
    });
    setStandardDialogOpen(true);
  };

  // Save standard (create or update)
  const handleSaveStandard = () => {
    if (editingStandard) {
      const updated = budgetStandards.map(s =>
        s.id === editingStandard.id
          ? { ...s, ...standardForm }
          : s
      );
      persistStandards(updated);
      toast.success("预算标准已更新");
    } else {
      const newStandard: BudgetStandard = {
        id: Date.now().toString(),
        ...standardForm,
      };
      persistStandards([...budgetStandards, newStandard]);
      toast.success("预算标准已创建");
    }
    setStandardDialogOpen(false);
  };

  // Delete standard
  const handleDeleteStandard = (id: string) => {
    persistStandards(budgetStandards.filter(s => s.id !== id));
    toast.success("已删除");
  };

  // Calculate budget using standards or fallback rates
  const calculateBudget = () => {
    const match = budgetStandards.find(
      s => s.region === calcForm.region && s.cityTier === calcForm.cityTier && s.employeeLevel === calcForm.employeeLevel
    );
    if (match) {
      return (match.accommodation + match.meal + match.transport + match.other) * calcForm.days;
    }
    // Fallback rates
    const fallback: Record<string, Record<string, Record<string, number>>> = {
      domestic: { tier1: { staff: 850, manager: 1300, director: 1800 }, tier2: { staff: 620, manager: 950, director: 1300 }, tier3: { staff: 450, manager: 700, director: 1000 } },
      apac: { tier1: { staff: 1900, manager: 2800, director: 3800 }, tier2: { staff: 1400, manager: 2100, director: 2900 } },
      emea: { tier1: { staff: 3100, manager: 4500, director: 6000 }, tier2: { staff: 2400, manager: 3500, director: 4800 } },
    };
    return (fallback[calcForm.region]?.[calcForm.cityTier]?.[calcForm.employeeLevel] || 850) * calcForm.days;
  };

  // Compute stats from standards
  const totalBudget = budgetStandards.reduce((sum, s) => sum + s.accommodation + s.meal + s.transport + s.other, 0);
  const warningCount = WARNING_PROJECTS.filter(p => p.status === "warning").length;
  const exceededCount = WARNING_PROJECTS.filter(p => p.status === "exceeded").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "exceeded": return "text-red-500 bg-red-500/10";
      case "warning": return "text-yellow-500 bg-yellow-500/10";
      default: return "text-green-500 bg-green-500/10";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "exceeded": return "超支";
      case "warning": return "预警";
      default: return "正常";
    }
  };

  return (
      <>
      <div className="space-y-6">
        <PageHeader
          icon={DollarSign}
          title="出差费用预算管理"
          description="管理预算标准、计算预算和监控预警"
          actions={
            <>
              <Dialog open={calculatorOpen} onOpenChange={setCalculatorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calculator className="w-4 h-4" />
                    预算计算器
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>出差预算计算器</DialogTitle>
                    <DialogDescription>输入出差信息，自动计算预算金额</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>出差区域</Label>
                        <Select value={calcForm.region} onValueChange={(v) => setCalcForm({...calcForm, region: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="domestic">国内</SelectItem>
                            <SelectItem value="apac">亚太</SelectItem>
                            <SelectItem value="emea">欧美</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>城市等级</Label>
                        <Select value={calcForm.cityTier} onValueChange={(v) => setCalcForm({...calcForm, cityTier: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tier1">一线城市</SelectItem>
                            <SelectItem value="tier2">二线城市</SelectItem>
                            <SelectItem value="tier3">三线城市</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>员工级别</Label>
                        <Select value={calcForm.employeeLevel} onValueChange={(v) => setCalcForm({...calcForm, employeeLevel: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">普通员工</SelectItem>
                            <SelectItem value="manager">经理</SelectItem>
                            <SelectItem value="director">总监</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>出差天数</Label>
                        <Input type="number" min={1} max={30} value={calcForm.days} onChange={(e) => setCalcForm({...calcForm, days: parseInt(e.target.value) || 1})} />
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">预计预算总额</span>
                        <span className="text-2xl font-bold text-primary">¥{calculateBudget().toLocaleString()}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        日均标准: ¥{(calculateBudget() / calcForm.days).toFixed(0)}/天
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCalculatorOpen(false)}>关闭</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button className="gap-2" onClick={openCreateDialog}>
                <Plus className="w-4 h-4" />
                新建预算标准
              </Button>
            </>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="标准条目数" value={budgetStandards.length} />
          <StatCard icon={TrendingUp} label="日均标准总和" value={`¥${totalBudget.toLocaleString()}`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={TrendingDown} label="覆盖区域" value={new Set(budgetStandards.map(s => s.region)).size} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={AlertTriangle} label="预警项目" value={warningCount} subtitle={`${exceededCount}个已超支`} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2"><PieChart className="w-4 h-4" />预警仪表盘</TabsTrigger>
            <TabsTrigger value="standards" className="gap-2"><Settings className="w-4 h-4" />预算标准</TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2"><FileText className="w-4 h-4" />对比分析</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>预算预警项目</span>
                  <Button variant="ghost" size="sm" className="gap-2"><RefreshCw className="w-4 h-4" />刷新</Button>
                </CardTitle>
                <CardDescription>显示预算使用率超过80%或已超支的项目</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {WARNING_PROJECTS.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>{getStatusText(project.status)}</div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">预算: ¥{project.budget.toLocaleString()} | 实际: ¥{project.actual.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${project.rate > 100 ? 'text-red-500' : project.rate > 90 ? 'text-yellow-500' : 'text-green-500'}`}>{project.rate}%</p>
                          <p className="text-xs text-muted-foreground">使用率</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>预算使用率分布</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "正常 (0-80%)", color: "bg-green-500", width: "60%", count: "12个" },
                      { label: "预警 (80-100%)", color: "bg-yellow-500", width: "20%", count: `${warningCount}个` },
                      { label: "超支 (>100%)", color: "bg-red-500", width: "5%", count: `${exceededCount}个` },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${item.color}`} style={{ width: item.width }}></div>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>本月预算趋势</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[150px] flex items-end justify-between gap-2">
                    {[65, 72, 68, 75, 71, 78, 82].map((value, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full rounded-t ${value > 80 ? 'bg-yellow-500' : 'bg-primary'}`} style={{ height: `${value}%` }}></div>
                        <span className="text-xs text-muted-foreground">W{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Standards */}
          <TabsContent value="standards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>预算标准配置</span>
                  <Button size="sm" className="gap-2" onClick={openCreateDialog}><Plus className="w-4 h-4" />添加标准</Button>
                </CardTitle>
                <CardDescription>按区域、城市等级和员工级别设置每日预算标准 (数据存储在本地)</CardDescription>
              </CardHeader>
              <CardContent>
                {budgetStandards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">暂无预算标准，点击"添加标准"创建</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">区域</th>
                          <th className="text-left py-3 px-4 font-medium">城市等级</th>
                          <th className="text-left py-3 px-4 font-medium">员工级别</th>
                          <th className="text-right py-3 px-4 font-medium">住宿</th>
                          <th className="text-right py-3 px-4 font-medium">餐饮</th>
                          <th className="text-right py-3 px-4 font-medium">交通</th>
                          <th className="text-right py-3 px-4 font-medium">日均合计</th>
                          <th className="text-center py-3 px-4 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetStandards.map((standard) => (
                          <tr key={standard.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">{REGION_LABELS[standard.region] || standard.region}</td>
                            <td className="py-3 px-4">{TIER_LABELS[standard.cityTier] || standard.cityTier}</td>
                            <td className="py-3 px-4">{LEVEL_LABELS[standard.employeeLevel] || standard.employeeLevel}</td>
                            <td className="py-3 px-4 text-right font-mono">¥{standard.accommodation}</td>
                            <td className="py-3 px-4 text-right font-mono">¥{standard.meal}</td>
                            <td className="py-3 px-4 text-right font-mono">¥{standard.transport}</td>
                            <td className="py-3 px-4 text-right font-medium font-mono">
                              ¥{standard.accommodation + standard.meal + standard.transport + standard.other}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(standard)}>
                                  <Settings className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteStandard(standard.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>预算与实际对比分析</CardTitle>
                <CardDescription>按部门和项目类型分析预算执行情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-4">按部门对比</h4>
                    <div className="space-y-3">
                      {[
                        { name: "销售部", budget: 50000, actual: 48500, variance: -1500 },
                        { name: "技术部", budget: 35000, actual: 32000, variance: -3000 },
                        { name: "市场部", budget: 25000, actual: 27500, variance: 2500 },
                        { name: "管理层", budget: 15000, actual: 11500, variance: -3500 },
                      ].map((dept, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-20 text-sm">{dept.name}</div>
                          <div className="flex-1">
                            <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                              <div className="absolute h-full bg-primary/30 rounded-full" style={{ width: `${(dept.budget / 50000) * 100}%` }}></div>
                              <div className={`absolute h-full rounded-full ${dept.actual > dept.budget ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${(dept.actual / 50000) * 100}%` }}></div>
                            </div>
                          </div>
                          <div className="w-32 text-right">
                            <span className={`text-sm font-medium ${dept.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {dept.variance > 0 ? '+' : ''}{dept.variance.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">按费用类型对比</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: "住宿", budget: 45000, actual: 42000 },
                        { name: "交通", budget: 35000, actual: 38000 },
                        { name: "餐饮", budget: 25000, actual: 23500 },
                        { name: "其他", budget: 20000, actual: 16000 },
                      ].map((type, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <p className="font-medium mb-2">{type.name}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">预算</span>
                                <span>¥{type.budget.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">实际</span>
                                <span>¥{type.actual.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t">
                                <span className="text-muted-foreground">差异</span>
                                <span className={type.actual > type.budget ? 'text-red-500' : 'text-green-500'}>
                                  {type.actual > type.budget ? '+' : ''}{(type.actual - type.budget).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Standard Dialog */}
      <Dialog open={standardDialogOpen} onOpenChange={setStandardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStandard ? "编辑预算标准" : "添加预算标准"}</DialogTitle>
            <DialogDescription>设置不同区域、城市等级和员工级别的预算标准</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>区域</Label>
                <Select value={standardForm.region} onValueChange={(v) => setStandardForm({...standardForm, region: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">国内</SelectItem>
                    <SelectItem value="apac">亚太</SelectItem>
                    <SelectItem value="emea">欧美</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>城市等级</Label>
                <Select value={standardForm.cityTier} onValueChange={(v) => setStandardForm({...standardForm, cityTier: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tier1">一线城市</SelectItem>
                    <SelectItem value="tier2">二线城市</SelectItem>
                    <SelectItem value="tier3">三线城市</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>员工级别</Label>
                <Select value={standardForm.employeeLevel} onValueChange={(v) => setStandardForm({...standardForm, employeeLevel: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">普通员工</SelectItem>
                    <SelectItem value="manager">经理</SelectItem>
                    <SelectItem value="director">总监</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>住宿标准 (元/天)</Label>
                <Input type="number" value={standardForm.accommodation} onChange={(e) => setStandardForm({...standardForm, accommodation: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>餐饮标准 (元/天)</Label>
                <Input type="number" value={standardForm.meal} onChange={(e) => setStandardForm({...standardForm, meal: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>交通标准 (元/天)</Label>
                <Input type="number" value={standardForm.transport} onChange={(e) => setStandardForm({...standardForm, transport: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>其他标准 (元/天)</Label>
                <Input type="number" value={standardForm.other} onChange={(e) => setStandardForm({...standardForm, other: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-muted/50 text-sm">
              日均合计: <span className="font-bold">¥{(standardForm.accommodation + standardForm.meal + standardForm.transport + standardForm.other).toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStandardDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveStandard}>{editingStandard ? "保存" : "创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
  );
}
