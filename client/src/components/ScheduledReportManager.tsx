import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  Mail, 
  FileSpreadsheet, 
  FileText, 
  Send,
  Plus,
  Settings,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Edit,
  Users
} from "lucide-react";
import { toast } from "sonner";

// 类型定义
type ReportType = "daily" | "weekly" | "monthly" | "quarterly" | "custom";
type ReportFormat = "excel" | "pdf" | "html" | "csv";
type DeliveryChannel = "email" | "system" | "webhook" | "ftp";

interface ScheduledReportConfig {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  reportFormat: ReportFormat;
  schedule: {
    cronExpression: string;
    timezone: string;
  };
  recipients: { type: string; value: string; name?: string }[];
  deliveryChannels: DeliveryChannel[];
  enabled: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
}

interface DeliveryRecord {
  id: string;
  configId: string;
  reportType: ReportType;
  sentAt: Date;
  recipients: string[];
  status: "sent" | "failed" | "partial";
  fileSize: number;
}

// 模拟数据
const mockConfigs: ScheduledReportConfig[] = [
  {
    id: "sched-001",
    name: "牙膏试验周报",
    description: "每周一自动发送牙膏试验统计报告",
    reportType: "weekly",
    reportFormat: "excel",
    schedule: {
      cronExpression: "0 9 * * 1",
      timezone: "Asia/Shanghai",
    },
    recipients: [
      { type: "role", value: "project_manager", name: "项目经理" },
      { type: "role", value: "quality_manager", name: "质量经理" },
    ],
    deliveryChannels: ["email", "system"],
    enabled: true,
    nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    lastRunAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: "sched-002",
    name: "清洗效果月报",
    description: "每月1号发送清洗效果综合分析报告",
    reportType: "monthly",
    reportFormat: "pdf",
    schedule: {
      cronExpression: "0 9 1 * *",
      timezone: "Asia/Shanghai",
    },
    recipients: [
      { type: "role", value: "director", name: "总监" },
      { type: "department", value: "engineering", name: "工程部" },
    ],
    deliveryChannels: ["email"],
    enabled: true,
    nextRunAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    lastRunAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
];

const mockHistory: DeliveryRecord[] = [
  {
    id: "del-001",
    configId: "sched-001",
    reportType: "weekly",
    sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    recipients: ["pm@company.com", "qm@company.com"],
    status: "sent",
    fileSize: 45678,
  },
  {
    id: "del-002",
    configId: "sched-001",
    reportType: "weekly",
    sentAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    recipients: ["pm@company.com", "qm@company.com"],
    status: "sent",
    fileSize: 42345,
  },
  {
    id: "del-003",
    configId: "sched-002",
    reportType: "monthly",
    sentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    recipients: ["director@company.com"],
    status: "sent",
    fileSize: 123456,
  },
];

export default function ScheduledReportManager() {
  const [configs, setConfigs] = useState<ScheduledReportConfig[]>(mockConfigs);
  const [history] = useState<DeliveryRecord[]>(mockHistory);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: "",
    reportType: "weekly" as ReportType,
    reportFormat: "excel" as ReportFormat,
    cronExpression: "0 9 * * 1",
    recipients: "",
    channels: ["email"] as DeliveryChannel[],
  });

  // 切换启用状态
  const toggleEnabled = (id: string) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
    const config = configs.find(c => c.id === id);
    toast.success(config?.enabled ? "已暂停定时任务" : "已启用定时任务");
  };

  // 立即执行
  const executeNow = (config: ScheduledReportConfig) => {
    toast.success(`正在生成 ${config.name}...`);
    setTimeout(() => {
      toast.success(`${config.name} 已发送给 ${config.recipients.length} 位接收者`);
    }, 2000);
  };

  // 删除配置
  const deleteConfig = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
    toast.success("已删除定时任务");
  };

  // 创建新配置
  const createConfig = () => {
    const config: ScheduledReportConfig = {
      id: `sched-${Date.now()}`,
      name: newConfig.name,
      reportType: newConfig.reportType,
      reportFormat: newConfig.reportFormat,
      schedule: {
        cronExpression: newConfig.cronExpression,
        timezone: "Asia/Shanghai",
      },
      recipients: newConfig.recipients.split(",").map(r => ({
        type: "email",
        value: r.trim(),
      })),
      deliveryChannels: newConfig.channels,
      enabled: true,
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    setConfigs(prev => [...prev, config]);
    setShowCreateDialog(false);
    setNewConfig({
      name: "",
      reportType: "weekly",
      reportFormat: "excel",
      cronExpression: "0 9 * * 1",
      recipients: "",
      channels: ["email"],
    });
    toast.success("定时任务创建成功");
  };

  // 获取报表类型标签
  const getReportTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      daily: "日报",
      weekly: "周报",
      monthly: "月报",
      quarterly: "季报",
      custom: "自定义",
    };
    return labels[type];
  };

  // 获取格式图标
  const getFormatIcon = (format: ReportFormat) => {
    switch (format) {
      case "excel":
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              定时报表管理
            </CardTitle>
            <CardDescription>
              配置自动生成和发送周报、月报等定时报表
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建定时任务
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建定时报表任务</DialogTitle>
                <DialogDescription>
                  配置报表类型、发送频率和接收者
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>任务名称</Label>
                  <Input
                    placeholder="如：牙膏试验周报"
                    value={newConfig.name}
                    onChange={e => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>报表类型</Label>
                    <Select 
                      value={newConfig.reportType}
                      onValueChange={v => setNewConfig(prev => ({ ...prev, reportType: v as ReportType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">日报</SelectItem>
                        <SelectItem value="weekly">周报</SelectItem>
                        <SelectItem value="monthly">月报</SelectItem>
                        <SelectItem value="quarterly">季报</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>报表格式</Label>
                    <Select 
                      value={newConfig.reportFormat}
                      onValueChange={v => setNewConfig(prev => ({ ...prev, reportFormat: v as ReportFormat }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>发送时间 (Cron表达式)</Label>
                  <Select 
                    value={newConfig.cronExpression}
                    onValueChange={v => setNewConfig(prev => ({ ...prev, cronExpression: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 9 * * *">每天 9:00</SelectItem>
                      <SelectItem value="0 9 * * 1">每周一 9:00</SelectItem>
                      <SelectItem value="0 9 * * 5">每周五 9:00</SelectItem>
                      <SelectItem value="0 9 1 * *">每月1号 9:00</SelectItem>
                      <SelectItem value="0 9 15 * *">每月15号 9:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>接收者邮箱 (多个用逗号分隔)</Label>
                  <Input
                    placeholder="pm@company.com, qm@company.com"
                    value={newConfig.recipients}
                    onChange={e => setNewConfig(prev => ({ ...prev, recipients: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={createConfig} disabled={!newConfig.name || !newConfig.recipients}>
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="configs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configs">
              <Settings className="h-4 w-4 mr-2" />
              定时任务 ({configs.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              发送历史 ({history.length})
            </TabsTrigger>
          </TabsList>

          {/* 定时任务列表 */}
          <TabsContent value="configs" className="space-y-4 mt-4">
            {configs.map(config => (
              <div
                key={config.id}
                className={`p-4 rounded-lg border ${
                  config.enabled ? "border-border" : "border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getFormatIcon(config.reportFormat)}
                      <span className="font-medium">{config.name}</span>
                      <Badge variant="outline">
                        {getReportTypeLabel(config.reportType)}
                      </Badge>
                      {config.enabled ? (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                          运行中
                        </Badge>
                      ) : (
                        <Badge variant="secondary">已暂停</Badge>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {config.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          下次发送: {config.nextRunAt?.toLocaleString() ?? "未设置"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{config.recipients.length} 位接收者</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{config.deliveryChannels.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={() => toggleEnabled(config.id)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => executeNow(config)}
                      title="立即执行"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteConfig(config.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {configs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无定时任务</p>
                <p className="text-sm">点击"新建定时任务"创建第一个定时报表</p>
              </div>
            )}
          </TabsContent>

          {/* 发送历史 */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-2">
              {history.map(record => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  {getStatusIcon(record.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getReportTypeLabel(record.reportType)}
                      </Badge>
                      <span className="text-sm">
                        {record.sentAt.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      发送给: {record.recipients.join(", ")}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(record.fileSize)}
                  </div>
                </div>
              ))}
            </div>

            {history.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无发送记录</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
