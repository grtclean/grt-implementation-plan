/**
 * A/B测试自动化报告管理组件
 * v2.5.19 - 定期生成测试进度报告、统计显著性分析、邮件发送
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Download, 
  FileText, 
  Mail, 
  Plus, 
  RefreshCw,
  Send,
  TrendingUp,
  AlertTriangle,
  Eye,
  Settings
} from 'lucide-react';

type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'sent';
type ReportFrequency = 'daily' | 'weekly' | 'on_completion' | 'manual';
type SignificanceLevel = 'not_significant' | 'marginally_significant' | 'significant' | 'highly_significant';

interface ABTestReport {
  id: string;
  testId: string;
  testName: string;
  status: ReportStatus;
  frequency: ReportFrequency;
  generatedAt: Date | null;
  sentAt: Date | null;
  recipients: string[];
  summary: {
    totalSamples: number;
    progress: number;
    isSignificant: boolean;
    significanceLevel: SignificanceLevel;
    recommendation: string;
    winnerVariant: string | null;
  } | null;
}

interface ReportSchedule {
  id: string;
  testId: string;
  testName: string;
  frequency: ReportFrequency;
  enabled: boolean;
  recipients: string[];
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

// 模拟数据
const mockReports: ABTestReport[] = [
  {
    id: 'rpt-1',
    testId: 'test-001',
    testName: '消息聚合策略A/B测试',
    status: 'sent',
    frequency: 'daily',
    generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    sentAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    recipients: ['admin@example.com', 'pm@example.com'],
    summary: {
      totalSamples: 10000,
      progress: 70,
      isSignificant: true,
      significanceLevel: 'significant',
      recommendation: '建议采用实验组A策略',
      winnerVariant: '实验组A'
    }
  },
  {
    id: 'rpt-2',
    testId: 'test-002',
    testName: '通知频率优化测试',
    status: 'completed',
    frequency: 'weekly',
    generatedAt: new Date(Date.now() - 30 * 60 * 1000),
    sentAt: null,
    recipients: ['admin@example.com'],
    summary: {
      totalSamples: 5000,
      progress: 45,
      isSignificant: false,
      significanceLevel: 'not_significant',
      recommendation: '继续收集数据',
      winnerVariant: null
    }
  },
  {
    id: 'rpt-3',
    testId: 'test-001',
    testName: '消息聚合策略A/B测试',
    status: 'generating',
    frequency: 'manual',
    generatedAt: null,
    sentAt: null,
    recipients: ['admin@example.com'],
    summary: null
  }
];

const mockSchedules: ReportSchedule[] = [
  {
    id: 'sched-1',
    testId: 'test-001',
    testName: '消息聚合策略A/B测试',
    frequency: 'daily',
    enabled: true,
    recipients: ['admin@example.com', 'pm@example.com'],
    lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    nextRunAt: new Date(Date.now() + 22 * 60 * 60 * 1000)
  },
  {
    id: 'sched-2',
    testId: 'test-002',
    testName: '通知频率优化测试',
    frequency: 'weekly',
    enabled: true,
    recipients: ['admin@example.com'],
    lastRunAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    nextRunAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  }
];

const statusConfig: Record<ReportStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof FileText }> = {
  pending: { label: '待生成', variant: 'secondary', icon: Clock },
  generating: { label: '生成中', variant: 'secondary', icon: RefreshCw },
  completed: { label: '已完成', variant: 'default', icon: CheckCircle },
  failed: { label: '失败', variant: 'destructive', icon: AlertTriangle },
  sent: { label: '已发送', variant: 'outline', icon: Send }
};

const frequencyConfig: Record<ReportFrequency, string> = {
  daily: '每日',
  weekly: '每周',
  on_completion: '测试完成时',
  manual: '手动'
};

const significanceConfig: Record<SignificanceLevel, { label: string; color: string; bgColor: string }> = {
  not_significant: { label: '不显著', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  marginally_significant: { label: '边缘显著', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  significant: { label: '显著', color: 'text-green-600', bgColor: 'bg-green-100' },
  highly_significant: { label: '高度显著', color: 'text-blue-600', bgColor: 'bg-blue-100' }
};

export default function ABTestingReportManager() {
  const [reports, setReports] = useState<ABTestReport[]>(mockReports);
  const [schedules, setSchedules] = useState<ReportSchedule[]>(mockSchedules);
  const [selectedReport, setSelectedReport] = useState<ABTestReport | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // 统计数据
  const stats = {
    totalReports: reports.length,
    completedReports: reports.filter(r => r.status === 'completed' || r.status === 'sent').length,
    sentReports: reports.filter(r => r.status === 'sent').length,
    activeSchedules: schedules.filter(s => s.enabled).length,
    significantTests: reports.filter(r => r.summary?.isSignificant).length
  };

  // 发送报告
  const handleSendReport = (reportId: string) => {
    setReports(prev => prev.map(r => 
      r.id === reportId 
        ? { ...r, status: 'sent' as ReportStatus, sentAt: new Date() }
        : r
    ));
  };

  // 生成报告
  const handleGenerateReport = (testId: string, testName: string) => {
    const newReport: ABTestReport = {
      id: `rpt-${Date.now()}`,
      testId,
      testName,
      status: 'generating',
      frequency: 'manual',
      generatedAt: null,
      sentAt: null,
      recipients: ['admin@example.com'],
      summary: null
    };
    setReports(prev => [newReport, ...prev]);

    // 模拟生成完成
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === newReport.id 
          ? {
              ...r,
              status: 'completed' as ReportStatus,
              generatedAt: new Date(),
              summary: {
                totalSamples: 8000,
                progress: 60,
                isSignificant: Math.random() > 0.5,
                significanceLevel: 'marginally_significant' as SignificanceLevel,
                recommendation: '继续观察数据变化',
                winnerVariant: null
              }
            }
          : r
      ));
    }, 2000);
  };

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 格式化相对时间
  const formatRelativeTime = (date: Date | null) => {
    if (!date) return '-';
    const diff = new Date(date).getTime() - Date.now();
    if (diff < 0) return '已过期';
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 24) return `${hours}小时后`;
    return `${Math.floor(hours / 24)}天后`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A/B测试自动化报告</h1>
          <p className="text-muted-foreground">定期生成测试进度报告，包含统计显著性分析</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            配置计划
          </Button>
          <Button onClick={() => handleGenerateReport('test-001', '消息聚合策略A/B测试')}>
            <Plus className="w-4 h-4 mr-2" />
            生成报告
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总报告数</p>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold">{stats.completedReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已发送</p>
                <p className="text-2xl font-bold">{stats.sentReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">活跃计划</p>
                <p className="text-2xl font-bold">{stats.activeSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">显著测试</p>
                <p className="text-2xl font-bold">{stats.significantTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">报告列表</TabsTrigger>
          <TabsTrigger value="schedules">报告计划</TabsTrigger>
          <TabsTrigger value="analysis">统计分析</TabsTrigger>
        </TabsList>

        {/* 报告列表 */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>测试报告</CardTitle>
              <CardDescription>查看和管理A/B测试报告</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>测试名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>频率</TableHead>
                    <TableHead>显著性</TableHead>
                    <TableHead>进度</TableHead>
                    <TableHead>生成时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(report => {
                    const StatusIcon = statusConfig[report.status].icon;
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.testName}</p>
                            <p className="text-sm text-muted-foreground">{report.testId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[report.status].variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className={`w-3 h-3 ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                            {statusConfig[report.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{frequencyConfig[report.frequency]}</Badge>
                        </TableCell>
                        <TableCell>
                          {report.summary ? (
                            <Badge className={`${significanceConfig[report.summary.significanceLevel].bgColor} ${significanceConfig[report.summary.significanceLevel].color}`}>
                              {significanceConfig[report.summary.significanceLevel].label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.summary ? (
                            <div className="flex items-center gap-2">
                              <Progress value={report.summary.progress} className="w-16" />
                              <span className="text-sm text-muted-foreground">{report.summary.progress}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(report.generatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setShowReportDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {report.status === 'completed' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleSendReport(report.id)}
                                >
                                  <Mail className="w-4 h-4 mr-1" />
                                  发送
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 报告计划 */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>报告计划</CardTitle>
              <CardDescription>配置自动生成报告的计划</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${schedule.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Calendar className={`w-5 h-5 ${schedule.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{schedule.testName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{frequencyConfig[schedule.frequency]}</Badge>
                          <span className="text-sm text-muted-foreground">
                            下次运行: {formatRelativeTime(schedule.nextRunAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-muted-foreground">
                        <p>收件人: {schedule.recipients.length}人</p>
                        <p>上次运行: {formatTime(schedule.lastRunAt)}</p>
                      </div>
                      <Switch 
                        checked={schedule.enabled}
                        onCheckedChange={(checked) => {
                          setSchedules(prev => prev.map(s => 
                            s.id === schedule.id ? { ...s, enabled: checked } : s
                          ));
                        }}
                      />
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 统计分析 */}
        <TabsContent value="analysis">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>统计显著性说明</CardTitle>
                <CardDescription>理解A/B测试的统计分析结果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(significanceConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-3">
                      <Badge className={`${config.bgColor} ${config.color}`}>
                        {config.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {key === 'not_significant' && 'p > 0.05，结果可能是随机波动'}
                        {key === 'marginally_significant' && '0.01 < p < 0.05，有一定证据支持'}
                        {key === 'significant' && '0.001 < p < 0.01，有较强证据支持'}
                        {key === 'highly_significant' && 'p < 0.001，有非常强的证据支持'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>报告建议类型</CardTitle>
                <CardDescription>根据测试进度和结果给出的建议</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">采用获胜方案</p>
                      <p className="text-sm text-muted-foreground">统计显著且有明确获胜者</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">继续收集数据</p>
                      <p className="text-sm text-muted-foreground">样本量不足或结果不稳定</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium">停止测试</p>
                      <p className="text-sm text-muted-foreground">无显著差异，考虑其他优化方向</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 报告详情对话框 */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>报告详情</DialogTitle>
            <DialogDescription>查看A/B测试报告的详细分析结果</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">测试名称</Label>
                  <p className="font-medium">{selectedReport.testName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={statusConfig[selectedReport.status].variant}>
                    {statusConfig[selectedReport.status].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">生成时间</Label>
                  <p>{formatTime(selectedReport.generatedAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">发送时间</Label>
                  <p>{formatTime(selectedReport.sentAt)}</p>
                </div>
              </div>

              {selectedReport.summary && (
                <>
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">测试进度</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={selectedReport.summary.progress} className="flex-1" />
                      <span className="font-medium">{selectedReport.summary.progress}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      总样本数: {selectedReport.summary.totalSamples.toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">统计显著性</Label>
                      <Badge className={`mt-1 ${significanceConfig[selectedReport.summary.significanceLevel].bgColor} ${significanceConfig[selectedReport.summary.significanceLevel].color}`}>
                        {significanceConfig[selectedReport.summary.significanceLevel].label}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">获胜方案</Label>
                      <p className="font-medium">{selectedReport.summary.winnerVariant || '暂无'}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">建议</Label>
                    <p className="p-3 bg-muted rounded-lg mt-1">{selectedReport.summary.recommendation}</p>
                  </div>
                </>
              )}

              <div>
                <Label className="text-muted-foreground">收件人</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedReport.recipients.map(r => (
                    <Badge key={r} variant="outline">{r}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              关闭
            </Button>
            {selectedReport?.status === 'completed' && (
              <>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  下载PDF
                </Button>
                <Button onClick={() => {
                  handleSendReport(selectedReport.id);
                  setShowReportDialog(false);
                }}>
                  <Mail className="w-4 h-4 mr-1" />
                  发送报告
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 配置计划对话框 */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配置报告计划</DialogTitle>
            <DialogDescription>设置自动生成报告的频率和收件人</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>选择测试</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择A/B测试" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test-001">消息聚合策略A/B测试</SelectItem>
                  <SelectItem value="test-002">通知频率优化测试</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>报告频率</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择频率" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">每日</SelectItem>
                  <SelectItem value="weekly">每周</SelectItem>
                  <SelectItem value="on_completion">测试完成时</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>收件人邮箱</Label>
              <Input placeholder="输入邮箱地址，多个用逗号分隔" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="schedule-enabled" defaultChecked />
              <Label htmlFor="schedule-enabled">启用计划</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setShowScheduleDialog(false)}>
              保存计划
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
