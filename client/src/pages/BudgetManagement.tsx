import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  Calculator, 
  ChevronRight, 
  DollarSign, 
  Edit, 
  FileText, 
  PieChart, 
  Plus, 
  RefreshCw, 
  Settings, 
  TrendingDown, 
  TrendingUp 
} from "lucide-react";
import { useState } from "react";

export default function BudgetManagement() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);
  
  // 预算计算器表单状态
  const [calcForm, setCalcForm] = useState({
    region: "domestic",
    cityTier: "tier1",
    employeeLevel: "staff",
    days: 3,
    includeAccommodation: true,
    includeTransportation: true,
    includeMeals: true,
    includeOther: false
  });
  
  // 预算标准表单状态
  const [standardForm, setStandardForm] = useState({
    region: "domestic",
    cityTier: "tier1",
    employeeLevel: "staff",
    accommodationLimit: 500,
    mealLimit: 150,
    transportationLimit: 200,
    otherLimit: 100
  });

  // 模拟预算数据
  const budgetStats = {
    totalBudget: 125000,
    usedBudget: 89500,
    remainingBudget: 35500,
    utilizationRate: 71.6,
    projectsWithWarning: 3,
    projectsExceeded: 1
  };

  // 模拟预警项目数据
  const warningProjects = [
    { id: 1, name: "上海客户拜访", budget: 15000, actual: 14200, status: "warning", rate: 94.7 },
    { id: 2, name: "深圳展会参展", budget: 25000, actual: 26500, status: "exceeded", rate: 106 },
    { id: 3, name: "北京技术培训", budget: 8000, actual: 7600, status: "warning", rate: 95 },
    { id: 4, name: "广州设备安装", budget: 12000, actual: 10800, status: "normal", rate: 90 }
  ];

  // 模拟预算标准数据
  const budgetStandards = [
    { region: "国内", cityTier: "一线城市", level: "员工", accommodation: 500, meal: 150, transport: 200 },
    { region: "国内", cityTier: "一线城市", level: "经理", accommodation: 800, meal: 200, transport: 300 },
    { region: "国内", cityTier: "二线城市", level: "员工", accommodation: 350, meal: 120, transport: 150 },
    { region: "亚太", cityTier: "一线城市", level: "员工", accommodation: 1200, meal: 300, transport: 400 },
    { region: "欧美", cityTier: "一线城市", level: "员工", accommodation: 2000, meal: 500, transport: 600 }
  ];

  // 计算预算
  const calculateBudget = () => {
    const baseRates: Record<string, Record<string, Record<string, number>>> = {
      domestic: {
        tier1: { staff: 850, manager: 1300, director: 1800 },
        tier2: { staff: 620, manager: 950, director: 1300 },
        tier3: { staff: 450, manager: 700, director: 1000 }
      },
      apac: {
        tier1: { staff: 1900, manager: 2800, director: 3800 },
        tier2: { staff: 1400, manager: 2100, director: 2900 }
      },
      emea: {
        tier1: { staff: 3100, manager: 4500, director: 6000 },
        tier2: { staff: 2400, manager: 3500, director: 4800 }
      }
    };

    const rate = baseRates[calcForm.region]?.[calcForm.cityTier]?.[calcForm.employeeLevel] || 850;
    return rate * calcForm.days;
  };

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
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading">出差费用预算管理</h1>
            <p className="text-muted-foreground mt-1">管理预算标准、计算预算和监控预警</p>
          </div>
          <div className="flex gap-2">
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
                  <DialogDescription>
                    输入出差信息，自动计算预算金额
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>出差区域</Label>
                      <Select value={calcForm.region} onValueChange={(v) => setCalcForm({...calcForm, region: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">普通员工</SelectItem>
                          <SelectItem value="manager">经理</SelectItem>
                          <SelectItem value="director">总监</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>出差天数</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={30}
                        value={calcForm.days}
                        onChange={(e) => setCalcForm({...calcForm, days: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">预计预算总额</span>
                      <span className="text-2xl font-bold text-primary">
                        ¥{calculateBudget().toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      日均标准: ¥{(calculateBudget() / calcForm.days).toFixed(0)}/天
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCalculatorOpen(false)}>关闭</Button>
                  <Button onClick={() => {
                    // 可以将计算结果应用到出差申请
                    setCalculatorOpen(false);
                  }}>应用到申请</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新建预算标准
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">本月总预算</p>
                  <p className="text-2xl font-bold">¥{budgetStats.totalBudget.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">已使用预算</p>
                  <p className="text-2xl font-bold">¥{budgetStats.usedBudget.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{budgetStats.utilizationRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">剩余预算</p>
                  <p className="text-2xl font-bold">¥{budgetStats.remainingBudget.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">预警项目</p>
                  <p className="text-2xl font-bold">{budgetStats.projectsWithWarning}</p>
                  <p className="text-xs text-red-500">{budgetStats.projectsExceeded}个已超支</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <PieChart className="w-4 h-4" />
              预警仪表盘
            </TabsTrigger>
            <TabsTrigger value="standards" className="gap-2">
              <Settings className="w-4 h-4" />
              预算标准
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <FileText className="w-4 h-4" />
              对比分析
            </TabsTrigger>
          </TabsList>

          {/* 预警仪表盘 */}
          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>预算预警项目</span>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    刷新
                  </Button>
                </CardTitle>
                <CardDescription>显示预算使用率超过80%或已超支的项目</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {warningProjects.map((project) => (
                    <div 
                      key={project.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            预算: ¥{project.budget.toLocaleString()} | 实际: ¥{project.actual.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${project.rate > 100 ? 'text-red-500' : project.rate > 90 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {project.rate}%
                          </p>
                          <p className="text-xs text-muted-foreground">使用率</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 预算使用率分布 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>预算使用率分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">正常 (0-80%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm font-medium">12个</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">预警 (80-100%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: '20%' }}></div>
                        </div>
                        <span className="text-sm font-medium">3个</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">超支 (&gt;100%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '5%' }}></div>
                        </div>
                        <span className="text-sm font-medium">1个</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>本月预算趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[150px] flex items-end justify-between gap-2">
                    {[65, 72, 68, 75, 71, 78, 82].map((value, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className={`w-full rounded-t ${value > 80 ? 'bg-yellow-500' : 'bg-primary'}`}
                          style={{ height: `${value}%` }}
                        ></div>
                        <span className="text-xs text-muted-foreground">W{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 预算标准 */}
          <TabsContent value="standards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>预算标准配置</span>
                  <Dialog open={standardDialogOpen} onOpenChange={setStandardDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        添加标准
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加预算标准</DialogTitle>
                        <DialogDescription>
                          设置不同区域、城市等级和员工级别的预算标准
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>区域</Label>
                            <Select value={standardForm.region} onValueChange={(v) => setStandardForm({...standardForm, region: v})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
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
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
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
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
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
                            <Input 
                              type="number"
                              value={standardForm.accommodationLimit}
                              onChange={(e) => setStandardForm({...standardForm, accommodationLimit: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>餐饮标准 (元/天)</Label>
                            <Input 
                              type="number"
                              value={standardForm.mealLimit}
                              onChange={(e) => setStandardForm({...standardForm, mealLimit: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>交通标准 (元/天)</Label>
                            <Input 
                              type="number"
                              value={standardForm.transportationLimit}
                              onChange={(e) => setStandardForm({...standardForm, transportationLimit: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>其他标准 (元/天)</Label>
                            <Input 
                              type="number"
                              value={standardForm.otherLimit}
                              onChange={(e) => setStandardForm({...standardForm, otherLimit: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setStandardDialogOpen(false)}>取消</Button>
                        <Button onClick={() => setStandardDialogOpen(false)}>保存</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>按区域、城市等级和员工级别设置每日预算标准</CardDescription>
              </CardHeader>
              <CardContent>
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
                      {budgetStandards.map((standard, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{standard.region}</td>
                          <td className="py-3 px-4">{standard.cityTier}</td>
                          <td className="py-3 px-4">{standard.level}</td>
                          <td className="py-3 px-4 text-right">¥{standard.accommodation}</td>
                          <td className="py-3 px-4 text-right">¥{standard.meal}</td>
                          <td className="py-3 px-4 text-right">¥{standard.transport}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            ¥{standard.accommodation + standard.meal + standard.transport}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 对比分析 */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>预算与实际对比分析</CardTitle>
                <CardDescription>按部门和项目类型分析预算执行情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 部门对比 */}
                  <div>
                    <h4 className="font-medium mb-4">按部门对比</h4>
                    <div className="space-y-3">
                      {[
                        { name: "销售部", budget: 50000, actual: 48500, variance: -1500 },
                        { name: "技术部", budget: 35000, actual: 32000, variance: -3000 },
                        { name: "市场部", budget: 25000, actual: 27500, variance: 2500 },
                        { name: "管理层", budget: 15000, actual: 11500, variance: -3500 }
                      ].map((dept, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-20 text-sm">{dept.name}</div>
                          <div className="flex-1">
                            <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="absolute h-full bg-primary/30 rounded-full"
                                style={{ width: `${(dept.budget / 50000) * 100}%` }}
                              ></div>
                              <div 
                                className={`absolute h-full rounded-full ${dept.actual > dept.budget ? 'bg-red-500' : 'bg-primary'}`}
                                style={{ width: `${(dept.actual / 50000) * 100}%` }}
                              ></div>
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

                  {/* 费用类型对比 */}
                  <div>
                    <h4 className="font-medium mb-4">按费用类型对比</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: "住宿", budget: 45000, actual: 42000, icon: "🏨" },
                        { name: "交通", budget: 35000, actual: 38000, icon: "🚗" },
                        { name: "餐饮", budget: 25000, actual: 23500, icon: "🍽️" },
                        { name: "其他", budget: 20000, actual: 16000, icon: "📦" }
                      ].map((type, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{type.icon}</span>
                              <span className="font-medium">{type.name}</span>
                            </div>
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
    </Layout>
  );
}
