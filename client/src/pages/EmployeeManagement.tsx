import { useState, useMemo } from "react";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Download,
  Upload,
  Shield,
  Pencil,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  UserCog,
  ChevronLeft,
  ChevronRight,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { useZodForm, schemas, z } from "@/lib/form-validation";
import { ListPageSkeleton } from "@/components/PageSkeleton";

// ── RBAC role definitions (mirrors UserProfileContext 18-role system) ──
const SYSTEM_ROLES = [
  { value: "employee", label: "员工", labelEn: "Employee", level: 1, color: "bg-slate-100 text-slate-700" },
  { value: "production_worker", label: "产线工人", labelEn: "Production Worker", level: 1, color: "bg-slate-100 text-slate-700" },
  { value: "guest", label: "访客", labelEn: "Guest", level: 0, color: "bg-gray-100 text-gray-500" },
  { value: "team_lead", label: "组长", labelEn: "Team Lead", level: 2, color: "bg-blue-100 text-blue-700" },
  { value: "bu_sales", label: "销售", labelEn: "BU Sales", level: 2, color: "bg-green-100 text-green-700" },
  { value: "bu_mech", label: "机械工程师", labelEn: "Mechanical Eng.", level: 2, color: "bg-cyan-100 text-cyan-700" },
  { value: "bu_elec", label: "电气工程师", labelEn: "Electrical Eng.", level: 2, color: "bg-cyan-100 text-cyan-700" },
  { value: "procurement_eng", label: "采购工程师", labelEn: "Procurement Eng.", level: 2, color: "bg-teal-100 text-teal-700" },
  { value: "cs_engineer", label: "客服工程师", labelEn: "CS Engineer", level: 2, color: "bg-indigo-100 text-indigo-700" },
  { value: "dept_manager", label: "部门经理", labelEn: "Dept Manager", level: 3, color: "bg-violet-100 text-violet-700" },
  { value: "bu_pm", label: "项目经理", labelEn: "Project Manager", level: 3, color: "bg-purple-100 text-purple-700" },
  { value: "hr_specialist", label: "HR专员", labelEn: "HR Specialist", level: 3, color: "bg-pink-100 text-pink-700" },
  { value: "finance_specialist", label: "财务专员", labelEn: "Finance Specialist", level: 3, color: "bg-amber-100 text-amber-700" },
  { value: "hr_manager", label: "HR经理", labelEn: "HR Manager", level: 4, color: "bg-rose-100 text-rose-700" },
  { value: "finance_manager", label: "财务经理", labelEn: "Finance Manager", level: 4, color: "bg-orange-100 text-orange-700" },
  { value: "director", label: "总监", labelEn: "Director", level: 5, color: "bg-red-100 text-red-700" },
  { value: "bu_gm", label: "事业部总经理", labelEn: "BU GM", level: 6, color: "bg-red-200 text-red-800" },
  { value: "admin", label: "系统管理员", labelEn: "Admin", level: 10, color: "bg-red-500 text-white" },
] as const;

const ROLE_MAP = Object.fromEntries(SYSTEM_ROLES.map(r => [r.value, r]));

// ── Department & BU maps ──
const BU_CODE_TO_NAME: Record<string, string> = {
  BU1: "海外事业部", BU2: "商用车事业部", BU3: "乘用车事业部",
  BU4: "半导体事业部", BU5: "工业通用事业部",
  HQ: "总部", FIN: "财务部", HR: "人事行政部", IT: "AI数智部", SUP: "事业部支持部",
};

const DEPARTMENTS = [
  "总裁办", "财务部", "人事行政部", "AI数智部", "事业部支持部",
  "事业一部", "事业二部", "事业三部", "事业四部", "事业十部",
];

