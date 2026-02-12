/**
 * 批量导出组件
 * 支持多选会议记录批量导出为ZIP压缩包
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  FileArchive,
  FileText,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  Users,
  X,
  CheckSquare,
  Square,
} from "lucide-react";

interface MeetingRecord {
  id: number;
  title: string;
  date: Date;
  duration?: number;
  participants?: string[];
  hasTranscript: boolean;
  hasDecisions: boolean;
}

interface BatchExportProps {
  meetings: MeetingRecord[];
  onExportComplete?: (result: BatchExportResult) => void;
}

interface BatchExportResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  downloadUrl?: string;
}

interface ExportOptions {
  format: "markdown" | "html";
  includeTranscript: boolean;
  includeDecisions: boolean;
  includeActionItems: boolean;
  includeSummary: boolean;
  includeMetadata: boolean;
}

export default function BatchExport({ meetings, onExportComplete }: BatchExportProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "markdown",
    includeTranscript: true,
    includeDecisions: true,
    includeActionItems: true,
    includeSummary: true,
    includeMetadata: true,
  });

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 格式化时长
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // 切换单个选择
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === meetings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(meetings.map((m) => m.id)));
    }
  };

  // 开始导出
  const startExport = async () => {
    if (selectedIds.size === 0) {
      toast.error("请至少选择一个会议记录");
      return;
    }

    setShowOptionsDialog(false);
    setIsExporting(true);
    setExportProgress(0);

    // 模拟导出进度
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 2000));

    clearInterval(progressInterval);
    setExportProgress(100);

    // 模拟导出结果
    const result: BatchExportResult = {
      success: true,
      totalCount: selectedIds.size,
      successCount: selectedIds.size,
      failedCount: 0,
      downloadUrl: "#",
    };

    setTimeout(() => {
      setIsExporting(false);
      setExportProgress(0);
      onExportComplete?.(result);
      toast.success(`成功导出 ${result.successCount} 个会议记录`);
    }, 500);
  };

  // 计算预估文件大小
  const estimateSize = () => {
    const baseSize = 2; // KB per meeting
    let multiplier = 1;
    if (exportOptions.includeTranscript) multiplier += 2;
    if (exportOptions.includeDecisions) multiplier += 0.5;
    if (exportOptions.includeActionItems) multiplier += 0.5;
    if (exportOptions.includeSummary) multiplier += 0.3;
    return Math.round(selectedIds.size * baseSize * multiplier);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              批量导出
            </CardTitle>
            <CardDescription>
              选择多个会议记录，批量导出为压缩包
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              已选择 {selectedIds.size} / {meetings.length}
            </Badge>
            <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
              <DialogTrigger asChild>
                <Button disabled={selectedIds.size === 0 || isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  导出选中项
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>导出选项</DialogTitle>
                  <DialogDescription>
                    选择导出格式和包含的内容
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* 导出格式 */}
                  <div className="space-y-2">
                    <Label>导出格式</Label>
                    <Select
                      value={exportOptions.format}
                      onValueChange={(value: "markdown" | "html") =>
                        setExportOptions({ ...exportOptions, format: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="markdown">Markdown (.md)</SelectItem>
                        <SelectItem value="html">HTML (.html)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 包含内容 */}
                  <div className="space-y-3">
                    <Label>包含内容</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeMetadata"
                          checked={exportOptions.includeMetadata}
                          onCheckedChange={(checked) =>
                            setExportOptions({ ...exportOptions, includeMetadata: !!checked })
                          }
                        />
                        <Label htmlFor="includeMetadata" className="font-normal">
                          会议基本信息（日期、时长、参与人员）
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeSummary"
                          checked={exportOptions.includeSummary}
                          onCheckedChange={(checked) =>
                            setExportOptions({ ...exportOptions, includeSummary: !!checked })
                          }
                        />
                        <Label htmlFor="includeSummary" className="font-normal">
                          会议摘要
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeDecisions"
                          checked={exportOptions.includeDecisions}
                          onCheckedChange={(checked) =>
                            setExportOptions({ ...exportOptions, includeDecisions: !!checked })
                          }
                        />
                        <Label htmlFor="includeDecisions" className="font-normal">
                          关键决策
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeActionItems"
                          checked={exportOptions.includeActionItems}
                          onCheckedChange={(checked) =>
                            setExportOptions({ ...exportOptions, includeActionItems: !!checked })
                          }
                        />
                        <Label htmlFor="includeActionItems" className="font-normal">
                          行动项
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeTranscript"
                          checked={exportOptions.includeTranscript}
                          onCheckedChange={(checked) =>
                            setExportOptions({ ...exportOptions, includeTranscript: !!checked })
                          }
                        />
                        <Label htmlFor="includeTranscript" className="font-normal">
                          完整转录文本
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* 预估信息 */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>选中会议数</span>
                      <span className="font-medium">{selectedIds.size} 个</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>预估文件大小</span>
                      <span className="font-medium">~{estimateSize()} KB</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowOptionsDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={startExport}>
                    <Download className="h-4 w-4 mr-2" />
                    开始导出
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 导出进度 */}
        {isExporting && (
          <div className="mb-4 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在导出...
              </span>
              <span className="text-sm">{Math.round(exportProgress)}%</span>
            </div>
            <Progress value={exportProgress} />
          </div>
        )}

        {/* 全选按钮 */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="flex items-center gap-2"
          >
            {selectedIds.size === meetings.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedIds.size === meetings.length ? "取消全选" : "全选"}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              清除选择
            </Button>
          )}
        </div>

        {/* 会议列表 */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无会议记录</p>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(meeting.id)
                      ? "bg-primary/5 border-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSelection(meeting.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(meeting.id)}
                    onCheckedChange={() => toggleSelection(meeting.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{meeting.title}</span>
                      {meeting.hasTranscript && (
                        <Badge variant="secondary" className="text-xs">
                          已转录
                        </Badge>
                      )}
                      {meeting.hasDecisions && (
                        <Badge variant="outline" className="text-xs">
                          有决策
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(meeting.date)}
                      </span>
                      {meeting.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(meeting.duration)}
                        </span>
                      )}
                      {meeting.participants && meeting.participants.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {meeting.participants.length} 人
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedIds.has(meeting.id) && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
