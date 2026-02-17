/**
 * Top Bar inline search with dropdown results
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { menuConfig, type MenuItem, type MenuGroup } from "@/config/menuConfig";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, ArrowRight } from "lucide-react";

export function TopBarSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const { currentUserRole, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;

  // Role-filtered menu items
  const allItems = (() => {
    const results: { item: MenuItem; group: MenuGroup }[] = [];
    menuConfig.forEach(group => {
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
  })();

  // Search
  const searchResults = (() => {
    if (!query.trim()) return allItems.slice(0, 8).map(r => ({ ...r, score: 0 }));
    const q = query.toLowerCase();
    return allItems
      .map(({ item, group }) => {
        let score = 0;
        const name = item.name.toLowerCase();
        const nameEn = item.nameEn.toLowerCase();
        if (name === q || nameEn === q) score = 100;
        else if (name.startsWith(q) || nameEn.startsWith(q)) score = 80;
        else if (name.includes(q) || nameEn.includes(q)) score = 60;
        else if (item.path.toLowerCase().includes(q)) score = 40;
        else if (group.name.toLowerCase().includes(q)) score = 20;
        return { item, group, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  })();

  const getItemName = (item: MenuItem) => {
    if (language === "zh") return item.name;
    if (language === "de") return item.nameDe || item.nameEn;
    if (language === "fr") return item.nameFr || item.nameEn;
    return item.nameEn;
  };

  const getGroupName = (group: MenuGroup) => {
    if (language === "zh") return group.name;
    if (language === "de") return group.nameDe || group.nameEn;
    if (language === "fr") return group.nameFr || group.nameEn;
    return group.nameEn;
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedIndex]) handleSelect(searchResults[selectedIndex].item.path);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && searchResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-80">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={e => {
            isComposingRef.current = false;
            setQuery((e.target as HTMLInputElement).value);
          }}
          placeholder={language === "zh" ? "搜索菜单页面..." : "Search pages..."}
          className="pl-8 pr-16 h-8 w-full rounded-md border border-transparent bg-muted/50 text-sm outline-none placeholder:text-muted-foreground focus:border-border focus:bg-background transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground pointer-events-none">
          ⌘K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="py-1 max-h-[320px] overflow-y-auto">
            {searchResults.map((result, index) => {
              const Icon = result.item.icon;
              return (
                <button
                  key={result.item.path}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={e => { e.preventDefault(); handleSelect(result.item.path); }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors",
                    index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{getItemName(result.item)}</span>
                      {result.item.isNew && (
                        <Badge className="h-4 px-1 text-[9px] bg-emerald-100 text-emerald-700 shrink-0">NEW</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">{getGroupName(result.group)}</span>
                      <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                      <span className="font-mono truncate">{result.item.path}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {searchResults.length > 0 && query.trim() && (
            <div className="px-3 py-1.5 border-t text-[11px] text-muted-foreground text-right">
              {language === "zh" ? `共 ${searchResults.length} 条结果` : `${searchResults.length} results`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TopBarSearch;
