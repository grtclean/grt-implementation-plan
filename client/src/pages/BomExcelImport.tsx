/**
 * v1.7.2 BOM Excel导入面板
 * BOM Excel Import Dashboard
 * 
 * 功能：
 * - Excel (.xlsx) 文件上传与解析
 * - 智能字段映射
 * - 数据预览与验证
 * - 导入进度展示
 * - 导入历史与模板下载
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FileSpreadsheet, Upload, Download, CheckCircle2, XCircle,
  AlertTriangle, FileText, Table2, ArrowRight, RefreshCw,
  Eye, Trash2, Clock, BarChart3
} from "lucide-react";
import { useState, useRef, useCallback } from "react";

// 标准BOM字段
const STANDARD_FIELDS = [
  { key: "materialCode", label: "物料编码", required: true },
  { key: "materialName", label: "物料名称", required: true },
  { key: "specification", label: "规格型号", required: false },
  { key: "unit", label: "单位", required: true },
  { key: "quantity", label: "数量", required: true },
  { key: "processCode", label: "工序编码", required: true },
  { key: "supplier", label: "供应商", required: false },
  { key: "remark", label: "备注", required: false },
];

interface PreviewRow {
  [key: string]: string | number;
}

interface ValidationResult {
  valid: boolean;
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
}

export default function BomExcelImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload");
  const [importProgress, setImportProgress] = useState(0);
  const [projectId, setProjectId] = useState("");

  // 获取导入历史
  const historyQuery = (trpc.bomExcelImport as any).getImportHistory.useQuery(
    { limit: 10 },
    { enabled: true }
  );

  // 获取支持的格式
  const formatsQuery = (trpc.bomExcelImport as any).getSupportedFormats.useQuery();

  // 解析Excel
  const parseMutation = (trpc.bomExcelImport as any).parseExcel.useMutation({
    onSuccess: (data: any) => {
      setExcelHeaders(data.headers);
      setPreviewData(data.previewRows);
      // 自动映射
      if (data.suggestedMapping) {
        setFieldMapping(data.suggestedMapping);
      }
      setImportStep("mapping");
      toast({
        title: "解析成功",
        description: `检测到 ${data.totalRows} 行数据，${data.headers.length} 列`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "解析失败",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 验证数据
  const validateMutation = (trpc.bomExcelImport as any).validateData.useMutation({
    onSuccess: (data: any) => {
      setValidationResult(data);
      if (data.valid) {
        setImportStep("preview");
        toast({ title: "验证通过", description: "所有数据验证通过，可以开始导入" });
      } else {
        toast({
          title: "验证发现问题",
          description: `${data.errors.length} 个错误，${data.warnings.length} 个警告`,
          variant: "destructive",
        });
      }
    },
  });

  // 执行导入
  const importMutation = (trpc.bomExcelImport as any).importExcel.useMutation({
    onSuccess: (data: any) => {
      setImportStep("done");
      setImportProgress(100);
      toast({
        title: "导入完成",
        description: `成功导入 ${data.importedCount} 条BOM记录`,
      });
      historyQuery.refetch();
    },
    onError: (err: any) => {
      toast({
        title: "导入失败",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 下载模板
  const downloadTemplateMutation = (trpc.bomExcelImport as any).downloadTemplate.useMutation({
    onSuccess: (data: any) => {
      toast({
        title: "模板已生成",
        description: "Excel模板已准备好下载",
      });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast({
        title: "不支持的文件格式",
        description: `请上传 ${validExtensions.join(", ")} 格式的文件`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "文件大小不能超过10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    // 读取文件并发送到后端解析
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(",")[1];
      parseMutation.mutate({
        fileName: file.name,
        fileContent: base64,
        fileType: ext.replace(".", "") as "xlsx" | "xls" | "csv",
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleValidate = () => {
    if (!projectId.trim()) {
      toast({
        title: "请输入项目编号",
        description: "项目编号用于关联BOM校验记录",
        variant: "destructive",
      });
      return;
    }
    validateMutation.mutate({
      fieldMapping,
      projectId,
    });
  };

  const handleImport = () => {
    setImportStep("importing");
    setImportProgress(0);
    
    // 模拟进度
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    importMutation.mutate({
      fieldMapping,
      projectId,
      fileName: selectedFile?.name || "unknown.xlsx",
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setExcelHeaders([]);
    setFieldMapping({});
    setValidationResult(null);
    setImportStep("upload");
    setImportProgress(0);
    setProjectId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getStepStatus = (step: string) => {
    const steps = ["upload", "mapping", "preview", "importing", "done"];
    const currentIdx = steps.indexOf(importStep);
    const stepIdx = steps.indexOf(step);
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "current";
    return "pending";
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={FileSpreadsheet}
        title="BOM Excel导入"
        description="支持 .xlsx / .xls / .csv 格式的BOM清单批量导入"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplateMutation.mutate({ format: "xlsx" })}
              disabled={downloadTemplateMutation.isPending}
            >
              <Download className="w-4 h-4 mr-1" />
              下载模板
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </>
        }
      />

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2">
        {[
          { key: "upload", label: "上传文件", icon: Upload },
          { key: "mapping", label: "字段映射", icon: ArrowRight },
          { key: "preview", label: "预览验证", icon: Eye },
          { key: "importing", label: "执行导入", icon: RefreshCw },
          { key: "done", label: "完成", icon: CheckCircle2 },
        ].map((step, i) => {
          const status = getStepStatus(step.key);
          return (
            <div key={step.key} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`w-8 h-0.5 ${status !== "pending" ? "bg-primary" : "bg-border"}`} />
              )}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                status === "completed" ? "bg-primary/10 text-primary" :
                status === "current" ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <step.icon className="w-3.5 h-3.5" />
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主内容区 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 上传区域 */}
          {importStep === "upload" && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">上传BOM文件</CardTitle>
                <CardDescription>
                  支持 Excel (.xlsx, .xls) 和 CSV 格式，文件大小不超过10MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">点击或拖拽文件到此处</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    支持 .xlsx, .xls, .csv 格式
                  </p>
                  <Button variant="outline">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    选择文件
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* 项目编号输入 */}
                <div className="mt-4">
                  <label className="text-sm font-medium mb-1 block">项目编号 *</label>
                  <Input
                    placeholder="输入关联的项目编号，如 PRJ-2026-001"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 字段映射 */}
          {importStep === "mapping" && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-primary" />
                  字段映射
                </CardTitle>
                <CardDescription>
                  将Excel列映射到标准BOM字段（已自动识别 {Object.keys(fieldMapping).length} 个字段）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {STANDARD_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-40 flex items-center gap-1">
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.required && <span className="text-red-400 text-xs">*</span>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={fieldMapping[field.key] || "unmapped"}
                        onValueChange={(val) => {
                          setFieldMapping(prev => ({
                            ...prev,
                            [field.key]: val === "unmapped" ? "" : val,
                          }));
                        }}
                      >
                        <SelectTrigger className="w-60">
                          <SelectValue placeholder="选择Excel列" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">-- 未映射 --</SelectItem>
                          {excelHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldMapping[field.key] ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : field.required ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setImportStep("upload")}>
                    返回
                  </Button>
                  <Button onClick={handleValidate} disabled={validateMutation.isPending}>
                    {validateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-1" />
                    )}
                    验证数据
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 数据预览 */}
          {(importStep === "preview" || importStep === "mapping") && previewData.length > 0 && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Table2 className="w-5 h-5 text-primary" />
                  数据预览
                </CardTitle>
                <CardDescription>前10行数据预览</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground font-mono text-xs">#</th>
                        {excelHeaders.slice(0, 8).map((h) => (
                          <th key={h} className="text-left p-2 text-muted-foreground font-mono text-xs">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-2 text-muted-foreground font-mono text-xs">{i + 1}</td>
                          {excelHeaders.slice(0, 8).map((h) => (
                            <td key={h} className="p-2 truncate max-w-[150px]">
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importStep === "preview" && (
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={() => setImportStep("mapping")}>
                      返回映射
                    </Button>
                    <Button onClick={handleImport} disabled={importMutation.isPending}>
                      <Upload className="w-4 h-4 mr-1" />
                      确认导入
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 导入进度 */}
          {importStep === "importing" && (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                <p className="text-lg font-medium mb-2">正在导入...</p>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{Math.round(importProgress)}%</p>
              </CardContent>
            </Card>
          )}

          {/* 导入完成 */}
          {importStep === "done" && (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-4" />
                <p className="text-lg font-medium mb-2">导入完成</p>
                <p className="text-sm text-muted-foreground mb-4">
                  BOM清单已成功导入，可在BOM校验管理中查看
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    继续导入
                  </Button>
                  <Button onClick={() => window.location.href = "/bom-verification"}>
                    查看BOM校验
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 验证结果 */}
          {validationResult && !validationResult.valid && (
            <Card className="bg-card/50 border-border border-red-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  验证问题
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationResult.errors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-red-400 mb-2">
                      错误 ({validationResult.errors.length})
                    </p>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {validationResult.errors.map((err, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 bg-red-500/5 rounded">
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <span>第 {err.row} 行 [{err.field}]: {err.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {validationResult.warnings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-400 mb-2">
                      警告 ({validationResult.warnings.length})
                    </p>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {validationResult.warnings.map((warn, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 bg-yellow-500/5 rounded">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                          <span>第 {warn.row} 行 [{warn.field}]: {warn.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="space-y-4">
          {/* 支持的格式 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                支持的格式
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(formatsQuery.data?.formats || [
                { ext: ".xlsx", name: "Excel 2007+", maxSize: "10MB" },
                { ext: ".xls", name: "Excel 97-2003", maxSize: "10MB" },
                { ext: ".csv", name: "CSV文本", maxSize: "10MB" },
              ]).map((fmt: any) => (
                <div key={fmt.ext} className="flex items-center justify-between p-2 bg-background/50 rounded">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{fmt.ext}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{fmt.maxSize || "10MB"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 导入历史 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                最近导入记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {historyQuery.data?.records?.length ? (
                historyQuery.data.records.map((record: any) => (
                  <div key={record.id} className="p-2 bg-background/50 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{record.fileName}</span>
                      <Badge variant={record.status === "completed" ? "default" : "destructive"} className="text-[10px]">
                        {record.status === "completed" ? "成功" : "失败"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{record.importedCount || 0} 条</span>
                      <span>·</span>
                      <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">暂无导入记录</p>
              )}
            </CardContent>
          </Card>

          {/* 导入提示 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                导入须知
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>1. 首行必须为列标题（表头）</p>
              <p>2. 物料编码、名称、单位、数量、工序编码为必填字段</p>
              <p>3. 物料编码格式：字母+数字，如 MAT-001</p>
              <p>4. 工序编码格式：T1-T15</p>
              <p>5. 重复的物料编码将自动合并数量</p>
              <p>6. 导入后可在BOM校验管理中查看和编辑</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
