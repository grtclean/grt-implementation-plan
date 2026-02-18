import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Globe,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Target,
  Building2,
  MapPin,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";

// 区域配置数据
const REGIONS = [
  {
    code: 'Europe',
    name: '欧洲',
    nameEn: 'Europe',
    salesTarget: '6M EUR',
    salesTargetValue: 6000000,
    currentRevenue: 1200000,
    currency: 'EUR',
    staff: {
      sales: 4,
      supportAsia: 3,
      supportAsiaRemote: 0,
      serviceLocal: 0,
      serviceAsia: 5,
    },
    focus: ['自动化升级', '环保合规'],
    focusEn: ['Automation Upgrade', 'Environmental Compliance'],
    focusScenarios: [6, 7],
    color: 'bg-blue-500',
  },
  {
    code: 'USA',
    name: '美国',
    nameEn: 'United States',
    salesTarget: '8M USD',
    salesTargetValue: 8000000,
    currentRevenue: 2500000,
    currency: 'USD',
    staff: {
      sales: 4,
      supportAsia: 0,
      supportAsiaRemote: 15,
      serviceLocal: 2,
      serviceAsia: 0,
    },
    focus: ['新工厂建设', '设备更换'],
    focusEn: ['New Factory Setup', 'Equipment Replacement'],
    focusScenarios: [1, 3],
    color: 'bg-red-500',
  },
  {
    code: 'China',
    name: '中国',
    nameEn: 'China',
    salesTarget: '200M CNY',
    salesTargetValue: 200000000,
    currentRevenue: 85000000,
    currency: 'CNY',
    staff: {
      sales: 20,
      supportAsia: 30,
      supportAsiaRemote: 0,
      serviceLocal: 15,
      serviceAsia: 0,
    },
    focus: ['全场景覆盖'],
    focusEn: ['Full Scenario Coverage'],
    focusScenarios: [1, 2, 3, 4, 5, 6, 7],
    color: 'bg-yellow-500',
  },
  {
    code: 'Asia_Pacific',
    name: '亚太',
    nameEn: 'Asia Pacific',
    salesTarget: '3M USD',
    salesTargetValue: 3000000,
    currentRevenue: 800000,
    currency: 'USD',
    staff: {
      sales: 2,
      supportAsia: 5,
      supportAsiaRemote: 3,
      serviceLocal: 1,
      serviceAsia: 3,
    },
    focus: ['新工厂建设', '产能扩张'],
    focusEn: ['New Factory Setup', 'Capacity Expansion'],
    focusScenarios: [1, 2],
    color: 'bg-green-500',
  },
];

// 计算资源充足性
function checkResourceAdequacy(region: typeof REGIONS[0]) {
  const salesCount = region.staff.sales;
  const requiredSupport = salesCount * 1.5;
  const actualSupport = region.staff.supportAsia + region.staff.supportAsiaRemote;
  const gap = requiredSupport - actualSupport;
  
  if (actualSupport >= requiredSupport) {
    return { status: 'optimal', gap: 0, message: '资源充足', messageEn: 'Resources Adequate' };
  } else if (gap <= 2) {
    return { status: 'warning', gap, message: `支持团队略有不足`, messageEn: `Support team slightly understaffed` };
  } else {
    return { status: 'critical', gap, message: `支持团队严重不足`, messageEn: `Support team critically understaffed` };
  }
}

// 预警数据
const ALERTS = [
  {
    type: 'hiring',
    severity: 'warning',
    region: 'Europe',
    message: '欧洲支持团队略有不足，差距1.5人',
    messageEn: 'Europe support team slightly understaffed. Gap: 1.5',
  },
  {
    type: 'revenue',
    severity: 'info',
    region: 'USA',
    message: '美国Q1收入达标，进度31.3%',
    messageEn: 'USA Q1 revenue on track, progress 31.3%',
  },
  {
    type: 'resource',
    severity: 'critical',
    region: 'Asia_Pacific',
    message: '亚太区域服务人员不足，需紧急招聘',
    messageEn: 'Asia Pacific service staff insufficient, urgent hiring needed',
  },
];

