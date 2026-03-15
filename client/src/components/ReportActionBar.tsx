/**
 * ReportActionBar — 报告/分析结果通用操作栏
 *
 * 提供: 复制到剪贴板、下载JSON/文本、通过Outlook分享、发起讨论频道
 * 用法: 包裹在任何分析结果区域底部
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Download,
  Mail,
  Share2,
  MessageSquare,
  Printer,
  FileText,
  FileJson,
  ChevronDown,
  Send,
  Users,
  ExternalLink,
} from "lucide-react";

interface ReportActionBarProps {
  /** 报告标题 (用于邮件主题/文件名) */
  title: string;
  /** 报告内容 — 纯文本/markdown 供复制和邮件 */
  textContent: string;
  /** 结构化数据 — 供JSON下载 */
  jsonData?: Record<string, unknown>;
  /** 额外样式 */
  className?: string;
  /** 是否紧凑模式 (只显示图标按钮) */
  compact?: boolean;
  /** 自定义操作 */
  extraActions?: React.ReactNode;
}

function formatReportText(title: string, text: string): string {
  const divider = "─".repeat(40);
  const timestamp = new Date().toLocaleString("zh-CN");
  return `${title}\n${divider}\n生成时间: ${timestamp}\n${divider}\n\n${text}\n\n${divider}\n由 GRT System 生成`;
}

function generateMailtoLink(title: string, body: string): string {
  const subject = encodeURIComponent(`[GRT] ${title}`);
  const encodedBody = encodeURIComponent(body);
  return `mailto:?subject=${subject}&body=${encodedBody}`;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportActionBar({
  title,
  textContent,
  jsonData,
  className = "",
  compact = false,
  extraActions,
}: ReportActionBarProps) {
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareRecipients, setShareRecipients] = useState("");
  const [shareNote, setShareNote] = useState("");

  const fullText = formatReportText(title, textContent);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "已复制", description: "报告内容已复制到剪贴板" });
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast({ title: "已复制", description: "报告内容已复制到剪贴板" });
    }
  };

  const handleDownloadText = () => {
    const safeName = title.replace(/[/\\?%*:|"<>]/g, "-");
    downloadFile(`${safeName}.txt`, fullText, "text/plain;charset=utf-8");
    toast({ title: "已下载", description: `${safeName}.txt` });
  };

  const handleDownloadJson = () => {
    if (!jsonData) return;
    const safeName = title.replace(/[/\\?%*:|"<>]/g, "-");
    downloadFile(
      `${safeName}.json`,
      JSON.stringify(jsonData, null, 2),
      "application/json;charset=utf-8"
    );
    toast({ title: "已下载", description: `${safeName}.json` });
  };

  const handleOutlookShare = () => {
    const body = shareNote
      ? `${shareNote}\n\n${"─".repeat(20)}\n\n${fullText}`
      : fullText;
    window.open(generateMailtoLink(title, body), "_blank");
    setShareDialogOpen(false);
    setShareRecipients("");
    setShareNote("");
    toast({ title: "已打开邮件客户端", description: "请在Outlook中完成发送" });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>${title}</title>
        <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#333}
        h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
        pre{white-space:pre-wrap;font-size:13px;line-height:1.6}
        .meta{color:#666;font-size:12px;margin-bottom:20px}</style></head>
        <body><h1>${title}</h1>
        <p class="meta">生成时间: ${new Date().toLocaleString("zh-CN")} | GRT System</p>
        <pre>${textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`
      );
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="复制">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrint} title="打印">
          <Printer className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShareDialogOpen(true)} title="分享">
          <Share2 className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="下载">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownloadText}>
              <FileText className="h-4 w-4 mr-2" /> 下载文本 (.txt)
            </DropdownMenuItem>
            {jsonData && (
              <DropdownMenuItem onClick={handleDownloadJson}>
                <FileJson className="h-4 w-4 mr-2" /> 下载数据 (.json)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {extraActions}
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          title={title}
          recipients={shareRecipients}
          onRecipientsChange={setShareRecipients}
          note={shareNote}
          onNoteChange={setShareNote}
          onSend={handleOutlookShare}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
        <Copy className="h-3.5 w-3.5" /> 复制报告
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> 下载 <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleDownloadText}>
            <FileText className="h-4 w-4 mr-2" /> 纯文本 (.txt)
          </DropdownMenuItem>
          {jsonData && (
            <DropdownMenuItem onClick={handleDownloadJson}>
              <FileJson className="h-4 w-4 mr-2" /> JSON数据 (.json)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
        <Printer className="h-3.5 w-3.5" /> 打印
      </Button>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareDialogOpen(true)}>
        <Mail className="h-3.5 w-3.5" /> Outlook分享
      </Button>

      {extraActions}

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title={title}
        recipients={shareRecipients}
        onRecipientsChange={setShareRecipients}
        note={shareNote}
        onNoteChange={setShareNote}
        onSend={handleOutlookShare}
      />
    </div>
  );
}

/** 分享对话框 */
function ShareDialog({
  open,
  onOpenChange,
  title,
  recipients,
  onRecipientsChange,
  note,
  onNoteChange,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  recipients: string;
  onRecipientsChange: (v: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> 通过Outlook分享报告
          </DialogTitle>
          <DialogDescription>
            将「{title}」发送给同事讨论
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">收件人 (可选，在Outlook中添加)</label>
            <Input
              placeholder="colleague@grt.com, team@grt.com"
              value={recipients}
              onChange={(e) => onRecipientsChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">附言</label>
            <Textarea
              placeholder="请查阅此分析报告，重点关注..."
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSend} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> 打开Outlook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
