import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Shield,
  Users,
  Settings,
  Activity,
  Database,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
} from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { currentUserRole, permissions } = useUserProfile();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  // 如果不是管理员，显示无权限页面
  if (currentUserRole !== "admin") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <Lock className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">访问受限</h1>
          <p className="text-muted-foreground text-center max-w-md">
            此页面仅限管理员访问。请切换到管理员角色或联系系统管理员获取权限。
          </p>
          <Button onClick={() => setLocation("/")} variant="outline">
            返回首页
          </Button>
        </div>
      </Layout>
    );
  }

  // 系统状态数据（模拟）
  const systemStats = {
    cpu: 45,
    memory: 62,
    disk: 38,
    uptime: "15天 8小时",
  };

  // 用户统计（模拟）
  const userStats = {
    total: 156,
    active: 89,
    newToday: 5,
    online: 23,
  };

  // 安全事件（模拟）
  const securityEvents = [
    { type: "success", message: "系统备份完成", time: "10分钟前" },
    { type: "warning", message: "检测到异常登录尝试", time: "1小时前" },
    { type: "success", message: "安全扫描完成，无威胁", time: "3小时前" },
    { type: "info", message: "权限变更审计完成", time: "5小时前" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              管理员控制台
            </h1>
            <p className="text-muted-foreground">
              系统管理、用户权限和安全监控
            </p>
          </div>
          <Badge variant="destructive" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            管理员权限
          </Badge>
        </div>

        {/* 系统状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CPU 使用率</p>
                  <p className="text-2xl font-bold">{systemStats.cpu}%</p>
                </div>
                <Cpu className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${systemStats.cpu}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">内存使用</p>
                  <p className="text-2xl font-bold">{systemStats.memory}%</p>
                </div>
                <MemoryStick className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${systemStats.memory}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">磁盘使用</p>
                  <p className="text-2xl font-bold">{systemStats.disk}%</p>
                </div>
                <HardDrive className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${systemStats.disk}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">系统运行时间</p>
                  <p className="text-2xl font-bold">{systemStats.uptime}</p>
                </div>
                <Server className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                系统运行正常
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 用户管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                用户管理
              </CardTitle>
              <CardDescription>系统用户统计和管理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">总用户数</p>
                  <p className="text-xl font-bold">{userStats.total}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">活跃用户</p>
                  <p className="text-xl font-bold text-green-500">{userStats.active}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">今日新增</p>
                  <p className="text-xl font-bold text-blue-500">+{userStats.newToday}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">当前在线</p>
                  <p className="text-xl font-bold text-primary">{userStats.online}</p>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                管理用户
              </Button>
            </CardContent>
          </Card>

          {/* 安全监控 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                安全监控
              </CardTitle>
              <CardDescription>最近的安全事件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    {event.type === "success" && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    )}
                    {event.type === "warning" && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    )}
                    {event.type === "info" && (
                      <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{event.message}</p>
                      <p className="text-xs text-muted-foreground">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 快捷操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                快捷操作
              </CardTitle>
              <CardDescription>常用管理功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Database className="w-4 h-4 mr-2" />
                数据库管理
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Lock className="w-4 h-4 mr-2" />
                权限配置
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                审计日志
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                系统报表
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 权限说明 */}
        <Card>
          <CardHeader>
            <CardTitle>当前权限状态</CardTitle>
            <CardDescription>您作为管理员拥有以下权限</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(permissions).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    value ? "bg-green-500/10 border-green-500/20" : "bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {value ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {key.replace("canAccess", "").replace("can", "")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
