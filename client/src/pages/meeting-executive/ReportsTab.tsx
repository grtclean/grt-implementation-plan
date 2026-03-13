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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();

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
            {t("meeting.reports.singleMeetingReport")}
          </CardTitle>
          <CardDescription>{t("meeting.reports.singleMeetingReportDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.reports.meetingId")}</label>
              <Input
                placeholder={t("meeting.reports.meetingIdPlaceholder")}
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
              {t("meeting.reports.generateReport")}
            </Button>
          </div>
          {meetingReportMutation.isError && (
            <p className="text-sm text-destructive mt-2">{meetingReportMutation.error.message}</p>
          )}
          {meetingReportMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">{t("meeting.reports.pdfDownloaded")}: {meetingReportMutation.data.filename}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dashboard Excel Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            {t("meeting.reports.dashboardExport")}
          </CardTitle>
          <CardDescription>{t("meeting.reports.dashboardExportDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.reports.dateFrom")}</label>
              <Input
                type="date"
                value={excelDateFrom}
                onChange={(e) => setExcelDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.reports.dateTo")}</label>
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
              {t("meeting.reports.exportExcel")}
            </Button>
          </div>
          {dashboardExcelMutation.isError && (
            <p className="text-sm text-destructive mt-2">{dashboardExcelMutation.error.message}</p>
          )}
          {dashboardExcelMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">{t("meeting.reports.excelDownloaded")}: {dashboardExcelMutation.data.filename}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Benchmark Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            {t("meeting.reports.benchmarkReport")}
          </CardTitle>
          <CardDescription>{t("meeting.reports.benchmarkReportDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="w-40">
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.reports.scope")}</label>
              <Select value={benchScope} onValueChange={setBenchScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("meeting.reports.scopeAll")}</SelectItem>
                  <SelectItem value="channel">{t("meeting.reports.scopeChannel")}</SelectItem>
                  <SelectItem value="department">{t("meeting.reports.scopeDepartment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {benchScope !== "all" && (
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm text-muted-foreground mb-1 block">
                  {benchScope === "channel" ? t("meeting.reports.channelId") : t("meeting.reports.departmentName")}
                </label>
                <Input
                  placeholder={benchScope === "channel" ? t("meeting.reports.channelIdPlaceholder") : t("meeting.reports.departmentNamePlaceholder")}
                  value={benchScopeId}
                  onChange={(e) => setBenchScopeId(e.target.value)}
                />
              </div>
            )}
            <div className="w-36">
              <label className="text-sm text-muted-foreground mb-1 block">{t("meeting.reports.period")}</label>
              <Select value={benchPeriod} onValueChange={setBenchPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("meeting.reports.monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("meeting.reports.quarterly")}</SelectItem>
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
              {t("meeting.reports.generateBenchmark")}
            </Button>
          </div>
          {benchmarkMutation.isError && (
            <p className="text-sm text-destructive mt-2">{benchmarkMutation.error.message}</p>
          )}
          {benchmarkMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">{t("meeting.reports.benchmarkDownloaded")}: {benchmarkMutation.data.filename}</p>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            {t("meeting.reports.exportHistory")}
          </CardTitle>
          <CardDescription>{t("meeting.reports.exportHistoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("meeting.reports.thType")}</TableHead>
                <TableHead>{t("meeting.reports.thFormat")}</TableHead>
                <TableHead>{t("meeting.reports.thFilename")}</TableHead>
                <TableHead>{t("meeting.reports.thSize")}</TableHead>
                <TableHead>{t("meeting.reports.thGeneratedAt")}</TableHead>
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
                        {row.report_type === "meeting" ? t("meeting.reports.typeMeeting") :
                         row.report_type === "dashboard" ? t("meeting.reports.typeDashboard") : t("meeting.reports.typeBenchmark")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.format === "pdf" ? "PDF" : "XLSX"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">{row.filename}</TableCell>
                    <TableCell className="text-sm">
                      {row.file_size ? `${(Number(row.file_size) / 1024).toFixed(1)} KB` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.generated_at ? new Date(row.generated_at).toLocaleString("zh-CN") : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("meeting.reports.noExportHistory")}
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
