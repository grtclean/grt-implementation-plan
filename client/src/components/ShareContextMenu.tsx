/**
 * ShareContextMenu — 右键上下文菜单分享包装器
 *
 * 用法: <ShareContextMenu title="..." textContent="..." jsonData={...}>{children}</ShareContextMenu>
 * 在任何卡片/区域上右键即可: 复制、下载、Outlook分享、打印
 */
import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Download,
  FileText,
  FileJson,
  Mail,
  Printer,
  Image,
  Share2,
} from "lucide-react";

interface ShareContextMenuProps {
  children: React.ReactNode;
  /** 内容标题 */
  title: string;
  /** 纯文本内容 */
  textContent: string;
  /** 结构化JSON数据 (可选) */
  jsonData?: Record<string, unknown>;
  /** 附加菜单项 */
  extraItems?: React.ReactNode;
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

export default function ShareContextMenu({
  children,
  title,
  textContent,
  jsonData,
  extraItems,
}: ShareContextMenuProps) {
  const { toast } = useToast();
  const safeName = title.replace(/[/\\?%*:|"<>]/g, "-");

  const fullText = `${title}\n${"─".repeat(30)}\n生成时间: ${new Date().toLocaleString("zh-CN")}\n\n${textContent}\n\n由 GRT System 生成`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "已复制到剪贴板" });
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast({ title: "已复制到剪贴板" });
    }
  };

  const handleDownloadTxt = () => {
    downloadFile(`${safeName}.txt`, fullText, "text/plain;charset=utf-8");
    toast({ title: "已下载", description: `${safeName}.txt` });
  };

  const handleDownloadJson = () => {
    if (!jsonData) return;
    downloadFile(`${safeName}.json`, JSON.stringify(jsonData, null, 2), "application/json;charset=utf-8");
    toast({ title: "已下载", description: `${safeName}.json` });
  };

  const handleOutlookShare = () => {
    const subject = encodeURIComponent(`[GRT] ${title}`);
    const body = encodeURIComponent(fullText);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    toast({ title: "已打开邮件客户端" });
  };

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    if (pw) {
      pw.document.write(`<html><head><title>${title}</title>
        <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:0 auto}
        h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
        pre{white-space:pre-wrap;font-size:13px;line-height:1.6}</style></head>
        <body><h1>${title}</h1><pre>${textContent.replace(/</g, "&lt;")}</pre></body></html>`);
      pw.document.close();
      pw.print();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" /> 复制内容
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Download className="h-4 w-4 mr-2" /> 下载
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={handleDownloadTxt}>
              <FileText className="h-4 w-4 mr-2" /> 文本文件 (.txt)
            </ContextMenuItem>
            {jsonData && (
              <ContextMenuItem onClick={handleDownloadJson}>
                <FileJson className="h-4 w-4 mr-2" /> JSON数据 (.json)
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleOutlookShare}>
          <Mail className="h-4 w-4 mr-2" /> 通过Outlook分享
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> 打印报告
        </ContextMenuItem>
        {extraItems && (
          <>
            <ContextMenuSeparator />
            {extraItems}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
