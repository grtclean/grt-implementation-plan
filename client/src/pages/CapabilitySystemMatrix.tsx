/**
 * Capability System Matrix — Admin/HR team assessment view
 *
 * M365 Light Theme — Data grid with:
 *   - RBAC gate (manager+ only)
 *   - Full team Feb 2026 TSDCKL scores
 *   - Department filter
 *   - AI Compensation & Performance Analysis button
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ChevronRight,
  Sparkles,
  BarChart3,
} from "lucide-react";

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

const PILLAR_CODES = ["T", "S", "D", "C", "K", "L"];
const PILLAR_NAMES: Record<string, string> = {
  T: "技术力", S: "通用力", D: "创新力", C: "协作力", K: "标准力", L: "领导力",
};
const PILLAR_COLORS: Record<string, string> = {
  T: "bg-orange-100 text-orange-700",
  S: "bg-blue-100 text-blue-700",
  D: "bg-green-100 text-green-700",
  C: "bg-purple-100 text-purple-700",
  K: "bg-yellow-100 text-yellow-700",
  L: "bg-pink-100 text-pink-700",
};

// ─── Main Component ──────────────────────────────────────────────────

export default function CapabilitySystemMatrix() {
  const { currentUserRole } = useUserProfile();
  const roleLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const canAccess = roleLevel >= 3; // dept_manager+

  const [department, setDepartment] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Fetch data
  const { data: teamData, isLoading } = trpc.capabilitySystem.getTeamAssessments.useQuery({
    department: department === "all" ? undefined : department,
    search: searchText || undefined,
    userRole: currentUserRole,
  });

  const { data: departments } = trpc.capabilitySystem.getDepartments.useQuery();
  const { data: allCriteria } = trpc.capabilitySystem.getAllRoleCriteria.useQuery();

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
              <h1 className="text-xl font-semibold text-gray-900">能力系统矩阵</h1>
              <p className="text-sm text-gray-500">Capability System Matrix — Access Restricted</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-white border shadow-sm max-w-md w-full">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">权限不足</h2>
              <p className="text-sm text-gray-500 mb-4">
                此页面仅对 <strong>经理 (Manager)</strong>、<strong>HR</strong> 或 <strong>管理员 (Admin)</strong> 角色开放。
              </p>
              <p className="text-xs text-gray-400">
                当前角色: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{currentUserRole}</code>
                (Level {roleLevel})
              </p>
              <p className="text-xs text-gray-400 mt-1">需要 Level 3+ 权限才能访问团队能力数据</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const items = teamData?.items || [];

  // Build criteria lookup
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
              <h1 className="text-xl font-semibold text-gray-900">能力系统矩阵</h1>
              <p className="text-sm text-gray-500">Capability System Matrix — TSDCKL Team Assessment (Feb 2026)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 px-3 py-1">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {items.length} employees
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
              AI Compensation & Performance Analysis
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
              placeholder="Search name, department..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-gray-700 w-56 placeholder:text-gray-400"
            />
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-48 border-gray-200">
              <SelectValue placeholder="All departments" />
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

        {/* ─── Data Grid ─── */}
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
                          <td className="px-3 py-3 text-gray-600">{emp.roleName}</td>
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
                <p>No assessment data found</p>
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
                  AI Compensation & Performance Analysis
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
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-indigo-50 border-indigo-100">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-700">{analysisMutation.data.summary.totalEmployees}</p>
                    <p className="text-xs text-indigo-500 mt-1">Total Assessed</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">{analysisMutation.data.summary.exceeds}</p>
                    <p className="text-xs text-green-500 mt-1">Exceeds Target</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-700">{analysisMutation.data.summary.meets}</p>
                    <p className="text-xs text-amber-500 mt-1">Meets Target</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-700">{analysisMutation.data.summary.below}</p>
                    <p className="text-xs text-red-500 mt-1">Below Target</p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Summary */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg px-5 py-4 mb-6">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-violet-900 leading-relaxed">
                    {analysisMutation.data.summary.recommendation}
                  </p>
                </div>
              </div>

              {/* Per-employee analysis */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">员工</th>
                      <th className="text-left px-3 py-2.5 font-medium text-gray-600">部门</th>
                      <th className="text-center px-3 py-2.5 font-medium text-gray-600">综合分</th>
                      <th className="text-center px-3 py-2.5 font-medium text-gray-600">等级</th>
                      <th className="text-center px-3 py-2.5 font-medium text-gray-600">Avg Gap</th>
                      <th className="text-left px-3 py-2.5 font-medium text-gray-600">Top Gaps</th>
                      <th className="text-left px-3 py-2.5 font-medium text-gray-600">Salary Recommendation</th>
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
      </div>
    </div>
  );
}
