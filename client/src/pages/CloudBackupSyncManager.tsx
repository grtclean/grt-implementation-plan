/**
 * 备份云端同步管理页面
 * v2.5.23 - 本地备份自动同步到云存储
 */

import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Cloud,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Bell,
} from 'lucide-react';
import NotificationConfig from '@/components/sync/NotificationConfig';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatCard } from '@/components/grt';

// 类型定义
type CloudProvider = 'aliyun-oss' | 'tencent-cos' | 'aws-s3';

interface CloudConfig {
  id: string;
  name: string;
  provider: CloudProvider;
  enabled: boolean;
  bucket: string;
  region: string;
  lastSync: number | null;
}

interface SyncTask {
  id: string;
  configId: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
}

interface RemoteFile {
  key: string;
  size: number;
  lastModified: number;
}

export default function CloudBackupSyncManager() {
  const { toast } = useToast();
  const { t, tpl } = useLanguage();
  const [activeTab, setActiveTab] = useState('configs');
  
  // 模拟数据
  const [configs, setConfigs] = useState<CloudConfig[]>([
    {
      id: 'config-1',
      name: '阿里云OSS主存储',
      provider: 'aliyun-oss',
      enabled: true,
      bucket: 'grt-backup-prod',
      region: 'cn-shanghai',
      lastSync: Date.now() - 3600000,
    },
    {
      id: 'config-2',
      name: '腾讯云COS备份',
      provider: 'tencent-cos',
      enabled: false,
      bucket: 'grt-backup-dr',
      region: 'ap-guangzhou',
      lastSync: null,
    },
  ]);

  const [tasks, setTasks] = useState<SyncTask[]>([
    {
      id: 'task-1',
      configId: 'config-1',
      fileName: 'grt-backup-2026-01-28.sql.gz',
      fileSize: 52428800,
      status: 'completed',
      progress: 100,
      startedAt: Date.now() - 3600000,
    },
    {
      id: 'task-2',
      configId: 'config-1',
      fileName: 'grt-backup-2026-01-27.sql.gz',
      fileSize: 50331648,
      status: 'completed',
      progress: 100,
      startedAt: Date.now() - 90000000,
    },
  ]);

  const [remoteFiles, setRemoteFiles] = useState<RemoteFile[]>([
    { key: 'backups/grt-backup-2026-01-28.sql.gz', size: 52428800, lastModified: Date.now() - 3600000 },
    { key: 'backups/grt-backup-2026-01-27.sql.gz', size: 50331648, lastModified: Date.now() - 90000000 },
    { key: 'backups/grt-backup-2026-01-26.sql.gz', size: 54525952, lastModified: Date.now() - 176400000 },
  ]);

  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<CloudConfig | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    provider: 'aliyun-oss' as CloudProvider,
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    region: '',
    autoSync: true,
    syncInterval: 60,
    retentionDays: 30,
  });

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // 格式化时间
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return t("admin.cloudBackup.never");
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取提供商名称
  const getProviderName = (provider: CloudProvider) => {
    const names: Record<CloudProvider, string> = {
      'aliyun-oss': t("admin.cloudBackup.aliyunOss"),
      'tencent-cos': t("admin.cloudBackup.tencentCos"),
      'aws-s3': 'AWS S3',
    };
    return names[provider];
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />{t("admin.cloudBackup.statusCompleted")}</Badge>;
      case 'uploading':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />{t("admin.cloudBackup.statusUploading")}</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t("admin.cloudBackup.statusFailed")}</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{t("admin.cloudBackup.statusPending")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 添加配置
  const handleAddConfig = () => {
    const newConfig: CloudConfig = {
      id: `config-${Date.now()}`,
      name: formData.name,
      provider: formData.provider,
      enabled: true,
      bucket: formData.bucket,
      region: formData.region,
      lastSync: null,
    };
    setConfigs([...configs, newConfig]);
    setShowAddDialog(false);
    resetForm();
    toast({ title: t("admin.cloudBackup.configAdded"), description: t("admin.cloudBackup.configAddedDesc") });
  };

  // 切换配置启用状态
  const toggleConfigEnabled = (id: string) => {
    setConfigs(configs.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  // 删除配置
  const deleteConfig = (id: string) => {
    setConfigs(configs.filter(c => c.id !== id));
    toast({ title: t("admin.cloudBackup.configDeleted") });
  };

  // 测试连接
  const testConnection = (id: string) => {
    toast({ title: t("admin.cloudBackup.connectionTest"), description: t("admin.cloudBackup.testingConnection") });
    setTimeout(() => {
      toast({ title: t("admin.cloudBackup.connectionSuccess"), description: t("admin.cloudBackup.connectionSuccessDesc") });
    }, 1000);
  };

  // 手动同步
  const manualSync = (configId: string) => {
    const newTask: SyncTask = {
      id: `task-${Date.now()}`,
      configId,
      fileName: `grt-backup-${new Date().toISOString().split('T')[0]}.sql.gz`,
      fileSize: 52428800,
      status: 'uploading',
      progress: 0,
      startedAt: Date.now(),
    };
    setTasks([newTask, ...tasks]);
    
    // 模拟上传进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setTasks(prev => prev.map(t => 
        t.id === newTask.id ? { ...t, progress, status: progress >= 100 ? 'completed' : 'uploading' } : t
      ));
      if (progress >= 100) {
        clearInterval(interval);
        toast({ title: t("admin.cloudBackup.syncComplete"), description: t("admin.cloudBackup.syncCompleteDesc") });
      }
    }, 500);
  };

  // 下载文件
  const downloadFile = (key: string) => {
    toast({ title: t("admin.cloudBackup.startDownload"), description: tpl("admin.cloudBackup.downloadingFile", { name: key.split('/').pop() || "" }) });
    setTimeout(() => {
      toast({ title: t("admin.cloudBackup.downloadComplete"), description: t("admin.cloudBackup.downloadCompleteDesc") });
    }, 2000);
  };

  // 删除远程文件
  const deleteRemoteFile = (key: string) => {
    setRemoteFiles(remoteFiles.filter(f => f.key !== key));
    toast({ title: t("admin.cloudBackup.fileDeleted") });
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'aliyun-oss',
      accessKeyId: '',
      accessKeySecret: '',
      bucket: '',
      region: '',
      autoSync: true,
      syncInterval: 60,
      retentionDays: 30,
    });
  };

  // 计算统计数据
  const stats = {
    totalConfigs: configs.length,
    enabledConfigs: configs.filter(c => c.enabled).length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    totalSize: remoteFiles.reduce((sum, f) => sum + f.size, 0),
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Cloud}
        title={t("admin.cloudBackup.title")}
        description={t("admin.cloudBackup.description")}
        actions={
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.cloudBackup.addCloudStorage")}
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Cloud} label={t("admin.cloudBackup.cloudStorageConfig")} value={`${stats.enabledConfigs}/${stats.totalConfigs}`} iconColor="text-blue-500" iconBg="bg-blue-50" />
        <StatCard icon={Upload} label={t("admin.cloudBackup.syncTasks")} value={`${stats.completedTasks}/${stats.totalTasks}`} iconColor="text-green-500" iconBg="bg-green-50" />
        <StatCard icon={HardDrive} label={t("admin.cloudBackup.cloudStorage")} value={formatSize(stats.totalSize)} iconColor="text-purple-500" iconBg="bg-purple-50" />
        <StatCard icon={CheckCircle} label={t("admin.cloudBackup.cloudFiles")} value={remoteFiles.length} iconColor="text-emerald-500" iconBg="bg-emerald-50" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="configs">{t("admin.cloudBackup.cloudStorageConfig")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("admin.cloudBackup.syncTasks")}</TabsTrigger>
          <TabsTrigger value="files">{t("admin.cloudBackup.cloudFiles")}</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-1" />
            {t("admin.cloudBackup.notifications")}
          </TabsTrigger>
        </TabsList>

        {/* 云存储配置 */}
        <TabsContent value="configs" className="space-y-4">
          {configs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("admin.cloudBackup.noConfig")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map(config => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={() => toggleConfigEnabled(config.id)}
                      />
                    </div>
                    <CardDescription>
                      {getProviderName(config.provider)} · {config.bucket}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("admin.cloudBackup.region")}</span>
                      <span>{config.region}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("admin.cloudBackup.lastSync")}</span>
                      <span>{formatTime(config.lastSync)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => testConnection(config.id)}
                      >
                        {t("admin.cloudBackup.testConnection")}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => manualSync(config.id)}
                        disabled={!config.enabled}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        {t("admin.cloudBackup.syncNow")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedConfig(config);
                          setShowEditDialog(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        {t("admin.cloudBackup.settings")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-destructive"
                        onClick={() => deleteConfig(config.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("admin.cloudBackup.delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 同步任务 */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.cloudBackup.syncHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.cloudBackup.thFileName")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thSize")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thStatus")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thProgress")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thStartTime")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-sm">{task.fileName}</TableCell>
                      <TableCell>{formatSize(task.fileSize)}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress value={task.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(task.startedAt)}
                      </TableCell>
                      <TableCell>
                        {task.status === 'failed' && (
                          <Button variant="ghost" size="sm">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 云端文件 */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("admin.cloudBackup.cloudBackupFiles")}</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("admin.cloudBackup.refreshList")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.cloudBackup.thFilePath")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thSize")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thModified")}</TableHead>
                    <TableHead>{t("admin.cloudBackup.thAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remoteFiles.map(file => (
                    <TableRow key={file.key}>
                      <TableCell className="font-mono text-sm">{file.key}</TableCell>
                      <TableCell>{formatSize(file.size)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(file.lastModified)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(file.key)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteRemoteFile(file.key)}
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

        {/* 通知设置 */}
        <TabsContent value="notifications">
          <NotificationConfig />
        </TabsContent>
      </Tabs>

      {/* 添加配置对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.cloudBackup.addConfigTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.cloudBackup.addConfigDesc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.cloudBackup.configName")}</Label>
              <Input
                placeholder={t("admin.cloudBackup.configNamePlaceholder")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t("admin.cloudBackup.cloudProvider")}</Label>
              <Select
                value={formData.provider}
                onValueChange={(value: CloudProvider) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aliyun-oss">{t("admin.cloudBackup.aliyunOss")}</SelectItem>
                  <SelectItem value="tencent-cos">{t("admin.cloudBackup.tencentCos")}</SelectItem>
                  <SelectItem value="aws-s3">AWS S3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Access Key ID</Label>
                <Input
                  placeholder="AccessKeyId"
                  value={formData.accessKeyId}
                  onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Access Key Secret</Label>
                <Input
                  type="password"
                  placeholder="AccessKeySecret"
                  value={formData.accessKeySecret}
                  onChange={(e) => setFormData({ ...formData, accessKeySecret: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.cloudBackup.bucketName")}</Label>
                <Input
                  placeholder="bucket-name"
                  value={formData.bucket}
                  onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.cloudBackup.region")}</Label>
                <Input
                  placeholder="cn-shanghai"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.cloudBackup.autoSync")}</Label>
                <p className="text-sm text-muted-foreground">{t("admin.cloudBackup.autoSyncDesc")}</p>
              </div>
              <Switch
                checked={formData.autoSync}
                onCheckedChange={(checked) => setFormData({ ...formData, autoSync: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t("admin.cloudBackup.cancel")}
            </Button>
            <Button onClick={handleAddConfig}>
              {t("admin.cloudBackup.addConfig")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
