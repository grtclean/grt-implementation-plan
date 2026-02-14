/**
 * MySQL备份管理页面
 * v2.5.22 - Windows计划任务自动备份数据库
 */

import { useState } from 'react';
import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  Calendar,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Settings,
  Trash2,
  RefreshCw,
  FileText,
  Copy,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupConfig {
  id: string;
  name: string;
  enabled: boolean;
  scheduleType: 'daily' | 'weekly' | 'monthly';
  scheduleTime: string;
  retention: number;
  compression: boolean;
}

interface BackupRecord {
  id: string;
  filename: string;
  size: number;
  status: 'success' | 'failed' | 'running';
  createdAt: string;
  duration: number;
}

export default function MySQLBackupManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // 模拟数据
  const [configs] = useState<BackupConfig[]>([
    {
      id: '1',
      name: '每日自动备份',
      enabled: true,
      scheduleType: 'daily',
      scheduleTime: '02:00',
      retention: 7,
      compression: true,
    },
    {
      id: '2',
      name: '每周完整备份',
      enabled: true,
      scheduleType: 'weekly',
      scheduleTime: '03:00',
      retention: 4,
      compression: true,
    },
  ]);

  const [backupRecords] = useState<BackupRecord[]>([
    { id: '1', filename: 'grt-backup-2024-01-28_02-00-00.sql.gz', size: 156789012, status: 'success', createdAt: '2024-01-28 02:00:15', duration: 45 },
    { id: '2', filename: 'grt-backup-2024-01-27_02-00-00.sql.gz', size: 155234567, status: 'success', createdAt: '2024-01-27 02:00:12', duration: 42 },
    { id: '3', filename: 'grt-backup-2024-01-26_02-00-00.sql.gz', size: 154123456, status: 'success', createdAt: '2024-01-26 02:00:18', duration: 48 },
    { id: '4', filename: 'grt-backup-2024-01-25_02-00-00.sql.gz', size: 153456789, status: 'failed', createdAt: '2024-01-25 02:00:05', duration: 0 },
    { id: '5', filename: 'grt-backup-2024-01-24_02-00-00.sql.gz', size: 152345678, status: 'success', createdAt: '2024-01-24 02:00:22', duration: 52 },
  ]);

  const stats = {
    totalBackups: backupRecords.length,
    successRate: Math.round((backupRecords.filter(r => r.status === 'success').length / backupRecords.length) * 100),
    totalSize: backupRecords.reduce((sum, r) => sum + r.size, 0),
    lastBackup: backupRecords[0]?.createdAt || 'N/A',
    nextBackup: '2024-01-29 02:00:00',
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const handleManualBackup = async () => {
    setIsBackupRunning(true);
    toast({
      title: '备份已启动',
      description: '正在执行数据库备份，请稍候...',
    });

    // 模拟备份过程
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsBackupRunning(false);
    toast({
      title: '备份完成',
      description: '数据库备份已成功完成',
    });
  };

  const handleRestore = (backupId: string) => {
    toast({
      title: '确认恢复',
      description: '即将从备份恢复数据库，此操作将覆盖当前数据',
      variant: 'destructive',
    });
  };

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast({
      title: '已复制',
      description: '脚本已复制到剪贴板',
    });
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={Database}
        title="MySQL备份管理"
        description="数据库自动备份、恢复和计划任务管理"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
              <Settings className="w-4 h-4 mr-2" />
              配置
            </Button>
            <Button onClick={handleManualBackup} disabled={isBackupRunning}>
              {isBackupRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  备份中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  立即备份
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard icon={Database} label="总备份数" value={stats.totalBackups} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label="成功率" value={`${stats.successRate}%`} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={HardDrive} label="总大小" value={formatSize(stats.totalSize)} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Clock} label="上次备份" value={stats.lastBackup} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Calendar} label="下次备份" value={stats.nextBackup} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">备份记录</TabsTrigger>
          <TabsTrigger value="configs">备份配置</TabsTrigger>
          <TabsTrigger value="scripts">脚本生成</TabsTrigger>
        </TabsList>

        {/* 备份记录 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>备份历史</CardTitle>
              <CardDescription>查看所有数据库备份记录</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">{record.filename}</TableCell>
                      <TableCell>{formatSize(record.size)}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                          {record.status === 'success' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" />成功</>
                          ) : record.status === 'failed' ? (
                            <><XCircle className="w-3 h-3 mr-1" />失败</>
                          ) : (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />进行中</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.createdAt}</TableCell>
                      <TableCell>{record.duration > 0 ? `${record.duration}秒` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" disabled={record.status !== 'success'}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={record.status !== 'success'}
                            onClick={() => handleRestore(record.id)}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
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

        {/* 备份配置 */}
        <TabsContent value="configs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>备份计划</CardTitle>
              <CardDescription>管理自动备份计划和保留策略</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Switch checked={config.enabled} />
                      <div>
                        <p className="font-medium">{config.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {config.scheduleType === 'daily' && '每天'}
                          {config.scheduleType === 'weekly' && '每周'}
                          {config.scheduleType === 'monthly' && '每月'}
                          {' '}{config.scheduleTime} 执行 | 保留 {config.retention} 份
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {config.compression ? '压缩' : '未压缩'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>保留策略</CardTitle>
              <CardDescription>配置备份文件的保留规则</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>每日备份保留</Label>
                  <Input type="number" defaultValue={7} />
                  <p className="text-xs text-muted-foreground">保留最近N天的每日备份</p>
                </div>
                <div className="space-y-2">
                  <Label>每周备份保留</Label>
                  <Input type="number" defaultValue={4} />
                  <p className="text-xs text-muted-foreground">保留最近N周的周备份</p>
                </div>
                <div className="space-y-2">
                  <Label>每月备份保留</Label>
                  <Input type="number" defaultValue={12} />
                  <p className="text-xs text-muted-foreground">保留最近N月的月备份</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 脚本生成 */}
        <TabsContent value="scripts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Windows计划任务脚本</CardTitle>
              <CardDescription>生成PowerShell备份脚本和计划任务配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>PowerShell备份脚本</Label>
                  <Button variant="outline" size="sm" onClick={() => copyScript('backup.ps1')}>
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto max-h-64">
{`# GRT System MySQL Backup Script
param([string]$ConfigId = "default")

$BackupDir = "C:\\GRT-System\\backups"
$MySQLPath = "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = Join-Path $BackupDir "grt-backup-$Timestamp.sql"

# Execute mysqldump
& "$MySQLPath\\mysqldump.exe" --host=localhost --user=root \\
  --single-transaction --routines --triggers grt_system > $BackupFile

# Compress and cleanup
Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip"
Remove-Item $BackupFile`}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>创建计划任务命令</Label>
                  <Button variant="outline" size="sm" onClick={() => copyScript('schtasks')}>
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                </div>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`schtasks /create /tn "GRT-MySQL-Backup" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\\GRT-System\\scripts\\backup.ps1" /sc daily /st 02:00 /ru SYSTEM`}
                </pre>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  下载完整脚本包
                </Button>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  下载计划任务XML
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>恢复脚本</CardTitle>
              <CardDescription>从备份文件恢复数据库</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`# GRT System MySQL Restore Script
param([string]$BackupFile)

$MySQLPath = "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin"

# Decompress if needed
if ($BackupFile.EndsWith(".zip")) {
    Expand-Archive -Path $BackupFile -DestinationPath (Split-Path $BackupFile)
    $BackupFile = $BackupFile.Replace(".zip", "")
}

# Restore database
& "$MySQLPath\\mysql.exe" --host=localhost --user=root grt_system < $BackupFile`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
