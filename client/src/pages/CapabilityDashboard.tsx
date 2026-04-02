import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Users,
  TrendingUp,
  Award,
  Target,
  Zap,
  Brain,
  Truck,
  Heart,
  BookOpen,
  Crown,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useEffect, useRef, useMemo } from "react";
import CapabilityRadarChart from "@/components/CapabilityRadarChart";

// TSDCKL能力域配置
const capabilityDomains = [
  { 
    code: "T", 
    name: "技术能力", 
    nameEn: "Technical",
    icon: Zap, 
    color: "bg-blue-500",
    description: "解决具体技术问题的能力"
  },
  { 
    code: "S", 
    name: "系统理解", 
    nameEn: "System",
    icon: Brain, 
    color: "bg-purple-500",
    description: "理解设备、工艺、业务关系的能力"
  },
  { 
    code: "D", 
    name: "交付能力", 
    nameEn: "Delivery",
    icon: Truck, 
    color: "bg-green-500",
    description: "按时按质按预算完成交付的能力"
  },
  { 
    code: "C", 
    name: "客户价值", 
    nameEn: "Customer",
    icon: Heart, 
    color: "bg-red-500",
    description: "为客户创造价值的能力"
  },
  { 
    code: "K", 
    name: "知识沉淀", 
    nameEn: "Knowledge",
    icon: BookOpen, 
    color: "bg-amber-500",
    description: "将经验转化为组织知识的能力"
  },
  { 
    code: "L", 
    name: "领导影响", 
    nameEn: "Leadership",
    icon: Crown, 
    color: "bg-indigo-500",
    description: "带领团队、影响他人的能力"
  }
];

// 能力等级配置
const capabilityLevels = [
  { level: "L1", name: "初级", color: "bg-gray-400", minScore: 0 },
  { level: "L2", name: "熟练", color: "bg-blue-400", minScore: 100 },
  { level: "L3", name: "专业", color: "bg-green-400", minScore: 300 },
  { level: "L4", name: "专家", color: "bg-purple-400", minScore: 600 },
  { level: "L5", name: "大师", color: "bg-amber-400", minScore: 1000 }
];

// 模拟组织能力分布数据
const organizationCapabilityData = {
  totalEngineers: 45,
  domainDistribution: [
    { domain: "T", L1: 5, L2: 12, L3: 15, L4: 10, L5: 3 },
    { domain: "S", L1: 8, L2: 15, L3: 12, L4: 8, L5: 2 },
    { domain: "D", L1: 6, L2: 10, L3: 18, L4: 9, L5: 2 },
    { domain: "C", L1: 10, L2: 18, L3: 10, L4: 5, L5: 2 },
    { domain: "K", L1: 12, L2: 15, L3: 12, L4: 5, L5: 1 },
    { domain: "L", L1: 20, L2: 12, L3: 8, L4: 4, L5: 1 }
  ],
  recentUpgrades: [
    { engineer: "李大鹏", domain: "T", from: "L2", to: "L3", date: "2026-01-25" },
    { engineer: "洪小东", domain: "D", from: "L3", to: "L4", date: "2026-01-24" },
    { engineer: "焦斌", domain: "C", from: "L1", to: "L2", date: "2026-01-23" },
    { engineer: "钱佳奇", domain: "S", from: "L2", to: "L3", date: "2026-01-22" },
    { engineer: "梅奥杰", domain: "K", from: "L1", to: "L2", date: "2026-01-21" }
  ],
  topPerformers: [
    { engineer: "蔡瑞", avgLevel: 4.2, strongestDomain: "T", level: "L5" },
    { engineer: "洪小东", avgLevel: 4.0, strongestDomain: "D", level: "L5" },
    { engineer: "高嘉义", avgLevel: 3.8, strongestDomain: "S", level: "L4" },
    { engineer: "陈加丽", avgLevel: 3.7, strongestDomain: "C", level: "L4" },
    { engineer: "钱佳奇", avgLevel: 3.5, strongestDomain: "T", level: "L4" }
  ]
};

