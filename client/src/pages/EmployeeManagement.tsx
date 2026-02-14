import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Building2, 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
  UserPlus,
  Filter,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

// BU代码到名称的映射
const BU_CODE_TO_NAME: Record<string, string> = {
  'BU1': '海外事业部',
  'BU2': '商用车事业部',
  'BU3': '乘用车事业部',
  'BU4': '半导体事业部',
  'BU5': '工业通用事业部',
  'HQ': '总部',
  'FIN': '财务部',
  'HR': '人事行政部',
  'IT': 'AI数智部',
  'SUP': '事业部支持部'
};

// BU代码到颜色的映射
const BU_COLORS: Record<string, string> = {
  'BU1': 'bg-blue-500',
  'BU2': 'bg-green-500',
  'BU3': 'bg-purple-500',
  'BU4': 'bg-orange-500',
  'BU5': 'bg-cyan-500',
  'HQ': 'bg-red-500',
  'FIN': 'bg-yellow-500',
  'HR': 'bg-pink-500',
  'IT': 'bg-indigo-500',
  'SUP': 'bg-gray-500'
};

export default function EmployeeManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBU, setSelectedBU] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 获取员工列表
  const { data: employeesData, isLoading, refetch } = trpc.employee.list.useQuery({
    buCode: selectedBU === "all" ? undefined : selectedBU,
    department: selectedDepartment === "all" ? undefined : selectedDepartment,
    search: searchTerm || undefined
  });

  // 获取统计数据
  const { data: statsData } = trpc.employee.getStats.useQuery();

  // 初始化员工数据
  const initMutation = trpc.employee.initFromData.useMutation({
    onSuccess: (result) => {
      toast.success(`成功导入 ${(result as any).imported} 条员工记录`);
      refetch();
    },
    onError: (error) => {
      toast.error(`导入失败: ${error.message}`);
    }
  });

  // 从简道云同步
  const syncMutation = trpc.employee.syncFromJiandaoyun.useMutation({
    onSuccess: (result) => {
      toast.success(`同步完成: 新增 ${result.added}, 更新 ${result.updated}, 删除 ${result.deleted}`);
      refetch();
    },
    onError: (error) => {
      toast.error(`同步失败: ${error.message}`);
    }
  });

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initMutation.mutateAsync();
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncMutation.mutateAsync();
    } finally {
      setIsSyncing(false);
    }
  };

  // 获取唯一部门列表
  const departments = useMemo(() => {
    if (!employeesData?.employees) return [];
    const depts = new Set(employeesData.employees.map(e => e.department));
    return Array.from(depts).sort();
  }, [employeesData]);

  // 过滤后的员工列表
  const filteredEmployees = useMemo(() => {
    if (!employeesData?.employees) return [];
    return employeesData.employees;
  }, [employeesData]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Users}
          title="员工管理"
          description="管理公司组织架构和人员信息，支持一键同步简道云数据"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleInitialize}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                初始化数据
              </Button>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                一键更新组织架构
              </Button>
            </div>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(BU_CODE_TO_NAME).slice(0, 5).map(([code, name]) => (
            <Card key={code} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${BU_COLORS[code]}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{code}</p>
                    <p className="font-semibold">{name}</p>
                    <p className="text-2xl font-bold text-primary">
                      {statsData?.byBU?.[code] || 0}人
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 筛选和搜索 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索员工姓名、编号或职务..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedBU} onValueChange={setSelectedBU}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择事业部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部事业部</SelectItem>
                  {Object.entries(BU_CODE_TO_NAME).map(([code, name]) => (
                    <SelectItem key={code} value={code}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部部门</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 员工列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              员工列表
              <Badge variant="secondary" className="ml-2">
                {filteredEmployees.length} 人
              </Badge>
            </CardTitle>
            <CardDescription>
              公司全体员工信息，按事业部和部门分类
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">暂无员工数据</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击"初始化数据"按钮导入员工信息
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">员工编号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>事业部</TableHead>
                    <TableHead>职务</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono text-sm">
                        {employee.employeeId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${BU_COLORS[employee.buCode]} text-white border-0`}
                        >
                          {BU_CODE_TO_NAME[employee.buCode] || employee.buCode}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          查看详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 职能部门统计 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(BU_CODE_TO_NAME).slice(5).map(([code, name]) => (
            <Card key={code} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${BU_COLORS[code]}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{code}</p>
                    <p className="font-semibold text-sm">{name}</p>
                    <p className="text-xl font-bold">
                      {statsData?.byBU?.[code] || 0}人
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
