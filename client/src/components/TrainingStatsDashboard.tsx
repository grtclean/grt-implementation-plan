import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  GraduationCap, 
  Loader2, 
  Target, 
  TrendingUp, 
  Users 
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface TrainingStats {
  totalTrainings: number;
  completedTrainings: number;
  inProgressTrainings: number;
  upcomingTrainings: number;
  totalParticipants: number;
  certificatesIssued: number;
  averageScore: number;
  passRate: number;
}

export default function TrainingStatsDashboard() {
  const { t, language } = useLanguage();
  // Fetch training data
  const { data: trainingsData, isLoading: trainingsLoading } = trpc.agenda.getTrainings.useQuery();
  
  // Safely extract trainings array from response
  const trainings = trainingsData?.trainings || [];
  
  // Calculate statistics from trainings data
  const stats: TrainingStats = {
    totalTrainings: trainings.length,
    completedTrainings: trainings.filter((t: any) => t.status === "completed").length,
    inProgressTrainings: trainings.filter((t: any) => t.status === "in_progress").length,
    upcomingTrainings: trainings.filter((t: any) => t.status === "planned" || t.status === "draft").length,
    totalParticipants: trainings.reduce((sum: number, t: any) => sum + (t.maxParticipants || 0), 0),
    certificatesIssued: trainings.filter((t: any) => t.status === "completed").length, // Simplified
    averageScore: 85, // Placeholder - would need actual assessment data
    passRate: 92, // Placeholder - would need actual assessment data
  };

  // Pie chart data for training status
  const statusData = [
    { name: t("training.status.completed"), value: stats.completedTrainings, color: "#22c55e" },
    { name: t("training.status.inProgress"), value: stats.inProgressTrainings, color: "#f97316" },
    { name: t("training.status.upcoming"), value: stats.upcomingTrainings, color: "#6b7280" },
  ].filter(d => d.value > 0);

  // Pie chart data for training types (based on actual schema types)
  const typeData = [
    { name: t("training.type.internal"), value: trainings.filter((tr: any) => tr.type === "internal").length, color: "#3b82f6" },
    { name: t("training.type.external"), value: trainings.filter((tr: any) => tr.type === "external").length, color: "#8b5cf6" },
    { name: t("training.type.online"), value: trainings.filter((tr: any) => tr.type === "online").length, color: "#10b981" },
    { name: t("training.type.certification"), value: trainings.filter((tr: any) => tr.type === "certification").length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  if (trainingsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Key Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Metrics Skeleton */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-heading font-bold">{t("training.dashboard.title")}</h2>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {t("training.dashboard.updateTime")}: {new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-blue-500/10 text-blue-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("training.dashboard.totalTrainings")}</p>
                <p className="text-2xl font-bold">{stats.totalTrainings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("training.dashboard.completed")}</p>
                <p className="text-2xl font-bold">{stats.completedTrainings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-orange-500/10 text-orange-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("training.dashboard.participants")}</p>
                <p className="text-2xl font-bold">{stats.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-purple-500/10 text-purple-500">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("training.dashboard.certificates")}</p>
                <p className="text-2xl font-bold">{stats.certificatesIssued}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Training Status Distribution */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground">
              {t("training.dashboard.statusDist")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        borderColor: 'var(--border)', 
                        borderRadius: '4px' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">{t("training.dashboard.noData")}</p>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Training Type Distribution */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground">
              {t("training.dashboard.typeDist")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        borderColor: 'var(--border)', 
                        borderRadius: '4px' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">{t("training.dashboard.noData")}</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {typeData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t("training.performance.title")}
          </CardTitle>
          <CardDescription>{t("training.performance.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Completion Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("training.performance.completionRate")}</span>
                <span className="font-mono">
                  {stats.totalTrainings > 0 
                    ? Math.round((stats.completedTrainings / stats.totalTrainings) * 100) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={stats.totalTrainings > 0 
                  ? (stats.completedTrainings / stats.totalTrainings) * 100 
                  : 0} 
                className="h-2"
              />
            </div>

            {/* Pass Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("training.performance.passRate")}</span>
                <span className="font-mono">{stats.passRate}%</span>
              </div>
              <Progress value={stats.passRate} className="h-2" />
            </div>

            {/* Average Score */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("training.performance.avgScore")}</span>
                <span className="font-mono">{stats.averageScore}{t("training.performance.points")}</span>
              </div>
              <Progress value={stats.averageScore} className="h-2" />
            </div>

            {/* Target Achievement */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("training.performance.annualGoal")}</span>
                <span className="font-mono">
                  {Math.min(Math.round((stats.completedTrainings / 12) * 100), 100)}%
                </span>
              </div>
              <Progress 
                value={Math.min((stats.completedTrainings / 12) * 100, 100)} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trainings List */}
      {trainings && trainings.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {t("training.recentTrainings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trainings.slice(0, 5).map((training) => (
                <div 
                  key={training.id} 
                  className="flex items-center justify-between p-3 rounded-sm bg-background/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      training.status === "completed" ? "bg-green-500" :
                      training.status === "in_progress" ? "bg-orange-500" :
                      "bg-gray-500"
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{training.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {training.plannedStartDate ? new Date(training.plannedStartDate).toLocaleDateString('zh-CN') : '待定'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {training.maxParticipants || 0} {t("training.participants")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
