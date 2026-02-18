/**
 * GRT-Atom 智能体单体管理页面
 * 支持SN码扫描、状态管理、标定数据录入
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  QrCode,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Cpu,
  Activity,
  Settings,
  Play
} from "lucide-react";

// 状态配置
const STATUS_CONFIG = {
  pending: { label: "待装配", icon: Clock },
  calibrating: { label: "标定中", icon: Activity },
  passed: { label: "合格", icon: CheckCircle2 },
  rework: { label: "需返工", icon: XCircle },
};

const statusColors = createStatusColorMap({
  pending: "gray",
  calibrating: "blue",
  passed: "green",
  rework: "red",
});

export default function AgentUnitManagement() {
  const { user } = useAuth();
  
  // 状态
  const [activeTab, setActiveTab] = useState("list");
  const [searchSN, setSearchSN] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCalibrationDialogOpen, setIsCalibrationDialogOpen] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);
  
  // 新建表单
  const [newUnit, setNewUnit] = useState({
    serialNumber: "",
    equipmentModel: "",
    batchNumber: "",
    notes: "",
  });
  
  // 标定数据表单
  const [calibrationData, setCalibrationData] = useState({
    pressure_calibration: { pressure: 100 },
    flow_calibration: { flow_rate: 50 },
    temperature_calibration: { temperature: 50 },
    position_calibration: { x_position: 500, y_position: 500, z_position: 250 },
    ultrasonic_calibration: { power: 2500, frequency: 40 },
  });
  
  // API查询
  const unitsQuery = (trpc.capabilityOs.getAgentUnits as any).useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
    offset: 0,
  });
  
  const statisticsQuery = trpc.capabilityOs.getAgentUnitStatistics.useQuery();
  
  // API变更
  const createMutation = trpc.capabilityOs.createAgentUnit.useMutation({
    onSuccess: () => {
      toast.success("智能体单体创建成功");
      setIsCreateDialogOpen(false);
      setNewUnit({ serialNumber: "", equipmentModel: "", batchNumber: "", notes: "" });
      unitsQuery.refetch();
      statisticsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateStatusMutation = trpc.capabilityOs.updateAgentUnitStatus.useMutation({
    onSuccess: (data: any) => {
      const msg = data.workflowResult
        ? `工作流执行完成: ${data.workflowResult.recommendation}`
        : "状态已更新";
      toast.success(msg);
      unitsQuery.refetch();
      statisticsQuery.refetch();
      if (selectedUnit) {
        setSelectedUnit({ ...selectedUnit, status: data.unit.status });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const recordCalibrationMutation = trpc.capabilityOs.recordCalibrationData.useMutation({
    onSuccess: () => {
      toast.success("标定数据已记录");
      setIsCalibrationDialogOpen(false);
      unitsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const executeCalibrationMutation = trpc.capabilityOs.executeCalibrationCheck.useMutation({
    onSuccess: (data: any) => {
      if (data.finalStatus === "passed") {
        toast.success(data.recommendation as string);
      } else {
        toast.error(data.recommendation as string);
      }
      unitsQuery.refetch();
      statisticsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // SN码扫描处理
  const handleScanInput = (value: string) => {
    setSearchSN(value);
    if (value.length >= 8) {
      const unit = (unitsQuery.data as any)?.units.find(u => u.serialNumber === value);
      if (unit) {
        setSelectedUnit(unit);
        toast.success(`找到设备: ${value}`);
      }
    }
  };
  
  // 创建智能体单体
  const handleCreate = () => {
    if (!newUnit.serialNumber) {
      toast.error("请输入SN码");
      return;
    }
    createMutation.mutate(newUnit);
  };
  
  // 更新状态
  const handleStatusUpdate = (id: number, newStatus: string, reason: string) => {
    updateStatusMutation.mutate({ id, newStatus, changeReason: reason });
  };
  
  // 记录标定数据
  const handleRecordCalibration = () => {
    if (!selectedUnit) return;
    recordCalibrationMutation.mutate({
      id: selectedUnit.id,
      calibrationData,
    });
  };
  
  // 执行标定检查
  const handleExecuteCalibration = (id: number) => {
    executeCalibrationMutation.mutate({ id });
  };
  
  // 统计数据
  const stats = (statisticsQuery.data as any) || { total: 0, byStatus: { pending: 0, calibrating: 0, passed: 0, rework: 0 }, passRate: 0 };
  
  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Cpu}
          title="GRT-Atom 智能体单体管理"
          description="SN码扫描 · 状态追踪 · 标定数据管理 · 自动判定工作流"
          actions={
            <>
              <Button variant="outline" onClick={() => setIsScanMode(!isScanMode)}>
                <QrCode className="w-4 h-4 mr-2" />
                {isScanMode ? "退出扫描" : "扫描模式"}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新建单体
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新建智能体单体</DialogTitle>
                    <DialogDescription>录入新的智能体单体信息</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>SN码 *</Label>
                      <Input
                        placeholder="扫描或输入SN码..."
                        value={newUnit.serialNumber}
                        onChange={(e) => setNewUnit({ ...newUnit, serialNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>设备型号</Label>
                      <Input
                        placeholder="如: GRT-UC-3000"
                        value={newUnit.equipmentModel}
                        onChange={(e) => setNewUnit({ ...newUnit, equipmentModel: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>批次号</Label>
                      <Input
                        placeholder="如: 2026-01-001"
                        value={newUnit.batchNumber}
                        onChange={(e) => setNewUnit({ ...newUnit, batchNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>备注</Label>
                      <Textarea
                        placeholder="备注信息..."
                        value={newUnit.notes}
                        onChange={(e) => setNewUnit({ ...newUnit, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>取消</Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "创建中..." : "创建"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={Cpu} label="总数" value={stats.total} />
          <StatCard icon={Clock} label="待装配" value={stats.byStatus.pending || 0} iconColor="text-gray-600" iconBg="bg-gray-100" />
          <StatCard icon={Activity} label="标定中" value={stats.byStatus.calibrating || 0} iconColor="text-blue-600" iconBg="bg-blue-100" />
          <StatCard icon={CheckCircle2} label="合格" value={stats.byStatus.passed || 0} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard icon={XCircle} label="需返工" value={stats.byStatus.rework || 0} iconColor="text-red-600" iconBg="bg-red-100" />
        </div>
        
        {/* 扫描模式 */}
        {isScanMode && (
          <Card className="border-primary border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                扫描模式
              </CardTitle>
              <CardDescription>扫描二维码或输入SN码快速查找设备</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input 
                  placeholder="扫描二维码或输入SN码..."
                  value={searchSN}
                  onChange={(e) => handleScanInput(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                />
                <Button size="lg" onClick={() => handleScanInput(searchSN)}>
                  <Search className="w-5 h-5 mr-2" />
                  查找
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">设备列表</TabsTrigger>
            <TabsTrigger value="detail" disabled={!selectedUnit}>设备详情</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {/* 筛选器 */}
            <div className="flex gap-4 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待装配</SelectItem>
                  <SelectItem value="calibrating">标定中</SelectItem>
                  <SelectItem value="passed">合格</SelectItem>
                  <SelectItem value="rework">需返工</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => unitsQuery.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
            
            {/* 设备列表 */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SN码</TableHead>
                    <TableHead>设备型号</TableHead>
                    <TableHead>批次号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>标定日期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(unitsQuery.data as any)?.units.map((unit) => {
                    const statusConfig = STATUS_CONFIG[unit.status as keyof typeof STATUS_CONFIG];
                    const StatusIcon = statusConfig?.icon || Clock;
                    return (
                      <TableRow key={unit.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedUnit(unit); setActiveTab("detail"); }}>
                        <TableCell className="font-mono font-bold">{unit.serialNumber}</TableCell>
                        <TableCell>{unit.equipmentModel || "-"}</TableCell>
                        <TableCell>{unit.batchNumber || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge
                            color={statusColors[unit.status as keyof typeof statusColors] || "gray"}
                            icon={<StatusIcon className="w-3 h-3" />}
                          >
                            {statusConfig?.label}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{unit.calibrationDate ? new Date(unit.calibrationDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {unit.status === "pending" && (
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(unit.id, "calibrating", "开始标定"); }}>
                                开始标定
                              </Button>
                            )}
                            {unit.status === "calibrating" && unit.calibrationData && (
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleExecuteCalibration(unit.id); }}>
                                <Play className="w-3 h-3 mr-1" />
                                执行检查
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!(unitsQuery.data as any)?.units || (unitsQuery.data as any).units.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          
          <TabsContent value="detail" className="space-y-4">
            {selectedUnit && (
              <>
                {/* 设备基本信息 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Cpu className="w-5 h-5" />
                          {selectedUnit.serialNumber}
                        </CardTitle>
                        <CardDescription>{selectedUnit.equipmentModel || "未指定型号"}</CardDescription>
                      </div>
                      <StatusBadge color={statusColors[selectedUnit.status as keyof typeof statusColors] || "gray"}>
                        {STATUS_CONFIG[selectedUnit.status as keyof typeof STATUS_CONFIG]?.label}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">批次号</p>
                        <p className="font-medium">{selectedUnit.batchNumber || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">装配日期</p>
                        <p className="font-medium">{selectedUnit.assemblyDate ? new Date(selectedUnit.assemblyDate).toLocaleDateString() : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">标定日期</p>
                        <p className="font-medium">{selectedUnit.calibrationDate ? new Date(selectedUnit.calibrationDate).toLocaleDateString() : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">创建时间</p>
                        <p className="font-medium">{new Date(selectedUnit.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-6">
                      {selectedUnit.status === "pending" && (
                        <Button onClick={() => handleStatusUpdate(selectedUnit.id, "calibrating", "开始标定")}>
                          <Activity className="w-4 h-4 mr-2" />
                          开始标定
                        </Button>
                      )}
                      {selectedUnit.status === "calibrating" && (
                        <>
                          <Dialog open={isCalibrationDialogOpen} onOpenChange={setIsCalibrationDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <Settings className="w-4 h-4 mr-2" />
                                录入标定数据
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>录入标定数据</DialogTitle>
                                <DialogDescription>输入各项标定测量值</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>压力 (bar)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.pressure_calibration.pressure}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        pressure_calibration: { pressure: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>流量 (L/min)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.flow_calibration.flow_rate}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        flow_calibration: { flow_rate: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>温度 (°C)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.temperature_calibration.temperature}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        temperature_calibration: { temperature: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>超声波功率 (W)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.ultrasonic_calibration.power}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        ultrasonic_calibration: { ...calibrationData.ultrasonic_calibration, power: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>超声波频率 (kHz)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.ultrasonic_calibration.frequency}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        ultrasonic_calibration: { ...calibrationData.ultrasonic_calibration, frequency: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label>X位置 (mm)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.position_calibration.x_position}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        position_calibration: { ...calibrationData.position_calibration, x_position: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Y位置 (mm)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.position_calibration.y_position}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        position_calibration: { ...calibrationData.position_calibration, y_position: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Z位置 (mm)</Label>
                                    <Input 
                                      type="number"
                                      value={calibrationData.position_calibration.z_position}
                                      onChange={(e) => setCalibrationData({
                                        ...calibrationData,
                                        position_calibration: { ...calibrationData.position_calibration, z_position: Number(e.target.value) }
                                      })}
                                    />
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCalibrationDialogOpen(false)}>取消</Button>
                                <Button onClick={handleRecordCalibration} disabled={recordCalibrationMutation.isPending}>
                                  {recordCalibrationMutation.isPending ? "保存中..." : "保存数据"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          {selectedUnit.calibrationData && (
                            <Button onClick={() => handleExecuteCalibration(selectedUnit.id)} disabled={executeCalibrationMutation.isPending}>
                              <Play className="w-4 h-4 mr-2" />
                              {executeCalibrationMutation.isPending ? "检查中..." : "执行自动判定"}
                            </Button>
                          )}
                        </>
                      )}
                      {selectedUnit.status === "rework" && (
                        <Button variant="outline" onClick={() => handleStatusUpdate(selectedUnit.id, "calibrating", "重新标定")}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          重新标定
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* 标定结果 */}
                {selectedUnit.calibrationResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        标定检查结果
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted">
                          <p className="font-medium">{(selectedUnit.calibrationResult as any).recommendation}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            检查时间: {new Date((selectedUnit.calibrationResult as any).checkedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {(selectedUnit.calibrationResult as any).checkResults?.map((result: any, index: number) => (
                            <div key={index} className="p-3 rounded-lg border">
                              <p className="text-sm font-medium">{result.checkType.replace(/_/g, " ")}</p>
                              <StatusBadge color={result.result === "pass" ? "green" : result.result === "warning" ? "yellow" : "red"}>
                                {result.result === "pass" ? "通过" : result.result === "warning" ? "警告" : "失败"}
                              </StatusBadge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* 标定原始数据 */}
                {selectedUnit.calibrationData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        标定原始数据 (只读)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                        {JSON.stringify(selectedUnit.calibrationData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
