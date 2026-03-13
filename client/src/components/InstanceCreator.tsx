/**
 * Instance Creator — 文档实例创建器
 *
 * Template selector → context fields → content editor → submit
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Wand2 } from "lucide-react";

const BU_OPTIONS = [
  { value: "overseas", label: "海外" },
  { value: "commercial", label: "商用车" },
  { value: "passenger", label: "乘用车" },
  { value: "semiconductor", label: "半导体" },
  { value: "industrial", label: "工业通用" },
];

const STAGE_OPTIONS = [
  "M0", "M1", "M2", "M3", "M4", "M5", "M6",
  "M7", "M8", "M9", "M10", "M11", "M12",
];

interface Props {
  open: boolean;
  templateId?: number | null;
  onClose: () => void;
  onCreated?: () => void;
}

export default function InstanceCreator({ open, templateId, onClose, onCreated }: Props) {
  const { language } = useLanguage();
  const t = (zh: string, en: string) => (language === "en" ? en : zh);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(templateId ?? undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [buCode, setBuCode] = useState("");
  const [stageCode, setStageCode] = useState("");
  const [projectCode, setProjectCode] = useState("");

  // Template list for selector
  const templatesQuery = trpc.orgDocument.registry.listDocuments.useQuery(
    { docType: "template", pageSize: 100 },
    { enabled: open },
  );

  // Auto-fill from template
  const autoFillQuery = trpc.orgDocument.search.autoFillTemplate.useQuery(
    { templateId: selectedTemplateId!, buCode: buCode || undefined },
    { enabled: open && !!selectedTemplateId },
  );

  const createMutation = trpc.orgDocument.instance.createInstance.useMutation({
    onSuccess: () => {
      onCreated?.();
      onClose();
      resetForm();
    },
    onError: (err) => toast.error(`${t("创建失败", "Create failed")}: ${err.message}`),
  });

  // Update selected template when prop changes
  useEffect(() => {
    if (templateId) setSelectedTemplateId(templateId);
  }, [templateId]);

  // Auto-fill content from template
  useEffect(() => {
    if (autoFillQuery.data) {
      if (!content) setContent(autoFillQuery.data.markdownContent || "");
      if (!title) setTitle(autoFillQuery.data.title || "");
    }
  }, [autoFillQuery.data]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setContent("");
    setBuCode("");
    setStageCode("");
    setProjectCode("");
    setSelectedTemplateId(undefined);
  }

  function handleCreate() {
    if (!selectedTemplateId) {
      toast.error(t("请选择模板", "Please select a template"));
      return;
    }
    if (!title.trim()) {
      toast.error(t("请输入标题", "Please enter a title"));
      return;
    }
    createMutation.mutate({
      templateId: selectedTemplateId,
      title: title.trim(),
      description: description.trim() || undefined,
      markdownContent: content || undefined,
      buCode: buCode || undefined,
      stageCode: stageCode || undefined,
      projectCode: projectCode.trim() || undefined,
    });
  }

  const templates = templatesQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("创建文档实例", "Create Document Instance")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          <div>
            <Label>{t("选择模板", "Select Template")} *</Label>
            <Select
              value={selectedTemplateId ? String(selectedTemplateId) : undefined}
              onValueChange={(v) => setSelectedTemplateId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("选择一个模板...", "Choose a template...")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={String(tpl.id)}>
                    <span className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {tpl.title}
                      <span className="text-xs text-muted-foreground">({tpl.domain?.split("-").pop()})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Context fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("BU", "BU")}</Label>
              <Select value={buCode} onValueChange={setBuCode}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {BU_OPTIONS.map((bu) => (
                    <SelectItem key={bu.value} value={bu.value}>{bu.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("阶段", "Stage")}</Label>
              <Select value={stageCode} onValueChange={setStageCode}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("项目编号", "Project Code")}</Label>
              <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="e.g. PRJ-001" />
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <Label>{t("标题", "Title")} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("文档实例标题...", "Instance title...")} />
          </div>
          <div>
            <Label>{t("描述", "Description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("简要描述...", "Brief description...")} />
          </div>

          {/* Content editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>{t("内容", "Content")}</Label>
              {selectedTemplateId && (
                <Button size="sm" variant="ghost" onClick={() => {
                  if (autoFillQuery.data?.markdownContent) {
                    setContent(autoFillQuery.data.markdownContent);
                    toast.success(t("已自动填充", "Auto-filled"));
                  }
                }}>
                  <Wand2 className="h-3.5 w-3.5 mr-1" />{t("自动填充", "Auto-fill")}
                </Button>
              )}
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder={t("Markdown 内容...", "Markdown content...")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("取消", "Cancel")}</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending || !title.trim() || !selectedTemplateId}>
            <Plus className="h-4 w-4 mr-1" />
            {t("创建实例", "Create Instance")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
