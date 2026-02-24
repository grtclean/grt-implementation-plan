/**
 * 员工离职数据管理 (Employee Offboarding Management)
 * 
 * 功能：
 * 1. 离职记录列表与统计概览
 * 2. 创建离职记录（含顶替者/新岗位标注）
 * 3. 工作交接清单管理
 * 4. 绩效归属处理（离职前/后标注，主管确认贡献比例）
 * 5. 资产/Profile/邮件/电话交接
 * 6. 多级审批流程（主管→HR→财务→IT）
 * 7. 离职员工数据查询（按周期过滤，标注已离职）
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Laptop,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================
// 类型定义
// ============================================================

type OffboardingStatus = 'draft' | 'in_progress' | 'approval_complete' | 'completed' | 'cancelled';
type ApprovalStatus = 'draft' | 'pending_supervisor' | 'pending_hr' | 'pending_finance' | 'pending_it' | 'approved' | 'cancelled' | 'completed';

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "草稿", variant: "secondary" },
  in_progress: { label: "审批中", variant: "default" },
  approval_complete: { label: "审批完成", variant: "outline" },
  completed: { label: "已完成", variant: "default" },
  cancelled: { label: "已取消", variant: "destructive" },
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  pending_supervisor: "等待主管审批",
  pending_hr: "等待HR审批",
  pending_finance: "等待财务审批",
  pending_it: "等待IT审批",
  approved: "已批准",
  cancelled: "已取消",
  completed: "已完成",
};

const REASON_LABELS: Record<string, string> = {
  resignation: "主动辞职",
  termination: "解除合同",
  retirement: "退休",
  contract_end: "合同到期",
  mutual_agreement: "协商解除",
  other: "其他",
};

const SUCCESSOR_TYPE_LABELS: Record<string, string> = {
  replacement: "顶替者",
  new_position: "新岗位",
  backup: "Backup接替",
  none: "暂无",
};

// ============================================================
// 主组件
// ============================================================

export default function EmployeeOffboarding() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOffboarding, setSelectedOffboarding] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 数据查询
  const statsQuery = trpc.offboarding.stats.useQuery();
  const listQuery = trpc.offboarding.list.useQuery({
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: 1,
    pageSize: 50,
  });

  return (
      <div className="flex-1 space-y-6 p-6">
        {/* 页面标题 */}
        <PageHeader
          icon={UserMinus}
          title={t("hr.offboard.title")}
          description={t("hr.offboard.description")}
          actions={
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("hr.offboard.createRecord")}
            </Button>
          }
        />

        {/* 统计概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={Users} label={t("hr.offboard.total")} value={statsQuery.data?.total || 0} />
          <StatCard icon={FileText} label={t("hr.offboard.draft")} value={statsQuery.data?.draft || 0} />
          <StatCard icon={Clock} label={t("hr.offboard.inProgress")} value={statsQuery.data?.inProgress || 0} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={CheckCircle2} label={t("hr.offboard.completed")} value={statsQuery.data?.completed || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={XCircle} label={t("hr.offboard.cancelled")} value={statsQuery.data?.cancelled || 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t("hr.offboard.tab.records")}</TabsTrigger>
            <TabsTrigger value="handover">{t("hr.offboard.tab.handover")}</TabsTrigger>
            <TabsTrigger value="performance">{t("hr.offboard.tab.performance")}</TabsTrigger>
            <TabsTrigger value="query">{t("hr.offboard.tab.query")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OffboardingList
              data={listQuery.data}
              isLoading={listQuery.isLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onSelect={setSelectedOffboarding}
              selectedId={selectedOffboarding}
            />
          </TabsContent>

          <TabsContent value="handover" className="space-y-4">
            {selectedOffboarding ? (
              <HandoverSection offboardingId={selectedOffboarding} />
            ) : (
              <EmptyState message={t("hr.offboard.selectRecordFirst")} />
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {selectedOffboarding ? (
              <PerformanceSection offboardingId={selectedOffboarding} />
            ) : (
              <EmptyState message={t("hr.offboard.selectRecordFirst")} />
            )}
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <DataQuerySection />
          </TabsContent>
        </Tabs>

        {/* 创建离职记录对话框 */}
        <CreateOffboardingDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            listQuery.refetch();
            statsQuery.refetch();
          }}
        />

        {/* 离职详情对话框 */}
        {selectedOffboarding && (
          <OffboardingDetailPanel
            offboardingId={selectedOffboarding}
            onClose={() => setSelectedOffboarding(null)}
            onRefresh={() => {
              listQuery.refetch();
              statsQuery.refetch();
            }}
          />
        )}
      </div>
  );
}

