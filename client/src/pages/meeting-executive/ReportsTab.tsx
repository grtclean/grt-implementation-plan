import { useState } from "react";
import {
  FileText,
  Download,
  FileSpreadsheet,
  BarChart3,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Helper: download base64 file
// ---------------------------------------------------------------------------
function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// ReportsTab
// ---------------------------------------------------------------------------
export function ReportsTab() {
  // --- Single meeting report state ---
  const [meetingId, setMeetingId] = useState("");
  const meetingReportMutation = trpc.ime.generateMeetingReport.useMutation({
    onSuccess(data) {
      downloadBase64File(data.base64, data.filename, "application/pdf");
    },
  });

  // --- Dashboard Excel state ---
  const [excelDateFrom, setExcelDateFrom] = useState("");
  const [excelDateTo, setExcelDateTo] = useState("");
  const dashboardExcelMutation = trpc.ime.generateDashboardExcel.useMutation({
    onSuccess(data) {
      downloadBase64File(data.base64, data.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    },
  });

  // --- Benchmark report state ---
  const [benchScope, setBenchScope] = useState("all");
  const [benchScopeId, setBenchScopeId] = useState("");
  const [benchPeriod, setBenchPeriod] = useState("monthly");
  const benchmarkMutation = trpc.ime.generateBenchmarkReport.useMutation({
    onSuccess(data) {
      downloadBase64File(data.base64, data.filename, "application/pdf");
    },
  });

  // --- Export history ---
  const historyQuery = trpc.ime.reportExportHistory.useQuery({});

  return (
    <div className="space-y-6">
      {/* Section 1: Single Meeting Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            单次会议报告
          </CardTitle>
          <CardDescription>根据会议ID生成完整的PDF分析报告，包含贡献分析、效能评分、情感分析、ROI等8个维度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">会议ID</label>
              <Input
                placeholder="输入会议ID..."
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
              />
            </div>
            <Button
              onClick={() => meetingReportMutation.mutate({ meetingId })}
              disabled={!meetingId.trim() || meetingReportMutation.isPending}
            >
              {meetingReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              生成报告
            </Button>
          </div>
          {meetingReportMutation.isError && (
            <p className="text-sm text-destructive mt-2">{meetingReportMutation.error.message}</p>
          )}
          {meetingReportMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">PDF报告已下载: {meetingReportMutation.data.filename}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Excel Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            仪表盘数据导出
          </CardTitle>
          <CardDescription>导出包含7个工作表的Excel文件：概览、ROI、情感趋势、部门对比、行动项、预测与风险、参会优化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">开始日期</label>
              <Input
                type="date"
                value={excelDateFrom}
                onChange={(e) => setExcelDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">结束日期</label>
              <Input
                type="date"
                value={excelDateTo}
                onChange={(e) => setExcelDateTo(e.target.value)}
              />
            </div>
            <Button
              onClick={() => dashboardExcelMutation.mutate({
                dateFrom: excelDateFrom || undefined,
                dateTo: excelDateTo || undefined,
              })}
              disabled={dashboardExcelMutation.isPending}
            >
              {dashboardExcelMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              导出Excel
            </Button>
          </div>
          {dashboardExcelMutation.isError && (
            <p className="text-sm text-destructive mt-2">{dashboardExcelMutation.error.message}</p>
          )}
          {dashboardExcelMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">Excel已下载: {dashboardExcelMutation.data.filename}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Benchmark Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            基准对比报告
          </CardTitle>
          <CardDescription>生成期间对比PDF报告，包含核心指标变化、趋势图、最佳/最差会议、AI建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="w-40">
              <label className="text-sm text-muted-foreground mb-1 block">范围</label>
              <Select value={benchScope} onValueChange={setBenchScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="channel">频道</SelectItem>
                  <SelectItem value="department">部门</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {benchScope !== "all" && (
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm text-muted-foreground mb-1 block">
                  {benchScope === "channel" ? "频道ID" : "部门名称"}
                </label>
                <Input
                  placeholder={benchScope === "channel" ? "输入频道ID..." : "输入部门名称..."}
                  value={benchScopeId}
                  onChange={(e) => setBenchScopeId(e.target.value)}
                />
              </div>
            )}
            <div className="w-36">
              <label className="text-sm text-muted-foreground mb-1 block">对比周期</label>
              <Select value={benchPeriod} onValueChange={setBenchPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月度</SelectItem>
                  <SelectItem value="quarterly">季度</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => benchmarkMutation.mutate({
                scope: benchScope,
                scopeId: benchScopeId || undefined,
                period: benchPeriod,
              })}
              disabled={benchmarkMutation.isPending}
            >
              {benchmarkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              生成基准报告
            </Button>
          </div>
          {benchmarkMutation.isError && (
            <p className="text-sm text-destructive mt-2">{benchmarkMutation.error.message}</p>
          )}
          {benchmarkMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">PDF已下载: {benchmarkMutation.data.filename}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            导出历史
          </CardTitle>
          <CardDescription>最近的报告导出记录</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>格式</TableHead>
                <TableHead>文件名</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>生成时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(historyQuery.data as any[])?.length ? (
                (historyQuery.data as any[]).map((row: any, i: number) => (
                  <TableRow key={row.id || i}>
                    <TableCell>
                      <Badge variant={
                        row.report_type === "meeting" ? "default" :
                        row.report_type === "dashboard" ? "secondary" : "outline"
                      }>
                        {row.report_type === "meeting" ? "会议报告" :
                         row.report_type === "dashboard" ? "仪表盘" : "基准报告"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.format === "pdf" ? "PDF" : "XLSX"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">{row.filename}</TableCell>
                    <TableCell className="text-sm">
                      {row.file_size ? `${(Number(row.file_size) / 1024).toFixed(1)} KB` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.generated_at ? new Date(row.generated_at).toLocaleString("zh-CN") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    暂无导出记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
