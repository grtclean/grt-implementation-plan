/**
 * v2.5.34 UWB定位系统管理页面
 * 标签绑定、区域配置、实时位置地图可视化
 * 支持工人与UWB标签的真实数据绑定
 */

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  MapPin, Tag, Users, Battery, Signal, RefreshCw, Plus, Search, AlertTriangle, Layers, Link2, Unlink, Bell, History, Play, Pause, SkipBack, SkipForward, Calendar
} from "lucide-react";
import { useState, useMemo } from "react";

export default function UWBManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tags");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("1");
  
  // 历史轨迹回放状态
  const [selectedTagForHistory, setSelectedTagForHistory] = useState("");
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // 绑定对话框状态
  const [isBindDialogOpen, setIsBindDialogOpen] = useState(false);
  const [newTagId, setNewTagId] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  // 获取标签绑定数据
  const { data: bindingsData, isLoading: bindingsLoading, refetch: refetchBindings } = trpc.uwb.getAllTagBindings.useQuery();
  
  // 获取未绑定工人列表
  const { data: unboundWorkersData } = trpc.uwb.getUnboundWorkers.useQuery();
  
  // 获取区域数据
  const { data: zonesData } = trpc.uwb.getAllZones.useQuery();
  
  // 获取实时位置数据
  const { data: locationsData, refetch: refetchLocations } = trpc.uwb.getRealtimeLocations.useQuery(undefined, {
    refetchInterval: 10000, // 每10秒刷新
  });
  
  // 获取低电量告警
  const { data: lowBatteryAlertsData, refetch: refetchAlerts } = trpc.uwb.getLowBatteryAlerts.useQuery({ threshold: 20 });
  
  // 获取丢失标签告警
  const { data: lostTagAlertsData } = trpc.uwb.getLostTagAlerts.useQuery({ offlineMinutes: 30 });
  
  // 获取历史轨迹数据
  const { data: historyTrackData, isLoading: historyLoading } = trpc.uwb.getHistoryTrack.useQuery(
    { tagId: selectedTagForHistory, date: historyDate },
    { enabled: !!selectedTagForHistory && !!historyDate }
  );
  
  // 获取可用历史日期
  const { data: availableDatesData } = trpc.uwb.getAvailableHistoryDates.useQuery(
    { tagId: selectedTagForHistory },
    { enabled: !!selectedTagForHistory }
  );
  
  // 发送低电量通知
  const sendNotificationMutation = trpc.uwb.sendLowBatteryNotification.useMutation({
    onSuccess: () => {
      toast({ title: "通知已发送", description: "低电量告警通知已发送给相关人员" });
    },
    onError: (error) => {
      toast({ title: "发送失败", description: error.message, variant: "destructive" });
    },
  });
  
  // 绑定标签mutation
  const bindTagMutation = trpc.uwb.bindTag.useMutation({
    onSuccess: () => {
      toast({ title: "绑定成功", description: "UWB标签已成功绑定到工人" });
      setIsBindDialogOpen(false);
      setNewTagId("");
      setSelectedWorkerId("");
      refetchBindings();
    },
    onError: (error) => {
      toast({ title: "绑定失败", description: error.message, variant: "destructive" });
    },
  });
  
  // 解绑标签mutation
  const unbindTagMutation = trpc.uwb.unbindTag.useMutation({
    onSuccess: () => {
      toast({ title: "解绑成功", description: "UWB标签已解绑" });
      refetchBindings();
    },
    onError: (error) => {
      toast({ title: "解绑失败", description: error.message, variant: "destructive" });
    },
  });

  // 处理数据
  const bindings = useMemo(() => bindingsData || [], [bindingsData]);
  const unboundWorkers = useMemo(() => unboundWorkersData || [], [unboundWorkersData]);
  const zones = useMemo(() => zonesData || [], [zonesData]);
  const locations = useMemo(() => locationsData || [], [locationsData]);

  // 统计数据
  const stats = useMemo(() => ({
    totalTags: bindings.length,
    activeTags: bindings.filter(b => b.status === "active").length,
    lowBatteryTags: bindings.filter(b => b.batteryLevel < 20).length,
    lostTags: bindings.filter(b => b.status === "lost").length,
  }), [bindings]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">在线</Badge>;
      case "inactive": return <Badge variant="outline">离线</Badge>;
      case "lost": return <Badge variant="destructive">丢失</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-500";
    if (level > 20) return "text-yellow-500";
    return "text-red-500";
  };

  const getZoneTypeLabel = (type: string) => {
    switch (type) {
      case "production": return "生产区";
      case "assembly": return "装配区";
      case "testing": return "测试区";
      case "warehouse": return "仓储区";
      case "office": return "办公区";
      case "rest": return "休息区";
      default: return type;
    }
  };

  const filteredBindings = useMemo(() => 
    bindings.filter(b => 
      b.employeeName.includes(searchTerm) || 
      b.tagId.includes(searchTerm) || 
      b.department.includes(searchTerm)
    ), [bindings, searchTerm]);

  const handleBindTag = () => {
    if (!newTagId || !selectedWorkerId) {
      toast({ title: "请填写完整信息", variant: "destructive" });
      return;
    }
    bindTagMutation.mutate({ tagId: newTagId, employeeId: selectedWorkerId });
  };

  const handleUnbindTag = (tagId: string) => {
    if (confirm("确定要解绑此标签吗？")) {
      unbindTagMutation.mutate({ tagId });
    }
  };

  const handleRefresh = () => {
    refetchBindings();
    refetchLocations();
    toast({ title: "正在刷新数据..." });
  };

  // 模拟区域数据（如果API没有返回）
  const displayZones = zones.length > 0 ? zones : [
    { id: "area1", zoneName: "生产区A", zoneType: "production", floor: 1, color: "#3b82f6", capacity: 20 },
    { id: "area2", zoneName: "生产区B", zoneType: "production", floor: 1, color: "#10b981", capacity: 15 },
    { id: "area3", zoneName: "仓储区", zoneType: "warehouse", floor: 1, color: "#f59e0b", capacity: 10 },
    { id: "area4", zoneName: "办公区", zoneType: "office", floor: 2, color: "#8b5cf6", capacity: 12 },
    { id: "area5", zoneName: "休息区", zoneType: "rest", floor: 2, color: "#ec4899", capacity: 8 },
  ];

  const floorLocations = locations.filter(l => (l as any).floor === parseInt(selectedFloor) || selectedFloor === "1");
  const floorZones = displayZones.filter((a: any) => a.floor === parseInt(selectedFloor) || selectedFloor === "1");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              UWB定位系统管理
            </h1>
            <p className="text-muted-foreground mt-1">管理UWB标签、工人绑定和实时位置追踪</p>
          </div>
          <Button onClick={handleRefresh}><RefreshCw className="w-4 h-4 mr-1" />刷新数据</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><Tag className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">总标签数</p><p className="text-xl font-bold">{stats.totalTags}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><Signal className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">在线标签</p><p className="text-xl font-bold">{stats.activeTags}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><Battery className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">低电量</p><p className="text-xl font-bold">{stats.lowBatteryTags}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500"><AlertTriangle className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">丢失标签</p><p className="text-xl font-bold">{stats.lostTags}</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="tags"><Tag className="w-4 h-4 mr-1" />标签绑定</TabsTrigger>
            <TabsTrigger value="areas"><Layers className="w-4 h-4 mr-1" />区域配置</TabsTrigger>
            <TabsTrigger value="map"><MapPin className="w-4 h-4 mr-1" />实时位置</TabsTrigger>
            <TabsTrigger value="alerts" className="relative">
              <Bell className="w-4 h-4 mr-1" />告警中心
              {((lowBatteryAlertsData?.length || 0) + (lostTagAlertsData?.length || 0)) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {(lowBatteryAlertsData?.length || 0) + (lostTagAlertsData?.length || 0)}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />轨迹回放</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">标签绑定管理</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="搜索工人/标签..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-8 w-[200px]" 
                    />
                  </div>
                  
                  {/* 绑定标签对话框 */}
                  <Dialog open={isBindDialogOpen} onOpenChange={setIsBindDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" />绑定标签</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Link2 className="w-5 h-5" />
                          绑定UWB标签
                        </DialogTitle>
                        <DialogDescription>将UWB标签绑定到工人，用于实时定位和工时采集</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>标签ID</Label>
                          <Input 
                            placeholder="输入UWB标签ID，如TAG001" 
                            value={newTagId}
                            onChange={(e) => setNewTagId(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>选择工人</Label>
                          <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择要绑定的工人" />
                            </SelectTrigger>
                            <SelectContent>
                              {unboundWorkers.length === 0 ? (
                                <SelectItem value="none" disabled>暂无未绑定工人</SelectItem>
                              ) : (
                                unboundWorkers.map((worker) => (
                                  <SelectItem key={worker.id} value={worker.id}>
                                    {worker.name} - {worker.department || '未分配部门'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {unboundWorkers.length === 0 && (
                            <p className="text-xs text-muted-foreground">所有工人已绑定标签，或请先在工人管理中添加工人</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBindDialogOpen(false)}>取消</Button>
                        <Button 
                          onClick={handleBindTag} 
                          disabled={bindTagMutation.isPending || !newTagId || !selectedWorkerId}
                        >
                          {bindTagMutation.isPending ? "绑定中..." : "确认绑定"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {bindingsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : filteredBindings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无标签绑定数据，请点击"绑定标签"添加
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>标签ID</TableHead>
                        <TableHead>工人</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>电量</TableHead>
                        <TableHead>最后在线</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBindings.map((binding) => (
                        <TableRow key={binding.tagId} className={binding.status === "lost" ? "bg-red-500/5" : ""}>
                          <TableCell className="font-mono text-sm">{binding.tagId}</TableCell>
                          <TableCell className="font-medium">{binding.employeeName}</TableCell>
                          <TableCell>{binding.department || '-'}</TableCell>
                          <TableCell>{getStatusBadge(binding.status)}</TableCell>
                          <TableCell>
                            <span className={getBatteryColor(binding.batteryLevel)}>{binding.batteryLevel}%</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {binding.lastSeen ? new Date(binding.lastSeen).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleUnbindTag(binding.tagId)}
                              disabled={unbindTagMutation.isPending}
                            >
                              <Unlink className="w-4 h-4 mr-1" />解绑
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">工作区域配置</CardTitle>
                <Button size="sm" onClick={() => toast({ title: "功能开发中..." })}>
                  <Plus className="w-4 h-4 mr-1" />添加区域
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>区域名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>楼层</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead>容量</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayZones.map((area: any) => (
                      <TableRow key={area.id}>
                        <TableCell className="font-medium">{area.zoneName}</TableCell>
                        <TableCell><Badge variant="outline">{getZoneTypeLabel(area.zoneType)}</Badge></TableCell>
                        <TableCell>{area.floor || 1}F</TableCell>
                        <TableCell>
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: area.color || '#3b82f6' }} />
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" />{area.capacity}</span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: "功能开发中..." })}>
                            编辑
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">实时位置地图</CardTitle>
                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="选择楼层" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1楼</SelectItem>
                    <SelectItem value="2">2楼</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[400px] bg-secondary/30 rounded-lg border border-border overflow-hidden">
                  {/* 区域显示 */}
                  {floorZones.map((area: any, idx) => (
                    <div 
                      key={area.id} 
                      className="absolute rounded-lg opacity-30" 
                      style={{ 
                        backgroundColor: area.color || '#3b82f6', 
                        left: `${5 + (idx % 3) * 32}%`, 
                        top: `${10 + Math.floor(idx / 3) * 45}%`, 
                        width: "28%", 
                        height: "38%" 
                      }}
                    >
                      <span className="absolute top-2 left-2 text-xs font-medium text-foreground">
                        {area.zoneName}
                      </span>
                    </div>
                  ))}
                  
                  {/* 工人位置标记 */}
                  {floorLocations.map((loc) => (
                    <div 
                      key={loc.tagId} 
                      className="absolute w-8 h-8 -ml-4 -mt-4 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform" 
                      style={{ left: `${loc.x || 50}%`, top: `${loc.y || 50}%` }} 
                      title={`${loc.employeeName || '未知'} - ${loc.zoneName || '未知区域'}`}
                    >
                      {(loc.employeeName || '?').charAt(0)}
                    </div>
                  ))}
                  
                  {/* 信息面板 */}
                  <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border">
                    <p className="text-xs font-medium mb-2">当前楼层: {selectedFloor}F</p>
                    <p className="text-xs text-muted-foreground">在线工人: {floorLocations.length}人</p>
                    <p className="text-xs text-muted-foreground">区域数: {floorZones.length}个</p>
                  </div>
                  
                  {/* 空状态提示 */}
                  {floorLocations.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>暂无实时位置数据</p>
                        <p className="text-xs">请确保UWB标签已绑定并在线</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 告警中心Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 低电量告警 */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Battery className="w-5 h-5 text-yellow-500" />
                    低电量告警
                    <Badge variant="outline" className="ml-auto">{lowBatteryAlertsData?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(lowBatteryAlertsData?.length || 0) === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Battery className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>暂无低电量告警</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {lowBatteryAlertsData?.map((alert: any) => (
                        <div key={alert.tagId} className={`p-3 rounded-lg border ${alert.severity === 'critical' ? 'border-red-500 bg-red-500/10' : 'border-yellow-500 bg-yellow-500/10'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4" />
                              <span className="font-medium">{alert.tagId}</span>
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                                {alert.batteryLevel}%
                              </Badge>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendNotificationMutation.mutate({ tagId: alert.tagId })}
                              disabled={sendNotificationMutation.isPending}
                            >
                              <Bell className="w-3 h-3 mr-1" />通知
                            </Button>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p>工人: {alert.employeeName}</p>
                            <p>部门: {alert.department || '未分配'}</p>
                            {alert.lastSeen && <p>最后在线: {new Date(alert.lastSeen).toLocaleString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 丢失标签告警 */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    丢失标签告警
                    <Badge variant="destructive" className="ml-auto">{lostTagAlertsData?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(lostTagAlertsData?.length || 0) === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Signal className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>暂无丢失标签</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {lostTagAlertsData?.map((alert: any) => (
                        <div key={alert.tagId} className="p-3 rounded-lg border border-red-500 bg-red-500/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4" />
                              <span className="font-medium">{alert.tagId}</span>
                              <Badge variant="destructive">离线 {alert.offlineDuration || '?'}分钟</Badge>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p>工人: {alert.employeeName}</p>
                            <p>部门: {alert.department || '未分配'}</p>
                            {alert.lastSeen && <p>最后在线: {new Date(alert.lastSeen).toLocaleString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 轨迹回放Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  历史轨迹回放
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="space-y-1">
                    <Label>选择标签</Label>
                    <Select value={selectedTagForHistory} onValueChange={(v) => { setSelectedTagForHistory(v); setPlaybackIndex(0); setIsPlaying(false); }}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择要回放的标签" />
                      </SelectTrigger>
                      <SelectContent>
                        {bindings.map((b: any) => (
                          <SelectItem key={b.tagId} value={b.tagId}>
                            {b.tagId} - {b.employeeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>选择日期</Label>
                    <Input 
                      type="date" 
                      value={historyDate} 
                      onChange={(e) => { setHistoryDate(e.target.value); setPlaybackIndex(0); setIsPlaying(false); }}
                      className="w-[180px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>播放速度</Label>
                    <Select value={String(playbackSpeed)} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 播放控制栏 */}
                {selectedTagForHistory && historyTrackData && historyTrackData.length > 0 && (
                  <div className="flex items-center gap-4 mb-4 p-3 bg-secondary/30 rounded-lg">
                    <Button size="sm" variant="outline" onClick={() => setPlaybackIndex(0)}>
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={isPlaying ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPlaybackIndex(Math.min(playbackIndex + 10, historyTrackData.length - 1))}>
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <input 
                        type="range" 
                        min="0" 
                        max={historyTrackData.length - 1} 
                        value={playbackIndex}
                        onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {playbackIndex + 1} / {historyTrackData.length}
                    </span>
                  </div>
                )}

                {/* 轨迹地图 */}
                <div className="relative h-[500px] bg-secondary/20 rounded-lg border border-border overflow-hidden">
                  {!selectedTagForHistory ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>请选择标签和日期开始回放</p>
                      </div>
                    </div>
                  ) : historyLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (historyTrackData?.length || 0) === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>该日期暂无轨迹数据</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 绘制轨迹线 */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <polyline
                          points={historyTrackData.slice(0, playbackIndex + 1).map((p: any) => `${p.x || 50}%,${p.y || 50}%`).join(' ')}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.6"
                        />
                      </svg>
                      
                      {/* 当前位置标记 */}
                      {historyTrackData[playbackIndex] && (
                        <div 
                          className="absolute w-10 h-10 -ml-5 -mt-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg animate-pulse"
                          style={{ 
                            left: `${historyTrackData[playbackIndex].x || 50}%`, 
                            top: `${historyTrackData[playbackIndex].y || 50}%` 
                          }}
                        >
                          <MapPin className="w-5 h-5" />
                        </div>
                      )}
                      
                      {/* 信息面板 */}
                      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border">
                        <p className="text-xs font-medium mb-1">当前位置</p>
                        {historyTrackData[playbackIndex] && (
                          <>
                            <p className="text-xs text-muted-foreground">区域: {historyTrackData[playbackIndex].zoneName || '未知'}</p>
                            <p className="text-xs text-muted-foreground">时间: {new Date(historyTrackData[playbackIndex].timestamp).toLocaleTimeString()}</p>
                            <p className="text-xs text-muted-foreground">坐标: ({(historyTrackData[playbackIndex].x || 0).toFixed(1)}, {(historyTrackData[playbackIndex].y || 0).toFixed(1)})</p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 可用日期列表 */}
                {selectedTagForHistory && availableDatesData && availableDatesData.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm text-muted-foreground">可用历史日期:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableDatesData.slice(0, 10).map((d: any) => (
                        <Button 
                          key={d.date} 
                          size="sm" 
                          variant={historyDate === d.date ? "default" : "outline"}
                          onClick={() => { setHistoryDate(d.date); setPlaybackIndex(0); setIsPlaying(false); }}
                        >
                          {d.date} ({d.pointCount}点)
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