const STATUS_CONFIG = {
  active: { label: "在职", icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200" },
  inactive: { label: "停用", icon: XCircle, color: "bg-gray-100 text-gray-500 border-gray-200" },
  resigned: { label: "已离职", icon: AlertTriangle, color: "bg-red-100 text-red-600 border-red-200" },
};

const PAGE_SIZE = 20;

// ── Zod Schemas ──
const ROLE_VALUES = SYSTEM_ROLES.map(r => r.value) as [string, ...string[]];

const addEmployeeSchema = z.object({
  name: schemas.requiredString("Name is required / 请输入员工姓名"),
  email: schemas.email("Invalid email address / 邮箱格式不正确"),
  department: z.string().min(1),
  position: schemas.requiredString("Position is required / 请输入职务"),
  systemRole: z.enum(ROLE_VALUES).default("employee"),
});
type AddEmployeeValues = z.infer<typeof addEmployeeSchema>;

const editEmployeeSchema = z.object({
  name: z.string().optional().transform(s => s?.trim() || undefined),
  email: schemas.email("Invalid email / 邮箱格式不正确"),
  phone: schemas.phone("Invalid phone / 手机号格式不正确"),
  department: z.string().optional(),
  position: z.string().optional().transform(s => s?.trim() || undefined),
  systemRole: z.enum(ROLE_VALUES).default("employee"),
});
type EditEmployeeValues = z.infer<typeof editEmployeeSchema>;

// ── Main Component ──
export default function EmployeeManagement() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // ── State ──
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Drawer & Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<any>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState("employee");

  // Add form — Zod + react-hook-form
  const addForm = useZodForm({
    schema: addEmployeeSchema,
    defaultValues: { name: "", email: "", department: DEPARTMENTS[0], position: "", systemRole: "employee" },
  });

  // Edit form — Zod + react-hook-form
  const editForm = useZodForm({
    schema: editEmployeeSchema,
    defaultValues: { name: "", email: "", phone: "", department: "", position: "", systemRole: "employee" },
  });

  // ── tRPC queries ──
  const { data: employeesData, isLoading, refetch } = trpc.employee.list.useQuery({
    buCode: selectedBU === "all" ? undefined : selectedBU,
    department: selectedDepartment === "all" ? undefined : selectedDepartment,
    search: searchTerm || undefined,
    includeAll: true,
  });

  const { data: statsData } = trpc.employee.getStats.useQuery();
  const { data: nextIdData } = trpc.employee.getNextId.useQuery();

  // ── tRPC mutations ──
  const createMutation = trpc.employee.create.useMutation({
    onSuccess: () => {
      toast.success(isEn ? "Employee onboarded successfully" : "员工入职成功，已分配系统权限");
      setAddOpen(false);
      resetAddForm();
      refetch();
    },
    onError: (err) => toast.error(`${isEn ? "Failed" : "失败"}: ${err.message}`),
  });

  const updateMutation = trpc.employee.update.useMutation({
    onSuccess: () => {
      toast.success(isEn ? "Employee updated" : "员工信息已更新");
      setEditOpen(false);
      refetch();
    },
    onError: (err) => toast.error(`${isEn ? "Failed" : "失败"}: ${err.message}`),
  });

  const roleMutation = trpc.employee.updateRole.useMutation({
    onSuccess: () => {
      toast.success(isEn ? "Role updated — access granted immediately" : "角色已更新 — 权限立即生效");
      setRoleEditOpen(false);
      refetch();
    },
    onError: (err) => toast.error(`${isEn ? "Failed" : "失败"}: ${err.message}`),
  });

  const statusMutation = trpc.employee.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(isEn ? "Status updated" : "状态已更新");
      refetch();
    },
    onError: (err) => toast.error(`${isEn ? "Failed" : "失败"}: ${err.message}`),
  });

  const initMutation = trpc.employee.initFromData.useMutation({
    onSuccess: () => { toast.success(isEn ? "Seed data imported" : "初始数据已导入"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const bulkRoleMutation = trpc.employee.batchUpdateRoles.useMutation({
    onSuccess: (data) => {
      toast.success(
        isEn
          ? `${data.updated} employees updated${data.failed > 0 ? `, ${data.failed} failed` : ""}`
          : `已更新 ${data.updated} 名员工${data.failed > 0 ? `，${data.failed} 个失败` : ""}`
      );
      setBulkRoleOpen(false);
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err) => toast.error(`${isEn ? "Bulk update failed" : "批量更新失败"}: ${err.message}`),
  });

  // ── Derived data ──
  const allEmployees = employeesData?.employees || [];

  const filteredEmployees = useMemo(() => {
    let list = allEmployees;
    if (selectedRole !== "all") {
      list = list.filter(e => (e.systemRole || "employee") === selectedRole);
    }
    if (selectedStatus !== "all") {
      list = list.filter(e => e.status === selectedStatus);
    }
    return list;
  }, [allEmployees, selectedRole, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const pagedEmployees = filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const departments = useMemo(() => {
    const depts = new Set(allEmployees.map(e => e.department));
    return Array.from(depts).sort();
  }, [allEmployees]);

  // Role distribution stats
  const roleStats = useMemo(() => {
    const map: Record<string, number> = {};
    allEmployees.forEach(e => {
      const r = e.systemRole || "employee";
      map[r] = (map[r] || 0) + 1;
    });
    return map;
  }, [allEmployees]);

  // ── Helpers ──
  const resetAddForm = () => addForm.reset({ name: "", email: "", department: DEPARTMENTS[0], position: "", systemRole: "employee" });

  const handleCreate = addForm.handleSubmit((data: AddEmployeeValues) => {
    createMutation.mutate({
      employeeId: nextIdData?.nextId || `GRT${Date.now()}`,
      name: data.name,
      email: data.email || undefined,
      department: data.department,
      position: data.position,
      systemRole: data.systemRole as any,
    });
  });

  const openEdit = (emp: any) => {
    setTargetEmployee(emp);
    editForm.reset({
      name: emp.name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department || "",
      position: emp.position || "",
      systemRole: emp.systemRole || "employee",
    });
    setEditOpen(true);
  };

  const handleUpdate = editForm.handleSubmit((data: EditEmployeeValues) => {
    if (!targetEmployee) return;
    updateMutation.mutate({
      employeeId: targetEmployee.employeeId,
      updates: {
        name: data.name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        department: data.department || undefined,
        position: data.position || undefined,
        systemRole: data.systemRole as any,
      },
    });
  });

  const openRoleEdit = (emp: any) => {
    setTargetEmployee(emp);
    editForm.reset({ ...editForm.getValues(), systemRole: emp.systemRole || "employee" });
    setRoleEditOpen(true);
  };

  const handleRoleUpdate = () => {
    if (!targetEmployee) return;
    roleMutation.mutate({
      employeeId: targetEmployee.employeeId,
      systemRole: editForm.getValues("systemRole") as any,
    });
  };

  const toggleStatus = (emp: any) => {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    statusMutation.mutate({ employeeId: emp.employeeId, status: newStatus });
  };

  // Bulk selection helpers
  const toggleSelect = (empId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };
  const isAllPageSelected = pagedEmployees.length > 0 && pagedEmployees.every(e => selectedIds.has(e.employeeId));
  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedEmployees.forEach(e => next.delete(e.employeeId));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedEmployees.forEach(e => next.add(e.employeeId));
        return next;
      });
    }
  };
  const handleBulkRoleSubmit = () => {
    const updates = Array.from(selectedIds).map(employeeId => ({
      employeeId,
      systemRole: bulkRole as any,
    }));
    bulkRoleMutation.mutate({ updates });
  };

  const getRoleBadge = (role: string) => {
    const cfg = ROLE_MAP[role] || ROLE_MAP["employee"];
    return (
      <Badge variant="outline" className={`${cfg.color} border text-xs font-medium`}>
        {isEn ? cfg.labelEn : cfg.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`${cfg.color} border text-xs gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  if (isLoading) return <ListPageSkeleton />;

  // ── Stats cards ──
  const activeCount = allEmployees.filter(e => e.status === "active").length;
  const managerCount = allEmployees.filter(e => {
    const r = e.systemRole || "employee";
    const cfg = ROLE_MAP[r];
    return cfg && cfg.level >= 3;
  }).length;
  const newThisMonth = allEmployees.filter(e => {
    if (!e.createdAt) return false;
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <PageHeader
          icon={UserCog}
          title={isEn ? "HR User Management" : "用户管理中心"}
          description={isEn
            ? "Onboard employees, assign RBAC roles, and manage system access"
            : "员工入职、角色分配、权限管理 — 一站式人事管理台"
          }
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => initMutation.mutate()}>
                <Upload className="w-4 h-4 mr-1.5" />
                {isEn ? "Seed Data" : "初始化数据"}
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => { setBulkRole("employee"); setBulkRoleOpen(true); }}
                >
                  <UsersRound className="w-4 h-4" />
                  {isEn ? `Bulk Assign (${selectedIds.size})` : `批量分配角色 (${selectedIds.size})`}
                </Button>
              )}
              <Button size="sm" onClick={() => { resetAddForm(); setAddOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                {isEn ? "+ Add New Employee" : "+ 新增员工"}
              </Button>
            </div>
          }
        />

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{isEn ? "Total Employees" : "总员工数"}</p>
              <p className="text-3xl font-bold mt-1">{allEmployees.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{isEn ? "Active" : "在职"}</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{isEn ? "Managers+" : "管理层+"}</p>
              <p className="text-3xl font-bold mt-1 text-purple-600">{managerCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{isEn ? "New This Month" : "本月新入职"}</p>
              <p className="text-3xl font-bold mt-1 text-amber-600">{newThisMonth}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Filters ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
              <div className="flex-1 min-w-[180px] sm:min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={isEn ? "Search name, ID, or position..." : "搜索姓名、编号或职务..."}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedBU} onValueChange={(v) => { setSelectedBU(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isEn ? "All BU" : "全部事业部"}</SelectItem>
                  {Object.entries(BU_CODE_TO_NAME).map(([code, name]) => (
                    <SelectItem key={code} value={code}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isEn ? "All Departments" : "全部部门"}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isEn ? "All Roles" : "全部角色"}</SelectItem>
                  {SYSTEM_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {isEn ? r.labelEn : r.label} ({roleStats[r.value] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isEn ? "All Status" : "全部状态"}</SelectItem>
                  <SelectItem value="active">{isEn ? "Active" : "在职"}</SelectItem>
                  <SelectItem value="inactive">{isEn ? "Inactive" : "停用"}</SelectItem>
                  <SelectItem value="resigned">{isEn ? "Resigned" : "已离职"}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} title={isEn ? "Refresh" : "刷新"}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Data Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              {isEn ? "Employee Directory" : "员工花名册"}
              <Badge variant="secondary" className="ml-2">{filteredEmployees.length}</Badge>
            </CardTitle>
            <CardDescription>
              {isEn
                ? "Click Edit to modify employee info, or the Shield icon to change their RBAC role"
                : "点击编辑修改员工信息，点击盾牌图标修改系统角色权限"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">{isEn ? "Loading..." : "加载中..."}</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground font-medium">{isEn ? "No employees found" : "暂无员工数据"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isEn ? 'Click "Seed Data" to import initial records' : '点击"初始化数据"导入员工信息'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[44px]">
                          <Checkbox
                            checked={isAllPageSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label={isEn ? "Select all" : "全选"}
                          />
                        </TableHead>
                        <TableHead className="w-[100px] font-semibold">{isEn ? "Employee ID" : "员工编号"}</TableHead>
                        <TableHead className="font-semibold">{isEn ? "Name" : "姓名"}</TableHead>
                        <TableHead className="font-semibold">{isEn ? "Department" : "部门"}</TableHead>
                        <TableHead className="font-semibold">{isEn ? "Role" : "系统角色"}</TableHead>
                        <TableHead className="font-semibold">{isEn ? "Position" : "职务"}</TableHead>
                        <TableHead className="font-semibold">{isEn ? "Status" : "状态"}</TableHead>
                        <TableHead className="text-right font-semibold">{isEn ? "Actions" : "操作"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedEmployees.map((emp) => (
                        <TableRow key={emp.id} className={`hover:bg-muted/20 ${selectedIds.has(emp.employeeId) ? "bg-primary/5" : ""}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(emp.employeeId)}
                              onCheckedChange={() => toggleSelect(emp.employeeId)}
                              aria-label={`Select ${emp.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm text-primary">{emp.employeeId}</TableCell>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell className="text-sm">{emp.department}</TableCell>
                          <TableCell>{getRoleBadge(emp.systemRole || "employee")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{emp.position}</TableCell>
                          <TableCell>{getStatusBadge(emp.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openRoleEdit(emp)}
                                title={isEn ? "Change Role" : "修改角色"}
                              >
                                <Shield className="w-4 h-4 text-purple-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(emp)}
                                title={isEn ? "Edit" : "编辑"}
                              >
                                <Pencil className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleStatus(emp)}
                                title={emp.status === "active" ? (isEn ? "Deactivate" : "停用") : (isEn ? "Activate" : "启用")}
                              >
                                {emp.status === "active"
                                  ? <XCircle className="w-4 h-4 text-red-400" />
                                  : <CheckCircle2 className="w-4 h-4 text-green-500" />
                                }
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <span>
                      {isEn
                        ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredEmployees.length)} of ${filteredEmployees.length}`
                        : `显示 ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredEmployees.length)} / 共 ${filteredEmployees.length} 条`
                      }
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const p = page <= 3 ? i + 1 : page + i - 2;
                        if (p < 1 || p > totalPages) return null;
                        return (
                          <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DRAWER: Add New Employee (Onboarding)
         ══════════════════════════════════════════════════════════════ */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {isEn ? "Onboard New Employee" : "新增员工"}
            </SheetTitle>
            <SheetDescription>
              {isEn
                ? "Fill in the details below. The employee will receive system access based on their assigned role."
                : "填写员工信息，提交后将立即获得对应角色的系统权限。"
              }
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCreate} className="space-y-5 mt-6 px-1">
            {/* Auto-generated Employee ID */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{isEn ? "Employee ID (Auto)" : "员工编号（自动生成）"}</Label>
              <Input value={nextIdData?.nextId || "GRT..."} disabled className="mt-1.5 font-mono bg-muted" />
            </div>

            {/* Name */}
            <div>
              <Label>{isEn ? "Full Name" : "姓名"} <span className="text-red-500">*</span></Label>
              <Input
                {...addForm.register("name")}
                placeholder={isEn ? "e.g. Zhang San" : "例：胡杨"}
                className="mt-1.5"
              />
              {addForm.formState.errors.name && (
                <p className="text-destructive text-sm mt-1">{addForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label>{isEn ? "Email" : "邮箱"}</Label>
              <Input
                type="email"
                {...addForm.register("email")}
                placeholder="name@grt.com"
                className="mt-1.5"
              />
              {addForm.formState.errors.email && (
                <p className="text-destructive text-sm mt-1">{addForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <Label>{isEn ? "Department" : "部门"} <span className="text-red-500">*</span></Label>
              <Select value={addForm.watch("department")} onValueChange={(v) => addForm.setValue("department", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position */}
            <div>
              <Label>{isEn ? "Position / Title" : "职务"} <span className="text-red-500">*</span></Label>
              <Input
                {...addForm.register("position")}
                placeholder={isEn ? "e.g. Mechanical Engineer" : "例：机械工程师"}
                className="mt-1.5"
              />
              {addForm.formState.errors.position && (
                <p className="text-destructive text-sm mt-1">{addForm.formState.errors.position.message}</p>
              )}
            </div>

            {/* RBAC Role Assignment */}
            <div>
              <Label className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-500" />
                {isEn ? "System Role (RBAC)" : "系统角色 (RBAC)"}
              </Label>
              <Select value={addForm.watch("systemRole")} onValueChange={(v) => addForm.setValue("systemRole", v as any)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${r.color.split(" ")[0]}`} />
                        {isEn ? r.labelEn : r.label}
                        <span className="text-xs text-muted-foreground ml-1">Lv.{r.level}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isEn
                  ? "This determines what menus and features the employee can access."
                  : "此角色决定员工可访问的菜单和功能模块。"
                }
              </p>
            </div>

            <SheetFooter className="mt-8">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                {isEn ? "Cancel" : "取消"}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {isEn ? "Onboard Employee" : "确认入职"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════
          DIALOG: Edit Employee Info
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              {isEn ? "Edit Employee" : "编辑员工信息"}
              {targetEmployee && <Badge variant="outline" className="ml-2 font-mono">{targetEmployee.employeeId}</Badge>}
            </DialogTitle>
            <DialogDescription>
              {isEn ? "Update employee details and role assignment." : "修改员工基本信息及角色分配。"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isEn ? "Name" : "姓名"}</Label>
                <Input {...editForm.register("name")} className="mt-1" />
                {editForm.formState.errors.name && <p className="text-destructive text-sm mt-1">{editForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label>{isEn ? "Position" : "职务"}</Label>
                <Input {...editForm.register("position")} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isEn ? "Email" : "邮箱"}</Label>
                <Input {...editForm.register("email")} className="mt-1" />
                {editForm.formState.errors.email && <p className="text-destructive text-sm mt-1">{editForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label>{isEn ? "Phone" : "电话"}</Label>
                <Input {...editForm.register("phone")} className="mt-1" />
                {editForm.formState.errors.phone && <p className="text-destructive text-sm mt-1">{editForm.formState.errors.phone.message}</p>}
              </div>
            </div>
            <div>
              <Label>{isEn ? "Department" : "部门"}</Label>
              <Select value={editForm.watch("department")} onValueChange={(v) => editForm.setValue("department", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-500" />
                {isEn ? "System Role" : "系统角色"}
              </Label>
              <Select value={editForm.watch("systemRole")} onValueChange={(v) => editForm.setValue("systemRole", v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {isEn ? r.labelEn : r.label} (Lv.{r.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{isEn ? "Cancel" : "取消"}</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {isEn ? "Save Changes" : "保存修改"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          DIALOG: Quick Role Editor
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={roleEditOpen} onOpenChange={setRoleEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              {isEn ? "Change System Role" : "修改系统角色"}
            </DialogTitle>
            <DialogDescription>
              {targetEmployee && (
                <span>
                  {isEn ? "Changing role for " : "正在修改 "}
                  <strong>{targetEmployee.name}</strong> ({targetEmployee.employeeId})
                  {isEn ? ". Current: " : "。当前角色："}
                  <strong>{ROLE_MAP[targetEmployee.systemRole || "employee"]?.label || "员工"}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="mb-2 block">{isEn ? "New Role" : "新角色"}</Label>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEM_ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => editForm.setValue("systemRole", r.value as any)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                    editForm.watch("systemRole") === r.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <span className="font-medium">{isEn ? r.labelEn : r.label}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">Lv.{r.level}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {isEn
                ? "Upgrading to MANAGER (Lv.3+) enables approval workflows. ADMIN (Lv.10) has full system access."
                : "升级为管理层（Lv.3+）可参与审批流程。管理员（Lv.10）拥有完整系统权限。"
              }
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleEditOpen(false)}>{isEn ? "Cancel" : "取消"}</Button>
            <Button onClick={handleRoleUpdate} disabled={roleMutation.isPending}>
              {roleMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              <Shield className="w-4 h-4 mr-1.5" />
              {isEn ? "Update Role" : "确认修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          DIALOG: Bulk Role Assignment
         ══════════════════════════════════════════════════════════════ */}
      <Dialog open={bulkRoleOpen} onOpenChange={setBulkRoleOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-purple-500" />
              {isEn ? "Bulk Role Assignment" : "批量角色分配"}
            </DialogTitle>
            <DialogDescription>
              {isEn
                ? `Assign the same role to ${selectedIds.size} selected employee(s). This takes effect immediately.`
                : `为 ${selectedIds.size} 名已选员工统一分配角色。变更立即生效。`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Selected employees preview */}
          <div className="py-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              {isEn ? "Selected Employees" : "已选员工"}
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {Array.from(selectedIds).slice(0, 20).map(id => {
                const emp = allEmployees.find(e => e.employeeId === id);
                return (
                  <Badge key={id} variant="secondary" className="text-xs gap-1">
                    {emp?.name || id}
                    <span className="text-muted-foreground font-mono">{id}</span>
                  </Badge>
                );
              })}
              {selectedIds.size > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedIds.size - 20} {isEn ? "more" : "更多"}
                </Badge>
              )}
            </div>
          </div>

          {/* Role selector */}
          <div className="py-2">
            <Label className="mb-2 block">{isEn ? "Assign Role" : "分配角色"}</Label>
            <div className="grid grid-cols-2 gap-2">
              {SYSTEM_ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setBulkRole(r.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                    bulkRole === r.value
                      ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                      : "border-border hover:border-purple-300 hover:bg-muted/30"
                  }`}
                >
                  <span className="font-medium">{isEn ? r.labelEn : r.label}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">Lv.{r.level}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRoleOpen(false)}>{isEn ? "Cancel" : "取消"}</Button>
            <Button
              onClick={handleBulkRoleSubmit}
              disabled={bulkRoleMutation.isPending}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {bulkRoleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <UsersRound className="w-4 h-4" />
              {isEn
                ? `Assign to ${selectedIds.size} employees`
                : `分配给 ${selectedIds.size} 名员工`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
