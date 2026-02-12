/**
 * 导入数据预览对话框
 * 支持CSV/Excel文件上传、数据预览、字段映射、验证和导入
 */

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Eye,
  FileCheck,
  Table,
  Sparkles,
  Loader2,
} from "lucide-react";

// 系统字段定义
const SYSTEM_FIELDS = [
  { key: "customerName", label: "客户名称", required: true },
  { key: "companyName", label: "公司名称", required: false },
  { key: "contactPhone", label: "联系电话", required: false },
  { key: "contactEmail", label: "联系邮箱", required: false },
  { key: "source", label: "来源渠道", required: false },
  { key: "originalContent", label: "原始内容", required: false },
  { key: "estimatedValue", label: "预估金额", required: false },
  { key: "priority", label: "优先级", required: false },
  { key: "status", label: "状态", required: false },
  { key: "productInterest", label: "感兴趣产品", required: false },
  { key: "tags", label: "标签", required: false },
];

// 导入模板
const TEMPLATE_HEADERS = [
  "客户名称",
  "公司名称",
  "联系电话",
  "联系邮箱",
  "来源渠道",
  "原始内容",
  "预估金额",
  "优先级",
  "状态",
  "感兴趣产品",
  "标签",
];

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

interface PreviewRow {
  [key: string]: string;
}

interface FieldMapping {
  [sourceField: string]: string; // sourceField -> systemField
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export default function ImportPreviewDialog({
  open,
  onOpenChange,
  onImportSuccess,
}: ImportPreviewDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendedMappings, setRecommendedMappings] = useState<{
    sourceField: string;
    targetField: string;
    confidence: number;
    matchType: string;
  }[]>([]);
  
  // 导入mutation
  const importMutation = (trpc.leadImport as any).import.useMutation({
    onSuccess: (result: any) => {
      setImportResult({
        success: result.success,
        failed: result.failed,
        errors: result.errors || [],
      });
      setStep("done");
      if (result.success > 0) {
        toast.success(`成功导入 ${result.success} 条商机`);
        onImportSuccess?.();
      }
    },
    onError: (error: any) => {
      toast.error(`导入失败: ${error.message}`);
      setStep("preview");
    },
  });
  
  // 下载模板
  const downloadTemplate = () => {
    const csvContent = TEMPLATE_HEADERS.join(",") + "\n" +
      "张经理,ABC科技有限公司,13800138000,zhang@abc.com,官网表单,对清洗设备感兴趣,500000,high,new,超声波清洗机,工业客户";
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "商机导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // 解析CSV文件
  const parseCSV = (text: string): { headers: string[]; rows: PreviewRow[] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows: PreviewRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: PreviewRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }
    
    return { headers, rows };
  };
  
  // 自动映射字段
  const autoMapFields = (fileHeaders: string[]): FieldMapping => {
    const mapping: FieldMapping = {};
    const headerMap: Record<string, string> = {
      "客户名称": "customerName",
      "公司名称": "companyName",
      "联系电话": "contactPhone",
      "联系邮箱": "contactEmail",
      "来源渠道": "source",
      "原始内容": "originalContent",
      "预估金额": "estimatedValue",
      "优先级": "priority",
      "状态": "status",
      "感兴趣产品": "productInterest",
      "标签": "tags",
    };
    
    fileHeaders.forEach(header => {
      if (headerMap[header]) {
        mapping[header] = headerMap[header];
      }
    });
    
    return mapping;
  };
  
