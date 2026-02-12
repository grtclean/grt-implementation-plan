/**
 * 文档语义搜索对话框
 * 支持自然语言搜索项目文档
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, FileText, Loader2, Sparkles } from "lucide-react";

interface DocumentSearchDialogProps {
  projectId?: number;
  stageCode?: string;
  language?: "zh" | "en";
  trigger?: React.ReactNode;
}

export default function DocumentSearchDialog({
  projectId,
  stageCode,
  language = "zh",
  trigger,
}: DocumentSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = trpc.docIntelligence.searchDocuments.useQuery(
    {
      query: searchQuery,
      projectId,
      stageCode,
      limit: 20,
      minSimilarity: 0.15,
    },
    {
      enabled: searchQuery.length >= 2,
    }
  );

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      setSearchQuery(query.trim());
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Search className="w-3.5 h-3.5 mr-1.5" />
            {language === "zh" ? "语义搜索文档" : "Semantic Search"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {language === "zh" ? "AI 文档语义搜索" : "AI Document Semantic Search"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索输入 */}
          <div className="flex gap-2">
            <Input
              placeholder={
                language === "zh"
                  ? "输入自然语言描述搜索文档..."
                  : "Describe what you're looking for..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={query.trim().length < 2 || isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* 搜索提示 */}
          {!searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {language === "zh"
                  ? "输入关键词或描述，AI将语义匹配最相关的文档"
                  : "Enter keywords or a description, AI will find semantically relevant documents"}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {(language === "zh"
                  ? ["设计冻结审批", "FAT测试报告", "电气原理图", "BOM清单"]
                  : ["Design freeze approval", "FAT test report", "Electrical schematic", "BOM list"]
                ).map((example) => (
                  <button
                    key={example}
                    className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      setQuery(example);
                      setSearchQuery(example);
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 搜索结果 */}
          {searchQuery && data && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                {language === "zh"
                  ? `找到 ${data.total} 个相关文档`
                  : `Found ${data.total} relevant documents`}
              </p>
              {data.results.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-3 rounded-md border hover:bg-accent/50 transition-colors"
                >
                  <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {doc.documentTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {doc.stageCode && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {doc.stageCode}
                        </Badge>
                      )}
                      {doc.documentType && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {doc.documentType}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {doc.sourceTable.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div
                      className={cn(
                        "text-xs font-mono px-1.5 py-0.5 rounded",
                        doc.similarity >= 0.8
                          ? "bg-green-500/10 text-green-500"
                          : doc.similarity >= 0.5
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {Math.round(doc.similarity * 100)}%
                    </div>
                  </div>
                </div>
              ))}

              {data.results.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">
                    {language === "zh"
                      ? "未找到相关文档，请尝试其他关键词"
                      : "No matching documents found, try different keywords"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
