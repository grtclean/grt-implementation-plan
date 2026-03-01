/**
 * GRT-Atom 智能体单体批量导入组件
 * 支持Excel/CSV文件上传和批量导入
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// 导入模板字段
const TEMPLATE_FIELDS = [
  { field: "serial_number", label: "SN码", required: true, description: "智能体单体唯一标识，至少8个字符" },
  { field: "equipment_model", label: "设备型号", required: false, description: "如UC3000、GRT-500等" },
  { field: "batch_number", label: "批次号", required: false, description: "生产批次号" },
  { field: "project_id", label: "项目ID", required: false, description: "关联的项目ID" },
  { field: "notes", label: "备注", required: false, description: "其他备注信息" },
];

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{
    row: number;
    serialNumber: string;
    error: string;
    errorType: string;
  }>;
  importedUnits: Array<{
    id: number;
    serialNumber: string;
    status: string;
  }>;
}

export default function AgentUnitBatchImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = trpc.capabilityOs.batchImportAgentUnits.useMutation();
  const historyQuery = trpc.capabilityOs.getAgentUnitImportHistory.useQuery();

  // 解析CSV文件
  const parseCSV = (text: string): string[][] => {
    const lines = text.split("\n");
    return lines.map(line => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    }).filter(row => row.some(cell => cell !== ""));
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      setPreviewData(data.slice(0, 11)); // 预览前10行数据
    } catch (error) {
      toast.error("文件解析失败，请确保文件格式正确");
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      toast.error("请先选择文件");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const text = await file.text();
    const data = parseCSV(text);

    // 模拟进度
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await importMutation.mutateAsync({ data });

      setImportProgress(100);
      // Router currently returns stub response; cast through unknown for future-proofing
      const typedResult = result as unknown as ImportResult;
      setImportResult(typedResult);

      if (typedResult.success) {
        toast.success(`成功导入 ${typedResult.successCount ?? 0} 个智能体单体`);
      } else {
        toast.warning(`导入完成，成功 ${typedResult.successCount ?? 0} 个，失败 ${typedResult.failedCount ?? 0} 个`);
      }
    } catch (error: any) {
      toast.error(error.message || "导入失败");
    } finally {
      clearInterval(progressInterval);
      setIsImporting(false);
    }
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    const headers = TEMPLATE_FIELDS.map(f => f.label);
    const example1 = ["GRT-2026-001", "UC3000", "B2026-01", "", "示例数据1"];
    const example2 = ["GRT-2026-002", "GRT-500", "B2026-01", "", "示例数据2"];
    
    const csvContent = [headers, example1, example2]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "智能体单体导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("模板下载成功");
  };

  // 重置
  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* 主操作按钮 */}
      <div className="flex gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              批量导入
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                批量导入智能体单体
              </DialogTitle>
              <DialogDescription>
                上传Excel或CSV文件，批量录入SN码和初始数据
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 模板下载 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">第一步：下载模板</CardTitle>
                  <CardDescription>使用标准模板格式填写数据</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">模板包含以下字段：</p>
                      <div className="flex flex-wrap gap-2">
                        {TEMPLATE_FIELDS.map(field => (
                          <Badge key={field.field} variant={field.required ? "default" : "secondary"}>
                            {field.label}{field.required && " *"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                      <Download className="w-4 h-4" />
                      下载模板
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 文件上传 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">第二步：上传文件</CardTitle>
                  <CardDescription>支持CSV格式文件</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      选择文件
                    </Button>
                    {file && (
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="outline">{previewData.length - 1} 行数据</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 数据预览 */}
              {previewData.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">第三步：预览数据</CardTitle>
                    <CardDescription>确认数据格式正确后执行导入</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            {previewData[0]?.map((header, i) => (
                              <TableHead key={i}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(1).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell className="text-muted-foreground">{rowIndex + 1}</TableCell>
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>{cell || "-"}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {previewData.length > 11 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        仅显示前10行数据，共 {previewData.length - 1} 行
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 导入进度 */}
              {isImporting && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>导入中...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 导入结果 */}
              {importResult && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {importResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                      导入结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <p className="text-2xl font-bold">{importResult.totalRows}</p>
                        <p className="text-sm text-muted-foreground">总行数</p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-md">
                        <p className="text-2xl font-bold text-green-500">{importResult.successCount}</p>
                        <p className="text-sm text-muted-foreground">成功</p>
                      </div>
                      <div className="text-center p-3 bg-red-500/10 rounded-md">
                        <p className="text-2xl font-bold text-red-500">{importResult.failedCount}</p>
                        <p className="text-sm text-muted-foreground">失败</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-500/10 rounded-md">
                        <p className="text-2xl font-bold text-yellow-500">{importResult.skippedCount}</p>
                        <p className="text-sm text-muted-foreground">跳过</p>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>导入错误</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            {importResult.errors.slice(0, 5).map((error, i) => (
                              <li key={i} className="text-sm">
                                第{error.row}行 [{error.serialNumber}]: {error.error}
                              </li>
                            ))}
                            {importResult.errors.length > 5 && (
                              <li className="text-sm">...还有 {importResult.errors.length - 5} 个错误</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  重置
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || isImporting || previewData.length === 0}
                  className="gap-2"
                >
                  {isImporting ? "导入中..." : "执行导入"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 导入历史 */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <History className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>导入历史</DialogTitle>
              <DialogDescription>查看最近的批量导入记录</DialogDescription>
            </DialogHeader>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>总数</TableHead>
                    <TableHead>成功</TableHead>
                    <TableHead>失败</TableHead>
                    <TableHead>跳过</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{record.totalRows}</TableCell>
                      <TableCell className="text-green-500">{record.successCount}</TableCell>
                      <TableCell className="text-red-500">{record.failedCount}</TableCell>
                      <TableCell className="text-yellow-500">{record.skippedCount}</TableCell>
                    </TableRow>
                  ))}
                  {(!historyQuery.data || historyQuery.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        暂无导入记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