// 计算各等级人数百分比
const calculateLevelPercentage = (domainData: typeof organizationCapabilityData.domainDistribution[0]) => {
  const total = domainData.L1 + domainData.L2 + domainData.L3 + domainData.L4 + domainData.L5;
  return {
    L1: Math.round((domainData.L1 / total) * 100),
    L2: Math.round((domainData.L2 / total) * 100),
    L3: Math.round((domainData.L3 / total) * 100),
    L4: Math.round((domainData.L4 / total) * 100),
    L5: Math.round((domainData.L5 / total) * 100)
  };
};

export default function CapabilityDashboard() {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // tRPC queries for real data
  const { data: domains, isLoading: domainsLoading, refetch: refetchDomains } = trpc.capabilityOs.getDomains.useQuery();
  const { data: myCapabilities, isLoading: capLoading } = trpc.capabilityOs.getMyCapabilities.useQuery();
  const { data: myEvidences, isLoading: evidencesLoading } = trpc.capabilityOs.getMyEvidences.useQuery();

  // Draw radar chart when data is available
  useEffect(() => {
    if (!canvasRef.current || !domains || domains.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;
    const numDomains = domains.length;
    const angleStep = (2 * Math.PI) / numDomains;

    ctx.clearRect(0, 0, width, height);

    // Draw background circles
    for (let level = 1; level <= 5; level++) {
      const levelRadius = (radius * level) / 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, levelRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '10px sans-serif';
      ctx.fillText(`L${level}`, centerX + 5, centerY - levelRadius + 12);
    }

    // Draw axis lines and labels
    const domainColors: Record<string, string> = {
      'T': '#3b82f6', 'S': '#8b5cf6', 'D': '#22c55e',
      'C': '#f97316', 'K': '#06b6d4', 'L': '#ef4444'
    };
    domains.forEach((domain: any, i: number) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();
      const labelX = centerX + (radius + 30) * Math.cos(angle);
      const labelY = centerY + (radius + 30) * Math.sin(angle);
      ctx.fillStyle = domainColors[domain.code] || '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(domain.code, labelX, labelY);
    });

    // Draw capability polygon if we have user capabilities
    if (myCapabilities && myCapabilities.length > 0) {
      const thresholds = [0, 100, 300, 600, 1000];
      const points: { x: number; y: number }[] = [];
      domains.forEach((domain: any, i: number) => {
        const cap = myCapabilities.find((c: any) => c.domainId === domain.id);
        const level = cap?.currentLevel || 1;
        const score = cap?.totalPoints || 0;
        const currentThreshold = thresholds[level - 1];
        const nextThreshold = thresholds[level] || 1500;
        const levelProgress = (score - currentThreshold) / (nextThreshold - currentThreshold);
        const effectiveLevel = level - 1 + Math.min(levelProgress, 1);
        const angle = -Math.PI / 2 + i * angleStep;
        const pointRadius = (radius * effectiveLevel) / 5;
        points.push({ x: centerX + pointRadius * Math.cos(angle), y: centerY + pointRadius * Math.sin(angle) });
      });
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x, p.y); });
      ctx.closePath();
      ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = domainColors[(domains[i] as any).code] || '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }, [domains, myCapabilities]);

  const isLoading = domainsLoading || capLoading;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  // Calculate stats from real data
  const totalPoints = myCapabilities?.reduce((sum: number, c: any) => sum + (c.totalPoints || 0), 0) || 0;
  const avgLevel = myCapabilities?.length 
    ? (myCapabilities.reduce((sum: number, c: any) => sum + (c.currentLevel || 1), 0) / myCapabilities.length).toFixed(1)
    : '1.0';
  const approvedEvidences = myEvidences?.filter((e: any) => e.status === 'approved').length || 0;
  const pendingEvidences = myEvidences?.filter((e: any) => e.status === 'pending').length || 0;

  return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          icon={BarChart3}
          title={language === "zh" ? "能力仪表盘" : "Capability Dashboard"}
          description={language === "zh" ? "TSDCKL六大能力域 · L1-L5等级分布" : "TSDCKL Domains · L1-L5 Distribution"}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <StatCard icon={Users} label={language === "zh" ? "工程师" : "Engineers"} value={organizationCapabilityData.totalEngineers} />
          <StatCard icon={TrendingUp} label={language === "zh" ? "本月升级" : "Upgrades"} value={organizationCapabilityData.recentUpgrades.length} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Award} label={language === "zh" ? "L4+专家" : "Experts"} value={Math.round(organizationCapabilityData.domainDistribution.reduce((sum, d) => sum + d.L4 + d.L5, 0) / 6)} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
          <StatCard icon={Target} label={language === "zh" ? "平均等级" : "Avg Level"} value="L2.8" iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>

        {/* 主要内容区域 */}
        <Tabs defaultValue="domain" className="space-y-3 sm:space-y-4">
          <TabsList className="bg-muted/50 w-full sm:w-auto flex-wrap h-auto p-1">
            <TabsTrigger value="domain" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
              <PieChart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{language === "zh" ? "能力域" : "Domain"}</span>
              <span className="xs:hidden">{language === "zh" ? "域" : "D"}</span>
            </TabsTrigger>
            <TabsTrigger value="level" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{language === "zh" ? "等级" : "Level"}</span>
              <span className="xs:hidden">{language === "zh" ? "级" : "L"}</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{language === "zh" ? "动态" : "Trends"}</span>
              <span className="xs:hidden">{language === "zh" ? "动" : "T"}</span>
            </TabsTrigger>
          </TabsList>

          {/* 能力域分布 */}
          <TabsContent value="domain" className="space-y-4">
            {/* 能力雷达图 */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {language === "zh" ? "我的能力雷达图" : "My Capability Radar"}
                </CardTitle>
                <CardDescription>
                  {language === "zh" 
                    ? "TSDCKL六大能力域可视化展示，基于证据积分自动计算" 
                    : "TSDCKL six capability domains visualization, auto-calculated from evidence scores"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {/* 移动端使用紧凑模式 */}
                <div className="block sm:hidden">
                  <CapabilityRadarChart 
                    data={domains?.map((domain: any) => {
                      const cap = myCapabilities?.find((c: any) => c.domainId === domain.id);
                      return {
                        domainCode: domain.code,
                        level: cap?.currentLevel || 1,
                        points: cap?.totalPoints || 0,
                      };
                    }) || []}
                    height={280}
                    compact={true}
                    showLegend={false}
                  />
                </div>
                {/* 桌面端使用完整模式 */}
                <div className="hidden sm:block">
                  <CapabilityRadarChart 
                    data={domains?.map((domain: any) => {
                      const cap = myCapabilities?.find((c: any) => c.domainId === domain.id);
                      return {
                        domainCode: domain.code,
                        level: cap?.currentLevel || 1,
                        points: cap?.totalPoints || 0,
                      };
                    }) || []}
                    height={400}
                    compact={false}
                    showLegend={true}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capabilityDomains.map((domain) => {
                const domainData = organizationCapabilityData.domainDistribution.find(d => d.domain === domain.code);
                const percentages = domainData ? calculateLevelPercentage(domainData) : { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };
                const Icon = domain.icon;
                
                return (
                  <Card key={domain.code} className="bg-card/50 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${domain.color} text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {domain.code} - {language === "zh" ? domain.name : domain.nameEn}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {domain.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* 等级分布条 */}
                      <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                        <div className="bg-gray-400" style={{ width: `${percentages.L1}%` }} title={`L1: ${percentages.L1}%`} />
                        <div className="bg-blue-400" style={{ width: `${percentages.L2}%` }} title={`L2: ${percentages.L2}%`} />
                        <div className="bg-green-400" style={{ width: `${percentages.L3}%` }} title={`L3: ${percentages.L3}%`} />
                        <div className="bg-purple-400" style={{ width: `${percentages.L4}%` }} title={`L4: ${percentages.L4}%`} />
                        <div className="bg-amber-400" style={{ width: `${percentages.L5}%` }} title={`L5: ${percentages.L5}%`} />
                      </div>
                      
                      {/* 等级人数 */}
                      <div className="grid grid-cols-5 gap-1 text-center text-xs">
                        {domainData && (
                          <>
                            <div>
                              <div className="font-bold">{domainData.L1}</div>
                              <div className="text-muted-foreground">L1</div>
                            </div>
                            <div>
                              <div className="font-bold">{domainData.L2}</div>
                              <div className="text-muted-foreground">L2</div>
                            </div>
                            <div>
                              <div className="font-bold">{domainData.L3}</div>
                              <div className="text-muted-foreground">L3</div>
                            </div>
                            <div>
                              <div className="font-bold">{domainData.L4}</div>
                              <div className="text-muted-foreground">L4</div>
                            </div>
                            <div>
                              <div className="font-bold">{domainData.L5}</div>
                              <div className="text-muted-foreground">L5</div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 图例 */}
            <Card className="bg-card/30">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {capabilityLevels.map((level) => (
                    <div key={level.level} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${level.color}`} />
                      <span className="text-sm">
                        {level.level} - {language === "zh" ? level.name : level.level}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 等级分布 */}
          <TabsContent value="level" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {capabilityLevels.map((level) => {
                const totalInLevel = organizationCapabilityData.domainDistribution.reduce(
                  (sum, d) => sum + (d as any)[level.level], 0
                );
                const avgPerDomain = Math.round(totalInLevel / 6);
                
                return (
                  <Card key={level.level} className="bg-card/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={`${level.color} text-white`}>
                          {level.level}
                        </Badge>
                        <span className="text-2xl font-bold">{avgPerDomain}</span>
                      </div>
                      <CardTitle className="text-lg">
                        {language === "zh" ? level.name : level.level}
                      </CardTitle>
                      <CardDescription>
                        {language === "zh" ? `平均每域${avgPerDomain}人` : `Avg ${avgPerDomain} per domain`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {capabilityDomains.map((domain) => {
                          const domainData = organizationCapabilityData.domainDistribution.find(d => d.domain === domain.code);
                          const count = domainData ? (domainData as any)[level.level] : 0;
                          const percentage = Math.round((count / organizationCapabilityData.totalEngineers) * 100);
                          
                          return (
                            <div key={domain.code} className="flex items-center gap-2">
                              <span className="w-6 text-xs font-mono">{domain.code}</span>
                              <Progress value={percentage * 2} className="h-2 flex-1" />
                              <span className="w-6 text-xs text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 升级动态 */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 最近升级记录 */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    {language === "zh" ? "最近能力升级" : "Recent Upgrades"}
                  </CardTitle>
                  <CardDescription>
                    {language === "zh" ? "系统自动触发的能力等级升级" : "System-triggered capability upgrades"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {organizationCapabilityData.recentUpgrades.map((upgrade, index) => {
                      const domain = capabilityDomains.find(d => d.code === upgrade.domain);
                      const Icon = domain?.icon || Zap;
                      
                      return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                          <div className={`p-2 rounded-lg ${domain?.color || 'bg-gray-500'} text-white`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{upgrade.engineer}</div>
                            <div className="text-sm text-muted-foreground">
                              {language === "zh" ? domain?.name : domain?.nameEn}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{upgrade.from}</Badge>
                              <span className="text-green-500">→</span>
                              <Badge className="bg-green-500 text-white">{upgrade.to}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{upgrade.date}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 能力标杆 */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    {language === "zh" ? "能力标杆" : "Top Performers"}
                  </CardTitle>
                  <CardDescription>
                    {language === "zh" ? "综合能力最强的工程师" : "Engineers with highest overall capability"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {organizationCapabilityData.topPerformers.map((performer, index) => {
                      const domain = capabilityDomains.find(d => d.code === performer.strongestDomain);
                      const Icon = domain?.icon || Zap;
                      
                      return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{performer.engineer}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Icon className="w-3 h-3" />
                              {language === "zh" ? `最强: ${domain?.name}` : `Strongest: ${domain?.nameEn}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={`${domain?.color} text-white`}>
                              {performer.level}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {language === "zh" ? `平均 ${performer.avgLevel}` : `Avg ${performer.avgLevel}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 核心理念提示 */}
            <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/20 text-primary">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">
                      {language === "zh" ? "能力升级核心原则" : "Core Upgrade Principles"}
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        {language === "zh" 
                          ? "能力来源于证据，而非培训或评价" 
                          : "Capability comes from evidence, not training or evaluation"}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {language === "zh" 
                          ? "能力升级必须由系统证据自动触发" 
                          : "Upgrades must be automatically triggered by system evidence"}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        {language === "zh" 
                          ? "不允许人工主观升级" 
                          : "Manual subjective upgrades are not allowed"}
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
