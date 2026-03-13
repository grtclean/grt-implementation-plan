import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Clock,
  LogIn,
  LogOut,
  CalendarDays,
  BarChart3,
  Navigation,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

const OFFICE_LAT = 31.2304;
const OFFICE_LNG = 121.4737;
const GEOFENCE_RADIUS_M = 100;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  try {
    return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

const statusColors: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  late: "bg-yellow-100 text-yellow-800",
  absent: "bg-red-100 text-red-800",
  leave: "bg-blue-100 text-blue-800",
  early: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  normal: "正常",
  late: "迟到",
  absent: "缺勤",
  leave: "请假",
  early: "早退",
};

export default function AttendanceClock() {
  const { t } = useLanguage();
  const { profile } = useUserProfile();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const isOffsite = distance !== null && distance > GEOFENCE_RADIUS_M;

  // --- GPS ---
  const refreshGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGps({ lat: latitude, lng: longitude });
        setDistance(haversineDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG));
        setGpsError(null);
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    refreshGps();
  }, [refreshGps]);

  // --- tRPC ---
  const todayQuery = trpc.attendanceClock.clock.getToday.useQuery(undefined, {
    retry: false,
  });
  const monthlyQuery = trpc.attendanceClock.clock.getMonthly.useQuery(
    { period },
    { retry: false },
  );
  const clockInMut = trpc.attendanceClock.clock.clockIn.useMutation({
    onSuccess: () => todayQuery.refetch(),
  });
  const clockOutMut = trpc.attendanceClock.clock.clockOut.useMutation({
    onSuccess: () => {
      todayQuery.refetch();
      monthlyQuery.refetch();
    },
  });

  const handleClockIn = () => {
    clockInMut.mutate({
      lat: gps?.lat ?? 0,
      lng: gps?.lng ?? 0,
      distance: distance ?? 0,
      offsite: isOffsite,
      customerName: isOffsite ? customerName : undefined,
    });
  };

  const handleClockOut = () => {
    clockOutMut.mutate({
      lat: gps?.lat ?? 0,
      lng: gps?.lng ?? 0,
      distance: distance ?? 0,
      offsite: isOffsite,
      customerName: isOffsite ? customerName : undefined,
    });
  };

  const today = todayQuery.data as
    | { clockIn?: string; clockOut?: string; hours?: number; lateMinutes?: number; status?: string }
    | undefined;
  const monthly = (monthlyQuery.data ?? { records: [], stats: { workDays: 0, lateDays: 0, otHours: 0, perfect: false } }) as {
    records: { date: string; clockIn?: string; clockOut?: string; hours?: number; status: string }[];
    stats: { workDays: number; lateDays: number; otHours: number; perfect: boolean };
  };

  const shiftPeriod = (delta: number) => {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MapPin className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">GPS考勤打卡</h1>
          <p className="text-xs text-muted-foreground">Attendance Clock</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          {profile?.name ?? "Employee"}
        </Badge>
      </div>

      {/* Clock-In/Out Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            打卡 <span className="text-xs text-muted-foreground font-normal">Clock In/Out</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* GPS Status */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {gps ? (
              <span className="font-mono text-xs">
                {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </span>
            ) : gpsError ? (
              <span className="text-red-500 text-xs">{gpsError}</span>
            ) : (
              <span className="text-muted-foreground text-xs">定位中...</span>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={refreshGps}>
              刷新
            </Button>
          </div>

          {distance !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                距办公室 {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
              </span>
              <Badge variant="secondary" className={isOffsite ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                {isOffsite ? "外勤模式 Offsite" : "在公司范围内 On-site"}
              </Badge>
            </div>
          )}

          {/* Offsite fields */}
          {isOffsite && (
            <div className="space-y-2 border rounded-md p-2 bg-orange-50">
              <Input
                placeholder="客户名称 / Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8 text-sm"
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>{photoFile ? photoFile.name : "上传现场照片 (可选)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              className="h-16 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleClockIn}
              disabled={clockInMut.isPending || !gps || !!today?.clockIn}
            >
              <LogIn className="h-5 w-5 mr-2" />
              {clockInMut.isPending ? "..." : "上班打卡"}
            </Button>
            <Button
              className="h-16 text-lg bg-orange-500 hover:bg-orange-600"
              onClick={handleClockOut}
              disabled={clockOutMut.isPending || !gps || !today?.clockIn}
            >
              <LogOut className="h-5 w-5 mr-2" />
              {clockOutMut.isPending ? "..." : "下班打卡"}
            </Button>
          </div>
          {(clockInMut.isError || clockOutMut.isError) && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {clockInMut.error?.message || clockOutMut.error?.message || "操作失败"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Today's Record */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            今日记录 <span className="text-xs text-muted-foreground font-normal">Today</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">上班 Clock-in</p>
                <p className="font-medium">{formatTime(today?.clockIn)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">下班 Clock-out</p>
                <p className="font-medium">{formatTime(today?.clockOut)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">工时 Hours</p>
                <p className="font-medium">{today?.hours != null ? `${today.hours.toFixed(1)}h` : "--"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">状态 Status</p>
                {today?.status ? (
                  <Badge className={statusColors[today.status] ?? "bg-gray-100"}>
                    {statusLabels[today.status] ?? today.status}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">未打卡</span>
                )}
              </div>
              {(today?.lateMinutes ?? 0) > 0 && (
                <div className="col-span-2">
                  <Badge variant="destructive" className="text-xs">
                    迟到 {today!.lateMinutes} 分钟
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              月度记录 <span className="text-xs text-muted-foreground font-normal">Monthly</span>
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftPeriod(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-mono w-20 text-center">{period}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftPeriod(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-1 text-left">日期</th>
                    <th className="py-1 text-center">上班</th>
                    <th className="py-1 text-center">下班</th>
                    <th className="py-1 text-center">工时</th>
                    <th className="py-1 text-right">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthly.records ?? []).map((r) => (
                    <tr key={r.date} className="border-b last:border-0">
                      <td className="py-1">{r.date.slice(5)}</td>
                      <td className="py-1 text-center font-mono">{formatTime(r.clockIn)}</td>
                      <td className="py-1 text-center font-mono">{formatTime(r.clockOut)}</td>
                      <td className="py-1 text-center">{r.hours != null ? `${r.hours.toFixed(1)}` : "--"}</td>
                      <td className="py-1 text-right">
                        <Badge className={`text-[10px] ${statusColors[r.status] ?? "bg-gray-100"}`}>
                          {statusLabels[r.status] ?? r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!monthly.records || monthly.records.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">
                        暂无记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            本月统计 <span className="text-xs text-muted-foreground font-normal">Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border rounded-md p-2 text-center">
              <p className="text-muted-foreground text-xs">出勤天数 Work Days</p>
              <p className="text-xl font-bold">{monthly.stats.workDays}</p>
            </div>
            <div className="border rounded-md p-2 text-center">
              <p className="text-muted-foreground text-xs">迟到次数 Late</p>
              <p className="text-xl font-bold text-yellow-600">{monthly.stats.lateDays}</p>
            </div>
            <div className="border rounded-md p-2 text-center">
              <p className="text-muted-foreground text-xs">加班时长 OT Hours</p>
              <p className="text-xl font-bold text-blue-600">{monthly.stats.otHours.toFixed(1)}h</p>
            </div>
            <div className="border rounded-md p-2 text-center">
              <p className="text-muted-foreground text-xs">全勤 Perfect</p>
              {monthly.stats.perfect ? (
                <CheckCircle2 className="h-7 w-7 text-green-500 mx-auto mt-1" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">--</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
