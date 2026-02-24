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
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t, tpl } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Display labels (need t()) ──
  const REGION_LABELS: Record<string, string> = { domestic: t("finance.budgetMgmt.regionDomestic"), apac: t("finance.budgetMgmt.regionApac"), emea: t("finance.budgetMgmt.regionEmea") };
  const TIER_LABELS: Record<string, string> = { tier1: t("finance.budgetMgmt.tierTier1"), tier2: t("finance.budgetMgmt.tierTier2"), tier3: t("finance.budgetMgmt.tierTier3") };
  const LEVEL_LABELS: Record<string, string> = { staff: t("finance.budgetMgmt.levelStaff"), manager: t("finance.budgetMgmt.levelManager"), director: t("finance.budgetMgmt.levelDirector") };
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
      toast.success(t("finance.budgetMgmt.updateSuccess"));
    } else {
      const newStandard: BudgetStandard = {
        id: Date.now().toString(),
        ...standardForm,
      };
      persistStandards([...budgetStandards, newStandard]);
      toast.success(t("finance.budgetMgmt.createSuccess"));
    }
    setStandardDialogOpen(false);
  };

  // Delete standard
  const handleDeleteStandard = (id: string) => {
    persistStandards(budgetStandards.filter(s => s.id !== id));
    toast.success(t("finance.budgetMgmt.deleteSuccess"));
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
      case "exceeded": return t("finance.budgetMgmt.statusExceeded");
      case "warning": return t("finance.budgetMgmt.statusWarning");
      default: return t("finance.budgetMgmt.statusNormal");
    }
  };

  return (
      <>
      <div className="space-y-6">
        <PageHeader
          icon={DollarSign}
          title={t("finance.budgetMgmt.title")}
          description={t("finance.budgetMgmt.desc")}
          actions={
            <>
              <Dialog open={calculatorOpen} onOpenChange={setCalculatorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calculator className="w-4 h-4" />
                    {t("finance.budgetMgmt.calculator")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t("finance.budgetMgmt.calculatorTitle")}</DialogTitle>
                    <DialogDescription>{t("finance.budgetMgmt.calculatorDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("finance.budgetMgmt.travelRegion")}</Label>
                        <Select value={calcForm.region} onValueChange={(v) => setCalcForm({...calcForm, region: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="domestic">{t("finance.budgetMgmt.regionDomestic")}</SelectItem>
                            <SelectItem value="apac">{t("finance.budgetMgmt.regionApac")}</SelectItem>
                            <SelectItem value="emea">{t("finance.budgetMgmt.regionEmea")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("finance.budgetMgmt.cityTier")}</Label>
                        <Select value={calcForm.cityTier} onValueChange={(v) => setCalcForm({...calcForm, cityTier: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tier1">{t("finance.budgetMgmt.tierTier1")}</SelectItem>
                            <SelectItem value="tier2">{t("finance.budgetMgmt.tierTier2")}</SelectItem>
                            <SelectItem value="tier3">{t("finance.budgetMgmt.tierTier3")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("finance.budgetMgmt.employeeLevel")}</Label>
                        <Select value={calcForm.employeeLevel} onValueChange={(v) => setCalcForm({...calcForm, employeeLevel: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">{t("finance.budgetMgmt.levelStaff")}</SelectItem>
                            <SelectItem value="manager">{t("finance.budgetMgmt.levelManager")}</SelectItem>
                            <SelectItem value="director">{t("finance.budgetMgmt.levelDirector")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("finance.budgetMgmt.travelDays")}</Label>
                        <Input type="number" min={1} max={30} value={calcForm.days} onChange={(e) => setCalcForm({...calcForm, days: parseInt(e.target.value) || 1})} />
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("finance.budgetMgmt.estimatedTotal")}</span>
                        <span className="text-2xl font-bold text-primary">¥{calculateBudget().toLocaleString()}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t("finance.budgetMgmt.dailyRate")}: ¥{(calculateBudget() / calcForm.days).toFixed(0)}{t("finance.budgetMgmt.perDay")}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCalculatorOpen(false)}>{t("finance.budgetMgmt.close")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button className="gap-2" onClick={openCreateDialog}>
                <Plus className="w-4 h-4" />
                {t("finance.budgetMgmt.newStandard")}
              </Button>
            </>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label={t("finance.budgetMgmt.standardCount")} value={budgetStandards.length} />
          <StatCard icon={TrendingUp} label={t("finance.budgetMgmt.dailyTotalSum")} value={`¥${totalBudget.toLocaleString()}`} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={TrendingDown} label={t("finance.budgetMgmt.coverRegions")} value={new Set(budgetStandards.map(s => s.region)).size} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={AlertTriangle} label={t("finance.budgetMgmt.warningProjects")} value={warningCount} subtitle={tpl("finance.budgetMgmt.exceededCount", { count: exceededCount })} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2"><PieChart className="w-4 h-4" />{t("finance.budgetMgmt.dashboardTab")}</TabsTrigger>
            <TabsTrigger value="standards" className="gap-2"><Settings className="w-4 h-4" />{t("finance.budgetMgmt.standardsTab")}</TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2"><FileText className="w-4 h-4" />{t("finance.budgetMgmt.analysisTab")}</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("finance.budgetMgmt.warningProjectsList")}</span>
                  <Button variant="ghost" size="sm" className="gap-2"><RefreshCw className="w-4 h-4" />{t("finance.budgetMgmt.refresh")}</Button>
                </CardTitle>
                <CardDescription>{t("finance.budgetMgmt.warningProjectsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {WARNING_PROJECTS.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>{getStatusText(project.status)}</div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{t("finance.budgetMgmt.budgetLabel")}: ¥{project.budget.toLocaleString()} | {t("finance.budgetMgmt.actualLabel")}: ¥{project.actual.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${project.rate > 100 ? 'text-red-500' : project.rate > 90 ? 'text-yellow-500' : 'text-green-500'}`}>{project.rate}%</p>
                          <p className="text-xs text-muted-foreground">{t("finance.budgetMgmt.usageRate")}</p>
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
                <CardHeader><CardTitle>{t("finance.budgetMgmt.usageDistribution")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: t("finance.budgetMgmt.normalRange"), color: "bg-green-500", width: "60%", count: "12" },
                      { label: t("finance.budgetMgmt.warningRange"), color: "bg-yellow-500", width: "20%", count: `${warningCount}` },
                      { label: t("finance.budgetMgmt.exceededRange"), color: "bg-red-500", width: "5%", count: `${exceededCount}` },
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
                <CardHeader><CardTitle>{t("finance.budgetMgmt.monthlyTrend")}</CardTitle></CardHeader>
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
                  <span>{t("finance.budgetMgmt.standardsConfig")}</span>
                  <Button size="sm" className="gap-2" onClick={openCreateDialog}><Plus className="w-4 h-4" />{t("finance.budgetMgmt.addStandard")}</Button>
                </CardTitle>
                <CardDescription>{t("finance.budgetMgmt.standardsConfigDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {budgetStandards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t("finance.budgetMgmt.noStandards")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">{t("finance.budgetMgmt.thRegion")}</th>
                          <th className="text-left py-3 px-4 font-medium">{t("finance.budgetMgmt.thCityTier")}</th>
                          <th className="text-left py-3 px-4 font-medium">{t("finance.budgetMgmt.thEmployeeLevel")}</th>
                          <th className="text-right py-3 px-4 font-medium">{t("finance.budgetMgmt.thAccommodation")}</th>
                          <th className="text-right py-3 px-4 font-medium">{t("finance.budgetMgmt.thMeal")}</th>
                          <th className="text-right py-3 px-4 font-medium">{t("finance.budgetMgmt.thTransport")}</th>
                          <th className="text-right py-3 px-4 font-medium">{t("finance.budgetMgmt.thDailyTotal")}</th>
                          <th className="text-center py-3 px-4 font-medium">{t("finance.budgetMgmt.thActions")}</th>
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
                <CardTitle>{t("finance.budgetMgmt.comparisonTitle")}</CardTitle>
                <CardDescription>{t("finance.budgetMgmt.comparisonDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-4">{t("finance.budgetMgmt.byDepartment")}</h4>
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
                    <h4 className="font-medium mb-4">{t("finance.budgetMgmt.byExpenseType")}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: t("finance.budgetMgmt.accommodation"), budget: 45000, actual: 42000 },
                        { name: t("finance.budgetMgmt.transport"), budget: 35000, actual: 38000 },
                        { name: t("finance.budgetMgmt.meal"), budget: 25000, actual: 23500 },
                        { name: t("finance.budgetMgmt.other"), budget: 20000, actual: 16000 },
                      ].map((type, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <p className="font-medium mb-2">{type.name}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("finance.budgetMgmt.budgetLabel")}</span>
                                <span>¥{type.budget.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("finance.budgetMgmt.actualLabel")}</span>
                                <span>¥{type.actual.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t">
                                <span className="text-muted-foreground">{t("finance.budgetMgmt.variance")}</span>
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
            <DialogTitle>{editingStandard ? t("finance.budgetMgmt.editStandard") : t("finance.budgetMgmt.addStandardTitle")}</DialogTitle>
            <DialogDescription>{t("finance.budgetMgmt.standardDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.regionLabel")}</Label>
                <Select value={standardForm.region} onValueChange={(v) => setStandardForm({...standardForm, region: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">{t("finance.budgetMgmt.regionDomestic")}</SelectItem>
                    <SelectItem value="apac">{t("finance.budgetMgmt.regionApac")}</SelectItem>
                    <SelectItem value="emea">{t("finance.budgetMgmt.regionEmea")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.cityTier")}</Label>
                <Select value={standardForm.cityTier} onValueChange={(v) => setStandardForm({...standardForm, cityTier: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tier1">{t("finance.budgetMgmt.tierTier1")}</SelectItem>
                    <SelectItem value="tier2">{t("finance.budgetMgmt.tierTier2")}</SelectItem>
                    <SelectItem value="tier3">{t("finance.budgetMgmt.tierTier3")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.employeeLevel")}</Label>
                <Select value={standardForm.employeeLevel} onValueChange={(v) => setStandardForm({...standardForm, employeeLevel: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{t("finance.budgetMgmt.levelStaff")}</SelectItem>
                    <SelectItem value="manager">{t("finance.budgetMgmt.levelManager")}</SelectItem>
                    <SelectItem value="director">{t("finance.budgetMgmt.levelDirector")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.accommodationStd")}</Label>
                <Input type="number" value={standardForm.accommodation} onChange={(e) => setStandardForm({...standardForm, accommodation: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.mealStd")}</Label>
                <Input type="number" value={standardForm.meal} onChange={(e) => setStandardForm({...standardForm, meal: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.transportStd")}</Label>
                <Input type="number" value={standardForm.transport} onChange={(e) => setStandardForm({...standardForm, transport: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>{t("finance.budgetMgmt.otherStd")}</Label>
                <Input type="number" value={standardForm.other} onChange={(e) => setStandardForm({...standardForm, other: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-muted/50 text-sm">
              {t("finance.budgetMgmt.dailyTotal")}: <span className="font-bold">¥{(standardForm.accommodation + standardForm.meal + standardForm.transport + standardForm.other).toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStandardDialogOpen(false)}>{t("finance.budgetMgmt.cancel")}</Button>
            <Button onClick={handleSaveStandard}>{editingStandard ? t("finance.budgetMgmt.save") : t("finance.budgetMgmt.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
  );
}
