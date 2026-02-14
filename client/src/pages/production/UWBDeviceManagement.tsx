import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Activity, AlertCircle, CheckCircle2, Clock, Edit2, MapPin, Plus, 
  RefreshCw, Router, Settings2, Signal, Trash2, Wifi, WifiOff, 
  Zap, Radio, Server, Shield, Eye, EyeOff, TestTube, Play, Pause
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// ============================================================================
// 类型定义
// ============================================================================

type UWBProtocol = "decawave" | "ubisense" | "sewio" | "pozyx" | "custom";
type DeviceStatus = "online" | "offline" | "error" | "maintenance";
type AuthType = "none" | "api_key" | "basic" | "oauth2" | "certificate";

interface UWBDevice {
  id: number;
  deviceCode: string;
  name: string;
  protocol: UWBProtocol;
  apiEndpoint: string;
  authType: AuthType;
  authConfig: string | null;
  status: DeviceStatus;
  lastHeartbeat: Date | null;
  locationZone: string | null;
  description: string | null;
  enabled: boolean;
  syncInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DeviceLog {
  id: number;
  deviceId: number;
  eventType: string;
  message: string;
  details: string | null;
  createdAt: Date;
}

// ============================================================================
// 常量配置
// ============================================================================

const protocolLabels: Record<UWBProtocol, string> = {
  decawave: "Decawave DW1000",
  ubisense: "Ubisense RTLS",
  sewio: "Sewio RTLS",
  pozyx: "Pozyx",
  custom: "自定义协议",
};

const protocolColors: Record<UWBProtocol, string> = {
  decawave: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ubisense: "bg-green-500/10 text-green-500 border-green-500/20",
  sewio: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  pozyx: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  custom: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<DeviceStatus, string> = {
  online: "在线",
  offline: "离线",
  error: "错误",
  maintenance: "维护中",
};

const statusColors: Record<DeviceStatus, string> = {
  online: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  offline: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  error: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const authTypeLabels: Record<AuthType, string> = {
  none: "无认证",
  api_key: "API Key",
  basic: "Basic Auth",
  oauth2: "OAuth 2.0",
  certificate: "证书认证",
};

const protocolDefaultEndpoints: Record<UWBProtocol, string> = {
  decawave: "http://localhost:8080/api/v1",
  ubisense: "https://ubisense-server:8443/api",
  sewio: "http://sewio-server:8090/sensmapserver/api",
  pozyx: "http://pozyx-gateway:5000/api/v1",
  custom: "http://localhost:8080/api",
};

const protocolDefaultPorts: Record<UWBProtocol, number> = {
  decawave: 8080,
  ubisense: 8443,
  sewio: 8090,
  pozyx: 5000,
  custom: 8080,
};

// ============================================================================
// 主组件
// ============================================================================

export default function UWBDeviceManagement() {
  const [activeTab, setActiveTab] = useState("devices");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<UWBDevice | null>(null);
  const [showAuthConfig, setShowAuthConfig] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string; latency?: number} | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    deviceCode: "",
    name: "",
    protocol: "decawave" as UWBProtocol,
    apiEndpoint: protocolDefaultEndpoints.decawave,
    authType: "none" as AuthType,
    authConfig: "",
    locationZone: "",
    description: "",
    syncInterval: 5000,
    enabled: true,
  });

