import { useState, useRef, useCallback, useEffect } from "react";
import { Save, Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

interface RichTextEditorProps {
  fileId: number;
  initialContent: string;
  readOnly?: boolean;
  onSave?: () => void;
}

export default function RichTextEditor({ fileId, initialContent, readOnly, onSave }: RichTextEditorProps) {
  const { t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveMutation = trpc.collaborationDocs.saveFile.useMutation();

  // Reset content when file changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || "<p></p>";
    }
    setIsDirty(false);
  }, [fileId, initialContent]);

  const execFormat = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    const html = editorRef.current?.innerHTML ?? "";
    try {
      await saveMutation.mutateAsync({ id: fileId, richContent: html, contentType: "richtext" });
      setIsDirty(false);
      onSave?.();
    } catch {
      // error handled
    }
  }, [fileId, saveMutation, onSave]);

  const handleReset = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || "<p></p>";
    }
    setIsDirty(false);
  }, [initialContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+S to save
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const formatButtons = [
    { icon: Bold, cmd: "bold", label: "B" },
    { icon: Italic, cmd: "italic", label: "I" },
    { icon: Underline, cmd: "underline", label: "U" },
    null, // separator
    { icon: Heading1, cmd: "formatBlock", value: "h1", label: "H1" },
    { icon: Heading2, cmd: "formatBlock", value: "h2", label: "H2" },
    null,
    { icon: List, cmd: "insertUnorderedList", label: "UL" },
    { icon: ListOrdered, cmd: "insertOrderedList", label: "OL" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Format toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[#edebe9] bg-[#faf9f8] shrink-0 flex-wrap">
          {formatButtons.map((btn, i) => {
            if (!btn) return <div key={i} className="w-px h-5 bg-[#edebe9] mx-1" />;
            const Icon = btn.icon;
            return (
              <Button
                key={btn.cmd + (btn.value ?? "")}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title={btn.label}
                onClick={() => execFormat(btn.cmd, btn.value)}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            );
          })}
          <div className="flex-1" />
          {isDirty && (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleReset}>
                <Undo2 className="w-3 h-3 mr-1" />{t("common.cancel") || "撤销"}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-3 text-xs bg-[#0078d4]"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                <Save className="w-3 h-3 mr-1" />{t("common.save") || "保存"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-6">
        <div
          ref={editorRef}
          className="min-h-[300px] max-w-[800px] mx-auto prose prose-sm focus:outline-none
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-[#323130]
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-[#323130]
            [&_p]:mb-2 [&_p]:text-[#323130] [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
            [&_li]:mb-1 [&_li]:text-[#323130]
            [&_b]:font-bold [&_i]:italic [&_u]:underline"
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={() => setIsDirty(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
