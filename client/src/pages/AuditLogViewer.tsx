/**
 * 审计日志查看界面
 * 支持查看敏感数据访问记录、权限变更历史、统计分析和导出功能
 */

import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Shield,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// 模块名称映射
const MODULE_NAMES: Record<string, string> = {
  hrm_salary_detail: "员工薪资明细",
  hrm_employee_id: "员工身份信息",
  hrm_ai_interview: "AI面试系统",
  hrm_performance: "绩效管理",
  hrm_candidate: "候选人管理",
  hrm_position: "岗位管理",
  hrm_training: "培训管理",
  pm_project: "项目管理",
  pm_milestone: "里程碑管理",
  crm_customer: "客户管理",
  crm_opportunity: "商机管理",
  system_user: "用户管理",
  system_role: "角色管理",
  system_audit: "审计日志",
};

// 操作类型映射
const OPERATION_NAMES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  read: { label: "查看", color: "bg-blue-500/10 text-blue-500", icon: <Eye className="w-4 h-4" /> },
  write: { label: "修改", color: "bg-orange-500/10 text-orange-500", icon: <Edit className="w-4 h-4" /> },
  delete: { label: "删除", color: "bg-red-500/10 text-red-500", icon: <Trash2 className="w-4 h-4" /> },
};

// 变更类型映射
const CHANGE_TYPE_NAMES: Record<string, { label: string; color: string }> = {
  role_added: { label: "添加角色", color: "bg-green-500/10 text-green-500" },
  role_removed: { label: "移除角色", color: "bg-red-500/10 text-red-500" },
  permission_changed: { label: "权限变更", color: "bg-orange-500/10 text-orange-500" },
};

