import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Target, Flame, Users, Star, Crown, RefreshCw, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

const tierColors: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800",
  silver: "bg-gray-200 text-gray-800",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
};

const tierLabelKeys: Record<string, string> = {
  bronze: "meeting.gamification.tierBronze",
  silver: "meeting.gamification.tierSilver",
  gold: "meeting.gamification.tierGold",
  platinum: "meeting.gamification.tierPlatinum",
};

export function GamificationTab() {
  const { t } = useLanguage();
  const [evalUserId, setEvalUserId] = useState("");
  const [lbPeriod, setLbPeriod] = useState("monthly");
  const [lbMetric, setLbMetric] = useState("contribution_score");

  // Challenge form
  const [chalTitle, setChalTitle] = useState("");
  const [chalType, setChalType] = useState("improve_effectiveness");
  const [chalMetric, setChalMetric] = useState("avg_effectiveness");
  const [chalTarget, setChalTarget] = useState("");
  const [chalReward, setChalReward] = useState("");

  const dashboardQuery = trpc.ime.gamificationDashboard.useQuery({});
  const leaderboardQuery = trpc.ime.leaderboard.useQuery({ period: lbPeriod, metric: lbMetric });
  const challengesQuery = trpc.ime.listChallenges.useQuery({});

  const evalMut = trpc.ime.evaluateAchievements.useMutation({
    onSuccess: () => dashboardQuery.refetch(),
  });
  const createChalMut = trpc.ime.createChallenge.useMutation({
    onSuccess: () => { challengesQuery.refetch(); setChalTitle(""); setChalTarget(""); setChalReward(""); },
  });
  const progressMut = trpc.ime.updateChallengeProgress.useMutation({
    onSuccess: () => challengesQuery.refetch(),
  });

  const dashboard = dashboardQuery.data as any;
  const leaderboard = (leaderboardQuery.data || []) as any[];
  const challenges = (challengesQuery.data || []) as any[];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-1" />
            <div className="text-3xl font-bold">{dashboard?.definitions?.length || 0}</div>
            <div className="text-sm text-muted-foreground">{t("meeting.gamification.achievementTypes")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Medal className="h-8 w-8 mx-auto text-blue-500 mb-1" />
            <div className="text-3xl font-bold">{dashboard?.awards?.length || 0}</div>
            <div className="text-sm text-muted-foreground">{t("meeting.gamification.achievementsEarned")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Star className="h-8 w-8 mx-auto text-orange-500 mb-1" />
            <div className="text-3xl font-bold">
              {(dashboard?.pointsSummary as any[])?.reduce((sum: number, p: any) => sum + Number(p.total_points || 0), 0) || 0}
            </div>
            <div className="text-sm text-muted-foreground">{t("meeting.gamification.totalPoints")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Target className="h-8 w-8 mx-auto text-green-500 mb-1" />
            <div className="text-3xl font-bold">{dashboard?.activeChallenges?.length || 0}</div>
            <div className="text-sm text-muted-foreground">{t("meeting.gamification.activeChallenges")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t("meeting.gamification.achievementEval")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder={t("meeting.gamification.userId")} value={evalUserId} onChange={e => setEvalUserId(e.target.value)} className="flex-1" />
            <Button onClick={() => evalMut.mutate({ userId: evalUserId })} disabled={!evalUserId || evalMut.isPending}>
              {evalMut.isPending ? t("meeting.gamification.evaluating") : t("meeting.gamification.evaluate")}
            </Button>
          </div>
          {evalMut.data && (
            <div className="p-3 bg-muted rounded text-sm space-y-2">
              <p>{t("meeting.gamification.evaluated")} {(evalMut.data as any).totalEvaluated} {t("meeting.gamification.itemsAchievement")}</p>
              {(evalMut.data as any).newAwards?.length > 0 ? (
                <div>
                  <p className="font-semibold">{t("meeting.gamification.newAchievements")}</p>
                  {(evalMut.data as any).newAwards.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 mt-1">
                      <Badge className={tierColors[a.tier] || ""}>{t(tierLabelKeys[a.tier] || "") || a.tier}</Badge>
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground">+{a.points}{t("meeting.gamification.pointsSuffix")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{t("meeting.gamification.noNewAchievements")}</p>
              )}
            </div>
          )}

          {/* Achievement Definitions */}
          {dashboard?.definitions?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(dashboard.definitions as any[]).map((d: any) => (
                <div key={d.id} className="p-3 border rounded-lg text-center">
                  <Badge className={`${tierColors[d.tier] || ""} mb-2`}>{t(tierLabelKeys[d.tier] || "") || d.tier}</Badge>
                  <div className="font-semibold text-sm">{d.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{d.description}</div>
                  <div className="text-xs mt-1 font-medium">{d.points}{t("meeting.gamification.pointsSuffix")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            {t("meeting.gamification.leaderboard")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={lbPeriod} onValueChange={setLbPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("meeting.gamification.thisWeek")}</SelectItem>
                <SelectItem value="monthly">{t("meeting.gamification.thisMonth")}</SelectItem>
                <SelectItem value="quarterly">{t("meeting.gamification.thisQuarter")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lbMetric} onValueChange={setLbMetric}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contribution_score">{t("meeting.gamification.contribution")}</SelectItem>
                <SelectItem value="action_completion">{t("meeting.gamification.actionCompletion")}</SelectItem>
                <SelectItem value="effectiveness">{t("meeting.gamification.effectivenessRating")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t("meeting.gamification.rank")}</TableHead>
                  <TableHead>{t("meeting.gamification.user")}</TableHead>
                  <TableHead>{t("meeting.gamification.scoreLabel")}</TableHead>
                  <TableHead>{t("meeting.gamification.trend")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry: any) => (
                  <TableRow key={entry.rank}>
                    <TableCell>
                      <span className={`font-bold ${entry.rank <= 3 ? "text-lg" : ""}`}>
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{entry.userName}</TableCell>
                    <TableCell className="font-semibold">{entry.score}</TableCell>
                    <TableCell>
                      {entry.trend === "up" ? <TrendingUp className="h-4 w-4 text-green-500" />
                        : entry.trend === "down" ? <TrendingDown className="h-4 w-4 text-red-500" />
                        : <Minus className="h-4 w-4 text-gray-400" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("meeting.gamification.noLeaderboardData")}</p>
          )}
        </CardContent>
      </Card>

      {/* Team Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            {t("meeting.gamification.teamChallenges")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder={t("meeting.gamification.challengeTitle")} value={chalTitle} onChange={e => setChalTitle(e.target.value)} />
            <Select value={chalType} onValueChange={setChalType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="improve_effectiveness">{t("meeting.gamification.improveEffectiveness")}</SelectItem>
                <SelectItem value="reduce_duration">{t("meeting.gamification.reduceDuration")}</SelectItem>
                <SelectItem value="action_completion">{t("meeting.gamification.actionCompletionRate")}</SelectItem>
                <SelectItem value="reduce_cost">{t("meeting.gamification.reduceCost")}</SelectItem>
                <SelectItem value="boost_engagement">{t("meeting.gamification.boostEngagement")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chalMetric} onValueChange={setChalMetric}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avg_effectiveness">{t("meeting.gamification.avgEffectiveness")}</SelectItem>
                <SelectItem value="avg_duration">{t("meeting.gamification.avgDuration")}</SelectItem>
                <SelectItem value="action_completion_rate">{t("meeting.gamification.actionCompletionRateMetric")}</SelectItem>
                <SelectItem value="avg_cost">{t("meeting.gamification.avgCost")}</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={t("meeting.gamification.targetValue")} type="number" value={chalTarget} onChange={e => setChalTarget(e.target.value)} />
            <Button
              onClick={() => createChalMut.mutate({
                title: chalTitle, challengeType: chalType, targetMetric: chalMetric,
                targetValue: Number(chalTarget), rewardDescription: chalReward || undefined,
              })}
              disabled={!chalTitle || !chalTarget || createChalMut.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createChalMut.isPending ? t("meeting.gamification.creating") : t("meeting.gamification.createChallenge")}
            </Button>
          </div>

          {challenges.length > 0 && (
            <div className="space-y-3">
              {challenges.map((c: any) => {
                const isImprove = c.challenge_type === "improve_effectiveness" || c.challenge_type === "action_completion" || c.challenge_type === "boost_engagement";
                const progress = c.baseline_value !== null && Number(c.target_value) !== Number(c.baseline_value)
                  ? Math.max(0, Math.min(100, Math.round(
                      isImprove
                        ? ((Number(c.current_value) - Number(c.baseline_value)) / (Number(c.target_value) - Number(c.baseline_value))) * 100
                        : ((Number(c.baseline_value) - Number(c.current_value)) / (Number(c.baseline_value) - Number(c.target_value))) * 100
                    )))
                  : 0;
                return (
                  <div key={c.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold">{c.title}</span>
                        <Badge variant={c.status === "active" ? "default" : c.status === "completed" ? "outline" : "destructive"} className="ml-2">
                          {c.status === "active" ? t("meeting.gamification.active") : c.status === "completed" ? t("meeting.gamification.completed") : c.status === "failed" ? t("meeting.gamification.failed") : c.status}
                        </Badge>
                      </div>
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => progressMut.mutate({ challengeId: c.id })} disabled={progressMut.isPending}>
                          <RefreshCw className={`h-3 w-3 mr-1 ${progressMut.isPending ? "animate-spin" : ""}`} />
                          {t("meeting.gamification.updateProgress")}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>{t("meeting.gamification.baseline")}: {Math.round(Number(c.baseline_value || 0))}</span>
                      <span>{t("meeting.gamification.current")}: {Math.round(Number(c.current_value || 0))}</span>
                      <span>{t("meeting.gamification.target")}: {Number(c.target_value)}</span>
                      <span>{t("meeting.gamification.metric")}: {c.target_metric}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1" />
                      <span className="text-sm font-medium w-12 text-right">{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
