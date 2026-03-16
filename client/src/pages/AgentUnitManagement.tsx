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
import { useLanguage } from "@/contexts/LanguageContext";

// 状态配置 — labels use i18n keys, resolved via t() at render time
const STATUS_CONFIG = {
  pending: { labelKey: "hr.agentUnit.pending", icon: Clock },
  calibrating: { labelKey: "hr.agentUnit.calibrating", icon: Activity },
  passed: { labelKey: "hr.agentUnit.passed", icon: CheckCircle2 },
  rework: { labelKey: "hr.agentUnit.rework", icon: XCircle },
};

const statusColors = createStatusColorMap({
  pending: "gray",
  calibrating: "blue",
  passed: "green",
  rework: "red",
});

export default function AgentUnitManagement() {
  const { t } = useLanguage();
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
      toast.success(t("hr.agentUnit.createSuccess"));
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
        ? `${t("hr.agentUnit.workflowComplete")}: ${data.workflowResult.recommendation}`
        : t("hr.agentUnit.statusUpdated");
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
      toast.success(t("hr.agentUnit.calibDataRecorded"));
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
        toast.success(`${t("hr.agentUnit.deviceFound")}: ${value}`);
      }
    }
  };
  
  // 创建智能体单体
  const handleCreate = () => {
    if (!newUnit.serialNumber) {
      toast.error(t("hr.agentUnit.enterSN"));
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
          title={t("hr.agentUnit.title")}
          description={t("hr.agentUnit.desc")}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsScanMode(!isScanMode)}>
                <QrCode className="w-4 h-4 mr-2" />
                {isScanMode ? t("hr.agentUnit.exitScan") : t("hr.agentUnit.scanMode")}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("hr.agentUnit.newUnit")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("hr.agentUnit.newUnitTitle")}</DialogTitle>
                    <DialogDescription>{t("hr.agentUnit.newUnitDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t("hr.agentUnit.snCode")} *</Label>
                      <Input
                        placeholder={t("hr.agentUnit.snPlaceholder")}
                        value={newUnit.serialNumber}
                        onChange={(e) => setNewUnit({ ...newUnit, serialNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("hr.agentUnit.equipModel")}</Label>
                      <Input
                        placeholder="e.g. GRT-UC-3000"
                        value={newUnit.equipmentModel}
                        onChange={(e) => setNewUnit({ ...newUnit, equipmentModel: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("hr.agentUnit.batchNo")}</Label>
                      <Input
                        placeholder="e.g. 2026-01-001"
                        value={newUnit.batchNumber}
                        onChange={(e) => setNewUnit({ ...newUnit, batchNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("hr.agentUnit.notes")}</Label>
                      <Textarea
                        placeholder={t("hr.agentUnit.notesPlaceholder")}
                        value={newUnit.notes}
                        onChange={(e) => setNewUnit({ ...newUnit, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t("hr.agentUnit.cancel")}</Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? t("hr.agentUnit.creating") : t("hr.agentUnit.create")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          }
        />
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={Cpu} label={t("hr.agentUnit.total")} value={stats.total} />
          <StatCard icon={Clock} label={t("hr.agentUnit.pending")} value={stats.byStatus.pending || 0} iconColor="text-gray-600" iconBg="bg-gray-100" />
          <StatCard icon={Activity} label={t("hr.agentUnit.calibrating")} value={stats.byStatus.calibrating || 0} iconColor="text-blue-600" iconBg="bg-blue-100" />
          <StatCard icon={CheckCircle2} label={t("hr.agentUnit.passed")} value={stats.byStatus.passed || 0} iconColor="text-green-600" iconBg="bg-green-100" />
          <StatCard icon={XCircle} label={t("hr.agentUnit.rework")} value={stats.byStatus.rework || 0} iconColor="text-red-600" iconBg="bg-red-100" />
        </div>
        
        {/* 扫描模式 */}
        {isScanMode && (
          <Card className="border-primary border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                {t("hr.agentUnit.scanModeTitle")}
              </CardTitle>
              <CardDescription>{t("hr.agentUnit.scanModeDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input 
                  placeholder={t("hr.agentUnit.scanPlaceholder")}
                  value={searchSN}
                  onChange={(e) => handleScanInput(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                />
                <Button size="lg" onClick={() => handleScanInput(searchSN)}>
                  <Search className="w-5 h-5 mr-2" />
                  {t("hr.agentUnit.find")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">{t("hr.agentUnit.tabList")}</TabsTrigger>
            <TabsTrigger value="detail" disabled={!selectedUnit}>{t("hr.agentUnit.tabDetail")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {/* 筛选器 */}
            <div className="flex gap-4 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("hr.agentUnit.statusFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("hr.agentUnit.allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("hr.agentUnit.pending")}</SelectItem>
                  <SelectItem value="calibrating">{t("hr.agentUnit.calibrating")}</SelectItem>
                  <SelectItem value="passed">{t("hr.agentUnit.passed")}</SelectItem>
                  <SelectItem value="rework">{t("hr.agentUnit.rework")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => unitsQuery.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("hr.agentUnit.refresh")}
              </Button>
            </div>
            
            {/* 设备列表 */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("hr.agentUnit.colSN")}</TableHead>
                    <TableHead>{t("hr.agentUnit.colModel")}</TableHead>
                    <TableHead>{t("hr.agentUnit.colBatch")}</TableHead>
                    <TableHead>{t("hr.agentUnit.colStatus")}</TableHead>
                    <TableHead>{t("hr.agentUnit.colCalibDate")}</TableHead>
                    <TableHead>{t("hr.agentUnit.colAction")}</TableHead>
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
                            {statusConfig ? t(statusConfig.labelKey) : ""}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{unit.calibrationDate ? new Date(unit.calibrationDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {unit.status === "pending" && (
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(unit.id, "calibrating", t("hr.agentUnit.startCalibration")); }}>
                                {t("hr.agentUnit.startCalibration")}
                              </Button>
                            )}
                            {unit.status === "calibrating" && unit.calibrationData && (
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleExecuteCalibration(unit.id); }}>
                                <Play className="w-3 h-3 mr-1" />
                                {t("hr.agentUnit.executeCheck")}
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
                        {t("hr.agentUnit.noData")}
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
                        <CardDescription>{selectedUnit.equipmentModel || t("hr.agentUnit.unspecifiedModel")}</CardDescription>
                      </div>
                      <StatusBadge color={statusColors[selectedUnit.status as keyof typeof statusColors] || "gray"}>
                        {(STATUS_CONFIG[selectedUnit.status as keyof typeof STATUS_CONFIG] as any)?.label ?? (STATUS_CONFIG[selectedUnit.status as keyof typeof STATUS_CONFIG] as any)?.labelKey}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("hr.agentUnit.batchLabel")}</p>
                        <p className="font-medium">{selectedUnit.batchNumber || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("hr.agentUnit.assemblyDate")}</p>
                        <p className="font-medium">{selectedUnit.assemblyDate ? new Date(selectedUnit.assemblyDate).toLocaleDateString() : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("hr.agentUnit.calibrationDate")}</p>
                        <p className="font-medium">{selectedUnit.calibrationDate ? new Date(selectedUnit.calibrationDate).toLocaleDateString() : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("hr.agentUnit.createTime")}</p>
                        <p className="font-medium">{new Date(selectedUnit.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-6">
                      {selectedUnit.status === "pending" && (
                        <Button onClick={() => handleStatusUpdate(selectedUnit.id, "calibrating", t("hr.agentUnit.startCalibration"))}>
                          <Activity className="w-4 h-4 mr-2" />
                          {t("hr.agentUnit.startCalibration")}
                        </Button>
                      )}
                      {selectedUnit.status === "calibrating" && (
                        <>
                          <Dialog open={isCalibrationDialogOpen} onOpenChange={setIsCalibrationDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <Settings className="w-4 h-4 mr-2" />
                                {t("hr.agentUnit.enterCalibData")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{t("hr.agentUnit.enterCalibTitle")}</DialogTitle>
                                <DialogDescription>{t("hr.agentUnit.enterCalibDesc")}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>{t("hr.agentUnit.pressure")}</Label>
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
                                    <Label>{t("hr.agentUnit.flowRate")}</Label>
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
                                    <Label>{t("hr.agentUnit.temperature")}</Label>
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
                                    <Label>{t("hr.agentUnit.ultrasonicPower")}</Label>
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
                                    <Label>{t("hr.agentUnit.ultrasonicFreq")}</Label>
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
                                    <Label>{t("hr.agentUnit.xPosition")}</Label>
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
                                    <Label>{t("hr.agentUnit.yPosition")}</Label>
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
                                    <Label>{t("hr.agentUnit.zPosition")}</Label>
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
                                <Button variant="outline" onClick={() => setIsCalibrationDialogOpen(false)}>{t("hr.agentUnit.cancel")}</Button>
                                <Button onClick={handleRecordCalibration} disabled={recordCalibrationMutation.isPending}>
                                  {recordCalibrationMutation.isPending ? t("hr.agentUnit.saving") : t("hr.agentUnit.saveData")}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          {selectedUnit.calibrationData && (
                            <Button onClick={() => handleExecuteCalibration(selectedUnit.id)} disabled={executeCalibrationMutation.isPending}>
                              <Play className="w-4 h-4 mr-2" />
                              {executeCalibrationMutation.isPending ? t("hr.agentUnit.checking") : t("hr.agentUnit.executeAutoJudge")}
                            </Button>
                          )}
                        </>
                      )}
                      {selectedUnit.status === "rework" && (
                        <Button variant="outline" onClick={() => handleStatusUpdate(selectedUnit.id, "calibrating", t("hr.agentUnit.reCalibrate"))}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t("hr.agentUnit.reCalibrate")}
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
                        {t("hr.agentUnit.calibResultTitle")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted">
                          <p className="font-medium">{(selectedUnit.calibrationResult as any).recommendation}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("hr.agentUnit.checkTime")}: {new Date((selectedUnit.calibrationResult as any).checkedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {(selectedUnit.calibrationResult as any).checkResults?.map((result: any, index: number) => (
                            <div key={index} className="p-3 rounded-lg border">
                              <p className="text-sm font-medium">{result.checkType.replace(/_/g, " ")}</p>
                              <StatusBadge color={result.result === "pass" ? "green" : result.result === "warning" ? "yellow" : "red"}>
                                {result.result === "pass" ? t("hr.agentUnit.resultPass") : result.result === "warning" ? t("hr.agentUnit.resultWarning") : t("hr.agentUnit.resultFail")}
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
                        {t("hr.agentUnit.rawDataTitle")}
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
