import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Zap,
  UserCog,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

const ASSISTANT_TYPE_LABELS: Record<string, string> = {
  general: "通用",
  pm: "项目管理",
  sales: "销售",
  engineering: "工程",
  tech: "技术",
  hr: "人力资源",
  finance: "财务",
  production: "生产",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "系统管理员",
  director: "总监",
  bu_gm: "事业部总经理",
  bu_pm: "项目经理",
  bu_sales: "销售工程师",
  bu_mech: "机械工程师",
  bu_elec: "电气工程师",
  procurement_eng: "采购工程师",
  cs_engineer: "客服工程师",
  dept_manager: "部门经理",
  team_lead: "组长/主管",
  hr_manager: "HR经理",
  hr_specialist: "HR专员",
  finance_manager: "财务经理",
  finance_specialist: "财务专员",
  production_worker: "产线员工",
  employee: "员工",
};

export default function AiAssistantProvisioning() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // tRPC Queries
  const statusQuery = trpc.employeeAiAssistant.getProvisioningStatus.useQuery();
  const listQuery = trpc.employeeAiAssistant.listAllAssistants.useQuery({
    search: search || undefined,
    department: department || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // tRPC Mutations
  const provisionAllMut = trpc.employeeAiAssistant.provisionAll.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      listQuery.refetch();
    },
  });
  const provisionOneMut = trpc.employeeAiAssistant.provisionOne.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      listQuery.refetch();
    },
  });
  const refreshPresetsMut = trpc.employeeAiAssistant.refreshPresets.useMutation({
    onSuccess: () => {
      listQuery.refetch();
    },
  });

  const status = statusQuery.data;
  const list = listQuery.data;

  // 部门列表（从status数据）
  const departments = status ? Object.keys(status.byDepartment).sort() : [];

  const provisionRate = status && status.totalEmployees > 0
    ? Math.round((status.provisionedCount / status.totalEmployees) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI助理配置中心</h1>
            <p className="text-sm text-muted-foreground">
              自动为每位员工配置基于岗位的AI助理
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">总员工数</p>
                <p className="text-xl font-bold">{status?.totalEmployees ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">已配置</p>
                <p className="text-xl font-bold">{status?.provisionedCount ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">待配置</p>
                <p className="text-xl font-bold">{status?.pendingCount ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">配置率</p>
                <p className="text-xl font-bold">{provisionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => provisionAllMut.mutate()}
              disabled={provisionAllMut.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {provisionAllMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              一键配置所有员工
            </Button>
            <Button
              variant="outline"
              onClick={() => refreshPresetsMut.mutate({})}
              disabled={refreshPresetsMut.isPending}
            >
              {refreshPresetsMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              刷新预设
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setPage(0); }}
              >
                <option value="">全部部门</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名/工卡号..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 w-48"
                />
              </div>
            </div>
          </div>

          {/* Mutation results */}
          {provisionAllMut.data && (
            <div className="mt-3 rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>
                  配置完成：新建 <strong>{provisionAllMut.data.created}</strong> 个，
                  跳过 <strong>{provisionAllMut.data.skipped}</strong> 个
                  {provisionAllMut.data.errors.length > 0 && (
                    <span className="text-red-600">
                      ，错误 {provisionAllMut.data.errors.length} 个
                    </span>
                  )}
                </span>
              </div>
              {provisionAllMut.data.errors.length > 0 && (
                <ul className="mt-1 ml-6 text-xs text-red-500">
                  {provisionAllMut.data.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {refreshPresetsMut.data && (
            <div className="mt-3 rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-green-600" />
                <span>
                  预设刷新完成：更新 <strong>{refreshPresetsMut.data.created}</strong> 个，
                  跳过 <strong>{refreshPresetsMut.data.skipped}</strong> 个
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      {status && Object.keys(status.byDepartment).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">部门配置概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {Object.entries(status.byDepartment)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([dept, stats]) => (
                  <div
                    key={dept}
                    className="rounded-lg border p-2.5 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => { setDepartment(dept); setPage(0); }}
                  >
                    <p className="text-xs text-muted-foreground truncate">{dept}</p>
                    <p className="text-lg font-semibold mt-0.5">
                      {stats.provisioned}/{stats.total}
                    </p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${stats.total > 0 ? (stats.provisioned / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assistants Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            AI助理列表
            {list && <Badge variant="secondary">{list.total} 条</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-medium">工卡号</th>
                  <th className="px-4 py-2.5 text-left font-medium">姓名</th>
                  <th className="px-4 py-2.5 text-left font-medium">部门</th>
                  <th className="px-4 py-2.5 text-left font-medium">岗位</th>
                  <th className="px-4 py-2.5 text-left font-medium">AI助理名称</th>
                  <th className="px-4 py-2.5 text-left font-medium">角色预设</th>
                  <th className="px-4 py-2.5 text-left font-medium">类型</th>
                  <th className="px-4 py-2.5 text-left font-medium">状态</th>
                  <th className="px-4 py-2.5 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list?.items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {item.empCode || "-"}
                    </td>
                    <td className="px-4 py-2.5">{item.empName || "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {item.empDept || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {item.empPosition || "-"}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-blue-500" />
                        {item.assistantName}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[(item as any).rolePreset] || (item as any).rolePreset || "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className="text-xs">
                        {ASSISTANT_TYPE_LABELS[item.assistantType || "general"] || item.assistantType}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.status === "active" ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          活跃
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {item.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => provisionOneMut.mutate({ employeeId: item.employeeId })}
                        disabled={provisionOneMut.isPending}
                      >
                        {provisionOneMut.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        重新配置
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!list || list.items.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>暂无AI助理记录</p>
                        <p className="text-xs">点击「一键配置所有员工」开始</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {list && list.total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                第 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, list.total)} 条，
                共 {list.total} 条
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= list.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
