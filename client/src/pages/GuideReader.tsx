import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Book, ChevronLeft, ChevronRight, Download, List, 
  Code, Database, Cpu, GitBranch, Settings, FileText,
  ArrowUp, Menu, X
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";

interface TocItem {
  id: string;
  title: string;
  level: number;
  children?: TocItem[];
}

export default function GuideReader() {
  const { language } = useLanguage();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [showToc, setShowToc] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 加载Markdown内容
  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch("/docs/GRT_NocoBase_Development_Guide_v1.0.md");
        const text = await response.text();
        setContent(text);
        
        // 解析目录
        const tocItems = parseToc(text);
        setToc(tocItems);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load guide:", error);
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  // 解析Markdown生成目录
  const parseToc = (markdown: string): TocItem[] => {
    const lines = markdown.split("\n");
    const items: TocItem[] = [];
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // 移除链接
        const id = title
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
          .replace(/\s+/g, "-");
        
        items.push({ id, title, level });
      }
    });
    
    return items;
  };

  // 滚动到指定章节
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // 监听滚动更新当前章节
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const scrollTop = contentRef.current.scrollTop;
        setShowBackToTop(scrollTop > 300);
        
        // 找到当前可见的章节
        const headings = contentRef.current.querySelectorAll("h1, h2, h3");
        let currentSection = "";
        
        headings.forEach((heading) => {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= 150) {
            currentSection = heading.id || "";
          }
        });
        
        if (currentSection) {
          setActiveSection(currentSection);
        }
      }
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener("scroll", handleScroll);
      return () => contentEl.removeEventListener("scroll", handleScroll);
    }
  }, [content]);

  // 返回顶部
  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 获取章节图标
  const getSectionIcon = (title: string) => {
    if (title.includes("架构") || title.includes("Architecture")) return <Settings className="w-4 h-4" />;
    if (title.includes("数据") || title.includes("Data")) return <Database className="w-4 h-4" />;
    if (title.includes("AI") || title.includes("智能")) return <Cpu className="w-4 h-4" />;
    if (title.includes("IoT") || title.includes("硬件")) return <Cpu className="w-4 h-4" />;
    if (title.includes("实施") || title.includes("Implementation")) return <GitBranch className="w-4 h-4" />;
    if (title.includes("代码") || title.includes("Code") || title.includes("开发")) return <Code className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // 渲染目录项
  const renderTocItem = (item: TocItem, index: number) => {
    const isActive = activeSection === item.id;
    const indent = (item.level - 1) * 16;
    
    return (
      <button
        key={index}
        onClick={() => scrollToSection(item.id)}
        className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-all flex items-center gap-2 ${
          isActive 
            ? "bg-primary/10 text-primary border-l-2 border-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {item.level === 1 && getSectionIcon(item.title)}
        <span className={item.level === 1 ? "font-medium" : ""}>
          {item.title.length > 30 ? item.title.substring(0, 30) + "..." : item.title}
        </span>
      </button>
    );
  };

  return (
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="border-b border-border pb-4 mb-4">
          <PageHeader
            icon={Book}
            title={language === "zh" ? "GRT NocoBase 系统开发指南" : "GRT NocoBase Development Guide"}
            description="v1.0 | 2026-01-16"
            actions={
              <>
                <Link href="/docs">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    {language === "zh" ? "返回文档中心" : "Back to Docs"}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToc(!showToc)}
                  className="gap-2"
                >
                  {showToc ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  {language === "zh" ? "目录" : "TOC"}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  {language === "zh" ? "下载PDF" : "Download PDF"}
                </Button>
              </>
            }
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Table of Contents */}
          {showToc && (
            <Card className="w-72 flex-shrink-0 bg-card/50 border-border">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <List className="w-4 h-4 text-primary" />
                    {language === "zh" ? "文档目录" : "Table of Contents"}
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-2 space-y-1">
                    {toc.filter(item => item.level <= 2).map((item, index) => renderTocItem(item, index))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Document Content */}
          <Card className="flex-1 bg-card/50 border-border overflow-hidden">
            <CardContent className="p-0 h-full">
              <ScrollArea className="h-full" ref={contentRef}>
                <div className="p-8 max-w-4xl mx-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <article className="prose prose-invert prose-orange max-w-none
                      prose-headings:font-heading prose-headings:tracking-tight
                      prose-h1:text-3xl prose-h1:border-b prose-h1:border-border prose-h1:pb-4 prose-h1:mb-6
                      prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-primary
                      prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                      prose-p:text-muted-foreground prose-p:leading-relaxed
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                      prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border prose-pre:rounded-lg
                      prose-table:border-collapse prose-table:w-full
                      prose-th:bg-secondary prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:border prose-th:border-border
                      prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-border
                      prose-li:text-muted-foreground
                      prose-strong:text-foreground
                      prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4
                    ">
                      <Streamdown>{content}</Streamdown>
                    </article>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Back to Top Button */}
        {showBackToTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 rounded-full w-12 h-12 bg-primary hover:bg-primary/90 shadow-lg"
            size="icon"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
          <div className="text-sm text-muted-foreground">
            {language === "zh" 
              ? `共 ${toc.filter(t => t.level === 1).length} 个章节，${toc.length} 个小节`
              : `${toc.filter(t => t.level === 1).length} chapters, ${toc.length} sections`
            }
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <ChevronLeft className="w-4 h-4" />
              {language === "zh" ? "上一章" : "Previous"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              {language === "zh" ? "下一章" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
  );
}