  // 模拟设备数据（实际应从API获取）
  const [devices, setDevices] = useState<UWBDevice[]>([
    {
      id: 1,
      deviceCode: "UWB-DW-001",
      name: "车间A-主定位器",
      protocol: "decawave",
      apiEndpoint: "http://192.168.1.100:8080/api/v1",
      authType: "api_key",
      authConfig: JSON.stringify({ apiKey: "sk-xxx-hidden" }),
      status: "online",
      lastHeartbeat: new Date(),
      locationZone: "Workshop-A",
      description: "车间A主要定位基站",
      enabled: true,
      syncInterval: 5000,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date(),
    },
    {
      id: 2,
      deviceCode: "UWB-UB-002",
      name: "仓库B-RTLS网关",
      protocol: "ubisense",
      apiEndpoint: "https://192.168.1.101:8443/api",
      authType: "basic",
      authConfig: JSON.stringify({ username: "admin", password: "***" }),
      status: "online",
      lastHeartbeat: new Date(Date.now() - 30000),
      locationZone: "Warehouse-B",
      description: "仓库B实时定位系统",
      enabled: true,
      syncInterval: 3000,
      createdAt: new Date("2024-02-20"),
      updatedAt: new Date(),
    },
    {
      id: 3,
      deviceCode: "UWB-SW-003",
      name: "装配线C-Sewio",
      protocol: "sewio",
      apiEndpoint: "http://192.168.1.102:8090/sensmapserver/api",
      authType: "oauth2",
      authConfig: JSON.stringify({ clientId: "grt-client", clientSecret: "***" }),
      status: "offline",
      lastHeartbeat: new Date(Date.now() - 3600000),
      locationZone: "Assembly-C",
      description: "装配线C定位系统",
      enabled: false,
      syncInterval: 5000,
      createdAt: new Date("2024-03-10"),
      updatedAt: new Date(),
    },
    {
      id: 4,
      deviceCode: "UWB-PZ-004",
      name: "测试区D-Pozyx",
      protocol: "pozyx",
      apiEndpoint: "http://192.168.1.103:5000/api/v1",
      authType: "api_key",
      authConfig: JSON.stringify({ apiKey: "pozyx-key-xxx" }),
      status: "error",
      lastHeartbeat: new Date(Date.now() - 7200000),
      locationZone: "Test-D",
      description: "测试区D定位系统（故障中）",
      enabled: true,
      syncInterval: 2000,
      createdAt: new Date("2024-04-05"),
      updatedAt: new Date(),
    },
  ]);

  // 模拟设备日志
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([
    { id: 1, deviceId: 1, eventType: "heartbeat", message: "设备心跳正常", details: null, createdAt: new Date() },
    { id: 2, deviceId: 1, eventType: "sync", message: "同步位置数据成功，获取12个标签位置", details: null, createdAt: new Date(Date.now() - 60000) },
    { id: 3, deviceId: 4, eventType: "error", message: "连接超时，重试3次失败", details: "Connection timeout after 30s", createdAt: new Date(Date.now() - 120000) },
    { id: 4, deviceId: 2, eventType: "config", message: "更新同步间隔为3000ms", details: null, createdAt: new Date(Date.now() - 180000) },
    { id: 5, deviceId: 3, eventType: "offline", message: "设备离线", details: "No heartbeat for 1 hour", createdAt: new Date(Date.now() - 3600000) },
  ]);