export default function GlobalGrowthTracker() {
  const { language } = useLanguage();
  const isZh = language === 'zh';

  // 计算全球总目标
  const exchangeRates = { CNY: 1, USD: 7.2, EUR: 7.8 };
  const totalTargetCNY = REGIONS.reduce((sum, r) => {
    const rate = exchangeRates[r.currency as keyof typeof exchangeRates] || 1;
    return sum + r.salesTargetValue * rate;
  }, 0);
  
  const totalCurrentCNY = REGIONS.reduce((sum, r) => {
    const rate = exchangeRates[r.currency as keyof typeof exchangeRates] || 1;
    return sum + r.currentRevenue * rate;
  }, 0);

  const globalProgress = (totalCurrentCNY / totalTargetCNY) * 100;

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Globe}
          title={isZh ? '全球增长追踪器' : 'Global Growth Tracker'}
          description={isZh
            ? '2028战略目标：3亿元收入 - 区域资源配置与收入追踪'
            : '2028 Strategy: 300M CNY Revenue - Regional Resource Allocation & Revenue Tracking'}
          actions={
            <Badge variant="outline" className="text-lg px-4 py-2">
              2028 Strategy
            </Badge>
          }
        />

        {/* 全球概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/20 text-primary">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isZh ? '全球目标' : 'Global Target'}</p>
                    <p className="text-2xl font-bold">300M CNY</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{isZh ? '当前进度' : 'Current Progress'}</p>
                  <p className="text-2xl font-bold text-primary">{globalProgress.toFixed(1)}%</p>
                </div>
              </div>
              <Progress value={globalProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {isZh ? `当前收入: ${(totalCurrentCNY / 1000000).toFixed(1)}M CNY` : `Current Revenue: ${(totalCurrentCNY / 1000000).toFixed(1)}M CNY`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '活跃区域' : 'Active Regions'}</p>
                <p className="text-2xl font-bold">{REGIONS.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isZh ? '活跃预警' : 'Active Alerts'}</p>
                <p className="text-2xl font-bold">{ALERTS.filter(a => a.severity !== 'info').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="regions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="regions">
              <MapPin className="w-4 h-4 mr-2" />
              {isZh ? '区域概览' : 'Regional Overview'}
            </TabsTrigger>
            <TabsTrigger value="resources">
              <Users className="w-4 h-4 mr-2" />
              {isZh ? '资源配置' : 'Resource Allocation'}
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {isZh ? '预警中心' : 'Alert Center'}
            </TabsTrigger>
            <TabsTrigger value="forecast">
              <BarChart3 className="w-4 h-4 mr-2" />
              {isZh ? '收入预测' : 'Revenue Forecast'}
            </TabsTrigger>
          </TabsList>

          {/* 区域概览 */}
          <TabsContent value="regions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REGIONS.map((region) => {
                const progress = (region.currentRevenue / region.salesTargetValue) * 100;
                const resourceStatus = checkResourceAdequacy(region);
                
                return (
                  <Card key={region.code} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${region.color}`} />
                          <CardTitle>{isZh ? region.name : region.nameEn}</CardTitle>
                        </div>
                        <Badge 
                          variant={resourceStatus.status === 'optimal' ? 'default' : 
                                  resourceStatus.status === 'warning' ? 'secondary' : 'destructive'}
                        >
                          {resourceStatus.status === 'optimal' ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {isZh ? resourceStatus.message : resourceStatus.messageEn}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 收入进度 */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{isZh ? '收入目标' : 'Revenue Target'}</span>
                            <span className="font-medium">{region.salesTarget}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{(region.currentRevenue / 1000000).toFixed(1)}M</span>
                            <span>{progress.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* 人员配置 */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-lg font-bold">{region.staff.sales}</p>
                            <p className="text-xs text-muted-foreground">{isZh ? '销售' : 'Sales'}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-lg font-bold">{region.staff.supportAsia + region.staff.supportAsiaRemote}</p>
                            <p className="text-xs text-muted-foreground">{isZh ? '支持' : 'Support'}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-lg font-bold">{region.staff.serviceLocal + region.staff.serviceAsia}</p>
                            <p className="text-xs text-muted-foreground">{isZh ? '服务' : 'Service'}</p>
                          </div>
                        </div>

                        {/* 重点领域 */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{isZh ? '重点领域' : 'Focus Areas'}</p>
                          <div className="flex flex-wrap gap-1">
                            {(isZh ? region.focus : region.focusEn).map((area, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 资源配置 */}
          <TabsContent value="resources" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{isZh ? '全球人员配置' : 'Global Staff Allocation'}</CardTitle>
                <CardDescription>
                  {isZh ? '资源充足性计算规则：1名销售需要1.5名支持人员' : 'Resource adequacy rule: 1 Sales needs 1.5 Support staff'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? '区域' : 'Region'}</TableHead>
                      <TableHead className="text-center">{isZh ? '销售' : 'Sales'}</TableHead>
                      <TableHead className="text-center">{isZh ? '亚洲支持' : 'Asia Support'}</TableHead>
                      <TableHead className="text-center">{isZh ? '远程支持' : 'Remote Support'}</TableHead>
                      <TableHead className="text-center">{isZh ? '本地服务' : 'Local Service'}</TableHead>
                      <TableHead className="text-center">{isZh ? '亚洲服务' : 'Asia Service'}</TableHead>
                      <TableHead className="text-center">{isZh ? '所需支持' : 'Required Support'}</TableHead>
                      <TableHead className="text-center">{isZh ? '状态' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REGIONS.map((region) => {
                      const resourceStatus = checkResourceAdequacy(region);
                      const requiredSupport = region.staff.sales * 1.5;
                      const actualSupport = region.staff.supportAsia + region.staff.supportAsiaRemote;
                      
                      return (
                        <TableRow key={region.code}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${region.color}`} />
                              {isZh ? region.name : region.nameEn}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{region.staff.sales}</TableCell>
                          <TableCell className="text-center">{region.staff.supportAsia}</TableCell>
                          <TableCell className="text-center">{region.staff.supportAsiaRemote}</TableCell>
                          <TableCell className="text-center">{region.staff.serviceLocal}</TableCell>
                          <TableCell className="text-center">{region.staff.serviceAsia}</TableCell>
                          <TableCell className="text-center">
                            <span className={actualSupport >= requiredSupport ? 'text-green-500' : 'text-red-500'}>
                              {requiredSupport} ({actualSupport})
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={resourceStatus.status === 'optimal' ? 'default' : 
                                      resourceStatus.status === 'warning' ? 'secondary' : 'destructive'}
                            >
                              {resourceStatus.status === 'optimal' ? '✓' : 
                               resourceStatus.status === 'warning' ? '!' : '✗'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 预警中心 */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-3">
              {ALERTS.map((alert, idx) => (
                <Card 
                  key={idx} 
                  className={`border-l-4 ${
                    alert.severity === 'critical' ? 'border-l-red-500 bg-red-500/5' :
                    alert.severity === 'warning' ? 'border-l-yellow-500 bg-yellow-500/5' :
                    'border-l-blue-500 bg-blue-500/5'
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                        alert.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {alert.severity === 'info' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{alert.region}</Badge>
                          <Badge variant="secondary">{alert.type}</Badge>
                        </div>
                        <p className="mt-1">{isZh ? alert.message : alert.messageEn}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      {isZh ? '处理' : 'Handle'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 收入预测 */}
          <TabsContent value="forecast" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{isZh ? '季度收入预测' : 'Quarterly Revenue Forecast'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? '区域' : 'Region'}</TableHead>
                      <TableHead className="text-right">Q1</TableHead>
                      <TableHead className="text-right">Q2</TableHead>
                      <TableHead className="text-right">Q3</TableHead>
                      <TableHead className="text-right">Q4</TableHead>
                      <TableHead className="text-right">{isZh ? '年度目标' : 'Annual Target'}</TableHead>
                      <TableHead className="text-center">{isZh ? '趋势' : 'Trend'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {REGIONS.map((region) => {
                      const progress = (region.currentRevenue / region.salesTargetValue) * 100;
                      const quarterlyTarget = region.salesTargetValue / 4;
                      
                      return (
                        <TableRow key={region.code}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${region.color}`} />
                              {isZh ? region.name : region.nameEn}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(quarterlyTarget / 1000000).toFixed(1)}M
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {((quarterlyTarget * 2) / 1000000).toFixed(1)}M
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {((quarterlyTarget * 3) / 1000000).toFixed(1)}M
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(region.salesTargetValue / 1000000).toFixed(1)}M
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {region.salesTarget}
                          </TableCell>
                          <TableCell className="text-center">
                            {progress > 25 ? (
                              <ArrowUpRight className="w-5 h-5 text-green-500 mx-auto" />
                            ) : progress > 15 ? (
                              <Minus className="w-5 h-5 text-yellow-500 mx-auto" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
