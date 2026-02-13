import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Plus, FileText, Users, History, CheckCircle, Clock, 
  Search, RefreshCw, ChevronRight, Loader2, Package, Hash
} from "lucide-react";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "待审批", variant: "secondary" },
    approved: { label: "已批准", variant: "default" },
    rejected: { label: "已驳回", variant: "destructive" },
    implementing: { label: "实施中", variant: "outline" },
    testing: { label: "测试中", variant: "outline" },
    completed: { label: "已完成", variant: "default" },
    cancelled: { label: "已取消", variant: "secondary" },
  };
  
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Rule type badge
function RuleTypeBadge({ type }: { type: string }) {
  const typeConfig: Record<string, { label: string; color: string }> = {
    equipment: { label: "设备", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    project: { label: "项目", color: "bg-green-500/10 text-green-500 border-green-500/20" },
    material: { label: "物料", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  };
  
  const config = typeConfig[type] || { label: type, color: "bg-gray-500/10 text-gray-500" };
  return <span className={`px-2 py-0.5 rounded text-xs border ${config.color}`}>{config.label}</span>;
}

// Change Requests Tab
function ChangeRequestsTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: requests, isLoading, refetch } = trpc.naming.changeRequests.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const createMutation = trpc.naming.changeRequests.create.useMutation({
    onSuccess: () => {
      toast.success("变更请求已创建");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const approveMutation = trpc.naming.changeRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("变更请求已批准");
      refetch();
    }
  });

  const rejectMutation = trpc.naming.changeRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("变更请求已驳回");
      refetch();
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      requestType: formData.get("requestType") as string,
      ruleType: formData.get("ruleType") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      reason: formData.get("reason") as string,
      impactScope: formData.get("impactScope") as string,
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待审批</SelectItem>
              <SelectItem value="approved">已批准</SelectItem>
              <SelectItem value="implementing">实施中</SelectItem>
              <SelectItem value="testing">测试中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="rejected">已驳回</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建变更请求
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新建命名规则变更请求</DialogTitle>
              <DialogDescription>
                提交变更请求后，将进入审批流程
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleType">规则类型</Label>
                  <Select name="ruleType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="选择规则类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">设备命名</SelectItem>
                      <SelectItem value="project">项目编号</SelectItem>
                      <SelectItem value="material">物料编号</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestType">变更类型</Label>
                  <Select name="requestType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="选择变更类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">新增</SelectItem>
                      <SelectItem value="modify">修改</SelectItem>
                      <SelectItem value="delete">删除</SelectItem>
                      <SelectItem value="correct">纠错</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">变更标题</Label>
                <Input name="title" placeholder="简要描述变更内容" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">详细描述</Label>
                <Textarea name="description" placeholder="详细说明变更内容" rows={3} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">变更原因</Label>
                <Textarea name="reason" placeholder="说明变更的必要性和业务背景" rows={2} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impactScope">影响范围</Label>
                <Textarea name="impactScope" placeholder="描述此变更可能影响的系统、流程或数据" rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  提交请求
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>请求编号</TableHead>
                <TableHead>规则类型</TableHead>
                <TableHead>变更类型</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">{request.requestCode}</TableCell>
                    <TableCell><RuleTypeBadge type={request.ruleType} /></TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {request.requestType === "add" ? "新增" : 
                         request.requestType === "modify" ? "修改" :
                         request.requestType === "delete" ? "删除" : "纠错"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{request.title}</TableCell>
                    <TableCell><StatusBadge status={request.status} /></TableCell>
                    <TableCell>{request.requestorName || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(request.requestDate).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600"
                              onClick={() => approveMutation.mutate({ id: request.id })}
                            >
                              批准
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => rejectMutation.mutate({ id: request.id, notes: "驳回" })}
                            >
                              驳回
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无变更请求
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Equipment Models Tab
function EquipmentModelsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: models, isLoading, refetch } = trpc.naming.equipmentModels.list.useQuery(
    searchTerm ? { search: searchTerm } : undefined
  );

  const initMutation = trpc.naming.equipmentModels.initSample.useMutation({
    onSuccess: (result) => {
      toast.success(`已初始化 ${result?.created || 0} 个设备型号`);
      refetch();
    }
  });

  const createMutation = trpc.naming.equipmentModels.create.useMutation({
    onSuccess: () => {
      toast.success("设备型号已创建");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      numericCode: formData.get("numericCode") as string,
      functionCode: formData.get("functionCode") as string,
      categoryCode: formData.get("categoryCode") as string,
      fullName: formData.get("fullName") as string,
      chineseName: formData.get("chineseName") as string,
      processType: formData.get("processType") as string,
      configLevel: formData.get("configLevel") as string,
      chamberCount: formData.get("chamberCount") ? parseInt(formData.get("chamberCount") as string) : undefined,
      effectiveDate: new Date().toISOString(),
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="搜索型号代码或名称..." 
              className="pl-9 w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
            {initMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            初始化示例数据
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新增设备型号
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新增设备型号</DialogTitle>
                <DialogDescription>
                  添加新的设备型号到主数据表
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numericCode">数字代码</Label>
                    <Input name="numericCode" placeholder="如: 801" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="functionCode">功能代码</Label>
                    <Input name="functionCode" placeholder="如: US" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryCode">类别代码</Label>
                    <Input name="categoryCode" placeholder="如: 8" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">英文名称</Label>
                    <Input name="fullName" placeholder="如: Ultrasonic 801" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chineseName">中文名称</Label>
                    <Input name="chineseName" placeholder="如: 超声波腔体清洗机" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processType">工艺类型</Label>
                    <Input name="processType" placeholder="如: 超声波" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="configLevel">配置等级</Label>
                    <Input name="configLevel" placeholder="如: 标准" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chamberCount">腔体数量</Label>
                    <Input name="chamberCount" type="number" placeholder="如: 1" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    创建
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>数字代码</TableHead>
                <TableHead>功能代码</TableHead>
                <TableHead>英文名称</TableHead>
                <TableHead>中文名称</TableHead>
                <TableHead>工艺类型</TableHead>
                <TableHead>配置等级</TableHead>
                <TableHead>腔体数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>版本</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models && models.length > 0 ? (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-mono font-bold text-primary">{model.numericCode}</TableCell>
                    <TableCell className="font-mono">{model.functionCode}</TableCell>
                    <TableCell>{model.fullName}</TableCell>
                    <TableCell>{model.chineseName}</TableCell>
                    <TableCell>{model.processType || "-"}</TableCell>
                    <TableCell>{model.configLevel || "-"}</TableCell>
                    <TableCell>{model.chamberCount || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={model.status === "active" ? "default" : "secondary"}>
                        {model.status === "active" ? "启用" : model.status === "deprecated" ? "已弃用" : "已废止"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{model.namingVersion}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无设备型号数据，点击"初始化示例数据"添加
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Project Numbers Tab
function ProjectNumbersTab() {
  const { data: tCounter, refetch: refetchT } = trpc.naming.projectNumbers.getCounter.useQuery({ prefix: "T" });
  const { data: grtCounter, refetch: refetchGRT } = trpc.naming.projectNumbers.getCounter.useQuery({ prefix: "GRT" });
  const { data: conversionHistory, refetch: refetchHistory } = trpc.naming.projectNumbers.getConversionHistory.useQuery();

  const initMutation = trpc.naming.projectNumbers.initCounters.useMutation({
    onSuccess: () => {
      toast.success("计数器已初始化");
      refetchT();
      refetchGRT();
    }
  });

  const generateTMutation = trpc.naming.projectNumbers.generateNext.useMutation({
    onSuccess: (code) => {
      toast.success(`已生成临时编号: ${code}`);
      refetchT();
    }
  });

  const generateGRTMutation = trpc.naming.projectNumbers.generateNext.useMutation({
    onSuccess: (code) => {
      toast.success(`已生成正式编号: ${code}`);
      refetchGRT();
    }
  });
  
  const [convertCode, setConvertCode] = useState("");
  const [contractNo, setContractNo] = useState("");
  
  const convertMutation = trpc.naming.projectNumbers.convert.useMutation({
    onSuccess: (result) => {
      toast.success(`已转换为正式编号: ${result.formalCode}`);
      setConvertCode("");
      setContractNo("");
      refetchGRT();
      refetchHistory();
    }
  });
  
  return (
    <div className="space-y-6">
      {/* Counter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              临时编号 (T)
            </CardTitle>
            <CardDescription>商务阶段使用</CardDescription>
          </CardHeader>
          <CardContent>
            {tCounter ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">当前最大值:</span>
                  <span className="font-mono font-bold">T{tCounter.currentMax.toString().padStart(tCounter.formatDigits, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">下一个可用:</span>
                  <span className="font-mono font-bold text-primary">T{tCounter.nextAvailable.toString().padStart(tCounter.formatDigits, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">位数格式:</span>
                  <span>{tCounter.formatDigits}位</span>
                </div>
                <Button 
                  className="w-full mt-2" 
                  variant="outline"
                  onClick={() => generateTMutation.mutate({ prefix: "T" })}
                  disabled={generateTMutation.isPending}
                >
                  {generateTMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  生成下一个临时编号
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">计数器未初始化</p>
                <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                  {initMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  初始化计数器
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              正式编号 (GRT)
            </CardTitle>
            <CardDescription>执行阶段使用</CardDescription>
          </CardHeader>
          <CardContent>
            {grtCounter ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">当前最大值:</span>
                  <span className="font-mono font-bold">GRT{grtCounter.currentMax.toString().padStart(grtCounter.formatDigits, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">下一个可用:</span>
                  <span className="font-mono font-bold text-primary">GRT{grtCounter.nextAvailable.toString().padStart(grtCounter.formatDigits, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">位数格式:</span>
                  <span>{grtCounter.formatDigits}位</span>
                </div>
                <Button 
                  className="w-full mt-2" 
                  variant="outline"
                  onClick={() => generateGRTMutation.mutate({ prefix: "GRT" })}
                  disabled={generateGRTMutation.isPending}
                >
                  {generateGRTMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  生成下一个正式编号
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">计数器未初始化</p>
                <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                  {initMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  初始化计数器
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Conversion Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ChevronRight className="h-5 w-5" />
            编号转换
          </CardTitle>
          <CardDescription>将临时编号转换为正式编号（签订合同后）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>临时编号</Label>
              <Input 
                placeholder="如: T501" 
                value={convertCode}
                onChange={(e) => setConvertCode(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>合同编号（可选）</Label>
              <Input 
                placeholder="如: HT-2026-001" 
                value={contractNo}
                onChange={(e) => setContractNo(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => convertMutation.mutate({ tempCode: convertCode, contractNo })}
              disabled={!convertCode || convertMutation.isPending}
            >
              {convertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              转换为正式编号
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Conversion History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            转换历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>临时编号</TableHead>
                  <TableHead>正式编号</TableHead>
                  <TableHead>合同编号</TableHead>
                  <TableHead>转换时间</TableHead>
                  <TableHead>版本</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversionHistory && conversionHistory.length > 0 ? (
                  conversionHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">{record.tempProjectCode}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{record.formalProjectCode}</TableCell>
                      <TableCell>{record.contractNo || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.conversionDate).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>{record.numberingVersion}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      暂无转换记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Approvers Tab
function ApproversTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: approvers, isLoading, refetch } = trpc.naming.approvers.list.useQuery();
  const { data: users } = trpc.users.getAll.useQuery();

  const createMutation = trpc.naming.approvers.create.useMutation({
    onSuccess: () => {
      toast.success("审批人已添加");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const deleteMutation = trpc.naming.approvers.delete.useMutation({
    onSuccess: () => {
      toast.success("审批人已删除");
      refetch();
    }
  });
  
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      userId: parseInt(formData.get("userId") as string),
      ruleType: formData.get("ruleType") as string,
      changeType: formData.get("changeType") as string,
      approvalLevel: parseInt(formData.get("approvalLevel") as string) || 1,
      remark: formData.get("remark") as string,
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加审批人
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加审批人</DialogTitle>
              <DialogDescription>
                配置命名规则变更的审批人员
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">审批人</Label>
                <Select name="userId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="选择用户" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.email || `用户${user.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleType">规则类型</Label>
                  <Select name="ruleType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="equipment">设备</SelectItem>
                      <SelectItem value="project">项目</SelectItem>
                      <SelectItem value="material">物料</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="changeType">变更类型</Label>
                  <Select name="changeType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="add">新增</SelectItem>
                      <SelectItem value="modify">修改</SelectItem>
                      <SelectItem value="delete">删除</SelectItem>
                      <SelectItem value="correct">纠错</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvalLevel">审批级别</Label>
                <Input name="approvalLevel" type="number" defaultValue="1" min="1" max="5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">备注</Label>
                <Input name="remark" placeholder="可选备注" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  添加
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>审批人</TableHead>
                <TableHead>规则类型</TableHead>
                <TableHead>变更类型</TableHead>
                <TableHead>审批级别</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvers && approvers.length > 0 ? (
                approvers.map((approver) => (
                  <TableRow key={approver.id}>
                    <TableCell>用户 {approver.userId}</TableCell>
                    <TableCell>
                      {approver.ruleType === "all" ? "全部" : <RuleTypeBadge type={approver.ruleType} />}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {approver.changeType === "all" ? "全部" :
                         approver.changeType === "add" ? "新增" :
                         approver.changeType === "modify" ? "修改" :
                         approver.changeType === "delete" ? "删除" : "纠错"}
                      </Badge>
                    </TableCell>
                    <TableCell>Level {approver.approvalLevel}</TableCell>
                    <TableCell>
                      <Badge variant={approver.isActive ? "default" : "secondary"}>
                        {approver.isActive ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{approver.remark || "-"}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => deleteMutation.mutate({ id: approver.id })}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无审批人配置
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Versions Tab
function VersionsTab() {
  const { data: versions, isLoading, refetch } = trpc.naming.versions.list.useQuery();

  const initMutation = trpc.naming.versions.initDefault.useMutation({
    onSuccess: () => {
      toast.success("默认版本已初始化");
      refetch();
    }
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <Button variant="outline" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
          {initMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          初始化默认版本
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>版本号</TableHead>
                <TableHead>版本名称</TableHead>
                <TableHead>规则类型</TableHead>
                <TableHead>变更类型</TableHead>
                <TableHead>生效日期</TableHead>
                <TableHead>当前版本</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions && versions.length > 0 ? (
                versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-mono font-bold">{version.versionCode}</TableCell>
                    <TableCell>{version.versionName || "-"}</TableCell>
                    <TableCell><RuleTypeBadge type={version.ruleType} /></TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {version.changeType === "major" ? "主版本" :
                         version.changeType === "minor" ? "次版本" : "补丁"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(version.effectiveDate).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      {version.isCurrent && (
                        <Badge className="bg-green-500">当前</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {version.changeDescription || "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无版本记录，点击"初始化默认版本"创建
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function NamingRulesManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">命名规则管理</h1>
          <p className="text-muted-foreground">
            管理设备型号、项目编号和物料编号的命名规则及变更流程
          </p>
        </div>
        
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              变更请求
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              设备型号
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              项目编号
            </TabsTrigger>
            <TabsTrigger value="approvers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              审批人员
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              版本管理
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>变更请求管理</CardTitle>
                <CardDescription>
                  查看和管理命名规则的变更请求，包括审批、实施和测试
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangeRequestsTab />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <CardTitle>设备型号主数据</CardTitle>
                <CardDescription>
                  管理设备型号的数字代码、功能代码和配置参数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentModelsTab />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>项目编号管理</CardTitle>
                <CardDescription>
                  管理临时编号(T)和正式编号(GRT)的生成与转换
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectNumbersTab />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="approvers">
            <Card>
              <CardHeader>
                <CardTitle>审批人员配置</CardTitle>
                <CardDescription>
                  配置不同类型变更请求的审批人员和审批级别
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApproversTab />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle>命名规则版本</CardTitle>
                <CardDescription>
                  查看命名规则的版本历史和当前生效版本
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VersionsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
