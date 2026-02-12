/**
 * 合规报告历史面板组件
 * 显示历史报告列表，支持查看和下载
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Filter,
  BarChart3,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface ReportHistoryPanelProps {
  className?: string;
}

export default function ReportHistoryPanel({ className }: ReportHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("all");
  const pageSize = 10;

  // 获取报告历史
  const { data: historyData, isLoading, refetch } = (trpc.compliance.getReportHistory as any).useQuery({
    page,
    pageSize,
    format: formatFilter !== "all" ? formatFilter as any : undefined,
    jurisdiction: jurisdictionFilter !== "all" ? jurisdictionFilter as any : undefined
  });

  // 获取报告统计
  const { data: statsData } = trpc.compliance.getReportStats.useQuery();

  // 删除报告
  const deleteMutation = trpc.compliance.deleteReport.useMutation({
    onSuccess: () => {
      toast.success("报告已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    }
  });

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取格式图标
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'csv':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">已完成</Badge>;
      case 'generating':
        return <Badge variant="secondary">生成中</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 获取管辖区标签
  const getJurisdictionLabel = (jurisdiction?: string) => {
    switch (jurisdiction) {
      case 'DE': return '🇩🇪 德国';
      case 'US': return '🇺🇸 美国';
      case 'CN': return '🇨🇳 中国';
      case 'ALL': return '全部地区';
      default: return jurisdiction || '-';
    }
  };

  // 处理下载
  const handleDownload = (fileUrl: string, reportId: string, format: string) => {
    if (!fileUrl) {
      toast.error("报告文件不可用");
      return;
    }
    window.open(fileUrl, '_blank');
    toast.success("正在下载报告...");
  };

  // 处理删除
  const handleDelete = (reportId: string) => {
    if (confirm("确定要删除此报告吗？此操作不可撤销。")) {
      deleteMutation.mutate({ reportId });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              报告历史记录
            </CardTitle>
            <CardDescription>
              查看和下载历史生成的合规报告
            </CardDescription>
          </div>
          {statsData && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span>共 {(statsData as any).totalReports} 份报告</span>
              </div>
              <div>
                近7天: {(statsData as any).recentCount} 份
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 筛选器 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">筛选:</span>
          </div>
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部格式</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
          <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="地区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部地区</SelectItem>
              <SelectItem value="DE">德国</SelectItem>
              <SelectItem value="US">美国</SelectItem>
              <SelectItem value="CN">中国</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 报告列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">加载中...</span>
          </div>
        ) : (historyData as any)?.reports?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无报告记录</p>
            <p className="text-sm">生成新的合规报告后将在此显示</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>格式</TableHead>
                  <TableHead>报告类型</TableHead>
                  <TableHead>地区</TableHead>
                  <TableHead>日期范围</TableHead>
                  <TableHead>生成者</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>生成时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historyData as any)?.reports?.map((report: any) => (
                  <TableRow key={report.reportId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFormatIcon(report.format)}
                        <span className="uppercase text-xs font-medium">{report.format}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {report.reportType === 'daily' ? '日报' :
                         report.reportType === 'weekly' ? '周报' :
                         report.reportType === 'monthly' ? '月报' : '自定义'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getJurisdictionLabel(report.jurisdiction)}</TableCell>
                    <TableCell className="text-sm">
                      {report.dateRangeStart && report.dateRangeEnd ? (
                        <span>{report.dateRangeStart} ~ {report.dateRangeEnd}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{report.generatedByName || '-'}</TableCell>
                    <TableCell>{formatFileSize(report.fileSizeBytes)}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.status === 'completed' && report.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(report.fileUrl, report.reportId, report.format)}
                            title="下载报告"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(report.reportId)}
                          disabled={deleteMutation.isPending}
                          title="删除报告"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 分页 */}
            {historyData && (historyData as any).totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  第 {page} 页，共 {(historyData as any).totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min((historyData as any).totalPages, p + 1))}
                    disabled={page === (historyData as any).totalPages}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
