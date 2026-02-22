import { useState, useCallback, useEffect, useRef } from "react";
import { useContextualHelp, type HelpArticle } from "@/hooks/useContextualHelp";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HelpCircle,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------
type ArticleCategory =
  | "GETTING_STARTED"
  | "FEATURE_GUIDE"
  | "FAQ"
  | "TROUBLESHOOTING"
  | "BEST_PRACTICE"
  | "CHANGELOG"
  | "WALKTHROUGH";

interface CategoryMeta {
  label: string;
  labelZh: string;
  color: string;
  bgColor: string;
  textColor: string;
}

const CATEGORY_META: Record<ArticleCategory, CategoryMeta> = {
  GETTING_STARTED: {
    label: "Getting Started",
    labelZh: "入门指南",
    color: "border-green-500",
    bgColor: "bg-green-500/15",
    textColor: "text-green-400",
  },
  FEATURE_GUIDE: {
    label: "Feature Guide",
    labelZh: "功能指南",
    color: "border-blue-500",
    bgColor: "bg-blue-500/15",
    textColor: "text-blue-400",
  },
  FAQ: {
    label: "FAQ",
    labelZh: "常见问题",
    color: "border-amber-500",
    bgColor: "bg-amber-500/15",
    textColor: "text-amber-400",
  },
  TROUBLESHOOTING: {
    label: "Troubleshooting",
    labelZh: "故障排除",
    color: "border-red-500",
    bgColor: "bg-red-500/15",
    textColor: "text-red-400",
  },
  BEST_PRACTICE: {
    label: "Best Practice",
    labelZh: "最佳实践",
    color: "border-purple-500",
    bgColor: "bg-purple-500/15",
    textColor: "text-purple-400",
  },
  CHANGELOG: {
    label: "Changelog",
    labelZh: "版本日志",
    color: "border-cyan-500",
    bgColor: "bg-cyan-500/15",
    textColor: "text-cyan-400",
  },
  WALKTHROUGH: {
    label: "Walkthrough",
    labelZh: "操作指南",
    color: "border-orange-500",
    bgColor: "bg-orange-500/15",
    textColor: "text-orange-400",
  },
};

