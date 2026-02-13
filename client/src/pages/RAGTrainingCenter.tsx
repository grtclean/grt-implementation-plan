/**
 * RAG知识库训练中心 (RAG Training Center)
 *
 * 提供知识库文档的上传、解析、编辑和入库功能。
 * 支持多种文件格式（TXT, MD, CSV, JSON等），
 * 自动拆分段落、分类、标签，并可手动编辑后批量入库。
 */

import { useState, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  Plus,
  CheckCircle,
  ChevronRight,
  Database,
  BarChart3,
  ClipboardPaste,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface EditableSegment {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  selected: boolean;
}

const CATEGORIES = [
  { value: "technical", label: "技术文档" },
  { value: "process", label: "工艺流程" },
  { value: "material", label: "材料规格" },
  { value: "standard", label: "行业标准" },
  { value: "case_study", label: "案例参考" },
  { value: "faq", label: "常见问题" },
] as const;

const CATEGORY_MAP: Record<string, string> = {
  technical: "技术文档",
  process: "工艺流程",
  material: "材料规格",
  standard: "行业标准",
  case_study: "案例参考",
  faq: "常见问题",
};

const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  process: "bg-green-500/10 text-green-500 border-green-500/20",
  material: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  standard: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  case_study: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  faq: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

// ============================================================
// Helper
// ============================================================

let segId = 0;
function nextSegmentId(): string {
  return `seg_${++segId}_${Date.now()}`;
}

// ============================================================
// Component
// ============================================================

export default function RAGTrainingCenter() {
  // ---- State ----
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [pasteContent, setPasteContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileType, setFileType] = useState("");
  const [segments, setSegments] = useState<EditableSegment[]>([]);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [docListPage, setDocListPage] = useState(1);
  const [docListCategory, setDocListCategory] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- tRPC ----
  const utils = trpc.useUtils();

  const statsQuery = trpc.knowledgeBase.getTrainingStats.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const docListQuery = trpc.knowledgeBase.list.useQuery(
    {
      page: docListPage,
      pageSize: 10,
      category:
        docListCategory !== "all" ? (docListCategory as any) : undefined,
    },
    { retry: false, refetchOnWindowFocus: false }
  );

  const parseMutation = trpc.knowledgeBase.parseContent.useMutation({
    onSuccess: (data) => {
      const editable: EditableSegment[] = data.segments.map((s) => ({
        id: nextSegmentId(),
        title: s.title,
        content: s.content,
        category: s.suggestedCategory,
        tags: s.suggestedTags.join(", "),
        selected: true,
      }));
      setSegments(editable);
      setCurrentStep(2);
      setAlert(null);
    },
    onError: (err) => {
      setAlert({ type: "error", message: "解析失败: " + err.message });
    },
  });

  const ingestMutation = trpc.knowledgeBase.ingestSegments.useMutation({
    onSuccess: (data) => {
      setAlert({ type: "success", message: data.message });
      setCurrentStep(3);
      setSegments([]);
      setPasteContent("");
      setFileContent("");
      setFileName("");
      setFileType("");
      utils.knowledgeBase.getTrainingStats.invalidate();
      utils.knowledgeBase.list.invalidate();
    },
    onError: (err) => {
      setAlert({ type: "error", message: "入库失败: " + err.message });
    },
  });

  // ---- Handlers ----
  const handleFileSelect = useCallback(
    (file: File) => {
      setFileName(file.name);
      const ext = file.name.split(".").pop() || "txt";
      setFileType(ext);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setFileContent(text);
        setPasteContent("");
        setAlert({
          type: "success",
          message: `已读取文件: ${file.name} (${(text.length / 1024).toFixed(1)} KB)`,
        });
      };
      reader.onerror = () => {
        setAlert({ type: "error", message: "文件读取失败" });
      };
      reader.readAsText(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleParseClick = () => {
    const content = fileContent || pasteContent;
    if (!content.trim()) {
      setAlert({ type: "error", message: "请先上传文件或粘贴内容" });
      return;
    }
    const name = fileName || "粘贴内容.txt";
    const type = fileType || "txt";
    parseMutation.mutate({ content, fileName: name, fileType: type });
  };

  const updateSegment = (id: string, field: keyof EditableSegment, value: string | boolean) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const addEmptySegment = () => {
    setSegments((prev) => [
      ...prev,
      {
        id: nextSegmentId(),
        title: "",
        content: "",
        category: "technical",
        tags: "",
        selected: true,
      },
    ]);
  };

  const handleIngest = () => {
    const selected = segments.filter((s) => s.selected);
    if (selected.length === 0) {
      setAlert({ type: "error", message: "请至少选择一个段落进行入库" });
      return;
    }
    const payload = selected.map((s) => ({
      title: s.title,
      content: s.content,
      category: s.category,
      tags: s.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }));
    ingestMutation.mutate({ segments: payload });
  };

  const selectAll = (checked: boolean) => {
    setSegments((prev) => prev.map((s) => ({ ...s, selected: checked })));
  };

  const selectedCount = segments.filter((s) => s.selected).length;

  // ---- Render ----
  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            首页
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/ai-hub" className="hover:text-foreground transition-colors">
            AI助手
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">知识库训练中心</span>
        </nav>

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">RAG 知识库训练中心</h1>
            <p className="text-muted-foreground text-sm">
              上传文档、智能解析、编辑确认、批量入库
            </p>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              alert.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              className="ml-auto hover:opacity-70"
            >
              x
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsQuery.isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Database className="h-4 w-4" />
                    总文档数
                  </div>
                  <p className="text-2xl font-bold">
                    {statsQuery.data?.total ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Plus className="h-4 w-4" />
                    本周新增
                  </div>
                  <p className="text-2xl font-bold">
                    {statsQuery.data?.thisWeek ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <BarChart3 className="h-4 w-4" />
                    类别分布
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statsQuery.data?.byCategory?.map((c) => (
                      <Badge
                        key={c.category}
                        variant="outline"
                        className={
                          CATEGORY_COLORS[c.category] ?? ""
                        }
                      >
                        {CATEGORY_MAP[c.category] ?? c.category}: {c.count}
                      </Badge>
                    ))}
                    {(!statsQuery.data?.byCategory ||
                      statsQuery.data.byCategory.length === 0) && (
                      <span className="text-muted-foreground text-sm">
                        暂无数据
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-sm">
          {[
            { step: 1, label: "上传内容", icon: Upload },
            { step: 2, label: "识别与编辑", icon: FileText },
            { step: 3, label: "确认入库", icon: CheckCircle },
          ].map(({ step, label, icon: Icon }, idx) => (
            <div key={step} className="flex items-center gap-2">
              {idx > 0 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
              <button
                onClick={() => {
                  if (step === 1) setCurrentStep(1);
                  else if (step === 2 && segments.length > 0)
                    setCurrentStep(2);
                  else if (step === 3) setCurrentStep(3);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                  currentStep === step
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>
                  {step}. {label}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  上传文件
                </CardTitle>
                <CardDescription>
                  支持 TXT, Markdown, CSV, TSV, JSON 格式（文本文件）。
                  PDF/Word 等二进制格式请先转为纯文本。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持 .txt .md .csv .tsv .json
                  </p>
                  {fileName && (
                    <Badge variant="outline" className="mt-3">
                      {fileName}
                    </Badge>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.csv,.tsv,.json,.markdown"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardPaste className="h-5 w-5" />
                  直接粘贴内容
                </CardTitle>
                <CardDescription>
                  也可以直接粘贴文本内容到下方文本区域
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="在此粘贴需要入库的文本内容..."
                  value={pasteContent}
                  onChange={(e) => {
                    setPasteContent(e.target.value);
                    if (e.target.value) {
                      setFileContent("");
                      setFileName("");
                      setFileType("txt");
                    }
                  }}
                  className="min-h-[120px] font-mono text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleParseClick}
                    disabled={
                      parseMutation.isPending ||
                      (!fileContent && !pasteContent.trim())
                    }
                  >
                    {parseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    开始解析
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Edit Segments */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      解析结果 ({segments.length} 段)
                    </CardTitle>
                    <CardDescription>
                      检查并编辑每个段落的标题、内容、类别和标签，然后选择需要入库的段落
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      返回上传
                    </Button>
                    <Button variant="outline" size="sm" onClick={addEmptySegment}>
                      <Plus className="h-4 w-4 mr-1" />
                      新增段落
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                  <Checkbox
                    checked={segments.length > 0 && selectedCount === segments.length}
                    onCheckedChange={(checked) => selectAll(!!checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    全选 ({selectedCount}/{segments.length})
                  </span>
                </div>
              </CardContent>
            </Card>

            {segments.map((seg, idx) => (
              <Card
                key={seg.id}
                className={`transition-colors ${seg.selected ? "border-primary/30" : "opacity-60"}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      <Checkbox
                        checked={seg.selected}
                        onCheckedChange={(checked) =>
                          updateSegment(seg.id, "selected", !!checked)
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">
                          #{idx + 1}
                        </Badge>
                        <Input
                          placeholder="段落标题"
                          value={seg.title}
                          onChange={(e) =>
                            updateSegment(seg.id, "title", e.target.value)
                          }
                          className="flex-1"
                        />
                      </div>
                      <Textarea
                        placeholder="段落内容"
                        value={seg.content}
                        onChange={(e) =>
                          updateSegment(seg.id, "content", e.target.value)
                        }
                        className="min-h-[80px] text-sm font-mono"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-[180px]">
                          <Select
                            value={seg.category}
                            onValueChange={(v) =>
                              updateSegment(seg.id, "category", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择类别" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <Input
                            placeholder="标签（逗号分隔）"
                            value={seg.tags}
                            onChange={(e) =>
                              updateSegment(seg.id, "tags", e.target.value)
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSegment(seg.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {segments.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  暂无段落。点击"新增段落"手动添加，或返回上传步骤解析内容。
                </CardContent>
              </Card>
            )}

            {segments.length > 0 && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={addEmptySegment}>
                  <Plus className="h-4 w-4 mr-1" />
                  新增段落
                </Button>
                <Button
                  onClick={handleIngest}
                  disabled={ingestMutation.isPending || selectedCount === 0}
                >
                  {ingestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  确认入库 ({selectedCount} 条)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold">入库完成</h3>
              <p className="text-muted-foreground">
                知识条目已成功入库到 RAG 知识库中
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    setAlert(null);
                  }}
                >
                  继续上传
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Documents Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  已有知识库
                </CardTitle>
                <CardDescription>
                  共 {docListQuery.data?.total ?? 0} 条记录
                </CardDescription>
              </div>
              <Select
                value={docListCategory}
                onValueChange={(v) => {
                  setDocListCategory(v);
                  setDocListPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="按类别筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类别</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {docListQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">ID</TableHead>
                        <TableHead>标题</TableHead>
                        <TableHead className="w-[100px]">类别</TableHead>
                        <TableHead className="w-[100px]">来源</TableHead>
                        <TableHead className="w-[60px]">热度</TableHead>
                        <TableHead className="w-[120px]">创建时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docListQuery.data?.items?.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="text-muted-foreground">
                            {doc.id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[300px]">
                                {doc.title}
                              </p>
                              {doc.tags && Array.isArray(doc.tags) && doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {doc.tags.slice(0, 3).map((tag: string, i: number) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {doc.tags.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{doc.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                CATEGORY_COLORS[doc.category] ?? ""
                              }
                            >
                              {CATEGORY_MAP[doc.category] ?? doc.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {doc.source ?? "manual"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doc.relevanceScore ?? 0}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {doc.createdAt
                              ? new Date(doc.createdAt).toLocaleDateString("zh-CN")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!docListQuery.data?.items ||
                        docListQuery.data.items.length === 0) && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-8"
                          >
                            暂无知识库文档
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {(docListQuery.data?.totalPages ?? 0) > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      第 {docListQuery.data?.page ?? 1} /{" "}
                      {docListQuery.data?.totalPages ?? 1} 页
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={docListPage <= 1}
                        onClick={() => setDocListPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          docListPage >= (docListQuery.data?.totalPages ?? 1)
                        }
                        onClick={() => setDocListPage((p) => p + 1)}
                      >
                        下一页
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