  // 协议变更时更新默认端点
  const handleProtocolChange = (protocol: UWBProtocol) => {
    setFormData(prev => ({
      ...prev,
      protocol,
      apiEndpoint: protocolDefaultEndpoints[protocol],
    }));
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      deviceCode: "",
      name: "",
      protocol: "decawave",
      apiEndpoint: protocolDefaultEndpoints.decawave,
      authType: "none",
      authConfig: "",
      locationZone: "",
      description: "",
      syncInterval: 5000,
      enabled: true,
    });
    setShowAuthConfig(false);
  };

  // 打开编辑对话框
  const openEditDialog = (device: UWBDevice) => {
    setSelectedDevice(device);
    setFormData({
      deviceCode: device.deviceCode,
      name: device.name,
      protocol: device.protocol,
      apiEndpoint: device.apiEndpoint,
      authType: device.authType,
      authConfig: device.authConfig || "",
      locationZone: device.locationZone || "",
      description: device.description || "",
      syncInterval: device.syncInterval,
      enabled: device.enabled,
    });
    setIsEditDialogOpen(true);
  };

  // 测试设备连接
  const testDeviceConnection = async (device: UWBDevice) => {
    setSelectedDevice(device);
    setIsTestDialogOpen(true);
    setIsTesting(true);
    setTestResult(null);

    // 模拟测试过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟测试结果
    const success = Math.random() > 0.3;
    setTestResult({
      success,
      message: success 
        ? `连接成功！设备响应正常，检测到${Math.floor(Math.random() * 20) + 5}个活跃标签。`
        : "连接失败：无法建立与设备的连接，请检查网络配置和认证信息。",
      latency: success ? Math.floor(Math.random() * 100) + 20 : undefined,
    });
    setIsTesting(false);
  };

  // 添加设备
  const handleAddDevice = () => {
    const newDevice: UWBDevice = {
      id: devices.length + 1,
      deviceCode: formData.deviceCode,
      name: formData.name,
      protocol: formData.protocol,
      apiEndpoint: formData.apiEndpoint,
      authType: formData.authType,
      authConfig: formData.authConfig || null,
      status: "offline",
      lastHeartbeat: null,
      locationZone: formData.locationZone || null,
      description: formData.description || null,
      enabled: formData.enabled,
      syncInterval: formData.syncInterval,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDevices([...devices, newDevice]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("设备添加成功");
  };

  // 更新设备
  const handleUpdateDevice = () => {
    if (!selectedDevice) return;
    setDevices(devices.map(d => 
      d.id === selectedDevice.id 
        ? {
            ...d,
            deviceCode: formData.deviceCode,
            name: formData.name,
            protocol: formData.protocol,
            apiEndpoint: formData.apiEndpoint,
            authType: formData.authType,
            authConfig: formData.authConfig || null,
            locationZone: formData.locationZone || null,
            description: formData.description || null,
            syncInterval: formData.syncInterval,
            enabled: formData.enabled,
            updatedAt: new Date(),
          }
        : d
    ));
    setIsEditDialogOpen(false);
    resetForm();
    toast.success("设备更新成功");
  };

  // 删除设备
  const handleDeleteDevice = (deviceId: number) => {
    setDevices(devices.filter(d => d.id !== deviceId));
    toast.success("设备已删除");
  };

  // 切换设备启用状态
  const toggleDeviceEnabled = (deviceId: number) => {
    setDevices(devices.map(d => 
      d.id === deviceId ? { ...d, enabled: !d.enabled, updatedAt: new Date() } : d
    ));
    toast.success("设备状态已更新");
  };

  // 获取状态图标
  const getStatusIcon = (status: DeviceStatus) => {
    switch (status) {
      case "online": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "offline": return <WifiOff className="w-4 h-4 text-gray-500" />;
      case "error": return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case "maintenance": return <Settings2 className="w-4 h-4 text-amber-500" />;
    }
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return "从未";
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(date).toLocaleDateString("zh-CN");
  };

  // 统计数据
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === "online").length,
    offline: devices.filter(d => d.status === "offline").length,
    error: devices.filter(d => d.status === "error").length,
    enabled: devices.filter(d => d.enabled).length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Radio}
          title="UWB设备管理"
          description="配置和管理UWB定位设备，支持多种协议（Decawave、Ubisense、Sewio、Pozyx）"
          actions={
            <Button className="gap-2" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
              <Plus className="w-4 h-4" />
              添加设备
            </Button>
          }
        />

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>添加UWB设备</DialogTitle>
                <DialogDescription>
                  配置新的UWB定位设备，填写设备信息和连接参数
                </DialogDescription>
              </DialogHeader>
              <DeviceForm
                formData={formData}
                setFormData={setFormData}
                showAuthConfig={showAuthConfig}
                setShowAuthConfig={setShowAuthConfig}
                onProtocolChange={handleProtocolChange}
                onSubmit={handleAddDevice}
                submitLabel="添加设备"
              />
            </DialogContent>
          </Dialog>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={Router} label="设备总数" value={stats.total} />
          <StatCard icon={Wifi} label="在线" value={stats.online} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
          <StatCard icon={WifiOff} label="离线" value={stats.offline} iconColor="text-gray-500" iconBg="bg-gray-500/10" />
          <StatCard icon={AlertCircle} label="错误" value={stats.error} iconColor="text-rose-500" iconBg="bg-rose-500/10" />
          <StatCard icon={Zap} label="已启用" value={stats.enabled} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="devices" className="gap-2">
              <Router className="w-4 h-4" />
              设备列表
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="w-4 h-4" />
              设备日志
            </TabsTrigger>
            <TabsTrigger value="zones" className="gap-2">
              <MapPin className="w-4 h-4" />
              区域配置
            </TabsTrigger>
          </TabsList>

          {/* 设备列表 */}
          <TabsContent value="devices" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">已配置设备</CardTitle>
                <CardDescription>管理所有UWB定位设备的连接配置</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>设备编号</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>协议</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>区域</TableHead>
                      <TableHead>最后心跳</TableHead>
                      <TableHead>启用</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-mono text-sm">{device.deviceCode}</TableCell>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={protocolColors[device.protocol]}>
                            {protocolLabels[device.protocol]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(device.status)}
                            <Badge variant="outline" className={statusColors[device.status]}>
                              {statusLabels[device.status]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{device.locationZone || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(device.lastHeartbeat)}
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={device.enabled}
                            onCheckedChange={() => toggleDeviceEnabled(device.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => testDeviceConnection(device)}
                              title="测试连接"
                            >
                              <TestTube className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(device)}
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteDevice(device.id)}
                              title="删除"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 设备日志 */}
          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">设备日志</CardTitle>
                <CardDescription>查看设备连接和同步日志</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>设备</TableHead>
                      <TableHead>事件类型</TableHead>
                      <TableHead>消息</TableHead>
                      <TableHead>详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceLogs.map(log => {
                      const device = devices.find(d => d.id === log.deviceId);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">
                            {formatTime(log.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {device?.name || `设备#${log.deviceId}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              log.eventType === "error" ? "bg-rose-500/10 text-rose-500" :
                              log.eventType === "sync" ? "bg-blue-500/10 text-blue-500" :
                              log.eventType === "heartbeat" ? "bg-emerald-500/10 text-emerald-500" :
                              "bg-gray-500/10 text-gray-500"
                            }>
                              {log.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.message}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.details || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 区域配置 */}
          <TabsContent value="zones" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">定位区域配置</CardTitle>
                <CardDescription>配置工厂内的定位区域和边界</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {["Workshop-A", "Warehouse-B", "Assembly-C", "Test-D"].map(zone => {
                    const zoneDevices = devices.filter(d => d.locationZone === zone);
                    const onlineCount = zoneDevices.filter(d => d.status === "online").length;
                    return (
                      <Card key={zone} className="bg-card/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            {zone}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">设备数量</span>
                              <span className="font-medium">{zoneDevices.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">在线设备</span>
                              <span className="font-medium text-emerald-500">{onlineCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">覆盖状态</span>
                              <Badge variant="outline" className={
                                onlineCount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                              }>
                                {onlineCount > 0 ? "正常" : "无覆盖"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 编辑设备对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑设备</DialogTitle>
              <DialogDescription>
                修改设备配置信息
              </DialogDescription>
            </DialogHeader>
            <DeviceForm 
              formData={formData}
              setFormData={setFormData}
              showAuthConfig={showAuthConfig}
              setShowAuthConfig={setShowAuthConfig}
              onProtocolChange={handleProtocolChange}
              onSubmit={handleUpdateDevice}
              submitLabel="保存更改"
            />
          </DialogContent>
        </Dialog>

        {/* 测试连接对话框 */}
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>测试设备连接</DialogTitle>
              <DialogDescription>
                测试与 {selectedDevice?.name} 的连接
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isTesting ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-muted-foreground">正在测试连接...</p>
                </div>
              ) : testResult ? (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-rose-500/10 border-rose-500/20"
                }`}>
                  <div className="flex items-start gap-3">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${testResult.success ? "text-emerald-500" : "text-rose-500"}`}>
                        {testResult.success ? "连接成功" : "连接失败"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {testResult.message}
                      </p>
                      {testResult.latency && (
                        <p className="text-sm text-muted-foreground mt-2">
                          响应延迟: {testResult.latency}ms
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                  关闭
                </Button>
                {selectedDevice && (
                  <Button onClick={() => testDeviceConnection(selectedDevice)} disabled={isTesting}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isTesting ? "animate-spin" : ""}`} />
                    重新测试
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// ============================================================================
// 设备表单组件
// ============================================================================

interface DeviceFormProps {
  formData: {
    deviceCode: string;
    name: string;
    protocol: UWBProtocol;
    apiEndpoint: string;
    authType: AuthType;
    authConfig: string;
    locationZone: string;
    description: string;
    syncInterval: number;
    enabled: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<DeviceFormProps["formData"]>>;
  showAuthConfig: boolean;
  setShowAuthConfig: React.Dispatch<React.SetStateAction<boolean>>;
  onProtocolChange: (protocol: UWBProtocol) => void;
  onSubmit: () => void;
  submitLabel: string;
}

function DeviceForm({ 
  formData, 
  setFormData, 
  showAuthConfig, 
  setShowAuthConfig,
  onProtocolChange,
  onSubmit,
  submitLabel 
}: DeviceFormProps) {
  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deviceCode">设备编号 *</Label>
          <Input
            id="deviceCode"
            placeholder="例如: UWB-DW-001"
            value={formData.deviceCode}
            onChange={e => setFormData(prev => ({ ...prev, deviceCode: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">设备名称 *</Label>
          <Input
            id="name"
            placeholder="例如: 车间A-主定位器"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
      </div>

      {/* 协议和区域 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>协议类型 *</Label>
          <Select 
            value={formData.protocol} 
            onValueChange={(v: UWBProtocol) => onProtocolChange(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(protocolLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationZone">定位区域</Label>
          <Input
            id="locationZone"
            placeholder="例如: Workshop-A"
            value={formData.locationZone}
            onChange={e => setFormData(prev => ({ ...prev, locationZone: e.target.value }))}
          />
        </div>
      </div>

      {/* API端点 */}
      <div className="space-y-2">
        <Label htmlFor="apiEndpoint">API端点 *</Label>
        <Input
          id="apiEndpoint"
          placeholder={protocolDefaultEndpoints[formData.protocol]}
          value={formData.apiEndpoint}
          onChange={e => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          默认端口: {protocolDefaultPorts[formData.protocol]}
        </p>
      </div>

      {/* 认证配置 */}
      <div className="space-y-2">
        <Label>认证方式</Label>
        <Select 
          value={formData.authType} 
          onValueChange={(v: AuthType) => setFormData(prev => ({ ...prev, authType: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(authTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.authType !== "none" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="authConfig">认证配置 (JSON)</Label>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAuthConfig(!showAuthConfig)}
            >
              {showAuthConfig ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <Textarea
            id="authConfig"
            placeholder={
              formData.authType === "api_key" ? '{"apiKey": "your-api-key"}' :
              formData.authType === "basic" ? '{"username": "admin", "password": "***"}' :
              formData.authType === "oauth2" ? '{"clientId": "xxx", "clientSecret": "***"}' :
              '{"certPath": "/path/to/cert.pem"}'
            }
            value={showAuthConfig ? formData.authConfig : formData.authConfig.replace(/./g, "*")}
            onChange={e => setFormData(prev => ({ ...prev, authConfig: e.target.value }))}
            className="font-mono text-sm"
            rows={3}
          />
        </div>
      )}

      {/* 同步间隔 */}
      <div className="space-y-2">
        <Label htmlFor="syncInterval">同步间隔 (毫秒)</Label>
        <Input
          id="syncInterval"
          type="number"
          min={1000}
          max={60000}
          step={1000}
          value={formData.syncInterval}
          onChange={e => setFormData(prev => ({ ...prev, syncInterval: parseInt(e.target.value) || 5000 }))}
        />
        <p className="text-xs text-muted-foreground">
          建议范围: 1000-60000ms，当前: {formData.syncInterval / 1000}秒
        </p>
      </div>

      {/* 描述 */}
      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          placeholder="设备用途和备注..."
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      {/* 启用状态 */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
        <div>
          <Label>启用设备</Label>
          <p className="text-xs text-muted-foreground">启用后将自动开始数据同步</p>
        </div>
        <Switch
          checked={formData.enabled}
          onCheckedChange={checked => setFormData(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onSubmit} disabled={!formData.deviceCode || !formData.name || !formData.apiEndpoint}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