// ---------------------------------------------------------------------------
// CategoryBadge
// ---------------------------------------------------------------------------
function CategoryBadge({
  category,
  language,
}: {
  category: ArticleCategory;
  language: string;
}) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.FEATURE_GUIDE;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-1.5 py-0 leading-4 border",
        meta.bgColor,
        meta.textColor,
        meta.color,
      )}
    >
      {language === "zh" ? meta.labelZh : meta.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// ArticleCard
// ---------------------------------------------------------------------------
function ArticleCard({
  article,
  language,
  isExpanded,
  onToggle,
}: {
  article: HelpArticle;
  language: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const title = language === "zh" ? article.titleZh : article.title;
  const content = language === "zh" ? article.contentZh : article.content;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 border-border/50 hover:border-border",
        isExpanded && "ring-1 ring-primary/30",
      )}
      onClick={onToggle}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <CategoryBadge
              category={article.category}
              language={language}
            />
            <CardTitle className="text-sm font-medium leading-snug truncate">
              {title || article.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        {isExpanded ? (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mt-1">
            {content || article.content}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {content || article.content}
          </p>
        )}

        {/* Tags */}
        {isExpanded && article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {article.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState({
  isSearch,
  language,
}: {
  isSearch: boolean;
  language: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <BookOpen className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        {isSearch
          ? language === "zh"
            ? "未找到匹配的帮助文章"
            : "No matching help articles found"
          : language === "zh"
            ? "该页面暂无帮助文章"
            : "No help articles for this page yet"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RelatedTopics
// ---------------------------------------------------------------------------
function RelatedTopics({
  articles,
  language,
}: {
  articles: HelpArticle[];
  language: string;
}) {
  // Collect related routes from all articles, deduplicate
  const relatedRoutes = Array.from(
    new Set(articles.flatMap((a) => a.relatedRoutes ?? [])),
  );

  if (relatedRoutes.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-medium">
          {language === "zh" ? "相关主题" : "Related Topics"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <ul className="space-y-1">
        {relatedRoutes.slice(0, 5).map((route) => (
          <li key={route}>
            <a
              href={route}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{route}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HelpOverlay (main export)
// ---------------------------------------------------------------------------
export default function HelpOverlay() {
  const { language } = useLanguage();
  const {
    articles,
    isLoading,
    search,
    clearSearch,
    searchQuery,
    searchResults,
    isSearching,
    currentRoute,
  } = useContextualHelp();

  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Determine which articles to display
  const isSearchMode = localSearch.trim().length > 0;
  const displayArticles: HelpArticle[] = isSearchMode ? searchResults : articles;
  const displayLoading = isSearchMode ? isSearching : isLoading;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    // Auto-focus search input after panel opens
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setExpandedId(null);
    setLocalSearch("");
    clearSearch();
  }, [clearSearch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      setExpandedId(null);
      // Debounce search to avoid excessive queries
      search(value);
    },
    [search],
  );

  const handleToggleArticle = useCallback(
    (id: string | number) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  // Close panel on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        // Allow clicks on the trigger button itself
        const triggerBtn = document.getElementById("help-overlay-trigger");
        if (triggerBtn?.contains(e.target as Node)) return;
        handleClose();
      }
    };
    // Use timeout to avoid the click that opened the panel from immediately closing it
    const timeoutId = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousedown", handler);
    };
  }, [isOpen, handleClose]);

  // Reset expanded article when route changes
  useEffect(() => {
    setExpandedId(null);
  }, [currentRoute]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* Floating trigger button                                           */}
      {/* ----------------------------------------------------------------- */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="help-overlay-trigger"
              variant="outline"
              size="icon"
              className={cn(
                "fixed bottom-20 right-6 z-50 h-10 w-10 rounded-full shadow-lg",
                "border-border bg-card hover:bg-accent transition-all duration-200",
                isOpen && "ring-2 ring-primary/40",
              )}
              onClick={() => (isOpen ? handleClose() : handleOpen())}
              aria-label={language === "zh" ? "帮助" : "Help"}
            >
              {isOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <HelpCircle className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {language === "zh" ? "帮助" : "Help"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ----------------------------------------------------------------- */}
      {/* Help panel                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div
        ref={panelRef}
        className={cn(
          "fixed bottom-20 right-20 z-50 w-96 max-h-[600px] flex flex-col",
          "bg-card text-foreground border border-border rounded-xl shadow-2xl",
          "transition-all duration-200 origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        {/* --------------------------------------------------------------- */}
        {/* Header                                                          */}
        {/* --------------------------------------------------------------- */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold flex-1">
            {language === "zh" ? "帮助" : "Help"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search input */}
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={
                language === "zh" ? "搜索帮助文章..." : "Search help articles..."
              }
              className="h-8 pl-8 pr-8 text-sm bg-muted border-border/50"
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Route indicator */}
        <div className="px-4 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
            <span className="font-medium">
              {language === "zh" ? "当前页面:" : "Current Page:"}
            </span>
            <code className="text-primary/80 font-mono text-[11px]">
              {currentRoute}
            </code>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Article list                                                     */}
        {/* --------------------------------------------------------------- */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 pb-2 space-y-2">
            {displayLoading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/30 animate-pulse">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-16 bg-muted rounded" />
                        <div className="h-4 w-32 bg-muted rounded" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                      <div className="h-3 w-full bg-muted rounded mt-1" />
                      <div className="h-3 w-2/3 bg-muted rounded mt-1" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : displayArticles.length === 0 ? (
              <EmptyState isSearch={isSearchMode} language={language} />
            ) : (
              displayArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  language={language}
                  isExpanded={expandedId === article.id}
                  onToggle={() => handleToggleArticle(article.id)}
                />
              ))
            )}

            {/* Related topics — only in contextual (non-search) mode */}
            {!isSearchMode && displayArticles.length > 0 && (
              <RelatedTopics articles={displayArticles} language={language} />
            )}
          </div>
        </ScrollArea>

        {/* --------------------------------------------------------------- */}
        {/* Footer                                                           */}
        {/* --------------------------------------------------------------- */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            asChild
          >
            <a href="/help">
              <BookOpen className="h-3.5 w-3.5" />
              {language === "zh" ? "查看全部帮助" : "View All Help"}
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => {
              // Open feedback dialog or navigate to feedback page
              window.open(
                `/feedback?context=help&route=${encodeURIComponent(currentRoute)}`,
                "_blank",
              );
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {language === "zh" ? "反馈" : "Feedback"}
          </Button>
        </div>
      </div>
    </>
  );
}
