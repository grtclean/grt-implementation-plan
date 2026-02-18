import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Trophy,
  Medal,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Cpu,
  Layers,
  Truck,
  Heart,
  BookOpen,
  Users,
  Target,
  Award,
  Flame,
  Zap
} from "lucide-react";

// 能力域图标映射
const DOMAIN_ICONS: Record<string, React.ComponentType<any>> = {
  T: Cpu,
  S: Layers,
  D: Truck,
  C: Heart,
  K: BookOpen,
  L: Crown,
};

// 能力域名称映射
const DOMAIN_NAMES: Record<string, string> = {
  T: "技术能力",
  S: "系统理解",
  D: "交付能力",
  C: "客户价值",
  K: "知识沉淀",
  L: "领导力",
};

// 能力域颜色映射
const DOMAIN_COLORS: Record<string, string> = {
  T: "#3B82F6",
  S: "#8B5CF6",
  D: "#F59E0B",
  C: "#EF4444",
  K: "#10B981",
  L: "#EC4899",
};

// 排名图标
const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Medal className="w-6 h-6 text-orange-500" />;
    default:
      return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  }
};

// 排名变化图标
const getRankChangeIcon = (change: number) => {
  if (change > 0) {
    return (
      <span className="flex items-center text-green-500 text-xs">
        <TrendingUp className="w-3 h-3 mr-0.5" />
        +{change}
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center text-red-500 text-xs">
        <TrendingDown className="w-3 h-3 mr-0.5" />
        {change}
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground text-xs">
      <Minus className="w-3 h-3" />
    </span>
  );
};

export default function CapabilityLeaderboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overall");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");

  // 获取综合排行榜
  const { data: overallLeaderboard, isLoading: loadingOverall } = 
    (trpc.capabilityOs.getOverallLeaderboard as any).useQuery({
      limit: 50,
      timeRange: timeRange as any,
    });

  // 获取能力域排行榜
  const { data: domainLeaderboard, isLoading: loadingDomain } = 
    trpc.capabilityOs.getDomainLeaderboard.useQuery({ 
      domainCode: selectedDomain !== "all" ? selectedDomain : undefined,
      limit: 50,
    });

  // 获取进步排行榜
  const { data: progressLeaderboard, isLoading: loadingProgress } = 
    (trpc.capabilityOs.getProgressLeaderboard as any).useQuery({
      limit: 50,
      timeRange: timeRange as any,
    });

  // 获取徽章排行榜
  const { data: badgeLeaderboard, isLoading: loadingBadge } = 
    (trpc.capabilityOs.getBadgeLeaderboard as any).useQuery({ limit: 50 });

  // 获取统计数据
  const { data: leaderboardStats, isLoading: loadingStats } = 
    trpc.capabilityOs.getLeaderboardStats.useQuery();

  // 渲染排行榜项目
  const renderLeaderboardItem = (item: any, index: number, type: string) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;

    return (
      <div 
        key={item.user_id || item.id}
        className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:bg-muted/50 ${
          isTopThree ? "bg-gradient-to-r from-muted/80 to-transparent" : ""
        }`}
      >
        {/* 排名 */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          rank === 1 ? "bg-yellow-500/20" :
          rank === 2 ? "bg-gray-400/20" :
          rank === 3 ? "bg-orange-500/20" :
          "bg-muted"
        }`}>
          {getRankIcon(rank)}
        </div>

        {/* 用户信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{item.user_name || item.user_id}</p>
            {item.rank_change !== undefined && getRankChangeIcon(item.rank_change)}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            {type === "overall" && (
              <>
                <span>L{item.avg_level?.toFixed(1) || 0}</span>
                <span>•</span>
                <span>{item.total_points || 0}分</span>
                <span>•</span>
                <span>{item.domain_count || 0}个能力域</span>
              </>
            )}
            {type === "domain" && (
              <>
                <span>L{item.level || 0}</span>
                <span>•</span>
                <span>{item.points || 0}分</span>
                {item.domain_code && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {DOMAIN_NAMES[item.domain_code] || item.domain_code}
                    </Badge>
                  </>
                )}
              </>
            )}
            {type === "progress" && (
              <>
                <span className="text-green-500">+{item.points_gained || 0}分</span>
                <span>•</span>
                <span>{item.evidence_count || 0}个证据</span>
                {item.level_ups > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-primary">升{item.level_ups}级</span>
                  </>
                )}
              </>
            )}
            {type === "badge" && (
              <>
                <span>{item.badge_count || 0}个徽章</span>
                <span>•</span>
                <span>最高L{item.highest_level || 0}</span>
              </>
            )}
          </div>
        </div>

        {/* 得分/指标 */}
        <div className="text-right">
          <p className={`text-2xl font-bold ${
            rank === 1 ? "text-yellow-500" :
            rank === 2 ? "text-gray-400" :
            rank === 3 ? "text-orange-500" :
            ""
          }`}>
            {type === "overall" && (item.total_score || 0)}
            {type === "domain" && (item.points || 0)}
            {type === "progress" && `+${item.points_gained || 0}`}
            {type === "badge" && (item.badge_score || 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {type === "overall" && "综合得分"}
            {type === "domain" && "能力积分"}
            {type === "progress" && "积分增长"}
            {type === "badge" && "徽章得分"}
          </p>
        </div>
      </div>
    );
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Trophy}
          title="能力排行榜"
          description="查看团队成员在TSDCKL六大能力域的排名和进步情况"
          actions={
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
                <SelectItem value="quarter">本季度</SelectItem>
                <SelectItem value="year">本年度</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {leaderboardStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="参与人数" value={(leaderboardStats as any).totalParticipants || 0} />
            <StatCard icon={TrendingUp} label="平均积分增长" value={(leaderboardStats as any).avgPointsGrowth || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
            <StatCard icon={Flame} label="本月之星" value={(leaderboardStats as any).topPerformer || "-"} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
            <StatCard icon={Zap} label="本月升级人次" value={(leaderboardStats as any).levelUpsThisMonth || 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
          </div>
        )}

        {/* 排行榜标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overall" className="gap-1">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">综合排行</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="gap-1">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">能力域排行</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-1">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">进步排行</span>
            </TabsTrigger>
            <TabsTrigger value="badge" className="gap-1">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">徽章排行</span>
            </TabsTrigger>
          </TabsList>

          {/* 综合排行榜 */}
          <TabsContent value="overall">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  综合能力排行榜
                </CardTitle>
                <CardDescription>
                  根据所有能力域的综合得分进行排名
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOverall ? (
                  <div className="text-center py-12 text-muted-foreground">加载中...</div>
                ) : !overallLeaderboard || overallLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无排行数据
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overallLeaderboard.map((item: any, index: number) => 
                      renderLeaderboardItem(item, index, "overall")
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 能力域排行榜 */}
          <TabsContent value="domain" className="space-y-4">
            {/* 能力域筛选 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDomain === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDomain("all")}
              >
                全部
              </Button>
              {Object.entries(DOMAIN_NAMES).map(([code, name]) => {
                const IconComponent = DOMAIN_ICONS[code] || Star;
                return (
                  <Button
                    key={code}
                    variant={selectedDomain === code ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDomain(code)}
                    className="gap-1"
                  >
                    <IconComponent className="w-4 h-4" />
                    {name}
                  </Button>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {selectedDomain === "all" ? "全部能力域排行榜" : `${DOMAIN_NAMES[selectedDomain]}排行榜`}
                </CardTitle>
                <CardDescription>
                  {selectedDomain === "all" 
                    ? "查看各能力域的排名情况" 
                    : `查看${DOMAIN_NAMES[selectedDomain]}领域的排名情况`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDomain ? (
                  <div className="text-center py-12 text-muted-foreground">加载中...</div>
                ) : !domainLeaderboard || domainLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无排行数据
                  </div>
                ) : (
                  <div className="space-y-2">
                    {domainLeaderboard.map((item: any, index: number) => 
                      renderLeaderboardItem(item, index, "domain")
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 进步排行榜 */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  进步排行榜
                </CardTitle>
                <CardDescription>
                  根据积分增长速度进行排名，展示进步最快的成员
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProgress ? (
                  <div className="text-center py-12 text-muted-foreground">加载中...</div>
                ) : !progressLeaderboard || progressLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无排行数据
                  </div>
                ) : (
                  <div className="space-y-2">
                    {progressLeaderboard.map((item: any, index: number) => 
                      renderLeaderboardItem(item, index, "progress")
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 徽章排行榜 */}
          <TabsContent value="badge">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  徽章排行榜
                </CardTitle>
                <CardDescription>
                  根据徽章数量和稀有度计算综合得分排名
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBadge ? (
                  <div className="text-center py-12 text-muted-foreground">加载中...</div>
                ) : !badgeLeaderboard || badgeLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无排行数据
                  </div>
                ) : (
                  <div className="space-y-2">
                    {badgeLeaderboard.map((item: any, index: number) => 
                      renderLeaderboardItem(item, index, "badge")
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 能力域分布统计 */}
        <Card>
          <CardHeader>
            <CardTitle>能力域分布</CardTitle>
            <CardDescription>
              团队成员在各能力域的分布情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(DOMAIN_NAMES).map(([code, name]) => {
                const IconComponent = DOMAIN_ICONS[code] || Star;
                const color = DOMAIN_COLORS[code];
                const count = (leaderboardStats as any)?.domainDistribution?.[code] || 0;
                const total = (leaderboardStats as any)?.totalParticipants || 1;
                const percentage = (count / total) * 100;

                return (
                  <div key={code} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" style={{ color }} />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {count}人 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                      style={{ 
                        ["--progress-background" as any]: color,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
