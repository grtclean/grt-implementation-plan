/**
 * Capability System Matrix — GRT六大能力评估矩阵
 *
 * M365 Light Theme — Real data from CEO's Feb 2026 Excel assessment
 * 4 tabs: 团队矩阵 / 员工画像 / 培训计划 / 部门概览
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";
import {
  LayoutGrid,
  ShieldAlert,
  Lock,
  Bot,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  DollarSign,
  Sparkles,
  BarChart3,
  User,
  BookOpen,
  Target,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Briefcase,
  Star,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Helpers ─────────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "bg-green-100 text-green-800";
  if (grade.startsWith("B")) return "bg-blue-100 text-blue-800";
  if (grade.startsWith("C")) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function scoreCell(score: number, target?: number): string {
  if (!target) return "text-gray-900";
  if (score >= target) return "text-green-700 font-semibold";
  if (score >= target - 10) return "text-amber-700";
  return "text-red-600 font-semibold";
}

function gapBadge(gap: number): JSX.Element {
  if (gap <= 0) return <Badge className="bg-green-100 text-green-700 text-xs">达标</Badge>;
  if (gap <= 5) return <Badge className="bg-blue-100 text-blue-700 text-xs">接近</Badge>;
  if (gap <= 15) return <Badge className="bg-amber-100 text-amber-700 text-xs">需提升</Badge>;
  return <Badge className="bg-red-100 text-red-700 text-xs">关键差距</Badge>;
}

function priorityColor(p: string): string {
  if (p === "critical") return "border-red-200 bg-red-50";
  if (p === "important") return "border-amber-200 bg-amber-50";
  if (p === "recommended") return "border-blue-200 bg-blue-50";
  return "border-gray-200 bg-gray-50";
}

function priorityLabel(p: string): string {
  if (p === "critical") return "紧急";
  if (p === "important") return "重要";
  if (p === "recommended") return "推荐";
  return "可选";
}

function priorityBadgeColor(p: string): string {
  if (p === "critical") return "bg-red-100 text-red-700";
  if (p === "important") return "bg-amber-100 text-amber-700";
  if (p === "recommended") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

const PILLAR_CODES = ["T", "S", "D", "C", "K", "L"];
const PILLAR_NAME_KEYS: Record<string, string> = {
  T: "hr.capSystem.pillarT", S: "hr.capSystem.pillarS", D: "hr.capSystem.pillarD",
  C: "hr.capSystem.pillarC", K: "hr.capSystem.pillarK", L: "hr.capSystem.pillarL",
};
const PILLAR_COLORS: Record<string, string> = {
  T: "bg-orange-100 text-orange-700",
  S: "bg-blue-100 text-blue-700",
  D: "bg-green-100 text-green-700",
  C: "bg-purple-100 text-purple-700",
  K: "bg-yellow-100 text-yellow-700",
  L: "bg-pink-100 text-pink-700",
};
const PILLAR_NAMES: Record<string, string> = {
  T: "硬核技术力", S: "软性通用力", D: "设计与创新力",
  C: "沟通协作力", K: "专业标准力", L: "领导与战略力",
};

// ─── Employee Profile Dialog ────────────────────────────────────────

function EmployeeProfileDialog({ employeeId, name }: { employeeId: number; name: string }) {
  const { data: profile, isLoading } = trpc.capabilitySystem.getEmployeeProfile.useQuery({ employeeId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-8 text-gray-400">未找到该员工数据</div>;
  }

  const yearsAtGrt = profile.profile?.hireDate
    ? Math.floor((Date.now() - new Date(profile.profile.hireDate).getTime()) / (365.25 * 86400000))
    : null;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">{profile.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
            <span className="text-sm text-gray-400">{profile.nameEn}</span>
            <Badge className={`${gradeColor(profile.overallGrade)} text-xs ml-auto`}>
              {profile.overallGrade} ({profile.overallScore}分)
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{profile.department} · {profile.roleName}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            {profile.profile?.grtId && (
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profile.profile.grtId}</span>
            )}
            {profile.profile?.grade && (
              <span className="flex items-center gap-1"><Star className="w-3 h-3" />职级 {profile.profile.grade}</span>
            )}
            {yearsAtGrt !== null && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />入职 {yearsAtGrt} 年</span>
            )}
          </div>
        </div>
      </div>

      {/* Performance KPIs */}
      {profile.profile && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border bg-blue-50 border-blue-100">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-blue-600">2026年1月KPI</p>
              <p className="text-xl font-bold text-blue-800">
                {profile.profile.performanceJan2026 !== null ? profile.profile.performanceJan2026 : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border bg-green-50 border-green-100">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-green-600">2025年均绩效</p>
              <p className="text-xl font-bold text-green-800">
                {profile.profile.avg2025 !== null ? profile.profile.avg2025 : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border bg-amber-50 border-amber-100">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-amber-600">2024年均绩效</p>
              <p className="text-xl font-bold text-amber-800">
                {profile.profile.avg2024 !== null ? profile.profile.avg2024 : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Capability Radar (simplified bar chart) */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            能力评估 vs 岗位要求
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.gapAnalysis.map((g: any) => (
            <div key={g.code} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`px-1.5 py-0.5 rounded ${PILLAR_COLORS[g.code]}`}>
                  {g.code} {PILLAR_NAMES[g.code]}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-gray-600">{g.actual}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">{g.target}</span>
                  {gapBadge(g.gap)}
                </span>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    g.gap <= 0 ? "bg-green-500" : g.gap <= 5 ? "bg-blue-500" : g.gap <= 15 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, g.actual)}%` }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-gray-800 opacity-50"
                  style={{ left: `${Math.min(100, g.target)}%` }}
                  title={`目标: ${g.target}`}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Strengths & Improvement */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 优势领域
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {profile.strengths.length > 0 ? profile.strengths.map((s: string, i: number) => (
              <p key={i} className="text-xs text-green-800">{s}</p>
            )) : <p className="text-xs text-gray-400">暂无突出优势</p>}
          </CardContent>
        </Card>
        <Card className="border border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 待提升
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {profile.improvementAreas.length > 0 ? profile.improvementAreas.map((s: string, i: number) => (
              <p key={i} className="text-xs text-amber-800">{s}</p>
            )) : <p className="text-xs text-gray-400">全面达标</p>}
          </CardContent>
        </Card>
      </div>

      {/* Training Plan Preview */}
      {profile.trainingPlan.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-600" />
              推荐培训计划
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.trainingPlan.map((tp: any, i: number) => (
              <div key={i} className={`rounded-lg border p-3 ${priorityColor(tp.priority)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-800">
                    {tp.code} {tp.name}
                  </span>
                  <Badge className={`text-[10px] ${priorityBadgeColor(tp.priority)}`}>
                    {priorityLabel(tp.priority)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {tp.courses.map((c: string, j: number) => (
                    <span key={j} className="text-[10px] bg-white/70 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span>{tp.timeline}</span>
                  <span>{tp.expectedImprovement}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function CapabilitySystemMatrix() {
  const { t } = useLanguage();
  const { currentUserRole } = useUserProfile();
  const roleLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const canAccess = roleLevel >= 3;

  const [department, setDepartment] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number; name: string } | null>(null);

  // Fetch data
  const { data: teamData, isLoading } = trpc.capabilitySystem.getTeamAssessments.useQuery({
    department: department === "all" ? undefined : department,
    search: searchText || undefined,
    userRole: currentUserRole,
  });

  const { data: departments } = trpc.capabilitySystem.getDepartments.useQuery();
  const { data: allCriteria } = trpc.capabilitySystem.getAllRoleCriteria.useQuery();
  const { data: trainingOverview } = trpc.capabilitySystem.getTeamTrainingOverview.useQuery();

  // AI Analysis
  const analysisMutation = trpc.capabilitySystem.aiCompensationAnalysis.useMutation();

  const handleAnalysis = () => {
    analysisMutation.mutate({ userRole: currentUserRole });
    setShowAnalysis(true);
  };

  // ─── RBAC Gate ─────
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t("hr.capSystem.title")}</h1>
              <p className="text-sm text-gray-500">{t("hr.capSystem.accessRestricted")}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-white border shadow-sm max-w-md w-full">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("hr.capSystem.insufficientPermission")}</h2>
              <p className="text-sm text-gray-500 mb-4">{t("hr.capSystem.accessNote")}</p>
              <p className="text-xs text-gray-400">
                {t("hr.capSystem.currentRole")}: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{currentUserRole}</code>
                (Level {roleLevel})
              </p>
              <p className="text-xs text-gray-400 mt-1">{t("hr.capSystem.needLevel3")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const items = teamData?.items || [];
  const criteriaMap = new Map(allCriteria?.map(c => [c.role, c]) || []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Page Header ─── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">GRT六大能力评估矩阵</h1>
              <p className="text-sm text-gray-500">TSDCKL · Feb 2026 · 基于CEO评估数据</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 px-3 py-1">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {items.length} 员工
            </Badge>
            <Button
              onClick={handleAnalysis}
              disabled={analysisMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white gap-2"
            >
              {analysisMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI薪酬能力分析
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ─── Filters ─── */}
        <div className="bg-white rounded-xl border px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索姓名、部门..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-gray-700 w-56 placeholder:text-gray-400"
            />
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-48 border-gray-200">
              <SelectValue placeholder="全部部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            {PILLAR_CODES.map(code => (
              <span key={code} className={`px-2 py-0.5 rounded-full ${PILLAR_COLORS[code]}`}>
                {code}={PILLAR_NAMES[code]}
              </span>
            ))}
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="matrix" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="matrix" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />团队矩阵</TabsTrigger>
            <TabsTrigger value="training" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" />培训计划</TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5"><Award className="w-3.5 h-3.5" />部门概览</TabsTrigger>
          </TabsList>

          {/* ═══════ Tab 1: Team Matrix ═══════ */}
          <TabsContent value="matrix">
            <Card className="bg-white border shadow-sm">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 z-10">员工</th>
                          <th className="text-left px-3 py-3 font-medium text-gray-600">部门</th>
                          <th className="text-left px-3 py-3 font-medium text-gray-600">岗位</th>
                          {PILLAR_CODES.map(code => (
                            <th key={code} className="text-center px-3 py-3 font-medium text-gray-600">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${PILLAR_COLORS[code]}`}>
                                {code}
                              </span>
                            </th>
                          ))}
                          <th className="text-center px-3 py-3 font-medium text-gray-600">综合</th>
                          <th className="text-center px-3 py-3 font-medium text-gray-600">等级</th>
                          <th className="text-center px-3 py-3 font-medium text-gray-600">详情</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((emp: any) => {
                          const roleCriteria = criteriaMap.get(emp.role);
                          return (
                            <tr key={emp.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{emp.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{emp.name}</p>
                                    <p className="text-xs text-gray-400">{emp.nameEn}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-gray-600">{emp.department}</td>
                              <td className="px-3 py-3 text-gray-600 max-w-[160px] truncate">{emp.roleName}</td>
                              {PILLAR_CODES.map(code => {
                                const actual = emp.scores[code] || 0;
                                const target = roleCriteria?.targets[code];
                                return (
                                  <td key={code} className="text-center px-3 py-3">
                                    <span className={`text-sm ${scoreCell(actual, target)}`}>
                                      {actual}
                                    </span>
                                    {target && actual < target && (
                                      <span className="text-xs text-red-400 ml-0.5">↓</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="text-center px-3 py-3">
                                <span className="text-sm font-bold text-gray-900">{emp.overallScore}</span>
                              </td>
                              <td className="text-center px-3 py-3">
                                <Badge className={`${gradeColor(emp.overallGrade)} text-xs font-bold`}>
                                  {emp.overallGrade}
                                </Badge>
                              </td>
                              <td className="text-center px-3 py-3">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                      onClick={() => setSelectedEmployee({ id: emp.employeeId, name: emp.name })}
                                    >
                                      <User className="w-3.5 h-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2 text-base">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        员工能力画像 — {emp.name}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <EmployeeProfileDialog employeeId={emp.employeeId} name={emp.name} />
                                  </DialogContent>
                                </Dialog>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {!isLoading && items.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>未找到评估数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── AI Compensation Analysis ─── */}
            {showAnalysis && analysisMutation.data && (
              <Card className="bg-white border shadow-sm">
                <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bot className="w-5 h-5 text-violet-600" />
                      AI薪酬与能力差距分析
                      <Badge variant="outline" className="ml-2 text-xs border-violet-200 text-violet-600">
                        {analysisMutation.data.aiModel}
                      </Badge>
                    </CardTitle>
                    <span className="text-xs text-gray-400">
                      {new Date(analysisMutation.data.generatedAt).toLocaleString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="py-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-indigo-50 border-indigo-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-indigo-700">{analysisMutation.data.summary.totalEmployees}</p>
                        <p className="text-xs text-indigo-500 mt-1">评估总人数</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-700">{analysisMutation.data.summary.exceeds}</p>
                        <p className="text-xs text-green-500 mt-1">超越标准</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-amber-700">{analysisMutation.data.summary.meets}</p>
                        <p className="text-xs text-amber-500 mt-1">达标</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-100">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-red-700">{analysisMutation.data.summary.below}</p>
                        <p className="text-xs text-red-500 mt-1">低于标准</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-violet-50 border border-violet-200 rounded-lg px-5 py-4 mb-6">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-violet-900 leading-relaxed">
                        {analysisMutation.data.summary.recommendation}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left px-4 py-2.5 font-medium text-gray-600">员工</th>
                          <th className="text-left px-3 py-2.5 font-medium text-gray-600">部门</th>
                          <th className="text-center px-3 py-2.5 font-medium text-gray-600">综合分</th>
                          <th className="text-center px-3 py-2.5 font-medium text-gray-600">等级</th>
                          <th className="text-center px-3 py-2.5 font-medium text-gray-600">平均差距</th>
                          <th className="text-left px-3 py-2.5 font-medium text-gray-600">主要差距</th>
                          <th className="text-left px-3 py-2.5 font-medium text-gray-600">薪酬建议</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisMutation.data.analyses.map((a: any) => (
                          <tr key={a.employeeId} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{a.name}</td>
                            <td className="px-3 py-2.5 text-gray-600">{a.department}</td>
                            <td className="text-center px-3 py-2.5 font-bold">{a.overallScore}</td>
                            <td className="text-center px-3 py-2.5">
                              <Badge className={`${gradeColor(a.overallGrade)} text-xs`}>{a.overallGrade}</Badge>
                            </td>
                            <td className="text-center px-3 py-2.5">
                              <span className={`text-sm font-medium ${
                                a.avgGap <= 0 ? "text-green-600" : a.avgGap <= 5 ? "text-amber-600" : "text-red-600"
                              }`}>
                                {a.avgGap > 0 ? `+${a.avgGap}` : a.avgGap}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1">
                                {a.topGaps.map((g: any, i: number) => (
                                  <span key={i} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                    {g.pillar} ({g.gap > 0 ? `+${g.gap}` : g.gap})
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                {a.adjustmentPercent > 0 ? (
                                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                ) : a.adjustmentPercent < 0 ? (
                                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                ) : (
                                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                )}
                                <span className={`text-xs ${
                                  a.adjustmentPercent > 0 ? "text-green-700" :
                                  a.adjustmentPercent < 0 ? "text-red-600" : "text-gray-600"
                                }`}>
                                  {a.salaryAdjustment}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════ Tab 2: Training Plans ═══════ */}
          <TabsContent value="training">
            {trainingOverview ? (
              <div className="space-y-6">
                {/* Training Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white border">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {trainingOverview.criticalGaps.reduce((s: number, g: any) => s + g.count, 0)}
                          </p>
                          <p className="text-xs text-gray-500">关键能力差距(人次)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {trainingOverview.topTrainingNeeds.length}
                          </p>
                          <p className="text-xs text-gray-500">推荐培训课程</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{trainingOverview.totalEmployees}</p>
                          <p className="text-xs text-gray-500">评估员工总数</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Critical Gaps by Pillar */}
                <Card className="bg-white border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-600" />
                      各能力维度关键差距分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {trainingOverview.criticalGaps.map((g: any) => (
                        <div key={g.code} className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium w-24 text-center ${PILLAR_COLORS[g.code]}`}>
                            {g.code} {PILLAR_NAMES[g.code]}
                          </span>
                          <div className="flex-1">
                            <Progress value={Math.min(100, g.count * 10)} className="h-2" />
                          </div>
                          <span className="text-sm font-bold text-gray-700 w-16 text-right">{g.count} 人</span>
                          <span className="text-xs text-gray-500 w-20 text-right">
                            平均差距 {g.avgGap.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Training Needs */}
                <Card className="bg-white border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-violet-600" />
                      优先培训课程排名
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {trainingOverview.topTrainingNeeds.map((n: any, i: number) => (
                        <div key={i} className={`rounded-lg border p-3 ${
                          n.priority === "critical" ? "border-red-200 bg-red-50" :
                          n.priority === "important" ? "border-amber-200 bg-amber-50" :
                          "border-blue-200 bg-blue-50"
                        }`}>
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium text-gray-800">{n.course}</p>
                            <Badge className={`text-[10px] ${priorityBadgeColor(n.priority)}`}>
                              {priorityLabel(n.priority)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">
                            目标学员: <span className="font-medium">{n.targetEmployees} 人</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}
          </TabsContent>

          {/* ═══════ Tab 3: Department Overview ═══════ */}
          <TabsContent value="overview">
            {trainingOverview?.departmentSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingOverview.departmentSummary.map((dept: any) => (
                  <Card key={dept.dept} className="bg-white border hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span>{dept.dept}</span>
                        <Badge variant="outline" className="text-xs">{dept.count} 人</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">部门均分</span>
                        <span className={`text-lg font-bold ${
                          dept.avgScore >= 75 ? "text-green-700" :
                          dept.avgScore >= 60 ? "text-amber-700" : "text-red-600"
                        }`}>
                          {dept.avgScore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">最弱维度</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${PILLAR_COLORS[dept.weakestPillar]}`}>
                          {dept.weakestPillar} {PILLAR_NAMES[dept.weakestPillar]}
                        </span>
                      </div>
                      <Progress value={dept.avgScore} className="h-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