export default function AuditLogViewer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("access-logs");
  
  // 访问日志筛选条件
  const [accessFilters, setAccessFilters] = useState({
    userId: undefined as number | undefined,
    moduleId: undefined as string | undefined,
    operation: undefined as "read" | "write" | "delete" | undefined,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    limit: 20,
    offset: 0,
  });
  
  // 权限变更筛选条件
  const [changeFilters, setChangeFilters] = useState({
    userId: undefined as number | undefined,
    changeType: undefined as "role_added" | "role_removed" | "permission_changed" | undefined,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    limit: 20,
    offset: 0,
  });

  // 查询审计日志
  const auditLogs = (trpc.permission.getAuditLogs as any).useQuery(accessFilters, {
    enabled: activeTab === "access-logs",
  });

  // 查询权限变更历史
  const permissionHistory = (trpc.permission as any).getPermissionChangeHistory.useQuery(changeFilters, {
    enabled: activeTab === "permission-history",
  });

  // 查询统计数据
  const auditStats = (trpc.permission as any).getAuditStatistics.useQuery({
    startDate: accessFilters.startDate,
    endDate: accessFilters.endDate,
  }, {
    enabled: activeTab === "statistics",
  });

  // 导出CSV
  const handleExportCSV = async () => {
    try {
      const logs = auditLogs.data?.logs || [];
      if (logs.length === 0) {
        toast.error("没有可导出的数据");
        return;
      }

      const headers = ["ID", "用户ID", "用户名", "模块", "数据类型", "数据ID", "操作", "IP地址", "结果", "访问时间"];
      const rows = logs.map((log) => [
        log.id,
        log.userId,
        log.userName,
        MODULE_NAMES[log.moduleId] || log.moduleId,
        log.dataType,
        log.dataId,
        OPERATION_NAMES[log.operation]?.label || log.operation,
        log.ipAddress || "",
        log.result,
        new Date(log.accessTime).toLocaleString("zh-CN"),
      ]);

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch (error) {
      toast.error("导出失败");
    }
  };

  // 分页处理
  const handlePageChange = (direction: "prev" | "next", type: "access" | "change") => {
    if (type === "access") {
      setAccessFilters((prev) => ({
        ...prev,
        offset: direction === "prev" 
          ? Math.max(0, prev.offset - prev.limit)
          : prev.offset + prev.limit,
      }));
    } else {
      setChangeFilters((prev) => ({
        ...prev,
        offset: direction === "prev"
          ? Math.max(0, prev.offset - prev.limit)
          : prev.offset + prev.limit,
      }));
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Shield}
          title="审计日志管理"
          description="查看敏感数据访问记录、权限变更历史和安全统计分析"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                auditLogs.refetch();
                permissionHistory.refetch();
                auditStats.refetch();
              }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                导出CSV
              </Button>
            </div>
          }
        />

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="access-logs" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              访问日志
            </TabsTrigger>
            <TabsTrigger value="permission-history" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              权限变更
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              统计分析
            </TabsTrigger>
          </TabsList>

          {/* 访问日志 */}
          <TabsContent value="access-logs" className="space-y-4">
            <AccessLogsTab
              logs={auditLogs.data?.logs || []}
              total={(auditLogs.data as any)?.total || 0}
              isLoading={auditLogs.isLoading}
              filters={accessFilters}
              setFilters={setAccessFilters}
              onPageChange={(dir) => handlePageChange(dir, "access")}
            />
          </TabsContent>

          {/* 权限变更历史 */}
          <TabsContent value="permission-history" className="space-y-4">
            <PermissionHistoryTab
              history={permissionHistory.data?.history || []}
              total={permissionHistory.data?.total || 0}
              isLoading={permissionHistory.isLoading}
              filters={changeFilters}
              setFilters={setChangeFilters}
              onPageChange={(dir) => handlePageChange(dir, "change")}
            />
          </TabsContent>

          {/* 统计分析 */}
          <TabsContent value="statistics" className="space-y-4">
            <StatisticsTab
              stats={auditStats.data}
              isLoading={auditStats.isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// 访问日志标签页组件
function AccessLogsTab({
  logs,
  total,
  isLoading,
  filters,
  setFilters,
  onPageChange,
}: {
  logs: any[];
  total: number;
  isLoading: boolean;
  filters: any;
  setFilters: (fn: (prev: any) => any) => void;
  onPageChange: (dir: "prev" | "next") => void;
}) {
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <>
      {/* 筛选栏 */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户ID..."
                  className="w-40"
                  type="number"
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : undefined;
                    setFilters((prev: any) => ({ ...prev, userId: val, offset: 0 }));
                  }}
                />
              </div>
              <Select
                value={filters.moduleId || "all"}
                onValueChange={(v) => setFilters((prev: any) => ({ ...prev, moduleId: v === "all" ? undefined : v, offset: 0 }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="选择模块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模块</SelectItem>
                  {Object.entries(MODULE_NAMES).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.operation || "all"}
                onValueChange={(v) => setFilters((prev: any) => ({ ...prev, operation: v === "all" ? undefined : v as any, offset: 0 }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部操作</SelectItem>
                  <SelectItem value="read">查看</SelectItem>
                  <SelectItem value="write">修改</SelectItem>
                  <SelectItem value="delete">删除</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                共 {total} 条记录
              </span>
              <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    高级筛选
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>高级筛选</DialogTitle>
                    <DialogDescription>设置日期范围和其他筛选条件</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>开始日期</Label>
                        <Input
                          type="date"
                          onChange={(e) => setTempFilters((prev: any) => ({
                            ...prev,
                            startDate: e.target.value ? new Date(e.target.value) : undefined,
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>结束日期</Label>
                        <Input
                          type="date"
                          onChange={(e) => setTempFilters((prev: any) => ({
                            ...prev,
                            endDate: e.target.value ? new Date(e.target.value) : undefined,
                          }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>每页显示</Label>
                      <Select
                        value={tempFilters.limit.toString()}
                        onValueChange={(v) => setTempFilters((prev: any) => ({ ...prev, limit: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10条</SelectItem>
                          <SelectItem value="20">20条</SelectItem>
                          <SelectItem value="50">50条</SelectItem>
                          <SelectItem value="100">100条</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
                      取消
                    </Button>
                    <Button onClick={() => {
                      setFilters((prev: any) => ({ ...prev, ...tempFilters, offset: 0 }));
                      setShowFilterDialog(false);
                    }}>
                      应用筛选
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            敏感数据访问记录
          </CardTitle>
          <CardDescription>
            记录所有敏感数据的访问、修改和删除操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无记录</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${OPERATION_NAMES[log.operation]?.color || "bg-muted"}`}>
                        {OPERATION_NAMES[log.operation]?.icon || <Eye className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.userName || `用户#${log.userId}`}</span>
                          <Badge variant="outline" className={OPERATION_NAMES[log.operation]?.color}>
                            {OPERATION_NAMES[log.operation]?.label || log.operation}
                          </Badge>
                          <span className="text-muted-foreground">了</span>
                          <Badge variant="secondary">
                            {MODULE_NAMES[log.moduleId] || log.moduleId}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {log.dataType}: {log.dataId}
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center gap-1">
                              IP: {log.ipAddress}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.accessTime).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={log.result === "success" ? "default" : "destructive"}>
                      {log.result === "success" ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" />成功</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 mr-1" />拒绝</>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                第 {currentPage} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange("prev")}
                  disabled={filters.offset === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange("next")}
                  disabled={filters.offset + filters.limit >= total}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// 权限变更历史标签页组件
function PermissionHistoryTab({
  history,
  total,
  isLoading,
  filters,
  setFilters,
  onPageChange,
}: {
  history: any[];
  total: number;
  isLoading: boolean;
  filters: any;
  setFilters: (fn: (prev: any) => any) => void;
  onPageChange: (dir: "prev" | "next") => void;
}) {
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <>
      {/* 筛选栏 */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select
                value={filters.changeType || "all"}
                onValueChange={(v) => setFilters((prev: any) => ({ 
                  ...prev, 
                  changeType: v === "all" ? undefined : v as any,
                  offset: 0 
                }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="变更类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="role_added">添加角色</SelectItem>
                  <SelectItem value="role_removed">移除角色</SelectItem>
                  <SelectItem value="permission_changed">权限变更</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground">
              共 {total} 条记录
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 变更历史列表 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            权限变更历史
          </CardTitle>
          <CardDescription>
            记录所有用户角色和权限的变更操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无记录</div>
          ) : (
            <div className="space-y-3">
              {history.map((change) => (
                <div
                  key={change.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${CHANGE_TYPE_NAMES[change.changeType]?.color || "bg-muted"}`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{change.modifierName || `操作人#${change.modifierId}`}</span>
                          <Badge variant="outline" className={CHANGE_TYPE_NAMES[change.changeType]?.color}>
                            {CHANGE_TYPE_NAMES[change.changeType]?.label || change.changeType}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{change.targetUserName || `用户#${change.targetUserId}`}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {change.oldValue && (
                            <span className="text-red-500 line-through">{change.oldValue}</span>
                          )}
                          {change.oldValue && change.newValue && (
                            <span className="text-muted-foreground">→</span>
                          )}
                          {change.newValue && (
                            <span className="text-green-500">{change.newValue}</span>
                          )}
                        </div>
                        {change.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            原因: {change.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(change.changeTime).toLocaleString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                第 {currentPage} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange("prev")}
                  disabled={filters.offset === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange("next")}
                  disabled={filters.offset + filters.limit >= total}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// 统计分析标签页组件
function StatisticsTab({
  stats,
  isLoading,
}: {
  stats: any;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalAccess || 0}</p>
                <p className="text-sm text-muted-foreground">总访问次数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.byOperation?.find((o: any) => o.operation === "read")?.count || 0}
                </p>
                <p className="text-sm text-muted-foreground">查看操作</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Edit className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.byOperation?.find((o: any) => o.operation === "write")?.count || 0}
                </p>
                <p className="text-sm text-muted-foreground">修改操作</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.byOperation?.find((o: any) => o.operation === "delete")?.count || 0}
                </p>
                <p className="text-sm text-muted-foreground">删除操作</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按模块统计 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            按模块统计
          </CardTitle>
          <CardDescription>各模块的访问频率统计</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.byModule?.length > 0 ? (
            <div className="space-y-3">
              {stats.byModule.map((item: any, index: number) => {
                const maxCount = stats.byModule[0]?.count || 1;
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={item.moduleId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{MODULE_NAMES[item.moduleId] || item.moduleId}</span>
                      <span className="text-muted-foreground">{item.count} 次</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>

      {/* 按用户统计 */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            活跃用户排行
          </CardTitle>
          <CardDescription>访问敏感数据最频繁的用户</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.byUser?.length > 0 ? (
            <div className="space-y-3">
              {stats.byUser.map((item: any, index: number) => (
                <div
                  key={item.userId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? "bg-yellow-500" :
                      index === 1 ? "bg-gray-400" :
                      index === 2 ? "bg-orange-600" :
                      "bg-muted"
                    } text-white font-bold text-sm`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.userName || `用户#${item.userId}`}</p>
                      <p className="text-xs text-muted-foreground">ID: {item.userId}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{item.count} 次访问</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
