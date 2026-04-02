/**
 * 云端摄像头管理中心 — Cloud Camera Hub
 * 工业清洗设备视觉监控平台：设备注册、实时画面、分组布局、事件告警、维保记录
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  Video,
  Eye,
  Settings,
  AlertTriangle,
  Wrench,
  Plus,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Grid3X3,
  Maximize,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Image,
  Bell,
  Shield,
  Trash2,
  Edit,
  MapPin,
  Activity,
  CheckCircle,
} from "lucide-react";

// ─── Brand Colors ──────────────────────────────────────────────
const BRAND_COLORS: Record<string, string> = {
  hikvision: "#CC2229",
  dahua: "#0068B7",
  axis: "#FFD700",
  basler: "#00A651",
  cognex: "#7B2D8E",
  keyence: "#FF6600",
};

const BRAND_LABELS: Record<string, string> = {
  hikvision: "海康威视",
  dahua: "大华",
  axis: "Axis",
  basler: "Basler",
  cognex: "Cognex",
  keyence: "Keyence",
};

const LOCATION_OPTIONS = ["ALL", "SHOPFLOOR", "WAREHOUSE", "LOBBY", "CLEANROOM"] as const;
const LOCATION_LABELS: Record<string, string> = {
  ALL: "全部",
  SHOPFLOOR: "车间",
  WAREHOUSE: "仓库",
  LOBBY: "大厅",
  CLEANROOM: "洁净室",
};

const PURPOSE_OPTIONS = ["quality_inspection", "safety_monitor", "process_monitor", "access_control", "inventory_scan"] as const;
const PURPOSE_LABELS: Record<string, string> = {
  quality_inspection: "质检监控",
  safety_monitor: "安全监控",
  process_monitor: "工序监控",
  access_control: "门禁监控",
  inventory_scan: "库存扫描",
};

const PROTOCOL_OPTIONS = ["rtsp", "onvif", "rtmp", "http_flv", "gige_vision"] as const;

// ─── Types ─────────────────────────────────────────────────────
interface CameraDevice {
  id: number;
  cameraCode: string;
  name: string;
  brand: string;
  model: string;
  protocol: string;
  ipAddress: string;
  port: number;
  rtspUrl: string;
  username: string;
  password: string;
  location: string;
  purpose: string;
  resolution: string;
  fps: number;
  hasPtz: boolean;
  hasAiAnalysis: boolean;
  status: "online" | "offline" | "maintenance";
  lastHeartbeat: string;
}

interface CameraGroup {
  id: number;
  name: string;
  layoutType: string;
  cameraIds: number[];
  displayScreen: string;
}

interface CameraEvent {
  id: number;
  cameraId: number;
  cameraName: string;
  eventType: string;
  severity: "info" | "warning" | "critical";
  description: string;
  timestamp: string;
  acknowledged: boolean;
}

interface MaintenanceRecord {
  id: number;
  cameraId: number;
  cameraName: string;
  actionType: string;
  performedBy: string;
  notes: string;
  date: string;
}

// ─── Demo Data ─────────────────────────────────────────────────
const demoCameras: CameraDevice[] = [
  { id: 1, cameraCode: "CAM-SF-001", name: "清洗线1号入口", brand: "hikvision", model: "DS-2CD2T47G2-L", protocol: "rtsp", ipAddress: "192.168.10.101", port: 554, rtspUrl: "rtsp://192.168.10.101:554/ch1/main", username: "admin", password: "****", location: "SHOPFLOOR", purpose: "process_monitor", resolution: "2688x1520", fps: 25, hasPtz: true, hasAiAnalysis: true, status: "online", lastHeartbeat: "2026-03-22 09:58:31" },
  { id: 2, cameraCode: "CAM-SF-002", name: "清洗线1号出口", brand: "hikvision", model: "DS-2CD2T47G2-L", protocol: "rtsp", ipAddress: "192.168.10.102", port: 554, rtspUrl: "rtsp://192.168.10.102:554/ch1/main", username: "admin", password: "****", location: "SHOPFLOOR", purpose: "quality_inspection", resolution: "2688x1520", fps: 25, hasPtz: false, hasAiAnalysis: true, status: "online", lastHeartbeat: "2026-03-22 09:58:29" },
  { id: 3, cameraCode: "CAM-SF-003", name: "超声波槽侧视", brand: "basler", model: "acA2440-75gc", protocol: "gige_vision", ipAddress: "192.168.10.103", port: 3956, rtspUrl: "", username: "", password: "", location: "SHOPFLOOR", purpose: "quality_inspection", resolution: "2448x2048", fps: 75, hasPtz: false, hasAiAnalysis: true, status: "online", lastHeartbeat: "2026-03-22 09:58:30" },
  { id: 4, cameraCode: "CAM-SF-004", name: "干燥室全景", brand: "dahua", model: "DH-IPC-HFW5442T-ZE", protocol: "rtsp", ipAddress: "192.168.10.104", port: 554, rtspUrl: "rtsp://192.168.10.104:554/cam/realmonitor", username: "admin", password: "****", location: "SHOPFLOOR", purpose: "safety_monitor", resolution: "2688x1520", fps: 25, hasPtz: true, hasAiAnalysis: false, status: "online", lastHeartbeat: "2026-03-22 09:58:25" },
  { id: 5, cameraCode: "CAM-WH-001", name: "成品库A区", brand: "dahua", model: "DH-IPC-HFW5442T-ZE", protocol: "rtsp", ipAddress: "192.168.10.111", port: 554, rtspUrl: "rtsp://192.168.10.111:554/cam/realmonitor", username: "admin", password: "****", location: "WAREHOUSE", purpose: "inventory_scan", resolution: "2688x1520", fps: 25, hasPtz: true, hasAiAnalysis: false, status: "online", lastHeartbeat: "2026-03-22 09:58:28" },
  { id: 6, cameraCode: "CAM-WH-002", name: "原料库B区", brand: "hikvision", model: "DS-2CD2T86G2-ISU", protocol: "rtsp", ipAddress: "192.168.10.112", port: 554, rtspUrl: "rtsp://192.168.10.112:554/ch1/main", username: "admin", password: "****", location: "WAREHOUSE", purpose: "safety_monitor", resolution: "3840x2160", fps: 20, hasPtz: false, hasAiAnalysis: false, status: "offline", lastHeartbeat: "2026-03-22 08:12:04" },
  { id: 7, cameraCode: "CAM-LB-001", name: "展厅入口", brand: "axis", model: "P3265-LVE", protocol: "onvif", ipAddress: "192.168.10.121", port: 80, rtspUrl: "rtsp://192.168.10.121/axis-media/media.amp", username: "root", password: "****", location: "LOBBY", purpose: "access_control", resolution: "1920x1080", fps: 30, hasPtz: true, hasAiAnalysis: true, status: "online", lastHeartbeat: "2026-03-22 09:58:32" },
  { id: 8, cameraCode: "CAM-LB-002", name: "客户接待区", brand: "axis", model: "M3116-LVE", protocol: "onvif", ipAddress: "192.168.10.122", port: 80, rtspUrl: "rtsp://192.168.10.122/axis-media/media.amp", username: "root", password: "****", location: "LOBBY", purpose: "access_control", resolution: "2560x1440", fps: 30, hasPtz: false, hasAiAnalysis: false, status: "online", lastHeartbeat: "2026-03-22 09:58:30" },
  { id: 9, cameraCode: "CAM-CR-001", name: "洁净室工位A", brand: "cognex", model: "In-Sight 2800", protocol: "gige_vision", ipAddress: "192.168.10.131", port: 3956, rtspUrl: "", username: "", password: "", location: "CLEANROOM", purpose: "quality_inspection", resolution: "1440x1080", fps: 60, hasPtz: false, hasAiAnalysis: true, status: "online", lastHeartbeat: "2026-03-22 09:58:31" },
  { id: 10, cameraCode: "CAM-CR-002", name: "洁净室工位B", brand: "keyence", model: "CV-X480F", protocol: "gige_vision", ipAddress: "192.168.10.132", port: 3956, rtspUrl: "", username: "", password: "", location: "CLEANROOM", purpose: "quality_inspection", resolution: "2048x1536", fps: 50, hasPtz: false, hasAiAnalysis: true, status: "maintenance", lastHeartbeat: "2026-03-22 07:30:00" },
  { id: 11, cameraCode: "CAM-SF-005", name: "包装线全景", brand: "dahua", model: "DH-IPC-HDW5442T-ZE", protocol: "rtsp", ipAddress: "192.168.10.105", port: 554, rtspUrl: "rtsp://192.168.10.105:554/cam/realmonitor", username: "admin", password: "****", location: "SHOPFLOOR", purpose: "process_monitor", resolution: "2688x1520", fps: 25, hasPtz: true, hasAiAnalysis: false, status: "online", lastHeartbeat: "2026-03-22 09:58:27" },
  { id: 12, cameraCode: "CAM-SF-006", name: "喷淋段检测", brand: "basler", model: "acA1920-40gc", protocol: "gige_vision", ipAddress: "192.168.10.106", port: 3956, rtspUrl: "", username: "", password: "", location: "SHOPFLOOR", purpose: "quality_inspection", resolution: "1920x1200", fps: 40, hasPtz: false, hasAiAnalysis: true, status: "online", lastHeartbeat: "2026-03-22 09:58:26" },
];

const demoGroups: CameraGroup[] = [
  { id: 1, name: "清洗线监控组", layoutType: "2x2", cameraIds: [1, 2, 3, 4], displayScreen: "车间LED大屏A" },
  { id: 2, name: "仓库安防组", layoutType: "1x2", cameraIds: [5, 6], displayScreen: "安防监控室" },
  { id: 3, name: "大厅门禁组", layoutType: "2x1", cameraIds: [7, 8], displayScreen: "前台显示器" },
  { id: 4, name: "洁净室质检组", layoutType: "1x2", cameraIds: [9, 10], displayScreen: "洁净室控制台" },
  { id: 5, name: "全厂总览", layoutType: "3x3", cameraIds: [1, 2, 4, 5, 7, 9, 11, 12, 3], displayScreen: "总经理办公室" },
];

const demoEvents: CameraEvent[] = [
  { id: 1, cameraId: 6, cameraName: "原料库B区", eventType: "device_offline", severity: "critical", description: "设备心跳超时，已持续1小时46分钟未响应", timestamp: "2026-03-22 08:12:04", acknowledged: false },
  { id: 2, cameraId: 10, cameraName: "洁净室工位B", eventType: "maintenance_mode", severity: "warning", description: "设备进入维护模式，镜头校准中", timestamp: "2026-03-22 07:30:00", acknowledged: true },
  { id: 3, cameraId: 1, cameraName: "清洗线1号入口", eventType: "motion_detected", severity: "info", description: "检测到异常运动：非工作时间段人员进入", timestamp: "2026-03-22 06:15:22", acknowledged: false },
  { id: 4, cameraId: 9, cameraName: "洁净室工位A", eventType: "ai_defect_alert", severity: "warning", description: "AI视觉检测：工件表面疑似划痕 (置信度 87%)", timestamp: "2026-03-22 09:45:11", acknowledged: false },
  { id: 5, cameraId: 3, cameraName: "超声波槽侧视", eventType: "ai_defect_alert", severity: "critical", description: "AI视觉检测：清洗液液位低于安全线 (置信度 94%)", timestamp: "2026-03-22 09:30:05", acknowledged: false },
  { id: 6, cameraId: 7, cameraName: "展厅入口", eventType: "person_detected", severity: "info", description: "人脸识别：未登记访客进入展厅区域", timestamp: "2026-03-22 09:20:18", acknowledged: true },
  { id: 7, cameraId: 4, cameraName: "干燥室全景", eventType: "temperature_warning", severity: "warning", description: "画面分析：干燥室温度异常升高，建议巡检", timestamp: "2026-03-22 09:10:33", acknowledged: false },
  { id: 8, cameraId: 5, cameraName: "成品库A区", eventType: "storage_anomaly", severity: "info", description: "检测到托盘堆放高度超限（区域C-3）", timestamp: "2026-03-22 08:55:41", acknowledged: true },
];

const demoMaintenance: MaintenanceRecord[] = [
  { id: 1, cameraId: 10, cameraName: "洁净室工位B", actionType: "calibration", performedBy: "胡杨", notes: "更换偏光滤镜，重新校准焦距与白平衡", date: "2026-03-22 07:30" },
  { id: 2, cameraId: 6, cameraName: "原料库B区", actionType: "firmware_update", performedBy: "朱宇浩", notes: "固件升级至V2.800 build 230410，升级后断网待查", date: "2026-03-21 16:00" },
  { id: 3, cameraId: 1, cameraName: "清洗线1号入口", actionType: "lens_clean", performedBy: "李大鹏", notes: "清洗线雾气导致镜头凝结水珠，已清洁并加装防雾罩", date: "2026-03-20 14:30" },
  { id: 4, cameraId: 4, cameraName: "干燥室全景", actionType: "position_adjust", performedBy: "朱宇浩", notes: "调整云台角度覆盖干燥室右侧盲区", date: "2026-03-19 10:00" },
  { id: 5, cameraId: 12, cameraName: "喷淋段检测", actionType: "replaced", performedBy: "胡杨", notes: "旧basler acA1300坏，更换为acA1920-40gc", date: "2026-03-15 09:00" },
  { id: 6, cameraId: 7, cameraName: "展厅入口", actionType: "lens_clean", performedBy: "李大鹏", notes: "常规季度清洁维护", date: "2026-03-10 11:00" },
];

const ACTION_LABELS: Record<string, string> = {
  lens_clean: "镜头清洁",
  firmware_update: "固件升级",
  position_adjust: "位置调整",
  replaced: "设备更换",
  calibration: "校准",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

// ─── Helpers ───────────────────────────────────────────────────
function brandBadge(brand: string) {
  const color = BRAND_COLORS[brand] || "#666";
  const label = BRAND_LABELS[brand] || brand;
  return (
    <Badge
      variant="outline"
      className="text-xs font-medium border"
      style={{ color, borderColor: color, backgroundColor: `${color}10` }}
    >
      {label}
    </Badge>
  );
}

function statusDot(status: string) {
  const color = status === "online" ? "bg-green-500" : status === "offline" ? "bg-red-500" : "bg-yellow-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    online: { label: "在线", variant: "default" },
    offline: { label: "离线", variant: "destructive" },
    maintenance: { label: "维护中", variant: "secondary" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ─── Component ─────────────────────────────────────────────────
export default function CloudCameraHub() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Overview filters
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [filterBrand, setFilterBrand] = useState("ALL");

  // Device registry
  const [searchText, setSearchText] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraDevice | null>(null);

  // Live view
  const [liveLayout, setLiveLayout] = useState<"1x1" | "2x2" | "3x3">("2x2");
  const [liveCameras, setLiveCameras] = useState<(number | null)[]>([1, 2, 3, 4]);
  const [selectedLiveCell, setSelectedLiveCell] = useState<number | null>(null);

  // Groups
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // Events
  const [eventSeverityFilter, setEventSeverityFilter] = useState("ALL");
  const [eventCameraFilter, setEventCameraFilter] = useState("ALL");
  const [events, setEvents] = useState(demoEvents);

  // Maintenance
  const [maintDialogOpen, setMaintDialogOpen] = useState(false);

  // ─── Derived ───────────────────────────────────────────
  const filteredCameras = demoCameras.filter((c) => {
    if (filterLocation !== "ALL" && c.location !== filterLocation) return false;
    if (filterBrand !== "ALL" && c.brand !== filterBrand) return false;
    return true;
  });

  const onlineCount = demoCameras.filter((c) => c.status === "online").length;
  const offlineCount = demoCameras.filter((c) => c.status === "offline").length;
  const alertCount = events.filter((e) => !e.acknowledged).length;

  const registryFiltered = demoCameras.filter((c) =>
    !searchText || c.name.includes(searchText) || c.cameraCode.toLowerCase().includes(searchText.toLowerCase()) || c.ipAddress.includes(searchText)
  );

  const filteredEvents = events.filter((e) => {
    if (eventSeverityFilter !== "ALL" && e.severity !== eventSeverityFilter) return false;
    if (eventCameraFilter !== "ALL" && String(e.cameraId) !== eventCameraFilter) return false;
    return true;
  });

  // Brand distribution
  const brandCounts = demoCameras.reduce<Record<string, number>>((acc, c) => {
    acc[c.brand] = (acc[c.brand] || 0) + 1;
    return acc;
  }, {});

  const layoutCells = liveLayout === "1x1" ? 1 : liveLayout === "2x2" ? 4 : 9;

  const handleAcknowledge = useCallback((eventId: number) => {
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, acknowledged: true } : e));
    toast({ title: "已确认", description: "事件已标记为已确认" });
  }, [toast]);

  const handleRefresh = useCallback(() => {
    toast({ title: "刷新成功", description: "设备状态已更新" });
  }, [toast]);

  const handleLayoutChange = useCallback((layout: "1x1" | "2x2" | "3x3") => {
    setLiveLayout(layout);
    const cells = layout === "1x1" ? 1 : layout === "2x2" ? 4 : 9;
    setLiveCameras((prev) => {
      const next = Array(cells).fill(null) as (number | null)[];
      for (let i = 0; i < Math.min(prev.length, cells); i++) next[i] = prev[i];
      return next;
    });
    setSelectedLiveCell(null);
  }, []);

  const handleLiveCameraSelect = useCallback((cellIndex: number, cameraId: string) => {
    setLiveCameras((prev) => {
      const next = [...prev];
      next[cellIndex] = cameraId === "none" ? null : Number(cameraId);
      return next;
    });
  }, []);

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-7 w-7" /> 云端摄像头管理中心
          </h1>
          <p className="text-muted-foreground mt-1">Cloud Camera Hub — 工业清洗设备视觉监控平台</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> 刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl mb-6">
          <TabsTrigger value="overview" className="gap-1"><Eye className="h-4 w-4" /> 总览</TabsTrigger>
          <TabsTrigger value="registry" className="gap-1"><Settings className="h-4 w-4" /> 设备注册</TabsTrigger>
          <TabsTrigger value="live" className="gap-1"><Video className="h-4 w-4" /> 实时画面</TabsTrigger>
          <TabsTrigger value="groups" className="gap-1"><Grid3X3 className="h-4 w-4" /> 分组布局</TabsTrigger>
          <TabsTrigger value="events" className="gap-1"><Bell className="h-4 w-4" /> 事件告警</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1"><Wrench className="h-4 w-4" /> 维保记录</TabsTrigger>
        </TabsList>

        {/* ───────────── Tab 1: Overview ───────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">总设备数</p>
                    <p className="text-3xl font-bold">{demoCameras.length}</p>
                  </div>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">在线</p>
                    <p className="text-3xl font-bold text-green-600">{onlineCount}</p>
                  </div>
                  <Wifi className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">离线</p>
                    <p className="text-3xl font-bold text-red-600">{offlineCount}</p>
                  </div>
                  <WifiOff className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">未处理告警</p>
                    <p className="text-3xl font-bold text-amber-600">{alertCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-40"><SelectValue placeholder="位置筛选" /></SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{LOCATION_LABELS[loc]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="w-40"><SelectValue placeholder="品牌筛选" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部品牌</SelectItem>
                {Object.keys(BRAND_LABELS).map((b) => (
                  <SelectItem key={b} value={b}>{BRAND_LABELS[b]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camera status grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCameras.map((cam) => (
              <Card key={cam.id} className="border hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{cam.name}</p>
                      <p className="text-xs text-muted-foreground">{cam.cameraCode}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusDot(cam.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {brandBadge(cam.brand)}
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />{LOCATION_LABELS[cam.location] || cam.location}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cam.resolution} · {cam.fps}fps</span>
                    <span>{cam.lastHeartbeat.split(" ")[1]}</span>
                  </div>
                  <div className="flex gap-1">
                    {cam.hasPtz && <Badge variant="secondary" className="text-[10px]">PTZ</Badge>}
                    {cam.hasAiAnalysis && <Badge variant="secondary" className="text-[10px]">AI</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Brand distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">品牌分布 Brand Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).map(([brand, count]) => (
                  <div key={brand} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium">{BRAND_LABELS[brand]}</span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${(count / demoCameras.length) * 100}%`,
                          backgroundColor: BRAND_COLORS[brand],
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────────── Tab 2: Device Registry ───────────── */}
        <TabsContent value="registry" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索名称/编码/IP..."
                  className="pl-9 w-64"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toast({ title: "ONVIF 扫描", description: "扫描中...请稍候" })}>
                <Wifi className="h-4 w-4 mr-1" /> ONVIF 自动发现
              </Button>
              <Button size="sm" onClick={() => { setEditingCamera(null); setAddDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> 添加摄像头
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead>型号</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registryFiltered.map((cam) => (
                  <TableRow key={cam.id}>
                    <TableCell className="font-mono text-xs">{cam.cameraCode}</TableCell>
                    <TableCell className="font-medium">{cam.name}</TableCell>
                    <TableCell>{brandBadge(cam.brand)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cam.model}</TableCell>
                    <TableCell className="font-mono text-xs">{cam.ipAddress}:{cam.port}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{LOCATION_LABELS[cam.location]}</Badge></TableCell>
                    <TableCell className="text-xs">{PURPOSE_LABELS[cam.purpose]}</TableCell>
                    <TableCell>{statusBadge(cam.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="连接测试"
                          onClick={() => toast({ title: "连接测试", description: `${cam.name} — 连接正常 (${cam.ipAddress})` })}
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="编辑"
                          onClick={() => { setEditingCamera(cam); setAddDialogOpen(true); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          title="删除"
                          onClick={() => toast({ title: "已删除", description: `${cam.name} 已移除`, variant: "destructive" })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add/Edit Camera Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCamera ? "编辑摄像头" : "添加摄像头"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">名称</label>
                  <Input defaultValue={editingCamera?.name || ""} placeholder="例: 清洗线入口" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">品牌</label>
                  <Select defaultValue={editingCamera?.brand || "hikvision"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BRAND_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">型号</label>
                  <Input defaultValue={editingCamera?.model || ""} placeholder="例: DS-2CD2T47G2-L" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">协议</label>
                  <Select defaultValue={editingCamera?.protocol || "rtsp"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROTOCOL_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">IP 地址</label>
                  <Input defaultValue={editingCamera?.ipAddress || ""} placeholder="192.168.10.xxx" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">端口</label>
                  <Input type="number" defaultValue={editingCamera?.port || 554} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">RTSP URL</label>
                  <Input defaultValue={editingCamera?.rtspUrl || ""} placeholder="rtsp://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">用户名</label>
                  <Input defaultValue={editingCamera?.username || ""} placeholder="admin" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">密码</label>
                  <Input type="password" defaultValue="" placeholder="******" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">位置</label>
                  <Select defaultValue={editingCamera?.location || "SHOPFLOOR"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.filter((l) => l !== "ALL").map((l) => (
                        <SelectItem key={l} value={l}>{LOCATION_LABELS[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">用途</label>
                  <Select defaultValue={editingCamera?.purpose || "process_monitor"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{PURPOSE_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">分辨率</label>
                  <Input defaultValue={editingCamera?.resolution || ""} placeholder="1920x1080" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">帧率 (FPS)</label>
                  <Input type="number" defaultValue={editingCamera?.fps || 25} />
                </div>
                <div className="flex items-center gap-6 col-span-2 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked={editingCamera?.hasPtz || false} className="rounded" />
                    支持 PTZ 云台
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked={editingCamera?.hasAiAnalysis || false} className="rounded" />
                    启用 AI 视觉分析
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
                <Button onClick={() => {
                  setAddDialogOpen(false);
                  toast({ title: editingCamera ? "已更新" : "已添加", description: "摄像头信息已保存" });
                }}>
                  {editingCamera ? "保存" : "添加"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ───────────── Tab 3: Live View ───────────── */}
        <TabsContent value="live" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              {(["1x1", "2x2", "3x3"] as const).map((layout) => (
                <Button
                  key={layout}
                  variant={liveLayout === layout ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLayoutChange(layout)}
                >
                  {layout}
                </Button>
              ))}
            </div>
          </div>

          <div className={`grid gap-2 ${liveLayout === "1x1" ? "grid-cols-1" : liveLayout === "2x2" ? "grid-cols-2" : "grid-cols-3"}`}>
            {Array.from({ length: layoutCells }).map((_, idx) => {
              const camId = liveCameras[idx];
              const cam = camId ? demoCameras.find((c) => c.id === camId) : null;
              const isSelected = selectedLiveCell === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-lg overflow-hidden ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedLiveCell(idx)}
                >
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
                    <Select
                      value={camId ? String(camId) : "none"}
                      onValueChange={(val) => handleLiveCameraSelect(idx, val)}
                    >
                      <SelectTrigger className="h-7 w-48 text-xs border-0 bg-transparent">
                        <SelectValue placeholder="选择摄像头" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- 无 --</SelectItem>
                        {demoCameras.filter((c) => c.status === "online").map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      {cam && (
                        <>
                          {statusDot(cam.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="抓拍 Snapshot"
                            onClick={(e) => { e.stopPropagation(); toast({ title: "已抓拍", description: `${cam.name} 快照已保存` }); }}
                          >
                            <Image className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="全屏 Fullscreen"
                            onClick={(e) => { e.stopPropagation(); toast({ title: "全屏模式", description: cam.name }); }}
                          >
                            <Maximize className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Feed area */}
                  <div className={`flex flex-col items-center justify-center bg-gray-900 text-gray-500 ${liveLayout === "1x1" ? "h-[480px]" : liveLayout === "2x2" ? "h-[280px]" : "h-[200px]"}`}>
                    {cam ? (
                      <>
                        <Video className="h-10 w-10 mb-2 opacity-40" />
                        <span className="text-sm">{cam.name}</span>
                        <span className="text-xs opacity-60">{cam.resolution} · {cam.fps}fps</span>
                        <span className="text-xs opacity-40 mt-1">{cam.ipAddress}</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-10 w-10 mb-2 opacity-20" />
                        <span className="text-xs opacity-40">未选择摄像头</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PTZ controls */}
          {selectedLiveCell !== null && (() => {
            const camId = liveCameras[selectedLiveCell];
            const cam = camId ? demoCameras.find((c) => c.id === camId) : null;
            if (!cam?.hasPtz) return null;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" /> PTZ 云台控制 — {cam.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    {/* Direction pad */}
                    <div className="grid grid-cols-3 gap-1 w-32">
                      <div />
                      <Button variant="outline" size="icon" className="h-9 w-9" title="上" onClick={() => toast({ title: "PTZ", description: "向上转动" })}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <div />
                      <Button variant="outline" size="icon" className="h-9 w-9" title="左" onClick={() => toast({ title: "PTZ", description: "向左转动" })}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="h-9 w-9 rounded-md border flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">PTZ</span>
                      </div>
                      <Button variant="outline" size="icon" className="h-9 w-9" title="右" onClick={() => toast({ title: "PTZ", description: "向右转动" })}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div />
                      <Button variant="outline" size="icon" className="h-9 w-9" title="下" onClick={() => toast({ title: "PTZ", description: "向下转动" })}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div />
                    </div>
                    {/* Zoom controls */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-medium">变焦 Zoom</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "PTZ", description: "放大" })}>
                          <ZoomIn className="h-4 w-4 mr-1" /> 放大
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "PTZ", description: "缩小" })}>
                          <ZoomOut className="h-4 w-4 mr-1" /> 缩小
                        </Button>
                      </div>
                    </div>
                    {/* Presets */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-medium">预置位 Presets</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <Button key={n} variant="outline" size="sm" className="w-9"
                            onClick={() => toast({ title: "PTZ", description: `切换到预置位 ${n}` })}
                          >
                            {n}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* ───────────── Tab 4: Groups & Layouts ───────────── */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">摄像头分组 Camera Groups</h2>
            <Button size="sm" onClick={() => setGroupDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> 创建分组
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="编辑">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="删除"
                        onClick={() => toast({ title: "已删除", description: `分组 "${group.name}" 已移除`, variant: "destructive" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{group.layoutType} 布局</Badge>
                    <Badge variant="outline">{group.cameraIds.length} 路摄像头</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> 输出屏幕: {group.displayScreen}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {group.cameraIds.map((cid) => {
                        const c = demoCameras.find((x) => x.id === cid);
                        return c ? (
                          <Badge key={cid} variant="outline" className="text-[10px] gap-1">
                            {statusDot(c.status)} {c.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create Group Dialog */}
          <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>创建摄像头分组</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">分组名称</label>
                  <Input placeholder="例: 生产线监控组" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">布局方式</label>
                  <Select defaultValue="2x2">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1x1">1x1 (单画面)</SelectItem>
                      <SelectItem value="1x2">1x2 (双画面)</SelectItem>
                      <SelectItem value="2x1">2x1 (双画面竖)</SelectItem>
                      <SelectItem value="2x2">2x2 (四画面)</SelectItem>
                      <SelectItem value="3x3">3x3 (九画面)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择摄像头</label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {demoCameras.map((cam) => (
                      <label key={cam.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded" />
                        <span className="flex items-center gap-1">
                          {statusDot(cam.status)} {cam.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">{cam.cameraCode}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">关联显示屏</label>
                  <Input placeholder="例: 车间LED大屏B" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>取消</Button>
                <Button onClick={() => {
                  setGroupDialogOpen(false);
                  toast({ title: "已创建", description: "新分组已保存" });
                }}>
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ───────────── Tab 5: Events & Alerts ───────────── */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <Select value={eventSeverityFilter} onValueChange={setEventSeverityFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="严重程度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部级别</SelectItem>
                  <SelectItem value="critical">严重 Critical</SelectItem>
                  <SelectItem value="warning">警告 Warning</SelectItem>
                  <SelectItem value="info">信息 Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventCameraFilter} onValueChange={setEventCameraFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="摄像头" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部摄像头</SelectItem>
                  {demoCameras.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              {events.filter((e) => !e.acknowledged).length} 条未确认
            </div>
          </div>

          <div className="space-y-3">
            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>暂无匹配事件</p>
              </div>
            )}
            {filteredEvents.map((evt) => (
              <Card key={evt.id} className={`border-l-4 ${evt.severity === "critical" ? "border-l-red-500" : evt.severity === "warning" ? "border-l-yellow-500" : "border-l-blue-500"}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={SEVERITY_STYLES[evt.severity]}>
                          {evt.severity === "critical" ? "严重" : evt.severity === "warning" ? "警告" : "信息"}
                        </Badge>
                        <span className="font-medium text-sm">{evt.cameraName}</span>
                        <span className="text-xs text-muted-foreground">{evt.eventType}</span>
                      </div>
                      <p className="text-sm">{evt.description}</p>
                      <p className="text-xs text-muted-foreground">{evt.timestamp}</p>
                    </div>
                    <div className="shrink-0">
                      {evt.acknowledged ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" /> 已确认
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(evt.id)}
                        >
                          确认处理
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ───────────── Tab 6: Maintenance ───────────── */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">维保记录 Maintenance Log</h2>
            <Button size="sm" onClick={() => setMaintDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> 记录维保
            </Button>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>摄像头</TableHead>
                  <TableHead>维保类型</TableHead>
                  <TableHead>执行人</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoMaintenance.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="text-sm font-mono whitespace-nowrap">{rec.date}</TableCell>
                    <TableCell className="font-medium">{rec.cameraName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ACTION_LABELS[rec.actionType] || rec.actionType}</Badge>
                    </TableCell>
                    <TableCell>{rec.performedBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{rec.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Log Maintenance Dialog */}
          <Dialog open={maintDialogOpen} onOpenChange={setMaintDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>记录维保操作</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">摄像头</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="选择设备" /></SelectTrigger>
                    <SelectContent>
                      {demoCameras.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.cameraCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">维保类型</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">备注</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="描述维保内容..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMaintDialogOpen(false)}>取消</Button>
                <Button onClick={() => {
                  setMaintDialogOpen(false);
                  toast({ title: "已记录", description: "维保操作已保存" });
                }}>
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