// ============================================================
// 离职记录列表
// ============================================================

function OffboardingList({
  data,
  isLoading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onSelect,
  selectedId,
}: {
  data: any;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onSelect: (id: number) => void;
  selectedId: number | null;
}) {
  return (
    <div className="space-y-4">
      {/* 搜索和过滤 */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索员工姓名、部门、岗位..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="in_progress">审批中</SelectItem>
            <SelectItem value="approval_complete">审批完成</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      ) : data?.items?.length === 0 ? (
        <EmptyState message="暂无离职记录" />
      ) : (
        <div className="space-y-2">
          {data?.items?.map((item: any) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedId === item.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.employeeName}</span>
                        <Badge variant={STATUS_LABELS[item.status]?.variant || "secondary"}>
                          {STATUS_LABELS[item.status]?.label || item.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                        <span>{item.department}</span>
                        <span>·</span>
                        <span>{item.position}</span>
                        <span>·</span>
                        <span>{REASON_LABELS[item.reason] || item.reason}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">离职日期</div>
                    <div className="font-medium">{item.offboardingDate}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {SUCCESSOR_TYPE_LABELS[item.successorType]}: {item.successorName || '待定'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 创建离职记录对话框
// ============================================================

function CreateOffboardingDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [employeeSearchKeyword, setEmployeeSearchKeyword] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // 简道云+本地员工搜索
  const employeeSearchQuery = trpc.offboarding.searchEmployees.useQuery(
    { keyword: employeeSearchKeyword },
    { enabled: employeeSearchKeyword.length >= 1, staleTime: 5000 }
  );

  const handleSelectEmployee = (emp: any) => {
    setFormData(prev => ({
      ...prev,
      employeeId: emp.id || 0,
      employeeName: emp.name || emp.employeeName || "",
      department: emp.department || "",
      position: emp.position || "",
      hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : "",
      companyPhone: emp.phone || "",
    }));
    setShowEmployeeDropdown(false);
    setEmployeeSearchKeyword("");
    toast.success(`已自动填充员工信息: ${emp.name}`);
  };

  const [formData, setFormData] = useState({
    employeeId: 0,
    employeeName: "",
    department: "",
    position: "",
    hireDate: "",
    offboardingDate: "",
    lastWorkingDate: "",
    reason: "resignation" as const,
    reasonDetail: "",
    successorType: "replacement" as const,
    successorName: "",
    backupPersonName: "",
    dataRetentionPolicy: "permanent" as const,
    performanceDataHandling: "keep_under_original" as const,
    profileHandling: "archive" as const,
    phoneHandling: "return_to_pool" as const,
    companyPhone: "",
    emailHandling: "forward_to_successor" as const,
    emailForwardTo: "",
    emailForwardDuration: 90,
    notes: "",
  });

  const createMutation = trpc.offboarding.create.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || "离职记录创建成功");
      onOpenChange(false);
      onSuccess();
      // Reset form
      setFormData({
        employeeId: 0,
        employeeName: "",
        department: "",
        position: "",
        hireDate: "",
        offboardingDate: "",
        lastWorkingDate: "",
        reason: "resignation",
        reasonDetail: "",
        successorType: "replacement",
        successorName: "",
        backupPersonName: "",
        dataRetentionPolicy: "permanent",
        performanceDataHandling: "keep_under_original",
        profileHandling: "archive",
        phoneHandling: "return_to_pool",
        companyPhone: "",
        emailHandling: "forward_to_successor",
        emailForwardTo: "",
        emailForwardDuration: 90,
        notes: "",
      });
    },
    onError: (err) => {
      toast.error("创建失败: " + err.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.employeeName || !formData.department || !formData.position || !formData.offboardingDate || !formData.lastWorkingDate) {
      toast.error("请填写必填字段");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5" />
            新建员工离职记录
          </DialogTitle>
          <DialogDescription>
            填写离职员工信息、顶替者/新岗位、数据保留策略和资产交接方案
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 员工搜索自动填充 */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" />
              快速搜索员工（简道云 + 本地数据库）
            </h3>
            <div className="relative">
              <Input
                value={employeeSearchKeyword}
                onChange={(e) => {
                  setEmployeeSearchKeyword(e.target.value);
                  setShowEmployeeDropdown(true);
                }}
                onFocus={() => employeeSearchKeyword && setShowEmployeeDropdown(true)}
                placeholder="输入员工姓名、工号或部门搜索，自动填充信息..."
                className="pr-10"
              />
              {employeeSearchQuery.isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Clock className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {showEmployeeDropdown && employeeSearchQuery.data && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {employeeSearchQuery.data.localEmployees.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        本地员工数据库 ({employeeSearchQuery.data.totalLocal})
                      </div>
                      {employeeSearchQuery.data.localEmployees.map((emp: any) => (
                        <div
                          key={`local-${emp.id}`}
                          className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between text-sm"
                          onClick={() => handleSelectEmployee(emp)}
                        >
                          <div>
                            <span className="font-medium">{emp.name}</span>
                            <span className="text-muted-foreground ml-2">{emp.employeeId}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {emp.department} · {emp.position}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {employeeSearchQuery.data.jiandaoyunMembers.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-t border-border">
                        简道云员工 ({employeeSearchQuery.data.totalJiandaoyun})
                      </div>
                      {employeeSearchQuery.data.jiandaoyunMembers.map((emp: any, idx: number) => (
                        <div
                          key={`jdy-${idx}`}
                          className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between text-sm"
                          onClick={() => handleSelectEmployee({ name: emp.name, department: '', position: '' })}
                        >
                          <div>
                            <span className="font-medium">{emp.name}</span>
                            <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">简道云</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {emp.username}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {employeeSearchQuery.data.totalLocal === 0 && employeeSearchQuery.data.totalJiandaoyun === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      未找到匹配的员工，请手动填写下方表单
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.employeeName && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                已选择: {formData.employeeName} ({formData.department} - {formData.position})
              </p>
            )}
          </div>

          {/* 基本信息 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>员工姓名 *</Label>
                <Input
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  placeholder="输入员工姓名或使用上方搜索自动填充"
                />
              </div>
              <div className="space-y-2">
                <Label>员工ID</Label>
                <Input
                  type="number"
                  value={formData.employeeId || ""}
                  onChange={(e) => setFormData({ ...formData, employeeId: parseInt(e.target.value) || 0 })}
                  placeholder="系统员工ID"
                />
              </div>
              <div className="space-y-2">
                <Label>部门 *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="所属部门"
                />
              </div>
              <div className="space-y-2">
                <Label>岗位 *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="岗位名称"
                />
              </div>
              <div className="space-y-2">
                <Label>入职日期</Label>
                <Input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>离职原因 *</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(v: any) => setFormData({ ...formData, reason: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">主动辞职</SelectItem>
                    <SelectItem value="termination">解除合同</SelectItem>
                    <SelectItem value="retirement">退休</SelectItem>
                    <SelectItem value="contract_end">合同到期</SelectItem>
                    <SelectItem value="mutual_agreement">协商解除</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>离职日期 *</Label>
                <Input
                  type="date"
                  value={formData.offboardingDate}
                  onChange={(e) => setFormData({ ...formData, offboardingDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>最后工作日 *</Label>
                <Input
                  type="date"
                  value={formData.lastWorkingDate}
                  onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 顶替者/继任者信息 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              顶替者 / 继任者信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>继任方式 *</Label>
                <Select
                  value={formData.successorType}
                  onValueChange={(v: any) => setFormData({ ...formData, successorType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replacement">顶替者（已有人选）</SelectItem>
                    <SelectItem value="new_position">新岗位（重新招聘）</SelectItem>
                    <SelectItem value="backup">Backup接替</SelectItem>
                    <SelectItem value="none">暂无安排</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>顶替者/继任者姓名</Label>
                <Input
                  value={formData.successorName}
                  onChange={(e) => setFormData({ ...formData, successorName: e.target.value })}
                  placeholder="人事注明顶替者姓名或新岗位说明"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Backup人员姓名</Label>
                <Input
                  value={formData.backupPersonName}
                  onChange={(e) => setFormData({ ...formData, backupPersonName: e.target.value })}
                  placeholder="临时接替工作的Backup人员"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 数据保留与绩效处理 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              数据保留与绩效处理
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>数据保留策略</Label>
                <Select
                  value={formData.dataRetentionPolicy}
                  onValueChange={(v: any) => setFormData({ ...formData, dataRetentionPolicy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">永久保留</SelectItem>
                    <SelectItem value="archive_after_year">1年后归档</SelectItem>
                    <SelectItem value="archive_after_3years">3年后归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>绩效数据处理</Label>
                <Select
                  value={formData.performanceDataHandling}
                  onValueChange={(v: any) => setFormData({ ...formData, performanceDataHandling: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep_under_original">保留在离职者名下</SelectItem>
                    <SelectItem value="transfer_to_successor">转移给继任者</SelectItem>
                    <SelectItem value="split_by_date">按日期拆分</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              离职日前的绩效数据默认保留在离职者名下，离职日后由继任者担当。主管可确认贡献比例。
            </p>
          </div>

          <Separator />

          {/* Profile/邮件/电话处理 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Profile / 邮件 / 电话处理
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Profile处理</Label>
                <Select
                  value={formData.profileHandling}
                  onValueChange={(v: any) => setFormData({ ...formData, profileHandling: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer_to_successor">转移给继任者</SelectItem>
                    <SelectItem value="create_new_for_successor">为继任者创建新Profile</SelectItem>
                    <SelectItem value="archive">归档保存</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>公司电话号码</Label>
                <Input
                  value={formData.companyPhone}
                  onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  placeholder="公司统一分配的电话号码"
                />
              </div>
              <div className="space-y-2">
                <Label>电话处理</Label>
                <Select
                  value={formData.phoneHandling}
                  onValueChange={(v: any) => setFormData({ ...formData, phoneHandling: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer_to_successor">转移给继任者</SelectItem>
                    <SelectItem value="return_to_pool">归还号码池</SelectItem>
                    <SelectItem value="deactivate">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>邮件处理</Label>
                <Select
                  value={formData.emailHandling}
                  onValueChange={(v: any) => setFormData({ ...formData, emailHandling: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forward_to_successor">转发给继任者</SelectItem>
                    <SelectItem value="forward_to_manager">转发给主管</SelectItem>
                    <SelectItem value="auto_reply_then_deactivate">自动回复后停用</SelectItem>
                    <SelectItem value="deactivate">直接停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>邮件转发至</Label>
                <Input
                  value={formData.emailForwardTo}
                  onChange={(e) => setFormData({ ...formData, emailForwardTo: e.target.value })}
                  placeholder="邮件转发目标人员"
                />
              </div>
              <div className="space-y-2">
                <Label>邮件转发天数</Label>
                <Input
                  type="number"
                  value={formData.emailForwardDuration}
                  onChange={(e) => setFormData({ ...formData, emailForwardDuration: parseInt(e.target.value) || 90 })}
                  placeholder="90"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 备注 */}
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="其他需要说明的事项..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "创建中..." : "创建离职记录"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 离职详情面板
// ============================================================

function OffboardingDetailPanel({
  offboardingId,
  onClose,
  onRefresh,
}: {
  offboardingId: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const detailQuery = trpc.offboarding.getDetail.useQuery({ id: offboardingId });
  const submitMutation = trpc.offboarding.submit.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      detailQuery.refetch();
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const completeMutation = trpc.offboarding.complete.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
      detailQuery.refetch();
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const detail = detailQuery.data;
  if (!detail) return null;

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {detail.employeeName} - 离职详情
            <Badge variant={STATUS_LABELS[detail.status]?.variant || "secondary"}>
              {STATUS_LABELS[detail.status]?.label || detail.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {detail.department} · {detail.position} · {REASON_LABELS[detail.reason] || detail.reason}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 进度概览 */}
          <div className="grid grid-cols-3 gap-4">
            <ProgressCard title="工作交接" progress={detail.progress.handover} />
            <ProgressCard title="资产交接" progress={detail.progress.assets} />
            <ProgressCard title="审批流程" progress={detail.progress.approval} />
          </div>

          {/* 基本信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <InfoItem label="离职日期" value={detail.offboardingDate} />
                <InfoItem label="最后工作日" value={detail.lastWorkingDate} />
                <InfoItem label="入职日期" value={detail.hireDate || '-'} />
                <InfoItem label="继任方式" value={SUCCESSOR_TYPE_LABELS[detail.successorType]} />
                <InfoItem label="继任者" value={detail.successorName || '待定'} />
                <InfoItem label="Backup" value={detail.backupPersonName || '-'} />
                <InfoItem label="数据保留" value={detail.dataRetentionPolicy === 'permanent' ? '永久保留' : detail.dataRetentionPolicy} />
                <InfoItem label="审批状态" value={APPROVAL_STATUS_LABELS[detail.approvalStatus] || detail.approvalStatus} />
                <InfoItem label="绩效处理" value={
                  detail.performanceDataHandling === 'keep_under_original' ? '保留在离职者名下' :
                  detail.performanceDataHandling === 'transfer_to_successor' ? '转移给继任者' : '按日期拆分'
                } />
              </div>
            </CardContent>
          </Card>

          {/* Profile/邮件/电话 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Laptop className="w-4 h-4" />
                资产与账号处理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Profile:</span>
                  <span>{detail.profileHandling === 'transfer_to_successor' ? '转移给继任者' : detail.profileHandling === 'create_new_for_successor' ? '为继任者创建新Profile' : '归档保存'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">电话:</span>
                  <span>{detail.companyPhone || '-'} ({detail.phoneHandling === 'transfer_to_successor' ? '转移给继任者' : detail.phoneHandling === 'return_to_pool' ? '归还号码池' : '停用'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">邮件:</span>
                  <span>{detail.emailHandling === 'forward_to_successor' ? `转发给${detail.emailForwardTo || '继任者'}` : detail.emailHandling === 'forward_to_manager' ? '转发给主管' : detail.emailHandling === 'auto_reply_then_deactivate' ? '自动回复后停用' : '直接停用'}</span>
                </div>
                {detail.emailForwardDuration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">转发期限:</span>
                    <span>{detail.emailForwardDuration}天</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 审批流程 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                审批流程
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {detail.approvals?.map((approval: any, index: number) => (
                  <div key={approval.id} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      approval.decision === 'approved' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                      approval.decision === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      approval.submittedAt ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                      'bg-muted border-border text-muted-foreground'
                    }`}>
                      {approval.decision === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                       approval.decision === 'rejected' ? <XCircle className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                      <div className="text-xs">
                        <div className="font-medium">{approval.approverRole}</div>
                        <div>{approval.approverName}</div>
                      </div>
                    </div>
                    {index < detail.approvals.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 交接项列表 */}
          {detail.handoverItems?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  工作交接清单 ({detail.progress.handover.completed}/{detail.progress.handover.total})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detail.handoverItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {item.status === 'completed' || item.status === 'verified' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : item.status === 'in_progress' ? (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        )}
                        <span className="text-sm">{item.itemName}</span>
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.handoverToName && `→ ${item.handoverToName}`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          {detail.status === 'draft' && (
            <Button
              onClick={() => submitMutation.mutate({ id: offboardingId })}
              disabled={submitMutation.isPending}
            >
              提交审批
            </Button>
          )}
          {detail.status === 'approval_complete' && (
            <Button
              onClick={() => completeMutation.mutate({ id: offboardingId })}
              disabled={completeMutation.isPending}
              variant="default"
            >
              完成离职流程
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 工作交接区域
// ============================================================

function HandoverSection({ offboardingId }: { offboardingId: number }) {
  const handoverQuery = trpc.offboarding.getHandoverItems.useQuery({ offboardingId });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    category: "project" as const,
    itemName: "",
    description: "",
    priority: "medium" as const,
    handoverToName: "",
  });

  const addMutation = trpc.offboarding.addHandoverItem.useMutation({
    onSuccess: () => {
      toast.success("交接项添加成功");
      handoverQuery.refetch();
      setShowAddForm(false);
      setNewItem({ category: "project", itemName: "", description: "", priority: "medium", handoverToName: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.offboarding.updateHandoverStatus.useMutation({
    onSuccess: () => {
      toast.success("状态更新成功");
      handoverQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const items = handoverQuery.data || [];
  const completed = items.filter((i: any) => i.status === 'completed' || i.status === 'verified').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">工作交接清单</h3>
          <p className="text-sm text-muted-foreground">已完成 {completed}/{items.length} 项</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          添加交接项
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">类别</Label>
                <Select value={newItem.category} onValueChange={(v: any) => setNewItem({ ...newItem, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">项目</SelectItem>
                    <SelectItem value="task">任务</SelectItem>
                    <SelectItem value="client">客户</SelectItem>
                    <SelectItem value="document">文档</SelectItem>
                    <SelectItem value="system_access">系统权限</SelectItem>
                    <SelectItem value="knowledge">知识</SelectItem>
                    <SelectItem value="equipment">设备</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">优先级</Label>
                <Select value={newItem.priority} onValueChange={(v: any) => setNewItem({ ...newItem, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">紧急</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">交接项名称 *</Label>
                <Input
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  placeholder="输入交接项名称"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">交接给</Label>
                <Input
                  value={newItem.handoverToName}
                  onChange={(e) => setNewItem({ ...newItem, handoverToName: e.target.value })}
                  placeholder="接收人姓名"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>取消</Button>
              <Button size="sm" onClick={() => addMutation.mutate({ offboardingId, ...newItem })} disabled={addMutation.isPending}>
                添加
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {items.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.status === 'completed' || item.status === 'verified' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : item.status === 'in_progress' ? (
                  <Clock className="w-5 h-5 text-yellow-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.itemName}</span>
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    <Badge variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {item.priority}
                    </Badge>
                  </div>
                  {item.handoverToName && (
                    <p className="text-xs text-muted-foreground mt-1">交接给: {item.handoverToName}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {item.status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'in_progress' })}>
                    开始
                  </Button>
                )}
                {item.status === 'in_progress' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'completed' })}>
                    完成
                  </Button>
                )}
                {item.status === 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: 'verified' })}>
                    验证
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 绩效归属区域
// ============================================================

function PerformanceSection({ offboardingId }: { offboardingId: number }) {
  const perfQuery = trpc.offboarding.getPerformanceAttributions.useQuery({ offboardingId });
  const autoAnnotateMutation = trpc.offboarding.autoAnnotatePerformance.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      perfQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const items = perfQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">绩效归属管理</h3>
          <p className="text-sm text-muted-foreground">
            离职日前的绩效保留在离职者名下，离职日后由继任者担当
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => autoAnnotateMutation.mutate({ offboardingId })}
          disabled={autoAnnotateMutation.isPending}
        >
          <AlertTriangle className="w-4 h-4" />
          自动标注
        </Button>
      </div>

      {/* 说明卡片 */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">绩效归属规则</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• <strong>离职前</strong>：绩效数据保留在离职者名下</li>
                <li>• <strong>离职后</strong>：绩效数据归属继任者/顶替者</li>
                <li>• <strong>跨期</strong>：由主管确认离职者与继任者的贡献比例</li>
                <li>• 新年度开始后，离职员工数据将从当前报表中去除</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState message="暂无绩效归属记录。请先添加绩效数据或使用「自动标注」功能。" />
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <PerformanceAttributionCard key={item.id} item={item} onRefresh={() => perfQuery.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

function PerformanceAttributionCard({ item, onRefresh }: { item: any; onRefresh: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [originalPercent, setOriginalPercent] = useState(item.originalContributionPercent || 100);
  const [successorPercent, setSuccessorPercent] = useState(item.successorContributionPercent || 0);
  const [notes, setNotes] = useState("");

  const confirmMutation = trpc.offboarding.confirmPerformance.useMutation({
    onSuccess: () => {
      toast.success("绩效归属已确认");
      setShowConfirm(false);
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.kpiName}</span>
              <Badge variant={
                item.attributionType === 'pre_departure' ? 'secondary' :
                item.attributionType === 'post_departure' ? 'default' : 'outline'
              }>
                {item.attributionType === 'pre_departure' ? '离职前' :
                 item.attributionType === 'post_departure' ? '离职后' : '跨期'}
              </Badge>
              <Badge variant={item.status === 'confirmed' ? 'default' : 'secondary'}>
                {item.status === 'confirmed' ? '已确认' : '待确认'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              周期: {item.period} ({item.periodType}) · 
              离职者贡献: {item.originalContributionPercent}% · 
              继任者贡献: {item.successorContributionPercent}%
            </div>
            {item.dataSourceNote && (
              <p className="text-xs text-muted-foreground mt-1 italic">{item.dataSourceNote}</p>
            )}
          </div>
          {item.status !== 'confirmed' && (
            <Button size="sm" variant="outline" onClick={() => setShowConfirm(!showConfirm)}>
              确认归属
            </Button>
          )}
        </div>

        {showConfirm && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">离职者贡献比例 (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={originalPercent}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setOriginalPercent(v);
                    setSuccessorPercent(100 - v);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">继任者贡献比例 (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={successorPercent}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setSuccessorPercent(v);
                    setOriginalPercent(100 - v);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">确认备注</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="主管确认说明..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>取消</Button>
              <Button
                size="sm"
                onClick={() => confirmMutation.mutate({
                  id: item.id,
                  originalContributionPercent: originalPercent,
                  successorContributionPercent: successorPercent,
                  confirmationNotes: notes,
                })}
                disabled={confirmMutation.isPending}
              >
                确认
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 数据查询区域
// ============================================================

function DataQuerySection() {
  const [queryParams, setQueryParams] = useState({
    targetEmployeeId: 0,
    queryType: "all" as const,
    queryPeriod: "monthly" as const,
    startDate: "",
    endDate: "",
  });
  const [queryResult, setQueryResult] = useState<any>(null);

  const queryMutation = trpc.offboarding.queryEmployeeData.useQuery(
    {
      targetEmployeeId: queryParams.targetEmployeeId,
      queryType: queryParams.queryType,
      queryPeriod: queryParams.queryPeriod,
      startDate: queryParams.startDate || undefined,
      endDate: queryParams.endDate || undefined,
    },
    { enabled: queryParams.targetEmployeeId > 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">离职员工数据查询</h3>
        <p className="text-sm text-muted-foreground">
          按查询周期（日/周/月/季/年）查看离职员工数据，自动标注「已离职」和「离职前/后」
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>员工ID</Label>
              <Input
                type="number"
                value={queryParams.targetEmployeeId || ""}
                onChange={(e) => setQueryParams({ ...queryParams, targetEmployeeId: parseInt(e.target.value) || 0 })}
                placeholder="输入员工ID"
              />
            </div>
            <div className="space-y-2">
              <Label>查询类型</Label>
              <Select value={queryParams.queryType} onValueChange={(v: any) => setQueryParams({ ...queryParams, queryType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="performance">绩效</SelectItem>
                  <SelectItem value="project">项目</SelectItem>
                  <SelectItem value="client">客户</SelectItem>
                  <SelectItem value="task">任务</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>查询周期</Label>
              <Select value={queryParams.queryPeriod} onValueChange={(v: any) => setQueryParams({ ...queryParams, queryPeriod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">日</SelectItem>
                  <SelectItem value="weekly">周</SelectItem>
                  <SelectItem value="monthly">月</SelectItem>
                  <SelectItem value="quarterly">季</SelectItem>
                  <SelectItem value="annual">年</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={queryParams.startDate}
                onChange={(e) => setQueryParams({ ...queryParams, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={queryParams.endDate}
                onChange={(e) => setQueryParams({ ...queryParams, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 查询结果 */}
      {queryMutation.data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              查询结果
              {queryMutation.data.isOffboarded && (
                <Badge variant="destructive">（已离职）</Badge>
              )}
            </CardTitle>
            <CardDescription>
              员工状态: {queryMutation.data.employeeStatus}
              {queryMutation.data.offboardingDate && ` · 离职日期: ${queryMutation.data.offboardingDate}`}
              {` · 共 ${queryMutation.data.total} 条记录`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queryMutation.data.data.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">无匹配数据</p>
            ) : (
              <div className="space-y-2">
                {queryMutation.data.data.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded border text-sm">
                    <div>
                      <span className="font-medium">{item.kpiName}</span>
                      <span className="text-muted-foreground ml-2">({item.period})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        item.dataAnnotation === '离职前' ? 'secondary' :
                        item.dataAnnotation === '离职后' ? 'default' : 'outline'
                      }>
                        {item.dataAnnotation}
                      </Badge>
                      <span className="text-muted-foreground">{item.employeeStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// 辅助组件
// ============================================================

function ProgressCard({ title, progress }: { title: string; progress: { total: number; completed: number; percent: number } }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{progress.completed}/{progress.total}</span>
        </div>
        <Progress value={progress.percent} className="h-2" />
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
