/**
 * 全局菜单搜索组件 (Ctrl+K / Cmd+K)
 * 快速跳转到任意菜单页面
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { Search, ArrowRight, Command, CornerDownLeft } from "lucide-react";

export function GlobalMenuSearch() {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { searchResults, query, setQuery, getItemName, getGroupName, language } = useGlobalSearch(12);

  // 注册全局快捷键 Ctrl+K / Cmd+K + TopBarSearch click event
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      // Escape关闭
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    // Listen for custom event from TopBarSearch trigger button
    const openHandler = () => setOpen(true);
    document.addEventListener("keydown", handler);
    window.addEventListener("open-global-search", openHandler);
    return () => {
      document.removeEventListener("keydown", handler);
      window.removeEventListener("open-global-search", openHandler);
    };
  }, [open]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, setQuery]);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        navigate(searchResults[selectedIndex].item.path);
        setOpen(false);
      }
    }
  }, [searchResults, selectedIndex, navigate]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden" onKeyDown={handleKeyDown}>
        {/* 搜索输入 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={language === 'zh' ? '搜索菜单页面...' : 'Search pages...'}
            className="border-0 shadow-none focus-visible:ring-0 text-base h-8 px-0"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {language === 'zh' ? '未找到匹配的菜单项' : 'No matching pages found'}
            </div>
          ) : (
            <div className="px-2">
              {!query && <p className="px-2 py-1 text-xs text-muted-foreground">{language === 'zh' ? '常用页面' : 'Recent pages'}</p>}
              {searchResults.map((result, index) => {
                const Icon = result.item.icon;
                return (
                  <button
                    key={result.item.path}
                    onClick={() => {
                      navigate(result.item.path);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left transition-colors",
                      index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{getItemName(result.item)}</span>
                        {result.item.isNew && <Badge className="h-4 px-1 text-[9px] bg-emerald-100 text-emerald-700 shrink-0">NEW</Badge>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{getGroupName(result.group)}</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span className="font-mono">{result.item.path}</span>
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border bg-background text-[10px]">↑↓</kbd> 导航</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border bg-background text-[10px]">↵</kbd> 跳转</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border bg-background text-[10px]">ESC</kbd> 关闭</span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K 打开搜索
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalMenuSearch;
