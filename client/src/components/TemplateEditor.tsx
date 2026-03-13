/**
 * Template Editor — Markdown 编辑器
 *
 * Split-pane: Editor | Live Preview
 * Save → auto minor version, "Publish Major" → version bump
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
import { Badge } from "@/components/ui/badge";
import { Save, Upload, Eye, Edit } from "lucide-react";

interface Props {
  docId: number;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function TemplateEditor({ docId, open, onClose, onSaved }: Props) {
  const { language } = useLanguage();
  const t = (zh: string, en: string) => (language === "en" ? en : zh);

  const [content, setContent] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [majorDialogOpen, setMajorDialogOpen] = useState(false);
  const [majorReason, setMajorReason] = useState("");

  const docQuery = trpc.orgDocument.registry.getDocument.useQuery(
    { id: docId },
    { enabled: open && !!docId },
  );

  const updateMutation = trpc.orgDocument.registry.updateDocumentContent.useMutation({
    onSuccess: () => {
      onSaved?.();
      docQuery.refetch();
    },
    onError: (err) => toast.error(`${t("保存失败", "Save failed")}: ${err.message}`),
  });

  // Load content when doc is fetched
  useEffect(() => {
    if (docQuery.data?.markdownContent) {
      setContent(docQuery.data.markdownContent);
    }
  }, [docQuery.data?.markdownContent]);

  const doc = docQuery.data;

  function handleSaveMinor() {
    if (!changeReason.trim()) {
      toast.error(t("请输入变更原因", "Please enter a change reason"));
      return;
    }
    updateMutation.mutate({
      id: docId,
      markdownContent: content,
      changeReason: changeReason.trim(),
      isMajor: false,
    });
  }

  function handleSaveMajor() {
    if (!majorReason.trim()) {
      toast.error(t("请输入变更原因", "Please enter a change reason"));
      return;
    }
    updateMutation.mutate({
      id: docId,
      markdownContent: content,
      changeReason: majorReason.trim(),
      isMajor: true,
    });
    setMajorDialogOpen(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-[90vw] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4" />
              {t("编辑模板", "Edit Template")}
              {doc && (
                <>
                  <span className="text-sm font-normal text-muted-foreground">— {doc.title}</span>
                  <Badge variant="outline" className="text-xs">{doc.currentVersion}</Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Split pane */}
          <div className="flex-1 flex gap-2 min-h-0">
            {/* Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">{t("Markdown 编辑器", "Markdown Editor")}</Label>
                <Button size="sm" variant="ghost" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {showPreview ? t("隐藏预览", "Hide Preview") : t("显示预览", "Show Preview")}
                </Button>
              </div>
              <Textarea
                className="flex-1 font-mono text-sm resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("在此编辑 Markdown 内容...", "Edit Markdown content here...")}
              />
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="flex-1 border rounded-lg overflow-auto p-4 bg-muted/10 min-w-0">
                <Label className="text-xs text-muted-foreground mb-1 block">{t("实时预览", "Live Preview")}</Label>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{content}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Save controls */}
          <DialogFooter className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder={t("变更原因 (必填)...", "Change reason (required)...")}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button variant="outline" onClick={onClose}>{t("取消", "Cancel")}</Button>
            <Button onClick={handleSaveMinor} disabled={updateMutation.isPending || !changeReason.trim()}>
              <Save className="h-4 w-4 mr-1" />
              {t("保存 (Minor)", "Save (Minor)")}
            </Button>
            <Button variant="default" onClick={() => setMajorDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />
              {t("发布主版本", "Publish Major")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Major version dialog */}
      <Dialog open={majorDialogOpen} onOpenChange={setMajorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("发布主版本", "Publish Major Version")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t(
                `当前版本 ${doc?.currentVersion}，将升级为 V${(doc?.versionMajor ?? 0) + 1}.0。主版本需要审批。`,
                `Current ${doc?.currentVersion} → V${(doc?.versionMajor ?? 0) + 1}.0. Major versions require approval.`,
              )}
            </p>
            <div>
              <Label>{t("变更原因", "Change Reason")}</Label>
              <Textarea
                value={majorReason}
                onChange={(e) => setMajorReason(e.target.value)}
                placeholder={t("描述此主版本变更的原因...", "Describe the reason for this major version...")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMajorDialogOpen(false)}>{t("取消", "Cancel")}</Button>
            <Button onClick={handleSaveMajor} disabled={!majorReason.trim() || updateMutation.isPending}>
              <Upload className="h-4 w-4 mr-1" />
              {t("确认发布", "Confirm Publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
