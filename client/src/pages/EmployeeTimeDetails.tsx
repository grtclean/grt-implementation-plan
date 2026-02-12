/**
 * 员工工时详情页面
 * 显示员工基本信息、工时记录、历史违规和合规趋势图表
 */

import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  TrendingDown, 
  TrendingUp, 
  User,
  XCircle
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function EmployeeTimeDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(params.id || "0", 10);

  const { data, isLoading, error } = trpc.compliance.getEmployeeTimeDetails.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <XCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-semibold">员工数据加载失败</h2>
          <p className="text-muted-foreground">
            {error?.message || "未找到该员工信息"}
          </p>
          <Button onClick={() => setLocation("/compliance-dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回合规仪表板
          </Button>
        </div>
      </Layout>
    );
  }

  const { employee, timeEntries, alerts, stats, weeklyTrend } = data as any;

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  // 获取合规状态徽章
  const getComplianceBadge = (flag: string) => {
    switch (flag) {
      case "COMPLIANT":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">合规</Badge>;
      case "VIOLATION_10H_LIMIT":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">超10小时</Badge>;
      case "VIOLATION_REST_PERIOD":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">休息不足</Badge>;
      case "EXEMPTION_AT_RISK":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">豁免风险</Badge>;
      case "OVERTIME_WARNING":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">加班预警</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">待审核</Badge>;
    }
  };

  // 获取预警严重程度徽章
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">严重</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">警告</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">提示</Badge>;
    }
  };

  // 获取预警状态徽章
  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">待处理</Badge>;
      case "acknowledged":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">已确认</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">已解决</Badge>;
      case "escalated":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">已升级</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题和返回按钮 */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation("/compliance-dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">员工工时详情</h1>
            <p className="text-muted-foreground">查看员工的完整工时记录和合规状态</p>
          </div>
        </div>

        {/* 员工基本信息卡片 */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{employee.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span>{employee.department}</span>
                    <span>•</span>
                    <span>{employee.position}</span>
                    <span>•</span>
                    <Badge variant="outline">{employee.jurisdiction}</Badge>
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">员工编号</div>
                <div className="font-mono text-lg">{employee.employeeNumber}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  本周工时
                </div>
                <div className="text-2xl font-bold">{stats.totalHoursThisWeek.toFixed(1)}h</div>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  待处理预警
                </div>
                <div className="text-2xl font-bold text-red-400">{stats.openAlerts}</div>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  已解决预警
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.resolvedAlerts}</div>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  {stats.complianceRate >= 80 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  合规率
                </div>
                <div className={`text-2xl font-bold ${stats.complianceRate >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.complianceRate}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 合规趋势图表 */}
        {weeklyTrend && weeklyTrend.length > 0 && (
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                周工时趋势
              </CardTitle>
              <CardDescription>最近8周的工时变化趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="week" 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `W${Math.ceil(date.getDate() / 7)}`;
                      }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => formatDate(value)}
                    />
                    <Legend />
                    <Bar dataKey="regularHours" name="正常工时" fill="hsl(var(--primary))" stackId="hours" />
                    <Bar dataKey="overtimeHours" name="加班工时" fill="#f97316" stackId="hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 详细数据标签页 */}
        <Tabs defaultValue="timeEntries" className="space-y-4">
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="timeEntries" className="data-[state=active]:bg-primary/20">
              <Clock className="w-4 h-4 mr-2" />
              工时记录
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-primary/20">
              <AlertTriangle className="w-4 h-4 mr-2" />
              预警记录
            </TabsTrigger>
          </TabsList>

          {/* 工时记录标签页 */}
          <TabsContent value="timeEntries">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  工时记录
                </CardTitle>
                <CardDescription>最近100条工时记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>日期</TableHead>
                        <TableHead>正常工时</TableHead>
                        <TableHead>加班工时</TableHead>
                        <TableHead>总工时</TableHead>
                        <TableHead>合规状态</TableHead>
                        <TableHead>审批状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            暂无工时记录
                          </TableCell>
                        </TableRow>
                      ) : (
                        timeEntries.map((entry: any) => (
                          <TableRow key={entry.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono">{formatDate(entry.date)}</TableCell>
                            <TableCell>{entry.regularHours?.toFixed(1) || 0}h</TableCell>
                            <TableCell>{entry.overtimeHours?.toFixed(1) || 0}h</TableCell>
                            <TableCell className="font-semibold">
                              {((entry.regularHours || 0) + (entry.overtimeHours || 0)).toFixed(1)}h
                            </TableCell>
                            <TableCell>{getComplianceBadge(entry.complianceFlag || 'PENDING_REVIEW')}</TableCell>
                            <TableCell>
                              {entry.supervisorApproval === 'approved' ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">已批准</Badge>
                              ) : entry.supervisorApproval === 'rejected' ? (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">已拒绝</Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">待审批</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 预警记录标签页 */}
          <TabsContent value="alerts">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  预警记录
                </CardTitle>
                <CardDescription>最近50条合规预警记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>严重程度</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            暂无预警记录
                          </TableCell>
                        </TableRow>
                      ) : (
                        alerts.map((alert: any) => (
                          <TableRow key={alert.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-sm">
                              {new Date(alert.createdAt).toLocaleString("zh-CN")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{alert.alertType}</Badge>
                            </TableCell>
                            <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                            <TableCell className="max-w-[300px] truncate" title={alert.description}>
                              {alert.description}
                            </TableCell>
                            <TableCell>{getAlertStatusBadge(alert.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
