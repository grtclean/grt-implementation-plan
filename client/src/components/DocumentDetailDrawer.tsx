/**
 * Document Detail Drawer — 文档详情抽屉
 *
 * Right-side drawer with 5 inner tabs:
 * 1. Preview — render markdown
 * 2. Metadata — editable fields
 * 3. Versions — timeline + version comparison
 * 4. Links — clickable cross-references
 * 5. Audit — activity timeline
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye, FileCode, GitBranch, Link2, Activity, Download,
  Edit, CheckCircle, Clock, XCircle,
} from "lucide-react";

interface Props {
  docId: number;
  open: boolean;
  onClose: () => void;
  onEdit?: (id: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  under_review: "bg-yellow-100 text-yellow-700",
  superseded: "bg-orange-100 text-orange-700",
  archived: "bg-red-100 text-red-700",
  approved: "bg-green-100 text-green-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

export default function DocumentDetailDrawer({ docId, open, onClose, onEdit }: Props) {
  const { language } = useLanguage();
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [innerTab, setInnerTab] = useState("preview");

  const docQuery = trpc.orgDocument.registry.getDocument.useQuery(
    { id: docId },
    { enabled: open && !!docId },
  );

  const auditQuery = trpc.orgDocument.audit.getDocumentActivity.useQuery(
    { documentId: docId, limit: 50 },
    { enabled: open && !!docId && innerTab === "audit" },
  );

  const doc = docQuery.data;
  const versions = doc?.versions ?? [];
  const links = doc?.links ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileCode className="h-4 w-4" />
            {doc?.title || "..."}
            {doc && (
              <Badge className={`text-xs ml-2 ${STATUS_COLORS[doc.status] || ""}`}>
                {doc.status}
              </Badge>
            )}
          </SheetTitle>
          {doc && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{doc.docCode}</span>
              <span>·</span>
              <span>{doc.currentVersion}</span>
              <span>·</span>
              <span>{doc.domain}/{doc.subdomain}</span>
            </div>
          )}
        </SheetHeader>

        <Tabs value={innerTab} onValueChange={setInnerTab} className="h-full">
          <TabsList className="w-full justify-start rounded-none border-b px-2">
            <TabsTrigger value="preview" className="text-xs gap-1"><Eye className="h-3 w-3" />{t("预览", "Preview")}</TabsTrigger>
            <TabsTrigger value="meta" className="text-xs gap-1"><FileCode className="h-3 w-3" />{t("元数据", "Metadata")}</TabsTrigger>
            <TabsTrigger value="versions" className="text-xs gap-1"><GitBranch className="h-3 w-3" />{t("版本", "Versions")}</TabsTrigger>
            <TabsTrigger value="links" className="text-xs gap-1"><Link2 className="h-3 w-3" />{t("链接", "Links")}</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1"><Activity className="h-3 w-3" />{t("审计", "Audit")}</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-180px)]">
            {/* Preview */}
            <TabsContent value="preview" className="p-4 m-0">
              {doc?.markdownContent ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/30 p-4 rounded-lg">{doc.markdownContent}</pre>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t("暂无内容", "No content")}</p>
              )}
              <div className="flex gap-2 mt-4">
                {onEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(docId)}>
                    <Edit className="h-3.5 w-3.5 mr-1" />{t("编辑", "Edit")}
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Metadata */}
            <TabsContent value="meta" className="p-4 m-0">
              {doc && (
                <div className="space-y-3 text-sm">
                  {[
                    [t("编号", "Code"), doc.docCode],
                    [t("类型", "Type"), doc.docType],
                    [t("域", "Domain"), doc.domain],
                    [t("子域", "Subdomain"), doc.subdomain],
                    [t("Owner角色", "Owner Role"), doc.ownerRole || "—"],
                    [t("审批角色", "Approver"), doc.approverRole || "—"],
                    [t("BU范围", "BU Scope"), doc.allBus ? t("全公司", "All BUs") : (doc.buCode || "—")],
                    [t("评审频率", "Review Freq."), doc.reviewFrequency || "—"],
                    [t("上次评审", "Last Review"), doc.lastReviewedAt ? new Date(doc.lastReviewedAt).toLocaleDateString() : "—"],
                    [t("下次评审", "Next Review"), doc.nextReviewDueAt ? new Date(doc.nextReviewDueAt).toLocaleDateString() : "—"],
                    [t("文件路径", "File Path"), doc.filePath || "—"],
                    [t("内容Hash", "Hash"), doc.contentHash?.substring(0, 16) + "..." || "—"],
                    [t("浏览次数", "Views"), String(doc.viewCount)],
                    [t("使用次数", "Uses"), String(doc.usageCount)],
                    [t("下载次数", "Downloads"), String(doc.downloadCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono text-xs">{value}</span>
                    </div>
                  ))}
                  {!!(doc.tags) && Array.isArray(doc.tags) && (
                    <div>
                      <span className="text-muted-foreground text-xs">{t("标签", "Tags")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(doc.tags as string[]).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Versions */}
            <TabsContent value="versions" className="p-4 m-0">
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={v.isLatest ? "default" : "outline"} className="text-xs">
                          {v.versionString}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[v.reviewStatus] || ""}`}>
                          {v.reviewStatus}
                        </Badge>
                        {v.isLatest && <Badge className="bg-blue-100 text-blue-700 text-xs">{t("最新", "Latest")}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.changeType === "initial" ? t("初始版本", "Initial version") : v.changeReason || "—"}
                    </p>
                    {v.createdByName && (
                      <p className="text-xs text-muted-foreground mt-1">{t("创建人", "By")}: {v.createdByName}</p>
                    )}
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("暂无版本记录", "No versions")}</p>
                )}
              </div>
            </TabsContent>

            {/* Links */}
            <TabsContent value="links" className="p-4 m-0">
              <div className="space-y-2">
                {links.map((link) => (
                  <div key={link.id} className="border rounded p-2 text-sm flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{link.linkType}</Badge>
                        <Badge variant="outline" className="text-xs">{link.targetType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{link.description || link.targetPath || `Doc #${link.targetDocId}`}</p>
                    </div>
                  </div>
                ))}
                {links.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("暂无关联", "No links")}</p>
                )}
              </div>
            </TabsContent>

            {/* Audit */}
            <TabsContent value="audit" className="p-4 m-0">
              <div className="space-y-2">
                {(auditQuery.data ?? []).map((entry) => (
                  <div key={entry.id} className="border-l-2 border-muted-foreground/20 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                      <span className="text-xs text-muted-foreground">{entry.userName || "System"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                    </p>
                  </div>
                ))}
                {(auditQuery.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("暂无活动", "No activity")}</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
