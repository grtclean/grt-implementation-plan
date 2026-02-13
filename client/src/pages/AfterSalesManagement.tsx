/**
 * GRT_AfterSales_Core 售后服务管理页面
 * 
 * 提供客户档案、设备资产、服务工单的管理界面
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Building2, 
  Wrench, 
  ClipboardList, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Settings,
  RefreshCw
} from "lucide-react";

// ============ 客户档案组件 ============
function ClientsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  const utils = trpc.useUtils();
  const { data: clientsData, isLoading } = trpc.afterSales.clients.list.useQuery({
    search: search || undefined,
    tier: tierFilter !== "all" ? tierFilter : undefined,
  });

  const createMutation = trpc.afterSales.clients.create.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "客户创建成功" });
      setIsCreateOpen(false);
      utils.afterSales.clients.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.afterSales.clients.update.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "客户更新成功" });
      setEditingClient(null);
      utils.afterSales.clients.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.afterSales.clients.delete.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "客户删除成功" });
      utils.afterSales.clients.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "Strategic": return <Badge className="bg-purple-500">战略客户</Badge>;
      case "Key": return <Badge className="bg-blue-500">重点客户</Badge>;
      case "Standard": return <Badge variant="secondary">标准客户</Badge>;
      default: return <Badge variant="outline">{tier}</Badge>;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active": return <Badge className="bg-green-500">活跃</Badge>;
      case "Inactive": return <Badge variant="secondary">非活跃</Badge>;
      case "Suspended": return <Badge variant="destructive">暂停</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索客户名称或联系人..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="客户等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            <SelectItem value="Strategic">战略客户</SelectItem>
            <SelectItem value="Key">重点客户</SelectItem>
            <SelectItem value="Standard">标准客户</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新增客户</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增客户</DialogTitle>
              <DialogDescription>填写客户基本信息</DialogDescription>
            </DialogHeader>
            <ClientForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* 客户列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientsData?.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {client.region || "未设置区域"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {getTierBadge(client.tier)}
                    {getStatusBadge(client.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  {client.contactPerson || "未设置联系人"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {client.contactPhone || "未设置电话"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {client.contactEmail || "未设置邮箱"}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingClient(client)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (confirm("确定要删除此客户吗？")) {
                        deleteMutation.mutate({ id: client.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* 编辑对话框 */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑客户</DialogTitle>
            <DialogDescription>修改客户信息</DialogDescription>
          </DialogHeader>
          {editingClient && (
            <ClientForm 
              initialData={editingClient}
              onSubmit={(data) => updateMutation.mutate({ id: editingClient.id, ...data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 客户表单组件
function ClientForm({ 
  initialData, 
  onSubmit, 
  isLoading 
}: { 
  initialData?: any; 
  onSubmit: (data: any) => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    tier: initialData?.tier || "Standard",
    contactPerson: initialData?.contactPerson || "",
    contactPhone: initialData?.contactPhone || "",
    contactEmail: initialData?.contactEmail || "",
    address: initialData?.address || "",
    industry: initialData?.industry || "",
    region: initialData?.region || "",
    slaLevel: initialData?.slaLevel || "",
    responseTimeHours: initialData?.responseTimeHours || "",
    notes: initialData?.notes || "",
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      responseTimeHours: formData.responseTimeHours ? parseInt(formData.responseTimeHours) : undefined,
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>客户名称 *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>客户等级</Label>
          <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Strategic">战略客户</SelectItem>
              <SelectItem value="Key">重点客户</SelectItem>
              <SelectItem value="Standard">标准客户</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>联系人</Label>
          <Input
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>联系电话</Label>
          <Input
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>联系邮箱</Label>
          <Input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>行业</Label>
          <Input
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>区域</Label>
          <Input
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>SLA等级</Label>
          <Select value={formData.slaLevel} onValueChange={(v) => setFormData({ ...formData, slaLevel: v })}>
            <SelectTrigger>
              <SelectValue placeholder="选择SLA等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Platinum">白金</SelectItem>
              <SelectItem value="Gold">黄金</SelectItem>
              <SelectItem value="Silver">白银</SelectItem>
              <SelectItem value="Bronze">青铜</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>地址</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>备注</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============ 设备资产组件 ============
function EquipmentsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const utils = trpc.useUtils();
  const { data: equipmentsData, isLoading } = trpc.afterSales.equipments.list.useQuery({
    search: search || undefined,
    operationalStatus: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: dueSoonData } = trpc.afterSales.equipments.getDueSoon.useQuery({ daysAhead: 30 });

  const createMutation = trpc.afterSales.equipments.create.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "设备创建成功" });
      utils.afterSales.equipments.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const getOperationalStatusBadge = (status: string) => {
    switch (status) {
      case "Running": return <Badge className="bg-green-500">运行中</Badge>;
      case "Idle": return <Badge variant="secondary">空闲</Badge>;
      case "Maintenance": return <Badge className="bg-yellow-500">维护中</Badge>;
      case "Repair": return <Badge className="bg-orange-500">维修中</Badge>;
      case "Decommissioned": return <Badge variant="destructive">已停用</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 即将到期提醒 */}
      {dueSoonData && dueSoonData.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-5 h-5" />
              即将到期维护提醒 ({dueSoonData.length}台设备)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dueSoonData.slice(0, 5).map((eq: any) => (
                <Badge key={eq.id} variant="outline" className="border-yellow-500">
                  {eq.serialNumber} - {eq.nextDueDate ? new Date(eq.nextDueDate).toLocaleDateString() : "未设置"}
                </Badge>
              ))}
              {dueSoonData.length > 5 && (
                <Badge variant="outline">+{dueSoonData.length - 5} 更多</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 搜索和筛选 */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索设备序列号或型号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="运行状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="Running">运行中</SelectItem>
            <SelectItem value="Idle">空闲</SelectItem>
            <SelectItem value="Maintenance">维护中</SelectItem>
            <SelectItem value="Repair">维修中</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新增设备</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增设备</DialogTitle>
              <DialogDescription>填写设备基本信息</DialogDescription>
            </DialogHeader>
            <EquipmentForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* 设备列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipmentsData?.map((equipment) => (
            <Card key={equipment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-mono">{equipment.serialNumber}</CardTitle>
                    <CardDescription>{equipment.modelName}</CardDescription>
                  </div>
                  {getOperationalStatusBadge(equipment.operationalStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings className="w-4 h-4" />
                  {equipment.equipmentType || "未分类"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {equipment.location || "未设置位置"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  上次维护: {equipment.lastMaintenanceDate 
                    ? new Date(equipment.lastMaintenanceDate).toLocaleDateString() 
                    : "无记录"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  下次维护: {equipment.nextDueDate 
                    ? new Date(equipment.nextDueDate).toLocaleDateString() 
                    : "未设置"}
                </div>
                {equipment.runningHours && (
                  <div className="text-sm text-muted-foreground">
                    运行时长: {equipment.runningHours} 小时
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 设备表单组件
function EquipmentForm({ 
  initialData, 
  onSubmit, 
  isLoading 
}: { 
  initialData?: any; 
  onSubmit: (data: any) => void; 
  isLoading: boolean;
}) {
  const { data: clientsData } = trpc.afterSales.clients.list.useQuery({});
  
  const [formData, setFormData] = useState({
    serialNumber: initialData?.serialNumber || "",
    modelName: initialData?.modelName || "",
    clientId: initialData?.clientId?.toString() || "",
    equipmentType: initialData?.equipmentType || "",
    manufacturer: initialData?.manufacturer || "",
    location: initialData?.location || "",
    department: initialData?.department || "",
    maintenanceCycleMonths: initialData?.maintenanceCycleMonths?.toString() || "6",
    notes: initialData?.notes || "",
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      clientId: parseInt(formData.clientId),
      maintenanceCycleMonths: parseInt(formData.maintenanceCycleMonths) || 6,
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>序列号 *</Label>
          <Input
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>型号名称 *</Label>
          <Input
            value={formData.modelName}
            onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>所属客户 *</Label>
          <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="选择客户" />
            </SelectTrigger>
            <SelectContent>
              {clientsData?.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>设备类型</Label>
          <Input
            value={formData.equipmentType}
            onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
            placeholder="如：清洗机、干燥机"
          />
        </div>
        <div className="space-y-2">
          <Label>制造商</Label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>维护周期（月）</Label>
          <Input
            type="number"
            value={formData.maintenanceCycleMonths}
            onChange={(e) => setFormData({ ...formData, maintenanceCycleMonths: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>安装位置</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>所属部门</Label>
          <Input
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>备注</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============ 服务工单组件 ============
function ServiceLogsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const utils = trpc.useUtils();
  const { data: logsData, isLoading } = trpc.afterSales.serviceLogs.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createMutation = trpc.afterSales.serviceLogs.create.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "工单创建成功" });
      setIsCreateOpen(false);
      utils.afterSales.serviceLogs.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = trpc.afterSales.serviceLogs.complete.useMutation({
    onSuccess: (result) => {
      toast({
        title: "成功",
        description: result.workflowResult
          ? `工单已完成，设备维护记录已自动更新`
          : "工单已完成"
      });
      utils.afterSales.serviceLogs.list.invalidate();
      utils.afterSales.equipments.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = trpc.afterSales.workflow.syncAll.useMutation({
    onSuccess: (result) => {
      toast({
        title: "同步完成",
        description: `成功同步 ${result.successCount} 条记录，失败 ${result.failedCount} 条`
      });
      utils.afterSales.equipments.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "同步失败", description: error.message, variant: "destructive" });
    },
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending": return <Badge variant="outline">待处理</Badge>;
      case "Scheduled": return <Badge className="bg-blue-500">已排期</Badge>;
      case "In_Progress": return <Badge className="bg-yellow-500">进行中</Badge>;
      case "Completed": return <Badge className="bg-green-500">已完成</Badge>;
      case "Cancelled": return <Badge variant="destructive">已取消</Badge>;
      case "On_Hold": return <Badge variant="secondary">暂停</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Critical": return <Badge variant="destructive">紧急</Badge>;
      case "High": return <Badge className="bg-orange-500">高</Badge>;
      case "Medium": return <Badge className="bg-yellow-500">中</Badge>;
      case "Low": return <Badge variant="secondary">低</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case "Installation": return <Badge className="bg-purple-500">安装</Badge>;
      case "Maintenance": return <Badge className="bg-blue-500">保养</Badge>;
      case "Repair": return <Badge className="bg-orange-500">维修</Badge>;
      case "Inspection": return <Badge className="bg-cyan-500">巡检</Badge>;
      case "Upgrade": return <Badge className="bg-green-500">升级</Badge>;
      case "Training": return <Badge className="bg-pink-500">培训</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索工单号或问题描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="工单状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="Pending">待处理</SelectItem>
            <SelectItem value="Scheduled">已排期</SelectItem>
            <SelectItem value="In_Progress">进行中</SelectItem>
            <SelectItem value="Completed">已完成</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          同步维护记录
        </Button>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新建工单</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新建服务工单</DialogTitle>
              <DialogDescription>填写工单基本信息</DialogDescription>
            </DialogHeader>
            <ServiceLogForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* 工单列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <div className="space-y-4">
          {logsData?.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{log.ticketId}</span>
                      {getServiceTypeBadge(log.serviceType)}
                      {getPriorityBadge(log.priority)}
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.issueDescription || "无问题描述"}
                    </p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {log.assignedEngineerName || "未分配"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {log.scheduledDate 
                          ? new Date(log.scheduledDate).toLocaleDateString() 
                          : "未排期"}
                      </span>
                      {log.completionDate && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          完成于 {new Date(log.completionDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {log.status !== "Completed" && log.status !== "Cancelled" && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          if (confirm("确定要完成此工单吗？这将自动更新设备的维护记录。")) {
                            completeMutation.mutate({ 
                              id: log.id,
                              completionDate: new Date().toISOString().split('T')[0],
                            });
                          }
                        }}
                        disabled={completeMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        完成
                      </Button>
                    )}
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

// 服务工单表单组件
function ServiceLogForm({ 
  initialData, 
  onSubmit, 
  isLoading 
}: { 
  initialData?: any; 
  onSubmit: (data: any) => void; 
  isLoading: boolean;
}) {
  const { data: equipmentsData } = trpc.afterSales.equipments.list.useQuery({});
  
  const [formData, setFormData] = useState({
    equipmentId: initialData?.equipmentId?.toString() || "",
    serviceType: initialData?.serviceType || "Maintenance",
    priority: initialData?.priority || "Medium",
    issueDescription: initialData?.issueDescription || "",
    issueCategory: initialData?.issueCategory || "",
    assignedEngineerName: initialData?.assignedEngineerName || "",
    scheduledDate: initialData?.scheduledDate || "",
    estimatedDuration: initialData?.estimatedDuration?.toString() || "",
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      equipmentId: parseInt(formData.equipmentId),
      estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined,
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>设备 *</Label>
          <Select value={formData.equipmentId} onValueChange={(v) => setFormData({ ...formData, equipmentId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="选择设备" />
            </SelectTrigger>
            <SelectContent>
              {equipmentsData?.map((eq) => (
                <SelectItem key={eq.id} value={eq.id.toString()}>
                  {eq.serialNumber} - {eq.modelName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>服务类型 *</Label>
          <Select value={formData.serviceType} onValueChange={(v) => setFormData({ ...formData, serviceType: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Installation">安装</SelectItem>
              <SelectItem value="Maintenance">保养</SelectItem>
              <SelectItem value="Repair">维修</SelectItem>
              <SelectItem value="Inspection">巡检</SelectItem>
              <SelectItem value="Upgrade">升级</SelectItem>
              <SelectItem value="Training">培训</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>优先级</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Critical">紧急</SelectItem>
              <SelectItem value="High">高</SelectItem>
              <SelectItem value="Medium">中</SelectItem>
              <SelectItem value="Low">低</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>问题分类</Label>
          <Input
            value={formData.issueCategory}
            onChange={(e) => setFormData({ ...formData, issueCategory: e.target.value })}
            placeholder="如：电气故障、机械磨损"
          />
        </div>
        <div className="space-y-2">
          <Label>指派工程师</Label>
          <Input
            value={formData.assignedEngineerName}
            onChange={(e) => setFormData({ ...formData, assignedEngineerName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>计划日期</Label>
          <Input
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>预计时长（小时）</Label>
          <Input
            type="number"
            value={formData.estimatedDuration}
            onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>问题描述</Label>
        <Textarea
          value={formData.issueDescription}
          onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
          rows={3}
          placeholder="详细描述设备问题或服务需求..."
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : "创建工单"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============ 主页面组件 ============
export default function AfterSalesManagement() {
  const { t } = useLanguage();
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">售后服务管理</h1>
          <p className="text-muted-foreground mt-1">
            管理客户档案、设备资产和服务工单
          </p>
        </div>
        
        {/* 标签页 */}
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              客户档案
            </TabsTrigger>
            <TabsTrigger value="equipments" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              设备资产
            </TabsTrigger>
            <TabsTrigger value="serviceLogs" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              服务工单
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clients">
            <ClientsTab />
          </TabsContent>
          
          <TabsContent value="equipments">
            <EquipmentsTab />
          </TabsContent>
          
          <TabsContent value="serviceLogs">
            <ServiceLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
