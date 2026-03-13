/**
 * Workstation Preset Admin — 工作台预设管理
 *
 * Admin dashboard to view, manage, and seed employee workstation presets.
 * Shows role distribution, feature flag summary, and per-employee config.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Settings, Users, BarChart3, Upload, Search, Monitor,
  Shield, Eye, Briefcase, Star,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// ── Role label map ──
const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO/董事长", director: "总经理/总监", bu_gm: "事业部经理",
  dept_manager: "部门经理", team_leader: "班组长", bu_sales: "销售经理",
  bu_pm: "项目经理", bu_mech: "机械工程师", bu_elec: "电气工程师",
  hr_manager: "人事经理", hr_specialist: "行政专员", finance_manager: "财务经理",
  finance_specialist: "财务专员", procurement_eng: "采购/仓库", cs_engineer: "售后工程师",
  production_worker: "生产工人", employee: "普通员工",
};

const TIER_COLORS: Record<string, string> = {
  elite: "bg-yellow-100 text-yellow-800",
  standard: "bg-blue-100 text-blue-800",
  new_hire: "bg-green-100 text-green-800",
  probation: "bg-red-100 text-red-800",
};

export default function WorkstationPresetAdmin() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Queries
  const statsQuery = trpc.workstationPreset.stats.useQuery();
  const listQuery = trpc.workstationPreset.list.useQuery(
    roleFilter ? { role: roleFilter } : {},
  );

  const stats = statsQuery.data;
  const presets = listQuery.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return presets;
    const q = search.toLowerCase();
    return presets.filter((p: any) =>
      p.employeeCode?.toLowerCase().includes(q) ||
      p.systemRole?.toLowerCase().includes(q) ||
      p.dashboardLayout?.toLowerCase().includes(q)
    );
  }, [presets, search]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Monitor className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">工作台预设管理</h1>
          <p className="text-muted-foreground text-sm">
            管理全部 {stats?.total ?? "..."} 名员工的工作台配置 — 仪表板布局、快捷菜单、AI等级、功能权限
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1" />概览
          </TabsTrigger>
          <TabsTrigger value="presets">
            <Users className="h-4 w-4 mr-1" />员工预设
          </TabsTrigger>
          <TabsTrigger value="seed">
            <Upload className="h-4 w-4 mr-1" />批量导入
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">总预设数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">角色分类</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.byRole?.length ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">最大角色</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {stats?.byRole?.[0] ? `${ROLE_LABELS[stats.byRole[0].systemRole] ?? stats.byRole[0].systemRole} (${stats.byRole[0].count})` : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">布局模板数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">17</div>
              </CardContent>
            </Card>
          </div>

          {/* Role distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">角色分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(stats?.byRole ?? []).map((item: any) => (
                  <div
                    key={item.systemRole}
                    className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-accent"
                    onClick={() => setRoleFilter(item.systemRole === roleFilter ? "" : item.systemRole)}
                  >
                    <span className="text-sm">{ROLE_LABELS[item.systemRole] ?? item.systemRole}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Presets List Tab ── */}
        <TabsContent value="presets" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索员工编号、角色..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {roleFilter && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => setRoleFilter("")}
              >
                {ROLE_LABELS[roleFilter] ?? roleFilter} ✕
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              显示 {filtered.length} / {presets.length}
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>员工编号</TableHead>
                    <TableHead>系统角色</TableHead>
                    <TableHead>BU</TableHead>
                    <TableHead>布局模板</TableHead>
                    <TableHead>AI等级</TableHead>
                    <TableHead>工作制</TableHead>
                    <TableHead>绩效等级</TableHead>
                    <TableHead>权限标记</TableHead>
                    <TableHead>自定义</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.employeeCode ?? `EMP${p.employeeId}`}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[p.systemRole] ?? p.systemRole}</Badge>
                      </TableCell>
                      <TableCell>{p.buCode ?? "-"}</TableCell>
                      <TableCell className="text-xs">{p.dashboardLayout}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {p.aiAssistantLevel}
                        </div>
                      </TableCell>
                      <TableCell>{p.workSchedule}</TableCell>
                      <TableCell>
                        <Badge className={TIER_COLORS[p.performanceTier] ?? "bg-gray-100"}>
                          {p.performanceTier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {p.canAccessSalary && <Badge variant="outline" className="text-xs"><Eye className="h-3 w-3 mr-0.5" />薪资</Badge>}
                          {p.canManageTeam && <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-0.5" />团队</Badge>}
                          {p.canViewAllBU && <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-0.5" />全BU</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{p.isCustomized ? "✓" : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Seed Tab ── */}
        <TabsContent value="seed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>批量导入工作台预设</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                基于CEO指令，根据员工名单、工资等级、绩效表现、岗位职责自动生成全部96名员工的工作台配置。
                已自定义的员工配置不会被覆盖。
              </p>
              <div className="bg-muted p-4 rounded text-sm space-y-1">
                <div><strong>数据源:</strong></div>
                <div>• data/employees.json — 96名员工基本信息</div>
                <div>• data/salary-summary-202601.csv — 薪资等级</div>
                <div>• data/performance-scores-202601.csv — 绩效分数</div>
                <div className="mt-2"><strong>生成规则:</strong></div>
                <div>• 17种角色 → 17种仪表板布局模板</div>
                <div>• 岗位关键字 → 系统角色映射</div>
                <div>• 部门 → BU代码映射</div>
                <div>• KPI + 薪资等级 → 绩效层级 (elite/standard/new_hire/probation)</div>
                <div>• 角色 → AI助手等级 (1-5)</div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  预览生成结果
                </Button>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  执行批量导入
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                命令行方式: npx tsx scripts/seed-workstation-presets.ts
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