  // 验证数据
  const validateData = (rows: PreviewRow[], mapping: FieldMapping): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    rows.forEach((row, index) => {
      // 检查必填字段
      const requiredFields = SYSTEM_FIELDS.filter(f => f.required);
      requiredFields.forEach(field => {
        const sourceField = Object.keys(mapping).find(k => mapping[k] === field.key);
        if (!sourceField || !row[sourceField]?.trim()) {
          errors.push({
            row: index + 1,
            field: field.label,
            message: `${field.label}不能为空`,
          });
        }
      });
      
      // 验证邮箱格式
      const emailField = Object.keys(mapping).find(k => mapping[k] === "contactEmail");
      if (emailField && row[emailField]) {
        const email = row[emailField].trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({
            row: index + 1,
            field: "联系邮箱",
            message: "邮箱格式无效",
          });
        }
      }
      
      // 验证金额格式
      const valueField = Object.keys(mapping).find(k => mapping[k] === "estimatedValue");
      if (valueField && row[valueField]) {
        const value = row[valueField].trim();
        if (value && isNaN(Number(value))) {
          errors.push({
            row: index + 1,
            field: "预估金额",
            message: "金额必须是数字",
          });
        }
      }
    });
    
    return errors;
  };
  
  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    try {
      const text = await selectedFile.text();
      const { headers: fileHeaders, rows } = parseCSV(text);
      
      if (fileHeaders.length === 0) {
        toast.error("文件格式错误或为空");
        return;
      }
      
      setHeaders(fileHeaders);
      setPreviewData(rows.slice(0, 100)); // 最多预览100行
      
      // 自动映射字段
      const mapping = autoMapFields(fileHeaders);
      setFieldMapping(mapping);
      
      // 验证数据
      const errors = validateData(rows, mapping);
      setValidationErrors(errors);
      
      setStep("preview");
    } catch (error) {
      toast.error("文件解析失败");
    }
  };
  
  // 更新字段映射
  const handleMappingChange = (sourceField: string, targetField: string) => {
    const newMapping = { ...fieldMapping };
    if (targetField === "_ignore") {
      delete newMapping[sourceField];
    } else {
      newMapping[sourceField] = targetField;
    }
    setFieldMapping(newMapping);
    
    // 重新验证
    const errors = validateData(previewData, newMapping);
    setValidationErrors(errors);
  };
  
  // 执行导入
  const handleImport = async () => {
    if (!file) return;
    
    setStep("importing");
    setImportProgress(0);
    
    try {
      const text = await file.text();
      const { rows } = parseCSV(text);
      
      // 转换数据格式
      const leads = rows.map(row => {
        const lead: Record<string, any> = {};
        Object.entries(fieldMapping).forEach(([source, target]) => {
          let value: any = row[source]?.trim();
          if (target === "estimatedValue" && value) {
            value = Number(value);
          }
          if (target === "productInterest" || target === "tags") {
            value = value ? value.split(/[,，]/).map((s: string) => s.trim()) : [];
          }
          lead[target] = value;
        });
        return lead;
      });
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // 将文件内容转为base64
      const fileContent = btoa(text);
      const fileType = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';
      await importMutation.mutateAsync({ 
        fileContent, 
        fileType: fileType as 'xlsx' | 'csv',
        fileName: file.name 
      });
      
      clearInterval(progressInterval);
      setImportProgress(100);
    } catch (error) {
      setStep("preview");
    }
  };
  
  // 智能推荐字段映射
  const handleSmartRecommend = async () => {
    if (headers.length === 0) return;
    
    setIsRecommending(true);
    try {
      // 调用智能推荐API
      const result = await fetch("/api/trpc/fieldMappingRecommend.batchRecommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sourceFields: headers,
          targetFields: SYSTEM_FIELDS.map(f => f.key),
          importType: "lead",
        }),
      });
      
      if (result.ok) {
        const data = await result.json();
        const recommendations = data.result?.data?.recommendations || [];
        setRecommendedMappings(recommendations);
        
        if (recommendations.length > 0) {
          toast.success(`发现 ${recommendations.length} 个推荐映射`);
        } else {
          toast.info("未找到匹配的字段映射");
        }
      } else {
        // 回退到本地推荐
        const localRecommendations = getLocalRecommendations(headers);
        setRecommendedMappings(localRecommendations);
        if (localRecommendations.length > 0) {
          toast.success(`发现 ${localRecommendations.length} 个推荐映射`);
        }
      }
    } catch (error) {
      // 回退到本地推荐
      const localRecommendations = getLocalRecommendations(headers);
      setRecommendedMappings(localRecommendations);
      if (localRecommendations.length > 0) {
        toast.success(`发现 ${localRecommendations.length} 个推荐映射`);
      }
    } finally {
      setIsRecommending(false);
    }
  };
  
  // 本地推荐逻辑（回退方案）
  const getLocalRecommendations = (sourceFields: string[]) => {
    const recommendations: typeof recommendedMappings = [];
    const aliasMap: Record<string, { target: string; confidence: number }[]> = {
      "客户名称": [{ target: "customerName", confidence: 1.0 }],
      "客户姓名": [{ target: "customerName", confidence: 0.9 }],
      "姓名": [{ target: "customerName", confidence: 0.8 }],
      "name": [{ target: "customerName", confidence: 0.7 }],
      "公司名称": [{ target: "companyName", confidence: 1.0 }],
      "公司": [{ target: "companyName", confidence: 0.9 }],
      "企业名称": [{ target: "companyName", confidence: 0.9 }],
      "company": [{ target: "companyName", confidence: 0.8 }],
      "联系电话": [{ target: "contactPhone", confidence: 1.0 }],
      "电话": [{ target: "contactPhone", confidence: 0.9 }],
      "手机": [{ target: "contactPhone", confidence: 0.9 }],
      "phone": [{ target: "contactPhone", confidence: 0.8 }],
      "tel": [{ target: "contactPhone", confidence: 0.7 }],
      "联系邮箱": [{ target: "contactEmail", confidence: 1.0 }],
      "邮箱": [{ target: "contactEmail", confidence: 0.9 }],
      "email": [{ target: "contactEmail", confidence: 0.9 }],
      "来源渠道": [{ target: "source", confidence: 1.0 }],
      "来源": [{ target: "source", confidence: 0.9 }],
      "渠道": [{ target: "source", confidence: 0.8 }],
      "source": [{ target: "source", confidence: 0.8 }],
      "原始内容": [{ target: "originalContent", confidence: 1.0 }],
      "内容": [{ target: "originalContent", confidence: 0.7 }],
      "备注": [{ target: "originalContent", confidence: 0.6 }],
      "预估金额": [{ target: "estimatedValue", confidence: 1.0 }],
      "金额": [{ target: "estimatedValue", confidence: 0.8 }],
      "预算": [{ target: "estimatedValue", confidence: 0.7 }],
      "amount": [{ target: "estimatedValue", confidence: 0.7 }],
      "优先级": [{ target: "priority", confidence: 1.0 }],
      "priority": [{ target: "priority", confidence: 0.9 }],
      "状态": [{ target: "status", confidence: 1.0 }],
      "status": [{ target: "status", confidence: 0.9 }],
      "感兴趣产品": [{ target: "productInterest", confidence: 1.0 }],
      "产品": [{ target: "productInterest", confidence: 0.7 }],
      "标签": [{ target: "tags", confidence: 1.0 }],
      "tags": [{ target: "tags", confidence: 0.9 }],
    };
    
    sourceFields.forEach(field => {
      const lowerField = field.toLowerCase().trim();
      const matches = aliasMap[field] || aliasMap[lowerField];
      if (matches && matches.length > 0) {
        const best = matches[0];
        recommendations.push({
          sourceField: field,
          targetField: best.target,
          confidence: best.confidence,
          matchType: "alias",
        });
      }
    });
    
    return recommendations;
  };
  
  // 应用推荐映射
  const applyRecommendations = (level: "all" | "high" | "medium") => {
    const threshold = level === "high" ? 0.8 : level === "medium" ? 0.5 : 0;
    const toApply = recommendedMappings.filter(r => r.confidence >= threshold);
    
    if (toApply.length === 0) {
      toast.info("没有符合条件的推荐映射");
      return;
    }
    
    const newMapping = { ...fieldMapping };
    toApply.forEach(rec => {
      newMapping[rec.sourceField] = rec.targetField;
    });
    setFieldMapping(newMapping);
    
    // 重新验证
    const errors = validateData(previewData, newMapping);
    setValidationErrors(errors);
    
    toast.success(`已应用 ${toApply.length} 个字段映射`);
    setRecommendedMappings([]);
  };
  
  // 重置状态
  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setFieldMapping({});
    setValidationErrors([]);
    setImportProgress(0);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // 关闭对话框
  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            导入商机数据
            {step === "done" && importResult && (
              <Badge className={importResult.failed > 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
                完成
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "支持 CSV 和 Excel 格式，请先下载模板填写数据"}
            {step === "preview" && "请确认字段映射和数据预览，确认无误后点击确认导入"}
            {step === "importing" && "正在导入数据，请稍候..."}
            {step === "done" && "导入完成，请查看结果"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* 上传步骤 */}
          {step === "upload" && (
            <div className="space-y-4 py-4">
              {/* 下载模板 */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">商机导入模板.csv</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" />
                  下载模板
                </Button>
              </div>

              {/* 文件上传区域 */}
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">点击或拖拽文件到此处</p>
                <p className="text-sm text-muted-foreground">支持 CSV、Excel 格式</p>
              </div>
            </div>
          )}

          {/* 预览步骤 */}
          {step === "preview" && (
            <div className="space-y-4 py-4">
              {/* 文件信息 */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">{file?.name}</span>
                  <Badge variant="outline">{previewData.length} 行数据</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  重新选择
                </Button>
              </div>

              {/* 字段映射 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    字段映射
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSmartRecommend}
                    disabled={isRecommending}
                    className="gap-1"
                  >
                    {isRecommending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    智能推荐
                  </Button>
                </div>
                
                {/* 推荐结果提示 */}
                {recommendedMappings.length > 0 && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        发现 {recommendedMappings.length} 个推荐映射
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyRecommendations("high")}
                          className="text-xs h-6"
                        >
                          应用高置信度
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => applyRecommendations("all")}
                          className="text-xs h-6"
                        >
                          全部应用
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {recommendedMappings.map((rec, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`text-xs ${
                            rec.confidence >= 0.8
                              ? "border-green-500 text-green-600"
                              : rec.confidence >= 0.5
                              ? "border-yellow-500 text-yellow-600"
                              : "border-gray-400 text-gray-500"
                          }`}
                        >
                          {rec.sourceField} → {SYSTEM_FIELDS.find(f => f.key === rec.targetField)?.label}
                          <span className="ml-1 opacity-70">
                            ({Math.round(rec.confidence * 100)}%)
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {headers.map((header) => (
                    <div key={header} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                      <span className="text-xs text-muted-foreground truncate flex-1">{header}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Select
                        value={fieldMapping[header] || "_ignore"}
                        onValueChange={(v) => handleMappingChange(header, v)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_ignore">忽略</SelectItem>
                          {SYSTEM_FIELDS.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                              {field.required && " *"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 验证错误 */}
              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    发现 {validationErrors.length} 个问题
                  </h4>
                  <div className="max-h-32 overflow-auto space-y-1">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <p key={index} className="text-xs text-red-400">
                        第 {error.row} 行: {error.message}
                      </p>
                    ))}
                    {validationErrors.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        还有 {validationErrors.length - 10} 个问题...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 数据预览 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  数据预览 (前10行)
                </h4>
                <div className="border rounded-lg overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-medium">#</th>
                        {headers.map((header) => (
                          <th key={header} className="p-2 text-left font-medium whitespace-nowrap">
                            {header}
                            {fieldMapping[header] && (
                              <Badge variant="outline" className="ml-1 text-[10px]">
                                {SYSTEM_FIELDS.find(f => f.key === fieldMapping[header])?.label}
                              </Badge>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t hover:bg-muted/30">
                          <td className="p-2 text-muted-foreground">{index + 1}</td>
                          {headers.map((header) => (
                            <td key={header} className="p-2 max-w-32 truncate">
                              {row[header] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 导入中 */}
          {step === "importing" && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="text-lg font-medium">正在导入数据...</p>
              <Progress value={importProgress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">{importProgress}%</p>
            </div>
          )}

          {/* 导入完成 */}
          {step === "done" && importResult && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                ) : (
                  <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                )}
                <h3 className="text-xl font-bold mb-2">导入完成</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-green-500">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">成功导入</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-red-500">{importResult.failed}</p>
                  <p className="text-sm text-muted-foreground">导入失败</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-red-400 mb-2">错误详情</h4>
                  <div className="max-h-32 overflow-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-400">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                重新选择
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationErrors.length > 0 || Object.keys(fieldMapping).length === 0}
              >
                <Upload className="w-4 h-4 mr-2" />
                确认导入 ({previewData.length} 条)
              </Button>
            </>
          )}
          
          {step === "done" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                继续导入
              </Button>
              <Button onClick={handleClose}>
                完成
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
