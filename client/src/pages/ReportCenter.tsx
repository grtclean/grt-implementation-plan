/**
 * GRT 全局汇报中枢 (Executive Briefing Center)
 *
 * Management hub for creating, editing, publishing, and presenting
 * structured executive reports with full-screen projector mode.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Presentation,
  Pencil,
  Trash2,
  Send,
  BarChart3,
  FileCheck,
  FilePen,
} from "lucide-react";

const REPORT_TYPES = [
  { value: "CEO_STRATEGY", label: "CEO 战略汇报" },
  { value: "DEPT_WEEKLY", label: "部门周报" },
  { value: "SHIFT_HANDOVER", label: "交接班报告" },
  { value: "PROJECT_UPDATE", label: "项目进展" },
  { value: "QUALITY_REVIEW", label: "质量评审" },
] as const;

const REPORT_TYPE_LABELS: Record<string, string> = {
  CEO_STRATEGY: "CEO 战略",
  DEPT_WEEKLY: "部门周报",
  SHIFT_HANDOVER: "交接班",
  PROJECT_UPDATE: "项目进展",
  QUALITY_REVIEW: "质量评审",
};

interface ContentBlock {
  type: "title" | "text" | "metric" | "divider";
  title?: string;
  content?: string;
  value?: string;
  unit?: string;
}

const EMPTY_BLOCK: ContentBlock = { type: "text", title: "", content: "" };

export default function ReportCenter() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formType, setFormType] = useState("DEPT_WEEKLY");
  const [formBlocks, setFormBlocks] = useState<ContentBlock[]>([
    { type: "title", title: "", content: "" },
    { type: "text", title: "", content: "" },
  ]);

  const utils = trpc.useUtils();
  const { data: reports = [], isLoading } = trpc.reportCenter.list.useQuery({
    search: search || undefined,
    reportType: filterType !== "ALL" ? filterType : undefined,
  });

  const createMutation = trpc.reportCenter.create.useMutation({
    onSuccess: () => {
      toast.success("汇报已创建");
      utils.reportCenter.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.reportCenter.update.useMutation({
    onSuccess: () => {
      toast.success("汇报已更新");
      utils.reportCenter.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.reportCenter.publish.useMutation({
    onSuccess: () => {
      toast.success("汇报已发布");
      utils.reportCenter.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.reportCenter.delete.useMutation({
    onSuccess: () => {
      toast.success("汇报已删除");
      utils.reportCenter.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setShowCreate(false);
    setEditId(null);
    setFormTitle("");
    setFormDept("");
    setFormType("DEPT_WEEKLY");
    setFormBlocks([
      { type: "title", title: "", content: "" },
      { type: "text", title: "", content: "" },
    ]);
  }

  function openEdit(report: any) {
    setEditId(report.id);
    setFormTitle(report.title);
    setFormDept(report.department || "");
    setFormType(report.reportType || "DEPT_WEEKLY");
    setFormBlocks(
      Array.isArray(report.contentBlocks) && report.contentBlocks.length > 0
        ? report.contentBlocks
        : [{ type: "title", title: "", content: "" }, { type: "text", title: "", content: "" }]
    );
    setShowCreate(true);
  }

  function handleSave() {
    if (!formTitle.trim()) {
      toast.error("请输入汇报标题");
      return;
    }
    const blocks = formBlocks.filter(
      (b) => b.title?.trim() || b.content?.trim() || b.value?.trim()
    );
    if (editId) {
      updateMutation.mutate({
        id: editId,
        title: formTitle,
        department: formDept || undefined,
        reportType: formType,
        contentBlocks: blocks,
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        department: formDept || undefined,
        reportType: formType,
        contentBlocks: blocks,
      });
    }
  }

  function updateBlock(idx: number, field: keyof ContentBlock, value: string) {
    setFormBlocks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addBlock() {
    setFormBlocks((prev) => [...prev, { ...EMPTY_BLOCK }]);
  }

  function removeBlock(idx: number) {
    setFormBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  // Stats
  const totalCount = reports.length;
  const publishedCount = reports.filter((r) => r.status === "PUBLISHED").length;
  const draftCount = reports.filter((r) => r.status === "DRAFT").length;

  const myReports = reports.filter((r) => r.status === "DRAFT");
  const publishedReports = reports.filter((r) => r.status === "PUBLISHED");

  return (
    <div className="min-h-screen" style={{ background: "#faf9f8" }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                GRT 全局汇报中枢
              </h1>
              <p className="text-sm text-gray-500">
                Executive Briefing Center
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建汇报
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              <p className="text-xs text-gray-500">全部汇报</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {publishedCount}
              </p>
              <p className="text-xs text-gray-500">已发布</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <FilePen className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{draftCount}</p>
              <p className="text-xs text-gray-500">草稿</p>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索汇报标题、作者、部门..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部类型</SelectItem>
              {REPORT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Section 1: 我的汇报 (drafts) */}
            {myReports.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  我的汇报 (草稿)
                </h2>
                <div className="space-y-2">
                  {myReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 shrink-0"
                        >
                          草稿
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {report.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {report.authorName || "—"} ·{" "}
                            {report.department || "—"} ·{" "}
                            {REPORT_TYPE_LABELS[report.reportType || ""] ||
                              report.reportType}{" "}
                            ·{" "}
                            {report.updatedAt
                              ? new Date(report.updatedAt).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(report)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => publishMutation.mutate({ id: report.id })}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          发布
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("确定删除该汇报？"))
                              deleteMutation.mutate({ id: report.id });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: 已发布汇报 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                已发布汇报
              </h2>
              {publishedReports.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无已发布汇报</p>
                  <p className="text-sm text-gray-400 mt-1">
                    点击"创建汇报"开始您的第一份汇报
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishedReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Card gradient header */}
                      <div
                        className="h-24 flex items-end p-4"
                        style={{
                          background:
                            "linear-gradient(135deg, #0078d4, #00b7c3)",
                        }}
                      >
                        <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                          {report.title}
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {REPORT_TYPE_LABELS[report.reportType || ""] ||
                              report.reportType}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 text-xs"
                          >
                            已发布
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {report.authorName || "—"} ·{" "}
                          {report.department || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {report.updatedAt
                            ? new Date(report.updatedAt).toLocaleDateString()
                            : "—"}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(report)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() =>
                              navigate(`/report-center/${report.id}/present`)
                            }
                          >
                            <Presentation className="w-3.5 h-3.5 mr-1" />
                            全屏展演
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "编辑汇报" : "创建汇报"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>汇报标题 *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="输入汇报标题"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门</Label>
                <Input
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  placeholder="如：技术部"
                />
              </div>
              <div className="space-y-2">
                <Label>汇报类型</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>内容块 (每块 = 一页幻灯片)</Label>
                <Button size="sm" variant="outline" onClick={addBlock}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  添加
                </Button>
              </div>
              {formBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-3 space-y-2 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      幻灯片 {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={block.type}
                        onValueChange={(v) =>
                          updateBlock(idx, "type", v)
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="title">标题页</SelectItem>
                          <SelectItem value="text">正文页</SelectItem>
                          <SelectItem value="metric">指标页</SelectItem>
                          <SelectItem value="divider">分隔页</SelectItem>
                        </SelectContent>
                      </Select>
                      {formBlocks.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400"
                          onClick={() => removeBlock(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Input
                    placeholder="标题"
                    value={block.title || ""}
                    onChange={(e) =>
                      updateBlock(idx, "title", e.target.value)
                    }
                    className="text-sm"
                  />
                  {block.type === "metric" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="数值 (如 98.5)"
                        value={block.value || ""}
                        onChange={(e) =>
                          updateBlock(idx, "value", e.target.value)
                        }
                        className="text-sm"
                      />
                      <Input
                        placeholder="单位 (如 %)"
                        value={block.unit || ""}
                        onChange={(e) =>
                          updateBlock(idx, "unit", e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <Textarea
                      placeholder="内容"
                      value={block.content || ""}
                      onChange={(e) =>
                        updateBlock(idx, "content", e.target.value)
                      }
                      rows={3}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "保存中..."
                : editId
                ? "保存更改"
                : "创建草稿"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
