import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Award,
  Star,
  Crown,
  Cpu,
  Layers,
  Truck,
  Heart,
  BookOpen,
  Sparkles,
  Trophy,
  Eye,
  EyeOff,
  GripVertical
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// 徽章稀有度配置
const RARITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; glow: boolean }> = {
  common: { label: "普通", color: "text-gray-400", bgColor: "bg-gray-500/10", glow: false },
  uncommon: { label: "优秀", color: "text-green-500", bgColor: "bg-green-500/10", glow: false },
  rare: { label: "稀有", color: "text-blue-500", bgColor: "bg-blue-500/10", glow: true },
  epic: { label: "史诗", color: "text-purple-500", bgColor: "bg-purple-500/10", glow: true },
  legendary: { label: "传说", color: "text-yellow-500", bgColor: "bg-yellow-500/10", glow: true },
};

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

export default function CapabilityBadges() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("my-badges");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // 获取用户徽章
  const { data: userBadges, isLoading: loadingUserBadges, refetch: refetchUserBadges } =
    trpc.capabilityOs.getUserBadges.useQuery(undefined as any);

  // 获取所有徽章
  const { data: allBadges, isLoading: loadingAllBadges } = 
    trpc.capabilityOs.getAllBadges.useQuery();

  // 获取徽章统计
  const { data: badgeStats, isLoading: loadingStats } = 
    trpc.capabilityOs.getBadgeStatistics.useQuery();

  // 获取徽章排行榜
  const { data: leaderboard, isLoading: loadingLeaderboard } = 
    (trpc.capabilityOs.getBadgeLeaderboard as any).useQuery({ limit: 20 });

  // 更新徽章展示状态
  const updateDisplayMutation = trpc.capabilityOs.updateBadgeDisplay.useMutation({
    onSuccess: () => {
      toast.success("徽章展示状态已更新");
      refetchUserBadges();
    },
    onError: () => {
      toast.error("更新失败，请重试");
    },
  });

  // 渲染徽章图标
  const renderBadgeIcon = (badge: any, size: "sm" | "md" | "lg" = "md") => {
    const IconComponent = DOMAIN_ICONS[badge.domain_code] || Star;
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-12 h-12",
      lg: "w-16 h-16",
    };
    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    };
    const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;

    return (
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${rarity.bgColor} ${rarity.glow ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
        style={{ 
          borderColor: badge.color,
          boxShadow: rarity.glow ? `0 0 20px ${badge.color}40` : "none",
        }}
      >
        <IconComponent 
          className={`${iconSizes[size]}`} 
          style={{ color: badge.color }}
        />
      </div>
    );
  };

  // 渲染徽章卡片
  const renderBadgeCard = (badge: any, isOwned: boolean = false, showActions: boolean = false) => {
    const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;

    return (
      <Card 
        key={badge.id || badge.code} 
        className={`relative overflow-hidden transition-all hover:scale-105 ${
          isOwned ? "" : "opacity-50 grayscale"
        } ${rarity.glow ? "ring-1" : ""}`}
        style={{ 
          borderColor: isOwned ? badge.color : undefined,
          boxShadow: isOwned && rarity.glow ? `0 0 15px ${badge.color}30` : undefined,
        }}
      >
        {/* 稀有度标签 */}
        <div className={`absolute top-2 right-2`}>
          <Badge variant="outline" className={`${rarity.color} text-xs`}>
            {rarity.label}
          </Badge>
        </div>

        <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
          {renderBadgeIcon(badge, "lg")}
          <h3 className="mt-3 font-bold text-sm">{badge.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
          
          {/* 等级和积分要求 */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>L{badge.level}</span>
            <span>•</span>
            <span>{badge.points_required}分</span>
          </div>

          {/* 获得时间 */}
          {isOwned && badge.earned_at && (
            <p className="text-xs text-muted-foreground mt-2">
              获得于 {new Date(badge.earned_at).toLocaleDateString("zh-CN")}
            </p>
          )}

          {/* 操作按钮 */}
          {showActions && isOwned && (
            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateDisplayMutation.mutate({
                  badgeId: badge.badge_id || badge.id,
                  isDisplayed: !badge.is_displayed,
                })}
              >
                {badge.is_displayed ? (
                  <><EyeOff className="w-3 h-3 mr-1" /> 隐藏</>
                ) : (
                  <><Eye className="w-3 h-3 mr-1" /> 展示</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // 按能力域分组徽章
  const groupBadgesByDomain = (badges: any[]) => {
    return badges.reduce((acc, badge) => {
      const domain = badge.domain_code;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(badge);
      return acc;
    }, {} as Record<string, any[]>);
  };

  // 获取用户已拥有的徽章ID集合
  const ownedBadgeIds = new Set((userBadges || []).map((b: any) => b.badge_id));

  // 过滤徽章
  const filteredAllBadges = selectedDomain 
    ? (allBadges || []).filter((b: any) => b.domain_code === selectedDomain)
    : allBadges || [];

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Award}
          title="能力徽章"
          description="展示您在TSDCKL六大能力域获得的成就徽章"
        />

        {badgeStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Trophy} label="已获得徽章" value={(badgeStats as any).total} />
            <StatCard icon={Sparkles} label="传说徽章" value={(badgeStats as any).rarityStats?.legendary || 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
            <StatCard icon={Star} label="史诗徽章" value={(badgeStats as any).rarityStats?.epic || 0} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
            <StatCard icon={Award} label="最高等级" value={(badgeStats as any).highestBadge ? `L${(badgeStats as any).highestBadge.level}` : "-"} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          </div>
        )}

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-badges">我的徽章</TabsTrigger>
            <TabsTrigger value="all-badges">全部徽章</TabsTrigger>
            <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
          </TabsList>

          {/* 我的徽章 */}
          <TabsContent value="my-badges" className="space-y-6">
            {loadingUserBadges ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : !userBadges || userBadges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="w-16 h-16 mx-auto text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">您还没有获得任何徽章</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    提交能力证据并通过审核后，系统将自动授予相应徽章
                  </p>
                  <Link href="/evidence-submission">
                    <Button className="mt-4">提交能力证据</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 按能力域分组展示 */}
                {Object.entries(groupBadgesByDomain(userBadges as any[])).map(([domain, badges]: [string, any]) => (
                  <div key={domain}>
                    <div className="flex items-center gap-2 mb-4">
                      {(() => {
                        const IconComponent = DOMAIN_ICONS[domain] || Star;
                        return <IconComponent className="w-5 h-5 text-primary" />;
                      })()}
                      <h2 className="text-lg font-bold">{DOMAIN_NAMES[domain] || domain}</h2>
                      <Badge variant="secondary">{badges.length}个</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {badges.map((badge: any) => renderBadgeCard(badge, true, true))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* 全部徽章 */}
          <TabsContent value="all-badges" className="space-y-6">
            {/* 能力域筛选 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDomain === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDomain(null)}
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

            {loadingAllBadges ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredAllBadges.map((badge: any) => 
                  renderBadgeCard(badge, ownedBadgeIds.has(badge.id))
                )}
              </div>
            )}

            {/* 收集进度 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">收集进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(DOMAIN_NAMES).map(([code, name]) => {
                  const domainBadges = (allBadges || []).filter((b: any) => b.domain_code === code);
                  const ownedCount = domainBadges.filter((b: any) => ownedBadgeIds.has(b.id)).length;
                  const totalCount = domainBadges.length;
                  const progress = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;
                  const IconComponent = DOMAIN_ICONS[code] || Star;

                  return (
                    <div key={code} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {ownedCount}/{totalCount}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 排行榜 */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  徽章排行榜
                </CardTitle>
                <CardDescription>
                  根据徽章数量和稀有度计算综合得分排名
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLeaderboard ? (
                  <div className="text-center py-12 text-muted-foreground">加载中...</div>
                ) : !leaderboard || leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无排行数据
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((item: any, index: number) => (
                      <div 
                        key={item.user_id}
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          index === 0 ? "bg-yellow-500/10 border border-yellow-500/30" :
                          index === 1 ? "bg-gray-400/10 border border-gray-400/30" :
                          index === 2 ? "bg-orange-500/10 border border-orange-500/30" :
                          "bg-muted/50"
                        }`}
                      >
                        {/* 排名 */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? "bg-yellow-500 text-yellow-950" :
                          index === 1 ? "bg-gray-400 text-gray-950" :
                          index === 2 ? "bg-orange-500 text-orange-950" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>

                        {/* 用户信息 */}
                        <div className="flex-1">
                          <p className="font-medium">{item.user_id}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{item.badge_count}个徽章</span>
                            <span>•</span>
                            <span>最高L{item.highest_level}</span>
                            <span>•</span>
                            <span>{item.domains?.split(",").length || 0}个能力域</span>
                          </div>
                        </div>

                        {/* 得分 */}
                        <div className="text-right">
                          <p className="text-2xl font-bold">{item.badge_score}</p>
                          <p className="text-xs text-muted-foreground">综合得分</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
