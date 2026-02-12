/**
 * 菜单使用分析仪表盘
 * 菜单热度统计、使用趋势、用户行为分析
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Clock, MousePointerClick, Star, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";

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
  { path: "/gemini-specification", name: "Gemini规范", visits: 3, lastAccess: "2026-01-10" },
];

const ROLE_USAGE = [
  { role: "bu_pm (项目经理)", topPages: ["项目列表", "阶段门", "甘特图"], sessions: 450 },
  { role: "bu_sales (销售)", topPages: ["客户管理", "商机管理", "报价管理"], sessions: 320 },
  { role: "bu_mech (机械)", topPages: ["机械设计", "BOM管理", "技术文档"], sessions: 280 },
  { role: "admin (管理员)", topPages: ["系统监控", "用户权限", "审计日志"], sessions: 150 },
  { role: "hr_specialist (HR)", topPages: ["考勤管理", "员工管理", "培训管理"], sessions: 200 },
];

export default function MenuAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />菜单使用分析</h1>
          <p className="text-muted-foreground mt-1">菜单热度 · 使用趋势 · 用户行为分析</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="7d">
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">今天</SelectItem>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
              <SelectItem value="90d">最近90天</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><RefreshCw className="h-4 w-4 mr-2" />刷新</Button>
        </div>
      </div>

      {/* 整体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex justify-between"><div><p className="text-sm text-muted-foreground">总页面访问</p><p className="text-2xl font-bold">12,580</p></div><MousePointerClick className="h-8 w-8 text-muted-foreground/20" /></div>
          <p className="text-xs text-green-600 mt-1"><ArrowUp className="inline h-3 w-3" />+12% vs 上周</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex justify-between"><div><p className="text-sm text-muted-foreground">活跃用户</p><p className="text-2xl font-bold">128</p></div><Users className="h-8 w-8 text-muted-foreground/20" /></div>
          <p className="text-xs text-green-600 mt-1"><ArrowUp className="inline h-3 w-3" />+5% vs 上周</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex justify-between"><div><p className="text-sm text-muted-foreground">平均停留时间</p><p className="text-2xl font-bold">5m 22s</p></div><Clock className="h-8 w-8 text-muted-foreground/20" /></div>
          <p className="text-xs text-muted-foreground mt-1">稳定</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex justify-between"><div><p className="text-sm text-muted-foreground">收藏使用率</p><p className="text-2xl font-bold">42%</p></div><Star className="h-8 w-8 text-muted-foreground/20" /></div>
          <p className="text-xs text-green-600 mt-1"><ArrowUp className="inline h-3 w-3" />+8%</p>
        </CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 热门页面 */}
        <Card>
          <CardHeader><CardTitle className="text-lg">热门页面 Top 10</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TOP_PAGES.map((p, i) => (
                <div key={p.path} className="flex items-center gap-3 py-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.users}人 · 平均{p.avgTime}</p>
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

        {/* 按角色使用分析 */}
        <Card>
          <CardHeader><CardTitle className="text-lg">角色使用分布</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ROLE_USAGE.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.role}</span>
                    <span className="text-sm text-muted-foreground">{r.sessions}次会话</span>
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

      {/* 低使用率页面 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            低使用率页面
            <Badge variant="outline" className="text-xs">可能需要优化或移除</Badge>
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
                <span className="text-sm text-muted-foreground">{p.visits}次访问</span>
                <span className="text-xs text-muted-foreground">最后访问: {p.lastAccess}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
