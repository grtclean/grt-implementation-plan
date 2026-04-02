/**
 * v2.5.31 工人数据Excel导入页面
 * 文件上传、字段映射、导入预览
 */

import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw, ArrowRight
} from "lucide-react";
import { useState, useRef } from "react";

interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
}

interface PreviewRow {
  rowNum: number;
  data: Record<string, string>;
  status: "valid" | "warning" | "error";
  errors: string[];
}

interface ImportHistory {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  importTime: Date;
  status: "success" | "partial" | "failed";
}

export default function WorkerImport() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [sourceFields] = useState(["姓名", "工号", "部门", "职位", "入职日期", "手机号", "邮箱"]);
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { sourceField: "姓名", targetField: "name", required: true },
    { sourceField: "工号", targetField: "employeeId", required: true },
    { sourceField: "部门", targetField: "department", required: true },
    { sourceField: "职位", targetField: "position", required: false },
    { sourceField: "入职日期", targetField: "hireDate", required: false },
    { sourceField: "手机号", targetField: "phone", required: false },
    { sourceField: "邮箱", targetField: "email", required: false },
  ]);

  const [previewData] = useState<PreviewRow[]>([
    { rowNum: 1, data: { "姓名": "胡杨", "工号": "GRT049", "部门": "AI数智部", "职位": "IT工程师", "入职日期": "2024-01-15", "手机号": "13800138001", "邮箱": "huyang@example.com" }, status: "valid", errors: [] },
    { rowNum: 2, data: { "姓名": "刘健康", "工号": "GRT063", "部门": "事业一部", "职位": "销售与项目工程师", "入职日期": "2024-02-01", "手机号": "13800138002", "邮箱": "liujiankang@example.com" }, status: "valid", errors: [] },
    { rowNum: 3, data: { "姓名": "", "工号": "W003", "部门": "质检部", "职位": "质检员", "入职日期": "2024-03-10", "手机号": "13800138003", "邮箱": "" }, status: "error", errors: ["姓名为必填字段"] },
    { rowNum: 4, data: { "姓名": "焦斌", "工号": "GRT059", "部门": "事业一部", "职位": "", "入职日期": "invalid", "手机号": "13800138004", "邮箱": "jiaobin@example.com" }, status: "warning", errors: ["入职日期格式不正确"] },
    { rowNum: 5, data: { "姓名": "韩保程", "工号": "GRT043", "部门": "事业一部", "职位": "销售与项目工程师", "入职日期": "2024-04-20", "手机号": "13800138005", "邮箱": "hanbaocheng@example.com" }, status: "valid", errors: [] },
  ]);

  const [importHistory] = useState<ImportHistory[]>([
    { id: "1", fileName: "工人名单_202401.xlsx", totalRows: 50, successCount: 48, failedCount: 2, skippedCount: 0, importTime: new Date("2024-01-20"), status: "partial" },
    { id: "2", fileName: "新员工_202402.xlsx", totalRows: 15, successCount: 15, failedCount: 0, skippedCount: 0, importTime: new Date("2024-02-15"), status: "success" },
    { id: "3", fileName: "批量更新_202403.xlsx", totalRows: 30, successCount: 0, failedCount: 30, skippedCount: 0, importTime: new Date("2024-03-01"), status: "failed" },
  ]);

  const previewStats = {
    total: previewData.length,
    valid: previewData.filter(r => r.status === "valid").length,
    warning: previewData.filter(r => r.status === "warning").length,
    error: previewData.filter(r => r.status === "error").length,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
        toast({ title: "文件格式错误", description: "请上传Excel或CSV文件", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        setStep("mapping");
        toast({ title: "文件上传成功", description: `已解析 ${file.name}` });
      }, 1500);
    }
  };

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setMappings(mappings.map(m => m.sourceField === sourceField ? { ...m, targetField } : m));
  };

  const handleStartImport = () => {
    setImportProgress(0);
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep("result");
          toast({ title: "导入完成", description: `成功导入 ${previewStats.valid} 条记录` });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid": return <Badge className="bg-green-500">有效</Badge>;
      case "warning": return <Badge className="bg-yellow-500">警告</Badge>;
      case "error": return <Badge variant="destructive">错误</Badge>;
      case "success": return <Badge className="bg-green-500">成功</Badge>;
      case "partial": return <Badge className="bg-yellow-500">部分成功</Badge>;
      case "failed": return <Badge variant="destructive">失败</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const targetFields = [
    { value: "name", label: "姓名" },
    { value: "employeeId", label: "工号" },
    { value: "department", label: "部门" },
    { value: "position", label: "职位" },
    { value: "hireDate", label: "入职日期" },
    { value: "phone", label: "手机号" },
    { value: "email", label: "邮箱" },
    { value: "skip", label: "跳过" },
  ];

  return (
      <div className="space-y-6">
        <PageHeader
          icon={FileSpreadsheet}
          title="工人数据导入"
          description="从Excel文件批量导入工人信息"
          actions={<Button variant="outline" onClick={() => toast({ title: "正在下载模板..." })}><Download className="w-4 h-4 mr-1" />下载模板</Button>}
        />

        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-primary" : "text-muted-foreground"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>1</div><span className="text-sm font-medium">上传文件</span></div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === "mapping" ? "text-primary" : "text-muted-foreground"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "mapping" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>2</div><span className="text-sm font-medium">字段映射</span></div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === "preview" ? "text-primary" : "text-muted-foreground"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "preview" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>3</div><span className="text-sm font-medium">数据预览</span></div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === "result" ? "text-primary" : "text-muted-foreground"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "result" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>4</div><span className="text-sm font-medium">导入结果</span></div>
        </div>

        {step === "upload" && (
          <Card className="bg-card/50 border-border">
            <CardHeader><CardTitle>上传Excel文件</CardTitle></CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
                {isUploading ? (
                  <div className="space-y-4"><RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin" /><p className="text-muted-foreground">正在解析文件...</p></div>
                ) : (
                  <div className="space-y-4"><Upload className="w-12 h-12 mx-auto text-muted-foreground" /><p className="text-lg font-medium">点击或拖拽文件到此处</p><p className="text-sm text-muted-foreground">支持 .xlsx, .xls, .csv 格式</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === "mapping" && (
          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>字段映射配置</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={() => setStep("upload")}>上一步</Button><Button onClick={() => setStep("preview")}>下一步</Button></div></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>源字段 (Excel)</TableHead><TableHead>目标字段 (系统)</TableHead><TableHead>必填</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.sourceField}>
                      <TableCell className="font-medium">{mapping.sourceField}</TableCell>
                      <TableCell><Select value={mapping.targetField} onValueChange={(v) => handleMappingChange(mapping.sourceField, v)}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{targetFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></TableCell>
                      <TableCell>{mapping.required ? <Badge variant="destructive">必填</Badge> : <Badge variant="outline">可选</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={FileSpreadsheet} label="总记录数" value={previewStats.total} />
              <StatCard icon={CheckCircle2} label="有效" value={previewStats.valid} iconColor="text-green-500" iconBg="bg-green-500/10" />
              <StatCard icon={AlertTriangle} label="警告" value={previewStats.warning} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
              <StatCard icon={XCircle} label="错误" value={previewStats.error} iconColor="text-red-500" iconBg="bg-red-500/10" />
            </div>
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>数据预览</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={() => setStep("mapping")}>上一步</Button><Button onClick={handleStartImport} disabled={previewStats.error > 0}>开始导入</Button></div></CardHeader>
              <CardContent>
                {importProgress > 0 && importProgress < 100 && <div className="mb-4"><Progress value={importProgress} className="h-2" /><p className="text-sm text-muted-foreground mt-1">正在导入... {importProgress}%</p></div>}
                <Table>
                  <TableHeader><TableRow><TableHead>行号</TableHead><TableHead>姓名</TableHead><TableHead>工号</TableHead><TableHead>部门</TableHead><TableHead>职位</TableHead><TableHead>状态</TableHead><TableHead>错误信息</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.rowNum} className={row.status === "error" ? "bg-red-500/5" : row.status === "warning" ? "bg-yellow-500/5" : ""}>
                        <TableCell>{row.rowNum}</TableCell>
                        <TableCell className="font-medium">{row.data["姓名"] || "-"}</TableCell>
                        <TableCell>{row.data?.["工号"] || "-"}</TableCell>
                        <TableCell>{row.data?.["部门"] || "-"}</TableCell>
                        <TableCell>{row.data["职位"] || "-"}</TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        <TableCell className="text-xs text-destructive">{row.errors.join(", ") || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">导入完成</h2>
                <p className="text-muted-foreground mb-4">成功导入 {previewStats.valid} 条记录，{previewStats.warning} 条警告，{previewStats.error} 条失败</p>
                <div className="flex justify-center gap-4"><Button variant="outline" onClick={() => { setStep("upload"); setSelectedFile(null); }}>继续导入</Button><Button onClick={() => toast({ title: "跳转到工人管理..." })}>查看工人列表</Button></div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardHeader><CardTitle>导入历史</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>文件名</TableHead><TableHead>总记录</TableHead><TableHead>成功</TableHead><TableHead>失败</TableHead><TableHead>导入时间</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {importHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.fileName}</TableCell>
                        <TableCell>{record.totalRows}</TableCell>
                        <TableCell className="text-green-500">{record.successCount}</TableCell>
                        <TableCell className="text-red-500">{record.failedCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{record.importTime.toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}
