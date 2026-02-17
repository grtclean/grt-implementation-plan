/**
 * Top Bar inline search with dropdown results
 * Uses uncontrolled input to avoid React controlled-input issues with IME
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { Search, ArrowRight } from "lucide-react";

export function TopBarSearch() {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const [, navigate] = useLocation();
  const { searchResults, query, setQuery, getItemName, getGroupName, language } = useGlobalSearch(8);

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

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
    // Clear the uncontrolled input via ref
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.blur();
  }, [navigate, setQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        handleSelect(searchResults[selectedIndex].item.path);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, [searchResults, selectedIndex, handleSelect]);

  const showDropdown = open && (query.trim().length > 0 || searchResults.length > 0);

  return (
    <div ref={containerRef} className="relative w-80">
      {/* Search Input — uncontrolled (no value prop) for reliable IME support */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(e) => { isComposingRef.current = false; setQuery((e.target as HTMLInputElement).value); }}
          placeholder={language === "zh" ? "搜索菜单页面..." : "Search pages..."}
          className="pl-8 pr-16 h-8 w-full rounded-md border border-transparent bg-muted/50 px-3 py-1 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus:border-border focus:bg-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {searchResults.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {language === "zh" ? "未找到匹配项" : "No results found"}
            </div>
          ) : (
            <div className="py-1 max-h-[320px] overflow-y-auto">
              {searchResults.map((result, index) => {
                const Icon = result.item.icon;
                return (
                  <button
                    key={result.item.path}
                    tabIndex={-1}
                    onClick={() => handleSelect(result.item.path)}
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
          )}
          {searchResults.length > 0 && (
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
