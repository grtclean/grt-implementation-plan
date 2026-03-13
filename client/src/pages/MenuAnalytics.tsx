/**
 * 菜单使用分析仪表盘
 * 菜单热度统计、使用趋势、用户行为分析
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Clock, MousePointerClick, Star, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";

const TOP_PAGES = [
  { path: "/", name: "我的看板", visits: 1250, users: 128, avgTime: "3m 20s", trend: "up" },
  { path: "/projects", name: "项目列表", visits: 890, users: 85, avgTime: "5m 10s", trend: "up" },
  { path: "/expense-report", name: "费用报销", visits: 720, users: 110, avgTime: "4m 45s", trend: "stable" },
  { path: "/crm/customers", name: "客户管理", visits: 650, users: 35, avgTime: "6m 30s", trend: "up" },
  { path: "/production-dashboard", name: "生产看板", visits: 580, users: 42, avgTime: "8m 15s", trend: "up" },
  { path: "/capability-os", name: "能力档案", visits: 450, users: 95, avgTime: "2m 50s", trend: "down" },
  { path: "/ai-assistant", name: "AI对话", visits: 420, users: 78, avgTime: "7m 20s", trend: "up" },
  { path: "/trip-request", name: "出差申请", visits: 380, users: 65, avgTime: "3m 40s", trend: "stable" },
  { path: "/training", name: "培训管理", visits: 320, users: 88, avgTime: "4m 10s", trend: "down" },
  { path: "/smart-meeting", name: "智慧会议", visits: 280, users: 55, avgTime: "12m 05s", trend: "up" },
];

const UNUSED_PAGES = [
  { path: "/toothpaste-test-history", name: "牙膏测试历史", visits: 2, lastAccess: "2026-01-05" },
  { path: "/cleaning-trajectory-3d", name: "清洗轨迹3D", visits: 5, lastAccess: "2026-01-18" },
  { path: "/notebook-search", name: "笔记搜索", visits: 8, lastAccess: "2026-01-22" },
  { path: "/gemini-spec", name: "Gemini规范", visits: 3, lastAccess: "2026-01-10" },
];

const ROLE_USAGE = [
  { role: "bu_pm (项目经理)", topPages: ["项目列表", "阶段门", "甘特图"], sessions: 450 },
  { role: "bu_sales (销售)", topPages: ["客户管理", "商机管理", "报价管理"], sessions: 320 },
  { role: "bu_mech (机械)", topPages: ["机械设计", "BOM管理", "技术文档"], sessions: 280 },
  { role: "admin (管理员)", topPages: ["系统监控", "用户权限", "审计日志"], sessions: 150 },
  { role: "hr_specialist (HR)", topPages: ["考勤管理", "员工管理", "培训管理"], sessions: 200 },
];

export default function MenuAnalytics() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title={t("admin.menuAnalytics.title")}
        description={t("admin.menuAnalytics.description")}
        actions={
          <>
            <Select defaultValue="7d">
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">{t("admin.menuAnalytics.today")}</SelectItem>
                <SelectItem value="7d">{t("admin.menuAnalytics.last7Days")}</SelectItem>
                <SelectItem value="30d">{t("admin.menuAnalytics.last30Days")}</SelectItem>
                <SelectItem value="90d">{t("admin.menuAnalytics.last90Days")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline"><RefreshCw className="h-4 w-4 mr-2" />{t("admin.menuAnalytics.refresh")}</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={MousePointerClick} label={t("admin.menuAnalytics.totalPageVisits")} value="12,580" trend={{ value: 12, label: t("admin.menuAnalytics.vsLastWeek") }} />
        <StatCard icon={Users} label={t("admin.menuAnalytics.activeUsers")} value={128} trend={{ value: 5, label: t("admin.menuAnalytics.vsLastWeek") }} />
        <StatCard icon={Clock} label={t("admin.menuAnalytics.avgStayTime")} value="5m 22s" subtitle={t("admin.menuAnalytics.stable")} />
        <StatCard icon={Star} label={t("admin.menuAnalytics.favUsageRate")} value="42%" trend={{ value: 8, label: "" }} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("admin.menuAnalytics.topPages")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TOP_PAGES.map((p, i) => (
                <div key={p.path} className="flex items-center gap-3 py-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.users}{t("admin.menuAnalytics.persons")} · {t("admin.menuAnalytics.avg")}{p.avgTime}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.trend === "up" ? <ArrowUp className="h-3 w-3 text-green-500" /> : p.trend === "down" ? <ArrowDown className="h-3 w-3 text-red-500" /> : null}
                    <span className="text-sm font-mono">{p.visits}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("admin.menuAnalytics.roleDistribution")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ROLE_USAGE.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.role}</span>
                    <span className="text-sm text-muted-foreground">{r.sessions}{t("admin.menuAnalytics.sessions")}</span>
                  </div>
                  <div className="flex gap-1">
                    {r.topPages.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Usage Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {t("admin.menuAnalytics.lowUsagePages")}
            <Badge variant="outline" className="text-xs">{t("admin.menuAnalytics.lowUsageHint")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {UNUSED_PAGES.map(p => (
              <div key={p.path} className="flex items-center gap-4 p-3 rounded-lg border border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10">
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.path}</p>
                </div>
                <span className="text-sm text-muted-foreground">{p.visits}{t("admin.menuAnalytics.visits")}</span>
                <span className="text-xs text-muted-foreground">{t("admin.menuAnalytics.lastAccess")}: {p.lastAccess}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
