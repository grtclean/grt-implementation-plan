import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Trophy, Star, Award, TrendingUp, Medal, Crown, Zap, Users } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-gray-400 text-white",
  gold: "bg-yellow-500 text-white",
  platinum: "bg-blue-400 text-white",
};

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bronze: Medal,
  silver: Star,
  gold: Trophy,
  platinum: Crown,
};

export default function Gamification() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [selectedUserId] = useState(1);
  const profileQuery = trpc.gamification.profile.useQuery({ userId: selectedUserId });
  const leaderboardQuery = trpc.gamification.leaderboard.useQuery({});
  const profile = profileQuery.data;
  const leaderboard = leaderboardQuery.data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Trophy}
          title={isZh ? "成就系统" : "Achievement System"}
        />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">{isZh ? "个人资料" : "Profile"}</TabsTrigger>
            <TabsTrigger value="achievements">{isZh ? "成就徽章" : "Achievements"}</TabsTrigger>
            <TabsTrigger value="leaderboard">{isZh ? "排行榜" : "Leaderboard"}</TabsTrigger>
            <TabsTrigger value="history">{isZh ? "XP历史" : "XP History"}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {isZh ? "员工等级" : "Employee Level"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold">Lv.{profile.level}</div>
                      <div className="text-lg text-muted-foreground">{profile.title}</div>
                      <div className="text-sm">{profile.xp} XP</div>
                    </div>
                    <Progress value={profile.progress} className="h-3" />
                    <div className="text-xs text-muted-foreground text-right">
                      {profile.xpForNext} XP {isZh ? "到下一级" : "to next level"}
                    </div>
                  </div>
                ) : <div>{isZh ? "加载中..." : "Loading..."}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profile?.achievements?.map((ach: { id: number; achievementName: string; achievementCode: string; tier: string | null; description: string | null }) => {
                const tier = ach.tier ?? "bronze";
                const TierIcon = TIER_ICONS[tier] ?? Medal;
                return (
                  <Card key={ach.id} className="text-center">
                    <CardContent className="pt-6">
                      <TierIcon className="h-10 w-10 mx-auto mb-2" />
                      <div className="font-semibold text-sm">{ach.achievementName}</div>
                      <Badge className={TIER_COLORS[tier] ?? ""}>{tier}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">{ach.description}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader><CardTitle>{isZh ? "排行榜" : "Leaderboard"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard?.map((entry: { rank: number; userId: number; totalXP: number; level: number; title: string }) => (
                    <div key={entry.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-8">#{entry.rank}</span>
                        <span>User {entry.userId}</span>
                        <Badge variant="outline">Lv.{entry.level}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{entry.title}</span>
                        <span className="font-semibold">{entry.totalXP} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle>{isZh ? "XP历史" : "XP History"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile?.recentXP?.map((xp: { id: number; action: string; points: number; awardedAt: string | null }) => (
                    <div key={xp.id} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <span className="font-medium">{xp.action.replace(/_/g, " ")}</span>
                        <span className="text-xs text-muted-foreground ml-2">{xp.awardedAt ? new Date(xp.awardedAt).toLocaleDateString() : ""}</span>
                      </div>
                      <Badge variant="secondary">+{xp.points} XP</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}