import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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

const ASSISTANT_TYPE_KEYS: Record<string, string> = {
  general: "ai.provisioning.typeGeneral",
  pm: "ai.provisioning.typePm",
  sales: "ai.provisioning.typeSales",
  engineering: "ai.provisioning.typeEngineering",
  tech: "ai.provisioning.typeTech",
  hr: "ai.provisioning.typeHr",
  finance: "ai.provisioning.typeFinance",
  production: "ai.provisioning.typeProduction",
};

const ROLE_KEYS: Record<string, string> = {
  admin: "ai.provisioning.roleAdmin",
  director: "ai.provisioning.roleDirector",
  bu_gm: "ai.provisioning.roleBuGm",
  bu_pm: "ai.provisioning.roleBuPm",
  bu_sales: "ai.provisioning.roleBuSales",
  bu_mech: "ai.provisioning.roleBuMech",
  bu_elec: "ai.provisioning.roleBuElec",
  procurement_eng: "ai.provisioning.roleProcurement",
  cs_engineer: "ai.provisioning.roleCsEngineer",
  dept_manager: "ai.provisioning.roleDeptManager",
  team_lead: "ai.provisioning.roleTeamLead",
  hr_manager: "ai.provisioning.roleHrManager",
  hr_specialist: "ai.provisioning.roleHrSpecialist",
  finance_manager: "ai.provisioning.roleFinanceManager",
  finance_specialist: "ai.provisioning.roleFinanceSpecialist",
  production_worker: "ai.provisioning.roleProductionWorker",
  employee: "ai.provisioning.roleEmployee",
};

export default function AiAssistantProvisioning() {
  const { t } = useLanguage();
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
  const reprovisionAllMut = trpc.employeeAiAssistant.reprovisionAll.useMutation({
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
            <h1 className="text-xl font-semibold">{t("ai.provisioning.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("ai.provisioning.description")}
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
                <p className="text-xs text-muted-foreground">{t("ai.provisioning.totalEmployees")}</p>
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
                <p className="text-xs text-muted-foreground">{t("ai.provisioning.provisioned")}</p>
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
                <p className="text-xs text-muted-foreground">{t("ai.provisioning.pending")}</p>
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
                <p className="text-xs text-muted-foreground">{t("ai.provisioning.provisionRate")}</p>
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
              {t("ai.provisioning.provisionAll")}
            </Button>
            <Button
              onClick={() => reprovisionAllMut.mutate()}
              disabled={reprovisionAllMut.isPending}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {reprovisionAllMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              重新配置(真实名录)
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
              {t("ai.provisioning.refreshPresets")}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setPage(0); }}
              >
                <option value="">{t("ai.provisioning.allDepartments")}</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("ai.provisioning.searchPlaceholder")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 w-48"
                />
              </div>
            </div>
          </div>

          {/* Mutation results */}
          {reprovisionAllMut.data && (
            <div className="mt-3 rounded-md bg-orange-50 dark:bg-orange-950 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-600" />
                <span>
                  重新配置完成：已创建 <strong>{reprovisionAllMut.data.created}</strong> 个AI助理（真实员工名录）
                  {reprovisionAllMut.data.errors.length > 0 && (
                    <span className="text-red-600 ml-2">
                      {reprovisionAllMut.data.errors.length} 个错误
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
          {provisionAllMut.data && (
            <div className="mt-3 rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>
                  {t("ai.provisioning.provisionDone")} <strong>{provisionAllMut.data.created}</strong>{t("ai.provisioning.created")}
                  {t("ai.provisioning.skipped")} <strong>{provisionAllMut.data.skipped}</strong>{t("ai.provisioning.errors")}
                  {provisionAllMut.data.errors.length > 0 && (
                    <span className="text-red-600">
                      {t("ai.provisioning.errorCount")} {provisionAllMut.data.errors.length}{t("ai.provisioning.errors")}
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
                  {t("ai.provisioning.presetRefreshDone")} <strong>{refreshPresetsMut.data.created}</strong>{t("ai.provisioning.created")}
                  {t("ai.provisioning.skipped")} <strong>{refreshPresetsMut.data.skipped}</strong>{t("ai.provisioning.errors")}
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
            <CardTitle className="text-sm font-medium">{t("ai.provisioning.deptOverview")}</CardTitle>
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
            {t("ai.provisioning.assistantList")}
            {list && <Badge variant="secondary">{list.total} {t("ai.provisioning.records")}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colEmpCode")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colName")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colDept")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colPosition")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colAssistantName")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colRolePreset")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colType")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colStatus")}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t("ai.provisioning.colAction")}</th>
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
                        {ROLE_KEYS[(item as any).rolePreset] ? t(ROLE_KEYS[(item as any).rolePreset]) : (item as any).rolePreset || "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className="text-xs">
                        {ASSISTANT_TYPE_KEYS[item.assistantType || "general"] ? t(ASSISTANT_TYPE_KEYS[item.assistantType || "general"]) : item.assistantType}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.status === "active" ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t("ai.provisioning.statusActive")}
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
                        {t("ai.provisioning.reprovision")}
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!list || list.items.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p>{t("ai.provisioning.noRecords")}</p>
                        <p className="text-xs">{t("ai.provisioning.noRecordsHint")}</p>
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
                {t("ai.provisioning.pageInfo").replace("{start}", String(page * PAGE_SIZE + 1)).replace("{end}", String(Math.min((page + 1) * PAGE_SIZE, list.total))).replace("{total}", String(list.total))}
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
