/**
 * 导出历史记录组件
 * v1.3.83 - 展示和管理导出历史
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Download,
  Trash2,
  FileText,
  FileCode,
  File,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  History,
  Filter,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 类型定义
type ExportType = 'transcription' | 'report' | 'data' | 'sync_log';
type ExportFormat = 'markdown' | 'html' | 'pdf' | 'docx' | 'csv' | 'json';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ExportRecord {
  id: string;
  exportType: ExportType;
  format: ExportFormat;
  fileName: string;
  fileUrl: string | null;
  fileSize: number;
  sourceType: string | null;
  status: ExportStatus;
  createdAt: number;
  expiresAt: number | null;
}

// 模拟数据
const mockExports: ExportRecord[] = [
  {
    id: 'exp_1',
    exportType: 'transcription',
    format: 'markdown',
    fileName: '项目评审会议_转录_20260204.md',
    fileUrl: '/exports/meeting_transcript_1.md',
    fileSize: 15360,
    sourceType: 'meeting',
    status: 'completed',
    createdAt: Date.now() - 3600000,
    expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'exp_2',
    exportType: 'transcription',
    format: 'html',
    fileName: '技术方案讨论_转录_20260203.html',
    fileUrl: '/exports/meeting_transcript_2.html',
    fileSize: 28672,
    sourceType: 'meeting',
    status: 'completed',
    createdAt: Date.now() - 86400000,
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'exp_3',
    exportType: 'sync_log',
    format: 'csv',
    fileName: '同步日志_CN_US_20260202.csv',
    fileUrl: '/exports/sync_log_1.csv',
    fileSize: 45056,
    sourceType: 'sync',
    status: 'completed',
    createdAt: Date.now() - 172800000,
    expiresAt: Date.now() + 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'exp_4',
    exportType: 'report',
    format: 'pdf',
    fileName: '月度项目报告_202601.pdf',
    fileUrl: null,
    fileSize: 0,
    sourceType: 'project',
    status: 'failed',
    createdAt: Date.now() - 259200000,
    expiresAt: null,
  },
];

const exportTypeLabels: Record<ExportType, string> = {
  transcription: '会议转录',
  report: '报告',
  data: '数据',
  sync_log: '同步日志',
};

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  markdown: <FileText className="w-4 h-4" />,
  html: <FileCode className="w-4 h-4" />,
  pdf: <File className="w-4 h-4 text-red-500" />,
  docx: <File className="w-4 h-4 text-blue-500" />,
  csv: <FileText className="w-4 h-4 text-green-500" />,
  json: <FileCode className="w-4 h-4 text-yellow-500" />,
};

interface ExportHistoryProps {
  /** 默认过滤类型，用于集成到其他模块时预设筛选 */
  defaultFilterType?: ExportType | 'all';
  /** 是否隐藏类型筛选器 */
  hideTypeFilter?: boolean;
  /** 标题 */
  title?: string;
}

export default function ExportHistory({
  defaultFilterType = 'all',
  hideTypeFilter = false,
  title = '导出历史记录',
}: ExportHistoryProps = {}) {
  const { toast } = useToast();
  const [exports, setExports] = useState<ExportRecord[]>(mockExports);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(defaultFilterType);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 计算剩余时间
  const getRemainingTime = (expiresAt: number | null): string => {
    if (!expiresAt) return '-';
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return '已过期';
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    if (days > 0) return `${days}天后过期`;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    return `${hours}小时后过期`;
  };

  // 获取状态徽章
  const getStatusBadge = (status: ExportStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />完成</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />处理中</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />等待中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 过滤导出记录
  const filteredExports = exports.filter(exp => {
    const matchesSearch = exp.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || exp.exportType === typeFilter;
    return matchesSearch && matchesType;
  });

  // 下载文件
  const handleDownload = (exp: ExportRecord) => {
    if (!exp.fileUrl || exp.status !== 'completed') {
      toast({ title: '无法下载', description: '文件不可用或已过期', variant: 'destructive' });
      return;
    }
    
    // 模拟下载
    toast({ title: '开始下载', description: exp.fileName });
  };

  // 删除记录
  const handleDelete = () => {
    if (!selectedExport) return;
    
    setExports(exports.filter(e => e.id !== selectedExport.id));
    setDeleteDialogOpen(false);
    setSelectedExport(null);
    toast({ title: '已删除', description: '导出记录已删除' });
  };

  // 刷新列表
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({ title: '已刷新', description: '导出历史已更新' });
    }, 1000);
  };

  // 统计数据
  const stats = {
    total: exports.length,
    completed: exports.filter(e => e.status === 'completed').length,
    totalSize: exports.reduce((sum, e) => sum + e.fileSize, 0),
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总导出数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成功导出</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总大小</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>查看和管理您的导出记录</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {!hideTypeFilter && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="类型筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="transcription">会议转录</SelectItem>
                  <SelectItem value="report">报告</SelectItem>
                  <SelectItem value="data">数据</SelectItem>
                  <SelectItem value="sync_log">同步日志</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 导出列表 */}
          {filteredExports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无导出记录
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>格式</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>导出时间</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {formatIcons[exp.format]}
                        <span className="truncate max-w-[200px]" title={exp.fileName}>
                          {exp.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{exportTypeLabels[exp.exportType]}</Badge>
                    </TableCell>
                    <TableCell className="uppercase text-xs">{exp.format}</TableCell>
                    <TableCell>{formatFileSize(exp.fileSize)}</TableCell>
                    <TableCell>{getStatusBadge(exp.status)}</TableCell>
                    <TableCell>{formatTime(exp.createdAt)}</TableCell>
                    <TableCell>
                      <span className={exp.expiresAt && exp.expiresAt < Date.now() + 24 * 60 * 60 * 1000 ? 'text-orange-500' : ''}>
                        {getRemainingTime(exp.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(exp)}
                          disabled={exp.status !== 'completed' || !exp.fileUrl}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExport(exp);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除导出记录 "{selectedExport?.fileName}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
