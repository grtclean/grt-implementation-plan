import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  AlertCircle, 
  Battery, 
  CheckCircle, 
  Clock, 
  Loader2, 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Send, 
  Signal, 
  Wifi 
} from "lucide-react";
import { useEffect, useState } from "react";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export default function MobileLocationReport() {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [lastReportTime, setLastReportTime] = useState<Date | null>(null);
  const [autoReport, setAutoReport] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [networkType, setNetworkType] = useState<string>("unknown");

  // 获取当前位置
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("您的浏览器不支持地理位置功能");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // 尝试获取地址（使用反向地理编码）
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          locationData.address = data.display_name;
        } catch (e) {
          // 地址获取失败，继续使用坐标
        }

        setLocation(locationData);
        setLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("位置权限被拒绝，请在设置中允许访问位置");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("无法获取位置信息");
            break;
          case err.TIMEOUT:
            setError("获取位置超时，请重试");
            break;
          default:
            setError("获取位置时发生错误");
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // 获取电池状态
  useEffect(() => {
    let batteryRef: any = null;
    const handler = () => {
      if (batteryRef) setBatteryLevel(Math.round(batteryRef.level * 100));
    };
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryRef = battery;
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', handler);
      });
    }
    return () => {
      if (batteryRef) batteryRef.removeEventListener('levelchange', handler);
    };
  }, []);

  // 获取网络状态
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!connection) return;
    const handler = () => setNetworkType(connection.effectiveType || "unknown");
    setNetworkType(connection.effectiveType || "unknown");
    connection.addEventListener('change', handler);
    return () => connection.removeEventListener('change', handler);
  }, []);

  // 自动定位
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // 自动上报
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoReport) {
      interval = setInterval(() => {
        getCurrentLocation();
        // 自动提交
        if (location) {
          handleSubmit();
        }
      }, 5 * 60 * 1000); // 每5分钟
    }
    return () => clearInterval(interval);
  }, [autoReport, location]);

  // 提交位置
  const handleSubmit = async () => {
    if (!location) {
      setError("请先获取位置");
      return;
    }

    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastReportTime(new Date());
      setNote("");
      setError(null);
    } catch (e) {
      setError("上报失败，请重试");
    }
    setLoading(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">位置上报</h1>
            <p className="text-xs text-muted-foreground">{user?.name || "员工"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {batteryLevel !== null && (
            <div className="flex items-center gap-1">
              <Battery className="w-4 h-4" />
              <span>{batteryLevel}%</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {networkType === "4g" || networkType === "5g" ? (
              <Signal className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>{networkType.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* 位置卡片 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>当前位置</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={getCurrentLocation}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : location ? (
            <div className="space-y-3">
              {/* 地图预览区域 */}
              <div className="h-40 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-green-500/20"></div>
                <div className="relative z-10 text-center">
                  <Navigation className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
                {/* 精度指示器 */}
                <div className="absolute bottom-2 right-2 text-xs bg-background/80 px-2 py-1 rounded">
                  精度: ±{Math.round(location.accuracy)}m
                </div>
              </div>

              {/* 地址信息 */}
              {location.address && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{location.address}</p>
                </div>
              )}

              {/* 时间信息 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>定位时间: {formatDate(location.timestamp)}</span>
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">正在获取位置...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 备注输入 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">备注信息</CardTitle>
          <CardDescription>可选，添加当前工作状态说明</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="例如：正在客户现场进行设备调试..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 自动上报开关 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自动上报</p>
              <p className="text-xs text-muted-foreground">每5分钟自动上报一次位置</p>
            </div>
            <Button
              variant={autoReport ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoReport(!autoReport)}
            >
              {autoReport ? "已开启" : "开启"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 上次上报时间 */}
      {lastReportTime && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-500 mb-4">
          <CheckCircle className="w-4 h-4" />
          <span>上次上报: {formatTime(lastReportTime)}</span>
        </div>
      )}

      {/* 提交按钮 */}
      <Button 
        className="w-full h-12 text-lg gap-2" 
        onClick={handleSubmit}
        disabled={loading || !location}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        上报位置
      </Button>

      {/* 底部提示 */}
      <p className="text-xs text-center text-muted-foreground mt-4">
        位置信息仅用于出差管理，请确保已开启位置权限
      </p>
    </div>
  );
}
