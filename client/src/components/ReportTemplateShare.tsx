/**
 * 报表模板分享组件
 * 支持导出/导入模板配置，方便团队共享
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Share2,
  Download,
  Upload,
  Copy,
  Check,
  Globe,
  Lock,
  FileJson,
  Link,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ReportTemplateShareProps {
  templateId?: number;
  onImportSuccess?: (templateId: number) => void;
}

export default function ReportTemplateShare({
  templateId,
  onImportSuccess,
}: ReportTemplateShareProps) {
  // toast from sonner is already imported
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [importRename, setImportRename] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);

  // 获取模板分享数据
  const { data: shareData, isLoading: isLoadingShare } =
    trpc.reportTemplate.getShareData.useQuery(
      { id: templateId! },
      { enabled: !!templateId && isExportDialogOpen }
    );

  // 获取公共模板库
  const { data: publicTemplates, refetch: refetchPublic } =
    (trpc.reportTemplate.getPublic as any).useQuery({});

  // 导出模板
  const { data: exportedTemplate } = (trpc.reportTemplate.export as any).useQuery(
    { id: templateId! },
    { enabled: !!templateId && isExportDialogOpen }
  );

  // 导入模板
  const importMutation = trpc.reportTemplate.import.useMutation({
    onSuccess: (result: any) => {
      if (result.success) {
        toast.success(`模板已成功导入，ID: ${result.templateId}`);
        setIsImportDialogOpen(false);
        setImportData("");
        setImportRename("");
        if (result.templateId && onImportSuccess) {
          onImportSuccess(result.templateId);
        }
      } else {
        toast.error(`导入失败: ${result.error}`);
      }
    },
  });

  // 从分享数据导入
  const importFromShareMutation = trpc.reportTemplate.importFromShare.useMutation({
    onSuccess: (result: any) => {
      if (result.success) {
        toast.success(`模板已成功导入，ID: ${result.templateId}`);
        setIsImportDialogOpen(false);
        setShareLink("");
        if (result.templateId && onImportSuccess) {
          onImportSuccess(result.templateId);
        }
      } else {
        toast.error(`导入失败: ${result.error}`);
      }
    },
  });

  // 发布模板
  const publishMutation = trpc.reportTemplate.publish.useMutation({
    onSuccess: () => {
      toast.success("模板已发布到公共库");
      refetchPublic();
    },
  });

  // 取消发布
  const unpublishMutation = trpc.reportTemplate.unpublish.useMutation({
    onSuccess: () => {
      toast.success("模板已从公共库移除");
      refetchPublic();
    },
  });

  // 验证导入数据
  const validateMutation = trpc.reportTemplate.validateImport.useQuery(
    { data: importData ? JSON.parse(importData) : null },
    {
      enabled: false,
    }
  );

  const handleCopyShareData = () => {
    if ((shareData as any)?.shareData) {
      navigator.clipboard.writeText((shareData as any).shareData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("分享数据已复制到剪贴板");
    }
  };

  const handleCopyJson = () => {
    if (exportedTemplate) {
      navigator.clipboard.writeText(JSON.stringify(exportedTemplate, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("JSON数据已复制到剪贴板");
    }
  };

  const handleDownloadJson = () => {
    if (exportedTemplate) {
      const blob = new Blob([JSON.stringify(exportedTemplate, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-${templateId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleValidateImport = () => {
    try {
      const data = JSON.parse(importData);
      // 简单验证
      const errors: string[] = [];
      if (!data.version) errors.push("缺少版本信息");
      if (!data.template) errors.push("缺少模板数据");
      if (data.template && !data.template.name) errors.push("缺少模板名称");
      if (data.template && !data.template.reportTypes)
        errors.push("缺少报表类型");

      setValidationResult({
        valid: errors.length === 0,
        errors,
      });
    } catch (e) {
      setValidationResult({
        valid: false,
        errors: ["JSON格式无效"],
      });
    }
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      importMutation.mutate({
        data,
        rename: importRename || undefined,
        makePublic,
      });
    } catch (e) {
      toast.error("导入失败: JSON格式无效");
    }
  };

  const handleImportFromShare = () => {
    if (!shareLink.trim()) {
      toast.error("请输入分享数据");
      return;
    }
    importFromShareMutation.mutate({
      shareData: shareLink.trim(),
      rename: importRename || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* 导出按钮 */}
      {templateId && (
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              分享模板
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>分享模板</DialogTitle>
              <DialogDescription>
                导出模板配置以便与团队成员共享
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="share" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="share">分享链接</TabsTrigger>
                <TabsTrigger value="json">JSON导出</TabsTrigger>
                <TabsTrigger value="public">发布到公共库</TabsTrigger>
              </TabsList>

              <TabsContent value="share" className="space-y-4">
                <div className="space-y-2">
                  <Label>分享数据</Label>
                  <div className="flex gap-2">
                    <Input
                      value={(shareData as any)?.shareData || ""}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyShareData}
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    将此数据发送给团队成员，他们可以通过"导入"功能使用
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4">
                <div className="space-y-2">
                  <Label>JSON数据</Label>
                  <Textarea
                    value={
                      exportedTemplate
                        ? JSON.stringify(exportedTemplate, null, 2)
                        : ""
                    }
                    readOnly
                    className="font-mono text-xs h-64"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCopyJson}>
                      <Copy className="w-4 h-4 mr-2" />
                      复制
                    </Button>
                    <Button variant="outline" onClick={handleDownloadJson}>
                      <Download className="w-4 h-4 mr-2" />
                      下载文件
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="public" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      发布到公共模板库
                    </CardTitle>
                    <CardDescription>
                      发布后，所有用户都可以在公共模板库中看到并使用此模板
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => publishMutation.mutate({ id: templateId })}
                      disabled={publishMutation.isPending}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      发布到公共库
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* 导入按钮 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            导入模板
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入模板</DialogTitle>
            <DialogDescription>
              从分享数据或JSON文件导入模板配置
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="share" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="share">从分享数据</TabsTrigger>
              <TabsTrigger value="json">从JSON</TabsTrigger>
              <TabsTrigger value="public">公共模板库</TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-4">
              <div className="space-y-2">
                <Label>分享数据</Label>
                <Input
                  value={shareLink}
                  onChange={(e) => setShareLink(e.target.value)}
                  placeholder="粘贴分享数据..."
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>重命名（可选）</Label>
                <Input
                  value={importRename}
                  onChange={(e) => setImportRename(e.target.value)}
                  placeholder="输入新名称..."
                />
              </div>
              <Button
                onClick={handleImportFromShare}
                disabled={importFromShareMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                导入
              </Button>
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <div className="space-y-2">
                <Label>JSON数据</Label>
                <Textarea
                  value={importData}
                  onChange={(e) => {
                    setImportData(e.target.value);
                    setValidationResult(null);
                  }}
                  placeholder="粘贴JSON数据..."
                  className="font-mono text-xs h-48"
                />
              </div>

              {validationResult && (
                <div
                  className={`p-3 rounded-lg ${
                    validationResult.valid
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>
                      {validationResult.valid
                        ? "验证通过"
                        : `验证失败: ${validationResult.errors.join(", ")}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>重命名（可选）</Label>
                <Input
                  value={importRename}
                  onChange={(e) => setImportRename(e.target.value)}
                  placeholder="输入新名称..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={makePublic}
                  onCheckedChange={setMakePublic}
                  id="make-public"
                />
                <Label htmlFor="make-public">导入后发布到公共库</Label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleValidateImport}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  验证
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending || !importData}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  导入
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="public" className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>模板名称</TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead>使用次数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publicTemplates?.map((template: any) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>{template.usageCount}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // 复制公共模板
                              importMutation.mutate({
                                data: {
                                  version: "1.0",
                                  template: {
                                    name: template.name,
                                    description: template.description,
                                    category: template.category,
                                    reportTypes: template.reportTypes,
                                    layout: template.layout,
                                    styling: template.styling,
                                    filters: template.filters,
                                  },
                                },
                              });
                            }}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            复制
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!publicTemplates || publicTemplates.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-8"
                        >
                          暂无公共模板
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
