/**
 * 全局菜单搜索组件 (Ctrl+K / Cmd+K)
 * 快速跳转到任意菜单页面
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { menuConfig, type MenuItem, type MenuGroup } from "@/config/menuConfig";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Search, ArrowRight, Command, CornerDownLeft } from "lucide-react";

interface SearchResult {
  item: MenuItem;
  group: MenuGroup;
  score: number;
}

export function GlobalMenuSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const { currentUserRole, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;

  // 注册全局快捷键 Ctrl+K / Cmd+K
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
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 过滤可访问的菜单项
  const allItems = useMemo(() => {
    const results: { item: MenuItem; group: MenuGroup }[] = [];
    menuConfig.forEach(group => {
      // 组级权限检查
      if (group.allowedRoles?.length && !group.allowedRoles.includes(currentUserRole)) return;
      if (group.minLevel != null && currentLevel < group.minLevel) return;
      if (group.permissionKey && permissions) {
        const key = group.permissionKey as keyof typeof permissions;
        if (key in permissions && !permissions[key]) return;
      }
      group.items.forEach(item => {
        if (item.allowedRoles?.length && !item.allowedRoles.includes(currentUserRole)) return;
        if (item.minLevel != null && currentLevel < item.minLevel) return;
        results.push({ item, group });
      });
    });
    return results;
  }, [currentUserRole, currentLevel, permissions]);

  // 搜索算法 - 模糊匹配
  const searchResults = useMemo((): SearchResult[] => {
    if (!query.trim()) return allItems.slice(0, 10).map(r => ({ ...r, score: 0 }));

    const q = query.toLowerCase();
    const scored = allItems.map(({ item, group }) => {
      let score = 0;
      const name = item.name.toLowerCase();
      const nameEn = item.nameEn.toLowerCase();
      const path = item.path.toLowerCase();
      const groupName = group.name.toLowerCase();

      // 精确匹配最高分
      if (name === q || nameEn === q) score += 100;
      // 前缀匹配
      else if (name.startsWith(q) || nameEn.startsWith(q)) score += 80;
      // 包含匹配
      else if (name.includes(q) || nameEn.includes(q)) score += 60;
      // 路径匹配
      else if (path.includes(q)) score += 40;
      // 组名匹配
      else if (groupName.includes(q)) score += 20;
      // 拼音首字母匹配（简化 - 匹配英文名中的词首字母）
      else {
        const initials = nameEn.split(/\s+/).map(w => w[0]).join("").toLowerCase();
        if (initials.includes(q)) score += 30;
      }

      return { item, group, score };
    });

    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [query, allItems]);

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

  const getItemName = (item: MenuItem) => {
    switch (language) {
      case "zh": return item.name;
      case "de": return item.nameDe || item.nameEn;
      case "fr": return item.nameFr || item.nameEn;
      default: return item.nameEn;
    }
  };

  const getGroupName = (group: MenuGroup) => {
    switch (language) {
      case "zh": return group.name;
      case "de": return group.nameDe || group.nameEn;
      case "fr": return group.nameFr || group.nameEn;
      default: return group.nameEn;
    }
  };

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
                const GroupIcon = result.group.icon;
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
