/**
 * KeyboardShortcutHelp — overlay showing all available keyboard shortcuts.
 *
 * Toggle with Ctrl+Shift+? or via the help menu.
 */
import { useState, useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShortcutGroup {
  title: string;
  titleEn: string;
  shortcuts: { keys: string; label: string; labelEn: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "全局快捷键",
    titleEn: "Global Shortcuts",
    shortcuts: [
      { keys: "Ctrl+K", label: "全局搜索", labelEn: "Global Search" },
      { keys: "Ctrl+/", label: "打开 Copilot", labelEn: "Open Copilot" },
      { keys: "Alt+A", label: "AI Canvas", labelEn: "AI Canvas" },
      { keys: "F1", label: "帮助", labelEn: "Help" },
      { keys: "Ctrl+Shift+?", label: "快捷键帮助", labelEn: "Shortcut Help" },
    ],
  },
  {
    title: "工作台",
    titleEn: "Workspace",
    shortcuts: [
      { keys: "Ctrl+U", label: "上传文件", labelEn: "Upload File" },
      { keys: "Ctrl+Shift+N", label: "新建文件夹", labelEn: "New Folder" },
      { keys: "F2", label: "重命名选中", labelEn: "Rename Selected" },
      { keys: "Delete", label: "删除选中", labelEn: "Delete Selected" },
      { keys: "Ctrl+Shift+O", label: "Office 365 面板", labelEn: "Office 365 Panel" },
    ],
  },
  {
    title: "编辑器",
    titleEn: "Editor",
    shortcuts: [
      { keys: "Ctrl+S", label: "保存", labelEn: "Save" },
      { keys: "Ctrl+Z", label: "撤销", labelEn: "Undo" },
      { keys: "Ctrl+B", label: "加粗 (富文本)", labelEn: "Bold (Rich Text)" },
      { keys: "Ctrl+I", label: "斜体 (富文本)", labelEn: "Italic (Rich Text)" },
      { keys: "Tab", label: "下一单元格 (表格)", labelEn: "Next Cell (Spreadsheet)" },
      { keys: "Enter", label: "下一行 (表格)", labelEn: "Next Row (Spreadsheet)" },
    ],
  },
  {
    title: "导航",
    titleEn: "Navigation",
    shortcuts: [
      { keys: "Escape", label: "关闭对话框/面板", labelEn: "Close Dialog/Panel" },
      { keys: "↑ ↓", label: "搜索结果导航", labelEn: "Navigate Search Results" },
      { keys: "Enter", label: "选择搜索结果", labelEn: "Select Search Result" },
    ],
  },
];

export default function KeyboardShortcutHelp() {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const isEn = language === "en";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+? (which is Ctrl+Shift+/)
      if ((e.key === "?" || e.key === "/") && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9] sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-lg font-semibold text-[#323130] flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#0078d4]" />
            {isEn ? "Keyboard Shortcuts" : "键盘快捷键"}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Shortcut groups */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-[#0078d4] mb-3">
                {isEn ? group.titleEn : group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between">
                    <span className="text-sm text-[#323130]">
                      {isEn ? shortcut.labelEn : shortcut.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.split("+").map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-[#a19f9d] mx-0.5">+</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium text-[#323130] bg-[#f3f2f1] border border-[#d2d0ce] rounded shadow-sm">
                            {key.trim()}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#edebe9] text-xs text-[#a19f9d] text-center">
          {isEn ? "Press" : "按"} <kbd className="px-1 py-0.5 bg-[#f3f2f1] border border-[#d2d0ce] rounded text-[10px]">Ctrl+Shift+?</kbd> {isEn ? "to toggle this panel" : "切换此面板"}
        </div>
      </div>
    </div>
  );
}
