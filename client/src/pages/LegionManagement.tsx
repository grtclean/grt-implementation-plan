/**
 * GRT 5.0 军团管理 — 批量数字助手初始化与运营
 *
 * 4-tab workbench:
 * 1. 军团概览 — Overall fleet stats, provisioned vs pending
 * 2. 技能映射 — Employee skill→role→level mapping table
 * 3. 批量初始化 — Batch provisioning controls with results
 * 4. 运营管理 — Fleet-wide operations
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Bot, Users, Zap, Award, Gauge, Shield, Search,
  Play, CheckCircle2, AlertTriangle, BarChart3,
  TrendingUp, Database, Coins, RefreshCw, UserPlus,
} from "lucide-react";

// ── Level colors ──
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-gray-500", 2: "bg-blue-500", 3: "bg-green-500", 4: "bg-purple-500", 5: "bg-amber-500",
};
const LEVEL_BG: Record<number, string> = {
  1: "bg-gray-100 text-gray-700", 2: "bg-blue-100 text-blue-700", 3: "bg-green-100 text-green-700",
  4: "bg-purple-100 text-purple-700", 5: "bg-amber-100 text-amber-700",
};
const LEVEL_LABELS: Record<number, string> = {
  1: "L1 Junior", 2: "L2 Standard", 3: "L3 Senior", 4: "L4 Expert", 5: "L5 Master",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════

export default function LegionManagement() {
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("");

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = trpc.legion.getOverview.useQuery(
    undefined, { staleTime: 30_000 }
  );

  const { data: skillData, isLoading: skillLoading, refetch: refetchSkills } = trpc.legion.getSkillMappings.useQuery(
    { department: deptFilter || undefined, search: search || undefined },
    { staleTime: 30_000 }
  );

  const batchProvision = trpc.legion.batchProvision.useMutation({
    onSuccess: () => {
      refetchOverview();
      refetchSkills();
    },
  });

  const initSingle = trpc.legion.initSingleEmployee.useMutation({
    onSuccess: () => {
      refetchSkills();
      refetchOverview();
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            {isEn ? "Legion Management" : "军团管理"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEn
              ? "Batch provision employee digital assistants based on skill inventory"
              : "基于员工技能清单批量初始化数字助手军团"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs px-2 py-1.5">
            <BarChart3 className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Overview" : "军团概览"}
          </TabsTrigger>
          <TabsTrigger value="mapping" className="text-xs px-2 py-1.5">
            <Database className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Skill Mapping" : "技能映射"}
          </TabsTrigger>
          <TabsTrigger value="provision" className="text-xs px-2 py-1.5">
            <Zap className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Batch Init" : "批量初始化"}
          </TabsTrigger>
          <TabsTrigger value="operations" className="text-xs px-2 py-1.5">
            <Gauge className="w-3.5 h-3.5 mr-1" />
            {isEn ? "Operations" : "运营管理"}
          </TabsTrigger>
        </TabsList>

        {/* ──────── Tab 1: 军团概览 ──────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {overviewLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users} label={isEn ? "Total Employees" : "在职员工"} value={overview.totalEmployees} color="bg-blue-500" />
                <StatCard icon={Bot} label={isEn ? "With Master AI" : "已配置M助理"} value={overview.withMaster}
                  sub={`${overview.totalEmployees ? Math.round(overview.withMaster / overview.totalEmployees * 100) : 0}%`} color="bg-purple-500" />
                <StatCard icon={Shield} label={isEn ? "With Fleet (L1-L5)" : "已配置军团"} value={overview.withFleet}
                  sub={`${overview.totalAgents} ${isEn ? "agents" : "个Agent"}`} color="bg-green-500" />
                <StatCard icon={Coins} label={isEn ? "Total G-Tokens" : "G-Token总量"} value={overview.totalGTokens.toLocaleString()} color="bg-amber-500" />
              </div>

              {/* Provisioning Progress */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isEn ? "Provisioning Progress" : "配置进度"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{isEn ? "Master AI" : "M助理配置"}</span>
                      <span>{overview.withMaster}/{overview.totalEmployees}</span>
                    </div>
                    <Progress value={overview.totalEmployees ? (overview.withMaster / overview.totalEmployees) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{isEn ? "Fleet (L1-L5)" : "军团配置"}</span>
                      <span>{overview.withFleet}/{overview.totalEmployees}</span>
                    </div>
                    <Progress value={overview.totalEmployees ? (overview.withFleet / overview.totalEmployees) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{isEn ? "Active Agents" : "已激活Agent"}</span>
                      <span>{overview.withActiveAgent}/{overview.withFleet}</span>
                    </div>
                    <Progress value={overview.withFleet ? (overview.withActiveAgent / overview.withFleet) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Level Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{isEn ? "Agent Level Distribution" : "Agent等级分布"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const count = overview.byLevel[lvl] || 0;
                        const total = overview.totalAgents || 1;
                        return (
                          <div key={lvl} className="flex items-center gap-2">
                            <Badge className={`${LEVEL_BG[lvl]} text-xs w-20 justify-center`}>
                              {LEVEL_LABELS[lvl]}
                            </Badge>
                            <div className="flex-1">
                              <div className={`h-4 rounded ${LEVEL_COLORS[lvl]}`}
                                style={{ width: `${Math.max(2, (count / total) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Department Status */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{isEn ? "By Department" : "部门配置状态"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                      {Object.entries(overview.byDepartment)
                        .sort(([, a], [, b]) => b.total - a.total)
                        .map(([dept, stats]) => (
                        <div key={dept} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate">{dept}</span>
                          <span className="text-xs text-muted-foreground">{stats.provisioned}/{stats.total}</span>
                          <div className="w-16">
                            <Progress value={stats.total ? (stats.provisioned / stats.total) * 100 : 0} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ──────── Tab 2: 技能映射 ──────── */}
        <TabsContent value="mapping" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isEn ? "Search name / code / position..." : "搜索姓名/工号/岗位..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">{isEn ? "All Departments" : "全部部门"}</option>
              {skillData?.departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Level Distribution Summary */}
          {skillData && (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <Badge key={lvl} className={`${LEVEL_BG[lvl]} text-xs`}>
                  {LEVEL_LABELS[lvl]}: {skillData.levelDistribution[lvl] || 0}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {isEn ? "With Skills" : "有评估"}: {skillData.totalWithSkills}/{skillData.total}
              </Badge>
            </div>
          )}

          {/* Mapping Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">{isEn ? "Code" : "工号"}</th>
                      <th className="text-left p-3">{isEn ? "Name" : "姓名"}</th>
                      <th className="text-left p-3">{isEn ? "Dept" : "部门"}</th>
                      <th className="text-left p-3">{isEn ? "Position" : "岗位"}</th>
                      <th className="text-left p-3">{isEn ? "Role" : "角色"}</th>
                      <th className="text-center p-3">TSDCKL</th>
                      <th className="text-center p-3">{isEn ? "Avg" : "均分"}</th>
                      <th className="text-center p-3">{isEn ? "Level" : "等级"}</th>
                      <th className="text-center p-3">{isEn ? "Status" : "状态"}</th>
                      <th className="text-center p-3">{isEn ? "Action" : "操作"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillLoading ? (
                      <tr><td colSpan={10} className="p-4 text-center"><Skeleton className="h-4 w-48 mx-auto" /></td></tr>
                    ) : skillData?.mappings.length === 0 ? (
                      <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">
                        {isEn ? "No employees found" : "未找到员工"}
                      </td></tr>
                    ) : (
                      skillData?.mappings.map((emp) => (
                        <tr key={emp.employeeId} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-xs">{emp.employeeCode}</td>
                          <td className="p-3 font-medium">{emp.name}</td>
                          <td className="p-3 text-xs">{emp.department}</td>
                          <td className="p-3 text-xs">{emp.position}</td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-xs">{emp.roleName}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            {emp.tsdckl ? (
                              <div className="flex gap-0.5 justify-center">
                                {Object.entries(emp.tsdckl).map(([key, val]) => (
                                  <span key={key} className={`text-xs px-1 rounded ${
                                    val >= 80 ? "bg-green-100 text-green-700" :
                                    val >= 60 ? "bg-blue-100 text-blue-700" :
                                    val >= 40 ? "bg-amber-100 text-amber-700" :
                                    "bg-red-100 text-red-700"
                                  }`} title={`${key.toUpperCase()}: ${val}`}>
                                    {key.toUpperCase()[0]}{val}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center text-xs font-mono">
                            {emp.skillAvg || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`${LEVEL_BG[emp.computedLevel]} text-xs`}>
                              L{emp.computedLevel}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              {emp.hasMaster && (
                                <span className="w-2 h-2 rounded-full bg-green-400" title={isEn ? "Has Master" : "已有M助理"} />
                              )}
                              {emp.hasFleet && (
                                <span className="w-2 h-2 rounded-full bg-blue-400" title={isEn ? "Has Fleet" : "已有军团"} />
                              )}
                              {emp.fleetActiveLevel && (
                                <span className="w-2 h-2 rounded-full bg-purple-400" title={`Active: L${emp.fleetActiveLevel}`} />
                              )}
                              {!emp.hasMaster && !emp.hasFleet && (
                                <span className="text-xs text-muted-foreground">{isEn ? "Pending" : "待配置"}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {!emp.hasMaster || !emp.hasFleet ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => initSingle.mutate({ employeeId: emp.employeeId })}
                                disabled={initSingle.isPending}
                                className="text-xs gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                {isEn ? "Init" : "初始化"}
                              </Button>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Tab 3: 批量初始化 ──────── */}
        <TabsContent value="provision" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {isEn ? "Batch Legion Provisioning" : "批量军团初始化"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">{isEn ? "This operation will:" : "此操作将执行:"}</p>
                <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
                  <li>{isEn ? "Read all active employees from HR database" : "读取人事数据库全部在职员工"}</li>
                  <li>{isEn ? "Query TSDCKL competency assessments for each" : "查询每位员工的TSDCKL能力评估分数"}</li>
                  <li>{isEn ? "Compute optimal M-level (L1-L5) based on skill scores + role weights" : "基于技能分数+岗位权重计算最优M等级(L1-L5)"}</li>
                  <li>{isEn ? "Create Master AI Assistant (if not exists)" : "创建M级主助理(如不存在)"}</li>
                  <li>{isEn ? "Create L1-L5 Agent Fleet (if not exists)" : "创建L1-L5 Agent军团(如不存在)"}</li>
                  <li>{isEn ? "Auto-activate default level agent" : "自动激活默认等级Agent"}</li>
                  <li>{isEn ? "Seed initial G-Tokens (L×50)" : "播种初始G-Token(等级×50)"}</li>
                </ol>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => batchProvision.mutate()}
                  disabled={batchProvision.isPending}
                  className="gap-2"
                  size="lg"
                >
                  {batchProvision.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {batchProvision.isPending
                    ? (isEn ? "Provisioning..." : "初始化中...")
                    : (isEn ? "Start Batch Provisioning" : "开始批量初始化")}
                </Button>
                {overview && (
                  <span className="text-sm text-muted-foreground">
                    {isEn
                      ? `${overview.totalEmployees - overview.withFleet} employees pending`
                      : `${overview.totalEmployees - overview.withFleet} 名员工待配置`}
                  </span>
                )}
              </div>

              {/* Results */}
              {batchProvision.data && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-medium flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-5 h-5" />
                      {isEn ? "Provisioning Complete" : "初始化完成"}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-xl font-bold">{batchProvision.data.totalEmployees}</div>
                        <div className="text-xs text-muted-foreground">{isEn ? "Total" : "总员工"}</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-xl font-bold text-green-600">{batchProvision.data.mastersCreated}</div>
                        <div className="text-xs text-muted-foreground">{isEn ? "Masters Created" : "新建M助理"}</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-xl font-bold text-blue-600">{batchProvision.data.fleetsCreated}</div>
                        <div className="text-xs text-muted-foreground">{isEn ? "Agents Created" : "新建Agent"}</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-xl font-bold text-amber-600">{batchProvision.data.gTokensSeeded}</div>
                        <div className="text-xs text-muted-foreground">{isEn ? "G-Tokens Seeded" : "G-Token播种"}</div>
                      </div>
                    </div>

                    {batchProvision.data.errors.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1 text-sm text-red-600 font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          {batchProvision.data.errors.length} {isEn ? "errors" : "个错误"}
                        </div>
                        <ul className="text-xs text-red-500 mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                          {batchProvision.data.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Detail table */}
                    {batchProvision.data.details.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">{isEn ? "Code" : "工号"}</th>
                              <th className="text-left p-1">{isEn ? "Name" : "姓名"}</th>
                              <th className="text-center p-1">{isEn ? "Level" : "等级"}</th>
                              <th className="text-center p-1">{isEn ? "Action" : "操作"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batchProvision.data.details.slice(0, 50).map((d, i) => (
                              <tr key={i} className="border-b">
                                <td className="p-1 font-mono">{d.employeeCode}</td>
                                <td className="p-1">{d.name}</td>
                                <td className="p-1 text-center">
                                  <Badge className={`${LEVEL_BG[d.level]} text-xs`}>L{d.level}</Badge>
                                </td>
                                <td className="p-1 text-center">
                                  <Badge variant={d.action === "skip" ? "secondary" : "default"} className="text-xs">
                                    {d.action === "skip" ? (isEn ? "Skipped" : "已跳过") :
                                     d.action === "fleet_created" ? (isEn ? "Fleet" : "军团") :
                                     (isEn ? "Full Init" : "完整初始化")}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {batchProvision.data.details.length > 50 && (
                          <div className="text-center text-xs text-muted-foreground py-1">
                            +{batchProvision.data.details.length - 50} {isEn ? "more" : "更多"}...
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* TSDCKL → Level Algorithm Explanation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                {isEn ? "Skill → Level Algorithm" : "技能→等级计算算法"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>{isEn ? "TSDCKL weighted score → M-Level mapping:" : "TSDCKL加权分→M等级映射:"}</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { level: 1, range: "<40", label: "Junior" },
                  { level: 2, range: "40-54", label: "Standard" },
                  { level: 3, range: "55-69", label: "Senior" },
                  { level: 4, range: "70-84", label: "Expert" },
                  { level: 5, range: "≥85", label: "Master" },
                ].map((item) => (
                  <div key={item.level} className={`p-2 rounded text-center ${LEVEL_BG[item.level]}`}>
                    <div className="font-bold">L{item.level}</div>
                    <div>{item.range}</div>
                    <div className="text-[10px]">{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2">
                {isEn
                  ? "Weight matrix: Management → L(30%)+K(20%), Technical → T(30%)+D(20%), Sales → S(25%)+C(25%). Directors min L4, managers min L3."
                  : "权重矩阵: 管理岗→L(30%)+K(20%), 技术岗→T(30%)+D(20%), 销售岗→S(25%)+C(25%). 总监最低L4, 经理最低L3."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── Tab 4: 运营管理 ──────── */}
        <TabsContent value="operations" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* G-Token Economy */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  {isEn ? "G-Token Economy" : "G-Token经济"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600">{overview.totalGTokens.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{isEn ? "Total Circulating" : "总流通量"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{overview.totalAgents}</div>
                        <div className="text-xs text-muted-foreground">{isEn ? "Total Agents" : "Agent总数"}</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{overview.withActiveAgent}</div>
                        <div className="text-xs text-muted-foreground">{isEn ? "Active" : "已激活"}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isEn ? "Seed formula: Level × 50 G-Tokens per default agent" : "播种公式: 等级 × 50 G-Token/默认Agent"}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-32" />
                )}
              </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  {isEn ? "Role Distribution" : "角色分布"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                    {Object.entries(overview.byRole)
                      .sort(([, a], [, b]) => b - a)
                      .map(([role, count]) => (
                      <div key={role} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs w-28 justify-center">{role}</Badge>
                        <div className="flex-1">
                          <div className="h-3 rounded bg-blue-200"
                            style={{ width: `${Math.max(5, (count / overview.totalEmployees) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Skeleton className="h-32" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isEn ? "Fleet Operations" : "军团操作"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchOverview()} className="gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isEn ? "Refresh Stats" : "刷新统计"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetchSkills()} className="gap-1">
                  <Database className="w-3.5 h-3.5" />
                  {isEn ? "Refresh Mappings" : "刷新映射"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
